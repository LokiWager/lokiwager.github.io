---
title: "Building a GPU SaaS Platform - Useful Operator Contracts"
publishDate: "14 March 2026"
description: "Part 6: add operation idempotency, Swagger docs, clearer controller failure status, and the first runtime template."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator"]
---

Part 5 gave us a real control loop:

- HTTP request
- `StockPool` custom resource
- controller reconcile
- `Deployment`

That was the minimum line where the project stopped being a mock.

Part 6 is about making that line survivable.

In a real system, the next problems are not glamorous:

- clients retry requests
- duplicate writes appear
- bad specs get accepted and then fail somewhere deeper in the stack
- the controller owns too little of the workload lifecycle
- the pod template is still too fake to support later runtime work

That is exactly what this chapter fixes. No one wants to spend every day patching the same fragile system. If you have ever been on call, and spent the whole night half-awake because you were afraid of missing an alert, you already understand why these "boring" problems matter so much. Then the next day, because you did not sleep well, you create even more bugs. A lot of the time, engineers are not out there "building the future." They are repairing cracks in systems that should have been made safer earlier. That is why we need to take validation, monitoring, degradation, and circuit-breaking seriously from the beginning.

## Chapter Goal

By the end of this chapter, the runtime has five new properties:

1. create requests are idempotent at the operation level
2. the API contract is stricter about what a job means
3. the controller reports failures and lifecycle state more explicitly
4. `StockPool.spec` contains the first real runtime template instead of a hardwired `sleep 3600`
5. the Echo API publishes Swagger documentation so the contract is visible without reading handler code

This is not yet a full GPU runtime. It is the point where the Operator starts behaving like software that can survive retries, support debugging, and grow into real workloads.

## The Real Problem We Were Hiding

Before this iteration, a write request could easily lie to the caller without meaning to.

Example:

1. the API accepts a create request
2. the async job reports success because the CR was created
3. the controller later fails to build the workload because `memory` is invalid
4. the caller only sees "job succeeded" unless they inspect controller logs or cluster events

That is a bad contract.

A production system does not need perfect abstractions on day one, but it does need honest ones.

So Part 6 tightens the contract in two directions at the same time:

- the write path becomes safer under retries
- the reconcile path becomes more observable when desired state is invalid or incomplete

All changes in this chapter are tightly related. If you only add idempotency but keep bad controller feedback, you still have a hard-to-debug system.
If you only improve controller status but keep a loose write contract, retries still create garbage. If you only add a runtime template without a
service, you still have no stable network boundary for the pod. So when you finish this chapter, stop and ask yourself: is this really enough? What problems are still unsolved? If we leave them alone now, will they become much more expensive later? Keeping that instinct alive is part of what makes software engineering interesting.

## Why `operationID` Matters

Distributed systems retry. That is normal.

Browsers retry. Gateways retry. SDKs retry. Humans retry.

If a `POST` request can create two `StockPool` objects because the caller did not receive the first response, the problem is not "the caller should be smarter". The problem is that the API contract is under-specified.

So the create request now requires an `operationID`:

```go
type CreateStockPoolRequest struct {
    OperationID string `json:"operationID"`
    Name        string `json:"name,omitempty"`
    Namespace   string `json:"namespace,omitempty"`
    SpecName    string `json:"specName"`
    Image       string `json:"image,omitempty"`
    Memory      string `json:"memory,omitempty"`
    GPU         int32  `json:"gpu,omitempty"`
    Replicas    int32  `json:"replicas"`
    Template    runtimev1alpha1.StockPoolTemplate `json:"template,omitempty"`
}
```

The service now does three things with that identifier:

- it normalizes and validates the request before queuing work
- it computes a request hash from the normalized payload
- it stores both `operationID` and request hash on the `StockPool` annotations

That gives us useful behavior:

- same `operationID` + same payload: return the same operation
- same `operationID` + different payload: reject with `409 Conflict`
- generated object names become deterministic when the caller does not provide one

That last point matters more than it sounds. Random names are convenient in demos. They are terrible for idempotency.

## Why Swagger Belongs Here

Once we switched the HTTP layer to `echo`, the control-plane API stopped being "just a few handlers".

At that point, the contract deserves to be visible:

- request body shape
- response shape
- status codes
- path parameters
- query parameters

That is why this chapter adds Swagger now instead of much later.

This is not about chasing tooling for its own sake. It is about reducing ambiguity while the API surface is still small enough to keep honest.

The practical result is simple:

- the server now exposes `/swagger/index.html`
- the docs are generated from handler annotations
- `make swagger` and `make ci` keep the checked-in spec reproducible

