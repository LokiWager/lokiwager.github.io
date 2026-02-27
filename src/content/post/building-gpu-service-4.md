---
title: "Building a GPU SaaS Platform - Runtime Bootstrap in Go"
publishDate: "27 February 2026"
description: "Part 4: build the first runnable single-cluster runtime baseline with production-oriented engineering habits."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator"]
---

Target readers:

- you already know Golang syntax and basic project structure
- you are not yet confident in production-oriented engineering decisions

This chapter is not just about "making code run". It is about learning how to make decisions that support long-term delivery.

## Chapter Goal

By the end of this chapter, you should have a runnable single-cluster runtime baseline that includes:

- process startup and graceful shutdown
- baseline API (`health / stocks / vms`)
- minimal lifecycle loop (create stock -> allocate VM -> release stock)
- periodic status reporting
- optional Kubernetes connectivity
- initial quality baseline (unit tests + CI/CD)

More importantly, you should understand **why** we implement it this way.

## Engineering Goal of This Iteration

For a real production system, the first iteration should optimize for:

- clear boundaries, not feature completeness
- fast validation, not premature complexity
- low refactor cost in next iteration

That is why this chapter intentionally does **not** implement a full Operator yet.

## What We Deliberately Do Not Build Yet

Not included in this chapter:

- CRD + reconcile loop
- PVC/Ceph workflows
- multi-cluster state aggregation
- serverless runtime workflow

Reason: these features are important, but introducing them before we stabilize service boundaries makes troubleshooting much harder.

## Technology Selection in This Iteration

Constraints:

- use standard library for HTTP (`net/http`)
- use standard library for logging (`log/slog`)
- avoid extra frameworks in the first implementation
- include only required Kubernetes dependency (`client-go`)

```go
require k8s.io/client-go v0.30.10
```

Why this choice:

- fewer abstractions at start means easier debugging
- lower cognitive load for readers new to engineering practice
- we keep room to evolve later (Echo/Gin, zap, metrics stack) based on measured needs

## Architecture (Iteration 1)

```text
+-------------------+        +-------------------+
|   cmd/runtime     | -----> |   pkg/runtime     |
| (flags & signals) |        | (wire everything) |
+-------------------+        +---------+---------+
                                      |
                    +-----------------+-----------------+
                    |                                   |
          +---------v---------+               +---------v---------+
          |    pkg/api        |               |    pkg/jobs       |
          |   net/http        |               | status reporter   |
          +---------+---------+               +---------+---------+
                    |                                   |
                    +-----------------+-----------------+
                                      |
                            +---------v---------+
                            |   pkg/service     |
                            | use-cases         |
                            +----+---------+----+
                                 |         |
                        +--------v-+   +---v----------------+
                        | pkg/store |   | pkg/kube           |
                        | in-memory |   | client-go adapter  |
                        +-----------+   +--------------------+
```

Boundary rules:

- `api`: transport only (decode/encode/status code)
- `service`: business orchestration only
- `store`: state operations only
- `runtime`: wiring only

These rules prevent "everything in handler" code, which is the most common early-stage anti-pattern.

## Step-by-Step Implementation

### Step 0: Add testing and CI/CD from day one

Purpose:
Set minimum quality gates at project initialization, not after incidents.
This chapter only gives a lightweight setup. You should treat this part as mandatory homework.

Code:

```bash
make ci
```

```make
ci: fmt-check vet test-race build
```

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version-file: go.mod
      - run: make fmt-check
      - run: make vet
      - run: make test-race
      - run: make build
```

```yaml
# .github/workflows/release-image.yml
name: Release Image
on:
  push:
    tags: ["v*"]
