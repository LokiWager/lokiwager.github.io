---
title: "Building a GPU SaaS Platform - Runtime Control Plane Split"
publishDate: "14 Jun 2026"
description: "Part 18: split the runtime into a reconciler-only controller manager and a separate runtime API server."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator", "Control Plane"]
---

After the work from the previous chapters, the runtime finally has a useful MVP. It can create GPU instances, attach storage, expose access paths, support serverless invocation, dispatch work through a queue, and persist invocation results.

But that MVP also came with technical debt.

During the MVP phase, we made several tradeoffs to validate the design quickly. To ship the core path before the deadline, we skipped some engineering polish that a real platform eventually needs.

The next few chapters are about paying down that debt through focused refactoring.

The first refactor is to separate the API server from the operator. That gives both components better scalability, clearer ownership, and a cleaner foundation for future multi-cluster support.

## Chapter Goal

By the end of Part 18, the runtime has a clearer process boundary:

1. `cmd/controller-manager` runs Kubernetes reconcilers
2. `cmd/runtime-api` runs the REST API and API-owned background jobs
3. local YAML config is split by process
4. Kubernetes manifests deploy two separate workloads
5. the old `cmd/main.go` entrypoint is retired as a compatibility warning

This chapter does not redesign the public control plane.

The public URL, tenant authentication, quota checks, signed async result URLs, and user-facing request validation still belong to the product control plane. The runtime API remains an internal service behind that control plane.

## Why Split It

A Kubernetes controller and an API server have very different jobs.

The controller manager is a reconciliation loop. It watches Kubernetes state, compares desired state with observed state, and moves the cluster toward the target. It should be leader-elected because two active reconcilers updating the same objects can fight each other.

The runtime API is request/response infrastructure. It accepts internal control-plane requests, validates and normalizes them at the API boundary, creates or reads custom resources, publishes serverless invocation messages, and reports health. It should be horizontally scalable and should not depend on controller leadership.

Keeping them in one process creates several bad couplings:

- scaling the API also scales the controller
- restarting the API also restarts reconciliation
- controller leader election affects unrelated HTTP traffic
- controller-level permissions are too easily handed to the API surface
- debugging API latency and reconcile latency becomes noisier

## The New Process Map

The runtime now looks like this:

```text
control plane
  -> runtime-api
       -> service layer
       -> Kubernetes API for GPUUnit / GPUStorage objects
       -> NATS JetStream for serverless invocation ingress

Kubernetes API
  -> controller-manager
       -> GPUUnit reconciler
       -> GPUStorage reconciler
       -> Deployment / Service / PVC / Job / NetworkPolicy reconciliation
```

The activator, worker sidecar, framework, and result-store remain separate processes from earlier chapters.

This chapter only splits the old runtime manager process into two pieces.

## Controller Manager Boundary

The new controller entrypoint is:

```bash
GOTOOLCHAIN=go1.26.0 go run ./cmd/controller-manager --config config/local/controller-manager.yaml
```

Its job is intentionally narrow:

- load controller-manager YAML
- start controller-runtime manager
- register `GPUUnitReconciler`
- register `GPUStorageReconciler`
- expose controller metrics
- expose `/healthz` and `/readyz`
- use leader election when configured

It does not create the REST API server.

It does not start the API-owned async stock job worker.

It does not publish serverless invocation requests.

That last point is important. The controller still needs serverless queue configuration because it generates worker Pod network policy and worker sidecar configuration. But it should not become the ingress path for user requests.

## Runtime API Boundary

The new API entrypoint is:

```bash
GOTOOLCHAIN=go1.26.0 go run ./cmd/runtime-api --config config/local/runtime-api.yaml
```

The runtime API owns the internal HTTP surface:

- `/api/v1/gpu-units`
- `/api/v1/gpu-storages`
- `/api/v1/operator/stock-units`
- `/api/v1/serverless/invocations`
- `/api/v1/health`
- Swagger docs

It still needs a Kubernetes client.

That is expected. The API server creates and reads `GPUUnit` and `GPUStorage` resources. Splitting the process does not mean the API stops talking to Kubernetes. It means the API no longer runs reconciliation loops.

The runtime API also starts the background worker that belongs to the API surface:

```text
POST /api/v1/operator/stock-units
  -> enqueue API-owned stock seeding job
  -> runtime-api worker creates the requested CRDs
```

That worker is not a controller. It is an implementation detail of an API endpoint, so it stays with `runtime-api`.

The same rule applies to serverless ingress. The API receives an internal invocation request and publishes it into NATS. The activator consumes from NATS later and decides whether a worker can handle the request or whether a new `GPUUnit` should be created.

## What Changes Operationally

The biggest operational change is failure isolation.

If the runtime API crashes, reconciliation can continue.

If the controller manager is leader-electing, restarting, or blocked by a Kubernetes API issue, the API process can still return health and expose internal request errors clearly.

The two processes can also scale differently:

- controller-manager usually runs with one active leader
- runtime-api can run multiple replicas behind a Service
- activator scales based on queue and worker lifecycle pressure
- result-store scales based on result event write throughput

That shape is much closer to a real control plane.

## Summary

Part 18 turns the runtime from one large manager process into two clearer services.

The controller manager now owns Kubernetes reconciliation.

The runtime API now owns internal HTTP requests, API-level background work, and serverless ingress publication.

That gives us cleaner lifecycles, safer scaling behavior, and a better base for the next pieces of the platform.

The next chapter will revisit inventory and allocation. The current empty-Pod stock model was useful for teaching the handoff flow, but Kubernetes already has stronger primitives for precise GPU allocation. It is time to move closer to those primitives.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
