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
New-Item -ItemType Directory -Path .\pr_api -Force | Out-Null
$artUrl = "https://api.github.com/repos/wilianflima321-glitch/meu-repo/actions/runs/$RunId/artifacts"
Write-Host "Listing artifacts for run $RunId..."
$arts = Invoke-RestMethod -Headers $headers -Uri $artUrl
$arts | ConvertTo-Json -Depth 10 | Out-File .\pr_api\artifacts_run_$RunId.json -Encoding utf8
if ($arts.total_count -gt 0) {
    $artDir = ".\pr_api\artifacts_run_$RunId"
    New-Item -ItemType Directory -Path $artDir -Force | Out-Null
    foreach ($a in $arts.artifacts) {
        $name = $a.name
        $url = $a.archive_download_url
        Write-Host "Downloading artifact: $name"
        $out = Join-Path $artDir ($name + '.zip')
        Invoke-RestMethod -Headers $headers -Uri $url -OutFile $out
        Expand-Archive -LiteralPath $out -DestinationPath (Join-Path $artDir $name) -Force
    }
    Write-Host "Downloaded and extracted artifacts to $artDir"
} else { Write-Host "No artifacts found for run $RunId" }
