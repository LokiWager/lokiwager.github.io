---
title: "Building a GPU SaaS Platform - Queue-First Ingress"
publishDate: "3 May 2026"
description: "Part 13: record the runtime-side serverless contract on GPU units and enqueue invocations durably through NATS JetStream before any worker executes them."
tags: [ "GPU", "SaaS", "Kubernetes", "Golang", "Operator", "Serverless", "NATS" ]
---

In Part 12, we dealt with cold start at the image level. That gave us a better startup path for large GPU images, but it still did not answer a more
basic serverless control-plane question:

where should requests go before any worker is ready?

The answer cannot be "directly to a Pod."

If requests go straight to a worker address, then we lose the main property that makes serverless workable in the first place:

- requests can arrive before workers exist
- requests can survive worker churn
- the platform can decide when to create, reuse, or retire workers

So Part 13 introduces the first queue-first runtime contract.

This chapter does two things:

1. it records the serverless policy that the control plane has already decided on
2. it makes invocation ingress durable by sending requests to NATS JetStream before any worker executes them

## Chapter Goal

By the end of Part 13, the project has four new properties:

1. `GPUUnit.spec.serverless` stores the runtime-side serverless contract, including the control-plane generated `requestID`
2. the manager can optionally connect to NATS JetStream through local YAML config
3. the HTTP API exposes a queue-first invocation ingress endpoint at `/api/v1/serverless/invocations`
4. synchronous and asynchronous invocation modes now share one durable message contract, even though the dedicated activator has not been added yet

This chapter intentionally does **not** yet implement:

- the dedicated activator service
- worker registration
- sidecar-based request execution
- scale-to-zero or prewarm lifecycle control

Those are the next chapter's job.

## The Full Request Path Readers Should Keep In Mind

Part 13 only implements one internal boundary, so it is easy to lose sight of the whole request path. Before we go deeper, it helps to state the
intended platform flow explicitly.

In the full design, each serverless application exposes its own public request URL from the control plane. A user does **not** call a worker Pod
directly, and does **not** call the runtime manager directly.

The end-to-end path is supposed to look like this:

1. a user sends a request to the public serverless URL
2. the control plane authenticates the caller and validates tenant, quota, and request shape
3. the control plane forwards the validated request into the platform's internal request path
4. the internal runtime-facing layer forwards the invocation to the runtime manager or operator API
5. the runtime manager persists the invocation into NATS JetStream
6. a later activator service consumes that durable request, decides whether to reuse or create a worker, and only then dispatches execution

This chapter implements step 5.

That is why the public request URL is **not** part of this repository, and why the endpoint added here:

```text
POST /api/v1/serverless/invocations
```

should be understood as an internal development-facing ingress for the queue boundary, not as the final public serving interface.

If we keep that picture in mind, the chapter becomes much easier to read. We are not trying to finish serverless routing here. We are only making sure
that, once a validated request reaches the runtime side, it is durably accepted before any worker decision happens.

## Why The Request ID Belongs To The Control Plane

Earlier in the series, some configuration naturally lived inside the runtime because it was really runtime-local. Serverless request identity is
different.

When a user configures a serverless application, the control plane decides the logical workload identity and scaling policy. That identity must exist
before any particular worker exists, because requests may arrive while the worker pool is still empty.

So this chapter treats the `requestID` as a control-plane artifact.

The runtime does **not** generate it.
The runtime only records it.

That is why the `GPUUnit` schema now carries a `serverless` block like this:

```yaml
serverless:
  enabled: true
  requestID: sd-webui
  minAvailableCount: 1
  idleTimeoutSeconds: 300
  minRequestCount: 0
```

This is not yet a worker-orchestration feature. It is a contract boundary.

The runtime can now say:

- this unit belongs to serverless request pool `sd-webui`
- this is the prewarm floor
- this is the idle timeout policy
- this is the threshold policy the future activator will honor

That is enough for this chapter.

## Why NATS JetStream Fits This Boundary

For this tutorial, NATS JetStream is a good fit for three reasons.

First, the publish path is very small. The runtime manager only needs to publish invocation envelopes durably and receive an acknowledgement.

Second, JetStream already gives us the durability and de-duplication hooks we need. This chapter uses the invocation ID as the JetStream message ID,
so duplicate publishes can be detected by the stream.

Third, the subject model maps cleanly onto later serverless control-plane concepts.

This chapter introduces three subject families:

```text
runtime.serverless.invoke.<requestID>
runtime.serverless.result.<requestID>
runtime.serverless.metrics.<requestID>
```