```

Why:

- tests prevent regressions while architecture is still changing fast
- CI gives consistent verification on every PR/push
- release workflow makes delivery repeatable and auditable

Reader requirement:

- you should understand this part by yourself and run it locally
- use the repository workflows and test files as the reference implementation
- do not skip this step, even if business features look more interesting

Pitfall:
If testing and CI/CD are postponed, technical debt grows quickly and every refactor becomes risky.

Follow-up:
In a later standalone article, we will cover production testing strategy and CI/CD engineering in depth (unit/integration/e2e, test pyramids, flaky test control, pipeline design, release safety).

Files:

- `Makefile`
- `.github/workflows/ci.yml`
- `.github/workflows/release-image.yml`
- `pkg/config/config_test.go`
- `pkg/store/memory_test.go`
- `pkg/service/service_test.go`
- `pkg/api/server_test.go`

### Step 1: Keep `main` minimal and predictable

Purpose:
Define a deterministic startup and shutdown path. `main` is orchestration only.

Code:

```go
func main() {
    cfg, err := loadConfig()
    if err != nil {
        fmt.Fprintf(os.Stderr, "config error: %v\\n", err)
        os.Exit(1)
    }

    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    runtime, err := app.New(cfg)
    if err != nil {
        fmt.Fprintf(os.Stderr, "startup error: %v\\n", err)
        os.Exit(1)
    }

    if err := runtime.Run(ctx); err != nil {
        fmt.Fprintf(os.Stderr, "runtime error: %v\\n", err)
        os.Exit(1)
    }
}
```

Why:

- startup failures are explicit and visible in one place
- shutdown behavior is deterministic
- business logic remains testable outside `main`

Pitfall:
Putting business logic in `main` makes testing hard and refactors expensive.

File: `cmd/runtime/main.go`

### Step 2: Use a dedicated runtime wiring layer

Purpose:
Create one composition root (`pkg/runtime`) to wire dependencies and keep layering stable.

Code:

```go
func New(cfg config.Config) (*Runtime, error) {
    logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

    kubeClient, err := kube.BuildClient(cfg.KubeMode, cfg.Kubeconfig)
    if err != nil {
        return nil, err
    }

    memStore := store.NewMemoryStore()
    svc := service.New(memStore, kubeClient, logger)
    handler := api.NewServer(svc, logger)

    httpServer := &http.Server{
        Addr:              cfg.HTTPAddr,
        Handler:           handler,
        ReadHeaderTimeout: 5 * time.Second,
    }

    return &Runtime{...}, nil
}
```

Why:

- all dependencies are visible in one location
- easier to replace components in tests
- clean migration path to operator manager later

Pitfall:
If handlers/services instantiate dependencies directly, ownership becomes unclear and startup behavior fragments.

File: `pkg/runtime/runtime.go`

### Step 3: Keep API handlers thin

Purpose:
Keep HTTP layer responsible only for transport, not business rules.

Code:

```go
func (s *Server) routes() {
    s.mux.HandleFunc("/api/v1/health", s.handleHealth)
    s.mux.HandleFunc("/api/v1/stocks", s.handleStocks)
    s.mux.HandleFunc("/api/v1/vms", s.handleVMs)
    s.mux.HandleFunc("/api/v1/vms/", s.handleVMByID)
}
```

```go
type envelope struct {
    Data  any       `json:"data,omitempty"`
    Error *apiError `json:"error,omitempty"`
}
```

```go
func (s *Server) handleStocks(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case http.MethodPost:
        var req service.CreateStockRequest
        if err := decodeBody(r.Body, &req); err != nil {
            writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
            return
        }
        stocks, err := s.service.CreateStocks(r.Context(), req)
        if err != nil {
            writeError(w, http.StatusBadRequest, "create_stocks_failed", err.Error())
            return
        }
        writeData(w, http.StatusCreated, stocks)
    }
}
```

Why:

- transport concerns remain isolated
- service methods can be reused by jobs/tests later
- API protocol changes do not force lifecycle refactors

Pitfall:
If validation, status code mapping, and business logic are mixed in handlers, every API change becomes high risk.

File: `pkg/api/server.go`

### Step 4: Keep lifecycle orchestration in `service`

Purpose:
Implement the first runtime lifecycle loop and explain why `Stock` is a first-class model.

`Stock` represents pre-provisioned GPU capacity. It is intentionally separated from tenant VM identity.
This avoids coupling capacity accounting with workload lifecycle.

Code:

```go
func (s *Service) CreateVM(ctx context.Context, req CreateVMRequest) (domain.VM, error) {
    var (
        stock domain.Stock
        err   error
    )

    if strings.TrimSpace(req.StockID) != "" {
        stock, err = s.store.ReserveStockByID(strings.TrimSpace(req.StockID))
    } else {
        stock, err = s.store.ReserveStock(strings.TrimSpace(req.SpecName))
    }
    if err != nil {
        return domain.VM{}, err
    }

    vm := domain.VM{...}
    if err := s.store.CreateVM(vm); err != nil {
        _ = s.store.ReleaseStock(stock.ID)
        return domain.VM{}, err
    }
    return vm, nil
}
```

Why:

- clear separation: capacity (`Stock`) vs workload (`VM`)
- explicit rollback path when VM creation fails
- same flow maps naturally to future reconcile logic

Pitfall:
If you create VM first and reserve stock later, failure handling becomes inconsistent and can leak capacity.

File: `pkg/service/service.go`

### Step 5: Extract config early

Purpose:
Make runtime behavior configurable from day one, instead of adding flags ad hoc later.

Code:

```go
type Config struct {
    HTTPAddr       string
    ReportInterval time.Duration
    KubeMode       KubeMode
    Kubeconfig     string
}
```

```go
const (
    KubeModeAuto     KubeMode = "auto"
    KubeModeOff      KubeMode = "off"
    KubeModeRequired KubeMode = "required"
)
```

Why:

- one binary can run in local dev, CI, or cluster
- behavior changes through config instead of code edits
- operational behavior is explicit and documented

Pitfall:
Without a config model, feature flags and env parsing spread across packages quickly.

File: `pkg/config/config.go`

### Step 6: Add Kubernetes adapter for connectivity signal

Purpose:
Add Kubernetes awareness before operator adoption.

```go
func BuildClient(mode config.KubeMode, kubeconfig string) (kubernetes.Interface, error) {
    if mode == config.KubeModeOff {
        return nil, nil
    }
    restConfig, err := buildRestConfig(kubeconfig)
    ...
    return kubernetes.NewForConfig(restConfig)
}
```

Why:

- `/health` can expose real cluster connectivity
- startup mode supports local and in-cluster runtime
- future migration to controller-runtime is incremental, not disruptive

Pitfall:
If cluster integration starts only when introducing reconcile, migration risk and debugging complexity both spike.

File: `pkg/kube/client.go`

### Step 7: Add a periodic reporter job

Purpose:
Introduce a minimal observability loop with periodic runtime state reporting.

```go
func (r *StatusReporter) Start(ctx context.Context) {
    ticker := time.NewTicker(r.interval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            health, err := r.service.Health(ctx)
            ...
            r.logger.Info("runtime status", ...)
        }
    }
}
```

Why:

- request logs show calls, not steady-state runtime health
- periodic reporting surfaces drift and silent failures
- provides extension point for future metrics/events pipeline

Pitfall:
No background reporting means incidents can remain invisible until user traffic fails.

File: `pkg/jobs/status_reporter.go`

## How to Validate This Iteration

Validation checklist:

1. compile and dependency sanity

```bash
make tidy
go test ./...
```

2. run runtime

```bash
make run
```

3. health check

```bash
curl -s http://127.0.0.1:8080/api/v1/health | jq
```

4. stock lifecycle

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/stocks \
  -H 'Content-Type: application/json' \
  -d '{"number":2,"specName":"g1.1","cpu":"4","memory":"16Gi","gpuType":"RTX4090","gpuNum":1}' | jq
```

