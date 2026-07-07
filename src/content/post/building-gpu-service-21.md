---
title: "Building a GPU SaaS Platform - Reliable Serverless Execution"
publishDate: "2 July 2026"
description: "Part 21: add queue retry policy, dead-letter handling, execution state classification, and runtime behavior changes for serverless GPU execution."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator", "Serverless", "NATS", "ScyllaDB"]
---

In this chapter, we improve the serverless path we already built.

In the previous chapters, the queue-based flow was able to accept requests, dispatch them to workers, and store results. But that was still mostly a happy path. If any step fails, the current runtime can still lose useful failure context, and in some cases it can even lose the message itself.

That is dangerous for a GPU SaaS platform. When a user reports a failed invocation, we need more than a few scattered logs. We need a durable record that tells us where the request stopped, why it stopped, and whether the runtime should retry it.

So this chapter adds a small reliability layer around the existing serverless flow.

First, retry must be bounded. Similar to TCP, retries should not be an endless tight loop. If a subsystem is already unhealthy, a retry storm can make the failure worse.

Second, execution results need explicit state and failure reason. This makes debugging faster for operators and makes customer-facing support much easier.

Third, the runtime needs backpressure. When one part of the system is overloaded, the platform should protect the core GPU service instead of blindly creating more work. It is better to let some requests wait, retry, or fail than to bring down the whole cluster.

## Queue Retry Policy

Every serverless consumer now receives a retry policy:

```go
type RetryPolicy struct {
	MaxDeliver int      `json:"maxDeliver,omitempty" yaml:"maxDeliver,omitempty"`
	Backoff    []string `json:"backoff,omitempty" yaml:"backoff,omitempty"`
}
```

The default policy is:

```yaml
maxDeliver: 5
backoff:
  - "2s"
  - "10s"
  - "30s"
```

This is a NATS JetStream consumer policy. Since JetStream already provides these delivery controls, the runtime does not need to build a separate retry loop in the business layer. Most production message queues provide similar consumer-level settings.
It controls how many times the queue delivers the same message and how long the runtime waits between failed delivery attempts.

The runtime applies the policy when creating a durable consumer:

```go
jetstream.ConsumerConfig{
	Durable:       durable,
	AckPolicy:     jetstream.AckExplicitPolicy,
	FilterSubject: filterSubject,
	AckWait:       opts.AckWait,
	MaxDeliver:    opts.Retry.MaxDeliver,
	BackOff:       opts.Retry.BackoffDurations(),
}
```

## Dead-Letter Queue

Retry needs an end state.

If a message keeps failing forever, it should not silently loop in the queue and it should not disappear into logs. The runtime now publishes failed terminal messages into a dead-letter subject family:

```text
runtime.serverless.dlq.<source>.<serverlessRequestID>
```

The `source` identifies which queue family failed:

```text
invocation
dispatch
result
metric
```

For example:

```text
runtime.serverless.dlq.invocation.sd-webui
runtime.serverless.dlq.dispatch.sd-webui
runtime.serverless.dlq.result.sd-webui
runtime.serverless.dlq.metric.sd-webui
```

A DLQ message stores the original payload and enough queue metadata to debug or replay it later:

```go
type DeadLetterMessage struct {
	Source              DeadLetterSource
	State               InvocationState
	FailureClass        InvocationFailureClass
	InvocationID        string
	ServerlessRequestID string
	WorkerName          string
	OriginalSubject     string
	Stream              string
	Consumer            string
	StreamSequence      uint64
	ConsumerSequence    uint64
	DeliveryCount       uint64
	Error               string
	Payload             json.RawMessage
	FailedAt            time.Time
}
```

Malformed messages go to DLQ immediately because the runtime cannot safely decode them. Normal handler failures go to DLQ only after `maxDeliver` is exhausted.

The DLQ is not a complete replay product yet. It is the durable operational boundary: failed messages become inspectable data instead of invisible consumer failures.

## Execution State And Failure Classification

Before this chapter, a result mostly looked like an HTTP response. That is not enough for a serverless runtime.

The runtime now records execution state explicitly:

```go
type InvocationState string

const (
	InvocationStateQueued       InvocationState = "queued"
	InvocationStateDispatching  InvocationState = "dispatching"
	InvocationStateRunning      InvocationState = "running"
	InvocationStateSucceeded    InvocationState = "succeeded"
	InvocationStateFailed       InvocationState = "failed"
	InvocationStateExpired      InvocationState = "expired"
	InvocationStateDeadLettered InvocationState = "dead_lettered"
)
```

These states describe where the invocation is in the runtime:

