import{A as d,a as A,b as y,I as k,i as P,g as z}from"./astro/assets-service.1mn5GyWb.js";import{m as E}from"./hoisted.5ITtbDzT.js";import{a as l,c as I,r as u,m as S}from"./render-template.mrhESvQ5.js";const H="4.0.3";function L(){return o=>{if(typeof o=="string")throw new d({...A,message:A.message(JSON.stringify(o))});let r=[...Object.values(o)];if(r.length===0)throw new d({...y,message:y.message(JSON.stringify(o))});return Promise.all(r.map(i=>i()))}}function v(t){return{site:t?new URL(t):void 0,generator:`Astro v${H}`,glob:L()}}function n(t={},o,{class:r}={}){let i="";r&&(typeof t.class<"u"?t.class+=` ${r}`:typeof t["class:list"]<"u"?t["class:list"]=[t["class:list"],r]:t.class=r);for(const[e,a]of Object.entries(t))i+=l(a,e,!0);return E(i)}const T=v("https://astro-cactus.chriswilliams.dev/"),U=I(async(t,o,r)=>{const i=t.createAstro(T,o,r);i.self=U;const e=i.props;if(e.alt===void 0||e.alt===null)throw new d(k);typeof e.width=="string"&&(e.width=parseInt(e.width)),typeof e.height=="string"&&(e.height=parseInt(e.height));const a=await p(e),g={};return a.srcSet.values.length>0&&(g.srcset=a.srcSet.attribute),u`${S()}<img${l(a.src,"src")}${n(g)}${n(a.attributes)}>`},"/home/runner/work/lokiwager.github.io/lokiwager.github.io/node_modules/.pnpm/astro@4.0.3_typescript@5.3.3/node_modules/astro/components/Image.astro",void 0),J=v("https://astro-cactus.chriswilliams.dev/"),R=I(async(t,o,r)=>{const i=t.createAstro(J,o,r);i.self=R;const e=["webp"],a="png",g=["gif","svg","jpg","jpeg"],{formats:F=e,pictureAttributes:_={},fallbackFormat:f,...s}=i.props;if(s.alt===void 0||s.alt===null)throw new d(k);const O=await Promise.all(F.map(async $=>await p({...s,format:$,widths:s.widths,densities:s.densities})));let h=f??a;!f&&P(s.src)&&g.includes(s.src.format)&&(h=s.src.format);const m=await p({...s,format:h,widths:s.widths,densities:s.densities}),w={},b={};return s.sizes&&(b.sizes=s.sizes),m.srcSet.values.length>0&&(w.srcset=m.srcSet.attribute),u`${S()}<picture${n(_)}> ${Object.entries(O).map(([$,c])=>{const j=s.densities||!s.densities&&!s.widths?`${c.src}${c.srcSet.values.length>0?", "+c.srcSet.attribute:""}`:c.srcSet.attribute;return u`<source${l(j,"srcset")}${l("image/"+c.options.format,"type")}${n(b)}>`})} <img${l(m.src,"src")}${n(w)}${n(m.attributes)}> </picture>`},"/home/runner/work/lokiwager.github.io/lokiwager.github.io/node_modules/.pnpm/astro@4.0.3_typescript@5.3.3/node_modules/astro/components/Picture.astro",void 0),x={service:{entrypoint:"astro/assets/services/noop",config:{}},domains:["webmention.io"],remotePatterns:[]};new URL("file:///home/runner/work/lokiwager.github.io/lokiwager.github.io/dist/");const p=async t=>await z(t,x);export{p as g,n as s};
