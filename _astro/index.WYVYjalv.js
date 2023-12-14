import{R as m,m as u,F as d}from"./hoisted.olnA_1KT.js";import{$ as g}from"./_astro_assets.rh-e-Ufv.js";import"./astro/assets-service.1mn5GyWb.js";import"./render-template.LEH1zC1t.js";const p="astro:jsx",i=Symbol("empty"),a=n=>n;function s(n){return n&&typeof n=="object"&&n[p]}function y(n){if(typeof n.type=="string")return n;const e={};if(s(n.props.children)){const r=n.props.children;if(!s(r)||!("slot"in r.props))return;const o=a(r.props.slot);e[o]=[r],e[o].$$slot=!0,delete r.props.slot,delete n.props.children}Array.isArray(n.props.children)&&(n.props.children=n.props.children.map(r=>{if(!s(r)||!("slot"in r.props))return r;const o=a(r.props.slot);return Array.isArray(e[o])?e[o].push(r):(e[o]=[r],e[o].$$slot=!0),delete r.props.slot,i}).filter(r=>r!==i)),Object.assign(n.props,e)}function h(n){return typeof n=="string"?u(n):Array.isArray(n)?n.map(e=>h(e)):n}function f(n){if("set:html"in n.props||"set:text"in n.props){if("set:html"in n.props){const e=h(n.props["set:html"]);delete n.props["set:html"],Object.assign(n.props,{children:e});return}if("set:text"in n.props){const e=n.props["set:text"];delete n.props["set:text"],Object.assign(n.props,{children:e});return}}}function t(n,e){const r={[m]:"astro:jsx",[p]:!0,type:n,props:e??{}};return f(r),y(r),r}const w={src:"/_astro/pug.eWeVCgIi.jpeg",width:550,height:460,format:"jpg",orientation:1},b={title:"Testing testing 123!",publishDate:"13 May 2022",description:"Hello world!!! This is an example blog post showcasing some of the cool stuff Astro Cactus theme can do.",tags:["example","blog","cool"],minutesRead:"1 min read"};function _(){return[{depth:2,slug:"hello-world",text:"Hello World"},{depth:2,slug:"using-some-markdown-elements",text:"Using some markdown elements"},{depth:2,slug:"tailwind-css-prose-styling",text:"Tailwind CSS Prose styling"}]}const C=!0;function c(n){const e={a:"a","astro-image":"astro-image",blockquote:"blockquote",code:"code",h2:"h2",hr:"hr",li:"li",ol:"ol",p:"p",pre:"pre",span:"span",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...n.components},r=e["astro-image"];return t(d,{children:[t(e.h2,{id:"hello-world",children:"Hello World"}),`
`,t(e.p,{children:["Following is an example blog post written in an mdx file. You can find me @ src/content/post/hello-world/index.mdx. Here you can add/update/delete details and watch the changes live when running in develop mode, ",t(e.code,{children:"pnpm dev"})]}),`
`,t(e.p,{children:t(r,{src:w,alt:"A pug in the woods, wrapped in a blanket"})}),`
`,t(e.h2,{id:"using-some-markdown-elements",children:"Using some markdown elements"}),`
`,t(e.p,{children:"Here we have a simple js code block."}),`
`,t(e.pre,{class:"astro-code dracula",style:{backgroundColor:"#282A36",color:"#F8F8F2",overflowX:"auto",whiteSpace:"pre-wrap",wordWrap:"break-word"},tabindex:"0",children:t(e.code,{children:t(e.span,{class:"line",children:[t(e.span,{style:{color:"#FF79C6"},children:"let"}),t(e.span,{style:{color:"#F8F8F2"},children:" string "}),t(e.span,{style:{color:"#FF79C6"},children:"="}),t(e.span,{style:{color:"#E9F284"},children:' "'}),t(e.span,{style:{color:"#F1FA8C"},children:"JavaScript syntax highlighting"}),t(e.span,{style:{color:"#E9F284"},children:'"'}),t(e.span,{style:{color:"#F8F8F2"},children:";"})]})})}),`
`,t(e.p,{children:["This is styled by Shiki, set via the ",t(e.a,{href:"https://docs.astro.build/en/guides/markdown-content/#syntax-highlighting",rel:"nofollow, noopener, noreferrer",target:"_blank",children:"config"})," for Astro."]}),`
`,t(e.p,{children:["You can choose your own theme from this ",t(e.a,{href:"https://github.com/shikijs/shiki/blob/main/docs/themes.md#all-themes",rel:"nofollow, noopener, noreferrer",target:"_blank",children:"library"}),", which is currently set to Dracula, in the file ",t(e.code,{children:"astro.config.mjs"}),"."]}),`
`,t(e.p,{children:"Here is a horizontal rule."}),`
`,t(e.hr,{}),`
`,t(e.p,{children:"Here is a list:"}),`
`,t(e.ul,{children:[`
`,t(e.li,{children:"Item number 1"}),`
`,t(e.li,{children:"Item number 2"}),`
`,t(e.li,{children:"Item number 3"}),`
`]}),`
`,t(e.p,{children:"And an ordered list:"}),`
`,t(e.ol,{children:[`
`,t(e.li,{children:"James Madison"}),`
`,t(e.li,{children:"James Monroe"}),`
`,t(e.li,{children:"John Quincy Adams"}),`
`]}),`
`,t(e.p,{children:"Here is a table:"}),`




















`,t(e.table,{children:[t(e.thead,{children:t(e.tr,{children:[t(e.th,{children:"Item"}),t(e.th,{style:{textAlign:"center"},children:"Price"}),t(e.th,{style:{textAlign:"right"},children:"# In stock"})]})}),t(e.tbody,{children:[t(e.tr,{children:[t(e.td,{children:"Juicy Apples"}),t(e.td,{style:{textAlign:"center"},children:"1.99"}),t(e.td,{style:{textAlign:"right"},children:"739"})]}),t(e.tr,{children:[t(e.td,{children:"Bananas"}),t(e.td,{style:{textAlign:"center"},children:"1.89"}),t(e.td,{style:{textAlign:"right"},children:"6"})]})]})]}),`
`,t(e.h2,{id:"tailwind-css-prose-styling",children:"Tailwind CSS Prose styling"}),`
`,t(e.blockquote,{children:[`
`,t(e.p,{children:`I’m a simple blockquote.
I’m styled by Tailwind CSS prose plugin`}),`
`]})]})}function x(n={}){const{wrapper:e}=n.components||{};return e?t(e,{...n,children:t(c,{...n})}):c(n)}const j="src/content/post/hello-world/index.mdx",H="/Users/haotingyi/Documents/workspaces/megaease/lokiwager/lokiwager.github.io/src/content/post/hello-world/index.mdx",l=(n={})=>x({...n,components:{Fragment:d,...n.components,"astro-image":n.components?.img??g}});l[Symbol.for("mdx-component")]=!0;l[Symbol.for("astro.needsHeadRendering")]=!b.layout;l.moduleId="/Users/haotingyi/Documents/workspaces/megaease/lokiwager/lokiwager.github.io/src/content/post/hello-world/index.mdx";export{l as Content,C as __usesAstroImage,l as default,H as file,b as frontmatter,_ as getHeadings,j as url};
