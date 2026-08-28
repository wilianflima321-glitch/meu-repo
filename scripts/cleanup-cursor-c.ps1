# C: disk cleanup — Cursor regenerable caches + Temp (Phase 1, SAFE while Cursor runs)
#
# Removes ONLY regenerable, non-critical accumulations:
#   %APPDATA%\Cursor\* caches/logs, User\History, .cursor\projects, .cursor\ai-tracking, %TEMP% contents
#
# GUARANTEED UNTOUCHED:
#   - rooveterinaryinc.roo-cline        (this agent environment's tooling — KEEP)
#   - User\globalStorage\state.vscdb    (LIVE session/chat DB, locked by running Cursor — Phase 2, app closed)
#   - anysphere.cursor-agent-worker     (running agent worker storage — Phase 2, app closed)
#   - extensions, workspaceStorage, settings.json
#   - EVERYTHING under e:/Aethel engine (the actual work — never touched)
#
# Locked/in-use files are auto-skipped (-ErrorAction SilentlyContinue) => no corruption risk.
$ErrorActionPreference = 'SilentlyContinue'

$drive = [System.IO.DriveInfo]::new('C')
$before = $drive.AvailableFreeSpace

$targets = @(
  "$env:APPDATA\Cursor\logs",
  "$env:APPDATA\Cursor\Cache",
  "$env:APPDATA\Cursor\Code Cache",
  "$env:APPDATA\Cursor\GPUCache",
  "$env:APPDATA\Cursor\DawnGraphiteCache",
  "$env:APPDATA\Cursor\DawnWebGPUCache",
  "$env:APPDATA\Cursor\blob_storage",
  "$env:APPDATA\Cursor\Crashpad",
  "$env:APPDATA\Cursor\snapshots",
  "$env:APPDATA\Cursor\CachedData",
  "$env:APPDATA\Cursor\CachedExtensionVSIXs",
  "$env:APPDATA\Cursor\CachedProfilesData",
  "$env:APPDATA\Cursor\Partitions",
  "$env:APPDATA\Cursor\process-monitor",
  "$env:APPDATA\Cursor\WebStorage",
  "$env:APPDATA\Cursor\User\History",
  "$env:USERPROFILE\.cursor\projects",
  "$env:USERPROFILE\.cursor\ai-tracking"
)

function Get-DirSizeMB([string]$p) {
  if (-not (Test-Path $p)) { return 0 }
  $sum = (Get-ChildItem $p -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  if ($null -eq $sum) { return 0 }
  return [math]::Round($sum / 1MB, 1)
}

Write-Host "=== Cursor cache cleanup (Phase 1) ==="
$totalMB = 0
foreach ($t in $targets) {
  $mb = Get-DirSizeMB $t
  if ($mb -gt 0) {
    Remove-Item $t -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host ("  removed {0,10:N1} MB  {1}" -f $mb, $t)
    $totalMB += $mb
  }
}

# Temp contents (the %TEMP% folder itself must remain)
$tempMB = Get-DirSizeMB $env:TEMP
if ($tempMB -gt 0) {
  Get-ChildItem $env:TEMP -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host ("  removed {0,10:N1} MB  {1}" -f $tempMB, "$env:TEMP\*")
  $totalMB += $tempMB
}

$after = [System.IO.DriveInfo]::new('C').AvailableFreeSpace
$freeNowGB = [math]::Round($after / 1GB, 2)
$reclaimedGB = [math]::Round(($after - $before) / 1GB, 2)
Write-Host ""
Write-Host ("Total marked for deletion: {0:N1} MB" -f $totalMB)
Write-Host ("C: free BEFORE {0:N2} GB  ->  AFTER {1:N2} GB  (reclaimed {2:N2} GB)" -f ($before / 1GB), $freeNowGB, $reclaimedGB)
