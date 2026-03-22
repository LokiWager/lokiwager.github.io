---
title: "Building a GPU SaaS Platform - One Unit, One Controller"
publishDate: "21 March 2026"
description: "Part 7: collapse stock and runtime into one GPUUnit resource, seed stock explicitly, and hand off warm units into active runtime."
tags: [ "GPU", "SaaS", "Kubernetes", "Golang", "Operator" ]
---

By the end of Part 6, we already had a workable GPU runtime skeleton. We could seed stock and manage it through the control plane. But stock was still
only a reservation pod used to occupy resources ahead of time. It did not run user logic, and it did not serve traffic.

I already noted in earlier chapters that this is not a perfect production design. It is conservative because idle GPU capacity is still being held
even when no user is using it. For teaching the control-plane model, though, it is good enough. The point is not to optimize everything at once. The
point is to make the lifecycle visible.

This chapter is where the application side begins. When a user request arrives, we no longer stop at "there is stock in the cluster." We consume one
stock unit and turn it into a real user-facing runtime.

Of course, better inventory strategies exist. We could put a queue in front of admission, build on Volcano + Kubernetes DRA, use lazy pulling or
image prewarming to cut startup time, or improve utilization with GPU slicing and time-sharing. Those are all valid directions. They are just not the
focus yet. Here we want the smallest model that still teaches the right control-plane shape. Once that foundation is solid, we can add more
sophisticated machinery in later chapters.

## Chapter Goal

By the end of Part 7, the runtime model has five properties:

1. there is only one runtime resource: `GPUUnit`
2. there is only one runtime controller: `GPUUnitReconciler`
3. stock and active runtime use the same resource kind, but not the same workload payload
4. stock is seeded explicitly into `runtime-stock`
5. creating runtime means consuming one ready stock unit and injecting the real user image into `runtime-instance`

That is a much stronger foundation than trying to make stock and runtime look like different products.

## One Resource, Two Roles

`GPUUnit.spec` now describes the runtime itself and nothing else:

```go
type GPUUnitSpec struct {
    SpecName string          `json:"specName"`
    Image    string          `json:"image,omitempty"`
    Memory   string          `json:"memory,omitempty"`
    GPU      int32           `json:"gpu,omitempty"`
    Template GPUUnitTemplate `json:"template,omitempty"`
    Access   GPUUnitAccess   `json:"access,omitempty"`
}
```

At first glance, that may look like stock and active runtime now carry the exact same workload shape. They do not.

The important split is this:

- a stock unit uses the built-in reservation image
- a stock unit mainly exists to hold the resource envelope: `specName`, `memory`, and `gpu`
- an active unit keeps that reserved envelope, but gets the real user image, template, and access settings at create time

That means the project now has one resource kind, but a clearer boundary inside the API contract. We stopped pretending that a warm reservation pod
and a real user runtime are the same thing operationally.

## One Controller

There is now one runtime controller as well.

It reconciles the same `GPUUnit` kind in both namespaces and derives behavior from placement:

```go
func isStockUnit(unit runtimev1alpha1.GPUUnit) bool {
    return unit.Namespace == runtimev1alpha1.DefaultStockNamespace
}
```

That sounds almost too simple, but the simplicity is the point.

The controller no longer needs two spec branches. It implements the workload contract once and changes only the exposure policy:

- a stock unit gets a `Deployment`
- an active unit gets a `Deployment` and a `Service`
- both update status through the same condition model
- both surface pod startup failures through the same controller-owned logic

This is exactly the kind of simplification we want in an operator. Less special casing, fewer conceptual seams, and fewer places for behavior to
drift.

## Why The API Had To Split Reservation From Runtime

At this point, we clearly need two APIs: one for inventory management and one for user runtime management. They may share the same underlying
resource kind, but they do not mean the same thing. If we force them into one awkward contract, the code gets messy very quickly.

I tend to use a simple rule here: once I have to rely on `if` branches or small state-machine tricks just to separate business behavior, it is
usually time to split the boundary instead of hiding the difference.

The stock seeding request is intentionally small:

```go
type CreateStockUnitsRequest struct {
    OperationID    string `json:"operationID"`
    SpecName       string `json:"specName"`
    Memory         string `json:"memory,omitempty"`
    GPU            int32  `json:"gpu,omitempty"`
    Replicas       int32  `json:"replicas"`
}
```

That request does not accept `image`, `template`, or `access`, because stock is not the user application. It is only a reservation unit created with
the built-in stock image.

The active create request is where the user runtime shows up:

```go
type CreateGPUUnitRequest struct {
    OperationID    string          `json:"operationID"`
    Name           string          `json:"name"`
    Namespace      string          `json:"namespace,omitempty"`
    SpecName       string          `json:"specName"`
    StockNamespace string          `json:"stockNamespace,omitempty"`
    Image          string          `json:"image"`
    Template       GPUUnitTemplate `json:"template,omitempty"`
    Access         GPUUnitAccess   `json:"access,omitempty"`
}
```

## The Flow After Part 7

