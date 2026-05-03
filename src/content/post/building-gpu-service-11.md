---
title: "Building a GPU SaaS Platform - Security and Metrics"
publishDate: "26 April 2026"
description: "Part 11: harden runtime workloads with capability drops, shared-memory sizing, egress isolation, and expose runtime and Nvidia GPU metrics."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator", "Observability", "Security"]
---

In the earlier chapters, we built GPU inventory management, application instance creation, and the storage and access paths around them. Before any real production rollout, though, two topics become non-negotiable: security and monitoring. We do not want either our own data or our users' data to leak, and we definitely do not want to spend every day after launch fighting attackers.

I learned this lesson the hard way when I was still a student. I once published a small online storage service with almost no real understanding of security. Not long after it went live, the system started getting slower and slower, even though the obvious host metrics still looked normal. After a lot of digging, I finally discovered that an attacker had replaced some of the commands on the machine and turned the server into a zombie box. Killing the visible malware process did not help because another process kept bringing it back. In the end I had to suspend the service and reinstall the server. That experience stayed with me: security is never something we get to ignore.

Once a service is running, logs and traces alone are not enough. We need a small set of meaningful signals that tells us whether the system is healthy, whether capacity is drifting, and whether user-facing entrypoints are starting to fail. Structured logs, tracing, and metrics all matter, but more signals are not automatically better. Every metric costs storage, every alert can create noise, and a noisy system makes real failures harder to see. Choosing the right metrics, and the right alerts on top of them, is one of the more demanding parts of SRE work.

## Chapter Goal

By the end of Part 11, the runtime has four new properties:

1. managed Pods drop risky Linux capabilities and run with stricter security defaults, reducing direct access to host-level resources
2. GPU workloads get a memory-backed `/dev/shm` sized from the requested memory envelope
3. every `GPUUnit` gets an egress `NetworkPolicy` that blocks common internal and host-facing ranges by default, so workloads cannot directly reach most Pod, Service, or node addresses
4. the manager exports live runtime metrics, including Nvidia GPU inventory plus DCGM-backed device telemetry such as frame-buffer memory usage and GPU utilization

## Security Should Be A Default, Not An Opt-In

The earlier chapters focused on function:

- create a Pod
- mount storage
- expose access

That is the right order when bootstrapping a platform.
But once the basics work, "just run the container" is no longer a good enough contract.

For this chapter, the runtime manager now injects the same baseline security posture into the workloads it owns:

- `allowPrivilegeEscalation: false`
- `seccompProfile: RuntimeDefault`
- a dropped capability set based on the same hardening approach used in `stock-operator`

That baseline is applied to:

- the main runtime container
- the SSH sidecar
- the `frpc` sidecar
- the `dufs` storage accessor
- the storage-prepare Job container

This is important because controller-owned support containers are still part of the attack surface.
It is not enough to harden only the user workload and leave the helper Pods soft.

One small but intentional detail also changed in the SSH sidecar:

- `SUDO_ACCESS` is now disabled

The goal of that shell is controlled operator-style access inside the Pod boundary, not a privileged escape hatch.

## `/dev/shm` Is A Real Runtime Requirement

Many AI and GPU applications are unhappy with the tiny default shared-memory space that comes from a plain container setup.

This shows up in places like:

- PyTorch `DataLoader`
- Python multiprocessing
- IPC-heavy inference servers

The `stock-operator` already handled this by mounting a memory-backed `emptyDir` at `/dev/shm`.
The runtime now does the same thing.

For each `GPUUnit`:

- the controller mounts `/dev/shm` as `emptyDir{ medium: Memory }`
- if the unit requests memory, the shared-memory volume is capped at half of that value

So a unit with:

```yaml
memory: 16Gi
```

gets:

```yaml
/dev/shm -> 8Gi memory-backed emptyDir
```

This keeps the behavior predictable and ties shared-memory growth to the same resource envelope the user already asked for.

## Egress Isolation Should Be Simple And Explainable

The network-isolation design in `stock-operator` has a good instinct:
deny dangerous destinations, but avoid building a maze of special cases.

The runtime now creates a controller-owned `NetworkPolicy` for each `GPUUnit`.

