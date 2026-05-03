---
title: "Building a GPU SaaS Platform - OverlayBD Cold Start"
publishDate: "3 May 2026"
description: "Part 12: explain how OverlayBD converts OCI images into a lazy-pullable block format and why that changes cold start for large GPU images."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator", "Serverless", "Image"]
---

In the earlier chapters, we built a basic GPU runtime. Before we add queues, activators, and lifecycle policies, there is one lower-level problem we need to solve first: cold start.

Serverless does not mean the workload disappears. It means the user sends work to a platform-managed endpoint, and the platform decides when to create, reuse, or retire workers. AWS Lambda and Cloudflare Workers are familiar examples on the CPU side. A GPU serverless platform follows the same operational idea, but the worker image is usually much larger and much heavier to start.

That is why this chapter focuses on image startup rather than request routing.

For GPU workloads, cold start is often dominated by image handling. If the platform has to fully pull, decompress, and unpack a multi-gigabyte image before the process can even begin, then the rest of the serverless control plane will always feel slower than it should.

So Part 12 is really about one technical question:

how does OverlayBD turn a normal OCI image into something that can be mounted quickly and loaded on demand?

## Chapter Goal

By the end of Part 12, the project has four new properties:

1. the runtime repository includes a small offline `image-accelerator` command
2. the command wraps the official OverlayBD userspace convertor instead of re-implementing the conversion engine
3. the chapter explains the OverlayBD data path, conversion path, and runtime read path in detail
4. the series now has a concrete cold-start prerequisite for the later serverless activator path

This chapter intentionally does **not** yet implement:

- an online image conversion service
- activator-driven worker startup
- queue-driven request execution
- lifecycle policies like prewarm or idle scale-down

Those come next.

## OCI To OverlayBD In One Path

To understand OverlayBD, it helps to follow one single path from the source OCI image to the running container, instead of describing the same idea from multiple angles.

For one concrete platform such as `linux/amd64`, a normal OCI image is made of:

- a **manifest**
- an **image config**
- an ordered sequence of **layer blobs**

In the standard OCI case, each layer blob is a tar-based filesystem changeset. So a simplified source image looks like this:

```text
image ref
  -> index (optional, for multi-arch)
    -> manifest
      -> config.json
      -> layer 0: tar blob
      -> layer 1: tar blob
      -> layer 2: tar blob
```

On the node, containerd downloads those blobs into the content store and then **unpacks** them by applying the tar changesets one layer at a time:

```text
download manifest/config/layers
  -> unpack layer 0 -> snapshot S0
  -> unpack layer 1 on top of S0 -> snapshot S1
  -> unpack layer 2 on top of S1 -> snapshot S2
  -> mount root filesystem
```

That is the part serverless dislikes. A tar layer is good for distribution, but it is not good for random reads. Before the process can start, the node usually has to download, decompress, and replay the layer sequence into snapshots.

OverlayBD changes that by changing what a layer blob means.

Instead of publishing "tar changesets that must be replayed during startup," the convertor publishes "committed block-diff layers that can be mounted and read on demand." The manifest is still an OCI manifest and the image still lives in a normal registry, but the layer descriptors now point to OverlayBD artifacts and carry OverlayBD annotations such as:

- `containerd.io/snapshot/overlaybd/blob-digest`
- `containerd.io/snapshot/overlaybd/blob-size`
- `containerd.io/snapshot/overlaybd/version`

So the structural change is:

```text
before:
  manifest -> config + tar layers

after:
  manifest -> config + overlaybd commit layers + overlaybd annotations
```

The registry still sees OCI objects. The snapshotter sees enough metadata to interpret those layers as OverlayBD remote block layers instead of as tar streams waiting to be unpacked.

## How The Conversion Actually Works

The conversion step is where the normal OCI filesystem semantics are consumed once and translated into OverlayBD's block format.

Imagine a source image with three layers:

- `L0`: base OS files
- `L1`: Python and CUDA additions
- `L2`: application files

The convertor processes them in order.

### Step 1: Create a writable OverlayBD layer

For the current layer, the convertor starts with `overlaybd-create`.

This creates writable files such as:

- `writable_data`
- `writable_index`

For the first layer, it can also build the initial filesystem with `--mkfs`. If `--mkfs` is disabled, it uses a prepared base layer such as `/opt/overlaybd/baselayers/ext4_64`.

So the convertor is not unpacking into an ordinary directory tree. It is preparing a writable block-device-backed filesystem state.

### Step 2: Apply the OCI tar layer into that writable state

Next, `overlaybd-apply` takes the source `layer.tar` and replays its filesystem changes into the writable OverlayBD layer.

This is the most intuitive way to think about the translation:

- OCI layer: "here is a tar archive describing filesystem changes"
- OverlayBD convertor: "apply those filesystem changes once into a writable block-backed filesystem"

If one layer adds `/usr/bin/python` and another overwrites `/app/server.py`, those file-level operations are resolved during conversion and become block-level modifications in the writable OverlayBD state.

This is also the answer to "where did unpack go?" It did not disappear. The unpack-like work still happens once here, during offline conversion, instead of happening on every node during cold start.

