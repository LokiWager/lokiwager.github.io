---
title: "Building a GPU SaaS Platform - Storage Data Jobs"
publishDate: "1 April 2026"
description: "Part 9: add storage prepare jobs, the first accessor path, and recovery state to GPUStorage."
tags: [ "GPU", "SaaS", "Kubernetes", "Golang", "Operator" ]
---

In Part 8, we introduced persistent storage, but in a real platform many users prefer to initialize storage from a template instead of starting from an empty volume. Team environments often need a common directory layout, a small set of shared bootstrap files, or even a shared base model. We also need a practical way to inspect and operate on that data, for example through a file server with a simple UI.

## Chapter Goal

By the end of Part 9, the storage model has four new properties:

1. `GPUStorage` can be prepared from an image or from an existing storage object
2. data preparation runs through a controller-owned Kubernetes `Job`
3. `GPUStorage` can publish a first built-in accessor path
4. failed data jobs surface explicit recovery state instead of hiding inside pod logs

That is the real step forward here. We are not just adding one more field. We are teaching the platform how to move data in a controlled way.

## Why Data Preparation Cannot Live Inside `GPUUnit`

It is tempting to say: just let the runtime container populate its own volume on startup.

That sounds simple, but it creates the wrong ownership model very quickly.

There are several reasons for that:

- we do not want to consume GPU resources while preparing storage.
- status becomes harder to reason about because data failures and runtime failures get mixed together.
- the data may need to exist before the runtime even starts.

This is exactly why Part 8 separated data lifecycle from process lifecycle in the first place. Part 9 follows that logic to its natural conclusion:
if data preparation is a platform concern, the controller should own it.

## The New Storage Contract

`GPUStorage` now grows in two directions.

The first is `prepare`:

```go
type GPUStoragePrepareSpec struct {
    FromImage       string   `json:"fromImage,omitempty"`
    FromStorageName string   `json:"fromStorageName,omitempty"`
    Command         []string `json:"command,omitempty"`
    Args            []string `json:"args,omitempty"`
}
```

The second is `accessor`:

```go
type GPUStorageAccessorSpec struct {
    Enabled bool `json:"enabled,omitempty"`
}
```

That split is deliberate.

`prepare` answers:

- where does the initial data come from
- what job should write that data into the volume
- what should count as a recovery boundary if the job fails

`accessor` answers:

- should the platform publish a simple built-in path for browsing the prepared data

Everything else stays controller-owned:

- the Kubernetes `Job`
- the accessor `Deployment`
- the accessor `Service`
- the status transitions
- the recovery signal

The API stays small, but the control plane becomes much more useful.

## Two Prepare Paths, One Recovery Model

The first prepare path is "copy from image."

That means we run a controller-owned `Job`, mount the target PVC at `/workspace`, and let the requested image write its data there.

The second prepare path is "copy from existing storage."

That means we mount both the source PVC and the target PVC into a controller-owned copy job and let the platform duplicate the contents from one to the other.

What matters is not that these two paths use different containers. What matters is that they converge into one operational model:

- preparation is asynchronous
- preparation is observable
- preparation is retryable
- preparation belongs to `GPUStorage`, not to the runtime

That last point is the architectural one. The same storage may be prepared before any runtime exists, and the same prepared storage may outlive many
runtimes after that.

## Why Recovery Is A Separate Action

Once we accept that data preparation is an asynchronous platform job, we also have to accept that it can fail.

If the copy job fails, the user needs more than "some pod failed somewhere." They need a stable recovery boundary.

That is why this chapter adds an explicit recover action:

```text
POST /api/v1/gpu-storages/{name}/recover
```

This does not redefine the storage contract. It does not change `prepare`. It just asks the controller to start a new preparation attempt for the same
storage object.

That boundary matters.

A regular update should describe the desired object. Recovery is an operational action. Mixing those two ideas into the same API usually creates
confusing semantics.

## The First Accessor Path

There is one more practical problem once storage can hold real data: how do we inspect it?

In a real platform, there may eventually be many answers:

- SFTP or SSH
- a file browser
- object-storage sync
- a dedicated data gateway
- tenant-specific sidecars

But we do not need all of that yet.

For this chapter, we add the first minimal accessor path:

- controller-owned
- HTTP only
- read-only
- internal cluster URL

That is enough to prove the lifecycle and teach the boundary. The accessor is not "the storage product." It is just the first controlled way to reach
prepared data without coupling the answer to one runtime.

In the next chapter, we will introduce a file server and a small proxy layer so users can manage storage more directly. That chapter will also cover how to proxy SSH traffic with `frp`.


## API Walkthrough

Seed stock first, just like before:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stock-units \
  -H 'Content-Type: application/json' \
  -d '{
    "operationID":"stock-g1-demo-001",
    "specName":"g1.1",
    "memory":"16Gi",
    "gpu":1,
    "replicas":1
  }' | jq
