---
title: "How to reduce the Nvidia Docker image size"
publishDate: "22 February 2024"
description: "The Nvidia Docker image is too large for Kubernetes to extract. How to reduce the image size?"
tags: ["Docker", "Kubernetes", "Image", "GPU"]
---

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

```bash
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
```

It is obvious that the `/usr/local/cuda-11.8` and `/usr/lib/x86_64-linux-gnu` and `/opt/nvidia` are the largest directories. However, I can't
remove `/usr/lib/x86_64-linux-gnu` because it contains the shared libraries. So I decide to remove the `/usr/local/cuda-11.8` and `/opt/nvidia`
from the image. But I need to install cuda-toolkit and pytorch in the container and I also need a slim version of the cuda devel image. So I have
to build it by myself.

I found the [nvidia/cuda Dockerfile](https://gitlab.com/nvidia/container-images/cuda/-/tree/master/dist/11.8.0/ubuntu2204?ref_type=heads). I
merged it like this:

```Dockerfile
FROM ubuntu:22.04 as builder

ENV NVARCH x86_64

ENV NVIDIA_REQUIRE_CUDA "cuda>=11.8 brand=tesla,driver>=470,driver<471 brand=unknown,driver>=470,driver<471 brand=nvidia,driver>=470,driver<471 brand=nvidiartx,driver>=470,driver<471 brand=geforce,driver>=470,driver<471 brand=geforcertx,driver>=470,driver<471 brand=quadro,driver>=470,driver<471 brand=quadrortx,driver>=470,driver<471 brand=titan,driver>=470,driver<471 brand=titanrtx,driver>=470,driver<471"
ENV NV_CUDA_CUDART_VERSION 11.8.89-1
ENV NV_CUDA_COMPAT_PACKAGE cuda-compat-11-8

LABEL maintainer "NVIDIA CORPORATION <cudatools@nvidia.com>"

RUN apt-get update && apt-get install -y --no-install-recommends \
    gnupg2 curl ca-certificates && \
    curl -fsSLO https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/${NVARCH}/cuda-keyring_1.0-1_all.deb && \
    dpkg -i cuda-keyring_1.0-1_all.deb && \
    apt-get purge --autoremove -y curl && \
    rm -rf /var/lib/apt/lists/*
...
```

then I added the cuda-toolkit, python and others:

```Dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    cuda-toolkit-11-8 \
    && apt-mark hold ${NV_CUDNN_PACKAGE_NAME} && \
    rm -rf /var/lib/apt/lists/*

RUN apt-get update --yes && \
    apt-get upgrade --yes && \
    apt install --yes --no-install-recommends \
    git \
    wget \
    curl \
    bash \
    libgl1 \
    software-properties-common \
    ffmpeg \
    openssh-server \
    zip \
    unzip \
    iputils-ping \
    libtcmalloc-minimal4 \
    net-tools \
    vim \
    p7zip-full && \
    rm -rf /var/lib/apt/lists/*

RUN add-apt-repository ppa:deadsnakes/ppa

RUN apt install python3.10-dev python3.10-venv -y --no-install-recommends && \
    ln -s /usr/bin/python3.10 /usr/bin/python && \
    rm /usr/bin/python3 && \
    ln -s /usr/bin/python3.10 /usr/bin/python3 && \
    apt-get clean && rm -rf /var/lib/apt/lists/* && \
    echo "en_US.UTF-8 UTF-8" > /etc/locale.gen

ENV LD_LIBRARY_PATH /usr/local/cuda/lib64:$LD_LIBRARY_PATH

RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python get-pip.py && \
    pip install -U ipympl==0.9.2 jupyterlab==3.4.8 matplotlib==3.6.1 ipywidgets jupyter-archive && \
    pip install -U jupyter_contrib_nbextensions && \
    jupyter contrib nbextension install --user && \
    jupyter nbextension enable --py widgetsnbextension && \
    rm -rf ~/.cache/pip
```

Then I used [dive tools](https://github.com/wagoodman/dive) to analyze the image:

```bash
docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock wagoodman/dive:latest 10.108.163.251:20443/megaease/sd-cuda118-cudnn8-ubuntu2204:builder
```

From the result, I've made sure that I can remove the `/usr/local/cuda-11.8` and `/opt/nvidia` from the image.

```Dockerfile
FROM builder as tmp

RUN mkdir /data && mv /usr/local/cuda-11.8 /data/cuda-11.8 && \
    mv /opt/nvidia /data/nvidia

FROM ubuntu:22.04 as slim

COPY --from=tmp /etc /etc
COPY --from=tmp /usr /usr
COPY --from=tmp /root /root
COPY --from=tmp /var/cache /var/cache
COPY --from=tmp /var/lib /var/lib
COPY --from=tmp /run /run
```

The next step is to add pytorch to the image.

```Dockerfile
FROM builder as builder-torch201

RUN pip install torch==2.0.1+cu118 torchvision==0.15.2+cu118 torchaudio==2.0.2+cu118 --index-url https://download.pytorch.org/whl/cu118 && \
    rm -rf ~/.cache/pip

FROM builder-torch201 as tmp-torch201

RUN mkdir /data && mv /usr/local/cuda-11.8 /data/cuda-11.8 && \
    mv /usr/local/lib/python3.10/dist-packages /data/dist-packages && \
    mv /opt/nvidia /data/nvidia

FROM ubuntu:22.04 as slim-torch201

COPY --from=tmp-torch201 /etc /etc
COPY --from=tmp-torch201 /usr /usr
COPY --from=tmp-torch201 /root /root
COPY --from=tmp-torch201 /var/cache /var/cache
COPY --from=tmp-torch201 /var/lib /var/lib
COPY --from=tmp-torch201 /run /run
```

### Make it a little bit automatic

I wrote a docker compose file to build the image and share the storage:

```yaml
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
    command: ["/generate_pvc.sh"]
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
```

The `generate_pvc.sh`:

```bash
#!/bin/bash

rm -rf /data/cuda
mkdir -p /data/cuda
cp -rT /usr/local/cuda-11.8 /data/cuda

rm -rf /data/nvidia
mkdir -p /data/nvidia
cp -rT /opt/nvidia /data/nvidia
```

The `generate_torch.sh`:

```bash
#!/bin/bash

rm -rf /data/dist-packages-torch201
mkdir -p /data/dist-packages-torch201
cp -rT /usr/local/lib/python3.10/dist-packages /data/dist-packages-torch201
```

Then I wrote a build script to build the image and push data to the shared storage:

```bash
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
```

### Conclusion

The image size looks like this:

```text
REPOSITORY                        TAG                                         IMAGE ID       CREATED         SIZE
cuda-11.8-cudnn8-ubuntu22.04      builder                                     85145614cc65   2 months ago    12GB
cuda-11.8-cudnn8-ubuntu22.04      builder-torch201                            6e66a33cfa69   2 months ago    16.5GB

cuda-11.8-cudnn8-ubuntu22.04      slim                                        f94fffa6243e   2 months ago    4.52GB
cuda-11.8-cudnn8-ubuntu22.04      slim-torch201                               a80ffa1fecf0   2 months ago    4.13GB
```

- The `/usr/lib/x86_64-linux-gnu` is around 4GB, but I can't remove it because it contains the shared libraries. However, If your service doesn't
  require additional packages at runtime, you can also remove the `x86_64-linux-gnu` directory. After removing it, the image size will be reduced
  to only 200MB. I suggest you not to remove it because it may cause some problems when you run it in the kubernetes environment.
- When we push the `slim` image to Dockerhub or your private repository, the size is only 2.27GB after compressing it.
