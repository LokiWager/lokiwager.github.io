---
title: "Building a GPU SaaS Platform - Runtime Ops Boundaries"
publishDate: "7 July 2026"
description: "Part 22: harden runtime with Secret/TLS config, split RBAC, probes, metrics, and deployment boundaries while keeping audit in the control plane."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator", "Security", "Operations"]
---

In the previous chapter, we improved the reliability of the serverless execution path. In this chapter, we continue by tightening the security and deployment boundaries around the existing runtime.

One obvious risk is the internal queue. If NATS runs without authentication and without TLS, anyone who can reach it may be able to forge runtime messages. For a queue-first serverless system, that is not a small configuration detail; it can become a direct execution risk.

The other risk is deployment shape. Several runtime components are still deployed like single-process tutorial services. That is acceptable while building the system step by step, but it is not a production-grade operating model. A single failed process should not interrupt the whole runtime path.

## Credential Boundaries

Earlier chapters used plain YAML values for local development. That is fine for a tutorial, but production credentials should come from Kubernetes Secrets mounted into the process that needs them.

This chapter adds shared helpers for Secret-file and TLS configuration:

```go
type TLSConfig struct {
	Enabled            bool   `yaml:"enabled"`
	CAFile             string `yaml:"caFile"`
	CertFile           string `yaml:"certFile"`
	KeyFile            string `yaml:"keyFile"`
	ServerName         string `yaml:"serverName"`
	InsecureSkipVerify bool   `yaml:"insecureSkipVerify"`
}
```

The helper builds a client-side `tls.Config` from mounted files. It also supports reading trimmed secret values from files:

```go
func ReadSecretFile(path string) (string, error)
```

The runtime is not trying to replace a secret manager. Kubernetes already has Secret volumes. The runtime only needs to consume those files safely and consistently.

## NATS Credentials And TLS

NATS is used by runtime-api, activator, worker sidecar, and result-store. In production, those processes should not necessarily share the same NATS permissions.

The first step is to stop putting queue credentials directly in process YAML:

```yaml
serverless:
  url: "nats://nats.messaging.svc.cluster.local:4222"
  auth:
    tokenFile: "/var/run/secrets/runtime-nats/token"
    credentialsFile: ""
  tls:
    enabled: true
    caFile: "/var/run/secrets/runtime-nats/ca.crt"
    certFile: ""
    keyFile: ""
    serverName: "nats.messaging.svc.cluster.local"
    insecureSkipVerify: false
```

The runtime converts this configuration into real NATS client options:

```go
nats.UserCredentials(...)
nats.Token(...)
nats.UserInfo(...)
nats.Secure(...)
```

Local development can still leave these fields empty. Production overlays should mount Secrets and point the YAML fields at those files.

## ScyllaDB Credentials And TLS

ScyllaDB is only needed by the result-store process.

That matters. The worker sidecar publishes results to NATS. It should not connect directly to ScyllaDB. If a user container compromises its local boundary, it still should not receive database credentials.

The ScyllaDB config now supports credential files and TLS:

```yaml
scylla:
  hosts:
    - "scylla-client.runtime-data.svc.cluster.local:9042"
  usernameFile: "/var/run/secrets/runtime-scylla/username"
  passwordFile: "/var/run/secrets/runtime-scylla/password"
  tls:
    enabled: true
    caFile: "/var/run/secrets/runtime-scylla/ca.crt"
    serverName: "scylla-client.runtime-data.svc.cluster.local"
    insecureSkipVerify: false
```

The result-store process resolves those files and configures `gocql` with:

```go
gocql.PasswordAuthenticator
gocql.SslOptions
```

This keeps the database boundary aligned with the process boundary.

## Process Isolation: NetworkPolicy And Kubernetes RBAC

Once the runtime is split into controller-manager, runtime-api, activator, worker sidecar, and result-store, each process should have a smaller blast radius. If one process is compromised or misconfigured, it should not automatically inherit every network path, every Kubernetes permission, and every Secret in the runtime.

There are three boundaries that should line up with each other:

```text
network boundary: which internal services can this Pod reach?
RBAC boundary:    which Kubernetes objects can this process read or write?
Secret boundary:  which credentials are mounted into this process?
```

For example, the worker sidecar only needs to consume dispatch messages from NATS and talk to the user framework over a Unix domain socket. It does not need ScyllaDB credentials. It does not need Kubernetes API access. It should not be able to reach arbitrary internal services.

