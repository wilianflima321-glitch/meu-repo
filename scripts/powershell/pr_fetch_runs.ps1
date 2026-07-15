# pr_fetch_runs.ps1
# Fetch latest workflow runs for the repo and save to pr_api/all_runs.json
$ErrorActionPreference = 'Stop'
$repoDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
Set-Location $repoDir
$tokenPath = Join-Path $repoDir '.gh_token'
if (-not (Test-Path $tokenPath)) { Write-Error "Token file not found at $tokenPath"; exit 1 }
$token = (Get-Content -Raw $tokenPath).Trim()
$headers = @{ Authorization = "token $token"; 'User-Agent' = 'repo-agent' }
New-Item -ItemType Directory -Path .\pr_api -Force | Out-Null
$url = 'https://api.github.com/repos/wilianflima321-glitch/meu-repo/actions/runs?per_page=20'
Invoke-RestMethod -Headers $headers -Uri $url | ConvertTo-Json -Depth 10 | Out-File .\pr_api\all_runs.json -Encoding utf8
Write-Host 'Saved pr_api/all_runs.json'