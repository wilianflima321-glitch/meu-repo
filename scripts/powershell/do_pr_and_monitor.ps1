# do_pr_and_monitor.ps1
# Creates a draft PR if missing, monitors the latest workflow run on the branch,
# downloads artifacts, runs a lightweight keyword analysis, and posts a summary comment.
# Safe to run in Windows PowerShell 5.1. Requires $env:GITHUB_TOKEN set with repo+actions scopes.

param()

$owner = 'wilianflima321-glitch'
$repo = 'meu-repo'
$branch = 'infra/playwright-ci-ensemble-confirm-main'
$base = 'main'

$token = $env:GITHUB_TOKEN
if (-not $token) {
    Write-Error "GITHUB_TOKEN not set in environment. Aborting."
    exit 1
}

$api = "https://api.github.com/repos/$owner/$repo"
$headers = @{
    Authorization = "token $token"
    Accept = 'application/vnd.github.v3+json'
    'User-Agent' = 'ci-agent-script'
}

# Read PR body from PR_DRAFT.md if present
$cwd = Join-Path (Get-Location).Path ''
$bodyFile = Join-Path $cwd 'meu-repo\PR_DRAFT.md'
if (-not (Test-Path $bodyFile)) {
    $bodyFile = Join-Path $cwd 'PR_DRAFT.md'
}
$prBody = 'Automated PR created by CI monitor.'
if (Test-Path $bodyFile) {
    try { $prBody = Get-Content -Path $bodyFile -Raw -ErrorAction Stop } catch { Write-Warning "Could not read PR_DRAFT.md: $_" }
}

# 1) Check for existing open PR from this branch to main
Write-Output "Checking for existing PR for $branch -> $base..."
$existingUri = "$api/pulls?head=$owner`:$branch&base=$base&state=open"
try {
    $existing = Invoke-RestMethod -Headers $headers -Uri $existingUri -Method GET -ErrorAction Stop
} catch {
    Write-Error "Failed to query existing PRs: $_"
    exit 1
}

if ($existing -and $existing.Count -gt 0) {
    $pr = $existing[0]
    Write-Output ("Found existing PR: {0} (#{1})" -f $pr.html_url, $pr.number)
} else {
    # Create draft PR
    Write-Output "Creating draft PR..."
    $payload = @{ title = 'Add ensemble verifier, physics checks, Playwright E2E and CI'; head = $branch; base = $base; body = $prBody; draft = $true }
    $json = $payload | ConvertTo-Json -Depth 6
    try {
    $pr = Invoke-RestMethod -Headers $headers -Uri "$api/pulls" -Method POST -Body $json -ContentType 'application/json' -ErrorAction Stop
    Write-Output ("Created PR: {0} (#{1})" -f $pr.html_url, $pr.number)
    } catch {
        Write-Error "Failed to create PR: $_"
        exit 1
    }
}

# Post an initial comment on PR
$initComment = "CI monitor attached. I will watch workflow runs on branch `$branch` and post artifacts + analysis here."
try {
    Invoke-RestMethod -Headers $headers -Uri "$api/issues/$($pr.number)/comments" -Method POST -Body (@{ body = $initComment } | ConvertTo-Json) -ContentType 'application/json' -ErrorAction Stop
    Write-Output "Posted initial comment to PR."
} catch {
    Write-Warning "Could not post initial comment: $_"
}

# 2) Wait for a workflow run on this branch (short timeout)
Write-Output "Looking for workflow runs for branch $branch..."
$run = $null
$searchTimeoutSec = 300
$interval = 5
$elapsed = 0
while ($elapsed -lt $searchTimeoutSec) {
    try {
        $runsResp = Invoke-RestMethod -Headers $headers -Uri "$api/actions/runs?branch=$branch&per_page=10" -Method GET -ErrorAction Stop
    } catch {
        Write-Warning "Failed to list workflow runs: $_"
        Start-Sleep -Seconds $interval
        $elapsed += $interval
        continue
    }

    if ($runsResp.workflow_runs.Count -gt 0) {
        $run = $runsResp.workflow_runs | Where-Object { $_.head_branch -eq $branch } | Sort-Object created_at -Descending | Select-Object -First 1
        if ($run) { break }
    }

    Start-Sleep -Seconds $interval
    $elapsed += $interval
}

if (-not $run) {
    $msg = "No workflow run found for branch '$branch' within $searchTimeoutSec seconds."
    Write-Warning $msg
    try { Invoke-RestMethod -Headers $headers -Uri "$api/issues/$($pr.number)/comments" -Method POST -Body (@{ body = $msg } | ConvertTo-Json) -ContentType 'application/json' } catch {}
    exit 1
}