The intended network boundary is:

```text
runtime-api
  inbound: control plane / internal ingress
  outbound: Kubernetes API, NATS

controller-manager
  inbound: health and metrics only
  outbound: Kubernetes API

activator
  outbound: Kubernetes API, NATS

worker sidecar
  outbound: NATS cluster Service
  local: Unix domain socket to user framework
  no ScyllaDB access

result-store
  outbound: NATS, ScyllaDB
  no Kubernetes write permissions required for normal result persistence
```

The runtime already creates worker NetworkPolicy from the configured NATS cluster Service target. This is why the worker sidecar can use a stable in-cluster Service DNS name such as:

```text
nats.messaging.svc.cluster.local
```

It does not need a public endpoint or a Pod IP.

The Kubernetes RBAC boundary follows the same shape. This chapter adds split ServiceAccounts for runtime-api, activator, and result-store:

```text
runtime-api
  create/update/delete GPUUnit and GPUStorage custom resources
  read inventory and status

activator
  read runtime state
  create/delete worker GPUUnits according to serverless policy

result-store
  no broad Kubernetes permissions
  service account token is not mounted by default
```

That is a small but important change. If result-store only consumes NATS and writes ScyllaDB, it should not carry a Kubernetes API token.

The point is not to make the runtime responsible for product security. The point is to make each runtime process carry only the permissions, network access, and credentials required by its own job.

## Production Process

The runtime is now deployed as four processes:

```text
controller-manager
runtime-api
activator
result-store
```

Each process has a different availability model.

`controller-manager` reconciles Kubernetes objects. The cluster manifest enables leader election, so we can safely move toward multiple replicas later without two controllers fighting over the same object.

`runtime-api` is stateless. It validates internal API requests, creates Kubernetes custom resources, publishes serverless ingress messages, and exposes metrics. The cluster manifest runs two replicas behind `runtime-api-service`.

`activator` consumes ingress messages, observes worker metrics, decides whether to create or reuse workers, and manages idle worker lifecycle. This chapter keeps activator at one replica. That is intentional. A second uncoordinated activator could make duplicate lifecycle decisions. Horizontal activator scale should come later through leader election or requestID-based sharding.

`result-store` consumes durable result messages and writes ScyllaDB records. It can run more than one replica because the queue is durable and result writes are idempotent for the tutorial contract. Duplicate delivery may happen, but the result row is keyed by invocation identity.

The deployment shape is:

```text
controller-manager: 1 replica, leader election enabled
runtime-api:        2 replicas, stateless
activator:          1 replica, lifecycle owner
result-store:       2 replicas, durable consumer + idempotent writes
```

This is not the final high-availability architecture for every component, but it is an honest production baseline. It scales the safe pieces now and explicitly marks the piece that still needs coordination.

## Runtime Metrics And Alerts

The split architecture exposed one gap: the runtime metrics collector existed, but no split process was serving it.

This chapter wires the collector into runtime-api:

```text
GET /metrics
```

The collector exports runtime health and inventory metrics such as:

```text
runtime_metrics_scrape_success
runtime_kubernetes_up
runtime_kubernetes_nodes_total
runtime_kubernetes_node_gpu_capacity
runtime_nvidia_metrics_up
runtime_nvidia_gpu_memory_used_mib
runtime_gpu_units
runtime_gpu_storages
```

The Prometheus examples now include:

```text
controller-manager ServiceMonitor
runtime-api ServiceMonitor
basic runtime operational alert rules
```

The alert examples focus on runtime health:

```text
metrics snapshot failing
runtime cannot reach Kubernetes API
runtime-api replicas unavailable
```

They do not define product SLOs, pricing alerts, or customer audit semantics. Those still belong above the runtime layer.

## Summary

Part 22 is about keeping runtime boundaries clean.

The control plane should answer:

```text
who is the user?
is the user allowed to do this?
which tenant/project owns the action?
what should appear in the customer audit log?
what package, quota, and billing policy applies?
```

The runtime should answer:

```text
which process needs which credential?
which process can reach which internal dependency?
which Kubernetes permissions are required?
which process can scale horizontally safely?
which health and metrics signals should operators watch?
```

That separation keeps the runtime reusable and keeps product policy where it belongs.

Now that the execution layer has a cleaner security and operations boundary, the next topic can move up one level: usage accounting. Not billing, but the trusted runtime facts that billing systems depend on.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
