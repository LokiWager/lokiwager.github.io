---
title: "Building a GPU SaaS Platform - Shared Proxy and SSH Access"
publishDate: "12 April 2026"
description: "Part 10: add a shared storage proxy, switch the accessor to dufs, and expose GPUUnit SSH through sidecars and frp."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator"]
---

In Part 9, we finished the minimum viable control-plane flow: the runtime could create stock units, create active application instances, and provision persistent storage for users.

But one important problem was still unsolved: access.
In this chapter, we add SSH access for application runtimes and browser-based access for user storage through `dufs`, an open-source file server.

## Chapter Goal

By the end of Part 10, the platform has four new properties:

1. `GPUStorage` serves a real file browser with [`dufs`](https://github.com/sigoden/dufs)
2. a new shared `runtime-proxy` command can reverse proxy user requests into storage accessors
3. `GPUUnit` can opt into SSH access without requiring the runtime image itself to run `sshd`
4. SSH exposure uses injected sidecars plus [`frp`](https://github.com/fatedier/frp), instead of forcing a per-unit LoadBalancer or NodePort

This chapter introduces a new proxy application that handles both user SSH traffic and storage access traffic.

- for SSH requests, the proxy forwards traffic to a machine running `frps`, which then routes it to the matching `frpc` sidecar
- for storage requests, the path is simpler: the proxy forwards directly to the corresponding accessor Service

## Why SSH Should Not Live Inside The Runtime Image

There is an older pattern that says:
if users want SSH, just install `openssh-server` in the runtime image and expose port 22.

That creates the wrong ownership model.

There are several reasons:

- not every runtime image includes `sshd`, especially user-provided images, so the platform needs a non-intrusive access path
- forcing SSH into the main image couples app packaging and platform access policy
- rotating access settings becomes harder when the runtime process and shell process are fused together

That is why this chapter uses a sidecar instead.

`GPUUnit` now gets an optional SSH contract:

```go
type GPUUnitSSHSpec struct {
    Enabled        bool     `json:"enabled,omitempty"`
    Username       string   `json:"username,omitempty"`
    AuthorizedKeys []string `json:"authorizedKeys,omitempty"`
    ServerAddr     string   `json:"serverAddr,omitempty"`
    ServerPort     int32    `json:"serverPort,omitempty"`
    ConnectHost    string   `json:"connectHost,omitempty"`
    ConnectPort    int32    `json:"connectPort,omitempty"`
    DomainSuffix   string   `json:"domainSuffix,omitempty"`
    ClientDomain   string   `json:"clientDomain,omitempty"`
}
```

The runtime container stays focused on the app.
The SSH sidecar owns shell access.

That is a much cleaner boundary.

That gives us two nice properties:

- the Pod still has a single main runtime container
- the access sidecars are clearly platform-owned support processes, not part of the workload image contract

In practice, the SSH sidecar also gets a `startupProbe` so the `frpc` sidecar only proceeds once `sshd` is actually listening.

And the per-runtime SSH data comes in through the API request itself.

## Where The User SSH Key Actually Lives

The better model is:

- the user sends `spec.ssh.authorizedKeys`
- the controller materializes those keys into a controller-owned `ConfigMap`
- the SSH sidecar mounts that file as `authorized_keys`
- changing the key means updating the `GPUUnit`, not rebuilding the runtime image

That is much closer to how a platform should own access configuration.

This also makes user updates straightforward.
If a user wants to rotate or replace their SSH public key, they can update the same `GPUUnit` over REST and let the controller roll the Pod forward.

## Why `frp` Fits This Model

The platform now has many runtimes, and potentially many user shells.

Exposing each one with a separate `LoadBalancer` or `NodePort` would be noisy and wasteful.

This is where [`frp`](https://github.com/fatedier/frp) fits nicely.

Instead of publishing one Kubernetes service per SSH endpoint, the controller injects:

- one SSH sidecar
- one `frpc` sidecar

The `frpc` sidecar registers the unit against a shared `frps`.

For this chapter, I chose the `tcpmux + httpconnect` path from the official `frp` docs instead of assigning a unique remote TCP port to every unit.

That tradeoff is important.

`tcpmux` means:

- one shared external connect port
- no per-unit port allocator
- routing by hostname instead of by port

So the platform can generate stable hostnames like:

```text
demo-instance.runtime-instance.ssh.example.com
```

and publish a user command like:

```text
ssh -o ProxyCommand='nc -X connect -x ssh.example.com:1337 %h %p' runtime@demo-instance.runtime-instance.ssh.example.com
```

That is more scalable than tracking a unique public port for every single runtime.

## Why The SSH Sidecar Is Intentionally Limited

This implementation does **not** try to enter the main runtime container root filesystem.

That is intentional.

The SSH shell lands in the sidecar container inside the same Pod boundary.

That gives us:

- the same Pod network namespace
- a controlled shell entrypoint
- independent lifecycle from the main app process

What it does not try to do is fake a full "SSH directly into the workload image" experience.

That would require a much heavier design:

- a runtime image contract for `sshd`
- or privileged namespace-enter tricks
- or a Kubernetes exec gateway pretending to be SSH

All of those are possible, but they are bigger architectural decisions.

For this chapter, the sidecar approach is the right stopping point.

## API Walkthrough

Start the operator with a local YAML config:

```bash
go run ./cmd/main.go --config config/local/runtime-manager.yaml
```

Start the shared storage proxy in another terminal:

```bash
go run ./cmd/runtime-proxy --http-addr :8090
```

Seed stock first:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stock-units \
  -H 'Content-Type: application/json' \
  -d '{
    "operationID":"stock-g1-demo-001",
    "specName":"g1.1",
    "memory":"16Gi",
    "gpu":1,
    "replicas":1
  }' | jq
```

Create storage with the accessor enabled:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/gpu-storages \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"model-cache",
    "size":"20Gi",
    "prepare":{
      "fromImage":"busybox:1.36",
      "command":["sh","-c"],
      "args":["mkdir -p /workspace/model && echo seeded > /workspace/model/README.txt"]
    },
    "accessor":{
      "enabled":true
    }
  }' | jq
```

Open the storage browser through the shared proxy:

```text
http://127.0.0.1:8090/storage/runtime-instance/model-cache/
```

Create an active runtime with SSH enabled:

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/gpu-units \
  -H 'Content-Type: application/json' \
  -d '{
    "operationID":"unit-demo-001",
    "name":"demo-instance",
    "specName":"g1.1",
    "image":"python:3.12",
    "access":{
      "primaryPort":"http",
      "scheme":"http"
    },
    "ssh":{
      "enabled":true,
      "username":"runtime",
      "serverAddr":"frps.internal",
      "serverPort":7000,
      "connectHost":"ssh.example.com",
      "connectPort":1337,
      "domainSuffix":"ssh.example.com",
      "token":"demo-token",
      "authorizedKeys":[
        "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA== demo@example"
      ]
    },
    "template":{
      "command":["python"],
      "args":["-m","http.server","8080"],
      "ports":[{"name":"http","port":8080}]
    },
    "storageMounts":[
      {
        "name":"model-cache",
        "mountPath":"/workspace/cache"
      }
    ]
  }' | jq
```

Inspect the published SSH details:

```bash
curl -s 'http://127.0.0.1:8080/api/v1/gpu-units/demo-instance' | jq '.data.sshStatus'
kubectl get gpuunit demo-instance -n runtime-instance -o yaml
```

You should see a generated command similar to:

```bash
ssh -o ProxyCommand='nc -X connect -x ssh.example.com:1337 %h %p' runtime@demo-instance.runtime-instance.ssh.example.com
```

## How To Verify The Model

There are four things worth checking after this chapter.

First, the storage accessor Pod:

```bash
kubectl get deploy,svc -n runtime-instance | grep storage-accessor-model-cache
kubectl describe deploy storage-accessor-model-cache -n runtime-instance
```

You should see:

- the `dufs` image
- the controller-owned service
- the path-prefixed accessor URL in storage status

Second, the shared proxy:

```bash
curl -I http://127.0.0.1:8090/storage/runtime-instance/model-cache/
```

You should see the request resolve through the proxy instead of going directly to the accessor service.

Third, the runtime Pod:

```bash
kubectl get pod -n runtime-instance
kubectl get pod -n runtime-instance -o yaml | grep -A4 -B2 ssh
kubectl get configmap -n runtime-instance | grep ssh-keys
```

You should see:

- the main runtime container
- the SSH restartable init sidecar
- the `frpc` restartable init sidecar
- a controller-owned `ConfigMap` that materializes `authorized_keys`

Fourth, the runtime status:

```bash
kubectl get gpuunit demo-instance -n runtime-instance -o yaml
```

You should see:

- normal runtime access status
- explicit SSH status
- the generated user command

If you update `ssh.authorizedKeys` through `PUT /api/v1/gpu-units/{name}`, you should also see the SSH config `ConfigMap` update and the workload roll forward with the new key material.

## Summary

Part 10 is where storage and compute stop being only cluster-local abstractions.

We now have:

- a real `dufs`-backed storage browser
- a shared reverse proxy command for user storage access
- optional SSH on `GPUUnit`
- sidecar-owned shell access instead of image-owned `sshd`
- restartable init sidecars for SSH and `frpc`, aligned with the Kubernetes sidecar model
- controller-owned `authorized_keys` configuration so user SSH keys can be updated through the API
- explicit rule-based status for Pod, SSH, and storage state
- `frp`-backed external SSH routing without one public port per unit

That is a much stronger product boundary than "here is an internal service name inside the cluster."

The platform is finally learning how to publish controlled entrypoints, not just workloads.

## Next Chapter Preview

Part 11 will focus on signals around these entrypoints:
events, metrics, operational feedback loops, and the security model that tells us whether user access is both healthy and safe.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
