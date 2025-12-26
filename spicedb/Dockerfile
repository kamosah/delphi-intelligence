# Multi-stage build to add grpcurl and zed to distroless SpiceDB image

# Stage 1: Download binaries
FROM alpine:3.19 AS builder

# Install wget for downloading binaries
RUN apk add --no-cache wget ca-certificates tar

WORKDIR /tmp

# Download and extract grpcurl (for health checks)
RUN wget -O grpcurl.tar.gz https://github.com/fullstorydev/grpcurl/releases/download/v1.9.1/grpcurl_1.9.1_linux_x86_64.tar.gz && \
    tar -xzf grpcurl.tar.gz && \
    chmod +x grpcurl

# Download and extract zed CLI (for schema management)
# Using GNU variant for broader compatibility
RUN wget -O zed.tar.gz https://github.com/authzed/zed/releases/download/v0.33.2/zed_0.33.2_linux_amd64_gnu.tar.gz && \
    tar -xzf zed.tar.gz && \
    chmod +x zed

# Stage 2: Final SpiceDB image with tools
FROM authzed/spicedb:v1.48.0

# Copy binaries from builder
COPY --from=builder /tmp/grpcurl /usr/local/bin/grpcurl
COPY --from=builder /tmp/zed /usr/local/bin/zed