### Step 3: Seal it into a committed OverlayBD layer

After the tar changes have been applied, `overlaybd-commit` seals the writable result into a read-only committed layer.

For one source layer, the flow is:

```text
layer.tar
  -> overlaybd-create
  -> overlaybd-apply
  -> overlaybd-commit
  -> overlaybd.commit
```

The committed layer contains:

- block-difference data
- an index for looking up those blocks
- optional `zfile` compression for seekable decompression

That `overlaybd.commit` file is the artifact that gets published as the converted layer blob.

### Step 4: Chain the next layer on top

The next OCI layer is converted on top of the previous committed layer.

So a three-layer source image becomes something like:

```text
L0.tar -> commit C0
L1.tar + lower C0 -> commit C1
L2.tar + lower C1 -> commit C2
```

This is why the official builder passes both `--uuid` and `--parent-uuid` when committing layers. The final image is still layered, but the layers are now chained as OverlayBD block layers instead of as unpack-on-start tar changesets.

## How Lazy Pull Works At Runtime

Once conversion is done, runtime behavior changes completely.

The node no longer starts from tar layers that must be replayed into snapshots. It starts from committed OverlayBD layers that already contain block diffs and lookup metadata.

The runtime path is:

1. read the OCI manifest and layer annotations
2. recognize that the layer descriptors are OverlayBD-backed
3. load the layer indexes into memory
4. expose a virtual block device that represents the merged layer stack
5. mount a normal filesystem such as `ext4` on top of that device
6. fetch real data blocks only when the process touches them

That is why OverlayBD can support lazy pull.

The runtime is not eagerly unpacking the whole image anymore. It is attaching a block-backed layered image and resolving reads against it.

An intuitive read path looks like this:

1. the container opens a file such as `/usr/bin/python`
2. `ext4` converts that file read into block reads
3. those block reads hit the OverlayBD virtual device
4. OverlayBD checks the in-memory indexes to find which committed layer and which offset hold the requested range
5. if the data is already local, it serves the read locally
6. otherwise it fetches just that remote range, decompresses only the required `zfile` chunk, and returns the data

So lazy pull here does not mean "pull a little bit of the tar file."
It means "resolve block reads against a pre-converted layered block image and fetch only the ranges that are actually needed."

That is the direct bridge from OCI conversion to on-demand loading.

## Why This Changes Cold Start

Once conversion is done, the node no longer pays the full tar-unpack cost on every cold start.

The offline pipeline has already:

- built the filesystem base
- replayed the OCI tar changes
- converted them into block-diff layers
- emitted committed remote blobs plus lookup metadata

At runtime, the node mainly needs to:

- read manifest metadata
- load layer indexes
- attach the merged virtual block device
- mount the filesystem
- fetch data ranges on demand

The expensive filesystem-replay work has moved out of the hot path. That is the real reason OverlayBD changes cold-start behavior.

## The Small Tool In This Repository

This repository now includes a small `image-accelerator` command.

That command is intentionally thin. It does not re-implement OverlayBD. It simply exposes the official userspace convertor with local YAML configuration, flag overrides, and a few preflight checks for the required OverlayBD binaries.

For this chapter, that is enough.

The interesting part is not the wrapper itself.
The interesting part is that we now have a concrete offline step that transforms a normal OCI image into a lazy-pullable OverlayBD image before the later serverless control plane ever sees it.

## Verification

There are four good checks after implementing this chapter.

### 1. Build the command

```bash
GOTOOLCHAIN=go1.26.0 make build
```

Check that `bin/image-accelerator` is produced alongside the manager and proxy binaries.

### 2. Inspect the help output

```bash
GOTOOLCHAIN=go1.26.0 go run ./cmd/image-accelerator --help
```

Check for:

- `--source`
- `--target`
- `--engine`
- registry flags
- OverlayBD conversion flags

### 3. Check the local OverlayBD userspace files

```bash
ls /opt/overlaybd/bin
ls /opt/overlaybd/baselayers
```

Verify that the expected conversion binaries exist before trying a real conversion run.

### 4. Run one conversion in an environment that has the toolchain

```bash
GOTOOLCHAIN=go1.26.0 go run ./cmd/image-accelerator \
  --config config/local/image-accelerator.yaml
```

If you want to inspect the generated work directory afterward, enable the wrapper's debug options and keep the temporary files.

## Summary

Part 12 is mainly about moving work.

In the standard OCI path, the node downloads tar layers and unpacks them into snapshots before the container can start.

In the OverlayBD path, that filesystem replay is done once during offline conversion. The runtime then works with committed block-diff layers, loads only their indexes first, mounts a virtual block device, and fetches real data ranges only when the running process touches them.

That is the real meaning of lazy pull here.

OverlayBD is not just "a faster pull." It is a different image representation with a different read path and a different place where unpack-like work is paid.

## Next Chapter Preview

Part 13 will return to the serverless control path itself. That chapter will define the first runtime-side serverless contract and introduce queue-first invocation over NATS, so both synchronous and asynchronous requests enter a durable message path before any worker executes them.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
