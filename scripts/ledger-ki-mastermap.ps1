$ErrorActionPreference = 'Stop'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Read the accented row content from the UTF-8 data file (avoids PS 5.1 ANSI misread)
$rowsPath = Join-Path $PSScriptRoot 'ledger-ki-row.txt'
$rows = [System.IO.File]::ReadAllLines($rowsPath, [System.Text.Encoding]::UTF8)
if ($rows.Length -lt 3) { throw 'row file malformed (expected 3 lines)' }
$kiDoneRow = $rows[1].TrimEnd("`r", "`n")
$bhRow = $rows[2].TrimEnd("`r", "`n")

# ---- Master Map DONE row: insert ki row before the blank + Focus 2 exit gate line ----
$p = 'e:/Aethel engine/docs/architecture/AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md'
$text = [System.IO.File]::ReadAllText($p)
$eol = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
if ($text.Contains('Kernel-latent-audio-adaptation-ki-a')) { throw 'ki DONE row already present in Master Map' }
$gateAnchor = $eol + $eol + '**Focus 2 exit gate:**'
if (-not $text.Contains($gateAnchor)) { throw 'Focus 2 exit gate anchor not found' }
$text = $text.Replace($gateAnchor, $eol + $kiDoneRow + $gateAnchor)

# ---- Master Map section 12 changelog: insert 1.4bh row above the 1.4bg (kh) row (newest-first) ----
if ($text.Contains('| 2026-08-14 | 1.4bh |')) { throw '1.4bh already present in Master Map' }
$bgAnchor = '| 2026-08-14 | 1.4bg |'
if (-not $text.Contains($bgAnchor)) { throw '1.4bg anchor not found' }
$text = $text.Replace($bgAnchor, $bhRow + $eol + $bgAnchor)

[System.IO.File]::WriteAllText($p, $text, $utf8NoBom)
Write-Output 'KI MASTERMAP SYNC OK'
