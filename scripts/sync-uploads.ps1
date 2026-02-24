param(
  [string]$FtpServer = "ftp.star-siec.edu.vn",
  [string]$RemoteDir = "/ix.star-siec.edu.vn/backend/uploads"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$localDir = Join-Path $repoRoot "backend/uploads"

if (-not (Test-Path $localDir)) {
  Write-Error "Local uploads folder not found: $localDir"
}

if (-not $env:FTP_USERNAME -or -not $env:FTP_PASSWORD) {
  Write-Error "Please set FTP_USERNAME and FTP_PASSWORD in your shell."
}

$winScpCmd = Get-Command "WinSCP.com" -ErrorAction SilentlyContinue
if (-not $winScpCmd) {
  $defaultPath = "C:\Program Files (x86)\WinSCP\WinSCP.com"
  if (Test-Path $defaultPath) {
    $winScpCmd = $defaultPath
  } else {
    Write-Error "WinSCP.com not found. Install WinSCP or add it to PATH."
  }
}

$openCmd = "open ftp://$($env:FTP_USERNAME):$($env:FTP_PASSWORD)@$FtpServer/"
$syncCmd = "synchronize remote -criteria=time -nopreservetime `"$localDir`" `"$RemoteDir`""

& $winScpCmd /command `
  "option batch abort" `
  "option confirm off" `
  $openCmd `
  "option transfer binary" `
  $syncCmd `
  "exit"

if ($LASTEXITCODE -ne 0) {
  Write-Error "Sync failed with exit code $LASTEXITCODE."
}

Write-Host "Sync complete: $localDir -> $FtpServer:$RemoteDir"
