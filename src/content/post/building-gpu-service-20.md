---
title: "Building a GPU SaaS Platform - GPU Virtualization with HAMi"
publishDate: "2 July 2026"
description: "Part 20: add HAMi virtual GPU packages on top of the DRA allocation contract."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator", "DRA", "HAMi"]
---

We have mentioned GPU virtualization a few times in earlier chapters, but we have not really stopped to discuss it. This chapter brings that topic back to the center.

For a GPU SaaS platform, virtualization is not just an infrastructure detail. It is one of the core economic levers of the product.

Virtualization became truly valuable once cloud platforms turned it into a practical operating model. It simplified deployment and operations for large companies, small teams, and even individual developers. It also created the margin structure behind modern cloud providers.

The same idea applies to our platform. Without virtualization, every user workload tends to consume an entire physical GPU, even when it only needs a fraction of the card. Once we include GPU hardware cost, power, data center maintenance, operations, engineering, and business overhead, it is hard to build a profitable service without some form of controlled sharing.

## GPU Virtualization Options

There are several common approaches to GPU virtualization:

1. Time-slicing registers one physical GPU as multiple logical allocations and lets Pods take turns using it. Conceptually, the card is exposed as several replicas, and CUDA execution is coordinated through time sharing.
2. MPS uses the NVIDIA Multi-Process Service daemon to manage sharing across CUDA clients. Unlike simple time-slicing, MPS can explicitly control memory and compute capacity for each client while allowing multiple CUDA clients to enter the GPU.
3. MIG is the closest option to hardware-level GPU virtualization. It slices a supported GPU into isolated hardware instances, but it requires specific data-center GPU models. Consumer GPUs do not support it.
4. HAMi acts as a Kubernetes-oriented GPU sharing layer. It abstracts GPU sharing, isolation, and scheduling on top of Kubernetes. It can work with MIG when the hardware supports it, and it can also use HAMi-core to split GPU core usage through time-slicing and limit GPU memory through software-enforced resource controls.
5. Traditional virtualization stacks such as KubeVirt or OpenStack can also be part of a GPU virtualization strategy, especially when the product boundary is VM-oriented instead of Pod-oriented.

Among these options, HAMi is the best fit for this chapter. It integrates naturally with Kubernetes, and we can consume it with relatively small changes to the runtime contract.

That does not mean HAMi is the final answer for every business. At larger scale, some platforms still build their own virtualization layer to dynamically schedule CUDA clients, control memory allocation more aggressively, and tune sharing behavior for their own workloads. For this tutorial runtime, however, HAMi gives us a practical and Kubernetes-native step forward.

## Chapter Goal

By the end of this chapter, the runtime supports two package shapes:

1. whole-GPU DRA packages, such as `2 x RTX 3080`
2. HAMi virtual GPU packages, such as `10Gi GPU memory + 50 percent GPU cores`

The runtime accepts a trusted package catalog, expands the package into a `GPUUnit`, and lets the controller create a DRA `ResourceClaim`.

## Why HAMi After DRA

It is tempting to frame DRA and HAMi as competing choices.

For this platform, they are not.

DRA is the Kubernetes allocation API. It gives us objects such as `DeviceClass`, `ResourceSlice`, and `ResourceClaim`. Kubernetes documents this model in the Dynamic Resource Allocation guide: [Kubernetes DRA docs](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/).

HAMi is the GPU sharing provider underneath that API. With HAMi's native DRA path, the workload can request GPU memory and GPU core capacity through a DRA `ResourceClaim`. HAMi documents this mode in its DRA usage guide: [HAMi DRA docs](https://project-hami.io/docs/installation/how-to-use-hami-dra).

So the boundary becomes:

```text
runtime package catalog
  -> GPUUnit.spec.allocation
  -> DRA ResourceClaim
  -> Kubernetes scheduler
  -> HAMi DRA provider
  -> shared physical GPU allocation
```

