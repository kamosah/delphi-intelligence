# Multi-stage build to add grpcurl and zed to distroless SpiceDB image

# Stage 1: Download binaries
FROM alpine:3.19 AS builder

# Install wget and sha256sum for downloading and verifying binaries
RUN apk add --no-cache wget ca-certificates tar coreutils

WORKDIR /tmp

# Download and verify grpcurl (for health checks)
# SHA256 checksum verified from https://github.com/fullstorydev/grpcurl/releases/download/v1.9.1/grpcurl_1.9.1_checksums.txt
RUN wget -O grpcurl.tar.gz https://github.com/fullstorydev/grpcurl/releases/download/v1.9.1/grpcurl_1.9.1_linux_x86_64.tar.gz && \
    echo "588c9c429476d9ed66cd3b2ae32283a6da36e0cfbb7e446f5d6a1b68dc770214  grpcurl.tar.gz" | sha256sum -c - && \
    tar -xzf grpcurl.tar.gz && \
    chmod +x grpcurl && \
    rm grpcurl.tar.gz

# Download and verify zed CLI (for schema management)
# Using GNU variant for broader compatibility
# SHA256 checksum verified from https://github.com/authzed/zed/releases/download/v0.33.2/checksums.txt
RUN wget -O zed.tar.gz https://github.com/authzed/zed/releases/download/v0.33.2/zed_0.33.2_linux_amd64_gnu.tar.gz && \
    echo "ab8ee9086d63a3d55374ca3f71265fa1c698cb522b89df20eb8a136f1ba535e4  zed.tar.gz" | sha256sum -c - && \
    tar -xzf zed.tar.gz && \
    chmod +x zed && \
    rm zed.tar.gz

# Stage 2: Final SpiceDB image with tools
FROM authzed/spicedb:v1.48.0

# Copy binaries from builder
COPY --from=builder /tmp/grpcurl /usr/local/bin/grpcurl
COPY --from=builder /tmp/zed /usr/local/bin/zed
