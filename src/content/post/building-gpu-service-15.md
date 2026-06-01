---
title: "Building a GPU SaaS Platform - Worker Sidecar"
publishDate: "31 May 2026"
description: "Part 15: add a serverless worker sidecar, define a UDS framework contract, and return results and metrics through NATS."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator", "Serverless", "NATS"]
---

In Part 14, the activator finally knew how to turn one ingress invocation into one worker-targeted dispatch message.

这一章，我们要将 side-car 这边开发完整，并定义好 framework 的数据结构。当请求进入到 Nats 时，会被 activator 接收， 然后会根据情况决定是否启动 worker 还是复用已有的 worker。
当 worker 存在时，请求会被 dispatch 给相应的 worker。我们的 worker 是由 side-car 和 framework container 组成。side-car 负责验证和接受请求，因为我们不能让 Nats 的凭证，存储
到用户的 container 中，这样不安全。然后让 side-car 和 main container 通过 uds 通信，不仅效率比较好，而且更安全。

## Chapter Goal

By the end of Part 15, the project has six new properties:

1. serverless-enabled `GPUUnit` Pods now get a dedicated `serverless-sidecar`
2. that sidecar runs as a restartable init sidecar, just like the SSH path we introduced earlier
3. the worker framework now has a concrete UDS-backed HTTP contract: `GET /healthz` and `POST /invoke`
4. the sidecar consumes `runtime.serverless.dispatch.<requestID>.<workerName>`
5. the sidecar calls the local framework and then publishes results, sync replies, and metrics back into NATS
6. `GPUUnit.status.serverless` and `ServerlessReady` now expose the worker-side queue boundary in status

## Why The Sidecar Owns NATS

At this point, the trust split is no longer theoretical:

- the activator publishes a worker-targeted dispatch subject
- the sidecar consumes that subject
- the framework only serves a local UDS-backed HTTP API
- the user handler only runs behind the framework

That means the only component that ever sees:

- NATS credentials
- durable subject names
- reply-subject wiring
- result or metrics publication

is the sidecar.

The framework never gets that power.

That is important because the framework is still user-controlled code. Even if it is packaged as a "framework image", it still sits much closer to user logic than to platform transport.

So the platform boundary inside the Pod becomes:

```text
dispatch subject
  -> sidecar
  -> local UDS contract
  -> framework
  -> user handler
  -> framework
  -> sidecar
  -> result / reply / metrics subjects
```

That is the first worker design in this series that gives the platform a real transport boundary inside the Pod instead of only outside it.

## Why The Framework Contract Lives In The Unit Spec

The sidecar image is platform configuration.

The local framework contract is workload configuration.

Those are different things.

The operator knows which sidecar image to inject because that belongs to the platform rollout. That is why the manager YAML now carries `serverlessWorker.image`, heartbeat cadence, and sidecar health-port defaults.

But the framework's local contract belongs to the worker itself.

That is why `GPUUnit.spec.serverless` now grows a `framework` block:

```yaml
serverless:
  enabled: true
  requestID: sd-webui
  minAvailableCount: 1
  idleTimeoutSeconds: 300
  minRequestCount: 0
  framework:
    socketPath: /tmp/serverless-framework/framework.sock
    invokePath: /invoke
    healthPath: /healthz
```

This keeps the right ownership split:

- control plane chooses the serverless policy and request pool
- workload contract chooses the local framework endpoint
- operator injects the sidecar around that workload contract

In other words, the operator is not inventing the framework surface. It is consuming and enforcing the worker contract already recorded on the unit.

## The Local Framework Contract

The local protocol is intentionally narrow.

The sidecar expects two HTTP endpoints over one shared unix domain socket:

- `GET /healthz`
- `POST /invoke`

By default, that socket path is:

- `/tmp/serverless-framework/framework.sock`

The `healthz` endpoint is only there so the sidecar can block startup until the framework is actually ready.

The interesting part is the `invoke` envelope.

The sidecar sends one JSON payload like this:

```json
{
  "version": "v1",
  "invocationID": "inv-1234",
  "serverlessRequestID": "sd-webui",
  "workerName": "unit-sd-webui-a",
  "workerNamespace": "runtime-instance",
  "mode": "sync",
  "contentType": "application/json",
  "headers": {
    "x-request-id": "abc"
  },
  "attributes": {
    "path": "/generate",
    "method": "POST"
  },
  "payload": {
    "prompt": "draw a robot"
  },
  "timeoutSeconds": 30,
  "dispatchedAt": "2026-05-18T10:00:00Z"
}
```

And the framework returns one JSON envelope like this:

```json
{
  "statusCode": 200,
  "contentType": "application/json",
  "headers": {
    "x-model": "demo"
  },
  "body": {
    "imageURL": "s3://bucket/out.png"
  }
}
```

That is an important design choice.

The sidecar is not proxying raw HTTP from the public edge into the user container.
It is sending a normalized invocation envelope.

That means:

- the public ingress contract can evolve independently
- the worker contract stays stable even if the control plane changes
- metrics and result publication stay attached to one invocation ID
- retries remain a sidecar decision, not a user-handler decision

## The Framework Helper Package

For this chapter, I wanted something more concrete than "you can imagine a local framework."

So the repo now includes a small helper package under:

- `pkg/framework`

That package provides:

- `NewHTTPHandler(...)` to build the local `/healthz` and `/invoke` endpoints
- `ServeUnix(...)` to serve that handler over a shared unix domain socket

The point is not to declare that every user workload must be written in Go.

The point is to make the contract executable and explicit.

If the user workload is written in Go, it can import the helper directly.
If it is written in another language, it can still implement exactly the same wire contract.

For local verification, the repo now also includes:

- `cmd/framework-echo`