The runtime does not become a GPU sharing scheduler.

HAMi decides how virtual GPU slices are placed and isolated. Kubernetes records the claim and allocation state. The runtime records the product contract and reports what Kubernetes observed.

## What Ops Configures

Whole-GPU packages still look like this:

```yaml
packages:
  - id: "gpu-rtx3080-2x-cpu10-mem40g"
    specName: "gpu.rtx3080.2x.10c.40g"
    cpu: "10"
    memory: "40Gi"
    gpu: 2
    allocation:
      deviceClassName: "nvidia-rtx-3080"
      claimRequestName: "gpu"
      count: 2
```

The CPU and memory fields are normal Kubernetes container resources.

The GPU side is DRA.

For HAMi, the package adds a controlled `virtualGPU` section:

```yaml
packages:
  - id: "gpu-hami-10g-50c-cpu4-mem16g"
    specName: "gpu.hami.10g.50c.4c.16g"
    cpu: "4"
    memory: "16Gi"
    gpu: 1
    virtualGPU:
      provider: "hami"
      memory: "10Gi"
      cores: 50
    allocation:
      claimRequestName: "gpu"
```

This is intentionally product-shaped.

The user does not see `hami-core-gpu.project-hami.io`. The user does not choose arbitrary memory and core values. The control plane exposes a package, and ops controls what that package means.

## Cluster Operations

There is one important operational detail that the code alone does not show:

the runtime does not install HAMi.

HAMi DRA is cluster infrastructure. It should be installed and upgraded by ops through Helm, GitOps, or the platform's cluster bootstrap pipeline. The runtime only consumes the DRA objects that HAMi publishes.

For this chapter, the cluster setup flow is:

1. enable the Kubernetes DRA features required for consumable capacity
2. prepare NVIDIA driver and container runtime integration
3. enable CDI in the container runtime
4. install cert-manager for the HAMi DRA webhook certificates
5. install HAMi DRA
6. verify that `ResourceSlice` and `DeviceClass` objects exist
7. enable HAMi-backed packages in the runtime catalog

Install cert-manager first:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update jetstack

helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Then install HAMi DRA:

```bash
helm repo add hami-dra https://project-hami.github.io/HAMi-DRA
helm repo update hami-dra

helm upgrade --install hami-dra hami-dra/hami-dra
```

If the host already has the NVIDIA driver installed and the driver should not be managed by a container driver DaemonSet, install it like this:

```bash
helm upgrade --install hami-dra hami-dra/hami-dra \
  --set drivers.nvidia.containerDriver=false
```

After installation, ops should verify the HAMi control-plane components and DRA inventory:

```bash
kubectl get pods -n hami-system
kubectl get resourceslices
kubectl get deviceclasses.resource.k8s.io
```

For this runtime chapter, the important `DeviceClass` is:

```text
hami-core-gpu.project-hami.io
```

After a user creates a runtime instance from the HAMi package, the operator-facing checks become:

```bash
kubectl get resourceclaims -n runtime-instance
kubectl get resourceclaim unit-demo-instance-gpu -n runtime-instance -o yaml
kubectl get gpuunit demo-instance -n runtime-instance -o yaml
```

The `ResourceClaim` should contain:

```yaml
capacity:
  requests:
    memory: 10Gi
    cores: "50"
```

Once Kubernetes and HAMi allocate the claim, `GPUUnit.status.dra.devices[*].consumedCapacity` should show the observed virtual GPU consumption.

This split is deliberate. The runtime repository owns the package contract and the generated `ResourceClaim`. The Kubernetes cluster owns the HAMi installation, DRA driver, `DeviceClass`, and `ResourceSlice` lifecycle.

## How The Package Expands

During catalog normalization, the runtime turns the HAMi package into a DRA allocation:

```yaml
allocation:
  deviceClassName: "hami-core-gpu.project-hami.io"
  claimRequestName: "gpu"
  count: 1
  capacity:
    memory: "10Gi"
    cores: "50"
```

