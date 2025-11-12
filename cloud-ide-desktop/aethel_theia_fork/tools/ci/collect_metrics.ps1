<#
Collect CI metrics artifacts (ci-metrics.zip containing ci-metrics.json) from recent workflow runs
and aggregate them into a single JSON file `tools/ci/metrics-archive.json`.

Prerequisites:
- GitHub CLI (`gh`) installed and authenticated (used for API and run downloads).

Usage:
PS> .\tools\ci\collect_metrics.ps1 -Repo 'wilianflima321-glitch/meu-repo' -LookbackRuns 50

This script will:
- query recent workflow runs for the repository
- for each run, check if an artifact named `ci-metrics` exists
- download the artifact and read `ci-metrics.json`
- append an entry to `tools/ci/metrics-archive.json` with run metadata and metrics
#>
param(
  [string]$Repo = 'wilianflima321-glitch/meu-repo',
  [int]$LookbackRuns = 50,
  [string]$OutFile = 'tools/ci/metrics-archive.json'
)

Write-Host "Collecting up to $LookbackRuns runs for repo $Repo"

# helper: call gh api and parse JSON
function GhApiJson($endpoint) {
  $out = gh api $endpoint 2>&1
  if ($LASTEXITCODE -ne 0) { throw "gh api failed: $out" }
  return $out | ConvertFrom-Json
}

# split owner/repo
if ($Repo -notmatch '/') { throw "Repo must be in owner/repo format" }
$parts = $Repo -split '/' ; $owner = $parts[0]; $repo = $parts[1]

# fetch recent workflow runs (up to LookbackRuns, per_page max 100)
$perPage = ([math]::Min($LookbackRuns,100))
$endpoint = "repos/$owner/$repo/actions/runs?per_page=$perPage"
Write-Host "Querying runs via gh api $endpoint"
$runsResp = GhApiJson($endpoint)
if (-not $runsResp.workflow_runs) { Write-Host "No workflow runs found"; exit 0 }

# prepare output array
$archive = @()
if (Test-Path $OutFile) {
  try { $archive = Get-Content $OutFile -Raw | ConvertFrom-Json } catch { $archive = @() }
}

$tmpDir = Join-Path $env:TEMP "ci-metrics-collect-$(Get-Random)"
New-Item -ItemType Directory -Path $tmpDir | Out-Null

foreach ($run in $runsResp.workflow_runs) {
  $runId = $run.id
  $runNumber = $run.run_number
  $createdAt = $run.created_at
  Write-Host "Inspecting run id=$runId number=$runNumber created=$createdAt"
  # list artifacts for run
  $artEndpoint = "repos/$owner/$repo/actions/runs/$runId/artifacts"
  try {
    $artResp = GhApiJson($artEndpoint)
  } catch {
    Write-Warning "Failed to fetch artifacts for run $runId: $_"; continue
  }
  if (-not $artResp.artifacts) { Write-Host "  no artifacts"; continue }
  $ciMetricsArtifact = $artResp.artifacts | Where-Object { $_.name -eq 'ci-metrics' } | Select-Object -First 1
  if (-not $ciMetricsArtifact) { Write-Host "  no ci-metrics artifact"; continue }

  Write-Host "  found ci-metrics artifact id=$($ciMetricsArtifact.id) size=$($ciMetricsArtifact.size_in_bytes)"
  # download artifact (gh run download accepts run id and --name)
  $targetDir = Join-Path $tmpDir "run-$runId"
  New-Item -ItemType Directory -Path $targetDir | Out-Null
  $downloadCmd = "gh run download $runId --repo '$Repo' --name ci-metrics --dir '$targetDir'"
  Write-Host "  downloading to $targetDir"
  $dlOut = Invoke-Expression $downloadCmd 2>&1
  if ($LASTEXITCODE -ne 0) { Write-Warning "  download failed: $dlOut"; continue }
  # artifact is a zip; look for ci-metrics.json inside
  $zipFiles = Get-ChildItem -Path $targetDir -Filter '*.zip' -File -ErrorAction SilentlyContinue
  if (-not $zipFiles) { Write-Warning "  no zip artifact found in $targetDir"; continue }
  foreach ($z in $zipFiles) {
    try {
      $extractDir = Join-Path $targetDir ([IO.Path]::GetFileNameWithoutExtension($z.Name))
      Expand-Archive -Path $z.FullName -DestinationPath $extractDir -Force
      $metricsFile = Join-Path $extractDir 'ci-metrics.json'
      if (Test-Path $metricsFile) {
        $metricsJson = Get-Content $metricsFile -Raw | ConvertFrom-Json
        $entry = [PSCustomObject]@{
          run_id = $runId
          run_number = $runNumber
          created_at = $createdAt
          metrics = $metricsJson
        }
        # avoid duplicates: skip if already present
        $exists = $false
        foreach ($e in $archive) { if ($e.run_id -eq $runId) { $exists = $true } }
        if (-not $exists) { $archive += $entry; Write-Host "  collected metrics for run $runNumber" } else { Write-Host "  metrics already in archive (run $runNumber)" }
      } else {
        Write-Warning "  ci-metrics.json not found inside $z.FullName"
      }
    } catch {
      Write-Warning "  error extracting/reading zip $($z.FullName): $_"
    }
  }
}

# write archive back to file (pretty JSON)
if ($archive) {
  $json = $archive | ConvertTo-Json -Depth 10
  $dir = Split-Path $OutFile -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  Set-Content -Path $OutFile -Value $json -Encoding UTF8
  Write-Host "Wrote aggregated metrics to $OutFile"
} else {
  Write-Host "No new metrics collected"
}

# cleanup temp
Remove-Item -Recurse -Force $tmpDir
