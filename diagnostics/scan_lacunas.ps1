Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location (Split-Path -Parent $PSScriptRoot)

$out = Join-Path $PSScriptRoot 'LACUNAS_501_TODO_2025-12-31.md'
"# Lacunas / Not Implemented / TODO (2025-12-31)" | Out-File -Encoding utf8 $out
"" | Add-Content -Encoding utf8 $out

function Get-RelPath([string]$fullPath) {
  $root = (Get-Location).Path
  if ($fullPath.StartsWith($root)) {
    return $fullPath.Substring($root.Length).TrimStart('\')
  }
  return $fullPath
}

function Scan([string]$root, [string]$pattern, [string]$title) {
  "## $title" | Add-Content -Encoding utf8 $out

  if (-not (Test-Path $root)) {
    "- (root inexistente)" | Add-Content -Encoding utf8 $out
    "" | Add-Content -Encoding utf8 $out
    return
  }

  $files = Get-ChildItem -Recurse -File -Path $root -Include *.ts,*.tsx,*.js,*.jsx -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.next\\' }

  $hits = $files | Select-String -Pattern $pattern -CaseSensitive:$false -ErrorAction SilentlyContinue

  if (-not $hits -or $hits.Count -eq 0) {
    "- (nenhum)" | Add-Content -Encoding utf8 $out
    "" | Add-Content -Encoding utf8 $out
    return
  }

  $max = 400
  $shown = 0
  foreach ($h in $hits) {
    $rel = Get-RelPath $h.Path
    "- ${rel}`:$($h.LineNumber) $($h.Line.Trim())" | Add-Content -Encoding utf8 $out
    $shown++
    if ($shown -ge $max) { break }
  }

  if ($hits.Count -gt $max) {
    "- ... ($($hits.Count - $max) hits adicionais truncados)" | Add-Content -Encoding utf8 $out
  }

  "" | Add-Content -Encoding utf8 $out
}

Scan 'cloud-web-app\web\app\api' '\\b501\\b|Not Implemented|not_implemented|unimplemented' 'API: 501 / Not Implemented'
Scan 'cloud-web-app\web\lib' '\\b501\\b|Not Implemented|not_implemented|unimplemented' 'LIB: 501 / Not Implemented'
Scan 'cloud-web-app\web' '\\bTODO\\b|\\bFIXME\\b|\\bWIP\\b|\\bPLACEHOLDER\\b' 'TODO/FIXME/WIP/placeholder (web)'

Write-Host "Wrote $out"