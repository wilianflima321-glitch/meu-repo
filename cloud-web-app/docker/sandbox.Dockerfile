# Aethel Engine - Sandbox Container Image
# This image is used for isolated terminal sessions with all development tools pre-installed.
# Security-hardened with minimal attack surface.

FROM ubuntu:22.04 AS base

# Prevent interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Create non-root user
RUN groupadd -g 1000 sandbox && \
    useradd -m -u 1000 -g sandbox -s /bin/bash sandbox

# Install essential packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Shell & utils
    bash \
    ca-certificates \
    curl \
    wget \
    git \
    vim-tiny \
    nano \
    less \
    tree \
    htop \
    procps \
    # Build essentials
    build-essential \
    cmake \
    pkg-config \
    # Python
    python3 \
    python3-pip \
    python3-venv \
    # Compression
    zip \
    unzip \
    tar \
    gzip \
    # Network tools (limited)
    iputils-ping \
    dnsutils \
    # SSL
    openssl \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g \
    typescript \
    ts-node \
    npm-check-updates \
    serve \
    && npm cache clean --force

# Install Rust (minimal)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal && \
    echo 'source $HOME/.cargo/env' >> /etc/bash.bashrc

# Install Go
RUN curl -fsSL https://go.dev/dl/go1.22.0.linux-amd64.tar.gz | tar -C /usr/local -xzf - && \
    echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/bash.bashrc

# Python pip packages (commonly used)
RUN pip3 install --no-cache-dir \
    black \
    flake8 \
    pytest \
    debugpy \
    virtualenv

# Create workspace directory
RUN mkdir -p /workspace && chown sandbox:sandbox /workspace

# Security hardening
# Remove potentially dangerous binaries
RUN rm -f /usr/bin/passwd /usr/bin/chsh /usr/bin/chfn /usr/bin/newgrp \
    && chmod 700 /root

# Set up shell configuration
COPY --chown=sandbox:sandbox <<EOF /home/sandbox/.bashrc
# Aethel Sandbox Shell
export PS1='\[\033[01;32m\]sandbox@aethel\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
export PATH="\$HOME/.local/bin:\$HOME/.cargo/bin:/usr/local/go/bin:\$PATH"
export TERM=xterm-256color

# Aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'

# History settings
export HISTSIZE=1000
export HISTFILESIZE=2000
export HISTCONTROL=ignoreboth

# Welcome message
echo "🚀 Aethel Engine Sandbox Environment"
echo "   Workspace: /workspace"
echo "   Node: \$(node --version 2>/dev/null || echo 'not available')"
echo "   Python: \$(python3 --version 2>/dev/null || echo 'not available')"
echo ""
EOF

# Set ownership
RUN chown -R sandbox:sandbox /home/sandbox

# Switch to non-root user
USER sandbox
WORKDIR /workspace

# Default command
CMD ["/bin/bash"]