For a teaching project, this matters even more than usual. Readers should be able to inspect the API contract directly, not reverse-engineer it from `curl` examples and handler code.

## Tightening What A Job Means

The job now represents:

- "did the control plane accept this operation?"
- "did it persist the desired state as a `StockPool` resource?"

It does **not** mean:

- "the runtime is ready for user traffic"

That distinction is important.

The operation contract belongs to the write path.
Runtime readiness belongs to reconciliation status.

If you collapse those two ideas into one field too early, the API becomes confusing very quickly.

So the split is now:

- `GET /api/v1/operator/jobs/:operationID`: operation acceptance/persistence
- `StockPool.status`: reconcile progress, readiness, and failure details

That is a much cleaner boundary.

## The Controller Owns More Of The Lifecycle Now

In Part 5, the controller only created a `Deployment`.

That was enough to prove the architecture, but it was still thin:

- no stable service endpoint for a runtime pod
- no explicit failed phase
- no readable condition message for invalid desired state

Part 6 extends controller ownership in two practical ways.

### 1. Reconcile the `Service`, not just the `Deployment`

If the runtime template exposes ports, the controller now creates a matching `ClusterIP` `Service`.

That is the first step toward a real runtime boundary:

- pods can restart and be replaced
- the service name stays stable
- later chapters can attach access policy, probes, ingress, or sidecar communication to a stable endpoint

This is why the service belongs in the controller instead of being created ad hoc somewhere in the API layer.

The controller owns workload lifecycle. A service is part of that lifecycle.

### 2. Report explicit failure and readiness conditions

The `StockPool` status now includes:

- `phase`
- `serviceName`
- `conditions`
- `observedGeneration`
- `lastSyncTime`

And the controller sets a `Ready` condition with reasons such as:

- `DeploymentProgressing`
- `DeploymentReady`
- `ScaledToZero`
- `InvalidSpec`
- `PodStartupFailed`
- `PodStatusSyncFailed`
- `ServiceSyncFailed`
- `DeploymentSyncFailed`

That means invalid desired state is no longer just a log line.

If `memory: "not-a-quantity"` is sent, the controller marks the resource as `Failed` with an `InvalidSpec` reason instead of endlessly returning a parse error and hoping someone notices.

That is a very production-shaped change. Operators should explain failure in resource status whenever they can.

This chapter also goes one step further: when the deployment exists but a runtime pod is failing to start, the controller inspects the owned pods and copies the most useful failure message into the `Ready` condition.

So instead of only seeing:

- `phase: Failed`

you can now get something much closer to the real problem, for example:

- image pull failures
- crash loop messages
- the last terminated container message when startup logic fails

That is the difference between "status exists" and "status helps you debug production".

## Preparing For Real Runtime Pods

The old pod template was intentionally primitive:

```go
Command: []string{"sh", "-c", "sleep 3600"}
```

That was fine in Part 5 because the goal was proving the control loop.

It is not fine anymore.

If the controller hardcodes the workload shape, every future runtime feature becomes awkward:

- ports
- startup command
- env injection
- probes
- storage mounts
- sidecars

So this iteration introduces the first real runtime-facing template:

```go
type StockPoolTemplate struct {
    Command []string          `json:"command,omitempty"`
    Args    []string          `json:"args,omitempty"`
    Envs    []StockPoolEnvVar `json:"envs,omitempty"`
    Ports   []StockPoolPortSpec `json:"ports,omitempty"`
}
```

That does not mean we are done. It means we now have the right place to put runtime concerns.

The controller still falls back to the placeholder sleep command when no template command or args are provided. That is intentional. We are not pretending to have a finished runtime image contract yet.

What changed is the direction of the architecture:

- workload shape is now part of desired state
- the controller translates that shape into container config and service ports
- later chapters can extend the template instead of rewriting the control flow again

## Flow After Part 6

```plaintext
+-----------------------------+
| Echo HTTP API               |
| POST /operator/stockpools   |
+-------------+---------------+
              |
              v
+-------------+---------------+
| service layer               |
| validate request            |
| require operationID         |
| detect duplicate payload    |
| create StockPool CR         |
+-------------+---------------+
              |
              v
+-------------+---------------+
| StockPool                    |
| spec.template                |
| operation annotations        |
+-------------+---------------+
              |
              v
+-------------+---------------+
| controller                    |
| reconcile Deployment         |
| reconcile Service            |
| update phase + conditions    |
+-------------+---------------+
              |
              v
+-------------+---------------+
| runtime worker pods          |
| stable ClusterIP service     |
+-----------------------------+
```

## Code Walkthrough

### Request validation moved before the queue

This is the right time to reject:

- missing `operationID`
- invalid `memory`
- negative replica or GPU values
- invalid or duplicate template env/port definitions

