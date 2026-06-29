---
title: "Building a GPU SaaS Platform - DRA Package Allocation"
publishDate: "29 Jun 2026"
description: "Part 19: replace runtime-side GPU counting with DRA-backed package allocation, ResourceClaim status, and controlled runtime packages."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator", "DRA"]
---

Let's keep paying down the technical debt from the earlier chapters.

Previously, to keep inventory management consistent, we used a deliberately simple but heavy-handed approach: pre-allocate resources with placeholder Pods, then turn one of those placeholders into a user instance when a request arrives.

That works as a teaching step, but it is not a good long-term resource model. When a GPU is idle, the platform should be able to use it for other work and allocate it only when a real user workload needs it.

In this chapter, we replace that placeholder-Pod model with Kubernetes Dynamic Resource Allocation, or DRA.

This fits our product model well because we sell GPU runtime capacity as packages: a fixed combination of GPU, CPU, and memory. CPU and memory remain normal Kubernetes requests and limits, while the GPU side of the package is expressed through DRA. Instead of reserving empty Pods, the runtime records a package contract, creates a DRA `ResourceClaim`, and lets Kubernetes plus the DRA driver perform the actual device allocation.

## Chapter Goal

Part 19 moves the runtime to a DRA-backed package model:

1. Users request a controlled `packageID`, not arbitrary device selectors.
2. The package expands into CPU, memory, GPU count, and a DRA `DeviceClass`.
3. The controller creates a GPUUnit-owned `ResourceClaim`.
4. The worker Pod references that claim through `pod.spec.resourceClaims`.
5. The runtime container references the same claim through `resources.claims`.
6. The runtime does not also set traditional `nvidia.com/gpu` requests.
7. Inventory visibility comes from `ResourceClaim.status` and `ResourceSlice`, not from runtime-side GPUUnit spec counting.

The runtime still does not become a scheduler.

It validates product-level intent, creates Kubernetes objects, and reports observed state. Kubernetes and the DRA driver own the final allocation.

## Why Package IDs

A GPU SaaS product usually sells a small set of fixed packages:

```text
packageID: gpu-rtx3080-2x-cpu10-mem40g
CPU:       10
Memory:    40Gi
GPU:       2 x RTX 3080
```

The user should not submit arbitrary CEL selectors, arbitrary `DeviceClass` names, or arbitrary claim parameters.

Those details are product policy.

In a real platform, the control plane owns the product catalog.

For this tutorial, the runtime API loads an ops-managed YAML catalog:

```yaml
packages:
  - id: gpu-rtx3080-2x-cpu10-mem40g
    specName: gpu.rtx3080.2x.10c.40g
    cpu: "10"
    memory: 40Gi
    gpu: 2
    allocation:
      deviceClassName: nvidia-rtx-3080
      claimRequestName: gpu
      count: 2
```

Ops can create the referenced `DeviceClass` with ordinary Kubernetes YAML. The DRA driver publishes `ResourceSlice` objects. The runtime only
references the configured `DeviceClass` and creates a per-unit `ResourceClaim`.

## What DRA Gives Us

Kubernetes Dynamic Resource Allocation introduces first-class device allocation APIs. The official DRA docs describe the core objects as `DeviceClass`, `ResourceSlice`, and `ResourceClaim` [Kubernetes DRA docs](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/).

For this runtime, the mental model is:

```text
DeviceClass
  Admin-defined device class, for example nvidia-rtx-3080.

ResourceSlice
  Driver-published inventory. This is what the scheduler can inspect.

ResourceClaim
  Workload-owned request for devices from a DeviceClass.

ResourceClaim.status
  Observed allocation result after the scheduler and DRA driver allocate devices.
```

That means inventory truth should come from Kubernetes observed state:

- available device information comes from `ResourceSlice`
- allocated device information comes from `ResourceClaim.status`
- Pod placement still belongs to the Kubernetes scheduler

The runtime can report these objects, but it should not replace them with its own GPU counter.

## Request Shape

The create request now requires package-based allocation:

```json
{
	"operationID": "unit-demo-001",
	"name": "demo-instance",
	"packageID": "gpu-rtx3080-2x-cpu10-mem40g",
	"image": "python:3.12"
}
```

The user does not pass `deviceClassName`, `claimName`, or selectors.

After API validation and package expansion, the persisted `GPUUnit` records the concrete runtime contract:

