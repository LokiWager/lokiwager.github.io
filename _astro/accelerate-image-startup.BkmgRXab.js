import{s as c,g as d}from"./_astro_assets.0UhgFKBf.js";import{c as p,r as u,m}from"./render-template.rCiCpz-f.js";import{u as g}from"./hoisted.6ZpvY2Zp.js";import"./astro/assets-service.wdzbVTWi.js";const f={src:"/_astro/reduce-image.ty0CwkbT.png",width:2019,height:1003,format:"png"},y=async function(a){const e={};{const r=new RegExp('__ASTRO_IMAGE_="([^"]*\\./img/reduce-image/reduce-image\\.png[^"]*)"',"g");let o,t=0;for(;(o=r.exec(a))!==null;){const n="./img/reduce-image/reduce-image.png_"+t,i=JSON.parse(o[1].replace(/&#x22;/g,'"')),{src:s,...l}=i;e[n]=await d({src:f,...l}),t++}}return e};async function b(a){return y(a).then(e=>a.replaceAll(/__ASTRO_IMAGE_="([^"]+)"/gm,(r,o)=>{const t=JSON.parse(o.replace(/&#x22;/g,'"')),n=t.src+"_"+t.index;e[n].srcSet&&e[n].srcSet.values.length>0&&(e[n].attributes.srcset=e[n].srcSet.attribute);const{index:i,...s}=e[n].attributes;return c({src:e[n].src,...s})}))}const h=await b(`<p>In the previous article, we discussed the way to reduce the size of the Docker image. In this article, we will discuss how to accelerate the
startup of a large Docker image without reducing the size of it.</p>
<h2 id="containerd-snapshotter-plugin">Containerd Snapshotter Plugin</h2>
<p>The startup time of a container is mainly determined by the time <a href="https://medium.com/nttlabs/startup-containers-in-lightning-speed-with-lazy-image-distribution-on-containerd-243d94522361" rel="nofollow, noopener, noreferrer" target="_blank">pull the image and extract the image</a>.</p>
<p>So can we pull the image lazily? Can we only download the necessary layers of the image? In the above article, the author mentioned that the
containerd snapshotter plugin can help us to achieve this goal.</p>
<ul>
<li>Snapshotter is an interface that contains the methods for <code>mount</code> system call.
<ul>
<li>Each layer of an image and every container corresponds to a snapshot.</li>
<li>Snapshot likes a chain which can have a parent snapshot.</li>
<li>During image pulling, where layers are decompressed from bottom to top.</li>
<li>When running a container, to construct the container’s <code>rootfs</code>.</li>
</ul>
</li>
<li>Remote Snapshotter: Containerd allows snapshotters to reuse snapshots existing somewhere managed by them.</li>
<li>Reformat the layers of the image to make it addressable by the remote snapshotter.</li>
<li>The remote snapshotter can download the layers on-demand.</li>
</ul>
<h2 id="different-snapshotter-plugins">Different Snapshotter Plugins</h2>
<p>In the containerd, there are several snapshotter plugins available.</p>
<ul>
<li><a href="https://github.com/containerd/stargz-snapshotter" rel="nofollow, noopener, noreferrer" target="_blank">stargz-snapshotter</a>: A snapshotter plugin that supports the stargz format.</li>
<li><a href="https://github.com/containerd/nydus-snapshotter" rel="nofollow, noopener, noreferrer" target="_blank">nydus-snapshotter</a>: A snapshotter plugin that supports the Nydus format.</li>
<li><a href="https://github.com/containerd/accelerated-container-image" rel="nofollow, noopener, noreferrer" target="_blank">overlaybd-snapshotter</a>: A snapshotter plugin that supports the overlaybd format.</li>
</ul>
<p>Stargz and Nydus are two popular snapshotter plugins that have been widely used in the industry. But for me, I am more interested in the OverlayBD.
It is more deployable that can be easily integrated with the existing containerd. In my production environment, I have already used the OverlayBD.
The image which is more than 50GB can be started in 1 second, which is amazing. Of course, the startup time is also related to the network bandwidth.</p>
<img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./img/reduce-image/reduce-image.png&#x22;,&#x22;alt&#x22;:&#x22;Architecture&#x22;,&#x22;index&#x22;:0}">
<h2 id="troubleshooting">Troubleshooting</h2>
<ul>
<li>If you have some containers that are started before the OBD plugin is installed, you need to remove the images and then re-pull them.</li>
<li>If you have private registries, you need to configure the <code>config.json</code>, <code>cred.json</code> and <code>containerd/config.toml</code> files.</li>
</ul>
<h1 id="references">References</h1>
<ol>
<li><a href="https://dev.to/napicella/what-is-a-containerd-snapshotters-3eo2" rel="nofollow, noopener, noreferrer" target="_blank">https://dev.to/napicella/what-is-a-containerd-snapshotters-3eo2</a></li>
<li><a href="https://medium.com/nttlabs/startup-containers-in-lightning-speed-with-lazy-image-distribution-on-containerd-243d94522361" rel="nofollow, noopener, noreferrer" target="_blank">https://medium.com/nttlabs/startup-containers-in-lightning-speed-with-lazy-image-distribution-on-containerd-243d94522361</a></li>
<li><a href="https://github.com/containerd/containerd/blob/main/docs/remote-snapshotter.md" rel="nofollow, noopener, noreferrer" target="_blank">https://github.com/containerd/containerd/blob/main/docs/remote-snapshotter.md</a></li>
</ol>
<h1 id="off-topic">Off-topic</h1>
<p>I am so sorry that I have not written any articles for a long time. I have been busy with matters related to move to Canada. I have just settled
down here. Thank you for your patience. I will write more articles in the future.</p>`),w={title:"How to accelerate the startup of a large Docker image?",publishDate:"28 September 2024",description:"The Nvidia Docker image is too large for Kubernetes to extract. How to accelerate the startup of it?",tags:["Docker","Kubernetes","Image","GPU"],minutesRead:"2 min read"},v="/home/runner/work/lokiwager.github.io/lokiwager.github.io/src/content/post/accelerate-image-startup.md",I=void 0;function S(){return`
In the previous article, we discussed the way to reduce the size of the Docker image. In this article, we will discuss how to accelerate the
startup of a large Docker image without reducing the size of it.

## Containerd Snapshotter Plugin

The startup time of a container is mainly determined by the time [pull the image and extract the image](https://medium.com/nttlabs/startup-containers-in-lightning-speed-with-lazy-image-distribution-on-containerd-243d94522361).

So can we pull the image lazily? Can we only download the necessary layers of the image? In the above article, the author mentioned that the
containerd snapshotter plugin can help us to achieve this goal.

- Snapshotter is an interface that contains the methods for \`mount\` system call.
  - Each layer of an image and every container corresponds to a snapshot.
  - Snapshot likes a chain which can have a parent snapshot.
  - During image pulling, where layers are decompressed from bottom to top.
  - When running a container, to construct the container’s \`rootfs\`.
- Remote Snapshotter: Containerd allows snapshotters to reuse snapshots existing somewhere managed by them.
- Reformat the layers of the image to make it addressable by the remote snapshotter.
- The remote snapshotter can download the layers on-demand.

## Different Snapshotter Plugins

In the containerd, there are several snapshotter plugins available.

- [stargz-snapshotter](https://github.com/containerd/stargz-snapshotter): A snapshotter plugin that supports the stargz format.
- [nydus-snapshotter](https://github.com/containerd/nydus-snapshotter): A snapshotter plugin that supports the Nydus format.
- [overlaybd-snapshotter](https://github.com/containerd/accelerated-container-image): A snapshotter plugin that supports the overlaybd format.

Stargz and Nydus are two popular snapshotter plugins that have been widely used in the industry. But for me, I am more interested in the OverlayBD.
It is more deployable that can be easily integrated with the existing containerd. In my production environment, I have already used the OverlayBD.
The image which is more than 50GB can be started in 1 second, which is amazing. Of course, the startup time is also related to the network bandwidth.

![Architecture](./img/reduce-image/reduce-image.png)

## Troubleshooting

- If you have some containers that are started before the OBD plugin is installed, you need to remove the images and then re-pull them.
- If you have private registries, you need to configure the \`config.json\`, \`cred.json\` and \`containerd/config.toml\` files.

# References

1. https://dev.to/napicella/what-is-a-containerd-snapshotters-3eo2
2. https://medium.com/nttlabs/startup-containers-in-lightning-speed-with-lazy-image-distribution-on-containerd-243d94522361
3. https://github.com/containerd/containerd/blob/main/docs/remote-snapshotter.md

# Off-topic

I am so sorry that I have not written any articles for a long time. I have been busy with matters related to move to Canada. I have just settled
down here. Thank you for your patience. I will write more articles in the future.
`}function D(){return h}function T(){return[{depth:2,slug:"containerd-snapshotter-plugin",text:"Containerd Snapshotter Plugin"},{depth:2,slug:"different-snapshotter-plugins",text:"Different Snapshotter Plugins"},{depth:2,slug:"troubleshooting",text:"Troubleshooting"},{depth:1,slug:"references",text:"References"},{depth:1,slug:"off-topic",text:"Off-topic"}]}const A=p((a,e,r)=>{const{layout:o,...t}=w;return t.file=v,t.url=I,u`${m()}${g(h)}`});export{A as Content,D as compiledContent,A as default,v as file,w as frontmatter,T as getHeadings,S as rawContent,I as url};
