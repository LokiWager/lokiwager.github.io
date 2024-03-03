import{s as o,g as n}from"./_astro_assets.Uyj6bBK5.js";import{c as l,r as c,m as h}from"./render-template._6r_y0Sf.js";import{u as g}from"./hoisted.WEX_2Tmk.js";import"./astro/assets-service.1mn5GyWb.js";const u={src:"/_astro/part2-stock.LXGy3miQ.png",width:3457,height:1706,format:"png"},m={src:"/_astro/part2-user.O9Ternjq.png",width:3002,height:2319,format:"png"},d={src:"/_astro/part2-storage.ADlGkIpz.png",width:2975,height:1028,format:"png"},p=async function(){return{"./img/gpu-service/part2-stock.png":await n({src:u}),"./img/gpu-service/part2-user.png":await n({src:m}),"./img/gpu-service/part2-storage.png":await n({src:d})}};async function f(s){return p().then(e=>s.replaceAll(/__ASTRO_IMAGE_="([^"]+)"/gm,(r,t)=>o({src:e[t].src,...e[t].attributes})))}const i=await f(`<h2 id="building-a-gpu-saas-platform">Building a GPU SaaS Platform</h2>
<p>As we discussed in the previous article, we will write a requirement document for our Stable Diffusion WebUI SaaS. This article is not a complete requirement document, but a guide to write a requirement document.</p>
<h3 id="background">Background</h3>
<p>AI drawing technology has been widely used in many fields, such as game design, animation, video processing, etc. However, it is really hard for
designers to prepare the environment to use the technology. Therefore, we want to build a Stable Diffusion WebUI SaaS for designers.</p>
<p><strong>Note</strong>: It is important to explain why we want to do this, and who will be our users.</p>
<h4 id="game-materials">Game materials</h4>
<p>In the game design field, designers need to prepare a lot of materials, such as characters, scenes, etc. In a common way, the PM will ask the
designer to draw some materials, but it is hard to satisfy the PM’s requirement in one time. So, the designer needs to draw the materials again and again.
By using the Stable Diffusion WebUI, the designer can generate the materials automatically, then modify them to satisfy the PM’s requirement. So, the designer can save a lot of time.</p>
<h4 id="lora-training">Lora training</h4>
<p>In the animation field, the Lora training is a time-consuming task. The Stable Diffusion WebUI can help the animator to train the Lora model easily.</p>
<p><strong>Note</strong>: It is good to explain the use cases of the platform.</p>
<h3 id="description-of-the-project">Description of the project</h3>
<h4 id="overall-description">Overall description</h4>
<ol>
<li><strong>Functional requirements</strong></li>
</ol>
<ul>
<li><strong>stock management</strong>: the platform should provide a stock management service for administrators.</li>
<li><strong>GPU service management</strong>: the platform should provide a GPU service management service for users.</li>
<li><strong>Storage service management</strong>: the platform should provide a storage service management service for users.</li>
</ul>
<ol start="2">
<li><strong>Non-functional requirements</strong></li>
</ol>
<ul>
<li><strong>tenant isolation</strong>: the platform should provide tenant isolation for users.</li>
<li><strong>distributed resource management</strong>: the GPU service and storage service should be distributed.</li>
<li><strong>security</strong>: users’ data should be secure, and users can only access their own data.</li>
<li><strong>services should be independent</strong>: the stock management, GPU service management, and storage service management should be independent.</li>
<li><strong>high availability</strong>: the platform should be highly available, SLA 99.99%.</li>
<li><strong>high performance</strong>: the platform should have high performance, the response time should be less than 100ms.</li>
</ul>
<h4 id="concept-definition">Concept definition</h4>
<ul>
<li><strong>GPU Specification</strong>: the GPU specification includes the GPU model, the number of GPU cores, the number of CPU cores, the memory size, the disk
size and the price.</li>
<li><strong>GPU Instance</strong>: the GPU instance is a running instance of the GPU service.</li>
<li><strong>Storage Specification</strong>: the storage specification includes the storage size, and the price.</li>
<li><strong>Storage</strong>: the storage is an independent volume that can be mounted to the GPU instance.</li>
<li><strong>GPU Instance Disk</strong>: the GPU instance disk is the disk of the GPU instance which is included in the GPU instance.</li>
</ul>
<h3 id="specific-requirements">Specific requirements</h3>
<h4 id="stock-management">stock management</h4>
<ul>
<li><strong>user operation flow</strong></li>
</ul>
<img alt="stock requirements" __ASTRO_IMAGE_="./img/gpu-service/part2-stock.png">
<ol>
<li>The administrator can add a new GPU specification.</li>
<li>The administrator can delete a GPU specification.</li>
<li>The administrator can add a stock of a GPU specification.</li>
<li>The administrator can delete a stock of a GPU specification.</li>
<li>The administrator can list the stocks.</li>
<li>The administrator can search the stocks by spec name.</li>
</ol>
<ul>
<li><strong>business flow</strong></li>
</ul>
<p>There will be two planes, the GPU management plane and the runtime plane. The GPU management plane should support the CRUD of the GPU
specification and the stock. The runtime plane should manage the real stock resources and report the stock status to the GPU management plane.</p>
<ol>
<li>The stock management service should support creating a bulk of same GPU specification stocks.</li>
<li>The stock management service should support deleting a bulk of same GPU specification stocks.</li>
<li>The stock management service should support listing the stock status.</li>
<li>The stock management service should support API for CRUD of the GPU specification and the stock.</li>
</ol>
<h4 id="gpu-service-management">GPU service management</h4>
<ul>
<li><strong>user operation flow</strong></li>
</ul>
<img alt="gpu requirements" __ASTRO_IMAGE_="./img/gpu-service/part2-user.png">
<ol>
<li>The user can create a GPU instance with a GPU specification, stable diffusion webui version, and storage.</li>
<li>The user can delete a GPU instance.</li>
<li>The user can list the GPU instances.</li>
<li>The user can start a GPU instance, and in the detail page, the user can access the webui.</li>
<li>The user can stop a GPU instance.</li>
<li>In the detail page, the user can see the GPU instance status, GPU monitoring, terminal, and logs.</li>
</ol>
<ul>
<li><strong>business flow</strong></li>
</ul>
<p>The GPU management plane is responsible for managing the GPU life cycle and cost. The runtime plane is responsible for managing the real GPU
resources, reporting the GPU status to the GPU management plane and starting the webui service.</p>
<ol>
<li>The GPU service management service should support creating a GPU instance.</li>
<li>The GPU service management service should support deleting a GPU instance.</li>
<li>The GPU service management service should support listing the GPU instances status.</li>
<li>The GPU service management service should support API for CRUD of the GPU instance.</li>
</ol>
<h4 id="storage-service-management">Storage service management</h4>
<ul>
<li><strong>user operation flow</strong></li>
</ul>
<img alt="storage requirements" __ASTRO_IMAGE_="./img/gpu-service/part2-storage.png">
<ol>
<li>The user can create a storage with a storage specification.</li>
<li>The user can delete a storage.</li>
<li>The user can list the storages.</li>
<li>The user can access UI for the storage.</li>
</ol>
<ul>
<li><strong>business flow</strong></li>
</ul>
<p>The storage management plane is responsible for managing the storage life cycle and cost. The runtime plane is responsible for managing the real storage resources and reporting the storage status to the storage management plane.</p>
<ol>
<li>The storage service management service should support creating a storage.</li>
<li>The storage service management service should support deleting a storage.</li>
<li>The storage service management service should support listing the storage status.</li>
<li>The storage service management service should support API for CRUD of the storage.</li>
<li>The storage service management service should support access UI for the storage.</li>
</ol>
<h3 id="overall">Overall</h3>
<p>It is a good practice to write a requirement document before starting to write the code. The requirement document should be detailed enough to let
the developers understand what they should do. It should also be flexible enough to let the developers have some space to design the architecture
and choose the technologies. In the next article, we will discuss the architecture of the platform, and choose the technologies, and write a
design spec. <strong>However, the article is a demo, not enough detailed to be a real requirement spec.</strong></p>`),v={title:"Building a GPU SaaS Platform - The requirement spec",publishDate:"26 February 2024",description:"How to write a requirement document for a GPU SaaS platform, and what should be included in the document.",tags:["GPU","SaaS","Kubernetes","Ceph"],minutesRead:"5 min read"},U="/home/runner/work/lokiwager.github.io/lokiwager.github.io/src/content/post/building-gpu-service-2.md",P=void 0;function k(){return`
## Building a GPU SaaS Platform

As we discussed in the previous article, we will write a requirement document for our Stable Diffusion WebUI SaaS. This article is not a complete requirement document, but a guide to write a requirement document.

### Background

AI drawing technology has been widely used in many fields, such as game design, animation, video processing, etc. However, it is really hard for
designers to prepare the environment to use the technology. Therefore, we want to build a Stable Diffusion WebUI SaaS for designers.

**Note**: It is important to explain why we want to do this, and who will be our users.

#### Game materials

In the game design field, designers need to prepare a lot of materials, such as characters, scenes, etc. In a common way, the PM will ask the
designer to draw some materials, but it is hard to satisfy the PM's requirement in one time. So, the designer needs to draw the materials again and again.
By using the Stable Diffusion WebUI, the designer can generate the materials automatically, then modify them to satisfy the PM's requirement. So, the designer can save a lot of time.

#### Lora training

In the animation field, the Lora training is a time-consuming task. The Stable Diffusion WebUI can help the animator to train the Lora model easily.

**Note**: It is good to explain the use cases of the platform.

### Description of the project

#### Overall description

1. **Functional requirements**

- **stock management**: the platform should provide a stock management service for administrators.
- **GPU service management**: the platform should provide a GPU service management service for users.
- **Storage service management**: the platform should provide a storage service management service for users.

2. **Non-functional requirements**

- **tenant isolation**: the platform should provide tenant isolation for users.
- **distributed resource management**: the GPU service and storage service should be distributed.
- **security**: users' data should be secure, and users can only access their own data.
- **services should be independent**: the stock management, GPU service management, and storage service management should be independent.
- **high availability**: the platform should be highly available, SLA 99.99%.
- **high performance**: the platform should have high performance, the response time should be less than 100ms.

#### Concept definition

- **GPU Specification**: the GPU specification includes the GPU model, the number of GPU cores, the number of CPU cores, the memory size, the disk
  size and the price.
- **GPU Instance**: the GPU instance is a running instance of the GPU service.
- **Storage Specification**: the storage specification includes the storage size, and the price.
- **Storage**: the storage is an independent volume that can be mounted to the GPU instance.
- **GPU Instance Disk**: the GPU instance disk is the disk of the GPU instance which is included in the GPU instance.

### Specific requirements

#### stock management

- **user operation flow**

![stock requirements](./img/gpu-service/part2-stock.png)

1. The administrator can add a new GPU specification.
2. The administrator can delete a GPU specification.
3. The administrator can add a stock of a GPU specification.
4. The administrator can delete a stock of a GPU specification.
5. The administrator can list the stocks.
6. The administrator can search the stocks by spec name.

- **business flow**

There will be two planes, the GPU management plane and the runtime plane. The GPU management plane should support the CRUD of the GPU
specification and the stock. The runtime plane should manage the real stock resources and report the stock status to the GPU management plane.

1. The stock management service should support creating a bulk of same GPU specification stocks.
2. The stock management service should support deleting a bulk of same GPU specification stocks.
3. The stock management service should support listing the stock status.
4. The stock management service should support API for CRUD of the GPU specification and the stock.

#### GPU service management

- **user operation flow**

![gpu requirements](./img/gpu-service/part2-user.png)

1. The user can create a GPU instance with a GPU specification, stable diffusion webui version, and storage.
2. The user can delete a GPU instance.
3. The user can list the GPU instances.
4. The user can start a GPU instance, and in the detail page, the user can access the webui.
5. The user can stop a GPU instance.
6. In the detail page, the user can see the GPU instance status, GPU monitoring, terminal, and logs.

- **business flow**

The GPU management plane is responsible for managing the GPU life cycle and cost. The runtime plane is responsible for managing the real GPU
resources, reporting the GPU status to the GPU management plane and starting the webui service.

1. The GPU service management service should support creating a GPU instance.
2. The GPU service management service should support deleting a GPU instance.
3. The GPU service management service should support listing the GPU instances status.
4. The GPU service management service should support API for CRUD of the GPU instance.

#### Storage service management

- **user operation flow**

![storage requirements](./img/gpu-service/part2-storage.png)

1. The user can create a storage with a storage specification.
2. The user can delete a storage.
3. The user can list the storages.
4. The user can access UI for the storage.

- **business flow**

The storage management plane is responsible for managing the storage life cycle and cost. The runtime plane is responsible for managing the real storage resources and reporting the storage status to the storage management plane.

1. The storage service management service should support creating a storage.
2. The storage service management service should support deleting a storage.
3. The storage service management service should support listing the storage status.
4. The storage service management service should support API for CRUD of the storage.
5. The storage service management service should support access UI for the storage.


### Overall

It is a good practice to write a requirement document before starting to write the code. The requirement document should be detailed enough to let
the developers understand what they should do. It should also be flexible enough to let the developers have some space to design the architecture
and choose the technologies. In the next article, we will discuss the architecture of the platform, and choose the technologies, and write a
design spec. **However, the article is a demo, not enough detailed to be a real requirement spec.**
`}function S(){return i}function y(){return[{depth:2,slug:"building-a-gpu-saas-platform",text:"Building a GPU SaaS Platform"},{depth:3,slug:"background",text:"Background"},{depth:4,slug:"game-materials",text:"Game materials"},{depth:4,slug:"lora-training",text:"Lora training"},{depth:3,slug:"description-of-the-project",text:"Description of the project"},{depth:4,slug:"overall-description",text:"Overall description"},{depth:4,slug:"concept-definition",text:"Concept definition"},{depth:3,slug:"specific-requirements",text:"Specific requirements"},{depth:4,slug:"stock-management",text:"stock management"},{depth:4,slug:"gpu-service-management",text:"GPU service management"},{depth:4,slug:"storage-service-management",text:"Storage service management"},{depth:3,slug:"overall",text:"Overall"}]}const I=l((s,e,r)=>{const{layout:t,...a}=v;return a.file=U,a.url=P,c`${h()}${g(i)}`});export{I as Content,S as compiledContent,I as default,U as file,v as frontmatter,y as getHeadings,k as rawContent,P as url};
