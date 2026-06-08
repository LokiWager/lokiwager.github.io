---
title: "Building a GPU SaaS Platform - Worker Lifecycle"
publishDate: "01 Jun 2026"
description: "Part 16: add activator-owned worker lifecycle management, prewarm pools, idle scale-down, and metrics-driven worker state."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator", "Serverless", "NATS"]
---

In the previous chapter, we changed the worker sidecar and the main worker container so that the sidecar consumes dispatch data and communicates with the worker over UDS. That keeps NATS credentials inside the trusted platform boundary while letting users focus as much as possible on their own application logic.

But the most important serverless concern, worker lifecycle management, was still missing. We need at least a few basic policies, such as the minimum number of available instances, maximum idle time, and scale-up or scale-down rules.

So in this chapter, we will finish the last missing piece of the serverless runtime path.

## Chapter Goal

By the end of Part 16, the project has four new properties:

1. the activator consumes worker metrics and maintains an in-memory worker state table
2. `serverless.minAvailableCount` now drives prewarm worker creation
3. `serverless.idleTimeoutSeconds` now drives idle worker scale-down
4. activator-created workers are clearly separated from user-created template units

This chapter is about putting lifecycle ownership in the correct process and making the control loop executable.
But is this already a production-ready architecture? Which critical modules are still missing? Keep those questions in mind as we walk through the chapter.

## The New Lifecycle Shape

The runtime-side shape now looks like this:

![Serverless lifecycle architecture](/images/building-gpu-service-16-lifecycle.svg)

The activator now runs two durable consumers plus one periodic reconcile loop:

1. ingress consumer: turns queued invocations into worker dispatch messages
2. metrics consumer: records worker registration, heartbeat, start, finish, and failure events
3. lifecycle reconcile: creates missing warm workers and deletes idle managed workers

That means the activator is no longer only a dispatch bridge.
It is now the owner of the serverless worker pool.

## Prewarm: Turning `minAvailableCount` Into Workers

The control plane records the serverless policy on the `GPUUnit` spec:

```yaml
serverless:
  enabled: true
  requestID: sd-webui
  minAvailableCount: 2
  idleTimeoutSeconds: 300
  framework:
    socketPath: /tmp/serverless-framework/framework.sock
    invokePath: /invoke
    healthPath: /healthz
```

The activator periodically lists serverless-enabled `GPUUnit` objects and groups them by `serverless.requestID`.

For each request group, it compares:

- desired warm capacity: `minAvailableCount`
- current ready workers
- current progressing workers

If ready plus progressing is below the target, the activator creates more workers by cloning the non-managed template unit for that request ID.

The worker creation still goes through the existing `CreateGPUUnit` service path.
That is important because stock handoff, storage validation, SSH settings, access settings, and serverless sidecar injection all remain in the same runtime path we already built.

The activator is not creating Pods directly.
It is asking the runtime service to create another `GPUUnit`.

## Worker Names Need To Be Distinguishable

A subtle lifecycle problem appears as soon as scale-down exists:

how does the activator know which workers it is allowed to delete?

We do not want it to delete the user-created template unit by accident.

So activator-created workers now use a distinct managed-name shape:

```text
unit-<requestID>-worker-<suffix>
```

For example:

```text
unit-sd-webui-worker-12345678
```

That gives the lifecycle loop a simple rule:

- user-created template units are preserved
- activator-created managed workers may be deleted when they are idle

This is deliberately conservative.

If a unit was not created by the activator naming path, the lifecycle manager leaves it alone.

## Idle Scale-Down: Metrics Become Lifecycle Input

The worker sidecar already emits metrics events:

- `registered`
- `heartbeat`
- `invocation_started`
- `invocation_finished`
- `invocation_failed`

Part 16 adds an activator metrics consumer for:

```text
runtime.serverless.metrics.<requestID>
```

The activator folds those events into a worker state table:

```text
worker namespace/name
  -> requestID
  -> last seen time
  -> last activity time
  -> inflight count
  -> last event type
```

There is one important detail:

heartbeats update `lastSeen`, not `lastActivity`.

If heartbeat refreshed activity, an idle worker would never become idle because the sidecar keeps sending heartbeats forever. So activity is only advanced by registration or invocation events.

When `idleTimeoutSeconds` is configured, the lifecycle loop can delete a worker only when all of these are true:

- the worker is ready
- the worker name matches the activator-managed name pattern
- the worker has no inflight invocation according to metrics
- the worker has been idle longer than `idleTimeoutSeconds`
- deleting it would not take the ready pool below `minAvailableCount`

That gives us the first real scale-down path without letting the activator delete user-owned template units.

## Where Results Go In This Boundary

Part 13 introduced async invocation enqueueing.
Part 15 made the worker publish results.

Part 16 deliberately does **not** make the activator a result API.

