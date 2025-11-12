# configure-gh.ps1
# Configure GitHub CLI (gh) by reading a Personal Access Token (PAT) from a local file
# Usage (recommended):
# 1) Create a file named `.gh_token` in the repository root containing only your PAT (no newline after it).
#    Example (PowerShell): Set-Content -Path .gh_token -Value 'ghp_xxx' -NoNewline
# 2) Run this script: .\configure-gh.ps1
# 3) After successful login, securely delete .gh_token: Remove-Item .gh_token

$tokenFile = Join-Path (Get-Location).Path '.gh_token'
if (-not (Test-Path $tokenFile)) {
    Write-Output "Token file not found at: $tokenFile"
    Write-Output "Create the token file with your PAT (example):"
    Write-Output "  Set-Content -Path .gh_token -Value 'ghp_...' -NoNewline"
    exit 1
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Output "gh CLI not found in PATH."
    Write-Output "Install from https://github.com/cli/cli/releases or via winget: winget install --id GitHub.cli"
    exit 1
}

try {
    $pat = Get-Content -Path $tokenFile -Raw
    # Pipe the PAT into gh auth login
    $proc = Start-Process -FilePath gh -ArgumentList 'auth','login','--with-token' -NoNewWindow -PassThru -RedirectStandardInput 'Pipe' -RedirectStandardOutput 'Pipe' -RedirectStandardError 'Pipe'
    $proc.StandardInput.Write($pat)
    $proc.StandardInput.Close()
    $out = $proc.StandardOutput.ReadToEnd()
    $err = $proc.StandardError.ReadToEnd()
    $proc.WaitForExit()
    Write-Output $out
    if ($proc.ExitCode -ne 0) {
        Write-Error "gh auth login failed: $err"
        exit $proc.ExitCode
    }
    Write-Output "gh auth login succeeded. Run 'gh auth status' to verify."
} catch {
    Write-Error "Failed to run gh auth login: $_"
    exit 1
}
