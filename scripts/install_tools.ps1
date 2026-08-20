$ErrorActionPreference = 'Stop'
$toolsDir = "d:\MULTI LANGUAGE COMPILER\runtimes"
if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
}

$devkitBin = Join-Path $toolsDir "w64devkit\bin\g++.exe"
if (-not (Test-Path $devkitBin)) {
    Write-Host "Downloading w64devkit standalone C/C++ toolchain..."
    $zipUrl = "https://github.com/skeeto/w64devkit/releases/download/v2.0.0/w64devkit-2.0.0.zip"
    $zipPath = Join-Path $toolsDir "w64devkit.zip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "Extracting w64devkit..."
    Expand-Archive -Path $zipPath -DestinationPath $toolsDir -Force
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Write-Host "w64devkit installed successfully!"
} else {
    Write-Host "w64devkit already installed."
}
