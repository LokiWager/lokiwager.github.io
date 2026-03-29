---
title: "Building a GPU SaaS Platform - Storage Lifecycle"
publishDate: "23 March 2026"
description: "Part 8: introduce GPUStorage, mount persistent data into GPUUnit, and separate data lifecycle from runtime lifecycle."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator"]
---

In Part 7, we finally got to the point where we could create a GPU runtime and run a real application. It was still far from perfect, and
there was plenty left to improve, but we stopped there on purpose. Real production systems work the same way. The first version does not need to be
perfect. It needs to be feasible, useful, and worth continuing. That is what an MVP is for.

This chapter is about storage. Any real product needs it. Data, state, caches, checkpoints, and configuration all have to live somewhere.
Whether that storage is remote, like S3 or R2, or mounted into the runtime as persistent volume, we have to model it explicitly.

## Chapter Goal

By the end of Part 8, the platform has four new properties:

1. persistent data has its own resource: `GPUStorage`
2. `GPUUnit` only declares how storage is mounted, not how it is provisioned
3. the storage controller owns PVC lifecycle
4. deleting runtime no longer means deleting data

We are separating data lifecycle from process lifecycle. That separation is necessary because they are different concepts in the product, in
the control plane, and in Kubernetes itself. There is no good reason to force them into one object. If one side fails, it should not automatically
take the other side down with it.

## How To Choose Storage For A GPU Platform

There are several major storage categories we could choose from: object storage, block storage, and filesystem storage. Within each category,
there are also many implementation options and middleware stacks.

Since Kubernetes is our runtime platform, a PVC is the most natural way to expose persistent storage to the user runtime. That does not mean
remote storage becomes unimportant. In practice, object storage is still the right home for many assets. But for this chapter, and for teaching the
control-plane model, we want a self-managed persistent volume that the platform can provision and mount directly.

Under that assumption, we could build on OpenEBS, Rook + Ceph, Longhorn, Lustre, or BeeGFS. My default recommendation here is block storage,
not shared filesystem storage, unless multiple Pods truly need to mount the same directory at the same time. Shared filesystems solve a valid problem,
but they also bring harder concurrency behavior, more metadata pressure, and more room for unpleasant performance surprises under heavy load. For
Kubernetes integration, I would choose Rook + Ceph. Ceph is not famous for being easy to operate, but it is a serious and proven storage system.

I strongly recommend evaluating storage yourself instead of choosing it from marketing material. Deploy it. Stress it. Try high-concurrency
workloads that resemble real user behavior. Some systems are comfortable with large files but perform poorly on small-file workloads. Some need NVMe
everywhere, while others mainly want fast media for metadata. Storage is one of the hardest things to migrate later, which is also why many teams
prefer managed cloud storage when they can.

I am not going to cover Rook or Ceph installation in detail here. The official documentation already does that better than I can, and those
steps also age quickly. In my own setup, I use an external Ceph cluster and let Rook connect Kubernetes to it. You can absolutely run a Ceph cluster
inside Kubernetes as well. Still, separating storage from compute is often easier to manage, both for traffic isolation and for capacity planning.

## The New Split

The storage object now owns capacity and PVC identity:

```go
type GPUStorageSpec struct {
    Size             string `json:"size"`
    StorageClassName string `json:"storageClassName,omitempty"`
}
```

In our current implementation, `storageClassName` defaults to `rook-ceph-block`.

That detail matters. We are not building a generic "some PVC somewhere" abstraction here. We are choosing a default storage shape for this stage of the
project: one active runtime, one persistent workspace volume, backed by RBD.

The runtime object only owns the mount contract:

```go
type GPUUnitStorageMount struct {
    Name      string `json:"name"`
    MountPath string `json:"mountPath"`
    ReadOnly  bool   `json:"readOnly,omitempty"`
}
```

That split is deliberate.

`GPUStorage` answers:

- how much storage do we want
- which storage class should back it
- what is the current PVC state

`GPUUnit` answers:

- which storage object should be mounted
- where should it appear inside the container
- should the mount be read-only

This is a much better boundary than mixing volume provisioning and container mount policy into the same object.


## What The Controller Owns

Once `GPUStorage` exists, the controller can own the Kubernetes-specific details that should not leak too far into the API.

In this chapter, the storage controller owns:

- the PVC name
- the default RBD storage class
- the PVC access mode
- the PVC reconcile loop
- bound versus pending status

That means the API does not need to expose every Kubernetes storage knob on day one.

For now, we keep the contract intentionally small:

- `size`
- optional `storageClassName`, defaulting to `rook-ceph-block`