```yaml
apiVersion: runtime.lokiwager.io/v1alpha1
kind: GPUUnit
metadata:
  name: demo-instance
  namespace: runtime-instance
spec:
  packageID: gpu-rtx3080-2x-cpu10-mem40g
  specName: gpu.rtx3080.2x.10c.40g
  image: python:3.12
  cpu: "10"
  memory: 40Gi
  gpu: 2
  allocation:
    deviceClassName: nvidia-rtx-3080
    claimName: unit-demo-instance-gpu
    claimRequestName: gpu
    count: 2
```

This keeps the runtime object explicit without exposing low-level allocation controls as public user input.

## Controller Output

When the controller sees a DRA allocation contract on the `GPUUnit`, it creates a `ResourceClaim` owned by that `GPUUnit`:

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaim
metadata:
  name: unit-demo-instance-gpu
  namespace: runtime-instance
spec:
  devices:
    requests:
      - name: gpu
        exactly:
          deviceClassName: nvidia-rtx-3080
          allocationMode: ExactCount
          count: 2
```

Then it attaches the claim to the Pod:

```yaml
spec:
  resourceClaims:
    - name: gpu
      resourceClaimName: unit-demo-instance-gpu
```

And it exposes the claim to the runtime container:

```yaml
containers:
  - name: runtime-worker
    resources:
      requests:
        cpu: "10"
        memory: 40Gi
      limits:
        cpu: "10"
        memory: 40Gi
      claims:
        - name: gpu
          request: gpu
```

Notice what is missing:

```yaml
nvidia.com/gpu: "2"
```

That is deliberate.

In this chapter, DRA is the only create-time allocation path. We should not hand-write a `ResourceClaim` and also keep traditional GPU extended resources on the same container. That would make two allocation systems appear authoritative at the same time.

## Status And Inventory

The controller now mirrors DRA allocation into `GPUUnit.status.dra`:

```yaml
status:
  dra:
    claimName: unit-demo-instance-gpu
    allocated: true
    devices:
      - request: gpu
        driver: gpu.example.com
        pool: node-a
        device: gpu-0
```

The runtime inventory endpoint also reports DRA-oriented fields:

```json
{
	"data": {
		"totalGpuAllocatable": 24,
		"draClaimCount": 3,
		"draAllocatedClaims": 2,
		"draAllocatedDevices": 4,
		"draResourceSlices": 6,
		"draDevices": []
	}
}
```

For DRA-backed packages, the important fields are:

- `draClaimCount`
- `draAllocatedClaims`
- `draAllocatedDevices`
- `draResourceSlices`
- `draDevices`

This distinction matters.

Because DRA is the allocation model, `ResourceClaim.status` and `ResourceSlice` must be the observed allocation path. `GPUUnit.spec.gpu` is product intent, not the source of inventory truth.

## Quota Guardrails

The runtime still checks namespace guardrails where it can do so safely.

For DRA packages, it does not check `requests.nvidia.com/gpu`, because the Pod no longer requests that resource.

Instead, the sample runtime namespace quota includes:

```yaml
hard:
  requests.cpu: "160"
  requests.memory: "256Gi"
  count/resourceclaims.resource.k8s.io: "64"
```

This gives us basic protection around CPU, memory, and claim object count without pretending that runtime-side GPU counting is the DRA allocator.

The final allocation can still fail later if no matching `ResourceSlice` exists, if the `DeviceClass` is missing, if the DRA driver is unhealthy, or if the scheduler cannot place the Pod. Those are Kubernetes allocation outcomes, and the runtime should surface them through status instead of hiding them behind a fake local inventory model.

## Summary

This chapter does not implement a DRA driver. In a real cluster, you still need a GPU DRA driver such as NVIDIA's DRA driver. Also, even though the product-level goal is to sell packages, DRA only covers the device allocation side here. CPU and memory are still managed by Kubernetes as normal compute resources. The result is still a cleaner and more robust runtime boundary: Kubernetes owns placement, the DRA driver owns GPU allocation, and the runtime owns the package contract.

Part 19 moves GPU allocation closer to Kubernetes' real device allocation model.

The runtime no longer treats placeholder Pods or `GPUUnit.spec.gpu` counting as the final inventory source.

Instead, users request a controlled package, the runtime creates a DRA-backed `GPUUnit`, the controller creates a `ResourceClaim`, and Kubernetes records the actual device allocation in `ResourceClaim.status`.

That gives us a stronger boundary for the next chapter: HAMi can provide virtual GPU capacity underneath DRA, without turning the runtime into a second scheduler.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
