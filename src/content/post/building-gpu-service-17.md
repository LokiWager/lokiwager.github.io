---
title: "Building a GPU SaaS Platform - Invocation Result Store"
publishDate: "14 Jun 2026"
description: "Part 17: add a ScyllaDB-backed result-store consumer for durable serverless invocation metadata and control-plane result lookup."
tags: ["GPU", "SaaS", "Kubernetes", "Golang", "Operator", "Serverless", "NATS", "ScyllaDB"]
---

In the previous chapter, we finally gave the worker pool a real lifecycle loop. The activator can keep warm workers available, create new workers when demand arrives, and delete idle managed workers when they are no longer needed.

At the same time, the worker sidecar now publishes execution results and metrics back into NATS.

That leaves one very obvious question:

where should those results live so users can query them later?

This chapter is mainly about database choice. That choice matters more than it may look at first. A good database choice does not only provide durable storage; it also shapes query latency, operational complexity, cost, and the user experience of the product.

## Chapter Goal

By the end of Part 17, the project has five new properties:

1. NATS now exposes a durable `InvocationResultConsumer`
2. a new standalone `result-store` process consumes `runtime.serverless.result.*`
3. completed invocation metadata is persisted into ScyllaDB
4. the tutorial includes a Kubernetes ScyllaDB deployment for the result store
5. activator lifecycle logic stays separate from result persistence

## Why ScyllaDB

For most business systems, a relational database is the right default.

I do not like the reflexive rejection of relational databases. A relational database does not mean "slow", "old", or "not cool enough". In many systems, the real craft is knowing how to use a relational database well: designing clean tables, avoiding unnecessary duplication, choosing the right indexes, and writing queries that match the access pattern.

Postgres is an excellent example. It has a strong community, mature operations, and a powerful extension ecosystem. For many products, Postgres should be the first option rather than the backup plan.

But this chapter deliberately does not choose a relational database.

The reason is the shape of this specific workload.

For serverless invocation results, we should assume extremely large scale. Each invocation creates one completion record, and every async result lookup reads by a known identifier. In practice, the hot path looks less like an ad-hoc relational query and more like:

```text
invocation_id -> one result metadata row
```

There may also be operational queries by request ID or time window, but the user-facing lookup path is still strongly key-oriented.

That gives us a clearer set of requirements:

- open source with an active community
- focused on high-throughput storage instead of being a general-purpose product suite
- easy to operate and scale horizontally
- good fit for write-once, read-many result records
- efficient primary-key lookup
- support for time-based retention and hot/cold separation
- predictable storage cost at very large scale

So the comparison should be among databases that already live close to this design space.

I am not comparing ScyllaDB with Redis, NATS KV, or Postgres in the main table below, because those systems answer different questions. Redis is a cache, NATS is the queue and coordination layer, and Postgres is a general relational database. They are useful, but they are not the closest match for a massive, key-oriented, wide-column result store.

The closer candidates are distributed wide-column or column-oriented databases:

| Option           | Storage Model                                    | Primary-Key Lookup                                    | Horizontal Scaling                              | Retention / Hot-Cold Story                                                            | Operational Shape                                                        | Fit For This Result Store                                                                       |
| ---------------- | ------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Apache Cassandra | Wide-column, LSM-based                           | Strong fit for partition-key reads                    | Mature scale-out model                          | TTL and compaction strategies are well known                                          | Mature, but JVM tuning and compaction need care                          | Strong candidate, especially if the team already runs Cassandra.                                |
| ScyllaDB         | Cassandra-compatible wide-column, shard-per-core | Strong fit for partition-key reads                    | Designed for high-throughput horizontal scaling | TTL, compaction, and object-storage-oriented tiering can support lifecycle management | Lower-latency Cassandra-compatible operations, simpler for this tutorial | Best fit here: same data model as Cassandra, strong point reads, and good performance per node. |
| Apache HBase     | Wide-column on HDFS                              | Good row-key and range access                         | Scales well with the Hadoop ecosystem           | HDFS storage tiers can support cold data                                              | Heavier stack: HDFS, ZooKeeper, RegionServers                            | Powerful, but too operationally heavy for this runtime result path.                             |
| Apache Accumulo  | Sorted distributed key-value / wide-column       | Good key and range access                             | Built for large distributed datasets            | Can work with Hadoop-style storage tiers                                              | Strong security model, but a specialized stack                           | Interesting for strict cell-level security, but heavier than we need here.                      |
| Apache Kudu      | Columnar storage with primary keys               | Supports primary-key access, but shines more on scans | Horizontally scalable tablets                   | Good for analytical datasets, less direct for simple result retention                 | Operationally tied to analytical data workflows                          | Better when scan analytics dominate; less direct for high-QPS result lookup.                    |

So for this chapter, I choose ScyllaDB.

The key point is not that ScyllaDB is universally better than the other systems. It is not. The key point is that the invocation result store has a simple, high-volume, key-oriented access pattern, and ScyllaDB matches that shape with a focused wide-column data model, strong horizontal scaling, and a relatively clean operational story for this tutorial.

In this design, ScyllaDB stores result metadata and small inline bodies. Large result payloads should move to object storage, while ScyllaDB stores the pointer and queryable metadata.

## What We Store

The worker result event already contains:

- `invocationID`
- `serverlessRequestID`
- `mode`
- worker identity
- status code
- response headers
- response body
- error text
- started and completed timestamps

The result-store process converts that event into a ScyllaDB row.

For this tutorial, small response bodies are stored inline in `body_inline`.
Large bodies are not blindly written into ScyllaDB.
Instead, the row records:

- `body_bytes`
- `body_truncated`

In a production version, large payloads should go to object storage and ScyllaDB should store the object pointer plus metadata.

That separation is important.
ScyllaDB is a good result metadata store.
It should not become an unbounded blob store for generated images, model outputs, traces, or logs.

## Sync And Async After This Chapter

This chapter does not change the external user-facing contract.

For sync requests:

1. control plane validates the request
2. invocation enters the runtime queue
3. activator dispatches it to a worker
4. sidecar calls the local framework
5. sidecar publishes the durable result event
6. sidecar also sends the invocation-specific sync reply

The result-store still writes the durable completion event.
That gives sync requests an auditable record even though the caller also receives an immediate reply.

For async requests:

1. control plane validates the request and returns an accepted response
2. invocation enters the runtime queue
3. activator dispatches it to a worker
4. sidecar publishes the durable result event
5. result-store persists the metadata row
6. user polls or fetches the signed control-plane result URL
7. control plane reads ScyllaDB by `invocation_id`

The runtime repo still does not expose the public result URL.
That URL belongs to the control plane because auth, tenant isolation, quota, and result retention policy are all control-plane concerns.

## Summary

Part 17 turns result events into durable queryable state.

The key design choice is ownership:

- activator owns worker lifecycle and dispatch
- worker sidecar owns queue access inside the Pod
- result-store owns completed invocation persistence
- control plane owns user-facing signed result lookup

That keeps the serverless runtime modular.
Each loop can scale, fail, and evolve independently.

The next step is reliability and performance engineering: retry policy, dead-letter handling, result retention, backpressure, and the metrics we need to operate this path under real load.
