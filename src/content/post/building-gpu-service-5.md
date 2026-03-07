---
title: "Building a GPU SaaS Platform - Kubebuilder Baseline and the First Real Reconcile"
publishDate: "5 March 2026"
description: "Part 5: move the project onto a standard kubebuilder layout, switch the API to Echo, and let requests create real custom resources."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator"]
---

Part 4 gave us a service-shaped project.

Part 5 is where it starts acting like a Kubernetes system instead of a well-organized mock.

The high-level change is simple:

- the HTTP server still accepts control-plane requests
- but it no longer tries to act as the source of truth
- instead, it creates a `StockPool` custom resource
- the controller reconciles that resource into a `Deployment`

That is the first real control loop in the project.

## What We Are Doing In This Chapter

This chapter does six concrete things:

1. refactor the project onto a standard `kubebuilder` layout
2. switch the HTTP layer from raw `net/http` to `echo`
3. define the `StockPool` CRD
4. implement `StockPoolReconciler` so a CR becomes a `Deployment`
5. generate RBAC and CRD manifests instead of hand-maintaining them
6. add unit tests for the API flow and reconcile flow

That gives us a believable baseline without pretending we already finished the whole runtime.

## A Few Ground Rules Before We Start

There are a few design choices in this chapter that are intentional, even if they are not final.

First, the HTTP server and the Kubernetes operator live in the same binary for now. That is a temporary trade-off, not a philosophical commitment. Long term, splitting them usually makes maintenance, failover, and ownership boundaries cleaner. But for this stage of the project, a single process keeps the lifecycle simple and makes the control flow easier to teach:

`request -> custom resource -> reconcile -> workload`

Second, some of the earlier "stock" ideas still show up in the broader series because this is an iterative project, not a fake greenfield rewrite every week. Stock-style reservation can simplify certain scheduling conversations, but it is not the final answer. Later in the series we will talk about better approaches and why they matter.

Third, this chapter uses `echo` instead of raw `net/http`. That is not because Go lacks framework choices. It definitely does not. You could reasonably pick `Gin`, `Fiber`, or something else. I picked `echo` for boring, practical reasons:

- it is easy to read and easy to wire
- it has solid documentation and a mature community
- its HTTP behavior is configurable enough for real services
- it stays lightweight for a control-plane service that should not become the main throughput bottleneck anyway

If the control plane ever becomes a hot path, you usually have a traffic-shaping problem before you have an HTTP framework problem.

## What Is An Operator?

An operator is just application-specific control logic built on top of the Kubernetes reconciliation model.

- users declare desired state
- Kubernetes stores that desired state
- a controller watches for changes
- the controller keeps nudging the cluster toward the declared state

That last bit matters. The controller is not just handling a one-shot request. It is continuously correcting drift.

For a GPU SaaS platform, that is exactly the model we want. Users ask for capacity. The system records the request. Controllers make the workloads exist and keep them healthy.

## What Is A CRD?

A CRD, or CustomResourceDefinition, is how you teach Kubernetes a new API type.

Without a CRD, `StockPool` is just a Go struct and some wishful thinking.

With a CRD:

- Kubernetes knows the resource exists
- the API server can store it
- clients can query it
- controllers can watch it

That is why this chapter is a real milestone. We are moving from "service logic that happens to know about Kubernetes" to "Kubernetes-native desired state with a dedicated API contract."

## Why We Switched To Kubebuilder

The previous hand-wired operator code was fine as a sketch. It was not fine as the foundation of a teaching project that is supposed to model production habits.

Once CRDs, controllers, RBAC, generated manifests, and manager wiring enter the picture, hand-rolling everything quickly becomes a maintenance tax.

Could we have picked `operator-sdk` instead? Sure. `kubebuilder` is not the only valid option. I picked it partly out of preference, and partly because the documentation is deep enough that when something goes sideways, you have a decent chance of finding the answer without sacrificing a weekend to archaeology.

So this iteration makes a clear move:

- use the standard `kubebuilder` project layout
- generate CRD and RBAC artifacts
- keep one binary and one control-plane entrypoint for now

That gives readers a structure they are likely to see again in real controller repositories.

## Architecture In This Iteration

