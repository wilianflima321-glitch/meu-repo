param(
    [Parameter(Mandatory=$true)] [string] $FilePath,
    [string] $Ref = 'infra/playwright-ci-ensemble-workflow-fix'
)
$ErrorActionPreference = 'Stop'
$repoDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
Set-Location $repoDir
$tokenPath = Join-Path $repoDir '.gh_token'
if (-not (Test-Path $tokenPath)) { Write-Error "Token file not found at $tokenPath"; exit 1 }
$token = (Get-Content -Raw $tokenPath).Trim()
$headers = @{ Authorization = "token $token"; 'User-Agent' = 'repo-agent' }
$url = "https://api.github.com/repos/wilianflima321-glitch/meu-repo/contents/$FilePath?ref=$Ref"
Write-Host "Fetching $url"
$res = Invoke-RestMethod -Headers $headers -Uri $url
$res | ConvertTo-Json -Depth 10 | Out-File .\pr_api\remote_file.json -Encoding utf8
Write-Host "Saved pr_api/remote_file.json"
