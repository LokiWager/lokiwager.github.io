import{c as s,r as t,m as o}from"./render-template.2--iflDr.js";import{u as a}from"./hoisted.AA_i54vz.js";import"./astro/assets-service.wdzbVTWi.js";const n=`<p>Part 4 gave us a service-shaped project.</p>
<p>Part 5 is where it starts acting like a Kubernetes system instead of a well-organized mock.</p>
<p>The high-level change is simple:</p>
<ul>
<li>the HTTP server still accepts control-plane requests</li>
<li>but it no longer tries to act as the source of truth</li>
<li>instead, it creates a <code>StockPool</code> custom resource</li>
<li>the controller reconciles that resource into a <code>Deployment</code></li>
</ul>
<p>That is the first real control loop in the project.</p>
<h2 id="what-we-are-doing-in-this-chapter">What We Are Doing In This Chapter</h2>
<p>This chapter does six concrete things:</p>
<ol>
<li>refactor the project onto a standard <code>kubebuilder</code> layout</li>
<li>switch the HTTP layer from raw <code>net/http</code> to <code>echo</code></li>
<li>define the <code>StockPool</code> CRD</li>
<li>implement <code>StockPoolReconciler</code> so a CR becomes a <code>Deployment</code></li>
<li>generate RBAC and CRD manifests instead of hand-maintaining them</li>
<li>add unit tests for the API flow and reconcile flow</li>
</ol>
<p>That gives us a believable baseline without pretending we already finished the whole runtime.</p>
<h2 id="a-few-ground-rules-before-we-start">A Few Ground Rules Before We Start</h2>
<p>There are a few design choices in this chapter that are intentional, even if they are not final.</p>
<p>First, the HTTP server and the Kubernetes operator live in the same binary for now. That is a temporary trade-off, not a philosophical commitment. Long term, splitting them usually makes maintenance, failover, and ownership boundaries cleaner. But for this stage of the project, a single process keeps the lifecycle simple and makes the control flow easier to teach:</p>
<p><code>request -> custom resource -> reconcile -> workload</code></p>
<p>Second, some of the earlier “stock” ideas still show up in the broader series because this is an iterative project, not a fake greenfield rewrite every week. Stock-style reservation can simplify certain scheduling conversations, but it is not the final answer. Later in the series we will talk about better approaches and why they matter.</p>
<p>Third, this chapter uses <code>echo</code> instead of raw <code>net/http</code>. That is not because Go lacks framework choices. It definitely does not. You could reasonably pick <code>Gin</code>, <code>Fiber</code>, or something else. I picked <code>echo</code> for boring, practical reasons:</p>
<ul>
<li>it is easy to read and easy to wire</li>
<li>it has solid documentation and a mature community</li>
<li>its HTTP behavior is configurable enough for real services</li>
<li>it stays lightweight for a control-plane service that should not become the main throughput bottleneck anyway</li>
</ul>
<p>If the control plane ever becomes a hot path, you usually have a traffic-shaping problem before you have an HTTP framework problem.</p>
<h2 id="what-is-an-operator">What Is An Operator?</h2>
<p>An operator is just application-specific control logic built on top of the Kubernetes reconciliation model.</p>
<ul>
<li>users declare desired state</li>
<li>Kubernetes stores that desired state</li>
<li>a controller watches for changes</li>
<li>the controller keeps nudging the cluster toward the declared state</li>
</ul>
<p>That last bit matters. The controller is not just handling a one-shot request. It is continuously correcting drift.</p>
<p>For a GPU SaaS platform, that is exactly the model we want. Users ask for capacity. The system records the request. Controllers make the workloads exist and keep them healthy.</p>
<h2 id="what-is-a-crd">What Is A CRD?</h2>
<p>A CRD, or CustomResourceDefinition, is how you teach Kubernetes a new API type.</p>
<p>Without a CRD, <code>StockPool</code> is just a Go struct and some wishful thinking.</p>
<p>With a CRD:</p>
<ul>
<li>Kubernetes knows the resource exists</li>
<li>the API server can store it</li>
<li>clients can query it</li>
<li>controllers can watch it</li>
</ul>
<p>That is why this chapter is a real milestone. We are moving from “service logic that happens to know about Kubernetes” to “Kubernetes-native desired state with a dedicated API contract.”</p>
<h2 id="why-we-switched-to-kubebuilder">Why We Switched To Kubebuilder</h2>
<p>The previous hand-wired operator code was fine as a sketch. It was not fine as the foundation of a teaching project that is supposed to model production habits.</p>
<p>Once CRDs, controllers, RBAC, generated manifests, and manager wiring enter the picture, hand-rolling everything quickly becomes a maintenance tax.</p>
<p>Could we have picked <code>operator-sdk</code> instead? Sure. <code>kubebuilder</code> is not the only valid option. I picked it partly out of preference, and partly because the documentation is deep enough that when something goes sideways, you have a decent chance of finding the answer without sacrificing a weekend to archaeology.</p>
<p>So this iteration makes a clear move:</p>
<ul>
<li>use the standard <code>kubebuilder</code> project layout</li>
<li>generate CRD and RBAC artifacts</li>
<li>keep one binary and one control-plane entrypoint for now</li>
</ul>
<p>That gives readers a structure they are likely to see again in real controller repositories.</p>
<h2 id="architecture-in-this-iteration">Architecture In This Iteration</h2>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>+--------------------------------------------------------------+</span></span>
<span class="line"><span>| cmd/main.go                                                  |</span></span>
<span class="line"><span>| one process: HTTP server + controller manager + background   |</span></span>
<span class="line"><span>| jobs                                                         |</span></span>
<span class="line"><span>+-----------------------------+--------------------------------+</span></span>
<span class="line"><span>                              |</span></span>
<span class="line"><span>                              v</span></span>
<span class="line"><span>                 +------------+-------------+</span></span>
<span class="line"><span>                 | Echo HTTP API            |</span></span>
<span class="line"><span>                 | POST /operator/stockpools|</span></span>
<span class="line"><span>                 +------------+-------------+</span></span>
<span class="line"><span>                              |</span></span>
<span class="line"><span>                              v</span></span>
<span class="line"><span>                 +------------+-------------+</span></span>
<span class="line"><span>                 | service layer            |</span></span>
<span class="line"><span>                 | create async job         |</span></span>
<span class="line"><span>                 | create StockPool CR      |</span></span>
<span class="line"><span>                 +------------+-------------+</span></span>
<span class="line"><span>                              |</span></span>
<span class="line"><span>                              v</span></span>
<span class="line"><span>                 +------------+-------------+</span></span>
<span class="line"><span>                 | StockPool CR             |</span></span>
<span class="line"><span>                 | runtime.lokiwager.io     |</span></span>
<span class="line"><span>                 +------------+-------------+</span></span>
<span class="line"><span>                              |</span></span>
<span class="line"><span>                              v</span></span>
<span class="line"><span>                 +------------+-------------+</span></span>
<span class="line"><span>                 | StockPoolReconciler      |</span></span>
<span class="line"><span>                 | ensure Deployment        |</span></span>
<span class="line"><span>                 | update status            |</span></span>
<span class="line"><span>                 +------------+-------------+</span></span>
<span class="line"><span>                              |</span></span>
<span class="line"><span>                              v</span></span>
<span class="line"><span>                 +------------+-------------+</span></span>
<span class="line"><span>                 | Deployment               |</span></span>
<span class="line"><span>                 | placeholder runtime pods |</span></span>
<span class="line"><span>                 +--------------------------+</span></span></code></pre>
<p>Notice what changed from Part 4:</p>
<ul>
<li>the API is no longer the source of truth</li>
<li>the custom resource is the source of truth</li>
<li>reconcile owns the drift-correction path</li>
</ul>
<p>That mental model is more important than any individual code snippet in this chapter.</p>
<h2 id="step-1-replace-the-hand-wired-layout-with-kubebuilder">Step 1: Replace The Hand-Wired Layout With Kubebuilder</h2>
<p>The first major change is structural.</p>
<p>We move from a homegrown operator layout to the standard shape most Kubernetes engineers expect:</p>
<ul>
<li><code>PROJECT</code></li>
<li><code>api/v1alpha1</code></li>
<li><code>internal/controller</code></li>
<li><code>config/crd</code></li>
<li><code>config/rbac</code></li>
<li><code>config/default</code></li>
</ul>
<p>Why do this now?</p>
<p>Because teaching real engineering practice means teaching the boring defaults too, not just the fun parts.</p>
<p><code>kubebuilder</code> buys us a few things immediately:</p>
<ul>
<li>predictable file layout</li>
<li>generated deepcopy methods</li>
<li>CRD generation from Go markers</li>
<li>RBAC generation from controller markers</li>
<li>easier onboarding for anyone who has seen a controller repo before</li>
</ul>
<p>This is not glamorous, but it is the kind of decision that saves your future self from becoming unpaid support for your own clever shortcuts.</p>
<h2 id="step-2-define-a-small-but-honest-api-type">Step 2: Define A Small But Honest API Type</h2>
<p>The <code>StockPool</code> API lives in <a href="https://github.com/LokiWager/gpu-operator-runtime" rel="nofollow, noopener, noreferrer" target="_blank"><code>api/v1alpha1/stockpool_types.go</code></a>.</p>
<p>Core fields now look like this:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">type</span><span style="color:#8BE9FD;font-style:italic"> StockPoolSpec</span><span style="color:#FF79C6"> struct</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">    SpecName </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"specName"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Image    </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"image,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Memory   </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"memory,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    GPU      </span><span style="color:#8BE9FD;font-style:italic">int32</span><span style="color:#E9F284">  \`</span><span style="color:#F1FA8C">json:"gpu,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Replicas </span><span style="color:#8BE9FD;font-style:italic">int32</span><span style="color:#E9F284">  \`</span><span style="color:#F1FA8C">json:"replicas"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span>
<span class="line"></span>
<span class="line"><span style="color:#FF79C6">type</span><span style="color:#8BE9FD;font-style:italic"> StockPoolStatus</span><span style="color:#FF79C6"> struct</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">    Available          </span><span style="color:#8BE9FD;font-style:italic">int32</span><span style="color:#E9F284">       \`</span><span style="color:#F1FA8C">json:"available,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Allocated          </span><span style="color:#8BE9FD;font-style:italic">int32</span><span style="color:#E9F284">       \`</span><span style="color:#F1FA8C">json:"allocated,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Phase              </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284">      \`</span><span style="color:#F1FA8C">json:"phase,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    ObservedGeneration </span><span style="color:#8BE9FD;font-style:italic">int64</span><span style="color:#E9F284">       \`</span><span style="color:#F1FA8C">json:"observedGeneration,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    LastSyncTime       </span><span style="color:#8BE9FD;font-style:italic">metav1</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Time</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"lastSyncTime,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>Why this shape?</p>
<p><code>SpecName</code> stays because users still need a concrete runtime flavor such as <code>g1.1</code>.</p>
<p><code>Replicas</code> is still the smallest useful desired-state signal.</p>
<p><code>Image</code>, <code>Memory</code>, and <code>GPU</code> are where the API starts to feel less toy-like. Once those fields exist in the spec, readers can see a real path from control-plane input to pod template output.</p>
<p><code>Status</code> gives users immediate feedback without forcing them to reverse-engineer controller logs every time something is still converging.</p>
<p>We also add kubebuilder markers so the CRD can be generated from the type:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#6272A4">// +kubebuilder:subresource:status</span></span>
<span class="line"><span style="color:#6272A4">// +kubebuilder:printcolumn:name="Spec",type=string,JSONPath=\`.spec.specName\`</span></span>
<span class="line"><span style="color:#6272A4">// +kubebuilder:printcolumn:name="Desired",type=integer,JSONPath=\`.spec.replicas\`</span></span>
<span class="line"><span style="color:#6272A4">// +kubebuilder:printcolumn:name="Available",type=integer,JSONPath=\`.status.available\`</span></span></code></pre>
<p>That means the CRD definition comes from the Go contract instead of a hand-maintained YAML file quietly drifting off the map.</p>
<h2 id="step-3-keep-one-entry-point">Step 3: Keep One Entry Point</h2>
<p>The unified entrypoint is <a href="https://github.com/LokiWager/gpu-operator-runtime" rel="nofollow, noopener, noreferrer" target="_blank"><code>cmd/main.go</code></a>.</p>
<p>This file now does three jobs:</p>
<ul>
<li>build the controller manager</li>
<li>register the reconciler</li>
<li>attach non-leader background runnables such as the HTTP server and the job worker</li>
</ul>
<p>Manager setup:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#F8F8F2">mgr, err </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> ctrl.</span><span style="color:#50FA7B">NewManager</span><span style="color:#F8F8F2">(restConfig, </span><span style="color:#8BE9FD;font-style:italic">ctrl</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Options</span><span style="color:#F8F8F2">{</span></span>
<span class="line"><span style="color:#F8F8F2">    Scheme: scheme,</span></span>
<span class="line"><span style="color:#F8F8F2">    Metrics: </span><span style="color:#8BE9FD;font-style:italic">metricsserver</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Options</span><span style="color:#F8F8F2">{</span></span>
<span class="line"><span style="color:#F8F8F2">        BindAddress:   metricsAddr,</span></span>
<span class="line"><span style="color:#F8F8F2">        SecureServing: secureMetrics,</span></span>
<span class="line"><span style="color:#F8F8F2">        TLSOpts:       tlsOpts,</span></span>
<span class="line"><span style="color:#F8F8F2">    },</span></span>
<span class="line"><span style="color:#F8F8F2">    HealthProbeBindAddress: probeAddr,</span></span>
<span class="line"><span style="color:#F8F8F2">    LeaderElection:         enableLeaderElection,</span></span>
<span class="line"><span style="color:#F8F8F2">    LeaderElectionID:       </span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">9d4c4758.lokiwager.io</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">,</span></span>
<span class="line"><span style="color:#F8F8F2">})</span></span></code></pre>
<p>Then we attach the API server to the manager lifecycle:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">if</span><span style="color:#F8F8F2"> err </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> mgr.</span><span style="color:#50FA7B">Add</span><span style="color:#F8F8F2">(</span><span style="color:#8BE9FD;font-style:italic">nonLeaderRunnable</span><span style="color:#F8F8F2">{run: </span><span style="color:#FF79C6">func</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">ctx</span><span style="color:#8BE9FD;font-style:italic"> context</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Context</span><span style="color:#F8F8F2">) </span><span style="color:#8BE9FD;font-style:italic">error</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#FF79C6">    return</span><span style="color:#50FA7B"> startHTTPServer</span><span style="color:#F8F8F2">(ctx, httpServer)</span></span>
<span class="line"><span style="color:#F8F8F2">}}); err </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">    os.</span><span style="color:#50FA7B">Exit</span><span style="color:#F8F8F2">(</span><span style="color:#BD93F9">1</span><span style="color:#F8F8F2">)</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>That is cleaner than building a second bootstrap world outside the manager and then trying to keep shutdown behavior consistent by brute force.</p>
<p>One more practical change landed in this iteration: the deployment manifest now declares the API port and exposes it through a dedicated Service:</p>
<ul>
<li><code>config/manager/manager.yaml</code> declares <code>--http-addr=:8080</code> and the container port</li>
<li><code>config/default/api_service.yaml</code> exposes the HTTP API inside the cluster</li>
</ul>
<p>That is the kind of detail teams forget surprisingly often when the binary grows from “just a controller” into “controller plus API.”</p>
<h2 id="step-4-switch-the-api-layer-to-echo">Step 4: Switch The API Layer To Echo</h2>
<p>The HTTP layer in <a href="https://github.com/LokiWager/gpu-operator-runtime" rel="nofollow, noopener, noreferrer" target="_blank"><code>pkg/api/server.go</code></a> now uses <code>echo</code> instead of raw <code>net/http</code>.</p>
<p>Current endpoints:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>GET  /api/v1/health</span></span>
<span class="line"><span>GET  /api/v1/operator/stockpools</span></span>
<span class="line"><span>POST /api/v1/operator/stockpools</span></span>
<span class="line"><span>GET  /api/v1/operator/jobs/{jobID}</span></span></code></pre>
<p>The service layer in <a href="https://github.com/LokiWager/gpu-operator-runtime" rel="nofollow, noopener, noreferrer" target="_blank"><code>pkg/service/service.go</code></a> owns the actual flow.</p>
<p>Request DTO:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">type</span><span style="color:#8BE9FD;font-style:italic"> CreateStockPoolRequest</span><span style="color:#FF79C6"> struct</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">    Name      </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"name,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Namespace </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"namespace,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    SpecName  </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"specName"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Image     </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"image,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Memory    </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#E9F284"> \`</span><span style="color:#F1FA8C">json:"memory,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    GPU       </span><span style="color:#8BE9FD;font-style:italic">int32</span><span style="color:#E9F284">  \`</span><span style="color:#F1FA8C">json:"gpu,omitempty"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">    Replicas  </span><span style="color:#8BE9FD;font-style:italic">int32</span><span style="color:#E9F284">  \`</span><span style="color:#F1FA8C">json:"replicas"</span><span style="color:#E9F284">\`</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>Async create path:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#F8F8F2"> (</span><span style="color:#FFB86C;font-style:italic">s </span><span style="color:#FF79C6">*</span><span style="color:#8BE9FD;font-style:italic">Service</span><span style="color:#F8F8F2">) </span><span style="color:#50FA7B">CreateStockPoolAsync</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">ctx</span><span style="color:#8BE9FD;font-style:italic"> context</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Context</span><span style="color:#F8F8F2">, </span><span style="color:#FFB86C;font-style:italic">req</span><span style="color:#8BE9FD;font-style:italic"> CreateStockPoolRequest</span><span style="color:#F8F8F2">) (</span><span style="color:#8BE9FD;font-style:italic">domain</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">OperatorJob</span><span style="color:#F8F8F2">, </span><span style="color:#8BE9FD;font-style:italic">error</span><span style="color:#F8F8F2">) {</span></span>
<span class="line"><span style="color:#FF79C6">    ...</span></span>
<span class="line"><span style="color:#F8F8F2">    s.jobQueue </span><span style="color:#FF79C6">&#x3C;-</span><span style="color:#8BE9FD;font-style:italic"> createStockPoolJob</span><span style="color:#F8F8F2">{jobID: jobID, req: req}</span></span>
<span class="line"><span style="color:#FF79C6">    return</span><span style="color:#F8F8F2"> job, </span><span style="color:#BD93F9">nil</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>Worker:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#F8F8F2"> (</span><span style="color:#FFB86C;font-style:italic">s </span><span style="color:#FF79C6">*</span><span style="color:#8BE9FD;font-style:italic">Service</span><span style="color:#F8F8F2">) </span><span style="color:#50FA7B">StartOperatorJobWorker</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">ctx</span><span style="color:#8BE9FD;font-style:italic"> context</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Context</span><span style="color:#F8F8F2">) {</span></span>
<span class="line"><span style="color:#FF79C6">    for</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#FF79C6">        select</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#FF79C6">        case</span><span style="color:#FF79C6"> &#x3C;-</span><span style="color:#F8F8F2">ctx.</span><span style="color:#50FA7B">Done</span><span style="color:#F8F8F2">():</span></span>
<span class="line"><span style="color:#FF79C6">            return</span></span>
<span class="line"><span style="color:#FF79C6">        case</span><span style="color:#F8F8F2"> job </span><span style="color:#FF79C6">:=</span><span style="color:#FF79C6"> &#x3C;-</span><span style="color:#F8F8F2">s.jobQueue:</span></span>
<span class="line"><span style="color:#F8F8F2">            s.</span><span style="color:#50FA7B">setJobRunning</span><span style="color:#F8F8F2">(job.jobID)</span></span>
<span class="line"><span style="color:#FF79C6">            if</span><span style="color:#F8F8F2"> err </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> s.</span><span style="color:#50FA7B">createStockPoolObject</span><span style="color:#F8F8F2">(ctx, job.req); err </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">                s.</span><span style="color:#50FA7B">setJobFailed</span><span style="color:#F8F8F2">(job.jobID, err)</span></span>
<span class="line"><span style="color:#FF79C6">                continue</span></span>
<span class="line"><span style="color:#F8F8F2">            }</span></span>
<span class="line"><span style="color:#F8F8F2">            s.</span><span style="color:#50FA7B">setJobSucceeded</span><span style="color:#F8F8F2">(job.jobID, job.req)</span></span>
<span class="line"><span style="color:#F8F8F2">        }</span></span>
<span class="line"><span style="color:#F8F8F2">    }</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>This is the key boundary in the current design:</p>
<p><code>HTTP request -> async job -> CR creation -> reconcile</code></p>
<p>We are no longer storing pretend runtime state in memory and calling that progress. The API hands desired state to Kubernetes. That is the right shape for the control plane we are trying to build.</p>
<h2 id="step-5-reconcile-to-a-deployment">Step 5: Reconcile To A Deployment</h2>
<p>The reconciler lives in <a href="https://github.com/LokiWager/gpu-operator-runtime" rel="nofollow, noopener, noreferrer" target="_blank"><code>internal/controller/stockpool_controller.go</code></a>.</p>
<p>This is the first chapter where reconcile performs a real side effect:</p>
<ul>
<li>load <code>StockPool</code></li>
<li>ensure a <code>Deployment</code> exists</li>
<li>update <code>Deployment.spec.replicas</code></li>
<li>map <code>image</code>, <code>memory</code>, and <code>gpu</code> into the pod template</li>
<li>compute and write <code>StockPool.status</code></li>
</ul>
<p>The creation path looks like this:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#F8F8F2">newDep, err </span><span style="color:#FF79C6">:=</span><span style="color:#50FA7B"> desiredDeployment</span><span style="color:#F8F8F2">(pool, desired)</span></span>
<span class="line"><span style="color:#FF79C6">if</span><span style="color:#F8F8F2"> err </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> controllerutil.</span><span style="color:#50FA7B">SetControllerReference</span><span style="color:#F8F8F2">(</span><span style="color:#FF79C6">&#x26;</span><span style="color:#F8F8F2">pool, newDep, r.Scheme); err </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#FF79C6">    return</span><span style="color:#8BE9FD;font-style:italic"> ctrl</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Result</span><span style="color:#F8F8F2">{}, err</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span>
<span class="line"><span style="color:#FF79C6">if</span><span style="color:#F8F8F2"> err </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> r.</span><span style="color:#50FA7B">Create</span><span style="color:#F8F8F2">(ctx, newDep); err </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#FF79C6">    return</span><span style="color:#8BE9FD;font-style:italic"> ctrl</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Result</span><span style="color:#F8F8F2">{}, err</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>And the status path still reflects observed state, not wishful thinking:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#F8F8F2">next </span><span style="color:#FF79C6">:=</span><span style="color:#8BE9FD;font-style:italic"> runtimev1alpha1</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">StockPoolStatus</span><span style="color:#F8F8F2">{</span></span>
<span class="line"><span style="color:#F8F8F2">    Available:          dep.Status.AvailableReplicas,</span></span>
<span class="line"><span style="color:#F8F8F2">    Allocated:          </span><span style="color:#50FA7B">maxInt32</span><span style="color:#F8F8F2">(desired</span><span style="color:#FF79C6">-</span><span style="color:#F8F8F2">dep.Status.AvailableReplicas, </span><span style="color:#BD93F9">0</span><span style="color:#F8F8F2">),</span></span>
<span class="line"><span style="color:#F8F8F2">    ObservedGeneration: pool.Generation,</span></span>
<span class="line"><span style="color:#F8F8F2">    LastSyncTime:       metav1.</span><span style="color:#50FA7B">NewTime</span><span style="color:#F8F8F2">(time.</span><span style="color:#50FA7B">Now</span><span style="color:#F8F8F2">().</span><span style="color:#50FA7B">UTC</span><span style="color:#F8F8F2">()),</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>The new resource mapping logic is especially worth noticing. <code>memory</code> is parsed into Kubernetes resource quantities, and <code>gpu</code> is wired to <code>nvidia.com/gpu</code> requests and limits. That means the reader can now see a clean line from API payload to CR spec to pod resources.</p>
<p>The deployment still uses a placeholder container image by default if one is not provided. That is fine. The point here is control flow, not pretending we have already built the final GPU runtime.</p>
<h2 id="step-6-let-rbac-and-crd-manifests-be-generated">Step 6: Let RBAC And CRD Manifests Be Generated</h2>
<p>The repo now uses generated output under <code>config/</code>.</p>
<p>That includes:</p>
<ul>
<li><code>config/crd/bases/runtime.lokiwager.io_stockpools.yaml</code></li>
<li><code>config/rbac/role.yaml</code></li>
<li><code>config/samples/runtime_v1alpha1_stockpool.yaml</code></li>
</ul>
<p>And the <code>Makefile</code> includes:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">make</span><span style="color:#F1FA8C"> manifests</span><span style="color:#F1FA8C"> generate</span></span></code></pre>
<p>This is one of those habits that pays off quietly. When manifests are derived from types and markers, the diff usually tells a coherent story. When they are maintained by hand, the diff often tells you someone forgot something on a random Friday and hoped nobody would notice.</p>
<h2 id="step-7-keep-tests-small-and-direct">Step 7: Keep Tests Small And Direct</h2>
<p>We keep tests practical in this chapter.</p>
<p>Controller test:</p>
<ul>
<li><a href="https://github.com/LokiWager/gpu-operator-runtime" rel="nofollow, noopener, noreferrer" target="_blank"><code>internal/controller/stockpool_controller_test.go</code></a></li>
</ul>
<p>Service tests:</p>
<ul>
<li><a href="https://github.com/LokiWager/gpu-operator-runtime" rel="nofollow, noopener, noreferrer" target="_blank"><code>pkg/service/service_operator_test.go</code></a></li>
<li><a href="https://github.com/LokiWager/gpu-operator-runtime" rel="nofollow, noopener, noreferrer" target="_blank"><code>pkg/service/service_test.go</code></a></li>
</ul>
<p>API test:</p>
<ul>
<li><a href="https://github.com/LokiWager/gpu-operator-runtime" rel="nofollow, noopener, noreferrer" target="_blank"><code>pkg/api/server_test.go</code></a></li>
</ul>
<p>The controller test now checks more than “did status change?” It also verifies that the reconciled deployment carries the expected image, memory limit, and GPU limit.</p>
<p>The service test verifies that the async job worker eventually creates the <code>StockPool</code> CR with the requested runtime fields.</p>
<p>That is enough coverage for this iteration because the main risk lives in glue code and state transitions.</p>
<p>We still have not introduced <code>envtest</code> here, and that is deliberate. This chapter already carries a major conceptual jump: <code>kubebuilder</code>, real reconciliation, and real workload generation. Throwing every testing strategy into the same chapter would make it louder, not better.</p>
<h2 id="how-to-run-this-version">How To Run This Version</h2>
<p>In the code repo:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">make</span><span style="color:#F1FA8C"> manifests</span><span style="color:#F1FA8C"> generate</span></span>
<span class="line"><span style="color:#50FA7B">kubectl</span><span style="color:#F1FA8C"> apply</span><span style="color:#BD93F9"> -f</span><span style="color:#F1FA8C"> config/crd/bases/runtime.lokiwager.io_stockpools.yaml</span></span>
<span class="line"><span style="color:#50FA7B">make</span><span style="color:#F1FA8C"> run</span></span></code></pre>
<p>Create a pool:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">curl</span><span style="color:#BD93F9"> -s</span><span style="color:#BD93F9"> -X</span><span style="color:#F1FA8C"> POST</span><span style="color:#F1FA8C"> http://127.0.0.1:8080/api/v1/operator/stockpools</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -H</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">Content-Type: application/json</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> \\</span></span>
<span class="line"><span style="color:#BD93F9">  -d</span><span style="color:#E9F284"> '</span><span style="color:#F1FA8C">{"name":"pool-g1","namespace":"default","specName":"g1.1","image":"nginx:1.27","memory":"16Gi","gpu":1,"replicas":2}</span><span style="color:#E9F284">'</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> jq</span></span></code></pre>
<p>Then verify:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">kubectl</span><span style="color:#F1FA8C"> get</span><span style="color:#F1FA8C"> stockpools.runtime.lokiwager.io</span><span style="color:#F1FA8C"> pool-g1</span><span style="color:#BD93F9"> -o</span><span style="color:#F1FA8C"> yaml</span></span>
<span class="line"><span style="color:#50FA7B">kubectl</span><span style="color:#F1FA8C"> get</span><span style="color:#F1FA8C"> deployment</span><span style="color:#BD93F9"> -n</span><span style="color:#F1FA8C"> default</span></span></code></pre>
<p>If you deploy this through the generated manifests instead of <code>make run</code>, the in-cluster API is exposed on port <code>8080</code> through the generated API Service.</p>
<p>Local validation for this iteration:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">make</span><span style="color:#F1FA8C"> ci</span></span></code></pre>
<p>That now covers:</p>
<ul>
<li>CRD/RBAC generation</li>
<li>formatting</li>
<li><code>go vet</code></li>
<li>race-enabled tests</li>
<li>build</li>
</ul>
<h2 id="common-mistakes-in-this-step">Common Mistakes In This Step</h2>
<h3 id="the-api-works-locally-but-nothing-happens-in-cluster">The API works locally, but nothing happens in cluster</h3>
<p>Check whether the process can actually talk to the cluster. This version relies on standard controller-runtime kubeconfig handling, so a bad context or missing config breaks the chain before reconcile even gets a chance to be blamed for crimes it did not commit.</p>
<h3 id="the-stockpool-exists-but-no-deployment-appears">The <code>StockPool</code> exists, but no <code>Deployment</code> appears</h3>
<p>Check:</p>
<ul>
<li>the reconciler is registered with the manager</li>
<li>the CRD group/version matches the Go type</li>
<li>RBAC allows <code>deployments</code> create and update</li>
</ul>
<h3 id="the-deployment-is-created-but-the-pod-spec-looks-wrong">The deployment is created, but the pod spec looks wrong</h3>
<p>Check the CR values:</p>
<ul>
<li><code>image</code></li>
<li><code>memory</code></li>
<li><code>gpu</code></li>
</ul>
<p>Remember that invalid <code>memory</code> values have to parse as Kubernetes resource quantities, and GPU is intentionally mapped to <code>nvidia.com/gpu</code>.</p>
<h3 id="status-never-moves-past-progressing">Status never moves past progressing</h3>
<p>Remember that <code>status</code> is based on observed deployment state, not on what we hope the cluster will do eventually. If the deployment is not becoming available, the operator should not fake confidence.</p>
<h2 id="summary">Summary</h2>
<p>Part 5 is the first chapter where the project starts to feel structurally honest.</p>
<p>We now have:</p>
<ul>
<li>a standard <code>kubebuilder</code> scaffold</li>
<li>an <code>echo</code>-based control-plane API</li>
<li>a single-process control plane</li>
<li>an HTTP API that creates CRs instead of fake runtime state</li>
<li>a reconciler that creates a real Kubernetes workload</li>
<li>generated CRD and RBAC artifacts</li>
<li>runtime fields flowing from API all the way into pod resources</li>
</ul>
<p>That is a much stronger base for the rest of the book.</p>
<h2 id="next-chapter-preview">Next Chapter Preview</h2>
<p>Part 6 should stop at “minimal but real” and move into “useful.”</p>
<p>That likely means:</p>
<ul>
<li>making the controller own more lifecycle detail</li>
<li>improving idempotency and error handling</li>
<li>tightening the API/job contract</li>
<li>preparing the path toward actual runtime pods instead of placeholders</li>
</ul>
<h2 id="repository">Repository</h2>
<p>Code for this chapter:</p>
<ul>
<li><a href="https://github.com/LokiWager/gpu-operator-runtime" rel="nofollow, noopener, noreferrer" target="_blank">gpu-operator-runtime</a></li>
</ul>`,r={title:"Building a GPU SaaS Platform - Operator Baseline",publishDate:"5 March 2026",description:"Part 5: move the project onto a standard kubebuilder layout, switch the API to Echo, and let requests create real custom resources.",tags:["GPU","SaaS","Kubernetes","Golang","Operator"],minutesRead:"11 min read"},l="/home/runner/work/lokiwager.github.io/lokiwager.github.io/src/content/post/building-gpu-service-5.md",p=void 0;function m(){return`
Part 4 gave us a service-shaped project.

Part 5 is where it starts acting like a Kubernetes system instead of a well-organized mock.

The high-level change is simple:

- the HTTP server still accepts control-plane requests
- but it no longer tries to act as the source of truth
- instead, it creates a \`StockPool\` custom resource
- the controller reconciles that resource into a \`Deployment\`

That is the first real control loop in the project.

## What We Are Doing In This Chapter

This chapter does six concrete things:

1. refactor the project onto a standard \`kubebuilder\` layout
2. switch the HTTP layer from raw \`net/http\` to \`echo\`
3. define the \`StockPool\` CRD
4. implement \`StockPoolReconciler\` so a CR becomes a \`Deployment\`
5. generate RBAC and CRD manifests instead of hand-maintaining them
6. add unit tests for the API flow and reconcile flow

That gives us a believable baseline without pretending we already finished the whole runtime.

## A Few Ground Rules Before We Start

There are a few design choices in this chapter that are intentional, even if they are not final.

First, the HTTP server and the Kubernetes operator live in the same binary for now. That is a temporary trade-off, not a philosophical commitment. Long term, splitting them usually makes maintenance, failover, and ownership boundaries cleaner. But for this stage of the project, a single process keeps the lifecycle simple and makes the control flow easier to teach:

\`request -> custom resource -> reconcile -> workload\`

Second, some of the earlier "stock" ideas still show up in the broader series because this is an iterative project, not a fake greenfield rewrite every week. Stock-style reservation can simplify certain scheduling conversations, but it is not the final answer. Later in the series we will talk about better approaches and why they matter.

Third, this chapter uses \`echo\` instead of raw \`net/http\`. That is not because Go lacks framework choices. It definitely does not. You could reasonably pick \`Gin\`, \`Fiber\`, or something else. I picked \`echo\` for boring, practical reasons:

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

Without a CRD, \`StockPool\` is just a Go struct and some wishful thinking.

With a CRD:

- Kubernetes knows the resource exists
- the API server can store it
- clients can query it
- controllers can watch it

That is why this chapter is a real milestone. We are moving from "service logic that happens to know about Kubernetes" to "Kubernetes-native desired state with a dedicated API contract."

## Why We Switched To Kubebuilder

The previous hand-wired operator code was fine as a sketch. It was not fine as the foundation of a teaching project that is supposed to model production habits.

Once CRDs, controllers, RBAC, generated manifests, and manager wiring enter the picture, hand-rolling everything quickly becomes a maintenance tax.

Could we have picked \`operator-sdk\` instead? Sure. \`kubebuilder\` is not the only valid option. I picked it partly out of preference, and partly because the documentation is deep enough that when something goes sideways, you have a decent chance of finding the answer without sacrificing a weekend to archaeology.

So this iteration makes a clear move:

- use the standard \`kubebuilder\` project layout
- generate CRD and RBAC artifacts
- keep one binary and one control-plane entrypoint for now

That gives readers a structure they are likely to see again in real controller repositories.

## Architecture In This Iteration

\`\`\`text
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
\`\`\`

Notice what changed from Part 4:

- the API is no longer the source of truth
- the custom resource is the source of truth
- reconcile owns the drift-correction path

That mental model is more important than any individual code snippet in this chapter.

## Step 1: Replace The Hand-Wired Layout With Kubebuilder

The first major change is structural.

We move from a homegrown operator layout to the standard shape most Kubernetes engineers expect:

- \`PROJECT\`
- \`api/v1alpha1\`
- \`internal/controller\`
- \`config/crd\`
- \`config/rbac\`
- \`config/default\`

Why do this now?

Because teaching real engineering practice means teaching the boring defaults too, not just the fun parts.

\`kubebuilder\` buys us a few things immediately:

- predictable file layout
- generated deepcopy methods
- CRD generation from Go markers
- RBAC generation from controller markers
- easier onboarding for anyone who has seen a controller repo before

This is not glamorous, but it is the kind of decision that saves your future self from becoming unpaid support for your own clever shortcuts.

## Step 2: Define A Small But Honest API Type

The \`StockPool\` API lives in [\`api/v1alpha1/stockpool_types.go\`](https://github.com/LokiWager/gpu-operator-runtime).

Core fields now look like this:

\`\`\`go
type StockPoolSpec struct {
    SpecName string \`json:"specName"\`
    Image    string \`json:"image,omitempty"\`
    Memory   string \`json:"memory,omitempty"\`
    GPU      int32  \`json:"gpu,omitempty"\`
    Replicas int32  \`json:"replicas"\`
}

type StockPoolStatus struct {
    Available          int32       \`json:"available,omitempty"\`
    Allocated          int32       \`json:"allocated,omitempty"\`
    Phase              string      \`json:"phase,omitempty"\`
    ObservedGeneration int64       \`json:"observedGeneration,omitempty"\`
    LastSyncTime       metav1.Time \`json:"lastSyncTime,omitempty"\`
}
\`\`\`

Why this shape?

\`SpecName\` stays because users still need a concrete runtime flavor such as \`g1.1\`.

\`Replicas\` is still the smallest useful desired-state signal.

\`Image\`, \`Memory\`, and \`GPU\` are where the API starts to feel less toy-like. Once those fields exist in the spec, readers can see a real path from control-plane input to pod template output.

\`Status\` gives users immediate feedback without forcing them to reverse-engineer controller logs every time something is still converging.

We also add kubebuilder markers so the CRD can be generated from the type:

\`\`\`go
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Spec",type=string,JSONPath=\`.spec.specName\`
// +kubebuilder:printcolumn:name="Desired",type=integer,JSONPath=\`.spec.replicas\`
// +kubebuilder:printcolumn:name="Available",type=integer,JSONPath=\`.status.available\`
\`\`\`

That means the CRD definition comes from the Go contract instead of a hand-maintained YAML file quietly drifting off the map.

## Step 3: Keep One Entry Point

The unified entrypoint is [\`cmd/main.go\`](https://github.com/LokiWager/gpu-operator-runtime).

This file now does three jobs:

- build the controller manager
- register the reconciler
- attach non-leader background runnables such as the HTTP server and the job worker

Manager setup:

\`\`\`go
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
\`\`\`

Then we attach the API server to the manager lifecycle:

\`\`\`go
if err := mgr.Add(nonLeaderRunnable{run: func(ctx context.Context) error {
    return startHTTPServer(ctx, httpServer)
}}); err != nil {
    os.Exit(1)
}
\`\`\`

That is cleaner than building a second bootstrap world outside the manager and then trying to keep shutdown behavior consistent by brute force.

One more practical change landed in this iteration: the deployment manifest now declares the API port and exposes it through a dedicated Service:

- \`config/manager/manager.yaml\` declares \`--http-addr=:8080\` and the container port
- \`config/default/api_service.yaml\` exposes the HTTP API inside the cluster

That is the kind of detail teams forget surprisingly often when the binary grows from "just a controller" into "controller plus API."

## Step 4: Switch The API Layer To Echo

The HTTP layer in [\`pkg/api/server.go\`](https://github.com/LokiWager/gpu-operator-runtime) now uses \`echo\` instead of raw \`net/http\`.

Current endpoints:

\`\`\`text
GET  /api/v1/health
GET  /api/v1/operator/stockpools
POST /api/v1/operator/stockpools
GET  /api/v1/operator/jobs/{jobID}
\`\`\`

The service layer in [\`pkg/service/service.go\`](https://github.com/LokiWager/gpu-operator-runtime) owns the actual flow.

Request DTO:

\`\`\`go
type CreateStockPoolRequest struct {
    Name      string \`json:"name,omitempty"\`
    Namespace string \`json:"namespace,omitempty"\`
    SpecName  string \`json:"specName"\`
    Image     string \`json:"image,omitempty"\`
    Memory    string \`json:"memory,omitempty"\`
    GPU       int32  \`json:"gpu,omitempty"\`
    Replicas  int32  \`json:"replicas"\`
}
\`\`\`

Async create path:

\`\`\`go
func (s *Service) CreateStockPoolAsync(ctx context.Context, req CreateStockPoolRequest) (domain.OperatorJob, error) {
    ...
    s.jobQueue <- createStockPoolJob{jobID: jobID, req: req}
    return job, nil
}
\`\`\`

Worker:

\`\`\`go
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
\`\`\`

This is the key boundary in the current design:

\`HTTP request -> async job -> CR creation -> reconcile\`

We are no longer storing pretend runtime state in memory and calling that progress. The API hands desired state to Kubernetes. That is the right shape for the control plane we are trying to build.

## Step 5: Reconcile To A Deployment

The reconciler lives in [\`internal/controller/stockpool_controller.go\`](https://github.com/LokiWager/gpu-operator-runtime).

This is the first chapter where reconcile performs a real side effect:

- load \`StockPool\`
- ensure a \`Deployment\` exists
- update \`Deployment.spec.replicas\`
- map \`image\`, \`memory\`, and \`gpu\` into the pod template
- compute and write \`StockPool.status\`

The creation path looks like this:

\`\`\`go
newDep, err := desiredDeployment(pool, desired)
if err := controllerutil.SetControllerReference(&pool, newDep, r.Scheme); err != nil {
    return ctrl.Result{}, err
}
if err := r.Create(ctx, newDep); err != nil {
    return ctrl.Result{}, err
}
\`\`\`

And the status path still reflects observed state, not wishful thinking:

\`\`\`go
next := runtimev1alpha1.StockPoolStatus{
    Available:          dep.Status.AvailableReplicas,
    Allocated:          maxInt32(desired-dep.Status.AvailableReplicas, 0),
    ObservedGeneration: pool.Generation,
    LastSyncTime:       metav1.NewTime(time.Now().UTC()),
}
\`\`\`

The new resource mapping logic is especially worth noticing. \`memory\` is parsed into Kubernetes resource quantities, and \`gpu\` is wired to \`nvidia.com/gpu\` requests and limits. That means the reader can now see a clean line from API payload to CR spec to pod resources.

The deployment still uses a placeholder container image by default if one is not provided. That is fine. The point here is control flow, not pretending we have already built the final GPU runtime.

## Step 6: Let RBAC And CRD Manifests Be Generated

The repo now uses generated output under \`config/\`.

That includes:

- \`config/crd/bases/runtime.lokiwager.io_stockpools.yaml\`
- \`config/rbac/role.yaml\`
- \`config/samples/runtime_v1alpha1_stockpool.yaml\`

And the \`Makefile\` includes:

\`\`\`bash
make manifests generate
\`\`\`

This is one of those habits that pays off quietly. When manifests are derived from types and markers, the diff usually tells a coherent story. When they are maintained by hand, the diff often tells you someone forgot something on a random Friday and hoped nobody would notice.

## Step 7: Keep Tests Small And Direct

We keep tests practical in this chapter.

Controller test:

- [\`internal/controller/stockpool_controller_test.go\`](https://github.com/LokiWager/gpu-operator-runtime)

Service tests:

- [\`pkg/service/service_operator_test.go\`](https://github.com/LokiWager/gpu-operator-runtime)
- [\`pkg/service/service_test.go\`](https://github.com/LokiWager/gpu-operator-runtime)

API test:

- [\`pkg/api/server_test.go\`](https://github.com/LokiWager/gpu-operator-runtime)

The controller test now checks more than "did status change?" It also verifies that the reconciled deployment carries the expected image, memory limit, and GPU limit.

The service test verifies that the async job worker eventually creates the \`StockPool\` CR with the requested runtime fields.

That is enough coverage for this iteration because the main risk lives in glue code and state transitions.

We still have not introduced \`envtest\` here, and that is deliberate. This chapter already carries a major conceptual jump: \`kubebuilder\`, real reconciliation, and real workload generation. Throwing every testing strategy into the same chapter would make it louder, not better.

## How To Run This Version

In the code repo:

\`\`\`bash
make manifests generate
kubectl apply -f config/crd/bases/runtime.lokiwager.io_stockpools.yaml
make run
\`\`\`

Create a pool:

\`\`\`bash
curl -s -X POST http://127.0.0.1:8080/api/v1/operator/stockpools \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"pool-g1","namespace":"default","specName":"g1.1","image":"nginx:1.27","memory":"16Gi","gpu":1,"replicas":2}' | jq
\`\`\`

Then verify:

\`\`\`bash
kubectl get stockpools.runtime.lokiwager.io pool-g1 -o yaml
kubectl get deployment -n default
\`\`\`

If you deploy this through the generated manifests instead of \`make run\`, the in-cluster API is exposed on port \`8080\` through the generated API Service.

Local validation for this iteration:

\`\`\`bash
make ci
\`\`\`

That now covers:

- CRD/RBAC generation
- formatting
- \`go vet\`
- race-enabled tests
- build

## Common Mistakes In This Step

### The API works locally, but nothing happens in cluster

Check whether the process can actually talk to the cluster. This version relies on standard controller-runtime kubeconfig handling, so a bad context or missing config breaks the chain before reconcile even gets a chance to be blamed for crimes it did not commit.

### The \`StockPool\` exists, but no \`Deployment\` appears

Check:

- the reconciler is registered with the manager
- the CRD group/version matches the Go type
- RBAC allows \`deployments\` create and update

### The deployment is created, but the pod spec looks wrong

Check the CR values:

- \`image\`
- \`memory\`
- \`gpu\`

Remember that invalid \`memory\` values have to parse as Kubernetes resource quantities, and GPU is intentionally mapped to \`nvidia.com/gpu\`.

### Status never moves past progressing

Remember that \`status\` is based on observed deployment state, not on what we hope the cluster will do eventually. If the deployment is not becoming available, the operator should not fake confidence.

## Summary

Part 5 is the first chapter where the project starts to feel structurally honest.

We now have:

- a standard \`kubebuilder\` scaffold
- an \`echo\`-based control-plane API
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
`}function g(){return n}function f(){return[{depth:2,slug:"what-we-are-doing-in-this-chapter",text:"What We Are Doing In This Chapter"},{depth:2,slug:"a-few-ground-rules-before-we-start",text:"A Few Ground Rules Before We Start"},{depth:2,slug:"what-is-an-operator",text:"What Is An Operator?"},{depth:2,slug:"what-is-a-crd",text:"What Is A CRD?"},{depth:2,slug:"why-we-switched-to-kubebuilder",text:"Why We Switched To Kubebuilder"},{depth:2,slug:"architecture-in-this-iteration",text:"Architecture In This Iteration"},{depth:2,slug:"step-1-replace-the-hand-wired-layout-with-kubebuilder",text:"Step 1: Replace The Hand-Wired Layout With Kubebuilder"},{depth:2,slug:"step-2-define-a-small-but-honest-api-type",text:"Step 2: Define A Small But Honest API Type"},{depth:2,slug:"step-3-keep-one-entry-point",text:"Step 3: Keep One Entry Point"},{depth:2,slug:"step-4-switch-the-api-layer-to-echo",text:"Step 4: Switch The API Layer To Echo"},{depth:2,slug:"step-5-reconcile-to-a-deployment",text:"Step 5: Reconcile To A Deployment"},{depth:2,slug:"step-6-let-rbac-and-crd-manifests-be-generated",text:"Step 6: Let RBAC And CRD Manifests Be Generated"},{depth:2,slug:"step-7-keep-tests-small-and-direct",text:"Step 7: Keep Tests Small And Direct"},{depth:2,slug:"how-to-run-this-version",text:"How To Run This Version"},{depth:2,slug:"common-mistakes-in-this-step",text:"Common Mistakes In This Step"},{depth:3,slug:"the-api-works-locally-but-nothing-happens-in-cluster",text:"The API works locally, but nothing happens in cluster"},{depth:3,slug:"the-stockpool-exists-but-no-deployment-appears",text:"The StockPool exists, but no Deployment appears"},{depth:3,slug:"the-deployment-is-created-but-the-pod-spec-looks-wrong",text:"The deployment is created, but the pod spec looks wrong"},{depth:3,slug:"status-never-moves-past-progressing",text:"Status never moves past progressing"},{depth:2,slug:"summary",text:"Summary"},{depth:2,slug:"next-chapter-preview",text:"Next Chapter Preview"},{depth:2,slug:"repository",text:"Repository"}]}const b=s((i,c,d)=>{const{layout:h,...e}=r;return e.file=l,e.url=p,t`${o()}${a(n)}`});export{b as Content,g as compiledContent,b as default,l as file,r as frontmatter,f as getHeadings,m as rawContent,p as url};
