import{c as s,r as t,m as a}from"./render-template.EUycRu7A.js";import{u as o}from"./hoisted.vDHagUjq.js";import"./astro/assets-service.wdzbVTWi.js";const n=`<p>Part 5 gave us a real control loop:</p>
<ul>
<li>HTTP request</li>
<li><code>StockPool</code> custom resource</li>
<li>controller reconcile</li>
<li><code>Deployment</code></li>
</ul>
<p>That was the minimum line where the project stopped being a mock.</p>
<p>Part 6 is about making that line survivable.</p>
<p>In a real system, the next problems are not glamorous:</p>
<ul>
<li>clients retry requests</li>
<li>duplicate writes appear</li>
<li>bad specs get accepted and then fail somewhere deeper in the stack</li>
<li>the controller owns too little of the workload lifecycle</li>
<li>the pod template is still too fake to support later runtime work</li>
</ul>
<p>That is exactly what this chapter fixes. No one wants to spend every day patching the same fragile system. If you have ever been on call, and spent the whole night half-awake because you were afraid of missing an alert, you already understand why these “boring” problems matter so much. Then the next day, because you did not sleep well, you create even more bugs. A lot of the time, engineers are not out there “building the future.” They are repairing cracks in systems that should have been made safer earlier. That is why we need to take validation, monitoring, degradation, and circuit-breaking seriously from the beginning.</p>
<h2 id="chapter-goal">Chapter Goal</h2>
<p>By the end of this chapter, the runtime has five new properties:</p>
<ol>
<li>create requests are idempotent at the operation level</li>
<li>the API contract is stricter about what a job means</li>
<li>the controller reports failures and lifecycle state more explicitly</li>
<li><code>StockPool.spec</code> contains the first real runtime template instead of a hardwired <code>sleep 3600</code></li>
<li>the Echo API publishes Swagger documentation so the contract is visible without reading handler code</li>
</ol>
<p>This is not yet a full GPU runtime. It is the point where the Operator starts behaving like software that can survive retries, support debugging, and grow into real workloads.</p>
<h2 id="the-real-problem-we-were-hiding">The Real Problem We Were Hiding</h2>
<p>Before this iteration, a write request could easily lie to the caller without meaning to.</p>
<p>Example:</p>
<ol>
<li>the API accepts a create request</li>
<li>the async job reports success because the CR was created</li>
<li>the controller later fails to build the workload because <code>memory</code> is invalid</li>
<li>the caller only sees “job succeeded” unless they inspect controller logs or cluster events</li>
</ol>
<p>That is a bad contract.</p>
<p>A production system does not need perfect abstractions on day one, but it does need honest ones.</p>
<p>So Part 6 tightens the contract in two directions at the same time:</p>
<ul>
<li>the write path becomes safer under retries</li>
<li>the reconcile path becomes more observable when desired state is invalid or incomplete</li>
</ul>
<p>All changes in this chapter are tightly related. If you only add idempotency but keep bad controller feedback, you still have a hard-to-debug system.
If you only improve controller status but keep a loose write contract, retries still create garbage. If you only add a runtime template without a
service, you still have no stable network boundary for the pod. So when you finish this chapter, stop and ask yourself: is this really enough? What problems are still unsolved? If we leave them alone now, will they become much more expensive later? Keeping that instinct alive is part of what makes software engineering interesting.</p>
<h2 id="why-operationid-matters">Why <code>operationID</code> Matters</h2>
<p>Distributed systems retry. That is normal.</p>
<p>Browsers retry. Gateways retry. SDKs retry. Humans retry.</p>
<p>If a <code>POST</code> request can create two <code>StockPool</code> objects because the caller did not receive the first response, the problem is not “the caller should be smarter”. The problem is that the API contract is under-specified.</p>
<p>So the create request now requires an <code>operationID</code>:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">type</span><span style="color:#8BE9FD;font-style:italic"> CreateStockPoolRequest</span><span style="color:#FF79C6"> struct</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">    OperationID </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"operationID"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Name        </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"name,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Namespace   </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"namespace,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    SpecName    </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"specName"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Image       </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"image,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Memory      </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"memory,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    GPU         </span><span style="color:#8BE9FD;font-style:italic">int32</span><span style="color:#E9F284">  \`</span><span style="color:#F1FA8C">json:"gpu,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Replicas    </span><span style="color:#8BE9FD;font-style:italic">int32</span><span style="color:#E9F284">  \`</span><span style="color:#F1FA8C">json:"replicas"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Template    </span><span style="color:#8BE9FD;font-style:italic">runtimev1alpha1</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">StockPoolTemplate</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"template,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>The service now does three things with that identifier:</p>
<ul>
<li>it normalizes and validates the request before queuing work</li>
<li>it computes a request hash from the normalized payload</li>
<li>it stores both <code>operationID</code> and request hash on the <code>StockPool</code> annotations</li>
</ul>
<p>That gives us useful behavior:</p>
<ul>
<li>same <code>operationID</code> + same payload: return the same operation</li>
<li>same <code>operationID</code> + different payload: reject with <code>409 Conflict</code></li>
<li>generated object names become deterministic when the caller does not provide one</li>
</ul>
<p>That last point matters more than it sounds. Random names are convenient in demos. They are terrible for idempotency.</p>
<h2 id="why-swagger-belongs-here">Why Swagger Belongs Here</h2>
<p>Once we switched the HTTP layer to <code>echo</code>, the control-plane API stopped being “just a few handlers”.</p>
<p>At that point, the contract deserves to be visible:</p>
<ul>
<li>request body shape</li>
<li>response shape</li>
<li>status codes</li>
<li>path parameters</li>
<li>query parameters</li>
</ul>
<p>That is why this chapter adds Swagger now instead of much later.</p>
<p>This is not about chasing tooling for its own sake. It is about reducing ambiguity while the API surface is still small enough to keep honest.</p>
<p>The practical result is simple:</p>
<ul>
<li>the server now exposes <code>/swagger/index.html</code></li>
<li>the docs are generated from handler annotations</li>
<li><code>make swagger</code> and <code>make ci</code> keep the checked-in spec reproducible</li>
</ul>
<p>For a teaching project, this matters even more than usual. Readers should be able to inspect the API contract directly, not reverse-engineer it from <code>curl</code> examples and handler code.</p>
<h2 id="tightening-what-a-job-means">Tightening What A Job Means</h2>
<p>The job now represents:</p>
<ul>
<li>“did the control plane accept this operation?”</li>
<li>“did it persist the desired state as a <code>StockPool</code> resource?”</li>
</ul>
<p>It does <strong>not</strong> mean:</p>
<ul>
<li>“the runtime is ready for user traffic”</li>
</ul>
<p>That distinction is important.</p>
<p>The operation contract belongs to the write path.
Runtime readiness belongs to reconciliation status.</p>
<p>If you collapse those two ideas into one field too early, the API becomes confusing very quickly.</p>
<p>So the split is now:</p>
<ul>
<li><code>GET /api/v1/operator/jobs/:operationID</code>: operation acceptance/persistence</li>
<li><code>StockPool.status</code>: reconcile progress, readiness, and failure details</li>
</ul>
<p>That is a much cleaner boundary.</p>
<h2 id="the-controller-owns-more-of-the-lifecycle-now">The Controller Owns More Of The Lifecycle Now</h2>
<p>In Part 5, the controller only created a <code>Deployment</code>.</p>
<p>That was enough to prove the architecture, but it was still thin:</p>
<ul>
<li>no stable service endpoint for a runtime pod</li>
<li>no explicit failed phase</li>
<li>no readable condition message for invalid desired state</li>
</ul>
<p>Part 6 extends controller ownership in two practical ways.</p>
<h3 id="1-reconcile-the-service-not-just-the-deployment">1. Reconcile the <code>Service</code>, not just the <code>Deployment</code></h3>
<p>If the runtime template exposes ports, the controller now creates a matching <code>ClusterIP</code> <code>Service</code>.</p>
<p>That is the first step toward a real runtime boundary:</p>
<ul>
<li>pods can restart and be replaced</li>
<li>the service name stays stable</li>
<li>later chapters can attach access policy, probes, ingress, or sidecar communication to a stable endpoint</li>
</ul>
<p>This is why the service belongs in the controller instead of being created ad hoc somewhere in the API layer.</p>
<p>The controller owns workload lifecycle. A service is part of that lifecycle.</p>
<h3 id="2-report-explicit-failure-and-readiness-conditions">2. Report explicit failure and readiness conditions</h3>
<p>The <code>StockPool</code> status now includes:</p>
<ul>
<li><code>phase</code></li>
<li><code>serviceName</code></li>
<li><code>conditions</code></li>
<li><code>observedGeneration</code></li>
<li><code>lastSyncTime</code></li>
</ul>
<p>And the controller sets a <code>Ready</code> condition with reasons such as:</p>
<ul>
<li><code>DeploymentProgressing</code></li>
<li><code>DeploymentReady</code></li>
<li><code>ScaledToZero</code></li>
<li><code>InvalidSpec</code></li>
<li><code>PodStartupFailed</code></li>
<li><code>PodStatusSyncFailed</code></li>
<li><code>ServiceSyncFailed</code></li>
<li><code>DeploymentSyncFailed</code></li>
</ul>
<p>That means invalid desired state is no longer just a log line.</p>
<p>If <code>memory: "not-a-quantity"</code> is sent, the controller marks the resource as <code>Failed</code> with an <code>InvalidSpec</code> reason instead of endlessly returning a parse error and hoping someone notices.</p>
<p>That is a very production-shaped change. Operators should explain failure in resource status whenever they can.</p>
<p>This chapter also goes one step further: when the deployment exists but a runtime pod is failing to start, the controller inspects the owned pods and copies the most useful failure message into the <code>Ready</code> condition.</p>
<p>So instead of only seeing:</p>
<ul>
<li><code>phase: Failed</code></li>
</ul>
<p>you can now get something much closer to the real problem, for example:</p>
<ul>
<li>image pull failures</li>
<li>crash loop messages</li>
<li>the last terminated container message when startup logic fails</li>
</ul>
<p>That is the difference between “status exists” and “status helps you debug production”.</p>
<h2 id="preparing-for-real-runtime-pods">Preparing For Real Runtime Pods</h2>
<p>The old pod template was intentionally primitive:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#F8F8F2">Command: []</span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#F8F8F2">{</span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">sh</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, </span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">-c</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, </span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">sleep 3600</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">}</span></span></code></pre>
<p>That was fine in Part 5 because the goal was proving the control loop.</p>
<p>It is not fine anymore.</p>
<p>If the controller hardcodes the workload shape, every future runtime feature becomes awkward:</p>
<ul>
<li>ports</li>
<li>startup command</li>
<li>env injection</li>
<li>probes</li>
<li>storage mounts</li>
<li>sidecars</li>
</ul>
<p>So this iteration introduces the first real runtime-facing template:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">type</span><span style="color:#8BE9FD;font-style:italic"> StockPoolTemplate</span><span style="color:#FF79C6"> struct</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">    Command []</span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284">          \`</span><span style="color:#F1FA8C">json:"command,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Args    []</span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284">          \`</span><span style="color:#F1FA8C">json:"args,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Envs    []</span><span style="color:#8BE9FD;font-style:italic">StockPoolEnvVar</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"envs,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Ports   []</span><span style="color:#8BE9FD;font-style:italic">StockPoolPortSpec</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"ports,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>That does not mean we are done. It means we now have the right place to put runtime concerns.</p>
<p>The controller still falls back to the placeholder sleep command when no template command or args are provided. That is intentional. We are not pretending to have a finished runtime image contract yet.</p>
<p>What changed is the direction of the architecture:</p>
<ul>
<li>workload shape is now part of desired state</li>
<li>the controller translates that shape into container config and service ports</li>
<li>later chapters can extend the template instead of rewriting the control flow again</li>
</ul>
<h2 id="flow-after-part-6">Flow After Part 6</h2>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>+-----------------------------+</span></span>
<span class="line"><span>| Echo HTTP API               |</span></span>
<span class="line"><span>| POST /operator/stockpools   |</span></span>
<span class="line"><span>+-------------+---------------+</span></span>
<span class="line"><span>              |</span></span>
<span class="line"><span>              v</span></span>
<span class="line"><span>+-------------+---------------+</span></span>
<span class="line"><span>| service layer               |</span></span>
<span class="line"><span>| validate request            |</span></span>
<span class="line"><span>| require operationID         |</span></span>
<span class="line"><span>| detect duplicate payload    |</span></span>
<span class="line"><span>| create StockPool CR         |</span></span>
<span class="line"><span>+-------------+---------------+</span></span>
<span class="line"><span>              |</span></span>
<span class="line"><span>              v</span></span>
<span class="line"><span>+-------------+---------------+</span></span>
<span class="line"><span>| StockPool                    |</span></span>
<span class="line"><span>| spec.template                |</span></span>
<span class="line"><span>| operation annotations        |</span></span>
<span class="line"><span>+-------------+---------------+</span></span>
<span class="line"><span>              |</span></span>
<span class="line"><span>              v</span></span>
<span class="line"><span>+-------------+---------------+</span></span>
<span class="line"><span>| controller                    |</span></span>
<span class="line"><span>| reconcile Deployment         |</span></span>
<span class="line"><span>| reconcile Service            |</span></span>
<span class="line"><span>| update phase + conditions    |</span></span>
<span class="line"><span>+-------------+---------------+</span></span>
<span class="line"><span>              |</span></span>
<span class="line"><span>              v</span></span>
<span class="line"><span>+-------------+---------------+</span></span>
<span class="line"><span>| runtime worker pods          |</span></span>
<span class="line"><span>| stable ClusterIP service     |</span></span>
<span class="line"><span>+-----------------------------+</span></span></code></pre>
<h2 id="code-walkthrough">Code Walkthrough</h2>
<h3 id="request-validation-moved-before-the-queue">Request validation moved before the queue</h3>
<p>This is the right time to reject:</p>
<ul>
<li>missing <code>operationID</code></li>
<li>invalid <code>memory</code></li>
<li>negative replica or GPU values</li>
<li>invalid or duplicate template env/port definitions</li>
</ul>
<p>If the request is clearly wrong, the system should say so immediately. There is no value in accepting garbage, writing a CR, and forcing the
controller to discover the mistake later.</p>
<h3 id="idempotency-is-anchored-in-kubernetes-state">Idempotency is anchored in Kubernetes state</h3>
<p>The request hash is stored on the <code>StockPool</code> annotations, not only in an in-memory map.</p>
<p>That matters because the in-memory job store is only a convenience for this single-process stage. The custom resource is the durable system record.</p>
<p>This is one of the subtle lessons in production work:</p>
<ul>
<li>process memory is operationally useful</li>
<li>Kubernetes objects are the contract boundary</li>
</ul>
<h3 id="status-is-now-for-humans-not-just-code">Status is now for humans, not just code</h3>
<p>The controller uses <code>phase</code> and <code>conditions</code> together.</p>
<p>That is deliberate:</p>
<ul>
<li><code>phase</code> is good for quick scanning</li>
<li><code>conditions</code> are good for precise diagnosis</li>
</ul>
<p>This is why many mature Kubernetes APIs use both a compact summary and condition detail.</p>
<h2 id="run-and-verify">Run And Verify</h2>
<p>Run the code:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#8BE9FD">cd</span><span style="color:#F1FA8C"> /Users/haotingyi/Documents/workspaces/loki/gpu-operator-runtime</span></span>
<span class="line"><span style="color:#50FA7B">make</span><span style="color:#F1FA8C"> ci</span></span>
<span class="line"><span style="color:#50FA7B">make</span><span style="color:#F1FA8C"> run</span></span></code></pre>
<p>Before you test a request with <code>"gpu": 1</code>, make sure the cluster already exposes <code>nvidia.com/gpu</code>.</p>
<p>For most readers, that means installing NVIDIA GPU Operator first. A manually prepared cluster also works, but only if the NVIDIA drivers, runtime integration, and device plugin are already in place.</p>
<p>If the cluster does not expose <code>nvidia.com/gpu</code>, keep the tutorial request at <code>gpu: 0</code> while you work on the API and controller flow.</p>
<p>Open the API docs:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">open</span><span style="color:#F1FA8C"> http://127.0.0.1:8080/swagger/index.html</span></span></code></pre>
<p>Create a stock pool with a real runtime template:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">curl</span><span style="color:#BD93F9"> -s</span><span style="color:#BD93F9"> -X</span><span style="color:#F1FA8C"> POST</span><span style="color:#F1FA8C"> http://127.0.0.1:8080/api/v1/operator/stockpools</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -H</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">Content-Type: application/json</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -d</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">{</span></span>
<span class="line"><span style="color:#F1FA8C">    "operationID": "stock-g1-demo-001",</span></span>
<span class="line"><span style="color:#F1FA8C">    "name": "pool-g1-demo",</span></span>
<span class="line"><span style="color:#F1FA8C">    "namespace": "default",</span></span>
<span class="line"><span style="color:#F1FA8C">    "specName": "g1.1",</span></span>
<span class="line"><span style="color:#F1FA8C">    "image": "python:3.12-slim",</span></span>
<span class="line"><span style="color:#F1FA8C">    "memory": "16Gi",</span></span>
<span class="line"><span style="color:#F1FA8C">    "gpu": 1,</span></span>
<span class="line"><span style="color:#F1FA8C">    "replicas": 1,</span></span>
<span class="line"><span style="color:#F1FA8C">    "template": {</span></span>
<span class="line"><span style="color:#F1FA8C">      "command": ["python"],</span></span>
<span class="line"><span style="color:#F1FA8C">      "args": ["-m", "http.server", "8080"],</span></span>
<span class="line"><span style="color:#F1FA8C">      "envs": [</span></span>
<span class="line"><span style="color:#F1FA8C">        {"name": "MODEL_ID", "value": "demo-model"}</span></span>
<span class="line"><span style="color:#F1FA8C">      ],</span></span>
<span class="line"><span style="color:#F1FA8C">      "ports": [</span></span>
<span class="line"><span style="color:#F1FA8C">        {"name": "http", "port": 8080, "protocol": "TCP"}</span></span>
<span class="line"><span style="color:#F1FA8C">      ]</span></span>
<span class="line"><span style="color:#F1FA8C">    }</span></span>
<span class="line"><span style="color:#F1FA8C">  }</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> jq</span></span></code></pre>
<p>Send the same request again:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">curl</span><span style="color:#BD93F9"> -s</span><span style="color:#BD93F9"> -X</span><span style="color:#F1FA8C"> POST</span><span style="color:#F1FA8C"> http://127.0.0.1:8080/api/v1/operator/stockpools</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -H</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">Content-Type: application/json</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -d</span><span style="color:#F1FA8C"> @same-request.json</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> jq</span></span></code></pre>
<p>Expected result:</p>
<ul>
<li>first request returns <code>202 Accepted</code></li>
<li>second request returns <code>200 OK</code></li>
<li>both refer to the same <code>operationID</code></li>
</ul>
<p>Try reusing the same <code>operationID</code> with a different payload:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">curl</span><span style="color:#BD93F9"> -s</span><span style="color:#BD93F9"> -X</span><span style="color:#F1FA8C"> POST</span><span style="color:#F1FA8C"> http://127.0.0.1:8080/api/v1/operator/stockpools</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -H</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">Content-Type: application/json</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -d</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">{</span></span>
<span class="line"><span style="color:#F1FA8C">    "operationID": "stock-g1-demo-001",</span></span>
<span class="line"><span style="color:#F1FA8C">    "name": "pool-g1-demo",</span></span>
<span class="line"><span style="color:#F1FA8C">    "namespace": "default",</span></span>
<span class="line"><span style="color:#F1FA8C">    "specName": "g2.1",</span></span>
<span class="line"><span style="color:#F1FA8C">    "replicas": 1</span></span>
<span class="line"><span style="color:#F1FA8C">  }</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> jq</span></span></code></pre>
<p>Expected result:</p>
<ul>
<li><code>409 Conflict</code></li>
</ul>
<p>Inspect the cluster objects:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">kubectl</span><span style="color:#F1FA8C"> get</span><span style="color:#F1FA8C"> stockpool</span><span style="color:#F1FA8C"> pool-g1-demo</span><span style="color:#BD93F9"> -n</span><span style="color:#F1FA8C"> default</span><span style="color:#BD93F9"> -o</span><span style="color:#F1FA8C"> yaml</span></span>
<span class="line"><span style="color:#50FA7B">kubectl</span><span style="color:#F1FA8C"> get</span><span style="color:#F1FA8C"> deployment</span><span style="color:#F1FA8C"> pool-pool-g1-demo</span><span style="color:#BD93F9"> -n</span><span style="color:#F1FA8C"> default</span></span>
<span class="line"><span style="color:#50FA7B">kubectl</span><span style="color:#F1FA8C"> get</span><span style="color:#F1FA8C"> service</span><span style="color:#F1FA8C"> pool-pool-g1-demo</span><span style="color:#BD93F9"> -n</span><span style="color:#F1FA8C"> default</span></span></code></pre>
<p>Useful fields to inspect:</p>
<ul>
<li><code>.metadata.annotations["runtime.lokiwager.io/operation-id"]</code></li>
<li><code>.status.phase</code></li>
<li><code>.status.serviceName</code></li>
<li><code>.status.conditions</code></li>
</ul>
<p>If a pod is crashing, inspect the failure message directly from the condition:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">kubectl</span><span style="color:#F1FA8C"> get</span><span style="color:#F1FA8C"> stockpool</span><span style="color:#F1FA8C"> pool-g1-demo</span><span style="color:#BD93F9"> -n</span><span style="color:#F1FA8C"> default</span><span style="color:#BD93F9"> -o</span><span style="color:#F1FA8C"> jsonpath=</span><span style="color:#E9F284">'</span><span style="color:#F1FA8C">{.status.conditions[?(@.type=="Ready")].message}</span><span style="color:#E9F284">'</span></span></code></pre>
<p>If you want to force a failure path, send an invalid memory quantity:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">curl</span><span style="color:#BD93F9"> -s</span><span style="color:#BD93F9"> -X</span><span style="color:#F1FA8C"> POST</span><span style="color:#F1FA8C"> http://127.0.0.1:8080/api/v1/operator/stockpools</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -H</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">Content-Type: application/json</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -d</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">{</span></span>
<span class="line"><span style="color:#F1FA8C">    "operationID": "stock-invalid-001",</span></span>
<span class="line"><span style="color:#F1FA8C">    "name": "pool-invalid",</span></span>
<span class="line"><span style="color:#F1FA8C">    "namespace": "default",</span></span>
<span class="line"><span style="color:#F1FA8C">    "specName": "g1.1",</span></span>
<span class="line"><span style="color:#F1FA8C">    "memory": "not-a-quantity",</span></span>
<span class="line"><span style="color:#F1FA8C">    "replicas": 1</span></span>
<span class="line"><span style="color:#F1FA8C">  }</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> jq</span></span></code></pre>
<p>That request should now fail fast at the API boundary instead of sneaking into reconciliation.</p>
<p>If a bad CR is created manually, the controller should mark it <code>Failed</code> with an <code>InvalidSpec</code> reason.</p>
<h2 id="summary">Summary</h2>
<p>Part 6 is where the Operator stops being merely correct in architecture and starts becoming trustworthy in behavior.</p>
<p>We now have:</p>
<ul>
<li>operation-level idempotency</li>
<li>deterministic write semantics under retry</li>
<li>a clearer split between write acceptance and runtime readiness</li>
<li>controller-owned <code>Service</code> reconciliation</li>
<li>explicit failure status and readiness conditions</li>
<li>pod startup failure messages surfaced into status</li>
<li>a first runtime template for command, args, envs, and ports</li>
<li>Swagger documentation published from the Echo server</li>
</ul>
<p>That is the right foundation for the next stage.</p>
<p>We can now start talking about storage and real runtime mounting without pretending the pod contract still lives in controller code.</p>
<h2 id="next-chapter-preview">Next Chapter Preview</h2>
<p>Part 7 is where we move from stock capacity to real user-facing GPU instances.</p>
<p>Right now, we only create stock. We do not yet create the actual GPU instance a user can access. That is the next step. Once we reach that point, the system starts to feel much closer to a real runtime product.</p>
<p>In the next chapter, we will implement:</p>
<ul>
<li>the flow that turns a stock unit into a real GPU instance</li>
<li>how users reach that GPU instance</li>
<li>GPU instance status reporting</li>
<li>the GPU instance deletion flow</li>
<li>the GPU instance update flow</li>
</ul>
<h2 id="repository">Repository</h2>
<p>Code for this chapter:</p>
<ul>
<li><a href="https://github.com/LokiWager/gpu-operator-runtime" rel="nofollow noopener noreferrer" target="_blank">gpu-operator-runtime</a></li>
</ul>`,l={title:"Building a GPU SaaS Platform - Useful Operator Contracts",publishDate:"14 March 2026",description:"Part 6: add operation idempotency, Swagger docs, clearer controller failure status, and the first runtime template.",tags:["GPU","SaaS","Kubernetes","Golang","Operator"],minutesRead:"11 min read"},r="/home/runner/work/lokiwager.github.io/lokiwager.github.io/src/content/post/building-gpu-service-6.md",i=void 0;function g(){return`
Part 5 gave us a real control loop:

- HTTP request
- \`StockPool\` custom resource
- controller reconcile
- \`Deployment\`

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
4. \`StockPool.spec\` contains the first real runtime template instead of a hardwired \`sleep 3600\`
5. the Echo API publishes Swagger documentation so the contract is visible without reading handler code

This is not yet a full GPU runtime. It is the point where the Operator starts behaving like software that can survive retries, support debugging, and grow into real workloads.

## The Real Problem We Were Hiding

Before this iteration, a write request could easily lie to the caller without meaning to.

Example:

1. the API accepts a create request
2. the async job reports success because the CR was created
3. the controller later fails to build the workload because \`memory\` is invalid
4. the caller only sees "job succeeded" unless they inspect controller logs or cluster events

That is a bad contract.

A production system does not need perfect abstractions on day one, but it does need honest ones.

So Part 6 tightens the contract in two directions at the same time:

- the write path becomes safer under retries
- the reconcile path becomes more observable when desired state is invalid or incomplete

All changes in this chapter are tightly related. If you only add idempotency but keep bad controller feedback, you still have a hard-to-debug system.
If you only improve controller status but keep a loose write contract, retries still create garbage. If you only add a runtime template without a
service, you still have no stable network boundary for the pod. So when you finish this chapter, stop and ask yourself: is this really enough? What problems are still unsolved? If we leave them alone now, will they become much more expensive later? Keeping that instinct alive is part of what makes software engineering interesting.

## Why \`operationID\` Matters

Distributed systems retry. That is normal.

Browsers retry. Gateways retry. SDKs retry. Humans retry.

If a \`POST\` request can create two \`StockPool\` objects because the caller did not receive the first response, the problem is not "the caller should be smarter". The problem is that the API contract is under-specified.

So the create request now requires an \`operationID\`:

\`\`\`go
type CreateStockPoolRequest struct {
    OperationID string \`json:"operationID"\`
    Name        string \`json:"name,omitempty"\`
    Namespace   string \`json:"namespace,omitempty"\`
    SpecName    string \`json:"specName"\`
    Image       string \`json:"image,omitempty"\`
    Memory      string \`json:"memory,omitempty"\`
    GPU         int32  \`json:"gpu,omitempty"\`
    Replicas    int32  \`json:"replicas"\`
    Template    runtimev1alpha1.StockPoolTemplate \`json:"template,omitempty"\`
}
\`\`\`

The service now does three things with that identifier:

- it normalizes and validates the request before queuing work
- it computes a request hash from the normalized payload
- it stores both \`operationID\` and request hash on the \`StockPool\` annotations

That gives us useful behavior:

- same \`operationID\` + same payload: return the same operation
- same \`operationID\` + different payload: reject with \`409 Conflict\`
- generated object names become deterministic when the caller does not provide one

That last point matters more than it sounds. Random names are convenient in demos. They are terrible for idempotency.

## Why Swagger Belongs Here

Once we switched the HTTP layer to \`echo\`, the control-plane API stopped being "just a few handlers".

At that point, the contract deserves to be visible:

- request body shape
- response shape
- status codes
- path parameters
- query parameters

That is why this chapter adds Swagger now instead of much later.

This is not about chasing tooling for its own sake. It is about reducing ambiguity while the API surface is still small enough to keep honest.

The practical result is simple:

- the server now exposes \`/swagger/index.html\`
- the docs are generated from handler annotations
- \`make swagger\` and \`make ci\` keep the checked-in spec reproducible

For a teaching project, this matters even more than usual. Readers should be able to inspect the API contract directly, not reverse-engineer it from \`curl\` examples and handler code.

## Tightening What A Job Means

The job now represents:

- "did the control plane accept this operation?"
- "did it persist the desired state as a \`StockPool\` resource?"

It does **not** mean:

- "the runtime is ready for user traffic"

That distinction is important.

The operation contract belongs to the write path.
Runtime readiness belongs to reconciliation status.

If you collapse those two ideas into one field too early, the API becomes confusing very quickly.

So the split is now:

- \`GET /api/v1/operator/jobs/:operationID\`: operation acceptance/persistence
- \`StockPool.status\`: reconcile progress, readiness, and failure details

That is a much cleaner boundary.

## The Controller Owns More Of The Lifecycle Now

In Part 5, the controller only created a \`Deployment\`.

That was enough to prove the architecture, but it was still thin:

- no stable service endpoint for a runtime pod
- no explicit failed phase
- no readable condition message for invalid desired state

Part 6 extends controller ownership in two practical ways.

### 1. Reconcile the \`Service\`, not just the \`Deployment\`

If the runtime template exposes ports, the controller now creates a matching \`ClusterIP\` \`Service\`.

That is the first step toward a real runtime boundary:

- pods can restart and be replaced
- the service name stays stable
- later chapters can attach access policy, probes, ingress, or sidecar communication to a stable endpoint

This is why the service belongs in the controller instead of being created ad hoc somewhere in the API layer.

The controller owns workload lifecycle. A service is part of that lifecycle.

### 2. Report explicit failure and readiness conditions

The \`StockPool\` status now includes:

- \`phase\`
- \`serviceName\`
- \`conditions\`
- \`observedGeneration\`
- \`lastSyncTime\`

And the controller sets a \`Ready\` condition with reasons such as:

- \`DeploymentProgressing\`
- \`DeploymentReady\`
- \`ScaledToZero\`
- \`InvalidSpec\`
- \`PodStartupFailed\`
- \`PodStatusSyncFailed\`
- \`ServiceSyncFailed\`
- \`DeploymentSyncFailed\`

That means invalid desired state is no longer just a log line.

If \`memory: "not-a-quantity"\` is sent, the controller marks the resource as \`Failed\` with an \`InvalidSpec\` reason instead of endlessly returning a parse error and hoping someone notices.

That is a very production-shaped change. Operators should explain failure in resource status whenever they can.

This chapter also goes one step further: when the deployment exists but a runtime pod is failing to start, the controller inspects the owned pods and copies the most useful failure message into the \`Ready\` condition.

So instead of only seeing:

- \`phase: Failed\`

you can now get something much closer to the real problem, for example:

- image pull failures
- crash loop messages
- the last terminated container message when startup logic fails

That is the difference between "status exists" and "status helps you debug production".

## Preparing For Real Runtime Pods

The old pod template was intentionally primitive:

\`\`\`go
Command: []string{"sh", "-c", "sleep 3600"}
\`\`\`

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

\`\`\`go
type StockPoolTemplate struct {
    Command []string          \`json:"command,omitempty"\`
    Args    []string          \`json:"args,omitempty"\`
    Envs    []StockPoolEnvVar \`json:"envs,omitempty"\`
    Ports   []StockPoolPortSpec \`json:"ports,omitempty"\`
}
\`\`\`

That does not mean we are done. It means we now have the right place to put runtime concerns.

The controller still falls back to the placeholder sleep command when no template command or args are provided. That is intentional. We are not pretending to have a finished runtime image contract yet.

What changed is the direction of the architecture:

- workload shape is now part of desired state
- the controller translates that shape into container config and service ports
- later chapters can extend the template instead of rewriting the control flow again

## Flow After Part 6

\`\`\`plaintext
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
\`\`\`

## Code Walkthrough

### Request validation moved before the queue

This is the right time to reject:

- missing \`operationID\`
- invalid \`memory\`
- negative replica or GPU values
- invalid or duplicate template env/port definitions

If the request is clearly wrong, the system should say so immediately. There is no value in accepting garbage, writing a CR, and forcing the
controller to discover the mistake later.

### Idempotency is anchored in Kubernetes state

The request hash is stored on the \`StockPool\` annotations, not only in an in-memory map.

That matters because the in-memory job store is only a convenience for this single-process stage. The custom resource is the durable system record.

This is one of the subtle lessons in production work:

- process memory is operationally useful
- Kubernetes objects are the contract boundary

### Status is now for humans, not just code

The controller uses \`phase\` and \`conditions\` together.

That is deliberate:

- \`phase\` is good for quick scanning
- \`conditions\` are good for precise diagnosis

This is why many mature Kubernetes APIs use both a compact summary and condition detail.

## Run And Verify

Run the code:

\`\`\`bash
cd /Users/haotingyi/Documents/workspaces/loki/gpu-operator-runtime
make ci
make run
\`\`\`

Before you test a request with \`"gpu": 1\`, make sure the cluster already exposes \`nvidia.com/gpu\`.

For most readers, that means installing NVIDIA GPU Operator first. A manually prepared cluster also works, but only if the NVIDIA drivers, runtime integration, and device plugin are already in place.

If the cluster does not expose \`nvidia.com/gpu\`, keep the tutorial request at \`gpu: 0\` while you work on the API and controller flow.

Open the API docs:

\`\`\`bash
open http://127.0.0.1:8080/swagger/index.html
\`\`\`

Create a stock pool with a real runtime template:

\`\`\`bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stockpools \\
  -H 'Content-Type: application/json' \\
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
\`\`\`

Send the same request again:

\`\`\`bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stockpools \\
  -H 'Content-Type: application/json' \\
  -d @same-request.json | jq
\`\`\`

Expected result:

- first request returns \`202 Accepted\`
- second request returns \`200 OK\`
- both refer to the same \`operationID\`

Try reusing the same \`operationID\` with a different payload:

\`\`\`bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stockpools \\
  -H 'Content-Type: application/json' \\
  -d '{
    "operationID": "stock-g1-demo-001",
    "name": "pool-g1-demo",
    "namespace": "default",
    "specName": "g2.1",
    "replicas": 1
  }' | jq
\`\`\`

Expected result:

- \`409 Conflict\`

Inspect the cluster objects:

\`\`\`bash
kubectl get stockpool pool-g1-demo -n default -o yaml
kubectl get deployment pool-pool-g1-demo -n default
kubectl get service pool-pool-g1-demo -n default
\`\`\`

Useful fields to inspect:

- \`.metadata.annotations["runtime.lokiwager.io/operation-id"]\`
- \`.status.phase\`
- \`.status.serviceName\`
- \`.status.conditions\`

If a pod is crashing, inspect the failure message directly from the condition:

\`\`\`bash
kubectl get stockpool pool-g1-demo -n default -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}'
\`\`\`

If you want to force a failure path, send an invalid memory quantity:

\`\`\`bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stockpools \\
  -H 'Content-Type: application/json' \\
  -d '{
    "operationID": "stock-invalid-001",
    "name": "pool-invalid",
    "namespace": "default",
    "specName": "g1.1",
    "memory": "not-a-quantity",
    "replicas": 1
  }' | jq
\`\`\`

That request should now fail fast at the API boundary instead of sneaking into reconciliation.

If a bad CR is created manually, the controller should mark it \`Failed\` with an \`InvalidSpec\` reason.

## Summary

Part 6 is where the Operator stops being merely correct in architecture and starts becoming trustworthy in behavior.

We now have:

- operation-level idempotency
- deterministic write semantics under retry
- a clearer split between write acceptance and runtime readiness
- controller-owned \`Service\` reconciliation
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
`}function F(){return n}function w(){return[{depth:2,slug:"chapter-goal",text:"Chapter Goal"},{depth:2,slug:"the-real-problem-we-were-hiding",text:"The Real Problem We Were Hiding"},{depth:2,slug:"why-operationid-matters",text:"Why operationID Matters"},{depth:2,slug:"why-swagger-belongs-here",text:"Why Swagger Belongs Here"},{depth:2,slug:"tightening-what-a-job-means",text:"Tightening What A Job Means"},{depth:2,slug:"the-controller-owns-more-of-the-lifecycle-now",text:"The Controller Owns More Of The Lifecycle Now"},{depth:3,slug:"1-reconcile-the-service-not-just-the-deployment",text:"1. Reconcile the Service, not just the Deployment"},{depth:3,slug:"2-report-explicit-failure-and-readiness-conditions",text:"2. Report explicit failure and readiness conditions"},{depth:2,slug:"preparing-for-real-runtime-pods",text:"Preparing For Real Runtime Pods"},{depth:2,slug:"flow-after-part-6",text:"Flow After Part 6"},{depth:2,slug:"code-walkthrough",text:"Code Walkthrough"},{depth:3,slug:"request-validation-moved-before-the-queue",text:"Request validation moved before the queue"},{depth:3,slug:"idempotency-is-anchored-in-kubernetes-state",text:"Idempotency is anchored in Kubernetes state"},{depth:3,slug:"status-is-now-for-humans-not-just-code",text:"Status is now for humans, not just code"},{depth:2,slug:"run-and-verify",text:"Run And Verify"},{depth:2,slug:"summary",text:"Summary"},{depth:2,slug:"next-chapter-preview",text:"Next Chapter Preview"},{depth:2,slug:"repository",text:"Repository"}]}const f=s((p,c,d)=>{const{layout:h,...e}=l;return e.file=r,e.url=i,t`${a()}${o(n)}`});export{f as Content,F as compiledContent,f as default,r as file,l as frontmatter,w as getHeadings,g as rawContent,i as url};
