FROM golang:1.17.8-bullseye as builder

ARG GHR_VERSION=v0.14.0
ARG CGO_ENABLED=0
ARG GOPATH=/tmp/gotools

RUN go get -v github.com/tcnksm/ghr@$GHR_VERSION \
    && mv $GOPATH/bin/* /usr/local/bin/

FROM docker:20.10.9 as final

ARG BUILDX_VERSION=v0.6.3
ARG GRYPE_VERSION=v0.34.7
ARG SYFT_VERSION=v0.42.4

COPY --from=builder /usr/local/bin/ghr /usr/local/bin/ghr

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
