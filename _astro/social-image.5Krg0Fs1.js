import{c as a,r as t,m as n}from"./render-template.LEH1zC1t.js";import{u as s}from"./hoisted.olnA_1KT.js";import"./astro/assets-service.1mn5GyWb.js";const e=`<h2 id="adding-your-own-social-image-to-a-post">Adding your own social image to a post</h2>
<p>This post is an example of how to add a custom <a href="https://ogp.me/" rel="nofollow, noopener, noreferrer" target="_blank">open graph</a> social image, also known as an OG image, to a blog post.
By adding the optional ogImage property to the frontmatter of a post, you opt out of <a href="https://github.com/vercel/satori" rel="nofollow, noopener, noreferrer" target="_blank">satori</a> automatically generating an image for this page.</p>
<p>If you open this markdown file <code>src/content/post/social-image.md</code> you’ll see the ogImage property set to an image which lives in the public folder<sup><a href="#user-content-fn-1" id="user-content-fnref-1" data-footnote-ref="" aria-describedby="footnote-label">1</a></sup>.</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#8BE9FD">ogImage</span><span style="color:#FF79C6">:</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C">/social-card.png</span><span style="color:#E9F284">"</span></span></code></pre>
<p>You can view the one set for this template page <a href="https://astro-cactus.chriswilliams.dev/social-card.png" rel="nofollow, noopener, noreferrer" target="_blank">here</a>.</p>
<section data-footnotes="" class="footnotes"><h2 class="" id="footnote-label">Footnotes</h2>
<ol>
<li id="user-content-fn-1">
<p>The image itself can be located anywhere you like. <a href="#user-content-fnref-1" data-footnote-backref="" aria-label="Back to reference 1" class="data-footnote-backref">↩</a></p>
</li>
</ol>
</section>`,r={title:"Example OG Social Image",publishDate:"27 January 2023",description:"An example post for Astro Cactus, detailing how to add a custom social image card in the frontmatter",tags:["example","blog","image"],ogImage:"/social-card.png",minutesRead:"1 min read"},i="/Users/haotingyi/Documents/workspaces/megaease/lokiwager/lokiwager.github.io/src/content/post/social-image.md",l=void 0;function u(){return`
## Adding your own social image to a post

This post is an example of how to add a custom [open graph](https://ogp.me/) social image, also known as an OG image, to a blog post.
By adding the optional ogImage property to the frontmatter of a post, you opt out of [satori](https://github.com/vercel/satori) automatically generating an image for this page.

If you open this markdown file \`src/content/post/social-image.md\` you'll see the ogImage property set to an image which lives in the public folder[^1].

\`\`\`yaml
ogImage: "/social-card.png"
\`\`\`

You can view the one set for this template page [here](https://astro-cactus.chriswilliams.dev/social-card.png).

[^1]: The image itself can be located anywhere you like.
`}function y(){return e}function w(){return[{depth:2,slug:"adding-your-own-social-image-to-a-post",text:"Adding your own social image to a post"},{depth:2,slug:"footnote-label",text:"Footnotes"}]}const b=a((p,c,g)=>{const{layout:d,...o}=r;return o.file=i,o.url=l,t`${n()}${s(e)}`});export{b as Content,y as compiledContent,b as default,i as file,r as frontmatter,w as getHeadings,u as rawContent,l as url};
