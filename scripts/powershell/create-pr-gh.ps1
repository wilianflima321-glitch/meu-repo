<# create-pr-gh.ps1
   Create a draft PR using gh CLI. Assumes gh is authenticated (run configure-gh.ps1 first).
   Usage: .\create-pr-gh.ps1
#>
param(
    [string]$Owner = 'wilianflima321-glitch',
    [string]$Repo = 'meu-repo',
    [string]$Head = 'infra/playwright-ci-ensemble-confirm-main',
    [string]$Base = 'main',
    [string]$Title = 'Add ensemble verifier, physics checks, Playwright E2E and CI'
)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "gh CLI not found. Install it and ensure it's on PATH."
    exit 1
}

Set-Location (Join-Path (Get-Location).Path '')
$bodyFile = Join-Path (Get-Location).Path 'PR_DRAFT.md'

if (Test-Path $bodyFile) {
    Write-Output "Creating draft PR using body file: $bodyFile"
    $args = @('pr','create','--repo',"$Owner/$Repo",'--base',$Base,'--head',$Head,'--title',$Title,'--body-file',$bodyFile,'--draft')
} else {
    Write-Output "PR_DRAFT.md not found; creating draft PR with default body."
    $args = @('pr','create','--repo',"$Owner/$Repo",'--base',$Base,'--head',$Head,'--title',$Title,'--body','Automated PR created by CI monitor.','--draft')
}

$proc = Start-Process -FilePath gh -ArgumentList $args -NoNewWindow -PassThru -RedirectStandardOutput 'Pipe' -RedirectStandardError 'Pipe'
$out = $proc.StandardOutput.ReadToEnd()
$err = $proc.StandardError.ReadToEnd()
$proc.WaitForExit()
Write-Output $out
if ($proc.ExitCode -ne 0) {
    Write-Error "gh pr create failed: $err"
    exit $proc.ExitCode
}

# Extract URL from output and print a concise message
if ($out -match '(https://github.com/[^\s]+)') {
    Write-Output "PR created: $($matches[0])"
}