The worker sidecar already publishes completed results to:

```text
runtime.serverless.result.<requestID>
```

That subject is still part of the runtime event stream, but the activator does not consume it.

For sync requests, the activator only preserves the dispatch contract. If the invocation has a `replySubject`, the activator passes it through to the worker dispatch message. The worker sidecar sends the result to that reply subject after local execution completes.

For async requests, result lookup belongs to the control plane:

1. user calls the control-plane serverless URL
2. control plane validates auth, tenant, quota, and request shape
3. control plane publishes or forwards the invocation into the runtime queue path
4. activator dispatches to workers
5. worker sidecar publishes the durable result event
6. a control-plane result consumer stores metadata and object pointers
7. user reads the async result through a control-plane signed URL

The storage piece is not in Part 16. We will add it in Part 17 with ScyllaDB for invocation metadata and object storage for large payloads or results.

## What Changed In The Code

The shared serverless queue contract now has one new consumer interface:

- `WorkerMetricConsumer`

The NATS implementation now consumes:

```text
runtime.serverless.metrics.*
```

The activator package now includes:

- a `LifecycleManager` that observes metrics and reconciles worker pools
- config for metrics consumer name and lifecycle interval

The activator config now looks like this locally:

```yaml
consumerName: "runtime-activator"
metricsConsumerName: "runtime-activator-metrics"
workerReadyWait: "2m"
workerPollInterval: "2s"
lifecycleInterval: "15s"
serverless:
  url: "nats://127.0.0.1:4222"
  subjectPrefix: "runtime.serverless"
  streamName: "RUNTIME_SERVERLESS"
```

The runtime controller still owns Pod construction.
The worker sidecar still owns NATS inside the Pod.
The framework still only talks over UDS.

Part 16 only changes who owns worker lifecycle decisions.

## Verification

Start NATS:

```bash
nats-server -js
```

Start the manager:

```bash
GOTOOLCHAIN=go1.26.0 go run ./cmd/main.go --config config/local/runtime-manager.yaml
```

Start the activator:

```bash
GOTOOLCHAIN=go1.26.0 go run ./cmd/activator --config config/local/activator.yaml
```

Start the example framework:

```bash
SERVERLESS_FRAMEWORK_SOCKET_PATH=/tmp/serverless-framework/framework.sock \
GOTOOLCHAIN=go1.26.0 go run ./cmd/framework-echo
```

Start the worker sidecar:

```bash
SERVERLESS_NATS_URL=nats://127.0.0.1:4222 \
SERVERLESS_SUBJECT_PREFIX=runtime.serverless \
SERVERLESS_STREAM_NAME=RUNTIME_SERVERLESS \
SERVERLESS_WORKER_NAME=sd-webui-template \
SERVERLESS_WORKER_NAMESPACE=runtime-instance \
SERVERLESS_REQUEST_ID=sd-webui \
SERVERLESS_FRAMEWORK_SOCKET_PATH=/tmp/serverless-framework/framework.sock \
SERVERLESS_FRAMEWORK_INVOKE_PATH=/invoke \
SERVERLESS_FRAMEWORK_HEALTH_PATH=/healthz \
GOTOOLCHAIN=go1.26.0 go run ./cmd/serverless-sidecar
```

Then enqueue an async invocation:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/serverless/invocations \
  -H 'Content-Type: application/json' \
  -d '{
    "serverlessRequestID":"sd-webui",
    "mode":"async",
    "attributes":{
      "path":"/generate",
      "method":"POST"
    },
    "payload":{
      "prompt":"draw a lifecycle diagram"
    }
  }' | jq
```

At this chapter boundary, the result event is published to NATS but not yet persisted into a product result store. That persistence path is the ScyllaDB-backed Part 17.

For lifecycle behavior, create or update a serverless `GPUUnit` with:

```yaml
serverless:
  requestID: sd-webui
  minAvailableCount: 2
  idleTimeoutSeconds: 60
```

Then watch the runtime namespace:

```bash
kubectl get gpuunits -n runtime-instance -w
```

The activator should create managed workers until the warm pool target is reached.
After managed workers go idle longer than the timeout, it should delete only the activator-created workers while preserving the template unit.

## Summary

Part 16 turns the activator from a request dispatcher into the owner of serverless worker lifecycle.

We now have:

- prewarm behavior from `minAvailableCount`
- idle scale-down from worker-side metrics and `idleTimeoutSeconds`
- conservative deletion that only applies to activator-managed workers
- a cleaner split between controller-owned Pod shape and activator-owned request pressure

The core serverless path now has the right control loops, even though the state is still local to one activator process.

## Next Chapter Preview

Part 17 will add the result storage layer: ScyllaDB for invocation metadata and status, object storage for large payloads and result bodies, local Docker configuration, and a control-plane result consumer that writes worker result events into storage.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