```text
+-----------------------------+
| Echo HTTP API               |
| POST /operator/stock-units  |
+-------------+---------------+
              |
              v
+-------------+---------------+
| service layer               |
| validate request            |
| create stock GPUUnits       |
| track async job status      |
+-------------+---------------+
              |
              v
+-------------+---------------+
| GPUUnit (runtime-stock)     |
| reservation unit            |
| built-in stock image        |
| reserved specName/memory/gpu|
+-------------+---------------+
              |
              v
+-------------+---------------+
| Echo HTTP API               |
| POST /gpu-units             |
+-------------+---------------+
              |
              v
+-------------+---------------+
| service layer               |
| validate request            |
| find ready stock            |
| claim stock                 |
| delete stock                |
| create active GPUUnit       |
| inject image/template/access|
| restore stock on failure    |
+-------------+---------------+
              |
              v
+-------------+---------------+
| GPUUnit (runtime-instance)  |
| active runtime unit         |
| user application runtime    |
| keeps reserved memory/gpu   |
+-------------+---------------+
              |
              v
+-------------+---------------+
| GPUUnit controller          |
| Deployment / Service / URL  |
| readiness / failure status  |
+-----------------------------+
```

You may look at this chapter and think the architecture is almost the same as the previous one, so why spend time on it at all. The answer is that
stopping feature work for a moment and refactoring the code for readability and maintainability is often one of the most valuable things we can do.
It makes the next round of feature work much easier. In this chapter, the refactor also improved the actual behavior, so it was well worth doing.

It is hard not to mention that vibe coding is popular right now. From an LLM's point of view, piling everything into one function or one file can
sometimes look attractive because it simplifies context handling. There is a kind of locality advantage there. Humans work differently. We usually
want modules, boundaries, and code that is easier to reason about over time.

I am not against vibe coding. In a workflow where humans barely touch the code, a pure vibe-coding loop may even be acceptable in some cases. I
just do not think it is the right default, especially with the current state of LLM capability. Once the product grows and traffic becomes real, I
do not think today's models are strong enough to carry that style on their own.

That is not meant as a dismissal of LLMs. The point is simply that they are trained on real-world data and generate code by probabilistic reasoning
over context. They do not invent engineering judgment from scratch, and they do not truly understand the business meaning behind a requirement.
What they are very good at is mapping your prompt and your code onto patterns that already exist. For established patterns, that can still be very
useful, a bit like an extremely fast Stack Overflow loop with adaptation.

That was a bit of a detour, but the conclusion is straightforward. This chapter does not introduce much flashy new functionality. The main addition
is the handoff from stock to instance. If this area interests you, I strongly recommend looking into Volcano and Kubernetes DRA. DRA is especially
worth studying for its architecture. Ask yourself why it exists, why it was designed this way, and what you would do differently. Since this series
is meant to teach how real systems are built, that habit of asking "why this design?" is one of the best habits you can form.

## API Walkthrough

Seed two stock reservations:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stock-units \
  -H 'Content-Type: application/json' \
  -d '{
    "operationID":"stock-g1-demo-001",
    "specName":"g1.1",
    "memory":"16Gi",
    "gpu":1,
    "replicas":2
  }' | jq
```

Check the operator job:

```bash
curl -s http://127.0.0.1:8080/api/v1/operator/jobs/stock-g1-demo-001 | jq
```

Consume one ready stock unit:

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
    }
  }' | jq
```

Inspect the active unit:

```bash
kubectl get gpuunits -n runtime-instance
kubectl get gpuunit demo-instance -n runtime-instance -o yaml
kubectl get deploy,svc,pod -n runtime-instance | grep demo-instance
```

## How To Verify the Model

The easiest way to verify this chapter is to look for symmetry.

Check stock:

```bash
kubectl get gpuunits -n runtime-stock
kubectl get gpuunit -n runtime-stock
```

Check active runtime:

```bash
kubectl get gpuunits -n runtime-instance
kubectl get gpuunit demo-instance -n runtime-instance -o yaml
```

What you should see:

- stock and active units share one resource kind and one controller
- stock units keep the reserved resource envelope
- active units keep that same reserved envelope, but carry the real user image, template, and access settings
- stock units do not publish `serviceName` or `accessURL`
- active units do publish `serviceName` and `accessURL`
- the active unit carries source-stock provenance in annotations, not in spec
- failed startup details surface through the same `Ready` condition path

That last point matters a lot. The reader should be able to debug stock and active runtime with the same habits.

## Summary

Part 7 is where the project stops pretending stock and active runtime are different resource models.

We now have:

- one runtime resource
- one runtime controller
- explicit stock seeding
- stock reservation separated from user runtime definition
- stock consumption plus runtime image injection
- namespace-based role separation
- better failure visibility without adding a second lifecycle model

This is a smaller architecture than the first draft, but it is a stronger one.

That is an important lesson for production engineering: the better design is often not the one with more layers. It is the one that matches the real
lifecycle most directly.

## Next Chapter Preview

Part 8 is where persistent state starts to matter.

Now that the unit model is finally stable, we can attach storage to the right object instead of guessing first and refactoring later.

That means the next chapter will focus on:

- introducing the first storage resource
- mounting persistent data into `GPUUnit`
- deciding which storage details belong in the API and which belong in controller-owned mechanics
- revisiting deletion once runtime can own real data

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
