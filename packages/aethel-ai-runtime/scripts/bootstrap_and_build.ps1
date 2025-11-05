<#
Bootstrap and build helper for the @aethel/aethel-ai-runtime Theia package.

Behavior:
- Detects package manager (yarn preferred, fallback to npm)
- Runs install
- Runs TypeScript check (tsc --noEmit)
- Parses tsc output for missing-module/type diagnostics and attempts to
  install corresponding @types/* packages when reasonable
- Re-runs tsc and finally runs the build script (npm run build / yarn build)

Usage (PowerShell):
  cd <repo>/cloud-ide-desktop/aethel_theia_fork/packages/aethel-ai-runtime
  .\scripts\bootstrap_and_build.ps1

This script requires network access to install packages and may need
elevation depending on your environment. It is intended for developer
machines only.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($m){ Write-Host $m -ForegroundColor Cyan }
function Write-Ok($m){ Write-Host $m -ForegroundColor Green }
function Write-Warn($m){ Write-Host $m -ForegroundColor Yellow }
function Write-Err($m){ Write-Host $m -ForegroundColor Red }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptDir "..")
$pkgDir = Get-Location

Write-Info "Working in: $pkgDir"

# detect package manager
$useYarn = $false
if (Get-Command yarn -ErrorAction SilentlyContinue) { $useYarn = $true }
if ($useYarn) { Write-Info "Using yarn" } else { Write-Info "Using npm" }

function Run-Command($cmd, $args) {
    Write-Info "Running: $cmd $args"
    $proc = Start-Process -FilePath $cmd -ArgumentList $args -NoNewWindow -Wait -PassThru -RedirectStandardOutput stdout.txt -RedirectStandardError stderr.txt
    $out = Get-Content stdout.txt -Raw -ErrorAction SilentlyContinue
    $err = Get-Content stderr.txt -Raw -ErrorAction SilentlyContinue
    return @{ ExitCode = $proc.ExitCode; Stdout = $out; Stderr = $err }
}

function Install-Dependencies {
    if ($useYarn) {
        return Run-Command "yarn" "install --network-timeout 600000"
    } else {
        return Run-Command "npm" "install"
    }
}

function Run-TSCCheck {
    # prefer local node_modules typescript if present
    $tsc = if (Test-Path node_modules/.bin/tsc) { (Join-Path "node_modules/.bin/tsc") } else { "tsc" }
    return Run-Command $tsc "--noEmit"
}

function Run-Build {
    if ($useYarn) { return Run-Command "yarn" "run build" }
    else { return Run-Command "npm" "run build" }
}

function Attempt-AutoFixTypes($tscOutput) {
    # Look for lines like: Cannot find module 'xxx' or its corresponding type declarations.
    $matches = Select-String -InputObject $tscOutput -Pattern "Cannot find module '([^']+)'" -AllMatches
    if (-not $matches) { return @() }
    $installed = @()
    foreach ($m in $matches.Matches) {
        $mod = $m.Groups[1].Value
        # skip scoped packages and packages we don't auto-fix
        if ($mod -like "@theia/*" -or $mod -like "transformers" -or $mod -like "torch" -or $mod -like "onnx" -or $mod -like "gpu.js") {
            Write-Warn "Skipping auto-install for complex module: $mod"
            continue
        }
        # map common names
        $candidate = "@types/" + ($mod -replace "[^a-zA-Z0-9_\-]","-")
        Write-Info "Attempting to add type package: $candidate"
        try {
            if ($useYarn) {
                $r = Run-Command "yarn" "add -D $candidate"
            } else {
                $r = Run-Command "npm" "i -D $candidate"
            }
            if ($r.ExitCode -eq 0) { $installed += $candidate; Write-Ok "Installed $candidate" } else { Write-Warn "Failed to install $candidate" }
        } catch {
            Write-Warn "Exception while installing $candidate: $_"
        }
    }
    return $installed
}

Write-Info "Step 1: installing dependencies (this may take a while)"
$res = Install-Dependencies
if ($res.ExitCode -ne 0) { Write-Warn "Dependency install finished with exit code $($res.ExitCode). StdErr:\n$($res.Stderr)" }

Write-Info "Step 2: running TypeScript check (tsc --noEmit)"
$check = Run-TSCCheck
if ($check.ExitCode -eq 0) {
    Write-Ok "tsc passed without errors"
} else {
    Write-Warn "tsc reported errors. Attempting to auto-install @types for common missing modules"
    $installed = Attempt-AutoFixTypes ("$($check.Stdout)`n$($check.Stderr)")
    if ($installed.Count -gt 0) {
        Write-Info "Re-running install and tsc after installing types: $($installed -join ', ')"
        Install-Dependencies | Out-Null
        $check2 = Run-TSCCheck
        if ($check2.ExitCode -eq 0) { Write-Ok "tsc passed after adding types" } else { Write-Err "tsc still reports errors. See stdout/stderr files in package folder." }
    } else {
        Write-Err "No auto-fixable missing types detected. Review tsc output (stdout.txt/stderr.txt) and add types or adjust stubs." 
    }
}

Write-Info "Step 3: running package build"
$build = Run-Build
if ($build.ExitCode -eq 0) { Write-Ok "Build succeeded" } else { Write-Err "Build failed (exit code $($build.ExitCode)). Check stdout.txt/stderr.txt" }

Write-Info "Done. Check stdout.txt and stderr.txt in the package folder for detailed logs."
