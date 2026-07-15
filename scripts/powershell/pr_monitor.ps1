<#
pr_monitor.ps1
Polls the GitHub Actions API for workflow runs on the PR head branch and triggers pr_fetch.ps1 when a run appears.
Usage: powershell -NoProfile -ExecutionPolicy Bypass -File pr_monitor.ps1 [-TimeoutMinutes 20] [-PollIntervalSeconds 30]
#>
param(
    [int] $TimeoutMinutes = 20,
    [int] $PollIntervalSeconds = 30
)
try {
    $scriptDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
    Set-Location $scriptDir

    $tokenPath = Join-Path $scriptDir '.gh_token'
    if (-not (Test-Path $tokenPath)) { throw "Token file not found at $tokenPath" }
    $token = (Get-Content -Raw $tokenPath).Trim()
    $headers = @{ Authorization = "token $token"; 'User-Agent' = 'repo-agent' }

    # Get PR metadata to extract head ref
    $prUrl = 'https://api.github.com/repos/wilianflima321-glitch/meu-repo/pulls/6'
    $pr = Invoke-RestMethod -Headers $headers -Uri $prUrl
    $headBranch = $pr.head.ref
    Write-Host "Monitoring workflow runs for branch: $headBranch"

    $attempts = [math]::Ceiling(($TimeoutMinutes * 60) / $PollIntervalSeconds)
    for ($i = 1; $i -le $attempts; $i++) {
        Write-Host "Poll attempt $i/$attempts..."
        $runsUrl = "https://api.github.com/repos/wilianflima321-glitch/meu-repo/actions/runs?branch=$headBranch&per_page=5"
        $runs = Invoke-RestMethod -Headers $headers -Uri $runsUrl
        if ($runs.total_count -gt 0) {
            Write-Host "Found $($runs.total_count) workflow run(s). Fetching artifacts with pr_fetch.ps1..."
            # Call pr_fetch to download artifacts
            & "$scriptDir\pr_fetch.ps1"
            Write-Host "Fetch complete. Exiting monitor."
            exit 0
        }
        else {
            Write-Host "No runs yet. Sleeping $PollIntervalSeconds seconds..."
            Start-Sleep -Seconds $PollIntervalSeconds
        }
    }
    Write-Host "Timeout reached ($TimeoutMinutes minutes). No runs found for branch $headBranch."
    exit 2
}
catch {
    Write-Error "Error in monitor: $_"
    exit 1
}