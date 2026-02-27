import{c as e,r as a,m as o}from"./render-template.kB3ydgdk.js";import{u as l}from"./hoisted.f9kRlYaj.js";import"./astro/assets-service.wdzbVTWi.js";const s=`<h1 id="building-a-gpu-saas-platform">Building a GPU SaaS Platform</h1>
<p>Target readers:</p>
<ul>
<li>you already know Golang syntax and basic project structure</li>
<li>you are not yet confident in production-oriented engineering decisions</li>
</ul>
<p>This chapter is not just about “making code run”. It is about learning how to make decisions that support long-term delivery.</p>
<h2 id="chapter-goal">Chapter Goal</h2>
<p>By the end of this chapter, you should have a runnable single-cluster runtime baseline that includes:</p>
<ul>
<li>process startup and graceful shutdown</li>
<li>baseline API (<code>health / stocks / vms</code>)</li>
<li>minimal lifecycle loop (create stock -> allocate VM -> release stock)</li>
<li>periodic status reporting</li>
<li>optional Kubernetes connectivity</li>
<li>initial quality baseline (unit tests + CI/CD)</li>
</ul>
<p>More importantly, you should understand <strong>why</strong> we implement it this way.</p>
<h2 id="engineering-goal-of-this-iteration">Engineering Goal of This Iteration</h2>
<p>For a real production system, the first iteration should optimize for:</p>
<ul>
<li>clear boundaries, not feature completeness</li>
<li>fast validation, not premature complexity</li>
<li>low refactor cost in next iteration</li>
</ul>
<p>That is why this chapter intentionally does <strong>not</strong> implement a full Operator yet.</p>
<h2 id="what-we-deliberately-do-not-build-yet">What We Deliberately Do Not Build Yet</h2>
<p>Not included in this chapter:</p>
<ul>
<li>CRD + reconcile loop</li>
<li>PVC/Ceph workflows</li>
<li>multi-cluster state aggregation</li>
<li>serverless runtime workflow</li>
</ul>
<p>Reason: these features are important, but introducing them before we stabilize service boundaries makes troubleshooting much harder.</p>
<h2 id="technology-selection-in-this-iteration">Technology Selection in This Iteration</h2>
<p>Constraints:</p>
<ul>
<li>use standard library for HTTP (<code>net/http</code>)</li>
<li>use standard library for logging (<code>log/slog</code>)</li>
<li>avoid extra frameworks in the first implementation</li>
<li>include only required Kubernetes dependency (<code>client-go</code>)</li>
</ul>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#F8F8F2">require k8s.io</span><span style="color:#FF79C6">/</span><span style="color:#F8F8F2">client</span><span style="color:#FF79C6">-go</span><span style="color:#F8F8F2"> v0.</span><span style="color:#BD93F9">30.10</span></span></code></pre>
<p>Why this choice:</p>
<ul>
<li>fewer abstractions at start means easier debugging</li>
<li>lower cognitive load for readers new to engineering practice</li>
<li>we keep room to evolve later (Echo/Gin, zap, metrics stack) based on measured needs</li>
</ul>
<h2 id="architecture-iteration-1">Architecture (Iteration 1)</h2>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>+-------------------+        +-------------------+</span></span>
<span class="line"><span>|   cmd/runtime     | -----> |   pkg/runtime     |</span></span>
<span class="line"><span>| (flags &#x26; signals) |        | (wire everything) |</span></span>
<span class="line"><span>+-------------------+        +---------+---------+</span></span>
<span class="line"><span>                                      |</span></span>
<span class="line"><span>                    +-----------------+-----------------+</span></span>
<span class="line"><span>                    |                                   |</span></span>
<span class="line"><span>          +---------v---------+               +---------v---------+</span></span>
<span class="line"><span>          |    pkg/api        |               |    pkg/jobs       |</span></span>
<span class="line"><span>          |   net/http        |               | status reporter   |</span></span>
<span class="line"><span>          +---------+---------+               +---------+---------+</span></span>
<span class="line"><span>                    |                                   |</span></span>
<span class="line"><span>                    +-----------------+-----------------+</span></span>
<span class="line"><span>                                      |</span></span>
<span class="line"><span>                            +---------v---------+</span></span>
<span class="line"><span>                            |   pkg/service     |</span></span>
<span class="line"><span>                            | use-cases         |</span></span>
<span class="line"><span>                            +----+---------+----+</span></span>
<span class="line"><span>                                 |         |</span></span>
<span class="line"><span>                        +--------v-+   +---v----------------+</span></span>
<span class="line"><span>                        | pkg/store |   | pkg/kube           |</span></span>
<span class="line"><span>                        | in-memory |   | client-go adapter  |</span></span>
<span class="line"><span>                        +-----------+   +--------------------+</span></span></code></pre>
<p>Boundary rules:</p>
<ul>
<li><code>api</code>: transport only (decode/encode/status code)</li>
<li><code>service</code>: business orchestration only</li>
<li><code>store</code>: state operations only</li>
<li><code>runtime</code>: wiring only</li>
</ul>
<p>These rules prevent “everything in handler” code, which is the most common early-stage anti-pattern.</p>
<h2 id="step-by-step-implementation">Step-by-Step Implementation</h2>
<h3 id="step-0-add-testing-and-cicd-from-day-one">Step 0: Add testing and CI/CD from day one</h3>
<p>Purpose:
Set minimum quality gates at project initialization, not after incidents.
This chapter only gives a lightweight setup. You should treat this part as mandatory homework.</p>
<p>Code:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">make</span><span style="color:#F1FA8C"> ci</span></span></code></pre>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#8BE9FD">ci</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> fmt-check vet test-race build</span></span></code></pre>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#6272A4"># .github/workflows/ci.yml</span></span>
<span class="line"><span style="color:#8BE9FD">name</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> CI</span></span>
<span class="line"><span style="color:#BD93F9">on</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">  pull_request</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">  push</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">    branches</span><span style="color:#FF79C6">:</span><span style="color:#F8F8F2"> [</span><span style="color:#F1FA8C">main</span><span style="color:#F8F8F2">]</span></span>
<span class="line"><span style="color:#8BE9FD">jobs</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">  verify</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">    runs-on</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> ubuntu-latest</span></span>
<span class="line"><span style="color:#8BE9FD">    steps</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#FF79C6">      -</span><span style="color:#8BE9FD"> uses</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> actions/checkout@v4</span></span>
<span class="line"><span style="color:#FF79C6">      -</span><span style="color:#8BE9FD"> uses</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> actions/setup-go@v5</span></span>
<span class="line"><span style="color:#8BE9FD">        with</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">          go-version-file</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> go.mod</span></span>
<span class="line"><span style="color:#FF79C6">      -</span><span style="color:#8BE9FD"> run</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> make fmt-check</span></span>
<span class="line"><span style="color:#FF79C6">      -</span><span style="color:#8BE9FD"> run</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> make vet</span></span>
<span class="line"><span style="color:#FF79C6">      -</span><span style="color:#8BE9FD"> run</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> make test-race</span></span>
<span class="line"><span style="color:#FF79C6">      -</span><span style="color:#8BE9FD"> run</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> make build</span></span></code></pre>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#6272A4"># .github/workflows/release-image.yml</span></span>
<span class="line"><span style="color:#8BE9FD">name</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> Release Image</span></span>
<span class="line"><span style="color:#BD93F9">on</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">  push</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">    tags</span><span style="color:#FF79C6">:</span><span style="color:#F8F8F2"> [</span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">v*</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">]</span></span></code></pre>
<p>Why:</p>
<ul>
<li>tests prevent regressions while architecture is still changing fast</li>
<li>CI gives consistent verification on every PR/push</li>
<li>release workflow makes delivery repeatable and auditable</li>
</ul>
<p>Reader requirement:</p>
<ul>
<li>you should understand this part by yourself and run it locally</li>
<li>use the repository workflows and test files as the reference implementation</li>
<li>do not skip this step, even if business features look more interesting</li>
</ul>
<p>Pitfall:
If testing and CI/CD are postponed, technical debt grows quickly and every refactor becomes risky.</p>
<p>Follow-up:
In a later standalone article, we will cover production testing strategy and CI/CD engineering in depth (unit/integration/e2e, test pyramids, flaky test control, pipeline design, release safety).</p>
<p>Files:</p>
<ul>
<li><code>Makefile</code></li>
<li><code>.github/workflows/ci.yml</code></li>
<li><code>.github/workflows/release-image.yml</code></li>
<li><code>pkg/config/config_test.go</code></li>
<li><code>pkg/store/memory_test.go</code></li>
<li><code>pkg/service/service_test.go</code></li>
<li><code>pkg/api/server_test.go</code></li>
</ul>
<h3 id="step-1-keep-main-minimal-and-predictable">Step 1: Keep <code>main</code> minimal and predictable</h3>
<p>Purpose:
Define a deterministic startup and shutdown path. <code>main</code> is orchestration only.</p>
<p>Code:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#50FA7B"> main</span><span style="color:#F8F8F2">() {</span></span>
<span class="line"><span style="color:#F8F8F2">    cfg, err </span><span style="color:#FF79C6">:=</span><span style="color:#50FA7B"> loadConfig</span><span style="color:#F8F8F2">()</span></span>
<span class="line"><span style="color:#FF79C6">    if</span><span style="color:#F8F8F2"> err </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">        fmt.</span><span style="color:#50FA7B">Fprintf</span><span style="color:#F8F8F2">(os.Stderr, </span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">config error: </span><span style="color:#BD93F9">%v</span><span style="color:#FF79C6">\\\\</span><span style="color:#F1FA8C">n</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, err)</span></span>
<span class="line"><span style="color:#F8F8F2">        os.</span><span style="color:#50FA7B">Exit</span><span style="color:#F8F8F2">(</span><span style="color:#BD93F9">1</span><span style="color:#F8F8F2">)</span></span>
<span class="line"><span style="color:#F8F8F2">    }</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F8F8F2">    ctx, stop </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> signal.</span><span style="color:#50FA7B">NotifyContext</span><span style="color:#F8F8F2">(context.</span><span style="color:#50FA7B">Background</span><span style="color:#F8F8F2">(), os.Interrupt, syscall.SIGTERM)</span></span>
<span class="line"><span style="color:#FF79C6">    defer</span><span style="color:#50FA7B"> stop</span><span style="color:#F8F8F2">()</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F8F8F2">    runtime, err </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> app.</span><span style="color:#50FA7B">New</span><span style="color:#F8F8F2">(cfg)</span></span>
<span class="line"><span style="color:#FF79C6">    if</span><span style="color:#F8F8F2"> err </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">        fmt.</span><span style="color:#50FA7B">Fprintf</span><span style="color:#F8F8F2">(os.Stderr, </span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">startup error: </span><span style="color:#BD93F9">%v</span><span style="color:#FF79C6">\\\\</span><span style="color:#F1FA8C">n</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, err)</span></span>
<span class="line"><span style="color:#F8F8F2">        os.</span><span style="color:#50FA7B">Exit</span><span style="color:#F8F8F2">(</span><span style="color:#BD93F9">1</span><span style="color:#F8F8F2">)</span></span>
<span class="line"><span style="color:#F8F8F2">    }</span></span>
<span class="line"></span>
<span class="line"><span style="color:#FF79C6">    if</span><span style="color:#F8F8F2"> err </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> runtime.</span><span style="color:#50FA7B">Run</span><span style="color:#F8F8F2">(ctx); err </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">        fmt.</span><span style="color:#50FA7B">Fprintf</span><span style="color:#F8F8F2">(os.Stderr, </span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">runtime error: </span><span style="color:#BD93F9">%v</span><span style="color:#FF79C6">\\\\</span><span style="color:#F1FA8C">n</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, err)</span></span>
<span class="line"><span style="color:#F8F8F2">        os.</span><span style="color:#50FA7B">Exit</span><span style="color:#F8F8F2">(</span><span style="color:#BD93F9">1</span><span style="color:#F8F8F2">)</span></span>
<span class="line"><span style="color:#F8F8F2">    }</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>Why:</p>
<ul>
<li>startup failures are explicit and visible in one place</li>
<li>shutdown behavior is deterministic</li>
<li>business logic remains testable outside <code>main</code></li>
</ul>
<p>Pitfall:
Putting business logic in <code>main</code> makes testing hard and refactors expensive.</p>
<p>File: <code>cmd/runtime/main.go</code></p>
<h3 id="step-2-use-a-dedicated-runtime-wiring-layer">Step 2: Use a dedicated runtime wiring layer</h3>
<p>Purpose:
Create one composition root (<code>pkg/runtime</code>) to wire dependencies and keep layering stable.</p>
<p>Code:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#50FA7B"> New</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">cfg</span><span style="color:#8BE9FD;font-style:italic"> config</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Config</span><span style="color:#F8F8F2">) (</span><span style="color:#FF79C6">*</span><span style="color:#8BE9FD;font-style:italic">Runtime</span><span style="color:#F8F8F2">, </span><span style="color:#8BE9FD;font-style:italic">error</span><span style="color:#F8F8F2">) {</span></span>
<span class="line"><span style="color:#F8F8F2">    logger </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> slog.</span><span style="color:#50FA7B">New</span><span style="color:#F8F8F2">(slog.</span><span style="color:#50FA7B">NewTextHandler</span><span style="color:#F8F8F2">(os.Stdout, </span><span style="color:#FF79C6">&#x26;</span><span style="color:#8BE9FD;font-style:italic">slog</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">HandlerOptions</span><span style="color:#F8F8F2">{Level: slog.LevelInfo}))</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F8F8F2">    kubeClient, err </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> kube.</span><span style="color:#50FA7B">BuildClient</span><span style="color:#F8F8F2">(cfg.KubeMode, cfg.Kubeconfig)</span></span>
<span class="line"><span style="color:#FF79C6">    if</span><span style="color:#F8F8F2"> err </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#FF79C6">        return</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2">, err</span></span>
<span class="line"><span style="color:#F8F8F2">    }</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F8F8F2">    memStore </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> store.</span><span style="color:#50FA7B">NewMemoryStore</span><span style="color:#F8F8F2">()</span></span>
<span class="line"><span style="color:#F8F8F2">    svc </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> service.</span><span style="color:#50FA7B">New</span><span style="color:#F8F8F2">(memStore, kubeClient, logger)</span></span>
<span class="line"><span style="color:#F8F8F2">    handler </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> api.</span><span style="color:#50FA7B">NewServer</span><span style="color:#F8F8F2">(svc, logger)</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F8F8F2">    httpServer </span><span style="color:#FF79C6">:=</span><span style="color:#FF79C6"> &#x26;</span><span style="color:#8BE9FD;font-style:italic">http</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Server</span><span style="color:#F8F8F2">{</span></span>
<span class="line"><span style="color:#F8F8F2">        Addr:              cfg.HTTPAddr,</span></span>
<span class="line"><span style="color:#F8F8F2">        Handler:           handler,</span></span>
<span class="line"><span style="color:#F8F8F2">        ReadHeaderTimeout: </span><span style="color:#BD93F9">5</span><span style="color:#FF79C6"> *</span><span style="color:#F8F8F2"> time.Second,</span></span>
<span class="line"><span style="color:#F8F8F2">    }</span></span>
<span class="line"></span>
<span class="line"><span style="color:#FF79C6">    return</span><span style="color:#FF79C6"> &#x26;</span><span style="color:#8BE9FD;font-style:italic">Runtime</span><span style="color:#F8F8F2">{</span><span style="color:#FF79C6">...</span><span style="color:#F8F8F2">}, </span><span style="color:#BD93F9">nil</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>Why:</p>
<ul>
<li>all dependencies are visible in one location</li>
<li>easier to replace components in tests</li>
<li>clean migration path to operator manager later</li>
</ul>
<p>Pitfall:
If handlers/services instantiate dependencies directly, ownership becomes unclear and startup behavior fragments.</p>
<p>File: <code>pkg/runtime/runtime.go</code></p>
<h3 id="step-3-keep-api-handlers-thin">Step 3: Keep API handlers thin</h3>
<p>Purpose:
Keep HTTP layer responsible only for transport, not business rules.</p>
<p>Code:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#F8F8F2"> (</span><span style="color:#FFB86C;font-style:italic">s </span><span style="color:#FF79C6">*</span><span style="color:#8BE9FD;font-style:italic">Server</span><span style="color:#F8F8F2">) </span><span style="color:#50FA7B">routes</span><span style="color:#F8F8F2">() {</span></span>
<span class="line"><span style="color:#F8F8F2">    s.mux.</span><span style="color:#50FA7B">HandleFunc</span><span style="color:#F8F8F2">(</span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">/api/v1/health</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, s.handleHealth)</span></span>
<span class="line"><span style="color:#F8F8F2">    s.mux.</span><span style="color:#50FA7B">HandleFunc</span><span style="color:#F8F8F2">(</span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">/api/v1/stocks</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, s.handleStocks)</span></span>
<span class="line"><span style="color:#F8F8F2">    s.mux.</span><span style="color:#50FA7B">HandleFunc</span><span style="color:#F8F8F2">(</span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">/api/v1/vms</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, s.handleVMs)</span></span>
<span class="line"><span style="color:#F8F8F2">    s.mux.</span><span style="color:#50FA7B">HandleFunc</span><span style="color:#F8F8F2">(</span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">/api/v1/vms/</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, s.handleVMByID)</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">type</span><span style="color:#8BE9FD;font-style:italic"> envelope</span><span style="color:#FF79C6"> struct</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">    Data  </span><span style="color:#8BE9FD;font-style:italic">any</span><span style="color:#E9F284">       \`</span><span style="color:#F1FA8C">json:"data,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Error </span><span style="color:#FF79C6">*</span><span style="color:#8BE9FD;font-style:italic">apiError</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"error,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#F8F8F2"> (</span><span style="color:#FFB86C;font-style:italic">s </span><span style="color:#FF79C6">*</span><span style="color:#8BE9FD;font-style:italic">Server</span><span style="color:#F8F8F2">) </span><span style="color:#50FA7B">handleStocks</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">w</span><span style="color:#8BE9FD;font-style:italic"> http</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">ResponseWriter</span><span style="color:#F8F8F2">, </span><span style="color:#FFB86C;font-style:italic">r</span><span style="color:#FF79C6"> *</span><span style="color:#8BE9FD;font-style:italic">http</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Request</span><span style="color:#F8F8F2">) {</span></span>
<span class="line"><span style="color:#FF79C6">    switch</span><span style="color:#F8F8F2"> r.Method {</span></span>
<span class="line"><span style="color:#FF79C6">    case</span><span style="color:#F8F8F2"> http.MethodPost:</span></span>
<span class="line"><span style="color:#FF79C6">        var</span><span style="color:#F8F8F2"> req </span><span style="color:#8BE9FD;font-style:italic">service</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">CreateStockRequest</span></span>
<span class="line"><span style="color:#FF79C6">        if</span><span style="color:#F8F8F2"> err </span><span style="color:#FF79C6">:=</span><span style="color:#50FA7B"> decodeBody</span><span style="color:#F8F8F2">(r.Body, </span><span style="color:#FF79C6">&#x26;</span><span style="color:#F8F8F2">req); err </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#50FA7B">            writeError</span><span style="color:#F8F8F2">(w, http.StatusBadRequest, </span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">invalid_request</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, err.</span><span style="color:#50FA7B">Error</span><span style="color:#F8F8F2">())</span></span>
<span class="line"><span style="color:#FF79C6">            return</span></span>
<span class="line"><span style="color:#F8F8F2">        }</span></span>
<span class="line"><span style="color:#F8F8F2">        stocks, err </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> s.service.</span><span style="color:#50FA7B">CreateStocks</span><span style="color:#F8F8F2">(r.</span><span style="color:#50FA7B">Context</span><span style="color:#F8F8F2">(), req)</span></span>
<span class="line"><span style="color:#FF79C6">        if</span><span style="color:#F8F8F2"> err </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#50FA7B">            writeError</span><span style="color:#F8F8F2">(w, http.StatusBadRequest, </span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">create_stocks_failed</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, err.</span><span style="color:#50FA7B">Error</span><span style="color:#F8F8F2">())</span></span>
<span class="line"><span style="color:#FF79C6">            return</span></span>
<span class="line"><span style="color:#F8F8F2">        }</span></span>
<span class="line"><span style="color:#50FA7B">        writeData</span><span style="color:#F8F8F2">(w, http.StatusCreated, stocks)</span></span>
<span class="line"><span style="color:#F8F8F2">    }</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>Why:</p>
<ul>
<li>transport concerns remain isolated</li>
<li>service methods can be reused by jobs/tests later</li>
<li>API protocol changes do not force lifecycle refactors</li>
</ul>
<p>Pitfall:
If validation, status code mapping, and business logic are mixed in handlers, every API change becomes high risk.</p>
<p>File: <code>pkg/api/server.go</code></p>
<h3 id="step-4-keep-lifecycle-orchestration-in-service">Step 4: Keep lifecycle orchestration in <code>service</code></h3>
<p>Purpose:
Implement the first runtime lifecycle loop and explain why <code>Stock</code> is a first-class model.</p>
<p><code>Stock</code> represents pre-provisioned GPU capacity. It is intentionally separated from tenant VM identity.
This avoids coupling capacity accounting with workload lifecycle.</p>
<p>Code:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#F8F8F2"> (</span><span style="color:#FFB86C;font-style:italic">s </span><span style="color:#FF79C6">*</span><span style="color:#8BE9FD;font-style:italic">Service</span><span style="color:#F8F8F2">) </span><span style="color:#50FA7B">CreateVM</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">ctx</span><span style="color:#8BE9FD;font-style:italic"> context</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Context</span><span style="color:#F8F8F2">, </span><span style="color:#FFB86C;font-style:italic">req</span><span style="color:#8BE9FD;font-style:italic"> CreateVMRequest</span><span style="color:#F8F8F2">) (</span><span style="color:#8BE9FD;font-style:italic">domain</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">VM</span><span style="color:#F8F8F2">, </span><span style="color:#8BE9FD;font-style:italic">error</span><span style="color:#F8F8F2">) {</span></span>
<span class="line"><span style="color:#FF79C6">    var</span><span style="color:#F8F8F2"> (</span></span>
<span class="line"><span style="color:#F8F8F2">        stock </span><span style="color:#8BE9FD;font-style:italic">domain</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Stock</span></span>
<span class="line"><span style="color:#F8F8F2">        err   </span><span style="color:#8BE9FD;font-style:italic">error</span></span>
<span class="line"><span style="color:#F8F8F2">    )</span></span>
<span class="line"></span>
<span class="line"><span style="color:#FF79C6">    if</span><span style="color:#F8F8F2"> strings.</span><span style="color:#50FA7B">TrimSpace</span><span style="color:#F8F8F2">(req.StockID) </span><span style="color:#FF79C6">!=</span><span style="color:#E9F284"> ""</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">        stock, err </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> s.store.</span><span style="color:#50FA7B">ReserveStockByID</span><span style="color:#F8F8F2">(strings.</span><span style="color:#50FA7B">TrimSpace</span><span style="color:#F8F8F2">(req.StockID))</span></span>
<span class="line"><span style="color:#F8F8F2">    } </span><span style="color:#FF79C6">else</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">        stock, err </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> s.store.</span><span style="color:#50FA7B">ReserveStock</span><span style="color:#F8F8F2">(strings.</span><span style="color:#50FA7B">TrimSpace</span><span style="color:#F8F8F2">(req.SpecName))</span></span>
<span class="line"><span style="color:#F8F8F2">    }</span></span>
<span class="line"><span style="color:#FF79C6">    if</span><span style="color:#F8F8F2"> err </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#FF79C6">        return</span><span style="color:#8BE9FD;font-style:italic"> domain</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">VM</span><span style="color:#F8F8F2">{}, err</span></span>
<span class="line"><span style="color:#F8F8F2">    }</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F8F8F2">    vm </span><span style="color:#FF79C6">:=</span><span style="color:#8BE9FD;font-style:italic"> domain</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">VM</span><span style="color:#F8F8F2">{</span><span style="color:#FF79C6">...</span><span style="color:#F8F8F2">}</span></span>
<span class="line"><span style="color:#FF79C6">    if</span><span style="color:#F8F8F2"> err </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> s.store.</span><span style="color:#50FA7B">CreateVM</span><span style="color:#F8F8F2">(vm); err </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">        _ </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> s.store.</span><span style="color:#50FA7B">ReleaseStock</span><span style="color:#F8F8F2">(stock.ID)</span></span>
<span class="line"><span style="color:#FF79C6">        return</span><span style="color:#8BE9FD;font-style:italic"> domain</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">VM</span><span style="color:#F8F8F2">{}, err</span></span>
<span class="line"><span style="color:#F8F8F2">    }</span></span>
<span class="line"><span style="color:#FF79C6">    return</span><span style="color:#F8F8F2"> vm, </span><span style="color:#BD93F9">nil</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>Why:</p>
<ul>
<li>clear separation: capacity (<code>Stock</code>) vs workload (<code>VM</code>)</li>
<li>explicit rollback path when VM creation fails</li>
<li>same flow maps naturally to future reconcile logic</li>
</ul>
<p>Pitfall:
If you create VM first and reserve stock later, failure handling becomes inconsistent and can leak capacity.</p>
<p>File: <code>pkg/service/service.go</code></p>
<h3 id="step-5-extract-config-early">Step 5: Extract config early</h3>
<p>Purpose:
Make runtime behavior configurable from day one, instead of adding flags ad hoc later.</p>
<p>Code:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">type</span><span style="color:#8BE9FD;font-style:italic"> Config</span><span style="color:#FF79C6"> struct</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">    HTTPAddr       </span><span style="color:#8BE9FD;font-style:italic">string</span></span>
<span class="line"><span style="color:#F8F8F2">    ReportInterval </span><span style="color:#8BE9FD;font-style:italic">time</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Duration</span></span>
<span class="line"><span style="color:#F8F8F2">    KubeMode       </span><span style="color:#8BE9FD;font-style:italic">KubeMode</span></span>
<span class="line"><span style="color:#F8F8F2">    Kubeconfig     </span><span style="color:#8BE9FD;font-style:italic">string</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">const</span><span style="color:#F8F8F2"> (</span></span>
<span class="line"><span style="color:#F8F8F2">    KubeModeAuto     </span><span style="color:#8BE9FD;font-style:italic">KubeMode</span><span style="color:#FF79C6"> =</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C">auto</span><span style="color:#E9F284">"</span></span>
<span class="line"><span style="color:#F8F8F2">    KubeModeOff      </span><span style="color:#8BE9FD;font-style:italic">KubeMode</span><span style="color:#FF79C6"> =</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C">off</span><span style="color:#E9F284">"</span></span>
<span class="line"><span style="color:#F8F8F2">    KubeModeRequired </span><span style="color:#8BE9FD;font-style:italic">KubeMode</span><span style="color:#FF79C6"> =</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C">required</span><span style="color:#E9F284">"</span></span>
<span class="line"><span style="color:#F8F8F2">)</span></span></code></pre>
<p>Why:</p>
<ul>
<li>one binary can run in local dev, CI, or cluster</li>
<li>behavior changes through config instead of code edits</li>
<li>operational behavior is explicit and documented</li>
</ul>
<p>Pitfall:
Without a config model, feature flags and env parsing spread across packages quickly.</p>
<p>File: <code>pkg/config/config.go</code></p>
<h3 id="step-6-add-kubernetes-adapter-for-connectivity-signal">Step 6: Add Kubernetes adapter for connectivity signal</h3>
<p>Purpose:
Add Kubernetes awareness before operator adoption.</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#50FA7B"> BuildClient</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">mode</span><span style="color:#8BE9FD;font-style:italic"> config</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">KubeMode</span><span style="color:#F8F8F2">, </span><span style="color:#FFB86C;font-style:italic">kubeconfig</span><span style="color:#8BE9FD;font-style:italic"> string</span><span style="color:#F8F8F2">) (</span><span style="color:#8BE9FD;font-style:italic">kubernetes</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Interface</span><span style="color:#F8F8F2">, </span><span style="color:#8BE9FD;font-style:italic">error</span><span style="color:#F8F8F2">) {</span></span>
<span class="line"><span style="color:#FF79C6">    if</span><span style="color:#F8F8F2"> mode </span><span style="color:#FF79C6">==</span><span style="color:#F8F8F2"> config.KubeModeOff {</span></span>
<span class="line"><span style="color:#FF79C6">        return</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2">, </span><span style="color:#BD93F9">nil</span></span>
<span class="line"><span style="color:#F8F8F2">    }</span></span>
<span class="line"><span style="color:#F8F8F2">    restConfig, err </span><span style="color:#FF79C6">:=</span><span style="color:#50FA7B"> buildRestConfig</span><span style="color:#F8F8F2">(kubeconfig)</span></span>
<span class="line"><span style="color:#FF79C6">    ...</span></span>
<span class="line"><span style="color:#FF79C6">    return</span><span style="color:#F8F8F2"> kubernetes.</span><span style="color:#50FA7B">NewForConfig</span><span style="color:#F8F8F2">(restConfig)</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>Why:</p>
<ul>
<li><code>/health</code> can expose real cluster connectivity</li>
<li>startup mode supports local and in-cluster runtime</li>
<li>future migration to controller-runtime is incremental, not disruptive</li>
</ul>
<p>Pitfall:
If cluster integration starts only when introducing reconcile, migration risk and debugging complexity both spike.</p>
<p>File: <code>pkg/kube/client.go</code></p>
<h3 id="step-7-add-a-periodic-reporter-job">Step 7: Add a periodic reporter job</h3>
<p>Purpose:
Introduce a minimal observability loop with periodic runtime state reporting.</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#F8F8F2"> (</span><span style="color:#FFB86C;font-style:italic">r </span><span style="color:#FF79C6">*</span><span style="color:#8BE9FD;font-style:italic">StatusReporter</span><span style="color:#F8F8F2">) </span><span style="color:#50FA7B">Start</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">ctx</span><span style="color:#8BE9FD;font-style:italic"> context</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Context</span><span style="color:#F8F8F2">) {</span></span>
<span class="line"><span style="color:#F8F8F2">    ticker </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> time.</span><span style="color:#50FA7B">NewTicker</span><span style="color:#F8F8F2">(r.interval)</span></span>
<span class="line"><span style="color:#FF79C6">    defer</span><span style="color:#F8F8F2"> ticker.</span><span style="color:#50FA7B">Stop</span><span style="color:#F8F8F2">()</span></span>
<span class="line"></span>
<span class="line"><span style="color:#FF79C6">    for</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#FF79C6">        select</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#FF79C6">        case</span><span style="color:#FF79C6"> &#x3C;-</span><span style="color:#F8F8F2">ctx.</span><span style="color:#50FA7B">Done</span><span style="color:#F8F8F2">():</span></span>
<span class="line"><span style="color:#FF79C6">            return</span></span>
<span class="line"><span style="color:#FF79C6">        case</span><span style="color:#FF79C6"> &#x3C;-</span><span style="color:#F8F8F2">ticker.C:</span></span>
<span class="line"><span style="color:#F8F8F2">            health, err </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> r.service.</span><span style="color:#50FA7B">Health</span><span style="color:#F8F8F2">(ctx)</span></span>
<span class="line"><span style="color:#FF79C6">            ...</span></span>
<span class="line"><span style="color:#F8F8F2">            r.logger.</span><span style="color:#50FA7B">Info</span><span style="color:#F8F8F2">(</span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">runtime status</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, </span><span style="color:#FF79C6">...</span><span style="color:#F8F8F2">)</span></span>
<span class="line"><span style="color:#F8F8F2">        }</span></span>
<span class="line"><span style="color:#F8F8F2">    }</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>Why:</p>
<ul>
<li>request logs show calls, not steady-state runtime health</li>
<li>periodic reporting surfaces drift and silent failures</li>
<li>provides extension point for future metrics/events pipeline</li>
</ul>
<p>Pitfall:
No background reporting means incidents can remain invisible until user traffic fails.</p>
<p>File: <code>pkg/jobs/status_reporter.go</code></p>
<h2 id="how-to-validate-this-iteration">How to Validate This Iteration</h2>
<p>Validation checklist:</p>
<ol>
<li>compile and dependency sanity</li>
</ol>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">make</span><span style="color:#F1FA8C"> tidy</span></span>
<span class="line"><span style="color:#50FA7B">go</span><span style="color:#F1FA8C"> test</span><span style="color:#F1FA8C"> ./...</span></span></code></pre>
<ol start="2">
<li>run runtime</li>
</ol>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">make</span><span style="color:#F1FA8C"> run</span></span></code></pre>
<ol start="3">
<li>health check</li>
</ol>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">curl</span><span style="color:#BD93F9"> -s</span><span style="color:#F1FA8C"> http://127.0.0.1:8080/api/v1/health</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> jq</span></span></code></pre>
<ol start="4">
<li>stock lifecycle</li>
</ol>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">curl</span><span style="color:#BD93F9"> -s</span><span style="color:#BD93F9"> -X</span><span style="color:#F1FA8C"> POST</span><span style="color:#F1FA8C"> http://127.0.0.1:8080/api/v1/stocks</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -H</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">Content-Type: application/json</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -d</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">{"number":2,"specName":"g1.1","cpu":"4","memory":"16Gi","gpuType":"RTX4090","gpuNum":1}</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> jq</span></span></code></pre>
<ol start="5">
<li>vm lifecycle</li>
</ol>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">curl</span><span style="color:#BD93F9"> -s</span><span style="color:#BD93F9"> -X</span><span style="color:#F1FA8C"> POST</span><span style="color:#F1FA8C"> http://127.0.0.1:8080/api/v1/vms</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -H</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">Content-Type: application/json</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -d</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">{"tenantID":"tenant-a","tenantName":"team-a","specName":"g1.1"}</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> jq</span></span></code></pre>
<p>Definition of Done for this chapter:</p>
<ul>
<li>service is runnable locally</li>
<li>API contract is stable and explicit</li>
<li>stock/vm lifecycle loop works end-to-end</li>
<li>status reporter emits periodic runtime state</li>
</ul>
<h2 id="troubleshooting-guide-early-iteration">Troubleshooting Guide (Early Iteration)</h2>
<h3 id="runtime-exits-on-startup">Runtime exits on startup</h3>
<p>Check:</p>
<ul>
<li>invalid flag values (<code>--kube-mode</code>)</li>
<li>port already in use (<code>:8080</code>)</li>
<li><code>required</code> kube mode without valid kubeconfig</li>
</ul>
<h3 id="health-shows-kubernetesconnectedfalse"><code>/health</code> shows <code>kubernetesConnected=false</code></h3>
<p>Check:</p>
<ul>
<li>run with <code>--kube-mode=auto</code> or <code>--kube-mode=required</code></li>
<li>verify <code>~/.kube/config</code> exists and context is correct</li>
<li>if running in cluster, verify service account permissions</li>
</ul>
<h3 id="vm-creation-fails-with-no-available-stock">VM creation fails with no available stock</h3>
<p>This is expected behavior if stock pool is empty.
Create stock first or use a valid <code>specName</code>.</p>
<h3 id="api-returns-400">API returns 400</h3>
<p>Common causes:</p>
<ul>
<li>malformed JSON</li>
<li>missing required fields (<code>specName</code>, <code>number</code>)</li>
<li>unsupported request shape due to strict decode</li>
</ul>
<h2 id="iteration-summary">Iteration Summary</h2>
<p>This chapter intentionally prioritizes engineering foundations over feature volume.</p>
<p>We now have:</p>
<ul>
<li>clear layering</li>
<li>deterministic startup/shutdown path</li>
<li>explicit lifecycle flow with rollback</li>
<li>basic operational visibility</li>
</ul>
<p>This is a good production-minded baseline for introducing more complexity safely.</p>
<h2 id="next-chapter-preview">Next Chapter Preview</h2>
<p>Part 5 will introduce the <strong>minimal Operator skeleton</strong>:</p>
<ul>
<li><code>controller-runtime</code> manager</li>
<li>first CRD model for runtime resources</li>
<li>first reconcile loop and status update flow</li>
</ul>
<p>At that point, we will migrate from in-memory state to Kubernetes-native desired/actual state management.</p>
<h2 id="repository">Repository</h2>
<p>Code for this tutorial runtime:</p>
<p><a href="https://github.com/LokiWager/gpu-operator-runtime" rel="nofollow, noopener, noreferrer" target="_blank">gpu-operator-runtime</a></p>`,t={title:"Building a GPU SaaS Platform - Runtime Bootstrap in Go",publishDate:"27 February 2026",description:"Part 4: build the first runnable single-cluster runtime baseline with production-oriented engineering habits.",tags:["GPU","SaaS","Kubernetes","Golang","Operator"],minutesRead:"8 min read"},p="/home/runner/work/lokiwager.github.io/lokiwager.github.io/src/content/post/building-gpu-service-4.md",r=void 0;function g(){return`
# Building a GPU SaaS Platform

Target readers:

- you already know Golang syntax and basic project structure
- you are not yet confident in production-oriented engineering decisions

This chapter is not just about "making code run". It is about learning how to make decisions that support long-term delivery.

## Chapter Goal

By the end of this chapter, you should have a runnable single-cluster runtime baseline that includes:

- process startup and graceful shutdown
- baseline API (\`health / stocks / vms\`)
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

- use standard library for HTTP (\`net/http\`)
- use standard library for logging (\`log/slog\`)
- avoid extra frameworks in the first implementation
- include only required Kubernetes dependency (\`client-go\`)

\`\`\`go
require k8s.io/client-go v0.30.10
\`\`\`

Why this choice:

- fewer abstractions at start means easier debugging
- lower cognitive load for readers new to engineering practice
- we keep room to evolve later (Echo/Gin, zap, metrics stack) based on measured needs

## Architecture (Iteration 1)

\`\`\`text
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
\`\`\`

Boundary rules:

- \`api\`: transport only (decode/encode/status code)
- \`service\`: business orchestration only
- \`store\`: state operations only
- \`runtime\`: wiring only

These rules prevent "everything in handler" code, which is the most common early-stage anti-pattern.

## Step-by-Step Implementation

### Step 0: Add testing and CI/CD from day one

Purpose:
Set minimum quality gates at project initialization, not after incidents.
This chapter only gives a lightweight setup. You should treat this part as mandatory homework.

Code:

\`\`\`bash
make ci
\`\`\`

\`\`\`make
ci: fmt-check vet test-race build
\`\`\`

\`\`\`yaml
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
\`\`\`

\`\`\`yaml
# .github/workflows/release-image.yml
name: Release Image
on:
  push:
    tags: ["v*"]
\`\`\`

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

- \`Makefile\`
- \`.github/workflows/ci.yml\`
- \`.github/workflows/release-image.yml\`
- \`pkg/config/config_test.go\`
- \`pkg/store/memory_test.go\`
- \`pkg/service/service_test.go\`
- \`pkg/api/server_test.go\`

### Step 1: Keep \`main\` minimal and predictable

Purpose:
Define a deterministic startup and shutdown path. \`main\` is orchestration only.

Code:

\`\`\`go
func main() {
    cfg, err := loadConfig()
    if err != nil {
        fmt.Fprintf(os.Stderr, "config error: %v\\\\n", err)
        os.Exit(1)
    }

    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    runtime, err := app.New(cfg)
    if err != nil {
        fmt.Fprintf(os.Stderr, "startup error: %v\\\\n", err)
        os.Exit(1)
    }

    if err := runtime.Run(ctx); err != nil {
        fmt.Fprintf(os.Stderr, "runtime error: %v\\\\n", err)
        os.Exit(1)
    }
}
\`\`\`

Why:

- startup failures are explicit and visible in one place
- shutdown behavior is deterministic
- business logic remains testable outside \`main\`

Pitfall:
Putting business logic in \`main\` makes testing hard and refactors expensive.

File: \`cmd/runtime/main.go\`

### Step 2: Use a dedicated runtime wiring layer

Purpose:
Create one composition root (\`pkg/runtime\`) to wire dependencies and keep layering stable.

Code:

\`\`\`go
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
\`\`\`

Why:

- all dependencies are visible in one location
- easier to replace components in tests
- clean migration path to operator manager later

Pitfall:
If handlers/services instantiate dependencies directly, ownership becomes unclear and startup behavior fragments.

File: \`pkg/runtime/runtime.go\`

### Step 3: Keep API handlers thin

Purpose:
Keep HTTP layer responsible only for transport, not business rules.

Code:

\`\`\`go
func (s *Server) routes() {
    s.mux.HandleFunc("/api/v1/health", s.handleHealth)
    s.mux.HandleFunc("/api/v1/stocks", s.handleStocks)
    s.mux.HandleFunc("/api/v1/vms", s.handleVMs)
    s.mux.HandleFunc("/api/v1/vms/", s.handleVMByID)
}
\`\`\`

\`\`\`go
type envelope struct {
    Data  any       \`json:"data,omitempty"\`
    Error *apiError \`json:"error,omitempty"\`
}
\`\`\`

\`\`\`go
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
\`\`\`

Why:

- transport concerns remain isolated
- service methods can be reused by jobs/tests later
- API protocol changes do not force lifecycle refactors

Pitfall:
If validation, status code mapping, and business logic are mixed in handlers, every API change becomes high risk.

File: \`pkg/api/server.go\`

### Step 4: Keep lifecycle orchestration in \`service\`

Purpose:
Implement the first runtime lifecycle loop and explain why \`Stock\` is a first-class model.

\`Stock\` represents pre-provisioned GPU capacity. It is intentionally separated from tenant VM identity.
This avoids coupling capacity accounting with workload lifecycle.

Code:

\`\`\`go
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
\`\`\`

Why:

- clear separation: capacity (\`Stock\`) vs workload (\`VM\`)
- explicit rollback path when VM creation fails
- same flow maps naturally to future reconcile logic

Pitfall:
If you create VM first and reserve stock later, failure handling becomes inconsistent and can leak capacity.

File: \`pkg/service/service.go\`

### Step 5: Extract config early

Purpose:
Make runtime behavior configurable from day one, instead of adding flags ad hoc later.

Code:

\`\`\`go
type Config struct {
    HTTPAddr       string
    ReportInterval time.Duration
    KubeMode       KubeMode
    Kubeconfig     string
}
\`\`\`

\`\`\`go
const (
    KubeModeAuto     KubeMode = "auto"
    KubeModeOff      KubeMode = "off"
    KubeModeRequired KubeMode = "required"
)
\`\`\`

Why:

- one binary can run in local dev, CI, or cluster
- behavior changes through config instead of code edits
- operational behavior is explicit and documented

Pitfall:
Without a config model, feature flags and env parsing spread across packages quickly.

File: \`pkg/config/config.go\`

### Step 6: Add Kubernetes adapter for connectivity signal

Purpose:
Add Kubernetes awareness before operator adoption.

\`\`\`go
func BuildClient(mode config.KubeMode, kubeconfig string) (kubernetes.Interface, error) {
    if mode == config.KubeModeOff {
        return nil, nil
    }
    restConfig, err := buildRestConfig(kubeconfig)
    ...
    return kubernetes.NewForConfig(restConfig)
}
\`\`\`

Why:

- \`/health\` can expose real cluster connectivity
- startup mode supports local and in-cluster runtime
- future migration to controller-runtime is incremental, not disruptive

Pitfall:
If cluster integration starts only when introducing reconcile, migration risk and debugging complexity both spike.

File: \`pkg/kube/client.go\`

### Step 7: Add a periodic reporter job

Purpose:
Introduce a minimal observability loop with periodic runtime state reporting.

\`\`\`go
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
\`\`\`

Why:

- request logs show calls, not steady-state runtime health
- periodic reporting surfaces drift and silent failures
- provides extension point for future metrics/events pipeline

Pitfall:
No background reporting means incidents can remain invisible until user traffic fails.

File: \`pkg/jobs/status_reporter.go\`

## How to Validate This Iteration

Validation checklist:

1. compile and dependency sanity

\`\`\`bash
make tidy
go test ./...
\`\`\`

2. run runtime

\`\`\`bash
make run
\`\`\`

3. health check

\`\`\`bash
curl -s http://127.0.0.1:8080/api/v1/health | jq
\`\`\`

4. stock lifecycle

\`\`\`bash
curl -s -X POST http://127.0.0.1:8080/api/v1/stocks \\
  -H 'Content-Type: application/json' \\
  -d '{"number":2,"specName":"g1.1","cpu":"4","memory":"16Gi","gpuType":"RTX4090","gpuNum":1}' | jq
\`\`\`

5. vm lifecycle

\`\`\`bash
curl -s -X POST http://127.0.0.1:8080/api/v1/vms \\
  -H 'Content-Type: application/json' \\
  -d '{"tenantID":"tenant-a","tenantName":"team-a","specName":"g1.1"}' | jq
\`\`\`

Definition of Done for this chapter:

- service is runnable locally
- API contract is stable and explicit
- stock/vm lifecycle loop works end-to-end
- status reporter emits periodic runtime state

## Troubleshooting Guide (Early Iteration)

### Runtime exits on startup

Check:

- invalid flag values (\`--kube-mode\`)
- port already in use (\`:8080\`)
- \`required\` kube mode without valid kubeconfig

### \`/health\` shows \`kubernetesConnected=false\`

Check:

- run with \`--kube-mode=auto\` or \`--kube-mode=required\`
- verify \`~/.kube/config\` exists and context is correct
- if running in cluster, verify service account permissions

### VM creation fails with no available stock

This is expected behavior if stock pool is empty.
Create stock first or use a valid \`specName\`.

### API returns 400

Common causes:

- malformed JSON
- missing required fields (\`specName\`, \`number\`)
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

- \`controller-runtime\` manager
- first CRD model for runtime resources
- first reconcile loop and status update flow

At that point, we will migrate from in-memory state to Kubernetes-native desired/actual state management.

## Repository

Code for this tutorial runtime:

[gpu-operator-runtime](https://github.com/LokiWager/gpu-operator-runtime)
`}function m(){return s}function f(){return[{depth:1,slug:"building-a-gpu-saas-platform",text:"Building a GPU SaaS Platform"},{depth:2,slug:"chapter-goal",text:"Chapter Goal"},{depth:2,slug:"engineering-goal-of-this-iteration",text:"Engineering Goal of This Iteration"},{depth:2,slug:"what-we-deliberately-do-not-build-yet",text:"What We Deliberately Do Not Build Yet"},{depth:2,slug:"technology-selection-in-this-iteration",text:"Technology Selection in This Iteration"},{depth:2,slug:"architecture-iteration-1",text:"Architecture (Iteration 1)"},{depth:2,slug:"step-by-step-implementation",text:"Step-by-Step Implementation"},{depth:3,slug:"step-0-add-testing-and-cicd-from-day-one",text:"Step 0: Add testing and CI/CD from day one"},{depth:3,slug:"step-1-keep-main-minimal-and-predictable",text:"Step 1: Keep main minimal and predictable"},{depth:3,slug:"step-2-use-a-dedicated-runtime-wiring-layer",text:"Step 2: Use a dedicated runtime wiring layer"},{depth:3,slug:"step-3-keep-api-handlers-thin",text:"Step 3: Keep API handlers thin"},{depth:3,slug:"step-4-keep-lifecycle-orchestration-in-service",text:"Step 4: Keep lifecycle orchestration in service"},{depth:3,slug:"step-5-extract-config-early",text:"Step 5: Extract config early"},{depth:3,slug:"step-6-add-kubernetes-adapter-for-connectivity-signal",text:"Step 6: Add Kubernetes adapter for connectivity signal"},{depth:3,slug:"step-7-add-a-periodic-reporter-job",text:"Step 7: Add a periodic reporter job"},{depth:2,slug:"how-to-validate-this-iteration",text:"How to Validate This Iteration"},{depth:2,slug:"troubleshooting-guide-early-iteration",text:"Troubleshooting Guide (Early Iteration)"},{depth:3,slug:"runtime-exits-on-startup",text:"Runtime exits on startup"},{depth:3,slug:"health-shows-kubernetesconnectedfalse",text:"/health shows kubernetesConnected=false"},{depth:3,slug:"vm-creation-fails-with-no-available-stock",text:"VM creation fails with no available stock"},{depth:3,slug:"api-returns-400",text:"API returns 400"},{depth:2,slug:"iteration-summary",text:"Iteration Summary"},{depth:2,slug:"next-chapter-preview",text:"Next Chapter Preview"},{depth:2,slug:"repository",text:"Repository"}]}const b=e((i,c,F)=>{const{layout:y,...n}=t;return n.file=p,n.url=r,a`${o()}${l(s)}`});export{b as Content,m as compiledContent,b as default,p as file,t as frontmatter,f as getHeadings,g as rawContent,r as url};
