# Verify Phase 1 left the protected items fully intact (post-cleanup safety check).
# ASCII-only (Windows PowerShell 5.1 reads BOM-less ps1 as ANSI - non-ASCII bytes in
# string literals can corrupt parsing).
$ErrorActionPreference = 'SilentlyContinue'
$gs = Join-Path $env:APPDATA 'Cursor\User\globalStorage'

function Get-PathSizeMB([string]$p) {
  if (-not (Test-Path $p)) { return 0 }
  if ((Get-Item $p -Force).PSIsContainer) {
    $sum = (Get-ChildItem $p -Recurse -Force -File | Measure-Object -Property Length -Sum).Sum
  } else {
    $sum = (Get-Item $p -Force).Length
  }
  if ($null -eq $sum) { return 0 }
  return [math]::Round($sum / 1MB, 1)
}

Write-Host "=== Protected items integrity check (post-Phase-1) ==="
$state = Join-Path $gs 'state.vscdb'
Write-Host ("  state.vscdb   (live session DB): {0,9:N1} MB   exists={1}" -f (Get-PathSizeMB $state), (Test-Path $state))
$worker = Join-Path $gs 'anysphere.cursor-agent-worker'
Write-Host ("  agent-worker  (running agent):    {0,9:N1} MB   exists={1}" -f (Get-PathSizeMB $worker), (Test-Path $worker))
$roo = Join-Path $gs 'rooveterinaryinc.roo-cline'
Write-Host ("  roo-cline     (THIS tooling):     {0,9:N1} MB   exists={1}" -f (Get-PathSizeMB $roo), (Test-Path $roo))
$set = Join-Path $env:APPDATA 'Cursor\User\settings.json'
Write-Host ("  settings.json (editor settings):  {0,9:N2} MB   exists={1}" -f (Get-PathSizeMB $set), (Test-Path $set))

Write-Host ""
Write-Host "=== Phase 1 targets - confirm deleted (running app may have recreated some) ==="
$cacheTargets = @(
  (Join-Path $env:APPDATA 'Cursor\logs'),
  (Join-Path $env:APPDATA 'Cursor\Cache'),
  (Join-Path $env:APPDATA 'Cursor\GPUCache'),
  (Join-Path $env:APPDATA 'Cursor\snapshots'),
  (Join-Path $env:APPDATA 'Cursor\CachedData'),
  (Join-Path $env:APPDATA 'Cursor\WebStorage'),
  (Join-Path $env:APPDATA 'Cursor\User\History'),
  (Join-Path $env:USERPROFILE '.cursor\projects'),
  (Join-Path $env:USERPROFILE '.cursor\ai-tracking')
)
foreach ($t in $cacheTargets) {
  $leaf = Split-Path $t -Leaf
  $exists = Test-Path $t
  $size = Get-PathSizeMB $t
  Write-Host ("  {0,-14} exists={1,-5} size={2,9:N1} MB" -f $leaf, $exists, $size)
}

$c = [System.IO.DriveInfo]::new('C')
Write-Host ""
Write-Host ("  C: free now: {0:N2} GB" -f ($c.AvailableFreeSpace / 1GB))
$s1 = Test-Path 'e:/Aethel engine/scripts/cleanup-cursor-c.ps1'
$s2 = Test-Path 'e:/Aethel engine/scripts/cleanup-cursor-c-phase2.ps1'
Write-Host ("  E: workspace intact (both cleanup scripts present): {0}" -f ($s1 -and $s2))
