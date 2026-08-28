$env:CARGO_HOME = "E:\Aethel engine\.cargo"
$env:RUSTUP_HOME = "E:\Aethel engine\.rustup"
$env:Path = "E:\Aethel engine\.mingw\mingw64\bin;E:\Aethel engine\.cargo\bin;" + $env:Path
$env:CARGO_TARGET_DIR = "E:\aethel-target-gnu"

$src = "E:\Aethel engine\packages\aethel-kernel-rust\src"
$files = Get-ChildItem "$src\*.rs"
$total = $files.Count
$zst = @()
$thin = @()
$real = @()
foreach ($f in $files) {
  $c = Get-Content $f.FullName -Raw
  $lines = ($c -split "`r?`n").Count
  $bytes = $f.Length
  $hasSoak = $c -match 'run_.*_soak|SoakReport|_ready:\s*bool'
  $hasEmptyFn = $c -match '\{\s*(//[^\n]*\n\s*)*\}'
  $isLib = $f.Name -eq 'lib.rs'
  if ($isLib) { continue }
  if ($bytes -lt 900 -or ($hasEmptyFn -and -not $hasSoak -and $bytes -lt 2500)) {
    if ($bytes -lt 900 -or ($c -match 'println!' -and -not $hasSoak) -or ($hasEmptyFn -and -not $hasSoak)) {
      $zst += "{0}`t{1}`t{2}" -f $bytes, $lines, $f.Name
    } else {
      $thin += "{0}`t{1}`t{2}" -f $bytes, $lines, $f.Name
    }
  } elseif ($hasSoak) {
    $real += $f.Name
  } else {
    $thin += "{0}`t{1}`t{2}" -f $bytes, $lines, $f.Name
  }
}

$out = @()
$out += "TOTAL_MODULES=$total"
$out += "REAL_SOAK=$($real.Count)"
$out += "ZST_OR_BODYLESS=$($zst.Count)"
$out += "THIN_NO_SOAK=$($thin.Count)"
$out += "---ZST---"
$out += ($zst | Sort-Object)
$out += "---THIN---"
$out += ($thin | Sort-Object)
Set-Content -Path "E:\Aethel engine\.tmp_zst_count.txt" -Value $out -Encoding utf8
Write-Output "wrote $($zst.Count) zst, $($thin.Count) thin, $($real.Count) real"
