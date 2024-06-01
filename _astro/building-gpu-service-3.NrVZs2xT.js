import{s as u,g as l}from"./_astro_assets.tMyGFUSa.js";import{c as g,r as h,m as d}from"./render-template.lJP2fRET.js";import{u as m}from"./hoisted.kO0M7P_y.js";import"./astro/assets-service.wdzbVTWi.js";const x={src:"/_astro/part3-fn-architecture.jOYa06ad.png",width:1837,height:1091,format:"png"},w={src:"/_astro/part3-tech-arc.U0xEjxfs.png",width:1780,height:988,format:"png"},f={src:"/_astro/part3-runtime-plane.yUZV-GV2.png",width:1688,height:1015,format:"png"},y={src:"/_astro/part3-state.4OeNYZMT.png",width:1117,height:1068,format:"png"},S={src:"/_astro/part3-stocks.0W0CarbZ.png",width:722,height:353,format:"png"},P={src:"/_astro/part3-gpu.wTWFlx9t.png",width:811,height:515,format:"png"},b={src:"/_astro/part3-access.JkgUpke1.png",width:796,height:343,format:"png"},_=async function(c){const t={};{const a=new RegExp('__ASTRO_IMAGE_="([^"]*\\./img/gpu-service/part3-fn-architecture\\.png[^"]*)"',"g");let n,e=0;for(;(n=a.exec(c))!==null;){const s="./img/gpu-service/part3-fn-architecture.png_"+e,r=JSON.parse(n[1].replace(/&#x22;/g,'"')),{src:i,...o}=r;t[s]=await l({src:x,...o}),e++}}{const a=new RegExp('__ASTRO_IMAGE_="([^"]*\\./img/gpu-service/part3-tech-arc\\.png[^"]*)"',"g");let n,e=0;for(;(n=a.exec(c))!==null;){const s="./img/gpu-service/part3-tech-arc.png_"+e,r=JSON.parse(n[1].replace(/&#x22;/g,'"')),{src:i,...o}=r;t[s]=await l({src:w,...o}),e++}}{const a=new RegExp('__ASTRO_IMAGE_="([^"]*\\./img/gpu-service/part3-runtime-plane\\.png[^"]*)"',"g");let n,e=0;for(;(n=a.exec(c))!==null;){const s="./img/gpu-service/part3-runtime-plane.png_"+e,r=JSON.parse(n[1].replace(/&#x22;/g,'"')),{src:i,...o}=r;t[s]=await l({src:f,...o}),e++}}{const a=new RegExp('__ASTRO_IMAGE_="([^"]*\\./img/gpu-service/part3-state\\.png[^"]*)"',"g");let n,e=0;for(;(n=a.exec(c))!==null;){const s="./img/gpu-service/part3-state.png_"+e,r=JSON.parse(n[1].replace(/&#x22;/g,'"')),{src:i,...o}=r;t[s]=await l({src:y,...o}),e++}}{const a=new RegExp('__ASTRO_IMAGE_="([^"]*\\./img/gpu-service/part3-stocks\\.png[^"]*)"',"g");let n,e=0;for(;(n=a.exec(c))!==null;){const s="./img/gpu-service/part3-stocks.png_"+e,r=JSON.parse(n[1].replace(/&#x22;/g,'"')),{src:i,...o}=r;t[s]=await l({src:S,...o}),e++}}{const a=new RegExp('__ASTRO_IMAGE_="([^"]*\\./img/gpu-service/part3-gpu\\.png[^"]*)"',"g");let n,e=0;for(;(n=a.exec(c))!==null;){const s="./img/gpu-service/part3-gpu.png_"+e,r=JSON.parse(n[1].replace(/&#x22;/g,'"')),{src:i,...o}=r;t[s]=await l({src:P,...o}),e++}}{const a=new RegExp('__ASTRO_IMAGE_="([^"]*\\./img/gpu-service/part3-access\\.png[^"]*)"',"g");let n,e=0;for(;(n=a.exec(c))!==null;){const s="./img/gpu-service/part3-access.png_"+e,r=JSON.parse(n[1].replace(/&#x22;/g,'"')),{src:i,...o}=r;t[s]=await l({src:b,...o}),e++}}return t};async function I(c){return _(c).then(t=>c.replaceAll(/__ASTRO_IMAGE_="([^"]+)"/gm,(a,n)=>{const e=JSON.parse(n.replace(/&#x22;/g,'"')),s=e.src+"_"+e.index;t[s].srcSet&&t[s].srcSet.values.length>0&&(t[s].attributes.srcset=t[s].srcSet.attribute);const{index:r,...i}=t[s].attributes;return u({src:t[s].src,...i})}))}const p=await I(`<h1 id="building-a-gpu-saas-platform">Building a GPU SaaS Platform</h1>
<p>Depending on the requirements of the application, the container technology would be a good choice for us. We could choose Docker or Kubernetes. We
could also use Block Storage, Object Storage, or File Storage, such as OpenEBS, MinIO, or Ceph. We could also use a cloud provider, such as AWS,
Azure, or GCP. So, how do we choose the right technology for our GPU SaaS platform? Let’s discuss it.</p>
<h2 id="technology-choices">Technology Choices</h2>
<h3 id="container-technology">Container Technology</h3>
<h4 id="docker">Docker</h4>
<ul>
<li>Pros
<ul>
<li>Easy to use, easy to operate</li>
<li>Flexible, we can use it for any requirements</li>
</ul>
</li>
<li>Cons
<ul>
<li>Not suitable for large-scale applications</li>
<li>We need to implement our own orchestration system, management the lifecycle of containers, and so on</li>
</ul>
</li>
</ul>
<h4 id="kubernetes">Kubernetes</h4>
<ul>
<li>Pros
<ul>
<li>Scalable, we can use it for large-scale applications</li>
<li>It has a lot of features, such as auto-scaling, self-healing, and so on</li>
</ul>
</li>
<li>Cons
<ul>
<li>Complex, we need to learn a lot of things</li>
</ul>
</li>
</ul>
<p>Depending on the workload, and human resources, I choose Kubernetes.</p>
<h3 id="storage-technology">Storage Technology</h3>



























































<table><thead><tr><th></th><th>MinIO</th><th>OpenEBS（jiva）</th><th>Rook(Ceph)</th></tr></thead><tbody><tr><td>support of community</td><td>No</td><td>yes</td><td>yes</td></tr><tr><td>storage type</td><td>Object</td><td>Block</td><td>Block, Object, File</td></tr><tr><td>deployment</td><td>Easy</td><td>Easy</td><td>Easy</td></tr><tr><td>operation</td><td>Easy</td><td>Complex</td><td>Complex</td></tr><tr><td>PVC auto-provision</td><td>directPV</td><td>yes</td><td>yes</td></tr><tr><td>IOPS</td><td></td><td></td><td></td></tr><tr><td>Big Data I/O</td><td></td><td></td><td></td></tr><tr><td>scheduling cost</td><td></td><td></td><td></td></tr></tbody></table>
<p>For our scenario</p>
<ul>
<li>the user need to store the model data which is large, around 10GB.</li>
<li>there will be many small files, around 100000 files for each user.</li>
<li>each user will have multiple storages.</li>
</ul>
<p>As you see above, there are some empty cells. We need to do some experiments to fill them. I will write another article about it. However, I could
tell you that Ceph is the best choice for us.</p>
<h3 id="other-technology">Other Technology</h3>
<p>There are many frameworks for our scenario, such as Kubeflow, JupyterHub, and so on. But, in this article, I would like to focus on how to develop
a GPU SaaS platform, so I will not discuss them.</p>
<h2 id="design-spec">Design Spec</h2>
<h3 id="architecture">Architecture</h3>
<h4 id="functional-architecture">Functional Architecture</h4>
<img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./img/gpu-service/part3-fn-architecture.png&#x22;,&#x22;alt&#x22;:&#x22;Functional Architecture&#x22;,&#x22;index&#x22;:0}">
<h4 id="technical-architecture">Technical Architecture</h4>
<img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./img/gpu-service/part3-tech-arc.png&#x22;,&#x22;alt&#x22;:&#x22;Technical Architecture&#x22;,&#x22;index&#x22;:0}">
<p>In this series, I will only focus on the runtime plane. I will not discuss the control plane, such as the management of users.</p>
<h3 id="runtime-plane">Runtime Plane</h3>
<p>I will use Kubernetes Operator to manage the lifecycle of the GPU instances. For MVP, I will only discuss one cluster. However, in the future,
when we need to scale out, I will discuss how to manage multiple clusters. So, let’s discuss the runtime plane.</p>
<img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./img/gpu-service/part3-runtime-plane.png&#x22;,&#x22;alt&#x22;:&#x22;Runtime Plane&#x22;,&#x22;index&#x22;:0}">
<ul>
<li>Ingress: control the access to the GPU instances, each user will have a unique URL to access their GPU instances.</li>
<li>Reverse Proxy: manage the access to the GPU instances, such as load balancing, authentication, and so on.</li>
<li>GPU Controller: manage the lifecycle of the GPU instances, such as create, delete, and so on.</li>
<li>Storage Service: manage the storage service, such as upload, download, and so on.</li>
</ul>
<h4 id="gpu-instance-state">GPU instance state</h4>
<img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./img/gpu-service/part3-state.png&#x22;,&#x22;alt&#x22;:&#x22;GPU instance state&#x22;,&#x22;index&#x22;:0}">
<ul>
<li>init: stock state, locks resources</li>
<li>ready: user starts the instance, but the readiness probe is not ready</li>
<li>running: the readiness probe is ready, the user can access the instance</li>
</ul>
<h4 id="create-stocks-of-gpu-instances">Create Stocks of GPU instances</h4>
<img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./img/gpu-service/part3-stocks.png&#x22;,&#x22;alt&#x22;:&#x22;Create Stocks of GPU instances&#x22;,&#x22;index&#x22;:0}">
<h4 id="user-starts-the-gpu-instance-with-the-storage">User starts the GPU instance with the storage</h4>
<img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./img/gpu-service/part3-gpu.png&#x22;,&#x22;alt&#x22;:&#x22;User starts the GPU instance with the storage&#x22;,&#x22;index&#x22;:0}">
<h4 id="user-access-the-gpu-instance">User access the GPU instance</h4>
<img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./img/gpu-service/part3-access.png&#x22;,&#x22;alt&#x22;:&#x22;User access the GPU instance&#x22;,&#x22;index&#x22;:0}">
<h4 id="operator-api">Operator API</h4>
<ul>
<li>Create Stocks</li>
</ul>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>POST /stocks</span></span>
<span class="line"><span></span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>  "number":      int,</span></span>
<span class="line"><span>  "operationID": string,</span></span>
<span class="line"><span>  "specName":    string,</span></span>
<span class="line"><span>  "cpu":         resource.Quantity,</span></span>
<span class="line"><span>  "memory":      resource.Quantity,</span></span>
<span class="line"><span>  "gpuType":     string,</span></span>
<span class="line"><span>  "gpuNum":      int,</span></span>
<span class="line"><span>}</span></span></code></pre>
<ul>
<li>Delete Stocks</li>
</ul>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>DELETE /stocks</span></span>
<span class="line"><span></span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>  "number":       int,</span></span>
<span class="line"><span>  "operationID":  string,</span></span>
<span class="line"><span>  "specName":	    string,</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span></code></pre>
<ul>
<li>Start GPU instance</li>
</ul>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>POST /gpu-instances</span></span>
<span class="line"><span></span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>  "instanceID":   string,</span></span>
<span class="line"><span>  "tenantID":     string,</span></span>
<span class="line"><span>  "tenantName":   string,</span></span>
<span class="line"><span>  "image":        string,</span></span>
<span class="line"><span>  "storageID":    string,</span></span>
<span class="line"><span>  "specName":     string,</span></span>
<span class="line"><span>  "template": {</span></span>
<span class="line"><span>    "ports": []{</span></span>
<span class="line"><span>      "port": int,</span></span>
<span class="line"><span>      "protocol": corev1.Protocol,</span></span>
<span class="line"><span>      "isPublic": bool,</span></span>
<span class="line"><span>      "isProbe": bool,</span></span>
<span class="line"><span>      "baseUrl": string,</span></span>
<span class="line"><span>    },</span></span>
<span class="line"><span>    "envs": []{</span></span>
<span class="line"><span>      "name": string,</span></span>
<span class="line"><span>      "value": string,</span></span>
<span class="line"><span>    },</span></span>
<span class="line"><span>    "cmd": string,</span></span>
<span class="line"><span>    "volumes": []{</span></span>
<span class="line"><span>      "name": string,</span></span>
<span class="line"><span>      "mountPath": string,</span></span>
<span class="line"><span>      "readOnly": bool,</span></span>
<span class="line"><span>    },</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>}</span></span></code></pre>
<ul>
<li>Stop GPU instance</li>
</ul>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>DELETE /gpu-instances/{instanceID}</span></span></code></pre>
<ul>
<li>GPU instance state</li>
</ul>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>GET /gpu-instances/{instanceID}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>response:</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>  "state": string,</span></span>
<span class="line"><span>}</span></span></code></pre>
<h4 id="storage-service-api">Storage Service API</h4>
<p>I would not discuss the design of the storage service in this article. However, I would list the API of the storage service.</p>
<ul>
<li>Create Storage</li>
<li>Delete Storage</li>
<li>Update Storage</li>
<li>Create Storage Accessor</li>
<li>Delete Storage Accessor</li>
</ul>`),v={title:"Building a GPU SaaS Platform - The design spec",publishDate:"3 March 2024",description:"Let's write down the design spec for our GPU SaaS platform.",tags:["GPU","SaaS","Kubernetes","Ceph"],minutesRead:"3 min read"},A="/home/runner/work/lokiwager.github.io/lokiwager.github.io/src/content/post/building-gpu-service-3.md",G=void 0;function E(){return`
# Building a GPU SaaS Platform

Depending on the requirements of the application, the container technology would be a good choice for us. We could choose Docker or Kubernetes. We
could also use Block Storage, Object Storage, or File Storage, such as OpenEBS, MinIO, or Ceph. We could also use a cloud provider, such as AWS,
Azure, or GCP. So, how do we choose the right technology for our GPU SaaS platform? Let's discuss it.

## Technology Choices

### Container Technology

#### Docker

- Pros
  - Easy to use, easy to operate
  - Flexible, we can use it for any requirements
- Cons
  - Not suitable for large-scale applications
  - We need to implement our own orchestration system, management the lifecycle of containers, and so on

#### Kubernetes

- Pros
  - Scalable, we can use it for large-scale applications
  - It has a lot of features, such as auto-scaling, self-healing, and so on
- Cons
  - Complex, we need to learn a lot of things

Depending on the workload, and human resources, I choose Kubernetes.

### Storage Technology

|                      | MinIO    | OpenEBS（jiva） | Rook(Ceph)          |
|----------------------|----------|---------------|---------------------|
| support of community | No       | yes           | yes                 |
| storage type         | Object   | Block         | Block, Object, File |
| deployment           | Easy     | Easy          | Easy                |
| operation            | Easy     | Complex       | Complex             |
| PVC auto-provision   | directPV | yes           | yes                 |
| IOPS                 |          |               |                     |
| Big Data I/O         |          |               |                     |
| scheduling cost      |          |               |                     |

For our scenario

- the user need to store the model data which is large, around 10GB.
- there will be many small files, around 100000 files for each user.
- each user will have multiple storages.

As you see above, there are some empty cells. We need to do some experiments to fill them. I will write another article about it. However, I could
tell you that Ceph is the best choice for us.

### Other Technology

There are many frameworks for our scenario, such as Kubeflow, JupyterHub, and so on. But, in this article, I would like to focus on how to develop
a GPU SaaS platform, so I will not discuss them.

## Design Spec

### Architecture

#### Functional Architecture

![Functional Architecture](./img/gpu-service/part3-fn-architecture.png)

#### Technical Architecture

![Technical Architecture](./img/gpu-service/part3-tech-arc.png)

In this series, I will only focus on the runtime plane. I will not discuss the control plane, such as the management of users.

### Runtime Plane

I will use Kubernetes Operator to manage the lifecycle of the GPU instances. For MVP, I will only discuss one cluster. However, in the future,
when we need to scale out, I will discuss how to manage multiple clusters. So, let's discuss the runtime plane.

![Runtime Plane](./img/gpu-service/part3-runtime-plane.png)

- Ingress: control the access to the GPU instances, each user will have a unique URL to access their GPU instances.
- Reverse Proxy: manage the access to the GPU instances, such as load balancing, authentication, and so on.
- GPU Controller: manage the lifecycle of the GPU instances, such as create, delete, and so on.
- Storage Service: manage the storage service, such as upload, download, and so on.

#### GPU instance state

![GPU instance state](./img/gpu-service/part3-state.png)

- init: stock state, locks resources
- ready: user starts the instance, but the readiness probe is not ready
- running: the readiness probe is ready, the user can access the instance

#### Create Stocks of GPU instances

![Create Stocks of GPU instances](./img/gpu-service/part3-stocks.png)

#### User starts the GPU instance with the storage

![User starts the GPU instance with the storage](./img/gpu-service/part3-gpu.png)

#### User access the GPU instance

![User access the GPU instance](./img/gpu-service/part3-access.png)

#### Operator API

- Create Stocks

\`\`\`text
POST /stocks

{
  "number":      int,
  "operationID": string,
  "specName":    string,
  "cpu":         resource.Quantity,
  "memory":      resource.Quantity,
  "gpuType":     string,
  "gpuNum":      int,
}
\`\`\`

- Delete Stocks

\`\`\`text
DELETE /stocks

{
  "number":       int,
  "operationID":  string,
  "specName":	    string,
}

\`\`\`

- Start GPU instance

\`\`\`text
POST /gpu-instances

{
  "instanceID":   string,
  "tenantID":     string,
  "tenantName":   string,
  "image":        string,
  "storageID":    string,
  "specName":     string,
  "template": {
    "ports": []{
      "port": int,
      "protocol": corev1.Protocol,
      "isPublic": bool,
      "isProbe": bool,
      "baseUrl": string,
    },
    "envs": []{
      "name": string,
      "value": string,
    },
    "cmd": string,
    "volumes": []{
      "name": string,
      "mountPath": string,
      "readOnly": bool,
    },
  }
}
\`\`\`

- Stop GPU instance

\`\`\`text
DELETE /gpu-instances/{instanceID}
\`\`\`

- GPU instance state

\`\`\`text
GET /gpu-instances/{instanceID}

response:
{
  "state": string,
}
\`\`\`

#### Storage Service API

I would not discuss the design of the storage service in this article. However, I would list the API of the storage service.

- Create Storage
- Delete Storage
- Update Storage
- Create Storage Accessor
- Delete Storage Accessor

`}function T(){return p}function D(){return[{depth:1,slug:"building-a-gpu-saas-platform",text:"Building a GPU SaaS Platform"},{depth:2,slug:"technology-choices",text:"Technology Choices"},{depth:3,slug:"container-technology",text:"Container Technology"},{depth:4,slug:"docker",text:"Docker"},{depth:4,slug:"kubernetes",text:"Kubernetes"},{depth:3,slug:"storage-technology",text:"Storage Technology"},{depth:3,slug:"other-technology",text:"Other Technology"},{depth:2,slug:"design-spec",text:"Design Spec"},{depth:3,slug:"architecture",text:"Architecture"},{depth:4,slug:"functional-architecture",text:"Functional Architecture"},{depth:4,slug:"technical-architecture",text:"Technical Architecture"},{depth:3,slug:"runtime-plane",text:"Runtime Plane"},{depth:4,slug:"gpu-instance-state",text:"GPU instance state"},{depth:4,slug:"create-stocks-of-gpu-instances",text:"Create Stocks of GPU instances"},{depth:4,slug:"user-starts-the-gpu-instance-with-the-storage",text:"User starts the GPU instance with the storage"},{depth:4,slug:"user-access-the-gpu-instance",text:"User access the GPU instance"},{depth:4,slug:"operator-api",text:"Operator API"},{depth:4,slug:"storage-service-api",text:"Storage Service API"}]}const R=g((c,t,a)=>{const{layout:n,...e}=v;return e.file=A,e.url=G,h`${d()}${m(p)}`});export{R as Content,T as compiledContent,R as default,A as file,v as frontmatter,D as getHeadings,E as rawContent,G as url};
