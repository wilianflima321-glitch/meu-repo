param(
    [string]$BaseUrl,
    [switch]$Strict
)

# Smoke check for key web endpoints; defaults to NEXT_PUBLIC_API_URL or http://localhost:8000
if (-not $BaseUrl -or $BaseUrl -eq '') {
    $BaseUrl = $env:NEXT_PUBLIC_API_URL
}
if (-not $BaseUrl -or $BaseUrl -eq '') {
    $BaseUrl = 'http://localhost:8000'
}

# Trim trailing slash
if ($BaseUrl.EndsWith('/')) { $BaseUrl = $BaseUrl.TrimEnd('/') }

Write-Host "Using BaseUrl: $BaseUrl" -ForegroundColor Cyan

$passed = 0
$failed = 0

function Invoke-EndpointJson($path) {
    $url = "$BaseUrl$path"
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
        if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
            Write-Host "OK ${path}" -ForegroundColor Green
            $script:passed++
            return $true
        } else {
            Write-Host "FAIL ${path} ($($resp.StatusCode))" -ForegroundColor Red
            $script:failed++
            return $false
        }
    } catch {
        # If 404 or other HTTP error with response, attempt the /api/llm prefix as a fallback
        $err = $_.Exception
        $status = $null
        try { $status = $err.Response.StatusCode.Value__ } catch { }
        if ($status -eq 404) {
            # try with /api/llm prefix
            $prefixed = "/api/llm$path"
            $prefUrl = "$BaseUrl$prefixed"
            try {
                $r2 = Invoke-WebRequest -Uri $prefUrl -UseBasicParsing -TimeoutSec 10
                if ($r2.StatusCode -ge 200 -and $r2.StatusCode -lt 300) {
                    Write-Host "OK ${prefixed}" -ForegroundColor Green
                    $script:passed++
                    return $true
                } else {
                    Write-Host "FAIL ${prefixed} ($($r2.StatusCode))" -ForegroundColor Red
                    $script:failed++
                    return $false
                }
            } catch {
                Write-Host "ERROR ${prefixed}: $($_.Exception.Message)" -ForegroundColor Red
                $script:failed++
                return $false
            }
        }
        Write-Host "ERROR ${path}: $($err.Message)" -ForegroundColor Red
        if ($path -eq '/health') {
            Write-Host "Hint: Start the mock backend: powershell -ExecutionPolicy Bypass -File build/mock_backend.ps1 -Port 8010" -ForegroundColor Yellow
        }
        $script:failed++
        return $false
    }
}

$ok = $true
$ok = (Invoke-EndpointJson '/health') -and $ok
$ok = (Invoke-EndpointJson '/auth/providers') -and $ok
$ok = (Invoke-EndpointJson '/billing/plans') -and $ok

# Optional: minimal chat payload check (non-blocking on failure)
try {
    $chatUrl = "$BaseUrl/ai-runtime/chat"
    $payload = @{ model = 'openai:gpt-4o-mini'; messages = @(@{ role='user'; content='ping' }) } | ConvertTo-Json -Depth 5
    $resp = Invoke-WebRequest -Uri $chatUrl -UseBasicParsing -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 20
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
        Write-Host "OK /ai-runtime/chat" -ForegroundColor Green
        # Optional content validation: ensure JSON structure has 'choices'
        try {
            $json = $resp.Content | ConvertFrom-Json -ErrorAction Stop
            if ($null -eq $json.choices) {
                $msg = "/ai-runtime/chat: missing 'choices' in response"
                if ($Strict) { Write-Host "FAIL $msg" -ForegroundColor Red; $script:failed++ } else { Write-Host "WARN $msg" -ForegroundColor Yellow; $script:failed++ }
            }
        } catch { Write-Host "WARN /ai-runtime/chat: invalid JSON body" -ForegroundColor Yellow; $script:failed++ }
        $script:passed++
    } else {
        Write-Host "WARN /ai-runtime/chat ($($resp.StatusCode))" -ForegroundColor Yellow
        $script:failed++
    }
} catch {
    Write-Host "WARN /ai-runtime/chat: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Hint: If using the mock backend, ensure it is running on $BaseUrl (see build/mock_backend.ps1)." -ForegroundColor Yellow
    $script:failed++
}

# Optional: SSE stream check (POST)
try {
    $streamUrl = "$BaseUrl/ai-runtime/chat/stream"
    $payload = @{ model = 'openai:gpt-4o-mini'; messages = @(@{ role='user'; content='ping' }) } | ConvertTo-Json -Depth 5
    $resp = Invoke-WebRequest -Uri $streamUrl -UseBasicParsing -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 10
    # For SSE, some servers keep connection open; here mock returns chunks and closes.
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
        Write-Host "OK /ai-runtime/chat/stream" -ForegroundColor Green
        # Optional: ensure SSE content has at least one data chunk or [DONE]
        if (-not ($resp.Content -match 'data:' -or $resp.Content -match '\[DONE\]')) {
            $msg = "/ai-runtime/chat/stream: response does not appear to contain SSE chunks"
            if ($Strict) { Write-Host "FAIL $msg" -ForegroundColor Red; $script:failed++ } else { Write-Host "WARN $msg" -ForegroundColor Yellow; $script:failed++ }
        }
        $script:passed++
    } else {
        Write-Host "WARN /ai-runtime/chat/stream ($($resp.StatusCode))" -ForegroundColor Yellow
        $script:failed++
    }
} catch {
    Write-Host "WARN /ai-runtime/chat/stream: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Hint: The mock backend streams and then closes; if connection is refused, start mock: build/mock_backend.ps1 -Port 8010" -ForegroundColor Yellow
    $script:failed++
}

Write-Host ("Summary: {0} passed, {1} failed" -f $passed, $failed) -ForegroundColor Cyan
if (-not $ok) { exit 1 } else { exit 0 }