```text
queued        -> runtime API accepted the request and published it to JetStream
dispatching   -> activator selected a worker and published a dispatch message
running       -> worker sidecar sent the request to the local framework
succeeded     -> framework completed successfully
failed        -> runtime or framework returned a non-timeout failure
expired       -> framework execution timed out
dead_lettered -> queue retry was exhausted or payload was malformed
```

The runtime also records a failure class:

```go
type InvocationFailureClass string

const (
	InvocationFailureMalformedMessage  InvocationFailureClass = "malformed_message"
	InvocationFailureNoWorkerTemplate  InvocationFailureClass = "no_worker_template"
	InvocationFailureActivationTimeout InvocationFailureClass = "activation_timeout"
	InvocationFailureBackpressure      InvocationFailureClass = "backpressure"
	InvocationFailureDispatchError     InvocationFailureClass = "dispatch_error"
	InvocationFailureFrameworkError    InvocationFailureClass = "framework_error"
	InvocationFailureFrameworkTimeout  InvocationFailureClass = "framework_timeout"
	InvocationFailureResultStoreError  InvocationFailureClass = "result_store_error"
	InvocationFailureRetryExhausted    InvocationFailureClass = "retry_exhausted"
)
```

The important point is that HTTP status and runtime failure class are different fields.

An HTTP `504` tells the caller that the request expired. `framework_timeout` tells the platform that the worker framework did not finish before the configured timeout. That difference matters for alerting, debugging, billing, and customer support.

Result storage now persists both:

```text
state
failure_class
```

This gives the control plane a durable view of what actually happened, instead of forcing it to infer runtime behavior from status code and log text.

### Activator Backpressure

The activator should not convert queue pressure directly into unlimited Pod creation.

The config now includes:

```yaml
maxPendingWorkersPerRequestID: 1
```

When a request already has too many pending activator-managed workers, the activator returns a retryable error:

```go
if pending := pendingManagedWorkers(units, requestID); pending >= s.cfg.MaxPendingWorkersPerRequestID {
	return Worker{}, &backpressureError{
		requestID: requestID,
		pending:   pending,
		limit:     s.cfg.MaxPendingWorkersPerRequestID,
	}
}
```

`ProcessInvocation` does not publish a terminal failure for this case:

```go
worker, err := s.acquireWorker(ctx, invocation.ServerlessRequestID, invocation.InvocationID)
if err != nil {
	if isRetryableInvocationError(err) {
		return err
	}

	// non-retryable failure result
}
```

Returning the error is intentional. The shared NATS consumer sees the error, does not ack the invocation, and schedules redelivery using the configured backoff.

This is not a full capacity scheduler. It is a basic safety rule: if worker creation is already pending for a serverless request, slow down and let the queue absorb the burst.

### Worker Framework Timeout

The worker sidecar calls the local framework over UDS.

If the framework returns a normal error, the result is:

```text
state: failed
failureClass: framework_error
```

If the framework call exceeds the configured timeout, the result is:

```text
state: expired
failureClass: framework_timeout
```

This distinction is useful because timeout handling is operationally different from an application error. A timeout may indicate overloaded GPU workers, cold model loading, bad package sizing, or a framework bug that never returns.

### Result Store Persistence

The result-store consumer also uses the same queue retry policy.

If ScyllaDB is temporarily unavailable, the consumer returns an error. JetStream redelivers the result message using backoff. If all attempts fail, the result message moves to DLQ.

The result table is keyed by `invocation_id`, so duplicate result delivery remains safe for this tutorial implementation.

## What Changed In Code

The code changes follow the same four boundaries:

- `pkg/serverless` defines retry policy, consumer options, DLQ message contracts, invocation states, and failure classes.
- `pkg/serverless/nats.go` creates JetStream consumers with `MaxDeliver` and `BackOff`, performs `NakWithDelay`, and publishes DLQ messages after retry exhaustion.
- `pkg/activator` returns retryable errors for backpressure and infrastructure failures instead of turning every failure into a fake user result.
- `pkg/workersidecar` maps framework timeout to `expired/framework_timeout`.
- `pkg/resultstore` persists `state` and `failure_class` in ScyllaDB.
- local YAML examples expose retry and backpressure settings for activator, worker sidecar, and result-store.

## Summary

Part 21 does not try to solve every reliability problem.

It adds the first reliable execution layer:

```text
bounded queue retry
+ dead-letter visibility
+ explicit execution state
+ failure classification
+ safer activator behavior
+ durable result state
```

The runtime still follows an at-least-once execution model. User handlers must treat `invocationID` as an idempotency key if duplicate execution would be harmful.

That is the right contract for this stage of the platform: honest, observable, and bounded.

## Repository

Code for this chapter:

- [gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
