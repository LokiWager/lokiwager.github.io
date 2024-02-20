import{m as D,u as T}from"./hoisted.iW066mOG.js";import{a as c,c as u,r as d,m as f}from"./render-template.SddDYDpB.js";import{A as y,a as v,b as R,I,i as S,g as P}from"./astro/assets-service.1mn5GyWb.js";const L="4.0.3";function U(){return a=>{if(typeof a=="string")throw new y({...v,message:v.message(JSON.stringify(a))});let o=[...Object.values(a)];if(o.length===0)throw new y({...R,message:R.message(JSON.stringify(a))});return Promise.all(o.map(t=>t()))}}function x(s){return{site:s?new URL(s):void 0,generator:`Astro v${L}`,glob:U()}}function l(s={},a,{class:o}={}){let t="";o&&(typeof s.class<"u"?s.class+=` ${o}`:typeof s["class:list"]<"u"?s["class:list"]=[s["class:list"],o]:s.class=o);for(const[e,r]of Object.entries(s))t+=c(r,e,!0);return D(t)}const _=x("https://astro-cactus.chriswilliams.dev/"),H=u(async(s,a,o)=>{const t=s.createAstro(_,a,o);t.self=H;const e=t.props;if(e.alt===void 0||e.alt===null)throw new y(I);typeof e.width=="string"&&(e.width=parseInt(e.width)),typeof e.height=="string"&&(e.height=parseInt(e.height));const r=await i(e),F={};return r.srcSet.values.length>0&&(F.srcset=r.srcSet.attribute),d`${f()}<img${c(r.src,"src")}${l(F)}${l(r.attributes)}>`},"/home/runner/work/lokiwager.github.io/lokiwager.github.io/node_modules/.pnpm/astro@4.0.3_typescript@5.3.3/node_modules/astro/components/Image.astro",void 0),$=x("https://astro-cactus.chriswilliams.dev/"),O=u(async(s,a,o)=>{const t=s.createAstro($,a,o);t.self=O;const e=["webp"],r="png",F=["gif","svg","jpg","jpeg"],{formats:B=e,pictureAttributes:q={},fallbackFormat:g,...n}=t.props;if(n.alt===void 0||n.alt===null)throw new y(I);const E=await Promise.all(B.map(async b=>await i({...n,format:b,widths:n.widths,densities:n.densities})));let m=g??r;!g&&S(n.src)&&F.includes(n.src.format)&&(m=n.src.format);const h=await i({...n,format:m,widths:n.widths,densities:n.densities}),w={},C={};return n.sizes&&(C.sizes=n.sizes),h.srcSet.values.length>0&&(w.srcset=h.srcSet.attribute),d`${f()}<picture${l(q)}> ${Object.entries(E).map(([b,p])=>{const k=n.densities||!n.densities&&!n.widths?`${p.src}${p.srcSet.values.length>0?", "+p.srcSet.attribute:""}`:p.srcSet.attribute;return d`<source${c(k,"srcset")}${c("image/"+p.options.format,"type")}${l(C)}>`})} <img${c(h.src,"src")}${l(w)}${l(h.attributes)}> </picture>`},"/home/runner/work/lokiwager.github.io/lokiwager.github.io/node_modules/.pnpm/astro@4.0.3_typescript@5.3.3/node_modules/astro/components/Picture.astro",void 0),G={service:{entrypoint:"astro/assets/services/noop",config:{}},domains:["webmention.io"],remotePatterns:[]};new URL("file:///home/runner/work/lokiwager.github.io/lokiwager.github.io/dist/");const i=async s=>await P(s,G),M={src:"/_astro/Phenomenon.T5BBGCJ2.png",width:946,height:644,format:"png"},z={src:"/_astro/architecture.RS8kTfPP.png",width:2032,height:737,format:"png"},j=async function(){return{"./img/golang-http-url/Phenomenon.png":await i({src:M}),"./img/golang-http-url/architecture.png":await i({src:z})}};async function N(s){return j().then(a=>s.replaceAll(/__ASTRO_IMAGE_="([^"]+)"/gm,(o,t)=>l({src:a[t].src,...a[t].attributes})))}const A=await N(`<h2 id="a-fun-bug-with-golangs-httpurl">A Fun “Bug” with Golang’s http.URL</h2>
<p>I recently encountered an interesting issue that I thought the steps I took to troubleshoot might be worth sharing. I use an open-source project
called <a href="https://github.com/sigoden/dufs" rel="nofollow, noopener, noreferrer" target="_blank">dufs</a> as a file server for my users. I found that I can’t operate a file which name contains <code>#</code> and <code>?</code>,
and I am sure that I’ve encoded the URL correctly.</p>
<h3 id="prepare-the-minimal-environment">Prepare the minimal environment</h3>
<img alt="Phenomenon" __ASTRO_IMAGE_="./img/golang-http-url/Phenomenon.png">
<p>First, I queried the server logs</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>2024-02-20T01:53:41Z INFO - 10.233.64.42 "HEAD /files/qsdizt-1703128686-ca6addedebab4017/sd-train.json" 404</span></span>
<span class="line"><span>2024-02-20T01:53:41Z INFO - 10.233.64.42 "MOVE /files/qsdizt-1703128686-ca6addedebab4017/sd-tra" 404</span></span></code></pre>
<p>The first log is a <code>HEAD</code> request which represents whether the destination file exists. The second log is a <code>MOVE</code> request which represents moving
the source file to the destination file. It is obvious that the request URL is wrong. I run the same request in my local environment(MacOS) and it
works. But the server is running in a container with MUSL. So I need to prepare a minimal environment to make sure whether it is a MUSL issue.</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">pub</span><span style="color:#FF79C6"> type</span><span style="color:#8BE9FD;font-style:italic"> Request</span><span style="color:#FF79C6"> =</span><span style="color:#F8F8F2"> hyper</span><span style="color:#FF79C6">::</span><span style="color:#8BE9FD;font-style:italic">Request</span><span style="color:#F8F8F2">&#x3C;</span><span style="color:#8BE9FD;font-style:italic">Incoming</span><span style="color:#F8F8F2">>;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#FF79C6">pub</span><span style="color:#FF79C6"> async</span><span style="color:#FF79C6"> fn</span><span style="color:#50FA7B"> handle</span><span style="color:#F8F8F2">(</span><span style="color:#BD93F9;font-style:italic">self</span><span style="color:#FF79C6">:</span><span style="color:#8BE9FD;font-style:italic"> Arc</span><span style="color:#F8F8F2">&#x3C;</span><span style="color:#BD93F9;font-style:italic">Self</span><span style="color:#F8F8F2">>, req</span><span style="color:#FF79C6">:</span><span style="color:#8BE9FD;font-style:italic"> Request</span><span style="color:#F8F8F2">) </span><span style="color:#FF79C6">-></span><span style="color:#8BE9FD;font-style:italic"> Result</span><span style="color:#F8F8F2">&#x3C;</span><span style="color:#8BE9FD;font-style:italic">Response</span><span style="color:#F8F8F2">> {</span></span>
<span class="line"><span style="color:#FF79C6">  let</span><span style="color:#F8F8F2"> req_path </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> req</span><span style="color:#FF79C6">.</span><span style="color:#50FA7B">uri</span><span style="color:#F8F8F2">()</span><span style="color:#FF79C6">.</span><span style="color:#50FA7B">path</span><span style="color:#F8F8F2">();</span></span>
<span class="line"><span style="color:#FF79C6">  ...</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>I wrote a simple Rust program to simulate the server. The server will print the request URL and the request URL is correct. So it is not a MUSL
issue. And I’ve found it is ok to use other non-ASCII characters in the file name. Suddenly, I realized that the <code>#</code> and <code>?</code> are special
characters in the URL.</p>
<h3 id="the-root-cause">The root cause</h3>
<img alt="architecture" __ASTRO_IMAGE_="./img/golang-http-url/architecture.png">
<p>The architecture of the server is shown in the figure. In front of the server, there is an open-source gateway called [easegress](<a href="https://github" rel="nofollow, noopener, noreferrer" target="_blank">https://github</a>.
com/easegress-io/easegress) and a self-developed reverse proxy.</p>
<ul>
<li>The gateway is responsible for handling the request from the client and forwarding the request to the different server, like terminal server, console
server, etc.</li>
<li>The reverse proxy is responsible for authenticating the request and finding the real pod to handle the request.</li>
</ul>
<p>Both of them are written in Golang. So I need to find which part decodes the URL.</p>
<p>In the reverse proxy, I found the following code:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#50FA7B"> buildReverseProxyCallback</span><span style="color:#F8F8F2">(resp http.ResponseWriter, req </span><span style="color:#FF79C6">*</span><span style="color:#F8F8F2">http.Request, wcap </span><span style="color:#FF79C6">*</span><span style="color:#F8F8F2">model.WebConsoleAccessParams) tunnel.SSHTunnelCallback {</span></span>
<span class="line"><span style="color:#F8F8F2">	director </span><span style="color:#FF79C6">:=</span><span style="color:#FF79C6"> func</span><span style="color:#F8F8F2">(req </span><span style="color:#FF79C6">*</span><span style="color:#F8F8F2">http.Request) {</span></span>
<span class="line"><span style="color:#F8F8F2">		req.URL.Scheme </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> wcap.Protocol</span></span>
<span class="line"><span style="color:#F8F8F2">		req.URL.Host </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> fmt.</span><span style="color:#8BE9FD">Sprintf</span><span style="color:#F8F8F2">(</span><span style="color:#E9F284">"</span><span style="color:#BD93F9">%s</span><span style="color:#F1FA8C">:</span><span style="color:#BD93F9">%d</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, wcap.Host.HostIP, wcap.Port)</span></span>
<span class="line"><span style="color:#F8F8F2">	}</span></span>
<span class="line"><span style="color:#FF79C6">	var</span><span style="color:#F8F8F2"> proxyError </span><span style="color:#8BE9FD;font-style:italic">error</span><span style="color:#FF79C6"> =</span><span style="color:#BD93F9"> nil</span></span>
<span class="line"><span style="color:#F8F8F2">	errorHandler </span><span style="color:#FF79C6">:=</span><span style="color:#FF79C6"> func</span><span style="color:#F8F8F2">(resp http.ResponseWriter, req </span><span style="color:#FF79C6">*</span><span style="color:#F8F8F2">http.Request, err </span><span style="color:#8BE9FD;font-style:italic">error</span><span style="color:#F8F8F2">) {</span></span>
<span class="line"><span style="color:#F8F8F2">		proxyError </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> err</span></span>
<span class="line"><span style="color:#F8F8F2">		log.</span><span style="color:#8BE9FD">Printf</span><span style="color:#F8F8F2">(</span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">[GPUConsole] http: proxy error: </span><span style="color:#BD93F9">%v</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, err)</span></span>
<span class="line"><span style="color:#F8F8F2">		resp.</span><span style="color:#8BE9FD">WriteHeader</span><span style="color:#F8F8F2">(http.StatusBadGateway)</span></span>
<span class="line"><span style="color:#F8F8F2">	}</span></span>
<span class="line"><span style="color:#FF79C6">	return</span><span style="color:#FF79C6"> func</span><span style="color:#F8F8F2">(dia tunnel.Dial, sshClient </span><span style="color:#FF79C6">*</span><span style="color:#F8F8F2">ssh.Client) </span><span style="color:#8BE9FD;font-style:italic">error</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">		reverseProxy </span><span style="color:#FF79C6">:=</span><span style="color:#FF79C6"> &#x26;</span><span style="color:#F8F8F2">httputil.ReverseProxy{Director: director, ErrorHandler: errorHandler}</span></span>
<span class="line"><span style="color:#F8F8F2">		myTransport </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> http.DefaultTransport.(</span><span style="color:#FF79C6">*</span><span style="color:#F8F8F2">http.Transport).</span><span style="color:#8BE9FD">Clone</span><span style="color:#F8F8F2">()</span></span>
<span class="line"><span style="color:#F8F8F2">		myTransport.TLSClientConfig </span><span style="color:#FF79C6">=</span><span style="color:#FF79C6"> &#x26;</span><span style="color:#F8F8F2">tls.Config{InsecureSkipVerify: </span><span style="color:#BD93F9">true</span><span style="color:#F8F8F2">}</span></span>
<span class="line"><span style="color:#FF79C6">		if</span><span style="color:#F8F8F2"> dia </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">			myTransport.DialContext </span><span style="color:#FF79C6">=</span><span style="color:#BD93F9"> nil</span></span>
<span class="line"><span style="color:#F8F8F2">			myTransport.Dial </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> dia</span></span>
<span class="line"><span style="color:#F8F8F2">		}</span></span>
<span class="line"><span style="color:#F8F8F2">		reverseProxy.Transport </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> myTransport</span></span>
<span class="line"><span style="color:#F8F8F2">		reverseProxy.</span><span style="color:#8BE9FD">ServeHTTP</span><span style="color:#F8F8F2">(resp, req)</span></span>
<span class="line"><span style="color:#FF79C6">		return</span><span style="color:#F8F8F2"> proxyError</span></span>
<span class="line"><span style="color:#F8F8F2">	}</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>The <code>director</code> function is responsible for setting the <code>req.URL.Scheme</code> and <code>req.URL.Host</code>. It doesn’t decode the URL. So the issue is not in the
reverse proxy.</p>
<p>So I checked the gateway. The gateway is a bit complex. It has a lot of features, like rate limiting, authentication, etc. And I couldn’t find
something contains <code>escape</code> or <code>unescape</code> in the code. So I decided to deploy a minimal http server to mock the production environment.</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">-</span><span style="color:#8BE9FD"> https</span><span style="color:#FF79C6">:</span><span style="color:#BD93F9"> false</span></span>
<span class="line"><span style="color:#8BE9FD">  keepAlive</span><span style="color:#FF79C6">:</span><span style="color:#BD93F9"> true</span></span>
<span class="line"><span style="color:#8BE9FD">  keepAliveTimeout</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> 75s</span></span>
<span class="line"><span style="color:#8BE9FD">  kind</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> HTTPServer</span></span>
<span class="line"><span style="color:#8BE9FD">  maxConnections</span><span style="color:#FF79C6">:</span><span style="color:#BD93F9"> 10240</span></span>
<span class="line"><span style="color:#8BE9FD">  name</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> http-server-gpu-proxy</span></span>
<span class="line"><span style="color:#8BE9FD">  port</span><span style="color:#FF79C6">:</span><span style="color:#BD93F9"> 80</span></span>
<span class="line"><span style="color:#8BE9FD">  rules</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#FF79C6">    -</span><span style="color:#8BE9FD"> paths</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#FF79C6">        -</span><span style="color:#8BE9FD"> backend</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> web-console-proxy</span></span>
<span class="line"><span style="color:#8BE9FD">          clientMaxBodySize</span><span style="color:#FF79C6">:</span><span style="color:#BD93F9"> -1</span></span>
<span class="line"><span style="color:#8BE9FD">          pathPrefix</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> /</span></span>
<span class="line"><span style="color:#8BE9FD">  version</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> easegress.megaease.com/v2</span></span>
<span class="line"><span style="color:#FF79C6">-</span><span style="color:#8BE9FD"> filters</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#FF79C6">    -</span><span style="color:#8BE9FD"> kind</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> Proxy</span></span>
<span class="line"><span style="color:#8BE9FD">      name</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> proxy</span></span>
<span class="line"><span style="color:#8BE9FD">      pools</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#FF79C6">        -</span><span style="color:#8BE9FD"> loadBalance</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">            policy</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> roundRobin</span></span>
<span class="line"><span style="color:#8BE9FD">          serverMaxBodySize</span><span style="color:#FF79C6">:</span><span style="color:#BD93F9"> -1</span></span>
<span class="line"><span style="color:#8BE9FD">          servers</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#FF79C6">            -</span><span style="color:#8BE9FD"> url</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> http://10.108.162.15:38801</span></span>
<span class="line"><span style="color:#8BE9FD">  flow</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#FF79C6">    -</span><span style="color:#8BE9FD"> filter</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> proxy</span></span>
<span class="line"><span style="color:#8BE9FD">  kind</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> Pipeline</span></span>
<span class="line"><span style="color:#8BE9FD">  name</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> web-console-proxy</span></span></code></pre>
<p>Then I executed the following command:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">curl</span><span style="color:#F1FA8C"> http://localhost/files/qsdizt-1703128686-ca6addedebab4017/sd-tr%23ain.json</span></span></code></pre>
<p>The server printed the following log:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>Feb 19 17:12:31 ds15 easegress-server[309509]: 2024-02-19T17:12:31.999Z        INFO Get /files/qsdizt-1703128686-ca6addedebab4017/sd-tr#ain.json</span></span></code></pre>
<p>The URL is decoded, so I read the source code of the gateway again. I found the following code:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#F8F8F2"> (spCtx </span><span style="color:#FF79C6">*</span><span style="color:#F8F8F2">serverPoolContext) </span><span style="color:#50FA7B">prepareRequest</span><span style="color:#F8F8F2">(svr </span><span style="color:#FF79C6">*</span><span style="color:#F8F8F2">Server, ctx stdcontext.Context, mirror </span><span style="color:#8BE9FD;font-style:italic">bool</span><span style="color:#F8F8F2">) </span><span style="color:#8BE9FD;font-style:italic">error</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">	req </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> spCtx.req</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F8F8F2">	url </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> svr.URL </span><span style="color:#FF79C6">+</span><span style="color:#F8F8F2"> req.</span><span style="color:#8BE9FD">Path</span><span style="color:#F8F8F2">()</span></span>
<span class="line"><span style="color:#FF79C6">	if</span><span style="color:#F8F8F2"> rq </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> req.</span><span style="color:#8BE9FD">Std</span><span style="color:#F8F8F2">().URL.RawQuery; rq </span><span style="color:#FF79C6">!=</span><span style="color:#E9F284"> ""</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">		url </span><span style="color:#FF79C6">+=</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C">?</span><span style="color:#E9F284">"</span><span style="color:#FF79C6"> +</span><span style="color:#F8F8F2"> rq</span></span>
<span class="line"><span style="color:#F8F8F2">	}</span></span>
<span class="line"><span style="color:#FF79C6">  ...</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6272A4">// Path returns path.</span></span>
<span class="line"><span style="color:#FF79C6">func</span><span style="color:#F8F8F2"> (r </span><span style="color:#FF79C6">*</span><span style="color:#F8F8F2">Request) </span><span style="color:#50FA7B">Path</span><span style="color:#F8F8F2">() </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#FF79C6">	return</span><span style="color:#F8F8F2"> r.</span><span style="color:#8BE9FD">Std</span><span style="color:#F8F8F2">().URL.Path</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>And I read the <a href="https://pkg.go.dev/net/url#URL" rel="nofollow, noopener, noreferrer" target="_blank">document</a> of the <code>http.URL</code></p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>Note that the Path field is stored in decoded form: /%47%6f%2f becomes /Go/. A consequence is that it is impossible to tell which slashes in the Path were slashes in the raw URL and which were %2f. This distinction is rarely important, but when it is, the code should use the URL.EscapedPath method, which preserves the original encoding of Path.</span></span>
<span class="line"><span></span></span>
<span class="line"><span>The RawPath field is an optional field which is only set when the default encoding of Path is different from the escaped path. See the EscapedPath method for more details.</span></span></code></pre>
<p>So the issue is in the gateway. The <code>Path</code> method decodes the URL. But why Golang decodes the URL? In rust and python Flask, the URL is not
decoded. The important thing is that the <code>Path</code> documentation doesn’t mention it. I think the documentation should be
improved. In my opinion, the reason why Golang decodes the URL is that it is convenient for the developer, in most cases, the developer doesn’t
need the original encoding of the URL.</p>`),W={title:`A Fun "Bug" with Golang's http.URL`,publishDate:"20 February 2024",description:"Documenting an interesting Online issue troubleshooting journey",tags:["Golang","Network"],minutesRead:"4 min read"},Z="/home/runner/work/lokiwager.github.io/lokiwager.github.io/src/content/post/golang-http-url.md",V=void 0;function X(){return`
## A Fun "Bug" with Golang's http.URL