The policy is still egress-focused, but the default local configuration is more opinionated now. It does three things:

1. explicitly allows DNS to `kube-system`
2. allows general outbound traffic through `0.0.0.0/0`
3. subtracts a configurable set of internal and host-facing CIDR ranges from that public path

The sample manager config now blocks the most common private IPv4 ranges plus link-local addresses:

```yaml
blockedEgressCIDRs:
  - 10.0.0.0/8
  - 100.64.0.0/10
  - 169.254.0.0/16
  - 172.16.0.0/12
  - 192.168.0.0/16
```

With that default, a runtime cannot directly talk to most Pod, Service, or node addresses, and it also loses access to metadata-style link-local endpoints.

There is one extra SSH-specific rule:

- if the FRP server address is an IP and that IP falls inside the blocked CIDR set, the controller adds one explicit allow rule for the FRP server and port

That preserves the user-facing SSH path without reopening the entire private network. If the FRP server lives on a private address, using a stable IP in `ssh.serverAddr` gives the controller enough information to emit that narrow exception.

This is a deliberately conservative first step.
It is easy to explain, easy to debug, and easy to extend later with tenant-specific or namespace-specific rules.

## Runtime Health Needs More Than "the Process Is Up"

Before this chapter, the health surface was intentionally lightweight.
It told us whether the process started and whether Kubernetes was reachable.

Now the health view also answers:

- how many nodes are ready?
- how much GPU capacity exists in the cluster?
- how much is allocatable right now?
- which Nvidia GPU products are currently visible?
- if DCGM metrics are configured, how much GPU memory is used right now and what average utilization the devices are reporting

The `/api/v1/health` payload now includes fields like:

```json
{
	"kubernetesConnected": true,
	"nodeCount": 3,
	"readyNodeCount": 3,
	"totalGPUCapacity": 12,
	"totalGPUAllocatable": 10,
	"nvidiaMetricsConnected": true,
	"gpuDeviceCount": 8,
	"totalGpuMemoryMiB": 393216,
	"usedGpuMemoryMiB": 126000,
	"freeGpuMemoryMiB": 267216,
	"averageGpuUtilizationPercent": 41.5,
	"gpuProducts": [
		{
			"product": "NVIDIA-L40S",
			"nodeCount": 2,
			"capacity": 8,
			"allocatable": 6
		}
	]
}
```

The inventory data comes from Kubernetes node status plus the standard Nvidia node label:

```text
nvidia.com/gpu.product
```

If a DCGM exporter endpoint is configured, the runtime manager also scrapes device-level metrics such as:

- `DCGM_FI_DEV_FB_USED`
- `DCGM_FI_DEV_FB_FREE`
- `DCGM_FI_DEV_GPU_UTIL`

That gives the control plane a second layer of visibility: not only "some GPUs exist", but also whether those GPUs are currently busy and how much frame-buffer memory they are consuming.

## Exposing Runtime Metrics Through The Controller Metrics Endpoint

For Part 11, I did not add another custom HTTP server just for metrics.
Instead, the manager now registers a Prometheus collector on the existing controller-runtime metrics registry.

That gives us live metrics on the manager metrics endpoint.

In local development, the sample config now exposes metrics on:

```text
:8082
```

If you also want device-level Nvidia telemetry, configure a DCGM exporter endpoint:

```yaml
nvidiaMetricsEndpoint: "http://dcgm-exporter.kube-system.svc.cluster.local:9400/metrics"
```

So you can inspect them with:

```bash
curl -s http://127.0.0.1:8082/metrics | rg '^runtime_'
```

The new metric families include:

- `runtime_kubernetes_up`
- `runtime_kubernetes_nodes_total`
- `runtime_kubernetes_nodes_ready`
- `runtime_kubernetes_node_ready{node=...}`
- `runtime_kubernetes_node_gpu_capacity{node=...,gpu_product=...}`
- `runtime_kubernetes_node_gpu_allocatable{node=...,gpu_product=...}`
- `runtime_nvidia_metrics_up`
- `runtime_nvidia_gpu_devices_total`
- `runtime_nvidia_gpu_memory_used_mib{node=...,gpu=...,uuid=...,gpu_product=...}`
- `runtime_nvidia_gpu_memory_free_mib{node=...,gpu=...,uuid=...,gpu_product=...}`
- `runtime_nvidia_gpu_memory_total_mib{node=...,gpu=...,uuid=...,gpu_product=...}`
- `runtime_nvidia_gpu_utilization_percent{node=...,gpu=...,uuid=...,gpu_product=...}`
- `runtime_gpu_units{lifecycle=...,phase=...}`
- `runtime_gpu_storages{phase=...}`
- `runtime_gpu_storage_prepare{phase=...}`
- `runtime_gpu_storage_accessor{phase=...}`