If the request is clearly wrong, the system should say so immediately. There is no value in accepting garbage, writing a CR, and forcing the
controller to discover the mistake later.

### Idempotency is anchored in Kubernetes state

The request hash is stored on the `StockPool` annotations, not only in an in-memory map.

That matters because the in-memory job store is only a convenience for this single-process stage. The custom resource is the durable system record.

This is one of the subtle lessons in production work:

- process memory is operationally useful
- Kubernetes objects are the contract boundary

### Status is now for humans, not just code

The controller uses `phase` and `conditions` together.

That is deliberate:

- `phase` is good for quick scanning
- `conditions` are good for precise diagnosis

This is why many mature Kubernetes APIs use both a compact summary and condition detail.

## Run And Verify

Run the code:

```bash
cd ./gpu-operator-runtime
make ci
make run
```

Before you test a request with `"gpu": 1`, make sure the cluster already exposes `nvidia.com/gpu`.

For most readers, that means installing NVIDIA GPU Operator first. A manually prepared cluster also works, but only if the NVIDIA drivers, runtime integration, and device plugin are already in place.

If the cluster does not expose `nvidia.com/gpu`, keep the tutorial request at `gpu: 0` while you work on the API and controller flow.

Open the API docs:

```bash
open http://127.0.0.1:8080/swagger/index.html
```

Create a stock pool with a real runtime template:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stockpools \
  -H 'Content-Type: application/json' \
  -d '{
    "operationID": "stock-g1-demo-001",
    "name": "pool-g1-demo",
    "namespace": "default",
    "specName": "g1.1",
    "image": "python:3.12-slim",
    "memory": "16Gi",
    "gpu": 1,
    "replicas": 1,
    "template": {
      "command": ["python"],
      "args": ["-m", "http.server", "8080"],
      "envs": [
        {"name": "MODEL_ID", "value": "demo-model"}
      ],
      "ports": [
        {"name": "http", "port": 8080, "protocol": "TCP"}
      ]
    }
  }' | jq
```

Send the same request again:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stockpools \
  -H 'Content-Type: application/json' \
  -d @same-request.json | jq
```

Expected result:

- first request returns `202 Accepted`
- second request returns `200 OK`
- both refer to the same `operationID`

Try reusing the same `operationID` with a different payload:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stockpools \
  -H 'Content-Type: application/json' \
  -d '{
    "operationID": "stock-g1-demo-001",
    "name": "pool-g1-demo",
    "namespace": "default",
    "specName": "g2.1",
    "replicas": 1
  }' | jq
```

Expected result:

- `409 Conflict`

Inspect the cluster objects:

```bash
kubectl get stockpool pool-g1-demo -n default -o yaml
kubectl get deployment pool-pool-g1-demo -n default
kubectl get service pool-pool-g1-demo -n default
```

Useful fields to inspect:

- `.metadata.annotations["runtime.lokiwager.io/operation-id"]`
- `.status.phase`
- `.status.serviceName`
- `.status.conditions`

If a pod is crashing, inspect the failure message directly from the condition:

```bash
kubectl get stockpool pool-g1-demo -n default -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}'
```

If you want to force a failure path, send an invalid memory quantity:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stockpools \
  -H 'Content-Type: application/json' \
  -d '{
    "operationID": "stock-invalid-001",
    "name": "pool-invalid",
    "namespace": "default",
    "specName": "g1.1",
    "memory": "not-a-quantity",
    "replicas": 1
  }' | jq
```

That request should now fail fast at the API boundary instead of sneaking into reconciliation.

If a bad CR is created manually, the controller should mark it `Failed` with an `InvalidSpec` reason.

## Summary

Part 6 is where the Operator stops being merely correct in architecture and starts becoming trustworthy in behavior.

We now have:

- operation-level idempotency
- deterministic write semantics under retry
- a clearer split between write acceptance and runtime readiness
- controller-owned `Service` reconciliation
- explicit failure status and readiness conditions
- pod startup failure messages surfaced into status
- a first runtime template for command, args, envs, and ports
- Swagger documentation published from the Echo server

That is the right foundation for the next stage.

We can now start talking about storage and real runtime mounting without pretending the pod contract still lives in controller code.

## Next Chapter Preview

Part 7 is where we move from stock capacity to real user-facing GPU instances.

Right now, we only create stock. We do not yet create the actual GPU instance a user can access. That is the next step. Once we reach that point, the system starts to feel much closer to a real runtime product.

In the next chapter, we will implement:

- the flow that turns a stock unit into a real GPU instance
- how users reach that GPU instance
- GPU instance status reporting
- the GPU instance deletion flow
- the GPU instance update flow

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
