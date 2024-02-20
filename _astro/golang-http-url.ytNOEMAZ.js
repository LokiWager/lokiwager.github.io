import{c as E,m as ie,_ as pe,u as he}from"./hoisted.Jz8vZmVC.js";import{A as y,a as H,b as N,E as M,c as G,i as z,F as $,d as P,e as Fe,D as de,f as ye,g as se}from"./astro/assets-service.wdzbVTWi.js";import{c as k,r as B,m as L}from"./render-template.-sIJgcfb.js";const ue="4.4.0";function fe(){return s=>{if(typeof s=="string")throw new y({...H,message:H.message(JSON.stringify(s))});let t=[...Object.values(s)];if(t.length===0)throw new y({...N,message:N.message(JSON.stringify(s))});return Promise.all(t.map(n=>n()))}}function te(e){return{site:e?new URL(e):void 0,generator:`Astro v${ue}`,glob:fe()}}function g(e={},s,{class:t}={}){let n="";t&&(typeof e.class<"u"?e.class+=` ${t}`:typeof e["class:list"]<"u"?e["class:list"]=[e["class:list"],t]:e.class=t);for(const[a,o]of Object.entries(e))n+=E(o,a,!0);return ie(n)}const ge=new TextDecoder,c=(e,s=0,t=e.length)=>ge.decode(e.slice(s,t)),v=(e,s=0,t=e.length)=>e.slice(s,t).reduce((n,a)=>n+("0"+a.toString(16)).slice(-2),""),j=(e,s=0)=>{const t=e[s]+e[s+1]*256;return t|(t&2**15)*131070},T=(e,s=0)=>e[s]*2**8+e[s+1],F=(e,s=0)=>e[s]+e[s+1]*2**8,V=(e,s=0)=>e[s]+e[s+1]*2**8+e[s+2]*2**16,me=(e,s=0)=>e[s]+e[s+1]*2**8+e[s+2]*2**16+(e[s+3]<<24),i=(e,s=0)=>e[s]*2**24+e[s+1]*2**16+e[s+2]*2**8+e[s+3],w=(e,s=0)=>e[s]+e[s+1]*2**8+e[s+2]*2**16+e[s+3]*2**24,we={readUInt16BE:T,readUInt16LE:F,readUInt32BE:i,readUInt32LE:w};function d(e,s,t,n){t=t||0;const a=n?"BE":"LE",o="readUInt"+s+a;return we[o](e,t)}function ve(e,s){if(e.length-s<4)return;const t=i(e,s);if(!(e.length-s<t))return{name:c(e,4+s,8+s),offset:s,size:t}}function m(e,s,t){for(;t<e.length;){const n=ve(e,t);if(!n)break;if(n.name===s)return n;t+=n.size}}const be={validate:e=>c(e,0,2)==="BM",calculate:e=>({height:Math.abs(me(e,22)),width:w(e,18)})},Ee=1,Ce=6,Ie=16;function Y(e,s){const t=e[s];return t===0?256:t}function J(e,s){const t=Ce+s*Ie;return{height:Y(e,t+1),width:Y(e,t)}}const ne={validate(e){const s=F(e,0),t=F(e,4);return s!==0||t===0?!1:F(e,2)===Ee},calculate(e){const s=F(e,4),t=J(e,0);if(s===1)return t;const n=[t];for(let a=1;a<s;a+=1)n.push(J(e,a));return{height:t.height,images:n,width:t.width}}},xe=2,Be={validate(e){const s=F(e,0),t=F(e,4);return s!==0||t===0?!1:F(e,2)===xe},calculate:e=>ne.calculate(e)},Te={validate:e=>w(e,0)===542327876,calculate:e=>({height:w(e,12),width:w(e,16)})},Ae=/^GIF8[79]a/,Re={validate:e=>Ae.test(c(e,0,6)),calculate:e=>({height:F(e,8),width:F(e,6)})},ae={avif:"avif",mif1:"heif",msf1:"heif",heic:"heic",heix:"heic",hevc:"heic",hevx:"heic"};function Se(e,s,t){let n={};for(let a=s;a<=t;a+=4){const o=c(e,a,a+4);o in ae&&(n[o]=1)}if("avif"in n)return"avif";if("heic"in n||"heix"in n||"hevc"in n||"hevx"in n)return"heic";if("mif1"in n||"msf1"in n)return"heif"}const Pe={validate(e){const s=c(e,4,8),t=c(e,8,12);return s==="ftyp"&&t in ae},calculate(e){const s=m(e,"meta",0),t=s&&m(e,"iprp",s.offset+12),n=t&&m(e,"ipco",t.offset+8),a=n&&m(e,"ispe",n.offset+8);if(a)return{height:i(e,a.offset+16),width:i(e,a.offset+12),type:Se(e,8,s.offset)};throw new TypeError("Invalid HEIF, no size found")}},De=8,ke=4,Le=4,_e={ICON:32,"ICN#":32,"icm#":16,icm4:16,icm8:16,"ics#":16,ics4:16,ics8:16,is32:16,s8mk:16,icp4:16,icl4:32,icl8:32,il32:32,l8mk:32,icp5:32,ic11:32,ich4:48,ich8:48,ih32:48,h8mk:48,icp6:64,ic12:32,it32:128,t8mk:128,ic07:128,ic08:256,ic13:256,ic09:512,ic14:512,ic10:1024};function W(e,s){const t=s+Le;return[c(e,s,t),i(e,t)]}function Z(e){const s=_e[e];return{width:s,height:s,type:e}}const qe={validate:e=>c(e,0,4)==="icns",calculate(e){const s=e.length,t=i(e,ke);let n=De,a=W(e,n),o=Z(a[0]);if(n+=a[1],n===t)return o;const l={height:o.height,images:[o],width:o.width};for(;n<t&&n<s;)a=W(e,n),o=Z(a[0]),n+=a[1],l.images.push(o);return l}},Ue={validate:e=>v(e,0,4)==="ff4fff51",calculate:e=>({height:i(e,12),width:i(e,8)})},Oe={validate(e){if(i(e,4)!==1783636e3||i(e,0)<1)return!1;const s=m(e,"ftyp",0);return s?i(e,s.offset+4)===1718909296:!1},calculate(e){const s=m(e,"jp2h",0),t=s&&m(e,"ihdr",s.offset+8);if(t)return{height:i(e,t.offset+8),width:i(e,t.offset+12)};throw new TypeError("Unsupported JPEG 2000 format")}},He="45786966",Ne=2,D=6,Me=2,Ge="4d4d",ze="4949",K=12,$e=2;function je(e){return v(e,2,6)===He}function Ve(e,s){return{height:T(e,s),width:T(e,s+2)}}function Ye(e,s){const n=D+8,a=d(e,16,n,s);for(let o=0;o<a;o++){const l=n+$e+o*K,h=l+K;if(l>e.length)return;const p=e.slice(l,h);if(d(p,16,0,s)===274)return d(p,16,2,s)!==3||d(p,32,4,s)!==1?void 0:d(p,16,8,s)}}function Je(e,s){const t=e.slice(Ne,s),n=v(t,D,D+Me),a=n===Ge;if(a||n===ze)return Ye(t,a)}function We(e,s){if(s>e.length)throw new TypeError("Corrupt JPG, exceeded buffer limits")}const Ze={validate:e=>v(e,0,2)==="ffd8",calculate(e){e=e.slice(4);let s,t;for(;e.length;){const n=T(e,0);if(e[n]!==255){e=e.slice(1);continue}if(je(e)&&(s=Je(e,n)),We(e,n),t=e[n+1],t===192||t===193||t===194){const a=Ve(e,n+5);return s?{height:a.height,orientation:s,width:a.width}:a}e=e.slice(n+2)}throw new TypeError("Invalid JPG, no size found")}},Ke={validate:e=>{const s=c(e,1,7);return["KTX 11","KTX 20"].includes(s)},calculate:e=>{const s=e[5]===49?"ktx":"ktx2",t=s==="ktx"?36:20;return{height:w(e,t+4),width:w(e,t),type:s}}},Xe=`PNG\r

`,Qe="IHDR",X="CgBI",es={validate(e){if(Xe===c(e,1,8)){let s=c(e,12,16);if(s===X&&(s=c(e,28,32)),s!==Qe)throw new TypeError("Invalid PNG");return!0}return!1},calculate(e){return c(e,12,16)===X?{height:i(e,36),width:i(e,32)}:{height:i(e,20),width:i(e,16)}}},Q={P1:"pbm/ascii",P2:"pgm/ascii",P3:"ppm/ascii",P4:"pbm",P5:"pgm",P6:"ppm",P7:"pam",PF:"pfm"},ee={default:e=>{let s=[];for(;e.length>0;){const t=e.shift();if(t[0]!=="#"){s=t.split(" ");break}}if(s.length===2)return{height:parseInt(s[1],10),width:parseInt(s[0],10)};throw new TypeError("Invalid PNM")},pam:e=>{const s={};for(;e.length>0;){const t=e.shift();if(t.length>16||t.charCodeAt(0)>128)continue;const[n,a]=t.split(" ");if(n&&a&&(s[n.toLowerCase()]=parseInt(a,10)),s.height&&s.width)break}if(s.height&&s.width)return{height:s.height,width:s.width};throw new TypeError("Invalid PAM")}},ss={validate:e=>c(e,0,2)in Q,calculate(e){const s=c(e,0,2),t=Q[s],n=c(e,3).split(/[\r\n]+/);return(ee[t]||ee.default)(n)}},ts={validate:e=>c(e,0,4)==="8BPS",calculate:e=>({height:i(e,14),width:i(e,18)})},oe=/<svg\s([^>"']|"[^"]*"|'[^']*')*>/,x={height:/\sheight=(['"])([^%]+?)\1/,root:oe,viewbox:/\sviewBox=(['"])(.+?)\1/i,width:/\swidth=(['"])([^%]+?)\1/},S=2.54,re={in:96,cm:96/S,em:16,ex:8,m:96/S*100,mm:96/S/10,pc:96/72/12,pt:96/72,px:1},ns=new RegExp(`^([0-9.]+(?:e\\d+)?)(${Object.keys(re).join("|")})?$`);function A(e){const s=ns.exec(e);if(s)return Math.round(Number(s[1])*(re[s[2]]||1))}function as(e){const s=e.split(" ");return{height:A(s[3]),width:A(s[2])}}function os(e){const s=e.match(x.width),t=e.match(x.height),n=e.match(x.viewbox);return{height:t&&A(t[2]),viewbox:n&&as(n[2]),width:s&&A(s[2])}}function rs(e){return{height:e.height,width:e.width}}function ls(e,s){const t=s.width/s.height;return e.width?{height:Math.floor(e.width/t),width:e.width}:e.height?{height:e.height,width:Math.floor(e.height*t)}:{height:s.height,width:s.width}}const cs={validate:e=>oe.test(c(e,0,1e3)),calculate(e){const s=c(e).match(x.root);if(s){const t=os(s[0]);if(t.width&&t.height)return rs(t);if(t.viewbox)return ls(t,t.viewbox)}throw new TypeError("Invalid SVG")}},is={validate(e){return F(e,0)===0&&F(e,4)===0},calculate(e){return{height:F(e,14),width:F(e,12)}}};function ps(e,s){const t=d(e,32,4,s);return e.slice(t+2)}function hs(e,s){const t=d(e,16,8,s);return(d(e,16,10,s)<<16)+t}function Fs(e){if(e.length>24)return e.slice(12)}function ds(e,s){const t={};let n=e;for(;n&&n.length;){const a=d(n,16,0,s),o=d(n,16,2,s),l=d(n,32,4,s);if(a===0)break;l===1&&(o===3||o===4)&&(t[a]=hs(n,s)),n=Fs(n)}return t}function ys(e){const s=c(e,0,2);if(s==="II")return"LE";if(s==="MM")return"BE"}const us=["49492a00","4d4d002a"],fs={validate:e=>us.includes(v(e,0,4)),calculate(e){const s=ys(e)==="BE",t=ps(e,s),n=ds(t,s),a=n[256],o=n[257];if(!a||!o)throw new TypeError("Invalid Tiff. Missing tags");return{height:o,width:a}}};function gs(e){return{height:1+V(e,7),width:1+V(e,4)}}function ms(e){return{height:1+((e[4]&15)<<10|e[3]<<2|(e[2]&192)>>6),width:1+((e[2]&63)<<8|e[1])}}function ws(e){return{height:j(e,8)&16383,width:j(e,6)&16383}}const vs={validate(e){const s=c(e,0,4)==="RIFF",t=c(e,8,12)==="WEBP",n=c(e,12,15)==="VP8";return s&&t&&n},calculate(e){const s=c(e,12,16);if(e=e.slice(20,30),s==="VP8X"){const n=e[0],a=(n&192)===0,o=(n&1)===0;if(a&&o)return gs(e);throw new TypeError("Invalid WebP")}if(s==="VP8 "&&e[0]!==47)return ws(e);const t=v(e,3,6);if(s==="VP8L"&&t!=="9d012a")return ms(e);throw new TypeError("Invalid WebP")}},R=new Map([["bmp",be],["cur",Be],["dds",Te],["gif",Re],["heif",Pe],["icns",qe],["ico",ne],["j2c",Ue],["jp2",Oe],["jpg",Ze],["ktx",Ke],["png",es],["pnm",ss],["psd",ts],["svg",cs],["tga",is],["tiff",fs],["webp",vs]]),bs=Array.from(R.keys()),Es=new Map([[56,"psd"],[66,"bmp"],[68,"dds"],[71,"gif"],[73,"tiff"],[77,"tiff"],[82,"webp"],[105,"icns"],[137,"png"],[255,"jpg"]]);function Cs(e){const s=e[0],t=Es.get(s);return t&&R.get(t).validate(e)?t:bs.find(n=>R.get(n).validate(e))}const Is={disabledTypes:[]};function xs(e){const s=Cs(e);if(typeof s<"u"){if(Is.disabledTypes.indexOf(s)>-1)throw new TypeError("disabled file type: "+s);const t=R.get(s).calculate(e);if(t!==void 0)return t.type=t.type??s,t}throw new TypeError("unsupported file type: "+s)}async function Bs(e){const s=await fetch(e);if(!s.body||!s.ok)throw new Error("Failed to fetch image");const t=s.body.getReader();let n,a,o=new Uint8Array;for(;!n;){const l=await t.read();if(n=l.done,n)break;if(l.value){a=l.value;let h=new Uint8Array(o.length+a.length);h.set(o,0),h.set(a,o.length),o=h;try{const p=xs(o);if(p)return await t.cancel(),p}catch{}}}throw new Error("Failed to parse the size")}async function Ts(){if(!globalThis?.astroAsset?.imageService){const{default:e}=await pe(()=>import("./astro/assets-service.wdzbVTWi.js").then(s=>s.n),__vite__mapDeps([])).catch(s=>{const t=new y(ye);throw t.cause=s,t});return globalThis.astroAsset||(globalThis.astroAsset={}),globalThis.astroAsset.imageService=e,e}return globalThis.astroAsset.imageService}async function As(e,s){if(!e||typeof e!="object")throw new y({...M,message:M.message(JSON.stringify(e))});if(typeof e.src>"u")throw new y({...G,message:G.message(e.src,"undefined",JSON.stringify(e))});const t=await Ts(),n={...e,src:typeof e.src=="object"&&"then"in e.src?(await e.src).default??await e.src:e.src};if(e.inferSize&&z(n.src))try{const r=await Bs(n.src);n.width??=r.width,n.height??=r.height,delete n.inferSize}catch{throw new y({...$,message:$.message(n.src)})}const a=P(n.src)?n.src.fsPath:n.src,o=P(n.src)?n.src.clone??n.src:n.src;n.src=o;const l=t.validateOptions?await t.validateOptions(n,s):n,h=t.getSrcSet?await t.getSrcSet(l,s):[];let p=await t.getURL(l,s),u=await Promise.all(h.map(async r=>({transform:r.transform,url:await t.getURL(r.transform,s),descriptor:r.descriptor,attributes:r.attributes})));if(Fe(t)&&globalThis.astroAsset.addStaticImage&&!(z(l.src)&&p===l.src)){const r=t.propertiesToHash??de;p=globalThis.astroAsset.addStaticImage(l,r,a),u=h.map(f=>({transform:f.transform,url:globalThis.astroAsset.addStaticImage(f.transform,r,a),descriptor:f.descriptor,attributes:f.attributes}))}return{rawOptions:n,options:l,src:p,srcSet:{values:u,attribute:u.map(r=>`${r.url} ${r.descriptor}`).join(", ")},attributes:t.getHTMLAttributes!==void 0?await t.getHTMLAttributes(l,s):{}}}const Rs=te("https://astro-cactus.chriswilliams.dev/"),Ss=k(async(e,s,t)=>{const n=e.createAstro(Rs,s,t);n.self=Ss;const a=n.props;if(a.alt===void 0||a.alt===null)throw new y(se);typeof a.width=="string"&&(a.width=parseInt(a.width)),typeof a.height=="string"&&(a.height=parseInt(a.height));const o=await C(a),l={};return o.srcSet.values.length>0&&(l.srcset=o.srcSet.attribute),B`${L()}<img${E(o.src,"src")}${g(l)}${g(o.attributes)}>`},"/home/runner/work/lokiwager.github.io/lokiwager.github.io/node_modules/.pnpm/astro@4.4.0_typescript@5.3.3/node_modules/astro/components/Image.astro",void 0),Ps=te("https://astro-cactus.chriswilliams.dev/"),Ds=k(async(e,s,t)=>{const n=e.createAstro(Ps,s,t);n.self=Ds;const a=["webp"],o="png",l=["gif","svg","jpg","jpeg"],{formats:h=a,pictureAttributes:p={},fallbackFormat:u,...r}=n.props;if(r.alt===void 0||r.alt===null)throw new y(se);const f=await Promise.all(h.map(async O=>await C({...r,format:O,widths:r.widths,densities:r.densities})));let _=u??o;!u&&P(r.src)&&l.includes(r.src.format)&&(_=r.src.format);const I=await C({...r,format:_,widths:r.widths,densities:r.densities}),q={},U={};return r.sizes&&(U.sizes=r.sizes),I.srcSet.values.length>0&&(q.srcset=I.srcSet.attribute),B`${L()}<picture${g(p)}> ${Object.entries(f).map(([O,b])=>{const ce=r.densities||!r.densities&&!r.widths?`${b.src}${b.srcSet.values.length>0?", "+b.srcSet.attribute:""}`:b.srcSet.attribute;return B`<source${E(ce,"srcset")}${E("image/"+b.options.format,"type")}${g(U)}>`})} <img${E(I.src,"src")}${g(q)}${g(I.attributes)}> </picture>`},"/home/runner/work/lokiwager.github.io/lokiwager.github.io/node_modules/.pnpm/astro@4.4.0_typescript@5.3.3/node_modules/astro/components/Picture.astro",void 0),ks={service:{entrypoint:"astro/assets/services/noop",config:{}},domains:["webmention.io"],remotePatterns:[]};new URL("file:///home/runner/work/lokiwager.github.io/lokiwager.github.io/dist/");const C=async e=>await As(e,ks),Ls={src:"/_astro/Phenomenon.T5BBGCJ2.png",width:946,height:644,format:"png"},_s={src:"/_astro/architecture.RS8kTfPP.png",width:2032,height:737,format:"png"},qs=async function(e){const s={};{const t=new RegExp('__ASTRO_IMAGE_="([^"]*\\./img/golang-http-url/Phenomenon\\.png[^"]*)"',"g");let n,a=0;for(;(n=t.exec(e))!==null;){const o="./img/golang-http-url/Phenomenon.png_"+a,l=JSON.parse(n[1].replace(/&#x22;/g,'"')),{src:h,...p}=l;s[o]=await C({src:Ls,...p}),a++}}{const t=new RegExp('__ASTRO_IMAGE_="([^"]*\\./img/golang-http-url/architecture\\.png[^"]*)"',"g");let n,a=0;for(;(n=t.exec(e))!==null;){const o="./img/golang-http-url/architecture.png_"+a,l=JSON.parse(n[1].replace(/&#x22;/g,'"')),{src:h,...p}=l;s[o]=await C({src:_s,...p}),a++}}return s};async function Us(e){return qs(e).then(s=>e.replaceAll(/__ASTRO_IMAGE_="([^"]+)"/gm,(t,n)=>{const a=JSON.parse(n.replace(/&#x22;/g,'"')),o=a.src+"_"+a.index;s[o].srcSet&&s[o].srcSet.values.length>0&&(s[o].attributes.srcset=s[o].srcSet.attribute);const{index:l,...h}=s[o].attributes;return g({src:s[o].src,...h})}))}const le=await Us(`<h2 id="a-fun-bug-with-golangs-httpurl">A Fun “Bug” with Golang’s http.URL</h2>
<p>I recently encountered an interesting issue that I thought the steps I took to troubleshoot might be worth sharing. I use an open-source project
called <a href="https://github.com/sigoden/dufs" rel="nofollow, noopener, noreferrer" target="_blank">dufs</a> as a file server for my users. I found that I can’t operate a file which name contains <code>#</code> and <code>?</code>,
and I am sure that I’ve encoded the URL correctly.</p>
<h3 id="prepare-the-minimal-environment">Prepare the minimal environment</h3>
<img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./img/golang-http-url/Phenomenon.png&#x22;,&#x22;alt&#x22;:&#x22;Phenomenon&#x22;,&#x22;index&#x22;:0}">
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
<img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./img/golang-http-url/architecture.png&#x22;,&#x22;alt&#x22;:&#x22;architecture&#x22;,&#x22;index&#x22;:0}">
<p>The architecture of the server is shown in the figure. In front of the server, there is an open-source gateway called [easegress](<a href="https://github" rel="nofollow, noopener, noreferrer" target="_blank">https://github</a>.
com/easegress-io/easegress) and a self-developed reverse proxy.</p>
<ul>
<li>The gateway is responsible for handling the request from the client and forwarding the request to the different server, like terminal server, console
server, etc.</li>
<li>The reverse proxy is responsible for authenticating the request and finding the real pod to handle the request.</li>
</ul>
<p>Both of them are written in Golang. So I need to find which part decodes the URL.</p>
<p>In the reverse proxy, I found the following code:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#50FA7B"> buildReverseProxyCallback</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">resp</span><span style="color:#8BE9FD;font-style:italic"> http</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">ResponseWriter</span><span style="color:#F8F8F2">, </span><span style="color:#FFB86C;font-style:italic">req</span><span style="color:#FF79C6"> *</span><span style="color:#8BE9FD;font-style:italic">http</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Request</span><span style="color:#F8F8F2">, </span><span style="color:#FFB86C;font-style:italic">wcap</span><span style="color:#FF79C6"> *</span><span style="color:#8BE9FD;font-style:italic">model</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">WebConsoleAccessParams</span><span style="color:#F8F8F2">) </span><span style="color:#8BE9FD;font-style:italic">tunnel</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">SSHTunnelCallback</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">	director </span><span style="color:#FF79C6">:=</span><span style="color:#FF79C6"> func</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">req</span><span style="color:#FF79C6"> *</span><span style="color:#8BE9FD;font-style:italic">http</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Request</span><span style="color:#F8F8F2">) {</span></span>
<span class="line"><span style="color:#F8F8F2">		req.URL.Scheme </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> wcap.Protocol</span></span>
<span class="line"><span style="color:#F8F8F2">		req.URL.Host </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> fmt.</span><span style="color:#50FA7B">Sprintf</span><span style="color:#F8F8F2">(</span><span style="color:#E9F284">"</span><span style="color:#BD93F9">%s</span><span style="color:#F1FA8C">:</span><span style="color:#BD93F9">%d</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, wcap.Host.HostIP, wcap.Port)</span></span>
<span class="line"><span style="color:#F8F8F2">	}</span></span>
<span class="line"><span style="color:#FF79C6">	var</span><span style="color:#F8F8F2"> proxyError </span><span style="color:#8BE9FD;font-style:italic">error</span><span style="color:#FF79C6"> =</span><span style="color:#BD93F9"> nil</span></span>
<span class="line"><span style="color:#F8F8F2">	errorHandler </span><span style="color:#FF79C6">:=</span><span style="color:#FF79C6"> func</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">resp</span><span style="color:#8BE9FD;font-style:italic"> http</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">ResponseWriter</span><span style="color:#F8F8F2">, </span><span style="color:#FFB86C;font-style:italic">req</span><span style="color:#FF79C6"> *</span><span style="color:#8BE9FD;font-style:italic">http</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Request</span><span style="color:#F8F8F2">, </span><span style="color:#FFB86C;font-style:italic">err</span><span style="color:#8BE9FD;font-style:italic"> error</span><span style="color:#F8F8F2">) {</span></span>
<span class="line"><span style="color:#F8F8F2">		proxyError </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> err</span></span>
<span class="line"><span style="color:#F8F8F2">		log.</span><span style="color:#50FA7B">Printf</span><span style="color:#F8F8F2">(</span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">[GPUConsole] http: proxy error: </span><span style="color:#BD93F9">%v</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">, err)</span></span>
<span class="line"><span style="color:#F8F8F2">		resp.</span><span style="color:#50FA7B">WriteHeader</span><span style="color:#F8F8F2">(http.StatusBadGateway)</span></span>
<span class="line"><span style="color:#F8F8F2">	}</span></span>
<span class="line"><span style="color:#FF79C6">	return</span><span style="color:#FF79C6"> func</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">dia</span><span style="color:#8BE9FD;font-style:italic"> tunnel</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Dial</span><span style="color:#F8F8F2">, </span><span style="color:#FFB86C;font-style:italic">sshClient</span><span style="color:#FF79C6"> *</span><span style="color:#8BE9FD;font-style:italic">ssh</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Client</span><span style="color:#F8F8F2">) </span><span style="color:#8BE9FD;font-style:italic">error</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">		reverseProxy </span><span style="color:#FF79C6">:=</span><span style="color:#FF79C6"> &#x26;</span><span style="color:#8BE9FD;font-style:italic">httputil</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">ReverseProxy</span><span style="color:#F8F8F2">{Director: director, ErrorHandler: errorHandler}</span></span>
<span class="line"><span style="color:#F8F8F2">		myTransport </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> http.DefaultTransport.(</span><span style="color:#FF79C6">*</span><span style="color:#8BE9FD;font-style:italic">http</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Transport</span><span style="color:#F8F8F2">).</span><span style="color:#50FA7B">Clone</span><span style="color:#F8F8F2">()</span></span>
<span class="line"><span style="color:#F8F8F2">		myTransport.TLSClientConfig </span><span style="color:#FF79C6">=</span><span style="color:#FF79C6"> &#x26;</span><span style="color:#8BE9FD;font-style:italic">tls</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Config</span><span style="color:#F8F8F2">{InsecureSkipVerify: </span><span style="color:#BD93F9">true</span><span style="color:#F8F8F2">}</span></span>
<span class="line"><span style="color:#FF79C6">		if</span><span style="color:#F8F8F2"> dia </span><span style="color:#FF79C6">!=</span><span style="color:#BD93F9"> nil</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">			myTransport.DialContext </span><span style="color:#FF79C6">=</span><span style="color:#BD93F9"> nil</span></span>
<span class="line"><span style="color:#F8F8F2">			myTransport.Dial </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> dia</span></span>
<span class="line"><span style="color:#F8F8F2">		}</span></span>
<span class="line"><span style="color:#F8F8F2">		reverseProxy.Transport </span><span style="color:#FF79C6">=</span><span style="color:#F8F8F2"> myTransport</span></span>
<span class="line"><span style="color:#F8F8F2">		reverseProxy.</span><span style="color:#50FA7B">ServeHTTP</span><span style="color:#F8F8F2">(resp, req)</span></span>
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
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">func</span><span style="color:#F8F8F2"> (</span><span style="color:#FFB86C;font-style:italic">spCtx </span><span style="color:#FF79C6">*</span><span style="color:#8BE9FD;font-style:italic">serverPoolContext</span><span style="color:#F8F8F2">) </span><span style="color:#50FA7B">prepareRequest</span><span style="color:#F8F8F2">(</span><span style="color:#FFB86C;font-style:italic">svr</span><span style="color:#FF79C6"> *</span><span style="color:#8BE9FD;font-style:italic">Server</span><span style="color:#F8F8F2">, </span><span style="color:#FFB86C;font-style:italic">ctx</span><span style="color:#8BE9FD;font-style:italic"> stdcontext</span><span style="color:#F8F8F2">.</span><span style="color:#8BE9FD;font-style:italic">Context</span><span style="color:#F8F8F2">, </span><span style="color:#FFB86C;font-style:italic">mirror</span><span style="color:#8BE9FD;font-style:italic"> bool</span><span style="color:#F8F8F2">) </span><span style="color:#8BE9FD;font-style:italic">error</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">	req </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> spCtx.req</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F8F8F2">	url </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> svr.URL </span><span style="color:#FF79C6">+</span><span style="color:#F8F8F2"> req.</span><span style="color:#50FA7B">Path</span><span style="color:#F8F8F2">()</span></span>
<span class="line"><span style="color:#FF79C6">	if</span><span style="color:#F8F8F2"> rq </span><span style="color:#FF79C6">:=</span><span style="color:#F8F8F2"> req.</span><span style="color:#50FA7B">Std</span><span style="color:#F8F8F2">().URL.RawQuery; rq </span><span style="color:#FF79C6">!=</span><span style="color:#E9F284"> ""</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#F8F8F2">		url </span><span style="color:#FF79C6">+=</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C">?</span><span style="color:#E9F284">"</span><span style="color:#FF79C6"> +</span><span style="color:#F8F8F2"> rq</span></span>
<span class="line"><span style="color:#F8F8F2">	}</span></span>
<span class="line"><span style="color:#FF79C6">  ...</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6272A4">// Path returns path.</span></span>
<span class="line"><span style="color:#FF79C6">func</span><span style="color:#F8F8F2"> (</span><span style="color:#FFB86C;font-style:italic">r </span><span style="color:#FF79C6">*</span><span style="color:#8BE9FD;font-style:italic">Request</span><span style="color:#F8F8F2">) </span><span style="color:#50FA7B">Path</span><span style="color:#F8F8F2">() </span><span style="color:#8BE9FD;font-style:italic">string</span><span style="color:#F8F8F2"> {</span></span>
<span class="line"><span style="color:#FF79C6">	return</span><span style="color:#F8F8F2"> r.</span><span style="color:#50FA7B">Std</span><span style="color:#F8F8F2">().URL.Path</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span></code></pre>
<p>And I read the <a href="https://pkg.go.dev/net/url#URL" rel="nofollow, noopener, noreferrer" target="_blank">document</a> of the <code>http.URL</code></p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>Note that the Path field is stored in decoded form: /%47%6f%2f becomes /Go/. A consequence is that it is impossible to tell which slashes in the Path were slashes in the raw URL and which were %2f. This distinction is rarely important, but when it is, the code should use the URL.EscapedPath method, which preserves the original encoding of Path.</span></span>
<span class="line"><span></span></span>
<span class="line"><span>The RawPath field is an optional field which is only set when the default encoding of Path is different from the escaped path. See the EscapedPath method for more details.</span></span></code></pre>
<p>So the issue is in the gateway. The <code>Path</code> method decodes the URL. But why Golang decodes the URL? In rust and python Flask, the URL is not
decoded. The important thing is that the <code>Path</code> documentation doesn’t mention it. I think the documentation should be
improved. In my opinion, the reason why Golang decodes the URL is that it is convenient for the developer, in most cases, the developer doesn’t
need the original encoding of the URL.</p>`),Os={title:`A Fun "Bug" with Golang's http.URL`,publishDate:"20 February 2024",description:"Documenting an interesting Online issue troubleshooting journey",tags:["Golang","Network"],minutesRead:"4 min read"},Hs="/home/runner/work/lokiwager.github.io/lokiwager.github.io/src/content/post/golang-http-url.md",Ns=void 0;function $s(){return`
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

`}function js(){return le}function Vs(){return[{depth:2,slug:"a-fun-bug-with-golangs-httpurl",text:"A Fun “Bug” with Golang’s http.URL"},{depth:3,slug:"prepare-the-minimal-environment",text:"Prepare the minimal environment"},{depth:3,slug:"the-root-cause",text:"The root cause"}]}const Ys=k((e,s,t)=>{const{layout:n,...a}=Os;return a.file=Hs,a.url=Ns,B`${L()}${he(le)}`});export{Ys as Content,js as compiledContent,Ys as default,Hs as file,Os as frontmatter,Vs as getHeadings,$s as rawContent,Ns as url};
function __vite__mapDeps(indexes) {
  if (!__vite__mapDeps.viteFileDeps) {
    __vite__mapDeps.viteFileDeps = []
  }
  return indexes.map((i) => __vite__mapDeps.viteFileDeps[i])
}
