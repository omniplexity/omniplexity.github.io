#!/bin/bash
# Cloudflare Tunnel Runner for OmniPlexity Backend (Linux/Mac)
# Usage: ./run.sh

set -e

# Check if config exists
if [ ! -f "config.yml" ]; then
    echo "Error: config.yml not found. Copy config.yml.example and configure it."
    exit 1
fi

# Run tunnel
echo "Starting Cloudflare Tunnel..."
exec cloudflared tunnel run --config config.yml