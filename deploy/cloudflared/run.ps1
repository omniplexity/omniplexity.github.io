# Cloudflare Tunnel Runner for OmniPlexity Backend (Windows)
# Usage: .\run.ps1

# Check if config exists
$configPath = "config.yml"
if (-not (Test-Path $configPath)) {
    Write-Host "Error: config.yml not found. Copy config.yml.example and configure it." -ForegroundColor Red
    exit 1
}

# Run tunnel
Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Green
& cloudflared tunnel run --config $configPath