# pr_fetch.ps1
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File pr_fetch.ps1
try {
    $repoDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
    Set-Location $repoDir
    $tokenPath = Join-Path $repoDir '.gh_token'
    if (-not (Test-Path $tokenPath)) { throw "Token file not found at $tokenPath" }
    $token = (Get-Content -Raw $tokenPath).Trim()
    $headers = @{ Authorization = "token $token"; 'User-Agent' = 'repo-agent' }

    New-Item -ItemType Directory -Path .\pr_api -Force | Out-Null

    $prUrl = 'https://api.github.com/repos/wilianflima321-glitch/meu-repo/pulls/6'
    Write-Host "Fetching PR metadata..."
    $pr = Invoke-RestMethod -Headers $headers -Uri $prUrl
    $pr | ConvertTo-Json -Depth 10 | Out-File -FilePath .\pr_api\pr.json -Encoding utf8

    $headBranch = $pr.head.ref
    Write-Host "PR head branch: $headBranch"

    $runsUrl = "https://api.github.com/repos/wilianflima321-glitch/meu-repo/actions/runs?branch=$headBranch&per_page=10"
    Write-Host "Listing workflow runs for branch $headBranch..."
    Invoke-RestMethod -Headers $headers -Uri $runsUrl | ConvertTo-Json -Depth 10 | Out-File .\pr_api\runs.json -Encoding utf8

    $runs = Get-Content -Raw .\pr_api\runs.json | ConvertFrom-Json
    if ($runs.total_count -gt 0) {
        $runId = $runs.workflow_runs[0].id
        Write-Host "Latest run id: $runId"
        $artUrl = "https://api.github.com/repos/wilianflima321-glitch/meu-repo/actions/runs/$runId/artifacts"
        Invoke-RestMethod -Headers $headers -Uri $artUrl | ConvertTo-Json -Depth 10 | Out-File .\pr_api\artifacts.json -Encoding utf8

        $arts = Get-Content -Raw .\pr_api\artifacts.json | ConvertFrom-Json
        if ($arts.total_count -gt 0) {
            $artDir = '.\pr_api\artifacts'
            New-Item -ItemType Directory -Path $artDir -Force | Out-Null
            foreach ($a in $arts.artifacts) {
                $name = $a.name
                $url = $a.archive_download_url
                Write-Host "Downloading artifact: $name"
                $out = Join-Path $artDir ($name + '.zip')
                Invoke-RestMethod -Headers $headers -Uri $url -OutFile $out
                Expand-Archive -LiteralPath $out -DestinationPath (Join-Path $artDir $name) -Force
            }
        }
        else { Write-Host 'No artifacts found for latest run.' }
    } else {
        Write-Host 'No workflow runs found for the PR branch.'
    }
}
catch {
    Write-Error "Error: $_"
    exit 1
}