Only the invocation publish path is used today, but the result and metrics subjects are already part of the shared contract so that the activator and
worker sidecar can reuse the same identity in the next chapter.

## The Shared Invocation Contract

The new ingress endpoint uses one invocation envelope for both synchronous and asynchronous calls.

A simplified request looks like this:

```json
{
  "serverlessRequestID": "sd-webui",
  "mode": "sync",
  "payload": {
    "prompt": "draw a robot"
  }
}
```

The important design point is that `sync` and `async` are now part of the **message contract**, not part of the transport shortcut.

That means both modes follow the same first step:

1. validate and normalize the invocation request
2. assign or preserve an `invocationID`
3. publish the invocation envelope to JetStream
4. return the queue acknowledgement

After that first step, the two modes will diverge in later chapters:

- `async` will return the durable acknowledgement immediately, and the caller will track progress by `invocationID`
- `sync` will still enter the same durable queue first, but the future activator will wait on the corresponding result path and only return once a
  worker finishes or the request times out

In this chapter, `sync` does **not** yet block waiting for the model result, because the dedicated activator and worker path do not exist yet.

Instead, `sync` and `async` are both durably accepted into the same queue path, and the mode becomes a downstream execution hint for the activator we
will add next.

## What Changed In The Code

The runtime-side serverless contract now starts in the API type:

- `GPUUnit.spec.serverless`

That spec is normalized at the contract layer during create and update requests, so the runtime stores a clean `requestID` and defaulted lifecycle
values instead of leaving that work to the service layer later.

The queue contract lives in a dedicated shared package:

- `pkg/serverless`

That package defines:

- invocation modes
- subject builders
- request ID normalization
- the durable invocation envelope
- the NATS JetStream publisher

The manager YAML now has an optional `serverless:` section:

```yaml
serverless:
  url: "nats://127.0.0.1:4222"
  subjectPrefix: "runtime.serverless"
  streamName: "RUNTIME_SERVERLESS"
  streamReplicas: 1
  streamMaxAge: "72h"
  connectTimeout: "5s"
  duplicatesWindow: "24h"
```

If `url` is empty, queue ingress stays disabled.
If it is set, the manager connects to JetStream and ensures the stream exists before starting the HTTP API.

The new HTTP endpoint is:

```text
POST /api/v1/serverless/invocations
```

It does not try to execute work itself.
It only performs the durable enqueue step and returns a durable acknowledgement, including:

- the `invocationID`
- the stream sequence
- whether JetStream treated the publish as a duplicate
- the invocation, result, and metrics subjects associated with that serverless request ID

That response is the bridge between the internal request path and the later activator.

## Verification

There are four good checks after implementing this chapter.

### 1. Verify the new `GPUUnit` contract

Inspect the sample object:

```bash
cat config/samples/runtime_v1alpha1_gpuunit.yaml
```

Check that the `serverless:` block is present and records the control-plane identity and lifecycle hints.

### 2. Start a local JetStream-enabled NATS

```bash
nats-server -js
```

Then set `serverless.url` in `config/local/runtime-manager.yaml`.

### 3. Start the runtime manager

```bash
GOTOOLCHAIN=go1.26.0 go run ./cmd/main.go --config config/local/runtime-manager.yaml
```

The manager should create or update the configured stream before serving the API.

### 4. Publish one invocation

```bash
curl -X POST http://127.0.0.1:8080/api/v1/serverless/invocations \
  -H 'Content-Type: application/json' \
  -d '{
    "serverlessRequestID": "sd-webui",
    "mode": "async",
    "payload": {
      "prompt": "draw a robot"
    }
  }'
```

The response should contain:

- an `invocationID`
- a JetStream `sequence`
- the invocation subject
- the result subject
- the metrics subject

That means the request has entered the durable queue path before any worker execution exists.

## Summary

Part 13 is about ordering the serverless control plane correctly.

Before we add the activator, we need two things:

- a stable runtime-side record of serverless identity and lifecycle hints
- a durable queue ingress path that accepts work before workers are ready

This chapter adds both.

`GPUUnit` now records the serverless contract, and the runtime manager now publishes invocation envelopes into NATS JetStream before any execution
happens. In the full platform, that enqueue happens only after the control plane has already validated the user's request and forwarded it into the
internal runtime path. That gives the next chapter a clean starting point: the activator can focus on worker selection and lifecycle management
instead of inventing request identity and queue semantics from scratch.

## Next Chapter Preview

Part 14 will add the dedicated activator service. That chapter will consume the invocation subjects, decide when to create or reuse `GPUUnit` workers,
and connect the durable ingress path to real worker execution.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
