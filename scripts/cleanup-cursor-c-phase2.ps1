# C: disk cleanup — Cursor live databases (Phase 2, MUST run with Cursor FULLY CLOSED)
#
# ------------------------------------------------------------------------------
#  WARNING — READ FIRST
# ------------------------------------------------------------------------------
#  This script deletes Cursor's LIVE databases (the accumulated memory the user
#  asked to remove). It is REQUIRED that Cursor be fully closed before running:
#    1. Close every Cursor window.
#    2. Check the system tray (bottom-right) and exit any leftover Cursor icon.
#    3. (Optional, safest) run:  taskkill /F /IM Cursor.exe
#  This script aborts automatically if it detects Cursor still running.
#
#  What it deletes (regenerable on next launch, memory/accumulations removed):
#    - state.vscdb (+ -wal / -shm)   ~9.1 GB  -> the live SQLite session/chat DB
#    - anysphere.cursor-agent-worker  ~1.35 GB -> agent worker cache
#    - conversation-search.db (+ wal/shm)      -> search index (rebuilt on demand)
#
#  GUARANTEED UNTOUCHED:
#    - rooveterinaryinc.roo-cline   (this agent environment's tooling — KEEP)
#    - User\settings.json           (your editor settings — separate file)
#    - extensions                   (installed extensions — NOT removed)
#    - EVERYTHING under e:/Aethel engine (the actual work — never touched)
#
#  NOTE: UI/workspace state (window layout, open folders, recent list) also lives
#  in state.vscdb and is recreated fresh. If you only want the CHAT HISTORY gone
#  but want to keep window/UI state, use Cursor's built-in
#  "Clear All Data / Reset Workspace State" instead of this script.
# ------------------------------------------------------------------------------

$ErrorActionPreference = 'SilentlyContinue'

# ---- Safety guard: abort if Cursor is still running --------------------------
$cursorProc = Get-Process -Name 'Cursor','cursor' -ErrorAction SilentlyContinue
if ($cursorProc) {
  Write-Host "ABORT: Cursor is still running (PID(s): $($cursorProc.Id -join ', '))."
  Write-Host "Close all Cursor windows AND exit the tray icon, then run again."
  exit 1
}

$drive = [System.IO.DriveInfo]::new('C')
$before = $drive.AvailableFreeSpace

$globalStorage = "$env:APPDATA\Cursor\User\globalStorage"
$targets = @(
  "$globalStorage\state.vscdb",
  "$globalStorage\state.vscdb-wal",
  "$globalStorage\state.vscdb-shm",
  "$globalStorage\anysphere.cursor-agent-worker",
  "$globalStorage\conversation-search.db",
  "$globalStorage\conversation-search.db-wal",
  "$globalStorage\conversation-search.db-shm"
)

function Get-PathSizeMB([string]$p) {
  if (-not (Test-Path $p)) { return 0 }
  if ((Get-Item $p -ErrorAction SilentlyContinue).PSIsContainer) {
    $sum = (Get-ChildItem $p -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  } else {
    $sum = (Get-Item $p -Force -ErrorAction SilentlyContinue).Length
  }
  if ($null -eq $sum) { return 0 }
  return [math]::Round($sum / 1MB, 1)
}

Write-Host "=== Cursor live-DB cleanup (Phase 2) ==="
$totalMB = 0
foreach ($t in $targets) {
  $mb = Get-PathSizeMB $t
  if ($mb -gt 0) {
    Remove-Item $t -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host ("  removed {0,10:N1} MB  {1}" -f $mb, $t)
    $totalMB += $mb
  }
}

$after = [System.IO.DriveInfo]::new('C').AvailableFreeSpace
Write-Host ""
Write-Host ("Total marked for deletion: {0:N1} MB" -f $totalMB)
Write-Host ("C: free BEFORE {0:N2} GB  ->  AFTER {1:N2} GB  (reclaimed {2:N2} GB)" -f ($before / 1GB), [math]::Round($after / 1GB, 2), [math]::Round(($after - $before) / 1GB, 2))
Write-Host ""
Write-Host "Done. Cursor will recreate fresh DBs on next launch."
