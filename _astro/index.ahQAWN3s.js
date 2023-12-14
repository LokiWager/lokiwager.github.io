import{s as r,g as a}from"./_astro_assets.rh-e-Ufv.js";import{c as l,r as d,m as p}from"./render-template.LEH1zC1t.js";import{u as c}from"./hoisted.olnA_1KT.js";import"./astro/assets-service.1mn5GyWb.js";const h={src:"/_astro/logo.zF35ur39.png",width:512,height:512,format:"png"},u={src:"/_astro/about-astro.NM552zND.png",width:249,height:450,format:"png"},g=async function(){return{"./logo.png":await a({src:h}),"@/assets/about-astro.png":await a({src:u})}};async function f(t){return g().then(e=>t.replaceAll(/__ASTRO_IMAGE_="([^"]+)"/gm,(i,n)=>r({src:e[n].src,...e[n].attributes})))}const o=await f(`<h2 id="this-is-a-h2-heading">This is a H2 Heading</h2>
<h3 id="this-is-a-h3-heading">This is a H3 Heading</h3>
<h4 id="this-is-a-h4-heading">This is a H4 Heading</h4>
<h5 id="this-is-a-h5-heading">This is a H5 Heading</h5>
<h6 id="this-is-a-h6-heading">This is a H6 Heading</h6>
<h2 id="horizontal-rules">Horizontal Rules</h2>
<hr>
<hr>
<hr>
<h2 id="emphasis">Emphasis</h2>
<p><strong>This is bold text</strong></p>
<p><em>This is italic text</em></p>
<p><del>Strikethrough</del></p>
<h2 id="quotes">Quotes</h2>
<p>“Double quotes” and ‘single quotes’</p>
<h2 id="blockquotes">Blockquotes</h2>
<blockquote>
<p>Blockquotes can also be nested…</p>
<blockquote>
<p>…by using additional greater-than signs right next to each other…</p>
</blockquote>
</blockquote>
<h2 id="references">References</h2>
<p>An example containing a clickable reference<sup><a href="#user-content-fn-1" id="user-content-fnref-1" data-footnote-ref="" aria-describedby="footnote-label">1</a></sup> with a link to the source.</p>
<p>Second example containing a reference<sup><a href="#user-content-fn-2" id="user-content-fnref-2" data-footnote-ref="" aria-describedby="footnote-label">2</a></sup> with a link to the source.</p>
<p>If you check out this example in <code>src/content/post/markdown-elements/index.md</code>, you’ll notice that the references and the heading “Footnotes” are added to the bottom of the page via the <a href="https://github.com/remarkjs/remark-rehype#options" rel="nofollow, noopener, noreferrer" target="_blank">remark-rehype</a> plugin.</p>
<h2 id="lists">Lists</h2>
<p>Unordered</p>
<ul>
<li>Create a list by starting a line with <code>+</code>, <code>-</code>, or <code>*</code></li>
<li>Sub-lists are made by indenting 2 spaces:
<ul>
<li>Marker character change forces new list start:
<ul>
<li>Ac tristique libero volutpat at</li>
<li>Facilisis in pretium nisl aliquet</li>
<li>Nulla volutpat aliquam velit</li>
</ul>
</li>
</ul>
</li>
<li>Very easy!</li>
</ul>
<p>Ordered</p>
<ol>
<li>
<p>Lorem ipsum dolor sit amet</p>
</li>
<li>
<p>Consectetur adipiscing elit</p>
</li>
<li>
<p>Integer molestie lorem at massa</p>
</li>
<li>
<p>You can use sequential numbers…</p>
</li>
<li>
<p>…or keep all the numbers as <code>1.</code></p>
</li>
</ol>
<p>Start numbering with offset:</p>
<ol start="57">
<li>foo</li>
<li>bar</li>
</ol>
<h2 id="code">Code</h2>
<p>Inline <code>code</code></p>
<p>Indented code</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>// Some comments</span></span>
<span class="line"><span>line 1 of code</span></span>
<span class="line"><span>line 2 of code</span></span>
<span class="line"><span>line 3 of code</span></span></code></pre>
<p>Block code “fences”</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>Sample text here...</span></span></code></pre>
<p>Syntax highlighting</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">var</span><span style="color:#50FA7B"> foo</span><span style="color:#FF79C6"> =</span><span style="color:#FF79C6"> function</span><span style="color:#F8F8F2"> (</span><span style="color:#FFB86C;font-style:italic">bar</span><span style="color:#F8F8F2">) {</span></span>
<span class="line"><span style="color:#FF79C6">	return</span><span style="color:#F8F8F2"> bar</span><span style="color:#FF79C6">++</span><span style="color:#F8F8F2">;</span></span>
<span class="line"><span style="color:#F8F8F2">};</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F8F8F2">console.</span><span style="color:#50FA7B">log</span><span style="color:#F8F8F2">(</span><span style="color:#50FA7B">foo</span><span style="color:#F8F8F2">(</span><span style="color:#BD93F9">5</span><span style="color:#F8F8F2">));</span></span></code></pre>
<h2 id="tables">Tables</h2>





















<table><thead><tr><th>Option</th><th>Description</th></tr></thead><tbody><tr><td>data</td><td>path to data files to supply the data that will be passed into templates.</td></tr><tr><td>engine</td><td>engine to be used for processing templates. Handlebars is the default.</td></tr><tr><td>ext</td><td>extension to be used for dest files.</td></tr></tbody></table>
<p>Right aligned columns</p>





