5. vm lifecycle

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/vms \
  -H 'Content-Type: application/json' \
  -d '{"tenantID":"tenant-a","tenantName":"team-a","specName":"g1.1"}' | jq
```

Definition of Done for this chapter:

- service is runnable locally
- API contract is stable and explicit
- stock/vm lifecycle loop works end-to-end
- status reporter emits periodic runtime state

## Troubleshooting Guide (Early Iteration)

### Runtime exits on startup

Check:

- invalid flag values (`--kube-mode`)
- port already in use (`:8080`)
- `required` kube mode without valid kubeconfig

### `/health` shows `kubernetesConnected=false`

Check:

- run with `--kube-mode=auto` or `--kube-mode=required`
- verify `~/.kube/config` exists and context is correct
- if running in cluster, verify service account permissions

### VM creation fails with no available stock

This is expected behavior if stock pool is empty.
Create stock first or use a valid `specName`.

### API returns 400

Common causes:

- malformed JSON
- missing required fields (`specName`, `number`)
- unsupported request shape due to strict decode

## Iteration Summary

This chapter intentionally prioritizes engineering foundations over feature volume.

We now have:

- clear layering
- deterministic startup/shutdown path
- explicit lifecycle flow with rollback
- basic operational visibility

This is a good production-minded baseline for introducing more complexity safely.

## Next Chapter Preview

Part 5 will introduce the **minimal Operator skeleton**:

- `controller-runtime` manager
- first CRD model for runtime resources
- first reconcile loop and status update flow

At that point, we will migrate from in-memory state to Kubernetes-native desired/actual state management.

## Repository

Code for this tutorial runtime:

[gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