Everything else stays controller-owned until we have a real reason to widen the surface.

That tradeoff matters. A smaller API is easier to explain, easier to validate, and easier to evolve.

## Why Deletion Changes Here

This chapter is also where delete semantics stop being trivial.

Before storage, deleting a runtime mostly meant deleting process state. After storage, that is no longer true.

The rules are now:

- deleting a `GPUUnit` does not delete `GPUStorage`
- deleting `GPUStorage` is rejected by the API while an active unit still mounts it

That is not just a UX improvement. It is a safety boundary.

Without it, one careless delete would destroy data that should have outlived the runtime process.

This is one of the most important engineering lessons in the series so far: once data exists, lifecycle shortcuts become production bugs.

## The New API Boundary

Creating storage is synchronous from the API point of view. The API persists the `GPUStorage` object immediately, and PVC binding remains
asynchronous in `status`.

The create request is intentionally small:

```go
type CreateGPUStorageRequest struct {
    Name             string `json:"name"`
    Namespace        string `json:"namespace,omitempty"`
    Size             string `json:"size"`
    StorageClassName string `json:"storageClassName,omitempty"`
}
```

Updating storage is even smaller:

```go
type UpdateGPUStorageRequest struct {
    Size string `json:"size"`
}
```

At this stage, resize only allows expansion. That is a realistic place to stop. Shrinking storage safely is its own topic.

On the runtime side, `CreateGPUUnitRequest` keeps the active image, template, and access settings from Part 7, and now adds:

```go
StorageMounts []GPUUnitStorageMount `json:"storageMounts,omitempty"`
```

That gives us a clean division:

- stock API reserves compute
- storage API reserves data
- runtime create attaches both to one active unit

One more constraint appears now that the default storage path is RBD-backed: the same `GPUStorage` cannot be attached to multiple active
`GPUUnit` objects at the same time. If a storage object is already mounted by one active runtime, another attach request is rejected with
`409 Conflict`.


## API Walkthrough

Seed stock first:

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

Create storage:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/gpu-storages \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"model-cache",
    "namespace":"runtime-instance",
    "size":"20Gi",
    "storageClassName":"rook-ceph-block"
  }' | jq
```

Inspect the storage object and the PVC:

```bash
curl -s 'http://127.0.0.1:8080/api/v1/gpu-storages/model-cache?namespace=runtime-instance' | jq
kubectl get gpustorages -n runtime-instance
kubectl get pvc -n runtime-instance
```

Create an active runtime with that storage mounted:

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

Resize the storage later:

```bash
curl -s -X PUT 'http://127.0.0.1:8080/api/v1/gpu-storages/model-cache?namespace=runtime-instance' \
  -H 'Content-Type: application/json' \
  -d '{
    "size":"40Gi"
  }' | jq
```

## How To Verify The Model

There are three things worth checking after this chapter.

First, the storage resource:

```bash
kubectl get gpustorages -n runtime-instance
kubectl get gpustorage model-cache -n runtime-instance -o yaml
kubectl get pvc model-cache -n runtime-instance -o yaml
```

You should see:

- the `GPUStorage` object
- the PVC with the same name
- storage status moving from `Pending` to `Ready`

Second, the runtime object:

```bash
kubectl get gpuunit demo-instance -n runtime-instance -o yaml
kubectl get deploy demo-instance -n runtime-instance -o yaml
```

You should see:

- `storageMounts` recorded in `GPUUnit.spec`
- PVC-backed volumes in the generated pod template
- normal runtime readiness once the pod becomes available

Third, the delete behavior:

```bash
curl -i -X DELETE 'http://127.0.0.1:8080/api/v1/gpu-storages/model-cache?namespace=runtime-instance'
```

If `demo-instance` still mounts that storage, the API should return `409 Conflict`.

That is a feature, not an inconvenience.

## Summary

Part 8 is where the project learns that state is not just another runtime option.

We now have:

- a dedicated storage resource
- PVC lifecycle separated from runtime lifecycle
- explicit storage mounts on `GPUUnit`
- controller-owned PVC mechanics
- an RBD-backed default for per-runtime workspace storage
- safer delete semantics once data exists

This is a small feature on the surface, but an important architectural change underneath.

The platform is starting to act less like a process launcher and more like a real runtime control plane.

## Next Chapter Preview

Part 9 is where storage stops being empty.

Now that we can provision and mount persistent volumes cleanly, the next step is data movement:

- preparing storage from images or existing sources
- adding the first storage accessor path
- tracking data-copy jobs and recovery states

That is where storage starts to become operational, not just declarative.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
