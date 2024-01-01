import{c as a,r as s,m as o}from"./render-template.KU_WDTZI.js";import{u as t}from"./hoisted.ln4WLWo-.js";const e=`<h2 id="background">Background</h2>
<p>As a developer of a GPU SaaS platform relying on Kubernetes with Ceph as the storage backend. Recently, I encountered performance issues with CephFS, notably the extended execution time of commands like <code>import torch</code>, taking around 180 seconds. Investigating further, it became evident that the CephFS performance was constrained by a single MDS (Metadata Server) running by default.</p>
<p>However, I found that there is no clear documentation about how to configure multiple active MDS daemons. So I write this article to record the process of configuring multiple active MDS daemons.</p>
<h2 id="what-is-mds">What is MDS</h2>
<p>Ceph MDS serves as the metadata server for the Ceph File System (CephFS), managing metadata operations within the storage system. There are primarily three types of MDS daemons:</p>
<ol>
<li><strong>Single Active</strong>: The default MDS daemon configuration.</li>
<li><strong>Hot Standby</strong>: An idle backup MDS daemon.</li>
<li><strong>Multiple Active</strong>: Configuring multiple MDS daemons to distribute the load.</li>
</ol>
<h2 id="when-to-use-multiple-active-mds-daemons">When to Use Multiple Active MDS Daemons</h2>
<p>As per the <a href="https://docs.ceph.com/en/quincy/cephfs/multimds/#when-should-i-use-multiple-active-mds-daemons" rel="nofollow, noopener, noreferrer" target="_blank">Ceph documentation</a>, multiple active MDS daemons are recommended in the following scenarios:</p>
<ol>
<li><strong>Large Number of Clients:</strong> When handling a substantial client base.</li>
<li><strong>Metadata Performance Bottleneck:</strong> When the default single MDS becomes a performance bottleneck.</li>
</ol>
<h2 id="configuring-multiple-active-mds-daemons">Configuring Multiple Active MDS Daemons</h2>
<ol>
<li>List MDS daemon.</li>
</ol>
<p>Identify existing MDS daemons in your environment.</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">></span><span style="color:#F8F8F2"> ceph orch ps --daemon_type=mds</span></span></code></pre>
<ol start="2">
<li>Create new MDS instances.</li>
</ol>
<p>Add new MDS instances across desired host (example: node01, node02, etc.).</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">></span><span style="color:#F8F8F2"> ceph orch apply mds </span><span style="color:#FF79C6">&#x3C;</span><span style="color:#F8F8F2">FS_NAME</span><span style="color:#FF79C6">></span><span style="color:#F8F8F2"> --placement=</span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">node01,node02,node03,node04,node05,node04</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">  --dry-run</span></span></code></pre>
<ol start="3">
<li>Enable standby replay.</li>
</ol>
<p>Enable standby MDS instances for system availability in case of active daemon failure.</p>
<p>According to the documentation</p>
<blockquote>
<p>Even with multiple active MDS daemons, a highly available system still requires standby daemons to take over if any of the servers running an active daemon fail.</p>
</blockquote>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">></span><span style="color:#F8F8F2"> ceph fs set </span><span style="color:#FF79C6">&#x3C;</span><span style="color:#F8F8F2">FS_NAME</span><span style="color:#FF79C6">></span><span style="color:#F8F8F2"> allow_standby_replay 1</span></span></code></pre>
<ol start="4">
<li>Increase the number of active MDS daemons.</li>
</ol>
<p>Augment the number of active MDS daemons.</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">></span><span style="color:#F8F8F2"> ceph fs set </span><span style="color:#FF79C6">&#x3C;</span><span style="color:#F8F8F2">FS_NAME</span><span style="color:#FF79C6">></span><span style="color:#F8F8F2"> max_mds 3</span></span></code></pre>
<p>Note: Total MDS daemons = Active MDS daemons + (Standby MDS daemons * Active MDS daemons).</p>
<ol start="5">
<li>Check the status of MDS daemons.</li>
</ol>
<p>Ensure proper functionality and status of the configured MDS daemons.</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>> ceph status</span></span>
<span class="line"><span></span></span>
<span class="line"><span>...</span></span>
<span class="line"><span>  services:</span></span>
<span class="line"><span>    mon: 5 daemons, quorum node01,node02,node03,node04,node05,node04 (age 9w)</span></span>
<span class="line"><span>    mgr: node01.iitngk(active, since 6M), standbys: node02.wjppdy</span></span>
<span class="line"><span>    mds: 3/3 daemons up, 3 hot standby</span></span>
<span class="line"><span>    osd: 6 osds: 6 up (since 2w), 6 in (since 7M)</span></span>
<span class="line"><span>...</span></span>
<span class="line"><span></span></span>
<span class="line"><span>> ceph orch ps --daemon_type=mds</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                         HOST         PORTS  STATUS        REFRESHED  AGE  MEM USE  MEM LIM  VERSION  IMAGE ID      CONTAINER ID</span></span>
<span class="line"><span>mds.&#x3C;FS_NAME>.node01.zcsmff  node01         running (7M)    74s ago   7M    12.9G        -  17.2.6   c9a1062f7289  a45f77ca1ecb</span></span>
<span class="line"><span>mds.&#x3C;FS_NAME>.node02.xtterx  node02         running (4d)     9m ago   4d    4320M        -  17.2.6   c9a1062f7289  c4553f2d538b</span></span>
<span class="line"><span>mds.&#x3C;FS_NAME>.node03.ktibkb  node03         running (4d)     9m ago   4d    11.2G        -  17.2.6   c9a1062f7289  36aeb10dc1a6</span></span>
<span class="line"><span>mds.&#x3C;FS_NAME>.node04.uhmpnt  node04         running (4d)     5m ago   4d    2150M        -  17.2.6   c9a1062f7289  7aa9bac68b0f</span></span>
<span class="line"><span>mds.&#x3C;FS_NAME>.node05.jqwdxe  node05         running (4d)     4m ago   4d     403M        -  17.2.6   c9a1062f7289  730118ae7af0</span></span>
<span class="line"><span>mds.&#x3C;FS_NAME>.node06.skhdpr  node06         running (4d)     4m ago   4d     487M        -  17.2.6   c9a1062f7289  5054ffa1bfe0</span></span>
<span class="line"><span></span></span>
<span class="line"><span>> ceph fs dump</span></span>
<span class="line"><span></span></span>
<span class="line"><span>...</span></span>
<span class="line"><span>max_mds	3</span></span>
<span class="line"><span>in	0,1,2</span></span>
<span class="line"><span>up	{0=14232,1=6103278,2=6110459}</span></span>
<span class="line"><span>...</span></span>
<span class="line"><span>standby_count_wanted	1</span></span>
<span class="line"><span>...</span></span></code></pre>`,p={title:"Ceph multiple active MDS Daemons",publishDate:"16 December 2023",description:"Enhancing CephFS Performance by Configuring Multiple Active MDS Daemons.",tags:["ceph","mds","devops"],minutesRead:"3 min read"},i="/home/runner/work/lokiwager.github.io/lokiwager.github.io/src/content/post/ceph-mds.md",l=void 0;function f(){return`
## Background

As a developer of a GPU SaaS platform relying on Kubernetes with Ceph as the storage backend. Recently, I encountered performance issues with CephFS, notably the extended execution time of commands like \`import torch\`, taking around 180 seconds. Investigating further, it became evident that the CephFS performance was constrained by a single MDS (Metadata Server) running by default.

However, I found that there is no clear documentation about how to configure multiple active MDS daemons. So I write this article to record the process of configuring multiple active MDS daemons.

## What is MDS

Ceph MDS serves as the metadata server for the Ceph File System (CephFS), managing metadata operations within the storage system. There are primarily three types of MDS daemons:

1. **Single Active**: The default MDS daemon configuration.
2. **Hot Standby**: An idle backup MDS daemon.
3. **Multiple Active**: Configuring multiple MDS daemons to distribute the load.

## When to Use Multiple Active MDS Daemons

As per the [Ceph documentation](https://docs.ceph.com/en/quincy/cephfs/multimds/#when-should-i-use-multiple-active-mds-daemons), multiple active MDS daemons are recommended in the following scenarios:

1. **Large Number of Clients:** When handling a substantial client base.
2. **Metadata Performance Bottleneck:** When the default single MDS becomes a performance bottleneck.

## Configuring Multiple Active MDS Daemons

1. List MDS daemon.

Identify existing MDS daemons in your environment.

\`\`\`bash
> ceph orch ps --daemon_type=mds
\`\`\`

2. Create new MDS instances.

Add new MDS instances across desired host (example: node01, node02, etc.).

\`\`\`bash
> ceph orch apply mds <FS_NAME> --placement="node01,node02,node03,node04,node05,node04"  --dry-run
\`\`\`

3. Enable standby replay.

Enable standby MDS instances for system availability in case of active daemon failure.

According to the documentation
> Even with multiple active MDS daemons, a highly available system still requires standby daemons to take over if any of the servers running an active daemon fail.

\`\`\`bash
> ceph fs set <FS_NAME> allow_standby_replay 1
\`\`\`

4. Increase the number of active MDS daemons.

Augment the number of active MDS daemons.

\`\`\`bash
> ceph fs set <FS_NAME> max_mds 3
\`\`\`

Note: Total MDS daemons = Active MDS daemons + (Standby MDS daemons * Active MDS daemons).

5. Check the status of MDS daemons.

Ensure proper functionality and status of the configured MDS daemons.

\`\`\`text
> ceph status

...
  services:
    mon: 5 daemons, quorum node01,node02,node03,node04,node05,node04 (age 9w)
    mgr: node01.iitngk(active, since 6M), standbys: node02.wjppdy
    mds: 3/3 daemons up, 3 hot standby
    osd: 6 osds: 6 up (since 2w), 6 in (since 7M)
...

> ceph orch ps --daemon_type=mds

NAME                         HOST         PORTS  STATUS        REFRESHED  AGE  MEM USE  MEM LIM  VERSION  IMAGE ID      CONTAINER ID
mds.<FS_NAME>.node01.zcsmff  node01         running (7M)    74s ago   7M    12.9G        -  17.2.6   c9a1062f7289  a45f77ca1ecb
mds.<FS_NAME>.node02.xtterx  node02         running (4d)     9m ago   4d    4320M        -  17.2.6   c9a1062f7289  c4553f2d538b
mds.<FS_NAME>.node03.ktibkb  node03         running (4d)     9m ago   4d    11.2G        -  17.2.6   c9a1062f7289  36aeb10dc1a6
mds.<FS_NAME>.node04.uhmpnt  node04         running (4d)     5m ago   4d    2150M        -  17.2.6   c9a1062f7289  7aa9bac68b0f
mds.<FS_NAME>.node05.jqwdxe  node05         running (4d)     4m ago   4d     403M        -  17.2.6   c9a1062f7289  730118ae7af0
mds.<FS_NAME>.node06.skhdpr  node06         running (4d)     4m ago   4d     487M        -  17.2.6   c9a1062f7289  5054ffa1bfe0

> ceph fs dump

...
max_mds	3
in	0,1,2
up	{0=14232,1=6103278,2=6110459}
...
standby_count_wanted	1
...
\`\`\`
`}function g(){return e}function M(){return[{depth:2,slug:"background",text:"Background"},{depth:2,slug:"what-is-mds",text:"What is MDS"},{depth:2,slug:"when-to-use-multiple-active-mds-daemons",text:"When to Use Multiple Active MDS Daemons"},{depth:2,slug:"configuring-multiple-active-mds-daemons",text:"Configuring Multiple Active MDS Daemons"}]}const S=a((d,r,c)=>{const{layout:m,...n}=p;return n.file=i,n.url=l,s`${o()}${t(e)}`});export{S as Content,g as compiledContent,S as default,i as file,p as frontmatter,M as getHeadings,f as rawContent,l as url};
