import{A as l,I as i}from"./astro/assets-service.wdzbVTWi.js";import{H as y,i as w,r as u,m,e as b,a as S,b as R}from"./hoisted.t8dwiz7O.js";function T(r){return!(r.length!==3||!r[0]||typeof r[0]!="object")}function c(r,e,o){const t=e?.split("/").pop()?.replace(".astro","")??"",n=(...s)=>{if(!T(s))throw new l({...i,message:i.message(t)});return r(...s)};return Object.defineProperty(n,"name",{value:t,writable:!1}),n.isAstroComponentFactory=!0,n.moduleId=e,n.propagation=o,n}function g(r){return c(r.factory,r.moduleId,r.propagation)}function x(r,e,o){return typeof r=="function"?c(r,e,o):g(r)}const I=Symbol.for("astro:render");function A(r){return Object.defineProperty(r,I,{value:!0})}function*D(){yield A({type:"maybe-head"})}const f=Symbol.for("astro:slot-string");class C extends y{instructions;[f];constructor(e,o){super(e),this.instructions=o,this[f]=!0}}async function a(r,e){if(e=await e,e instanceof C)r.write(e);else if(w(e))r.write(e);else if(Array.isArray(e)){const o=e.map(t=>u(n=>a(n,t)));for(const t of o)t&&await t.renderToFinalDestination(r)}else if(typeof e=="function")await a(r,e());else if(typeof e=="string")r.write(m(b(e)));else if(!(!e&&e!==0))if(S(e))await e.render(r);else if(j(e))await e.render(r);else if(v(e))await e.render(r);else if(ArrayBuffer.isView(e))r.write(e);else if(typeof e=="object"&&(Symbol.asyncIterator in e||Symbol.iterator in e))for await(const o of e)await a(r,o);else r.write(e)}const P=Symbol.for("astro.componentInstance");function v(r){return typeof r=="object"&&!!r[P]}const p=Symbol.for("astro.renderTemplateResult");class H{[p]=!0;htmlParts;expressions;error;constructor(e,o){this.htmlParts=e,this.error=void 0,this.expressions=o.map(t=>R(t)?Promise.resolve(t).catch(n=>{if(!this.error)throw this.error=n,n}):t)}async render(e){const o=this.expressions.map(t=>u(n=>{if(t||t===0)return a(n,t)}));for(let t=0;t<this.htmlParts.length;t++){const n=this.htmlParts[t],s=o[t];e.write(m(n)),s&&await s.renderToFinalDestination(e)}}}function j(r){return typeof r=="object"&&!!r[p]}function F(r,...e){return new H(r,e)}export{x as c,D as m,F as r};
