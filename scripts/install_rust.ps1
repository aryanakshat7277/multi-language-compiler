$ErrorActionPreference = 'Stop'
$rustup = Join-Path $env:TEMP "rustup-init.exe"
if (-not (Test-Path $rustup)) {
    Write-Host "Downloading rustup-init..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $rustup -UseBasicParsing
}
Write-Host "Installing Rust (GNU x86_64 toolchain)..."
& $rustup -y --default-host x86_64-pc-windows-gnu --no-modify-path
Write-Host "Rust installation finished."