I recently encountered an interesting issue that I thought the steps I took to troubleshoot might be worth sharing. I use an open-source project
called [dufs](https://github.com/sigoden/dufs) as a file server for my users. I found that I can't operate a file which name contains \`#\` and \`?\`,
and I am sure that I've encoded the URL correctly.

### Prepare the minimal environment

![Phenomenon](./img/golang-http-url/Phenomenon.png)

First, I queried the server logs

\`\`\`text
2024-02-20T01:53:41Z INFO - 10.233.64.42 "HEAD /files/qsdizt-1703128686-ca6addedebab4017/sd-train.json" 404
2024-02-20T01:53:41Z INFO - 10.233.64.42 "MOVE /files/qsdizt-1703128686-ca6addedebab4017/sd-tra" 404
\`\`\`

The first log is a \`HEAD\` request which represents whether the destination file exists. The second log is a \`MOVE\` request which represents moving
the source file to the destination file. It is obvious that the request URL is wrong. I run the same request in my local environment(MacOS) and it
works. But the server is running in a container with MUSL. So I need to prepare a minimal environment to make sure whether it is a MUSL issue.

\`\`\`rust
pub type Request = hyper::Request<Incoming>;

pub async fn handle(self: Arc<Self>, req: Request) -> Result<Response> {
  let req_path = req.uri().path();
  ...
}
\`\`\`

I wrote a simple Rust program to simulate the server. The server will print the request URL and the request URL is correct. So it is not a MUSL
issue. And I've found it is ok to use other non-ASCII characters in the file name. Suddenly, I realized that the \`#\` and \`?\` are special
characters in the URL.

### The root cause

![architecture](./img/golang-http-url/architecture.png)

The architecture of the server is shown in the figure. In front of the server, there is an open-source gateway called [easegress](https://github.
com/easegress-io/easegress) and a self-developed reverse proxy.

* The gateway is responsible for handling the request from the client and forwarding the request to the different server, like terminal server, console
  server, etc.
* The reverse proxy is responsible for authenticating the request and finding the real pod to handle the request.

Both of them are written in Golang. So I need to find which part decodes the URL.

In the reverse proxy, I found the following code:

\`\`\`go
func buildReverseProxyCallback(resp http.ResponseWriter, req *http.Request, wcap *model.WebConsoleAccessParams) tunnel.SSHTunnelCallback {
	director := func(req *http.Request) {
		req.URL.Scheme = wcap.Protocol
		req.URL.Host = fmt.Sprintf("%s:%d", wcap.Host.HostIP, wcap.Port)
	}
	var proxyError error = nil
	errorHandler := func(resp http.ResponseWriter, req *http.Request, err error) {
		proxyError = err
		log.Printf("[GPUConsole] http: proxy error: %v", err)
		resp.WriteHeader(http.StatusBadGateway)
	}
	return func(dia tunnel.Dial, sshClient *ssh.Client) error {
		reverseProxy := &httputil.ReverseProxy{Director: director, ErrorHandler: errorHandler}
		myTransport := http.DefaultTransport.(*http.Transport).Clone()
		myTransport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
		if dia != nil {
			myTransport.DialContext = nil
			myTransport.Dial = dia
		}
		reverseProxy.Transport = myTransport
		reverseProxy.ServeHTTP(resp, req)
		return proxyError
	}
}
\`\`\`

The \`director\` function is responsible for setting the \`req.URL.Scheme\` and \`req.URL.Host\`. It doesn't decode the URL. So the issue is not in the
reverse proxy.

So I checked the gateway. The gateway is a bit complex. It has a lot of features, like rate limiting, authentication, etc. And I couldn't find
something contains \`escape\` or \`unescape\` in the code. So I decided to deploy a minimal http server to mock the production environment.

\`\`\`yaml
- https: false
  keepAlive: true
  keepAliveTimeout: 75s
  kind: HTTPServer
  maxConnections: 10240
  name: http-server-gpu-proxy
  port: 80
  rules:
    - paths:
        - backend: web-console-proxy
          clientMaxBodySize: -1
          pathPrefix: /
  version: easegress.megaease.com/v2
- filters:
    - kind: Proxy
      name: proxy
      pools:
        - loadBalance:
            policy: roundRobin
          serverMaxBodySize: -1
          servers:
            - url: http://10.108.162.15:38801
  flow:
    - filter: proxy
  kind: Pipeline
  name: web-console-proxy
\`\`\`

Then I executed the following command:

\`\`\`bash
curl http://localhost/files/qsdizt-1703128686-ca6addedebab4017/sd-tr%23ain.json
\`\`\`

The server printed the following log:

\`\`\`text
Feb 19 17:12:31 ds15 easegress-server[309509]: 2024-02-19T17:12:31.999Z        INFO Get /files/qsdizt-1703128686-ca6addedebab4017/sd-tr#ain.json
\`\`\`

The URL is decoded, so I read the source code of the gateway again. I found the following code:

\`\`\`go
func (spCtx *serverPoolContext) prepareRequest(svr *Server, ctx stdcontext.Context, mirror bool) error {
	req := spCtx.req

	url := svr.URL + req.Path()
	if rq := req.Std().URL.RawQuery; rq != "" {
		url += "?" + rq
	}
  ...
}

// Path returns path.
func (r *Request) Path() string {
	return r.Std().URL.Path
}
\`\`\`

And I read the [document](https://pkg.go.dev/net/url#URL) of the \`http.URL\`

\`\`\`text
Note that the Path field is stored in decoded form: /%47%6f%2f becomes /Go/. A consequence is that it is impossible to tell which slashes in the Path were slashes in the raw URL and which were %2f. This distinction is rarely important, but when it is, the code should use the URL.EscapedPath method, which preserves the original encoding of Path.

The RawPath field is an optional field which is only set when the default encoding of Path is different from the escaped path. See the EscapedPath method for more details.
\`\`\`

So the issue is in the gateway. The \`Path\` method decodes the URL. But why Golang decodes the URL? In rust and python Flask, the URL is not
decoded. The important thing is that the \`Path\` documentation doesn't mention it. I think the documentation should be
improved. In my opinion, the reason why Golang decodes the URL is that it is convenient for the developer, in most cases, the developer doesn't
need the original encoding of the URL.

`}function Y(){return A}function ss(){return[{depth:2,slug:"a-fun-bug-with-golangs-httpurl",text:"A Fun “Bug” with Golang’s http.URL"},{depth:3,slug:"prepare-the-minimal-environment",text:"Prepare the minimal environment"},{depth:3,slug:"the-root-cause",text:"The root cause"}]}const es=u((s,a,o)=>{const{layout:t,...e}=W;return e.file=Z,e.url=V,d`${f()}${T(A)}`});export{es as Content,Y as compiledContent,es as default,Z as file,W as frontmatter,ss as getHeadings,X as rawContent,V as url};