```

Create storage from an image and turn on the built-in accessor:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/gpu-storages \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"model-cache",
    "namespace":"runtime-instance",
    "size":"20Gi",
    "storageClassName":"rook-ceph-block",
    "prepare":{
      "fromImage":"busybox:1.36",
      "command":["sh","-c"],
      "args":["mkdir -p /workspace/model && echo seeded > /workspace/model/README.txt"]
    },
    "accessor":{
      "enabled":true
    }
  }' | jq
```

Inspect the storage object, the prepare job, and the accessor:

```bash
curl -s 'http://127.0.0.1:8080/api/v1/gpu-storages/model-cache?namespace=runtime-instance' | jq
kubectl get gpustorages -n runtime-instance
kubectl get jobs -n runtime-instance -l runtime.lokiwager.io/storage=model-cache
kubectl get deploy,svc -n runtime-instance | grep storage-accessor-model-cache
```

Clone a second storage object from the first one:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/gpu-storages \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"model-cache-copy",
    "namespace":"runtime-instance",
    "size":"20Gi",
    "prepare":{
      "fromStorageName":"model-cache"
    }
  }' | jq
```

Mount the prepared storage into an active runtime:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/gpu-units \
  -H 'Content-Type: application/json' \
  -d '{
    "operationID":"unit-demo-001",
    "name":"demo-instance",
    "namespace":"runtime-instance",
    "specName":"g1.1",
    "image":"python:3.12",
    "access":{
      "primaryPort":"http",
      "scheme":"http"
    },
    "template":{
      "command":["python"],
      "args":["-m","http.server","8080"],
      "ports":[{"name":"http","port":8080}]
    },
    "storageMounts":[
      {
        "name":"model-cache",
        "mountPath":"/workspace/cache"
      }
    ]
  }' | jq
```

If the prepare job fails and you want to start a new attempt:

```bash
curl -s -X POST 'http://127.0.0.1:8080/api/v1/gpu-storages/model-cache/recover?namespace=runtime-instance' | jq
```

## How To Verify The Model

There are four things worth checking after this chapter.

First, the storage resource:

```bash
kubectl get gpustorage model-cache -n runtime-instance -o yaml
```

You should see:

- the PVC identity
- prepare status
- recovery status
- accessor status

Second, the prepare job:

```bash
kubectl get jobs -n runtime-instance -l runtime.lokiwager.io/storage=model-cache
kubectl describe job -n runtime-instance
```

You should see:

- one controller-owned job for the current preparation attempt
- status moving from `Pending` to `Running` to `Succeeded`, or to `Failed`

Third, the accessor path:

```bash
kubectl get deploy,svc -n runtime-instance | grep storage-accessor-model-cache
```

You should see:

- one controller-owned `Deployment`
- one controller-owned `Service`
- the in-cluster accessor URL reported in `GPUStorage.status`

Fourth, the recovery boundary:

```bash
curl -s 'http://127.0.0.1:8080/api/v1/gpu-storages/model-cache?namespace=runtime-instance' | jq
```

If preparation failed, the object should say that directly. You should not have to infer it from random pod logs.

That is the whole point of this chapter.

## Troubleshooting

### The PVC is bound, but prepare never starts

Check the prepare contract first:

- does `prepare.fromImage` exist
- does the image have a valid command and args
- if `prepare.fromStorageName` is used, does the source storage exist and reach `Ready`

### The prepare job fails immediately

Inspect the job:

```bash
kubectl get jobs -n runtime-instance -l runtime.lokiwager.io/storage=model-cache
kubectl describe job -n runtime-instance
```

The most common causes are:

- the image command is wrong
- the image does not write data into `/workspace`
- the source storage was not actually ready for cloning

### The accessor never becomes ready

Check the accessor `Deployment` and `Service`:

```bash
kubectl get deploy,svc -n runtime-instance | grep storage-accessor-model-cache
kubectl describe deploy storage-accessor-model-cache -n runtime-instance
```

Remember the accessor only comes up after the PVC is ready and the prepare step is finished.

### Recovery does not seem to do anything

Recovery only asks for a new prepare attempt. It does not silently rewrite the storage contract.

If the same bad command is still configured, the next attempt will fail for the same reason. That is expected. Recovery retries the operation; it does
not invent a new one.

## Summary

Part 9 is where storage becomes a real control-plane workflow.

We now have:

- storage preparation from image or from existing storage
- controller-owned prepare jobs
- explicit prepare and recovery state on `GPUStorage`
- the first built-in accessor path
- a clean recover action instead of implicit retry behavior

That is a much stronger model than "make the app copy files into its own volume when it starts."

The better design is not the one with fewer objects. It is the one that makes ownership, failure, and retry boundaries visible.

## Next Chapter Preview

Part 10 will pause the original roadmap for a moment and add a network proxy service so users can reach storage and compute resources more directly.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
