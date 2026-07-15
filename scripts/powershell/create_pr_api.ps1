$token = (Get-Content "$PSScriptRoot\.gh_token" -Raw).Trim()
if (-not $token) { Write-Error 'Token not found in .gh_token'; exit 1 }
$prBody = (Get-Content "$PSScriptRoot\PR_DRAFT.md" -Raw)
$payload = @{ title = 'Add ensemble verifier, physics checks, Playwright E2E and CI'; head = 'infra/playwright-ci-ensemble-workflow-fix'; base = 'main'; body = $prBody; draft = $true } | ConvertTo-Json -Depth 10
$headers = @{ Authorization = "token $token"; Accept = 'application/vnd.github+json' }
try {
  $resp = Invoke-RestMethod -Uri 'https://api.github.com/repos/wilianflima321-glitch/meu-repo/pulls' -Method Post -Headers $headers -Body $payload -ContentType 'application/json'
  $resp | ConvertTo-Json -Depth 5
} catch {
  Write-Error $_.Exception.Message
  if ($_.Exception.Response) {
    try { $_.Exception.Response.GetResponseStream() | Select-Object -First 1 | Get-Content -Raw | Write-Output } catch {}
  }
  exit 2
}
