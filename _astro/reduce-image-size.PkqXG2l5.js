import{c as a,r as p,m as e}from"./render-template._6r_y0Sf.js";import{u as l}from"./hoisted.WEX_2Tmk.js";import"./astro/assets-service.1mn5GyWb.js";const n=`<h2 id="how-to-reduce-the-nvidia-docker-image-size">How to reduce the Nvidia Docker image size</h2>
<h3 id="the-problem">The problem</h3>
<p>Kubernetes has an extraction timeout, which means there is a upper limit for the image size, approximately around 15GB. In my GPU SaaS platform, I
use the Nvidia Docker image to provide GPU services. In the case of Stable Diffusion WebUI</p>
<ul>
<li>the cuda devel image size is around 3.6GB</li>
<li>if we add the cuda toolkit, the image size will add another 4GB</li>
<li>the pytorch library is around 2.5GB</li>
<li>the others are around 2GB, such as the webui, the jupyter, etc.</li>
</ul>
<p>So the total size is around 12GB, which is close to the upper limit. Every time I release a new version, I need to pre-warm the image to ensure users don’t have to wait when using it. It’s quite troublesome.</p>
<h3 id="the-solution">The solution</h3>
<p>I want to extract the large dependencies from the image and make them into a shared storage. When the container starts, it will mount the shared
storage to the container. So, the first step is to analyze the image.</p>
<ul>
<li>Analyze the cuda devel image</li>
</ul>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#FF79C6">></span><span style="color:#F8F8F2"> kubectl run -it --rm --restart=Never --image nvcr.io/nvidia/cuda:11.8.0-cudnn8-devel-ubuntu22.04 devel -- bash</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">root@devel:/#</span><span style="color:#F1FA8C"> du</span><span style="color:#BD93F9"> -h</span><span style="color:#BD93F9"> --max-depth=1</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> sort</span><span style="color:#BD93F9"> -hr</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> head</span><span style="color:#BD93F9"> -n</span><span style="color:#BD93F9"> 5</span></span>
<span class="line"><span style="color:#50FA7B">9.5G</span><span style="color:#F1FA8C">	.</span></span>
<span class="line"><span style="color:#50FA7B">8.6G</span><span style="color:#F1FA8C">	./usr</span></span>
<span class="line"><span style="color:#50FA7B">918M</span><span style="color:#F1FA8C">	./opt</span></span>
<span class="line"><span style="color:#50FA7B">9.1M</span><span style="color:#F1FA8C">	./var</span></span>
<span class="line"><span style="color:#50FA7B">1.4M</span><span style="color:#F1FA8C">	./etc</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">root@devel:/#</span><span style="color:#F1FA8C"> cd</span><span style="color:#F1FA8C"> /usr/</span></span>
<span class="line"><span style="color:#50FA7B">root@devel:/usr#</span><span style="color:#F1FA8C"> du</span><span style="color:#BD93F9"> -h</span><span style="color:#BD93F9"> --max-depth=1</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> sort</span><span style="color:#BD93F9"> -hr</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> head</span><span style="color:#BD93F9"> -n</span><span style="color:#BD93F9"> 5</span></span>
<span class="line"><span style="color:#50FA7B">8.6G</span><span style="color:#F1FA8C">	.</span></span>
<span class="line"><span style="color:#50FA7B">5.2G</span><span style="color:#F1FA8C">	./local</span></span>
<span class="line"><span style="color:#50FA7B">3.3G</span><span style="color:#F1FA8C">	./lib</span></span>
<span class="line"><span style="color:#50FA7B">62M</span><span style="color:#F1FA8C">	./bin</span></span>
<span class="line"><span style="color:#50FA7B">33M</span><span style="color:#F1FA8C">	./share</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">root@devel:/usr#</span><span style="color:#F1FA8C"> cd</span><span style="color:#F1FA8C"> local/</span></span>
<span class="line"><span style="color:#50FA7B">root@devel:/usr/local#</span><span style="color:#F1FA8C"> du</span><span style="color:#BD93F9"> -h</span><span style="color:#BD93F9"> --max-depth=1</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> sort</span><span style="color:#BD93F9"> -hr</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> head</span><span style="color:#BD93F9"> -n</span><span style="color:#BD93F9"> 5</span></span>
<span class="line"><span style="color:#50FA7B">5.2G</span><span style="color:#F1FA8C">	./cuda-11.8</span></span>
<span class="line"><span style="color:#50FA7B">5.2G</span><span style="color:#F1FA8C">	.</span></span>
<span class="line"><span style="color:#50FA7B">12K</span><span style="color:#F1FA8C">	./share</span></span>
<span class="line"><span style="color:#50FA7B">8.0K</span><span style="color:#F1FA8C">	./sbin</span></span>
<span class="line"><span style="color:#50FA7B">4.0K</span><span style="color:#F1FA8C">	./src</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">root@devel:/usr/local#</span><span style="color:#F1FA8C"> cd</span><span style="color:#F1FA8C"> /usr/lib</span></span>
<span class="line"><span style="color:#50FA7B">root@devel:/usr/lib#</span><span style="color:#F1FA8C"> du</span><span style="color:#BD93F9"> -h</span><span style="color:#BD93F9"> --max-depth=1</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> sort</span><span style="color:#BD93F9"> -hr</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> head</span><span style="color:#BD93F9"> -n</span><span style="color:#BD93F9"> 5</span></span>
<span class="line"><span style="color:#50FA7B">3.3G</span><span style="color:#F1FA8C">	.</span></span>
<span class="line"><span style="color:#50FA7B">3.2G</span><span style="color:#F1FA8C">	./x86_64-linux-gnu</span></span>
<span class="line"><span style="color:#50FA7B">98M</span><span style="color:#F1FA8C">	./gcc</span></span>
<span class="line"><span style="color:#50FA7B">59M</span><span style="color:#F1FA8C">	./firmware</span></span>
<span class="line"><span style="color:#50FA7B">988K</span><span style="color:#F1FA8C">	./apt</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">root@devel:/opt#</span><span style="color:#F1FA8C"> du</span><span style="color:#BD93F9"> -h</span><span style="color:#BD93F9"> --max-depth=1</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> sort</span><span style="color:#BD93F9"> -hr</span><span style="color:#FF79C6"> |</span><span style="color:#50FA7B"> head</span><span style="color:#BD93F9"> -n</span><span style="color:#BD93F9"> 5</span></span>
<span class="line"><span style="color:#50FA7B">918M</span><span style="color:#F1FA8C">	./nvidia</span></span>
<span class="line"><span style="color:#50FA7B">918M</span><span style="color:#F1FA8C">	.</span></span></code></pre>
<p>It is obvious that the <code>/usr/local/cuda-11.8</code> and <code>/usr/lib/x86_64-linux-gnu</code> and <code>/opt/nvidia</code> are the largest directories. However, I can’t
remove <code>/usr/lib/x86_64-linux-gnu</code> because it contains the shared libraries. So I decide to remove the <code>/usr/local/cuda-11.8</code> and <code>/opt/nvidia</code>
from the image. But I need to install cuda-toolkit and pytorch in the container and I also need a slim version of the cuda devel image. So I have
to build it by myself.</p>
<p>I found the <a href="https://gitlab.com/nvidia/container-images/cuda/-/tree/master/dist/11.8.0/ubuntu2204?ref_type=heads" rel="nofollow, noopener, noreferrer" target="_blank">nvidia/cuda Dockerfile</a>. I
merged it like this:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>FROM ubuntu:22.04 as builder</span></span>
<span class="line"><span></span></span>
<span class="line"><span>ENV NVARCH x86_64</span></span>
<span class="line"><span></span></span>
<span class="line"><span>ENV NVIDIA_REQUIRE_CUDA "cuda>=11.8 brand=tesla,driver>=470,driver&#x3C;471 brand=unknown,driver>=470,driver&#x3C;471 brand=nvidia,driver>=470,driver&#x3C;471 brand=nvidiartx,driver>=470,driver&#x3C;471 brand=geforce,driver>=470,driver&#x3C;471 brand=geforcertx,driver>=470,driver&#x3C;471 brand=quadro,driver>=470,driver&#x3C;471 brand=quadrortx,driver>=470,driver&#x3C;471 brand=titan,driver>=470,driver&#x3C;471 brand=titanrtx,driver>=470,driver&#x3C;471"</span></span>
<span class="line"><span>ENV NV_CUDA_CUDART_VERSION 11.8.89-1</span></span>
<span class="line"><span>ENV NV_CUDA_COMPAT_PACKAGE cuda-compat-11-8</span></span>
<span class="line"><span></span></span>
<span class="line"><span>LABEL maintainer "NVIDIA CORPORATION &#x3C;cudatools@nvidia.com>"</span></span>
<span class="line"><span></span></span>
<span class="line"><span>RUN apt-get update &#x26;&#x26; apt-get install -y --no-install-recommends \\</span></span>
<span class="line"><span>    gnupg2 curl ca-certificates &#x26;&#x26; \\</span></span>
<span class="line"><span>    curl -fsSLO https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/\${NVARCH}/cuda-keyring_1.0-1_all.deb &#x26;&#x26; \\</span></span>
<span class="line"><span>    dpkg -i cuda-keyring_1.0-1_all.deb &#x26;&#x26; \\</span></span>
<span class="line"><span>    apt-get purge --autoremove -y curl &#x26;&#x26; \\</span></span>
<span class="line"><span>    rm -rf /var/lib/apt/lists/*</span></span>
<span class="line"><span>...</span></span></code></pre>
<p>then I added the cuda-toolkit, python and others:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>RUN apt-get update &#x26;&#x26; apt-get install -y --no-install-recommends \\</span></span>
<span class="line"><span>    cuda-toolkit-11-8 \\</span></span>
<span class="line"><span>    &#x26;&#x26; apt-mark hold \${NV_CUDNN_PACKAGE_NAME} &#x26;&#x26; \\</span></span>
<span class="line"><span>    rm -rf /var/lib/apt/lists/*</span></span>
<span class="line"><span></span></span>
<span class="line"><span>RUN apt-get update --yes &#x26;&#x26; \\</span></span>
<span class="line"><span>    apt-get upgrade --yes &#x26;&#x26; \\</span></span>
<span class="line"><span>    apt install --yes --no-install-recommends \\</span></span>
<span class="line"><span>    git \\</span></span>
<span class="line"><span>    wget \\</span></span>
<span class="line"><span>    curl \\</span></span>
<span class="line"><span>    bash \\</span></span>
<span class="line"><span>    libgl1 \\</span></span>
<span class="line"><span>    software-properties-common \\</span></span>
<span class="line"><span>    ffmpeg \\</span></span>
<span class="line"><span>    openssh-server \\</span></span>
<span class="line"><span>    zip \\</span></span>
<span class="line"><span>    unzip \\</span></span>
<span class="line"><span>    iputils-ping \\</span></span>
<span class="line"><span>    libtcmalloc-minimal4 \\</span></span>
<span class="line"><span>    net-tools \\</span></span>
<span class="line"><span>    vim \\</span></span>
<span class="line"><span>    p7zip-full &#x26;&#x26; \\</span></span>
<span class="line"><span>    rm -rf /var/lib/apt/lists/*</span></span>
<span class="line"><span></span></span>
<span class="line"><span>RUN add-apt-repository ppa:deadsnakes/ppa</span></span>
<span class="line"><span></span></span>
<span class="line"><span>RUN apt install python3.10-dev python3.10-venv -y --no-install-recommends &#x26;&#x26; \\</span></span>
<span class="line"><span>    ln -s /usr/bin/python3.10 /usr/bin/python &#x26;&#x26; \\</span></span>
<span class="line"><span>    rm /usr/bin/python3 &#x26;&#x26; \\</span></span>
<span class="line"><span>    ln -s /usr/bin/python3.10 /usr/bin/python3 &#x26;&#x26; \\</span></span>
<span class="line"><span>    apt-get clean &#x26;&#x26; rm -rf /var/lib/apt/lists/* &#x26;&#x26; \\</span></span>
<span class="line"><span>    echo "en_US.UTF-8 UTF-8" > /etc/locale.gen</span></span>
<span class="line"><span></span></span>
<span class="line"><span>ENV LD_LIBRARY_PATH /usr/local/cuda/lib64:$LD_LIBRARY_PATH</span></span>
<span class="line"><span></span></span>
<span class="line"><span>RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py &#x26;&#x26; \\</span></span>
<span class="line"><span>    python get-pip.py &#x26;&#x26; \\</span></span>
<span class="line"><span>    pip install -U ipympl==0.9.2 jupyterlab==3.4.8 matplotlib==3.6.1 ipywidgets jupyter-archive &#x26;&#x26; \\</span></span>
<span class="line"><span>    pip install -U jupyter_contrib_nbextensions &#x26;&#x26; \\</span></span>
<span class="line"><span>    jupyter contrib nbextension install --user &#x26;&#x26; \\</span></span>
<span class="line"><span>    jupyter nbextension enable --py widgetsnbextension &#x26;&#x26; \\</span></span>
<span class="line"><span>    rm -rf ~/.cache/pip</span></span></code></pre>
<p>Then I used <a href="https://github.com/wagoodman/dive" rel="nofollow, noopener, noreferrer" target="_blank">dive tools</a> to analyze the image:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#50FA7B">docker</span><span style="color:#F1FA8C"> run</span><span style="color:#BD93F9"> --rm</span><span style="color:#BD93F9"> -it</span><span style="color:#BD93F9"> -v</span><span style="color:#F1FA8C"> /var/run/docker.sock:/var/run/docker.sock</span><span style="color:#F1FA8C"> wagoodman/dive:latest</span><span style="color:#BD93F9"> 10.108</span><span style="color:#F1FA8C">.163.251:20443/megaease/sd-cuda118-cudnn8-ubuntu2204:builder</span></span></code></pre>
<p>From the result, I’ve made sure that I can remove the <code>/usr/local/cuda-11.8</code> and <code>/opt/nvidia</code> from the image.</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>FROM builder as tmp</span></span>
<span class="line"><span></span></span>
<span class="line"><span>RUN mkdir /data &#x26;&#x26; mv /usr/local/cuda-11.8 /data/cuda-11.8 &#x26;&#x26; \\</span></span>
<span class="line"><span>    mv /opt/nvidia /data/nvidia</span></span>
<span class="line"><span></span></span>
<span class="line"><span>FROM ubuntu:22.04 as slim</span></span>
<span class="line"><span></span></span>
<span class="line"><span>COPY --from=tmp /etc /etc</span></span>
<span class="line"><span>COPY --from=tmp /usr /usr</span></span>
<span class="line"><span>COPY --from=tmp /root /root</span></span>
<span class="line"><span>COPY --from=tmp /var/cache /var/cache</span></span>
<span class="line"><span>COPY --from=tmp /var/lib /var/lib</span></span>
<span class="line"><span>COPY --from=tmp /run /run</span></span></code></pre>
<p>The next step is to add pytorch to the image.</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span>FROM builder as builder-torch201</span></span>
<span class="line"><span></span></span>
<span class="line"><span>RUN pip install torch==2.0.1+cu118 torchvision==0.15.2+cu118 torchaudio==2.0.2+cu118 --index-url https://download.pytorch.org/whl/cu118 &#x26;&#x26; \\</span></span>
<span class="line"><span>    rm -rf ~/.cache/pip</span></span>
<span class="line"><span></span></span>
<span class="line"><span>FROM builder-torch201 as tmp-torch201</span></span>
<span class="line"><span></span></span>
<span class="line"><span>RUN mkdir /data &#x26;&#x26; mv /usr/local/cuda-11.8 /data/cuda-11.8 &#x26;&#x26; \\</span></span>
<span class="line"><span>    mv /usr/local/lib/python3.10/dist-packages /data/dist-packages &#x26;&#x26; \\</span></span>
<span class="line"><span>    mv /opt/nvidia /data/nvidia</span></span>
<span class="line"><span></span></span>
<span class="line"><span>FROM ubuntu:22.04 as slim-torch201</span></span>
<span class="line"><span></span></span>
<span class="line"><span>COPY --from=tmp-torch201 /etc /etc</span></span>
<span class="line"><span>COPY --from=tmp-torch201 /usr /usr</span></span>
<span class="line"><span>COPY --from=tmp-torch201 /root /root</span></span>
<span class="line"><span>COPY --from=tmp-torch201 /var/cache /var/cache</span></span>
<span class="line"><span>COPY --from=tmp-torch201 /var/lib /var/lib</span></span>
<span class="line"><span>COPY --from=tmp-torch201 /run /run</span></span></code></pre>
<h3 id="make-it-a-little-bit-automatic">Make it a little bit automatic</h3>
<p>I wrote a docker compose file to build the image and share the storage:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#8BE9FD">services</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">  builder</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">    image</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> megaease/cuda-11.8-cudnn8-ubuntu22.04:builder</span></span>
<span class="line"><span style="color:#8BE9FD">    build</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">      context</span><span style="color:#FF79C6">:</span><span style="color:#BD93F9"> .</span></span>
<span class="line"><span style="color:#8BE9FD">      target</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> builder</span></span>
<span class="line"><span style="color:#8BE9FD">    volumes</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#FF79C6">      -</span><span style="color:#8BE9FD"> type</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> bind</span></span>
<span class="line"><span style="color:#8BE9FD">        source</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> ./pvc</span></span>
<span class="line"><span style="color:#8BE9FD">        target</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> /data</span></span>
<span class="line"><span style="color:#FF79C6">      -</span><span style="color:#8BE9FD"> type</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> bind</span></span>
<span class="line"><span style="color:#8BE9FD">        source</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> generate_pvc.sh</span></span>
<span class="line"><span style="color:#8BE9FD">        target</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> /generate_pvc.sh</span></span>
<span class="line"><span style="color:#8BE9FD">    command</span><span style="color:#FF79C6">:</span><span style="color:#F8F8F2"> [ </span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">/generate_pvc.sh</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2"> ]</span></span>
<span class="line"><span style="color:#8BE9FD">  slim</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">    image</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> megaease/cuda-11.8-cudnn8-ubuntu22.04:slim</span></span>
<span class="line"><span style="color:#8BE9FD">    build</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">      context</span><span style="color:#FF79C6">:</span><span style="color:#BD93F9"> .</span></span>
<span class="line"><span style="color:#8BE9FD">      target</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> slim</span></span>
<span class="line"><span style="color:#8BE9FD">  builder-torch201</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">    image</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> megaease/cuda-11.8-cudnn8-ubuntu22.04:builder-torch201</span></span>
<span class="line"><span style="color:#8BE9FD">    build</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">      context</span><span style="color:#FF79C6">:</span><span style="color:#BD93F9"> .</span></span>
<span class="line"><span style="color:#8BE9FD">      target</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> builder-torch201</span></span>
<span class="line"><span style="color:#8BE9FD">    volumes</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#FF79C6">      -</span><span style="color:#8BE9FD"> type</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> bind</span></span>
<span class="line"><span style="color:#8BE9FD">        source</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> ./pvc</span></span>
<span class="line"><span style="color:#8BE9FD">        target</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> /data</span></span>
<span class="line"><span style="color:#FF79C6">      -</span><span style="color:#8BE9FD"> type</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> bind</span></span>
<span class="line"><span style="color:#8BE9FD">        source</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> generate_torch.sh</span></span>
<span class="line"><span style="color:#8BE9FD">        target</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> /generate_torch.sh</span></span>
<span class="line"><span style="color:#8BE9FD">    command</span><span style="color:#FF79C6">:</span><span style="color:#F8F8F2"> [</span><span style="color:#E9F284">"</span><span style="color:#F1FA8C">/generate_torch.sh</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2">]</span></span>
<span class="line"><span style="color:#8BE9FD">  slim-torch201</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">    image</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> megaease/cuda-11.8-cudnn8-ubuntu22.04:slim-torch201</span></span>
<span class="line"><span style="color:#8BE9FD">    build</span><span style="color:#FF79C6">:</span></span>
<span class="line"><span style="color:#8BE9FD">      context</span><span style="color:#FF79C6">:</span><span style="color:#BD93F9"> .</span></span>
<span class="line"><span style="color:#8BE9FD">      target</span><span style="color:#FF79C6">:</span><span style="color:#F1FA8C"> slim-torch201</span></span></code></pre>
<p>The <code>generate_pvc.sh</code>:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#6272A4">#!/bin/bash</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">rm</span><span style="color:#BD93F9"> -rf</span><span style="color:#F1FA8C"> /data/cuda</span></span>
<span class="line"><span style="color:#50FA7B">mkdir</span><span style="color:#BD93F9"> -p</span><span style="color:#F1FA8C"> /data/cuda</span></span>
<span class="line"><span style="color:#50FA7B">cp</span><span style="color:#BD93F9"> -rT</span><span style="color:#F1FA8C"> /usr/local/cuda-11.8</span><span style="color:#F1FA8C"> /data/cuda</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">rm</span><span style="color:#BD93F9"> -rf</span><span style="color:#F1FA8C"> /data/nvidia</span></span>
<span class="line"><span style="color:#50FA7B">mkdir</span><span style="color:#BD93F9"> -p</span><span style="color:#F1FA8C"> /data/nvidia</span></span>
<span class="line"><span style="color:#50FA7B">cp</span><span style="color:#BD93F9"> -rT</span><span style="color:#F1FA8C"> /opt/nvidia</span><span style="color:#F1FA8C"> /data/nvidia</span></span></code></pre>
<p>The <code>generate_torch.sh</code>:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#6272A4">#!/bin/bash</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">rm</span><span style="color:#BD93F9"> -rf</span><span style="color:#F1FA8C"> /data/dist-packages-torch201</span></span>
<span class="line"><span style="color:#50FA7B">mkdir</span><span style="color:#BD93F9"> -p</span><span style="color:#F1FA8C"> /data/dist-packages-torch201</span></span>
<span class="line"><span style="color:#50FA7B">cp</span><span style="color:#BD93F9"> -rT</span><span style="color:#F1FA8C"> /usr/local/lib/python3.10/dist-packages</span><span style="color:#F1FA8C"> /data/dist-packages-torch201</span></span></code></pre>
<p>Then I wrote a build script to build the image and push data to the shared storage:</p>
<pre class="astro-code dracula" style="background-color:#282A36;color:#F8F8F2; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;" tabindex="0"><code><span class="line"><span style="color:#6272A4">#!/bin/bash</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">mkdir</span><span style="color:#BD93F9"> -p</span><span style="color:#F1FA8C"> pvc</span></span>
<span class="line"><span style="color:#50FA7B">chmod</span><span style="color:#F1FA8C"> +x</span><span style="color:#F1FA8C"> generate_pvc.sh</span></span>
<span class="line"><span style="color:#50FA7B">chmod</span><span style="color:#F1FA8C"> +x</span><span style="color:#F1FA8C"> generate_torch.sh</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6272A4"># Function to build specified services</span></span>
<span class="line"><span style="color:#50FA7B">build_services</span><span style="color:#F8F8F2">() {</span></span>
<span class="line"><span style="color:#FF79C6">  if</span><span style="color:#F8F8F2"> [ </span><span style="color:#BD93F9;font-style:italic">$#</span><span style="color:#FF79C6"> -eq</span><span style="color:#BD93F9"> 0</span><span style="color:#F8F8F2"> ]; </span><span style="color:#FF79C6">then</span></span>
<span class="line"><span style="color:#8BE9FD">    echo</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C">No services provided to build.</span><span style="color:#E9F284">"</span></span>
<span class="line"><span style="color:#8BE9FD">    exit</span><span style="color:#BD93F9"> 1</span></span>
<span class="line"><span style="color:#FF79C6">  fi</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6272A4">  # Build the specified services</span></span>
<span class="line"><span style="color:#50FA7B">  docker-compose</span><span style="color:#F1FA8C"> build</span><span style="color:#E9F284"> "</span><span style="color:#FFB86C;font-style:italic">$@</span><span style="color:#E9F284">"</span><span style="color:#BD93F9"> --progress=plain</span></span>
<span class="line"><span style="color:#50FA7B">  docker</span><span style="color:#F1FA8C"> compose</span><span style="color:#F1FA8C"> up</span><span style="color:#E9F284"> "</span><span style="color:#FFB86C;font-style:italic">$@</span><span style="color:#E9F284">"</span></span>
<span class="line"><span style="color:#50FA7B">  docker</span><span style="color:#F1FA8C"> compose</span><span style="color:#F1FA8C"> push</span><span style="color:#E9F284"> "</span><span style="color:#FFB86C;font-style:italic">$@</span><span style="color:#E9F284">"</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6272A4">  # shellcheck disable=SC2199</span></span>
<span class="line"><span style="color:#FF79C6">  if</span><span style="color:#F8F8F2"> [[ </span><span style="color:#E9F284">"</span><span style="color:#FFB86C;font-style:italic"> $@</span><span style="color:#E9F284"> "</span><span style="color:#FF79C6"> =~</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C"> builder </span><span style="color:#E9F284">"</span><span style="color:#F8F8F2"> ]]; </span><span style="color:#FF79C6">then</span></span>
<span class="line"><span style="color:#8BE9FD">    echo</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C">builder is built. Executing tar command...</span><span style="color:#E9F284">"</span></span>
<span class="line"><span style="color:#50FA7B">    tar</span><span style="color:#BD93F9"> -cvf</span><span style="color:#F1FA8C"> cuda.tar</span><span style="color:#F1FA8C"> pvc/cuda</span></span>
<span class="line"><span style="color:#50FA7B">    scp</span><span style="color:#F1FA8C"> cuda.tar</span><span style="color:#F1FA8C"> storage-node01:~/gpu/model</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">    tar</span><span style="color:#BD93F9"> -cvf</span><span style="color:#F1FA8C"> nvidia.tar</span><span style="color:#F1FA8C"> pvc/nvidia</span></span>
<span class="line"><span style="color:#50FA7B">    scp</span><span style="color:#F1FA8C"> nvidia.tar</span><span style="color:#F1FA8C"> storage-node01:~/gpu/model</span></span>
<span class="line"><span style="color:#FF79C6">  fi</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6272A4">  # shellcheck disable=SC2199</span></span>
<span class="line"><span style="color:#FF79C6">  if</span><span style="color:#F8F8F2"> [[ </span><span style="color:#E9F284">"</span><span style="color:#FFB86C;font-style:italic"> $@</span><span style="color:#E9F284"> "</span><span style="color:#FF79C6"> =~</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C"> builder-torch201 </span><span style="color:#E9F284">"</span><span style="color:#F8F8F2"> ]]; </span><span style="color:#FF79C6">then</span></span>
<span class="line"><span style="color:#8BE9FD">    echo</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C">builder-torch201 is built. Executing tar command...</span><span style="color:#E9F284">"</span></span>
<span class="line"><span style="color:#50FA7B">    tar</span><span style="color:#BD93F9"> -cvf</span><span style="color:#F1FA8C"> dist-packages-torch201.tar</span><span style="color:#F1FA8C"> pvc/dist-packages-torch201</span></span>
<span class="line"><span style="color:#50FA7B">    scp</span><span style="color:#F1FA8C"> dist-packages-torch201.tar</span><span style="color:#F1FA8C"> storage-node01:~/gpu/model</span></span>
<span class="line"><span style="color:#FF79C6">  fi</span></span>
<span class="line"><span style="color:#F8F8F2">}</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6272A4"># Check arguments and perform action accordingly</span></span>
<span class="line"><span style="color:#FF79C6">if</span><span style="color:#F8F8F2"> [ </span><span style="color:#E9F284">"</span><span style="color:#BD93F9;font-style:italic">$#</span><span style="color:#E9F284">"</span><span style="color:#FF79C6"> -eq</span><span style="color:#BD93F9"> 0</span><span style="color:#F8F8F2"> ]; </span><span style="color:#FF79C6">then</span></span>
<span class="line"><span style="color:#8BE9FD">  echo</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C">Usage: </span><span style="color:#FFB86C;font-style:italic">$0</span><span style="color:#F1FA8C"> [builder slim builder-torch201 slim-torch201 builder-torch210 slim-torch210 ...] | all</span><span style="color:#E9F284">"</span></span>
<span class="line"><span style="color:#8BE9FD">  echo</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C">Example: </span><span style="color:#FFB86C;font-style:italic">$0</span><span style="color:#F1FA8C"> builder slim</span><span style="color:#E9F284">"</span></span>
<span class="line"><span style="color:#8BE9FD">  exit</span><span style="color:#BD93F9"> 1</span></span>
<span class="line"><span style="color:#FF79C6">fi</span></span>
<span class="line"></span>
<span class="line"><span style="color:#FF79C6">if</span><span style="color:#F8F8F2"> [ </span><span style="color:#E9F284">"</span><span style="color:#FFB86C;font-style:italic">$1</span><span style="color:#E9F284">"</span><span style="color:#FF79C6"> =</span><span style="color:#E9F284"> "</span><span style="color:#F1FA8C">all</span><span style="color:#E9F284">"</span><span style="color:#F8F8F2"> ]; </span><span style="color:#FF79C6">then</span></span>
<span class="line"><span style="color:#6272A4">  # Build all services</span></span>
<span class="line"><span style="color:#50FA7B">  docker</span><span style="color:#F1FA8C"> compose</span><span style="color:#F1FA8C"> build</span><span style="color:#BD93F9"> --progress=plain</span></span>
<span class="line"><span style="color:#50FA7B">  docker</span><span style="color:#F1FA8C"> compose</span><span style="color:#F1FA8C"> up</span></span>
<span class="line"><span style="color:#50FA7B">  docker</span><span style="color:#F1FA8C"> compose</span><span style="color:#F1FA8C"> push</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">  tar</span><span style="color:#BD93F9"> -cvf</span><span style="color:#F1FA8C"> cuda.tar</span><span style="color:#F1FA8C"> pvc/cuda</span></span>
<span class="line"><span style="color:#50FA7B">  scp</span><span style="color:#F1FA8C"> cuda.tar</span><span style="color:#F1FA8C"> storage-node01:~/gpu/model</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">  tar</span><span style="color:#BD93F9"> -cvf</span><span style="color:#F1FA8C"> nvidia.tar</span><span style="color:#F1FA8C"> pvc/nvidia</span></span>
<span class="line"><span style="color:#50FA7B">  scp</span><span style="color:#F1FA8C"> nvidia.tar</span><span style="color:#F1FA8C"> storage-node01:~/gpu/model</span></span>
<span class="line"></span>
<span class="line"><span style="color:#50FA7B">  tar</span><span style="color:#BD93F9"> -cvf</span><span style="color:#F1FA8C"> dist-packages-torch201.tar</span><span style="color:#F1FA8C"> pvc/dist-packages-torch201</span></span>
<span class="line"><span style="color:#50FA7B">  scp</span><span style="color:#F1FA8C"> dist-packages-torch201.tar</span><span style="color:#F1FA8C"> storage-node01:~/gpu/model</span></span>
<span class="line"><span style="color:#FF79C6">else</span></span>
<span class="line"><span style="color:#6272A4">  # Build specific services</span></span>
<span class="line"><span style="color:#50FA7B">  build_services</span><span style="color:#E9F284"> "</span><span style="color:#FFB86C;font-style:italic">$@</span><span style="color:#E9F284">"</span></span>
<span class="line"><span style="color:#FF79C6">fi</span></span></code></pre>`,o={title:"How to reduce the Nvidia Docker image size",publishDate:"22 February 2024",description:"The Nvidia Docker image is too large for Kubernetes to extract. How to reduce the image size?",tags:["Docker","Kubernetes","Image","GPU"],minutesRead:"6 min read"},t="/home/runner/work/lokiwager.github.io/lokiwager.github.io/src/content/post/reduce-image-size.md",r=void 0;function m(){return`
## How to reduce the Nvidia Docker image size

### The problem

Kubernetes has an extraction timeout, which means there is a upper limit for the image size, approximately around 15GB. In my GPU SaaS platform, I
use the Nvidia Docker image to provide GPU services. In the case of Stable Diffusion WebUI

- the cuda devel image size is around 3.6GB
- if we add the cuda toolkit, the image size will add another 4GB
- the pytorch library is around 2.5GB
- the others are around 2GB, such as the webui, the jupyter, etc.

So the total size is around 12GB, which is close to the upper limit. Every time I release a new version, I need to pre-warm the image to ensure users don't have to wait when using it. It's quite troublesome.

### The solution

I want to extract the large dependencies from the image and make them into a shared storage. When the container starts, it will mount the shared
storage to the container. So, the first step is to analyze the image.

- Analyze the cuda devel image

\`\`\`bash
> kubectl run -it --rm --restart=Never --image nvcr.io/nvidia/cuda:11.8.0-cudnn8-devel-ubuntu22.04 devel -- bash

root@devel:/# du -h --max-depth=1 | sort -hr | head -n 5
9.5G	.
8.6G	./usr
918M	./opt
9.1M	./var
1.4M	./etc

root@devel:/# cd /usr/
root@devel:/usr# du -h --max-depth=1 | sort -hr | head -n 5
8.6G	.
5.2G	./local
3.3G	./lib
62M	./bin
33M	./share

root@devel:/usr# cd local/
root@devel:/usr/local# du -h --max-depth=1 | sort -hr | head -n 5
5.2G	./cuda-11.8
5.2G	.
12K	./share
8.0K	./sbin
4.0K	./src

root@devel:/usr/local# cd /usr/lib
root@devel:/usr/lib# du -h --max-depth=1 | sort -hr | head -n 5
3.3G	.
3.2G	./x86_64-linux-gnu
98M	./gcc
59M	./firmware
988K	./apt

root@devel:/opt# du -h --max-depth=1 | sort -hr | head -n 5
918M	./nvidia
918M	.
\`\`\`

It is obvious that the \`/usr/local/cuda-11.8\` and \`/usr/lib/x86_64-linux-gnu\` and \`/opt/nvidia\` are the largest directories. However, I can't
remove \`/usr/lib/x86_64-linux-gnu\` because it contains the shared libraries. So I decide to remove the \`/usr/local/cuda-11.8\` and \`/opt/nvidia\`
from the image. But I need to install cuda-toolkit and pytorch in the container and I also need a slim version of the cuda devel image. So I have
to build it by myself.

I found the [nvidia/cuda Dockerfile](https://gitlab.com/nvidia/container-images/cuda/-/tree/master/dist/11.8.0/ubuntu2204?ref_type=heads). I
merged it like this:

\`\`\`Dockerfile
FROM ubuntu:22.04 as builder

ENV NVARCH x86_64

ENV NVIDIA_REQUIRE_CUDA "cuda>=11.8 brand=tesla,driver>=470,driver<471 brand=unknown,driver>=470,driver<471 brand=nvidia,driver>=470,driver<471 brand=nvidiartx,driver>=470,driver<471 brand=geforce,driver>=470,driver<471 brand=geforcertx,driver>=470,driver<471 brand=quadro,driver>=470,driver<471 brand=quadrortx,driver>=470,driver<471 brand=titan,driver>=470,driver<471 brand=titanrtx,driver>=470,driver<471"
ENV NV_CUDA_CUDART_VERSION 11.8.89-1
ENV NV_CUDA_COMPAT_PACKAGE cuda-compat-11-8

LABEL maintainer "NVIDIA CORPORATION <cudatools@nvidia.com>"

RUN apt-get update && apt-get install -y --no-install-recommends \\
    gnupg2 curl ca-certificates && \\
    curl -fsSLO https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/\${NVARCH}/cuda-keyring_1.0-1_all.deb && \\
    dpkg -i cuda-keyring_1.0-1_all.deb && \\
    apt-get purge --autoremove -y curl && \\
    rm -rf /var/lib/apt/lists/*
...
\`\`\`

then I added the cuda-toolkit, python and others:

\`\`\`Dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \\
    cuda-toolkit-11-8 \\
    && apt-mark hold \${NV_CUDNN_PACKAGE_NAME} && \\
    rm -rf /var/lib/apt/lists/*

RUN apt-get update --yes && \\
    apt-get upgrade --yes && \\
    apt install --yes --no-install-recommends \\
    git \\
    wget \\
    curl \\
    bash \\
    libgl1 \\
    software-properties-common \\
    ffmpeg \\
    openssh-server \\
    zip \\
    unzip \\
    iputils-ping \\
    libtcmalloc-minimal4 \\
    net-tools \\
    vim \\
    p7zip-full && \\
    rm -rf /var/lib/apt/lists/*

RUN add-apt-repository ppa:deadsnakes/ppa

RUN apt install python3.10-dev python3.10-venv -y --no-install-recommends && \\
    ln -s /usr/bin/python3.10 /usr/bin/python && \\
    rm /usr/bin/python3 && \\
    ln -s /usr/bin/python3.10 /usr/bin/python3 && \\
    apt-get clean && rm -rf /var/lib/apt/lists/* && \\
    echo "en_US.UTF-8 UTF-8" > /etc/locale.gen

ENV LD_LIBRARY_PATH /usr/local/cuda/lib64:$LD_LIBRARY_PATH

RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \\
    python get-pip.py && \\
    pip install -U ipympl==0.9.2 jupyterlab==3.4.8 matplotlib==3.6.1 ipywidgets jupyter-archive && \\
    pip install -U jupyter_contrib_nbextensions && \\
    jupyter contrib nbextension install --user && \\
    jupyter nbextension enable --py widgetsnbextension && \\
    rm -rf ~/.cache/pip
\`\`\`

Then I used [dive tools](https://github.com/wagoodman/dive) to analyze the image:

\`\`\`bash
docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock wagoodman/dive:latest 10.108.163.251:20443/megaease/sd-cuda118-cudnn8-ubuntu2204:builder
\`\`\`

From the result, I've made sure that I can remove the \`/usr/local/cuda-11.8\` and \`/opt/nvidia\` from the image.

\`\`\`Dockerfile
FROM builder as tmp

RUN mkdir /data && mv /usr/local/cuda-11.8 /data/cuda-11.8 && \\
    mv /opt/nvidia /data/nvidia

FROM ubuntu:22.04 as slim

COPY --from=tmp /etc /etc
COPY --from=tmp /usr /usr
COPY --from=tmp /root /root
COPY --from=tmp /var/cache /var/cache
COPY --from=tmp /var/lib /var/lib
COPY --from=tmp /run /run
\`\`\`

The next step is to add pytorch to the image.

\`\`\`Dockerfile
FROM builder as builder-torch201

RUN pip install torch==2.0.1+cu118 torchvision==0.15.2+cu118 torchaudio==2.0.2+cu118 --index-url https://download.pytorch.org/whl/cu118 && \\
    rm -rf ~/.cache/pip

FROM builder-torch201 as tmp-torch201

RUN mkdir /data && mv /usr/local/cuda-11.8 /data/cuda-11.8 && \\
    mv /usr/local/lib/python3.10/dist-packages /data/dist-packages && \\
    mv /opt/nvidia /data/nvidia

FROM ubuntu:22.04 as slim-torch201

COPY --from=tmp-torch201 /etc /etc
COPY --from=tmp-torch201 /usr /usr
COPY --from=tmp-torch201 /root /root
COPY --from=tmp-torch201 /var/cache /var/cache
COPY --from=tmp-torch201 /var/lib /var/lib
COPY --from=tmp-torch201 /run /run
\`\`\`

### Make it a little bit automatic

I wrote a docker compose file to build the image and share the storage:

\`\`\`yaml
services:
  builder:
    image: megaease/cuda-11.8-cudnn8-ubuntu22.04:builder
    build:
      context: .
      target: builder
    volumes:
      - type: bind
        source: ./pvc
        target: /data
      - type: bind
        source: generate_pvc.sh
        target: /generate_pvc.sh
    command: [ "/generate_pvc.sh" ]
  slim:
    image: megaease/cuda-11.8-cudnn8-ubuntu22.04:slim
    build:
      context: .
      target: slim
  builder-torch201:
    image: megaease/cuda-11.8-cudnn8-ubuntu22.04:builder-torch201
    build:
      context: .
      target: builder-torch201
    volumes:
      - type: bind
        source: ./pvc
        target: /data
      - type: bind
        source: generate_torch.sh
        target: /generate_torch.sh
    command: ["/generate_torch.sh"]
  slim-torch201:
    image: megaease/cuda-11.8-cudnn8-ubuntu22.04:slim-torch201
    build:
      context: .
      target: slim-torch201
\`\`\`

The \`generate_pvc.sh\`:

\`\`\`bash
#!/bin/bash

rm -rf /data/cuda
mkdir -p /data/cuda
cp -rT /usr/local/cuda-11.8 /data/cuda

rm -rf /data/nvidia
mkdir -p /data/nvidia
cp -rT /opt/nvidia /data/nvidia
\`\`\`

The \`generate_torch.sh\`:

\`\`\`bash
#!/bin/bash

rm -rf /data/dist-packages-torch201
mkdir -p /data/dist-packages-torch201
cp -rT /usr/local/lib/python3.10/dist-packages /data/dist-packages-torch201
\`\`\`

Then I wrote a build script to build the image and push data to the shared storage:

\`\`\`bash
#!/bin/bash

mkdir -p pvc
chmod +x generate_pvc.sh
chmod +x generate_torch.sh

# Function to build specified services
build_services() {
  if [ $# -eq 0 ]; then
    echo "No services provided to build."
    exit 1
  fi

  # Build the specified services
  docker-compose build "$@" --progress=plain
  docker compose up "$@"
  docker compose push "$@"

  # shellcheck disable=SC2199
  if [[ " $@ " =~ " builder " ]]; then
    echo "builder is built. Executing tar command..."
    tar -cvf cuda.tar pvc/cuda
    scp cuda.tar storage-node01:~/gpu/model

    tar -cvf nvidia.tar pvc/nvidia
    scp nvidia.tar storage-node01:~/gpu/model
  fi

  # shellcheck disable=SC2199
  if [[ " $@ " =~ " builder-torch201 " ]]; then
    echo "builder-torch201 is built. Executing tar command..."
    tar -cvf dist-packages-torch201.tar pvc/dist-packages-torch201
    scp dist-packages-torch201.tar storage-node01:~/gpu/model
  fi
}

# Check arguments and perform action accordingly
if [ "$#" -eq 0 ]; then
  echo "Usage: $0 [builder slim builder-torch201 slim-torch201 builder-torch210 slim-torch210 ...] | all"
  echo "Example: $0 builder slim"
  exit 1
fi

if [ "$1" = "all" ]; then
  # Build all services
  docker compose build --progress=plain
  docker compose up
  docker compose push

  tar -cvf cuda.tar pvc/cuda
  scp cuda.tar storage-node01:~/gpu/model

  tar -cvf nvidia.tar pvc/nvidia
  scp nvidia.tar storage-node01:~/gpu/model

  tar -cvf dist-packages-torch201.tar pvc/dist-packages-torch201
  scp dist-packages-torch201.tar storage-node01:~/gpu/model
else
  # Build specific services
  build_services "$@"
fi
\`\`\`
`}function b(){return n}function v(){return[{depth:2,slug:"how-to-reduce-the-nvidia-docker-image-size",text:"How to reduce the Nvidia Docker image size"},{depth:3,slug:"the-problem",text:"The problem"},{depth:3,slug:"the-solution",text:"The solution"},{depth:3,slug:"make-it-a-little-bit-automatic",text:"Make it a little bit automatic"}]}const g=a((c,i,d)=>{const{layout:F,...s}=o;return s.file=t,s.url=r,p`${e()}${l(n)}`});export{g as Content,b as compiledContent,g as default,t as file,o as frontmatter,v as getHeadings,m as rawContent,r as url};
