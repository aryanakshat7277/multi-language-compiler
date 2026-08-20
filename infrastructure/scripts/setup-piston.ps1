# Piston Runtime Installer
# Installs language runtimes into the running Piston container.
#
# Prerequisites:
#   - Docker Desktop running
#   - Piston container started via docker-compose.piston.yml
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File setup-piston.ps1

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Piston Runtime Installer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Piston container is running
$container = docker ps --filter "name=piston" --format "{{.Names}}" 2>$null
if ($container -ne "piston") {
    Write-Host "[ERROR] Piston container is not running." -ForegroundColor Red
    Write-Host "Start it with: docker compose -f infrastructure/docker/docker-compose.piston.yml up -d" -ForegroundColor Yellow
    exit 1
}

# Wait for Piston API to be ready
Write-Host "[INFO] Waiting for Piston API to be ready..." -ForegroundColor Yellow
$maxRetries = 30
$retry = 0
while ($retry -lt $maxRetries) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:2000/api/v2/runtimes" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "[OK] Piston API is ready." -ForegroundColor Green
        break
    } catch {
        $retry++
        if ($retry -ge $maxRetries) {
            Write-Host "[ERROR] Piston API did not become ready after $maxRetries attempts." -ForegroundColor Red
            exit 1
        }
        Start-Sleep -Seconds 2
    }
}

# Define runtimes to install
$runtimes = @(
    @{ Language = "python";     Version = "3.10.0";  Display = "Python 3.10" },
    @{ Language = "gcc";        Version = "10.2.0";  Display = "GCC 10.2 (C)" },
    @{ Language = "g++";        Version = "10.2.0";  Display = "G++ 10.2 (C++)" },
    @{ Language = "java";       Version = "15.0.2";  Display = "Java 15" },
    @{ Language = "node";       Version = "18.15.0"; Display = "Node.js 18 (JavaScript)" },
    @{ Language = "typescript"; Version = "5.0.3";   Display = "TypeScript 5" },
    @{ Language = "go";         Version = "1.16.2";  Display = "Go 1.16" },
    @{ Language = "rust";       Version = "1.68.2";  Display = "Rust 1.68" }
)

Write-Host ""
Write-Host "[INFO] Installing $($runtimes.Count) language runtimes..." -ForegroundColor Yellow
Write-Host ""

foreach ($rt in $runtimes) {
    Write-Host "  Installing $($rt.Display) ($($rt.Language)@$($rt.Version))..." -ForegroundColor White -NoNewline
    
    try {
        # Use Piston CLI inside the container to install packages
        $result = docker exec piston /piston/packages/pkg-install.sh $rt.Language $rt.Version 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Host " OK" -ForegroundColor Green
        } else {
            # Try alternative install method
            $result2 = docker exec piston bash -c "cd /piston && node packages/pkg-install.sh $($rt.Language) $($rt.Version)" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host " OK" -ForegroundColor Green
            } else {
                Write-Host " SKIPPED (may already be installed or version unavailable)" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host " FAILED: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[INFO] Verifying installed runtimes..." -ForegroundColor Yellow

try {
    $runtimes = Invoke-RestMethod -Uri "http://localhost:2000/api/v2/runtimes" -TimeoutSec 5
    Write-Host ""
    Write-Host "  Installed Runtimes:" -ForegroundColor Cyan
    Write-Host "  -------------------" -ForegroundColor Cyan
    foreach ($rt in $runtimes) {
        Write-Host "  $($rt.language) v$($rt.version) (aliases: $($rt.aliases -join ', '))" -ForegroundColor White
    }
} catch {
    Write-Host "[WARN] Could not verify runtimes: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Piston setup complete!" -ForegroundColor Green
Write-Host "  API: http://localhost:2000/api/v2" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
