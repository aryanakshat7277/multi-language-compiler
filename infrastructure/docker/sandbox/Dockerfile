FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install compilers and runtimes
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    openjdk-17-jdk-headless \
    python3 \
    python3-pip \
    nodejs \
    npm \
    golang-go \
    rustc \
    cargo \
    && rm -rf /var/lib/apt/lists/*

# Install TypeScript globally
RUN npm install -g typescript tsx

# Create non-root sandbox user
RUN useradd -m -u 1000 -s /bin/bash sandbox

# Create workspace
RUN mkdir -p /workspace && chown sandbox:sandbox /workspace

# Switch to non-root user
USER sandbox
WORKDIR /workspace

# Default command
CMD ["sleep", "300"]