This is enough to answer several operational questions immediately:

- did a node disappear?
- did allocatable GPU count drop?
- are GPU devices running hot on memory or utilization?
- are units piling up in `Progressing` or `Failed`?
- are storage prepare jobs or accessors getting stuck?

## What "Nvidia GPU Monitoring" Means In This Chapter

It is worth being precise here.

Part 11 adds two layers of Nvidia monitoring.

The first layer is **inventory and schedulable-capacity monitoring**:

- total capacity
- allocatable capacity
- product grouping by `nvidia.com/gpu.product`

The second layer, when a DCGM exporter endpoint is configured, is **device-level runtime telemetry**:

- used frame-buffer memory
- free frame-buffer memory
- derived total frame-buffer memory
- GPU utilization percent

It still does **not** yet expose everything that Nvidia telemetry could provide, such as:

- SM occupancy
- memory bandwidth
- power draw
- temperature

Those richer signals are still a better fit for the Nvidia GPU Operator plus DCGM exporter, and the runtime manager is now consuming a small but useful subset of them.

So the platform boundary in this chapter is:

- the runtime manager owns cluster-facing inventory and lifecycle metrics
- the runtime manager can also surface a selected slice of device-level GPU telemetry by scraping a DCGM-compatible metrics endpoint
- deeper node-level observability can continue to live in the node telemetry stack

That split keeps the runtime control plane small while still making both scheduling problems and basic GPU usage drift visible.

## Verification

There are a few good checks after implementing this chapter.

### 1. Inspect the hardened PodSpec

```bash
kubectl get deploy unit-demo-instance -n runtime-instance -o yaml
```

Check for:

- `allowPrivilegeEscalation: false`
- dropped capabilities
- `seccompProfile: RuntimeDefault`
- `/dev/shm` mounted from a memory-backed volume

### 2. Inspect the generated `NetworkPolicy`

```bash
kubectl get networkpolicy egress-demo-instance -n runtime-instance -o yaml
```

Check for:

- DNS egress to `kube-system`
- public egress with `except`
- the blocked private and link-local CIDRs

### 3. Inspect health

```bash
curl -s http://127.0.0.1:8080/api/v1/health | jq
```

Check for:

- `readyNodeCount`
- `totalGPUCapacity`
- `totalGPUAllocatable`
- `gpuProducts`
- `usedGpuMemoryMiB`
- `averageGpuUtilizationPercent`

### 4. Inspect metrics

```bash
curl -s http://127.0.0.1:8082/metrics | rg '^runtime_'
```

That should show runtime lifecycle metrics, node GPU inventory metrics, and, when configured, per-device Nvidia memory and utilization metrics.

## Summary

Part 11 is where the runtime stops being only a controller that can launch Pods and starts behaving more like a production platform.

We now have:

- stricter security contexts and capability drops across runtime and helper workloads
- a sized `/dev/shm` contract for GPU-heavy applications
- egress isolation that blocks common internal and host-facing ranges while preserving narrow FRP exceptions
- richer health output with node readiness and Nvidia GPU inventory
- live Prometheus metrics for unit, storage, cluster GPU capacity, and DCGM-backed device memory and utilization state

That is a much stronger boundary than "the Pod is running, so it must be fine."

A production control plane should not only create workloads. It should also defend them and explain their state.

## Next Chapter Preview

Part 12 will pause the serverless control-path work for a moment and focus on a lower-level prerequisite: cold start. Large GPU images are expensive to pull and unpack, so the next chapter explains how OverlayBD changes the startup path and adds a small offline image-acceleration tool around the official userspace convertor.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
