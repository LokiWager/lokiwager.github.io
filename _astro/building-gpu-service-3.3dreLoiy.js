import{s as l,g as e}from"./_astro_assets.jouYF5Ke.js";import{c,r as i,m as p}from"./render-template.OhhDDSMG.js";import{u}from"./hoisted.g1Y7Y87Y.js";import"./astro/assets-service.1mn5GyWb.js";const h={src:"/_astro/part3-fn-architecture.jOYa06ad.png",width:1837,height:1091,format:"png"},d={src:"/_astro/part3-tech-arc.U0xEjxfs.png",width:1780,height:988,format:"png"},g={src:"/_astro/part3-runtime-plane.yUZV-GV2.png",width:1688,height:1015,format:"png"},m={src:"/_astro/part3-state.4OeNYZMT.png",width:1117,height:1068,format:"png"},y=async function(){return{"./img/gpu-service/part3-fn-architecture.png":await e({src:h}),"./img/gpu-service/part3-tech-arc.png":await e({src:d}),"./img/gpu-service/part3-runtime-plane.png":await e({src:g}),"./img/gpu-service/part3-state.png":await e({src:m})}};async function F(s){return y().then(t=>s.replaceAll(/__ASTRO_IMAGE_="([^"]+)"/gm,(r,n)=>l({src:t[n].src,...t[n].attributes})))}const o=await F(`<h1 id="building-a-gpu-saas-platform">Building a GPU SaaS Platform</h1>
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
<img alt="Functional Architecture" __ASTRO_IMAGE_="./img/gpu-service/part3-fn-architecture.png">
<h4 id="technical-architecture">Technical Architecture</h4>
<img alt="Technical Architecture" __ASTRO_IMAGE_="./img/gpu-service/part3-tech-arc.png">
<p>In this series, I will only focus on the runtime plane. I will not discuss the control plane, such as the management of users.</p>
<h3 id="runtime-plane">Runtime Plane</h3>
<p>I will use Kubernetes Operator to manage the lifecycle of the GPU instances. For MVP, I will only discuss one cluster. However, in the future,
when we need to scale out, I will discuss how to manage multiple clusters. So, let’s discuss the runtime plane.</p>
<img alt="Runtime Plane" __ASTRO_IMAGE_="./img/gpu-service/part3-runtime-plane.png">
<ul>
<li>Ingress: control the access to the GPU instances, each user will have a unique URL to access their GPU instances.</li>
<li>Reverse Proxy: manage the access to the GPU instances, such as load balancing, authentication, and so on.</li>
<li>GPU Controller: manage the lifecycle of the GPU instances, such as create, delete, and so on.</li>
<li>Storage Service: manage the storage service, such as upload, download, and so on.</li>
</ul>
<h4 id="gpu-instance-state">GPU instance state</h4>
<img alt="GPU instance state" __ASTRO_IMAGE_="./img/gpu-service/part3-state.png">
<ul>
<li>init: stock state, locks resources</li>
<li>ready: user starts the instance, but the readiness probe is not ready</li>
<li>running: the readiness probe is ready, the user can access the instance</li>
</ul>
<h4 id="create-stocks-of-gpu-instances">Create Stocks of GPU instances</h4>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">sequenceDiagram</span></span>
<span class="line"><span style="color:#FF79C6">title:</span><span style="color:#F1FA8C"> Create stocks</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F8F8F2">mgmt service</span><span style="color:#FF79C6">->></span><span style="color:#F8F8F2">dispatcher</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> create stocks</span></span>
<span class="line"><span style="color:#F8F8F2">dispatcher</span><span style="color:#FF79C6">->></span><span style="color:#F8F8F2">distributed lock</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> require lock</span></span>
<span class="line"><span style="color:#F8F8F2">distributed lock</span><span style="color:#FF79C6">-->></span><span style="color:#F8F8F2">dispatcher</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> auth lock</span></span>
<span class="line"><span style="color:#F8F8F2">dispatcher</span><span style="color:#FF79C6">->></span><span style="color:#F8F8F2">status center</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> require remaining resources</span></span>
<span class="line"><span style="color:#F8F8F2">status center</span><span style="color:#FF79C6">-->></span><span style="color:#F8F8F2">dispatcher</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> remaining resources</span></span>
<span class="line"><span style="color:#F8F8F2">dispatcher</span><span style="color:#FF79C6">->></span><span style="color:#F8F8F2">operator</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> create stocks</span></span>
<span class="line"><span style="color:#F8F8F2">dispatcher</span><span style="color:#FF79C6">->></span><span style="color:#F8F8F2">distributed lock</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> release lock</span></span>
<span class="line"><span style="color:#F8F8F2">operator</span><span style="color:#FF79C6">-->></span><span style="color:#F8F8F2">status center</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> stock statistic &#x26; remain resouces</span></span>
<span class="line"><span style="color:#F8F8F2">operator</span><span style="color:#FF79C6">-->></span><span style="color:#F8F8F2">dispatcher</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> stocks event</span></span>
<span class="line"><span style="color:#F8F8F2">dispatcher</span><span style="color:#FF79C6">-->></span><span style="color:#F8F8F2">mgmt service</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> response event</span></span></code></pre>
<h4 id="user-starts-the-gpu-instance-with-the-storage">User starts the GPU instance with the storage</h4>
<h4 id="operator-api">Operator API</h4>
<ul>
<li>Create Stocks</li>
<li>Delete Stocks</li>
<li>Start GPU instance</li>
<li>Stop GPU instance</li>
<li>GPU instance state</li>
</ul>
<h4 id="storage-service-api">Storage Service API</h4>
<p>I would not discuss the design of the storage service in this article. However, I would list the API of the storage service.</p>
<ul>
<li>Create Storage</li>
<li>Delete Storage</li>
<li>Update Storage</li>
<li>Create Storage Accessor</li>
<li>Delete Storage Accessor</li>
</ul>`),f={title:"Building a GPU SaaS Platform - The design spec",publishDate:"3 March 2024",description:"Let's write down the design spec for our GPU SaaS platform.",tags:["GPU","SaaS","Kubernetes","Ceph"],minutesRead:"3 min read"},w="/home/runner/work/lokiwager.github.io/lokiwager.github.io/src/content/post/building-gpu-service-3.md",S=void 0;function A(){return`
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

\`\`\`mermaid
sequenceDiagram
title: Create stocks

mgmt service->>dispatcher: create stocks
dispatcher->>distributed lock: require lock
distributed lock-->>dispatcher: auth lock
dispatcher->>status center: require remaining resources
status center-->>dispatcher: remaining resources
dispatcher->>operator: create stocks
dispatcher->>distributed lock: release lock
operator-->>status center: stock statistic & remain resouces
operator-->>dispatcher: stocks event
dispatcher-->>mgmt service: response event
\`\`\`

#### User starts the GPU instance with the storage

#### Operator API

- Create Stocks
- Delete Stocks
- Start GPU instance
- Stop GPU instance
- GPU instance state

#### Storage Service API

I would not discuss the design of the storage service in this article. However, I would list the API of the storage service.

- Create Storage
- Delete Storage
- Update Storage
- Create Storage Accessor
- Delete Storage Accessor

`}function v(){return o}function I(){return[{depth:1,slug:"building-a-gpu-saas-platform",text:"Building a GPU SaaS Platform"},{depth:2,slug:"technology-choices",text:"Technology Choices"},{depth:3,slug:"container-technology",text:"Container Technology"},{depth:4,slug:"docker",text:"Docker"},{depth:4,slug:"kubernetes",text:"Kubernetes"},{depth:3,slug:"storage-technology",text:"Storage Technology"},{depth:3,slug:"other-technology",text:"Other Technology"},{depth:2,slug:"design-spec",text:"Design Spec"},{depth:3,slug:"architecture",text:"Architecture"},{depth:4,slug:"functional-architecture",text:"Functional Architecture"},{depth:4,slug:"technical-architecture",text:"Technical Architecture"},{depth:3,slug:"runtime-plane",text:"Runtime Plane"},{depth:4,slug:"gpu-instance-state",text:"GPU instance state"},{depth:4,slug:"create-stocks-of-gpu-instances",text:"Create Stocks of GPU instances"},{depth:4,slug:"user-starts-the-gpu-instance-with-the-storage",text:"User starts the GPU instance with the storage"},{depth:4,slug:"operator-api",text:"Operator API"},{depth:4,slug:"storage-service-api",text:"Storage Service API"}]}const G=c((s,t,r)=>{const{layout:n,...a}=f;return a.file=w,a.url=S,i`${p()}${u(o)}`});export{G as Content,v as compiledContent,G as default,w as file,f as frontmatter,I as getHeadings,A as rawContent,S as url};