```text
+--------------------------------------------------------------+
| cmd/main.go                                                  |
| one process: HTTP server + controller manager + background   |
| jobs                                                         |
+-----------------------------+--------------------------------+
                              |
                              v
                 +------------+-------------+
                 | Echo HTTP API            |
                 | POST /operator/stockpools|
                 +------------+-------------+
                              |
                              v
                 +------------+-------------+
                 | service layer            |
                 | create async job         |
                 | create StockPool CR      |
                 +------------+-------------+
                              |
                              v
                 +------------+-------------+
                 | StockPool CR             |
                 | runtime.lokiwager.io     |
                 +------------+-------------+
                              |
                              v
                 +------------+-------------+
                 | StockPoolReconciler      |
                 | ensure Deployment        |
                 | update status            |
                 +------------+-------------+
                              |
                              v
                 +------------+-------------+
                 | Deployment               |
                 | placeholder runtime pods |
                 +--------------------------+
```

Notice what changed from Part 4:

- the API is no longer the source of truth
- the custom resource is the source of truth
- reconcile owns the drift-correction path

That mental model is more important than any individual code snippet in this chapter.

## Step 1: Replace The Hand-Wired Layout With Kubebuilder

The first major change is structural.

We move from a homegrown operator layout to the standard shape most Kubernetes engineers expect:

- `PROJECT`
- `api/v1alpha1`
- `internal/controller`
- `config/crd`
- `config/rbac`
- `config/default`

Why do this now?

Because teaching real engineering practice means teaching the boring defaults too, not just the fun parts.

`kubebuilder` buys us a few things immediately:

- predictable file layout
- generated deepcopy methods
- CRD generation from Go markers
- RBAC generation from controller markers
- easier onboarding for anyone who has seen a controller repo before

This is not glamorous, but it is the kind of decision that saves your future self from becoming unpaid support for your own clever shortcuts.

## Step 2: Define A Small But Honest API Type

