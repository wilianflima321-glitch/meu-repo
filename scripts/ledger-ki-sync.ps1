$ErrorActionPreference = 'Stop'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Read the accented row content from a UTF-8 data file (avoids PS 5.1 ANSI misread)
$rowsPath = Join-Path $PSScriptRoot 'ledger-ki-row.txt'
$rows = [System.IO.File]::ReadAllLines($rowsPath, [System.Text.Encoding]::UTF8)
if ($rows.Length -lt 2) { throw 'row file malformed' }
$row1 = $rows[0].TrimEnd("`r", "`n")
$kiEntry = $rows[1].TrimEnd("`r", "`n")

# ---- Focus1 changelog: insert ki row before the composite-fracture (kh) row ----
$p1 = 'e:/Aethel engine/docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md'
$text1 = [System.IO.File]::ReadAllText($p1)
$eol1 = if ($text1.Contains("`r`n")) { "`r`n" } else { "`n" }
$anchor1 = '| 2026-08-14 composite-fracture |'
if (-not $text1.Contains($anchor1)) { throw 'Focus1 anchor not found' }
$text1 = $text1.Replace($anchor1, $row1 + $eol1 + $anchor1)
[System.IO.File]::WriteAllText($p1, $text1, $utf8NoBom)

# ---- Index changelog: prepend ki CLOSED entry after the **Changelog:** marker ----
$p2 = 'e:/Aethel engine/docs/architecture/AETHEL_STUDIO_SUPREMACY_INDEX.md'
$text2 = [System.IO.File]::ReadAllText($p2)
$eol2 = if ($text2.Contains("`r`n")) { "`r`n" } else { "`n" }
$anchor2 = '**Changelog:** 2026-08-14 composite-fracture'
if (-not $text2.Contains($anchor2)) { throw 'Index anchor not found' }
$text2 = $text2.Replace($anchor2, '**Changelog:** 2026-08-14 latent-audio-adaptation - ' + $kiEntry + ' . ' + $anchor2)
[System.IO.File]::WriteAllText($p2, $text2, $utf8NoBom)

Write-Output 'KI LEDGER SYNC OK'