<table><thead><tr><th align="right">Option</th><th align="right">Description</th></tr></thead><tbody><tr><td align="right">data</td><td align="right">path to data files to supply the data that will be passed into templates.</td></tr><tr><td align="right">engine</td><td align="right">engine to be used for processing templates. Handlebars is the default.</td></tr><tr><td align="right">ext</td><td align="right">extension to be used for dest files.</td></tr></tbody></table>
<h2 id="images">Images</h2>
<p>Image in the same folder: <code>src/content/post/markdown-elements/logo.png</code></p>
<img alt="Astro theme cactus logo" __ASTRO_IMAGE_="./logo.png">
<p>Image in the aliased assets folder: <code>src/assets/about-astro.png</code></p>
<img alt="A cartoon cactus looking at the Astro.build logo" __ASTRO_IMAGE_="@/assets/about-astro.png">
<h2 id="links">Links</h2>
<p><a href="https://markdown-it.github.io/" rel="nofollow, noopener, noreferrer" target="_blank">Content from markdown-it</a></p>
<section data-footnotes="" class="footnotes"><h2 class="" id="footnote-label">Footnotes</h2>
<ol>
<li id="user-content-fn-1">
<p>Reference first footnote with a return to content link. <a href="#user-content-fnref-1" data-footnote-backref="" aria-label="Back to reference 1" class="data-footnote-backref">↩</a></p>
</li>
<li id="user-content-fn-2">
<p>Second reference with a link. <a href="#user-content-fnref-2" data-footnote-backref="" aria-label="Back to reference 2" class="data-footnote-backref">↩</a></p>
</li>
</ol>
</section>`),m={title:"A post of Markdown elements",description:"This post is for testing and listing a number of different markdown elements",publishDate:"22 Feb 2023",tags:["test","markdown"],minutesRead:"2 min read"},b="/Users/haotingyi/Documents/workspaces/megaease/lokiwager/lokiwager.github.io/src/content/post/markdown-elements/index.md",k=void 0;function H(){return`
## This is a H2 Heading

### This is a H3 Heading

#### This is a H4 Heading

##### This is a H5 Heading

###### This is a H6 Heading

## Horizontal Rules

---

---

---

## Emphasis

**This is bold text**

_This is italic text_

~~Strikethrough~~

## Quotes

"Double quotes" and 'single quotes'

## Blockquotes

> Blockquotes can also be nested...
>
> > ...by using additional greater-than signs right next to each other...

## References

An example containing a clickable reference[^1] with a link to the source.

Second example containing a reference[^2] with a link to the source.

[^1]: Reference first footnote with a return to content link.
[^2]: Second reference with a link.

If you check out this example in \`src/content/post/markdown-elements/index.md\`, you'll notice that the references and the heading "Footnotes" are added to the bottom of the page via the [remark-rehype](https://github.com/remarkjs/remark-rehype#options) plugin.

## Lists

Unordered

- Create a list by starting a line with \`+\`, \`-\`, or \`*\`
- Sub-lists are made by indenting 2 spaces:
  - Marker character change forces new list start:
    - Ac tristique libero volutpat at
    - Facilisis in pretium nisl aliquet
    - Nulla volutpat aliquam velit
- Very easy!

Ordered

1. Lorem ipsum dolor sit amet
2. Consectetur adipiscing elit
3. Integer molestie lorem at massa

4. You can use sequential numbers...
5. ...or keep all the numbers as \`1.\`

Start numbering with offset:

57. foo
1. bar

## Code

Inline \`code\`

Indented code

    // Some comments
    line 1 of code
    line 2 of code
    line 3 of code

Block code "fences"

\`\`\`
Sample text here...
\`\`\`

Syntax highlighting

\`\`\`js
var foo = function (bar) {
	return bar++;
};

console.log(foo(5));
\`\`\`

## Tables

| Option | Description                                                               |
| ------ | ------------------------------------------------------------------------- |
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default.    |
| ext    | extension to be used for dest files.                                      |

Right aligned columns

| Option |                                                               Description |
| -----: | ------------------------------------------------------------------------: |
|   data | path to data files to supply the data that will be passed into templates. |
| engine |    engine to be used for processing templates. Handlebars is the default. |
|    ext |                                      extension to be used for dest files. |

## Images

Image in the same folder: \`src/content/post/markdown-elements/logo.png\`

![Astro theme cactus logo](./logo.png)

Image in the aliased assets folder: \`src/assets/about-astro.png\`

![A cartoon cactus looking at the Astro.build logo](@/assets/about-astro.png)

## Links

[Content from markdown-it](https://markdown-it.github.io/)
`}function T(){return o}function A(){return[{depth:2,slug:"this-is-a-h2-heading",text:"This is a H2 Heading"},{depth:3,slug:"this-is-a-h3-heading",text:"This is a H3 Heading"},{depth:4,slug:"this-is-a-h4-heading",text:"This is a H4 Heading"},{depth:5,slug:"this-is-a-h5-heading",text:"This is a H5 Heading"},{depth:6,slug:"this-is-a-h6-heading",text:"This is a H6 Heading"},{depth:2,slug:"horizontal-rules",text:"Horizontal Rules"},{depth:2,slug:"emphasis",text:"Emphasis"},{depth:2,slug:"quotes",text:"Quotes"},{depth:2,slug:"blockquotes",text:"Blockquotes"},{depth:2,slug:"references",text:"References"},{depth:2,slug:"lists",text:"Lists"},{depth:2,slug:"code",text:"Code"},{depth:2,slug:"tables",text:"Tables"},{depth:2,slug:"images",text:"Images"},{depth:2,slug:"links",text:"Links"},{depth:2,slug:"footnote-label",text:"Footnotes"}]}const q=l((t,e,i)=>{const{layout:n,...s}=m;return s.file=b,s.url=k,d`${p()}${c(o)}`});export{q as Content,T as compiledContent,q as default,b as file,m as frontmatter,A as getHeadings,H as rawContent,k as url};