The `StockPool` API lives in [`api/v1alpha1/stockpool_types.go`](https://github.com/LokiWager/gpu-operator-runtime).

Core fields now look like this:

```go
type StockPoolSpec struct {
    SpecName string `json:"specName"`
    Image    string `json:"image,omitempty"`
    Memory   string `json:"memory,omitempty"`
    GPU      int32  `json:"gpu,omitempty"`
    Replicas int32  `json:"replicas"`
}

type StockPoolStatus struct {
    Available          int32       `json:"available,omitempty"`
    Allocated          int32       `json:"allocated,omitempty"`
    Phase              string      `json:"phase,omitempty"`
    ObservedGeneration int64       `json:"observedGeneration,omitempty"`
    LastSyncTime       metav1.Time `json:"lastSyncTime,omitempty"`
}
```

Why this shape?

`SpecName` stays because users still need a concrete runtime flavor such as `g1.1`.

`Replicas` is still the smallest useful desired-state signal.

`Image`, `Memory`, and `GPU` are where the API starts to feel less toy-like. Once those fields exist in the spec, readers can see a real path from control-plane input to pod template output.

`Status` gives users immediate feedback without forcing them to reverse-engineer controller logs every time something is still converging.

We also add kubebuilder markers so the CRD can be generated from the type:

```go
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Spec",type=string,JSONPath=`.spec.specName`
// +kubebuilder:printcolumn:name="Desired",type=integer,JSONPath=`.spec.replicas`
// +kubebuilder:printcolumn:name="Available",type=integer,JSONPath=`.status.available`
```

That means the CRD definition comes from the Go contract instead of a hand-maintained YAML file quietly drifting off the map.

## Step 3: Keep One Entry Point

The unified entrypoint is [`cmd/main.go`](https://github.com/LokiWager/gpu-operator-runtime).

This file now does three jobs:

- build the controller manager
- register the reconciler
- attach non-leader background runnables such as the HTTP server and the job worker

Manager setup:

```go
mgr, err := ctrl.NewManager(restConfig, ctrl.Options{
    Scheme: scheme,
    Metrics: metricsserver.Options{
        BindAddress:   metricsAddr,
        SecureServing: secureMetrics,
        TLSOpts:       tlsOpts,
    },
    HealthProbeBindAddress: probeAddr,
    LeaderElection:         enableLeaderElection,
    LeaderElectionID:       "9d4c4758.lokiwager.io",
})
```

Then we attach the API server to the manager lifecycle:

```go
if err := mgr.Add(nonLeaderRunnable{run: func(ctx context.Context) error {
    return startHTTPServer(ctx, httpServer)
}}); err != nil {
    os.Exit(1)
}
```

That is cleaner than building a second bootstrap world outside the manager and then trying to keep shutdown behavior consistent by brute force.

One more practical change landed in this iteration: the deployment manifest now declares the API port and exposes it through a dedicated Service:

- `config/manager/manager.yaml` declares `--http-addr=:8080` and the container port
- `config/default/api_service.yaml` exposes the HTTP API inside the cluster

That is the kind of detail teams forget surprisingly often when the binary grows from "just a controller" into "controller plus API."

## Step 4: Switch The API Layer To Echo

The HTTP layer in [`pkg/api/server.go`](https://github.com/LokiWager/gpu-operator-runtime) now uses `echo` instead of raw `net/http`.

Current endpoints:

```text
GET  /api/v1/health
GET  /api/v1/operator/stockpools
POST /api/v1/operator/stockpools
GET  /api/v1/operator/jobs/{jobID}
```

The service layer in [`pkg/service/service.go`](https://github.com/LokiWager/gpu-operator-runtime) owns the actual flow.

Request DTO:

```go
type CreateStockPoolRequest struct {
    Name      string `json:"name,omitempty"`
    Namespace string `json:"namespace,omitempty"`
    SpecName  string `json:"specName"`
    Image     string `json:"image,omitempty"`
    Memory    string `json:"memory,omitempty"`
    GPU       int32  `json:"gpu,omitempty"`
    Replicas  int32  `json:"replicas"`
}
```

Async create path:

```go
func (s *Service) CreateStockPoolAsync(ctx context.Context, req CreateStockPoolRequest) (domain.OperatorJob, error) {
    ...
    s.jobQueue <- createStockPoolJob{jobID: jobID, req: req}
    return job, nil
}
```

Worker:

```go
func (s *Service) StartOperatorJobWorker(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return
        case job := <-s.jobQueue:
            s.setJobRunning(job.jobID)
            if err := s.createStockPoolObject(ctx, job.req); err != nil {
                s.setJobFailed(job.jobID, err)
                continue
            }
            s.setJobSucceeded(job.jobID, job.req)
        }
    }
}
```

This is the key boundary in the current design:

`HTTP request -> async job -> CR creation -> reconcile`

We are no longer storing pretend runtime state in memory and calling that progress. The API hands desired state to Kubernetes. That is the right shape for the control plane we are trying to build.

## Step 5: Reconcile To A Deployment

The reconciler lives in [`internal/controller/stockpool_controller.go`](https://github.com/LokiWager/gpu-operator-runtime).

This is the first chapter where reconcile performs a real side effect:

- load `StockPool`
- ensure a `Deployment` exists
- update `Deployment.spec.replicas`
- map `image`, `memory`, and `gpu` into the pod template
- compute and write `StockPool.status`

The creation path looks like this:

```go
newDep, err := desiredDeployment(pool, desired)
if err := controllerutil.SetControllerReference(&pool, newDep, r.Scheme); err != nil {
    return ctrl.Result{}, err
}
if err := r.Create(ctx, newDep); err != nil {
    return ctrl.Result{}, err
}
```

And the status path still reflects observed state, not wishful thinking:

```go
next := runtimev1alpha1.StockPoolStatus{
    Available:          dep.Status.AvailableReplicas,
    Allocated:          maxInt32(desired-dep.Status.AvailableReplicas, 0),
    ObservedGeneration: pool.Generation,
    LastSyncTime:       metav1.NewTime(time.Now().UTC()),
}
```

The new resource mapping logic is especially worth noticing. `memory` is parsed into Kubernetes resource quantities, and `gpu` is wired to `nvidia.com/gpu` requests and limits. That means the reader can now see a clean line from API payload to CR spec to pod resources.

The deployment still uses a placeholder container image by default if one is not provided. That is fine. The point here is control flow, not pretending we have already built the final GPU runtime.

## Step 6: Let RBAC And CRD Manifests Be Generated

The repo now uses generated output under `config/`.

That includes:

- `config/crd/bases/runtime.lokiwager.io_stockpools.yaml`
- `config/rbac/role.yaml`
- `config/samples/runtime_v1alpha1_stockpool.yaml`

And the `Makefile` includes:

```bash
make manifests generate
```

This is one of those habits that pays off quietly. When manifests are derived from types and markers, the diff usually tells a coherent story. When they are maintained by hand, the diff often tells you someone forgot something on a random Friday and hoped nobody would notice.

## Step 7: Keep Tests Small And Direct

We keep tests practical in this chapter.

Controller test:

- [`internal/controller/stockpool_controller_test.go`](https://github.com/LokiWager/gpu-operator-runtime)

Service tests:

- [`pkg/service/service_operator_test.go`](https://github.com/LokiWager/gpu-operator-runtime)
- [`pkg/service/service_test.go`](https://github.com/LokiWager/gpu-operator-runtime)

API test:

- [`pkg/api/server_test.go`](https://github.com/LokiWager/gpu-operator-runtime)

The controller test now checks more than "did status change?" It also verifies that the reconciled deployment carries the expected image, memory limit, and GPU limit.

The service test verifies that the async job worker eventually creates the `StockPool` CR with the requested runtime fields.

That is enough coverage for this iteration because the main risk lives in glue code and state transitions.

We still have not introduced `envtest` here, and that is deliberate. This chapter already carries a major conceptual jump: `kubebuilder`, real reconciliation, and real workload generation. Throwing every testing strategy into the same chapter would make it louder, not better.

## How To Run This Version

In the code repo:

```bash
make manifests generate
kubectl apply -f config/crd/bases/runtime.lokiwager.io_stockpools.yaml
make run
```

Create a pool:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stockpools \
  -H 'Content-Type: application/json' \
  -d '{"name":"pool-g1","namespace":"default","specName":"g1.1","image":"nginx:1.27","memory":"16Gi","gpu":1,"replicas":2}' | jq
```

Then verify:

```bash
kubectl get stockpools.runtime.lokiwager.io pool-g1 -o yaml
kubectl get deployment -n default
```

If you deploy this through the generated manifests instead of `make run`, the in-cluster API is exposed on port `8080` through the generated API Service.

Local validation for this iteration:

```bash
make ci
```

That now covers:

- CRD/RBAC generation
- formatting
- `go vet`
- race-enabled tests
- build

## Common Mistakes In This Step

### The API works locally, but nothing happens in cluster

Check whether the process can actually talk to the cluster. This version relies on standard controller-runtime kubeconfig handling, so a bad context or missing config breaks the chain before reconcile even gets a chance to be blamed for crimes it did not commit.

### The `StockPool` exists, but no `Deployment` appears

Check:

- the reconciler is registered with the manager
- the CRD group/version matches the Go type
- RBAC allows `deployments` create and update

### The deployment is created, but the pod spec looks wrong

Check the CR values:

- `image`
- `memory`
- `gpu`

Remember that invalid `memory` values have to parse as Kubernetes resource quantities, and GPU is intentionally mapped to `nvidia.com/gpu`.

### Status never moves past progressing

Remember that `status` is based on observed deployment state, not on what we hope the cluster will do eventually. If the deployment is not becoming available, the operator should not fake confidence.

## Summary

Part 5 is the first chapter where the project starts to feel structurally honest.

We now have:

- a standard `kubebuilder` scaffold
- an `echo`-based control-plane API
- a single-process control plane
- an HTTP API that creates CRs instead of fake runtime state
- a reconciler that creates a real Kubernetes workload
- generated CRD and RBAC artifacts
- runtime fields flowing from API all the way into pod resources

That is a much stronger base for the rest of the book.

## Next Chapter Preview

Part 6 should stop at "minimal but real" and move into "useful."

That likely means:

- making the controller own more lifecycle detail
- improving idempotency and error handling
- tightening the API/job contract
- preparing the path toward actual runtime pods instead of placeholders

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