The controller then creates a `ResourceClaim` equivalent to:

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaim
metadata:
  name: unit-hami-worker-gpu
  namespace: runtime-instance
spec:
  devices:
    requests:
      - name: gpu
        exactly:
          deviceClassName: hami-core-gpu.project-hami.io
          allocationMode: ExactCount
          count: 1
          capacity:
            requests:
              memory: 10Gi
              cores: "50"
```

## Observed Allocation

Kubernetes DRA can report consumed device capacity in allocation status when the device supports shared allocation.

The runtime already mirrors that into `GPUUnit.status.dra.devices[*].consumedCapacity`.

For a HAMi-backed allocation, the status can look like this:

```yaml
status:
  dra:
    claimName: unit-hami-worker-gpu
    allocated: true
    devices:
      - request: gpu
        driver: hami-core-gpu.project-hami.io
        pool: node-a
        device: gpu-0
        shareID: 4c6b2e8d-9f20-4eaa-9dd5-6c80c2d15f3a
        consumedCapacity:
          memory: 10Gi
          cores: "50"
```

That status is observed state.

It should be used for reporting, debugging, and control-plane visibility. It should not be replaced by runtime-side GPU counters.

## Resource Utilization And Fragmentation

HAMi helps us reduce whole-GPU waste, but it does not magically eliminate fragmentation.

If the product catalog offers too many arbitrary virtual GPU shapes, the cluster can still end up with unusable leftover slices. For example, a node may have enough free GPU memory but not enough free GPU core share, or the opposite.

The practical answer is to keep package shapes standardized:

```text
gpu-hami-5g-25c-cpu2-mem8g
gpu-hami-10g-50c-cpu4-mem16g
gpu-hami-20g-100c-cpu8-mem32g
```

The control plane should decide which packages to sell based on fleet data, demand, and business policy.

The runtime should not dynamically invent package shapes per request.

In other words:

- HAMi improves physical GPU utilization.
- DRA keeps allocation observable and Kubernetes-native.
- the package catalog keeps the product surface stable.
- the control plane still owns quota, pricing, and package availability.

## What Changed In Code

The catalog model now has an optional `virtualGPU` section:

```go
type RuntimePackageVirtualGPUSpec struct {
	Provider string `json:"provider,omitempty" yaml:"provider,omitempty"`
	Memory   string `json:"memory,omitempty" yaml:"memory,omitempty"`
	Cores    int32  `json:"cores,omitempty" yaml:"cores,omitempty"`
}
```

When `provider: hami` is configured, normalization:

1. validates GPU memory as a Kubernetes quantity
2. validates GPU cores as a controlled percentage value
3. defaults `deviceClassName` to `hami-core-gpu.project-hami.io`
4. defaults DRA `count` to `1`
5. writes `memory` and `cores` into DRA `capacity`

The controller did not need a large rewrite because Part 19 already used DRA capacity generically:

```go
exact.Capacity = &resourcev1.CapacityRequirements{Requests: capacity}
```

This is the benefit of keeping the controller DRA-shaped instead of HAMi-shaped.

HAMi is a provider path in the package catalog. The reconciler still creates a standard DRA `ResourceClaim`.

## Summary

Part 20 adds virtual GPU packages without breaking the DRA-only allocation boundary.

The runtime still accepts package intent, not raw device allocation details.

Whole-GPU packages reference a normal GPU `DeviceClass`. HAMi packages express GPU memory and GPU core share through DRA consumable capacity.

Kubernetes remains the allocation API. HAMi provides GPU sharing underneath it. The runtime remains responsible for product contract validation, object creation, and observed status reporting.

That gives us a clean foundation for the next topic: reliable serverless execution. Once workers may be whole-GPU or virtual-GPU backed, the request path must handle retries, duplicates, timeouts, dead-letter queues, and backpressure much more carefully.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