That binary is not meant to be the production framework.
It is just a minimal worker-local implementation that echoes the invocation envelope back as JSON so the sidecar loop can be tested end to end.

## The Worker Sidecar Loop

The new sidecar binary lives at:

- `cmd/serverless-sidecar`

and its core runtime logic lives at:

- `pkg/workersidecar`

The loop is deliberately small:

1. load worker identity and NATS config from injected env vars
2. wait until the local framework health endpoint returns `200`
3. publish a `registered` worker metric event
4. consume one concrete dispatch subject for one worker
5. translate the dispatch message into the local framework invocation envelope
6. call `POST /invoke` over the shared unix domain socket
7. publish one durable invocation result
8. publish one sync reply if the original invocation asked for `mode: "sync"`
9. publish lifecycle and execution events to the metrics subject

That means the worker Pod now has a real execution loop instead of just a conceptual boundary.

## Why The Sidecar Is Injected As A Restartable Init Sidecar

We already used the restartable init-sidecar pattern for SSH.

It also fits the serverless worker path well.

The sidecar is not "the application" in the same sense as the user handler, but it must:

- start before the worker is considered meaningfully ready
- remain alive for the whole Pod lifetime
- be visible in container failure status

That is exactly the same shape as the SSH sidecars.

So the controller now injects `serverless-sidecar` as a restartable init sidecar when:

- the unit is an instance unit
- `spec.serverless` is enabled

The controller also injects framework contract env vars into the runtime container:

- `SERVERLESS_REQUEST_ID`
- `SERVERLESS_WORKER_NAME`
- `SERVERLESS_WORKER_NAMESPACE`
- `SERVERLESS_FRAMEWORK_SOCKET_PATH`
- `SERVERLESS_FRAMEWORK_INVOKE_PATH`
- `SERVERLESS_FRAMEWORK_HEALTH_PATH`

That makes the local framework contract explicit on both sides of the boundary:

- the sidecar knows where to call
- the framework container knows what endpoint it is expected to expose

## The New Status Surface

This chapter also extends `GPUUnit.status`.

There is now a dedicated:

- `status.serverless`
- `ServerlessReady` condition

The status includes:

- `phase`
- `dispatchSubject`
- `socketPath`
- `invokePath`
- `healthPath`

This is useful for two reasons.

First, it lets us debug the worker-side boundary without dropping straight into Pod logs.

Second, it gives the next lifecycle chapter one stable place to attach readiness and lifecycle semantics.

The worker lifecycle manager should not infer everything from Pod phase forever.
It should have one explicit serverless status surface to build on.

## One Quiet But Important Network Policy Change

There is one more change here that is easy to miss.

By default, this project blocks several private CIDR ranges from worker egress.

That is a good security default, but it would also accidentally block the sidecar from reaching an in-cluster NATS Service.

So the network-policy helper now adds one explicit exception when:

- serverless is enabled
- the configured NATS URL points at a Kubernetes `*.svc` DNS name
- the manager config also provides `serverless.networkPolicyTarget.namespace` and `podLabels`

In that case the generated `NetworkPolicy` does **not** open a whole CIDR range.
It creates one egress peer with:

- a `namespaceSelector` for the NATS namespace
- a `podSelector` for the NATS Pods
- one TCP port rule derived from the NATS URL

That keeps the secure default, but still lets the worker Pod reach exactly one trusted platform dependency.

If `serverless.url` points at a cluster Service but `networkPolicyTarget` is missing, the runtime now treats that as a configuration error instead of silently creating a worker that cannot reach NATS.

## Verification

There are two useful verification layers for this chapter.

### 1. Cluster-side injection

Create one serverless-enabled `GPUUnit`:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/gpu-units \
  -H 'Content-Type: application/json' \
  -d '{
    "operationID":"unit-sd-webui-001",
    "name":"sd-webui-template",
    "specName":"g1.1",
    "image":"python:3.12",
    "template":{
      "ports":[{"name":"http","port":8080}]
    },
    "access":{
      "primaryPort":"http",
      "scheme":"http"
    },
    "serverless":{
      "requestID":"sd-webui",
      "framework":{
        "socketPath":"/tmp/serverless-framework/framework.sock",
        "invokePath":"/invoke",
        "healthPath":"/healthz"
      }
    }
  }' | jq
```

Then inspect the generated Deployment:

```bash
kubectl get deploy -n runtime-instance sd-webui-template -o yaml
```

You should see:

- one restartable init sidecar named `serverless-sidecar`
- framework env vars injected into the runtime container
- `status.serverless.dispatchSubject` on the `GPUUnit`

### 2. Local worker-loop verification

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

Start the example local framework:

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

Then issue one sync invocation:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/serverless/invocations \
  -H 'Content-Type: application/json' \
  -d '{
    "serverlessRequestID":"sd-webui",
    "mode":"sync",
    "attributes":{
      "path":"/generate",
      "method":"POST"
    },
    "payload":{
      "prompt":"draw a robot"
    }
  }' | jq
```

At this point the sync path should no longer stop at activator dispatch.
It should return a worker-side result envelope generated by the example framework.

## Summary

Part 15 is where the worker Pod stops being only a deployment target and starts becoming a trusted execution boundary.

We now have:

- a real worker sidecar process
- a concrete unix domain socket framework contract
- controller-side injection of that sidecar into serverless `GPUUnit` Pods
- worker-side result, sync reply, and metrics publication
- `status.serverless` and `ServerlessReady` for the Pod-local queue boundary

That is the missing half of the design we sketched in Part 14.

The activator can now publish a worker-targeted dispatch subject, and the worker Pod actually knows how to consume it without ever handing NATS directly to user code.

## Next Chapter Preview

Part 16 will build on these worker-side metrics and lifecycle signals to handle prewarm pools, idle scale-down, and more complete async result handling.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
