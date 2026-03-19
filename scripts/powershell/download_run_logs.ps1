param(
    [Parameter(Mandatory=$true)][long]$RunId
)
$ErrorActionPreference = 'Stop'
$repoDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
Set-Location $repoDir
$tokenPath = Join-Path $repoDir '.gh_token'
if (-not (Test-Path $tokenPath)) { Write-Error "Token file not found at $tokenPath"; exit 1 }
$token = (Get-Content -Raw $tokenPath).Trim()
$headers = @{ Authorization = "token $token"; 'User-Agent' = 'repo-agent' }
$logUrl = "https://api.github.com/repos/wilianflima321-glitch/meu-repo/actions/runs/$RunId/logs"
$out = ".\pr_api\run_${RunId}_logs.zip"
Write-Host "Downloading logs zip to $out"
Invoke-WebRequest -Headers $headers -Uri $logUrl -OutFile $out -UseBasicParsing
if (Test-Path $out) {
    $dest = ".\pr_api\run_${RunId}_logs"
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    Expand-Archive -LiteralPath $out -DestinationPath $dest -Force
    Write-Host "Extracted logs to $dest"
} else { Write-Host "Logs zip not found at $out" }