$run_id = $run.id
Write-Output ("Found workflow run {0}: {1}" -f $run_id, $run.html_url)

# 3) Wait for run completion (longer timeout)
$longTimeoutSec = 3600  # up to 1 hour
$interval2 = 10
$elapsed = 0
$conclusion = $null
while ($elapsed -lt $longTimeoutSec) {
    try {
        $runDetail = Invoke-RestMethod -Headers $headers -Uri "$api/actions/runs/$run_id" -Method GET -ErrorAction Stop
    } catch {
        Write-Warning "Failed to fetch run detail: $_"
        Start-Sleep -Seconds $interval2
        $elapsed += $interval2
        continue
    }

    if ($runDetail.status -eq 'completed') { $conclusion = $runDetail.conclusion; break }
    Write-Output ("Run status: {0}. Waiting..." -f $runDetail.status)
    Start-Sleep -Seconds $interval2
    $elapsed += $interval2
}

if (-not $conclusion) {
    $msg = "Workflow run did not complete within timeout. Aborting artifact fetch."
    Write-Warning $msg
    try { Invoke-RestMethod -Headers $headers -Uri "$api/issues/$($pr.number)/comments" -Method POST -Body (@{ body = $msg } | ConvertTo-Json) -ContentType 'application/json' } catch {}
    exit 1
}

Write-Output ("Workflow run concluded with: {0}" -f $conclusion)

# 4) Download artifacts
$artifactsDir = Join-Path $cwd "meu-repo\ci-artifacts-run-$run_id"
if (-not (Test-Path $artifactsDir)) { New-Item -ItemType Directory -Path $artifactsDir -Force | Out-Null }

try {
    $artifactsResp = Invoke-RestMethod -Headers $headers -Uri "$api/actions/runs/$run_id/artifacts" -Method GET -ErrorAction Stop
} catch {
    Write-Warning "Failed to list artifacts: $_"
    $artifactsResp = $null
}

if ($artifactsResp -and $artifactsResp.artifacts.Count -gt 0) {
    foreach ($a in $artifactsResp.artifacts) {
        $zipPath = Join-Path $artifactsDir ("$($a.name).zip")
    $downloadUrl = "$api/actions/artifacts/$($a.id)/zip"
    Write-Output ("Downloading artifact {0} to {1}" -f $a.name, $zipPath)
        try {
            Invoke-WebRequest -Uri $downloadUrl -Headers $headers -OutFile $zipPath -UseBasicParsing -ErrorAction Stop
            $dest = Join-Path $artifactsDir $a.name
            if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
            Expand-Archive -Path $zipPath -DestinationPath $dest -Force
        } catch {
            Write-Warning "Failed to download or extract artifact $($a.name): $_"
        }
    }
} else {
    Write-Warning "No artifacts attached to run $run_id."
}

# 5) Quick keyword analysis across downloaded artifacts
$keywords = @('ECONNREFUSED','ERROR','502','proxy_error','timeout','failed','stack','Refused')
$matches = @()
if (Test-Path $artifactsDir) {
    Get-ChildItem -Path $artifactsDir -Recurse -File | ForEach-Object {
        $path = $_.FullName
        try {
            $content = Get-Content -Path $path -ErrorAction Stop -Raw
        } catch { return }
        foreach ($kw in $keywords) {
            if ($content -match [regex]::Escape($kw)) {
                $snip = (& { Select-String -Path $path -Pattern $kw -SimpleMatch -Context 0,1 } | Select-Object -First 1).Line
                $matches += [PSCustomObject]@{ file = $path; keyword = $kw; snippet = $snip }
            }
        }
    }
}

if ($matches.Count -eq 0) {
    $summary = "Automated analysis: no obvious keywords (ECONNREFUSED/ERROR/502/proxy_error/timeout/failed/stack) found in artifacts. Workflow conclusion: $conclusion."
} else {
    $top = $matches | Select-Object -First 8
    $lines = $top | ForEach-Object { "- `$($_.keyword)` in `$($_.file)`: $($_.snippet)" }
    $summary = "Automated analysis for workflow run $run_id (conclusion: $conclusion):`n" + ($lines -join "`n")
}

# 6) Post summary comment
try {
    Invoke-RestMethod -Headers $headers -Uri "$api/issues/$($pr.number)/comments" -Method POST -Body (@{ body = $summary } | ConvertTo-Json) -ContentType 'application/json' -ErrorAction Stop
    Write-Output "Posted summary comment to PR."
} catch {
    Write-Warning "Failed to post summary comment: $_"
}

Write-Output ("All done. Artifacts (if any) are in: {0}" -f $artifactsDir)
