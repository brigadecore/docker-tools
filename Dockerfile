FROM docker:20.10.9

ARG BUILDX_VERSION=v0.6.3
ARG GRYPE_VERSION=v0.33.1
ARG SYFT_VERSION=v0.41.4

RUN apk add \ 
    curl \
    git \
    make \
  && mkdir -p /usr/libexec/docker/cli-plugins \
  && curl \
    -L \
    -o /usr/libexec/docker/cli-plugins/docker-buildx \
    https://github.com/docker/buildx/releases/download/$BUILDX_VERSION/buildx-$BUILDX_VERSION.linux-amd64 \
  && chmod 755 /usr/libexec/docker/cli-plugins/docker-buildx \
  && curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin $GRYPE_VERSION \
  && curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin $SYFT_VERSION
