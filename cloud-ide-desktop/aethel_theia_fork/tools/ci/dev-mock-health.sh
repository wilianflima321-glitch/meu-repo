#!/usr/bin/env bash
# Lightweight diagnostic helper for CI to gather mock server state when health checks fail.
# This script is intended to be called from CI (ubuntu-latest) and prints concise debug info.

set -euo pipefail

OUT=tools/ci/dev-mock-health.log
echo "=== dev-mock-health starting at $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" > "$OUT"

echo "-- /proc/net/tcp (listeners) --" >> "$OUT" 2>&1 || true
if command -v ss >/dev/null 2>&1; then
  ss -ltnp >> "$OUT" 2>&1 || true
else
  netstat -ltnp >> "$OUT" 2>&1 || true
fi

echo "-- curl /health (verbose) --" >> "$OUT" 2>&1 || true
curl -v --max-time 10 http://127.0.0.1:8010/health >> "$OUT" 2>&1 || echo "curl failed or timed out" >> "$OUT"

echo "-- tail server.log (last 200 lines) --" >> "$OUT" 2>&1 || true
if [ -f tools/llm-mock/server.log ]; then
  tail -n 200 tools/llm-mock/server.log >> "$OUT" 2>&1 || true
fi

echo "-- tail server.err.log (last 200 lines) --" >> "$OUT" 2>&1 || true
if [ -f tools/llm-mock/server.err.log ]; then
  tail -n 200 tools/llm-mock/server.err.log >> "$OUT" 2>&1 || true
fi

echo "-- verifier-debug.json (full) --" >> "$OUT" 2>&1 || true
if [ -f tools/llm-mock/verifier-debug.json ]; then
  cat tools/llm-mock/verifier-debug.json >> "$OUT" 2>&1 || true
fi

echo "=== dev-mock-health finished at $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" >> "$OUT"

echo "Wrote $OUT"
exit 0
#!/usr/bin/env bash
set -eu

# Simple health check for the dev mock backend used in CI.
# Tries up to 30 times (1s interval). If unavailable, prints the dev-mock.log to stdout and exits 1.

URL="http://127.0.0.1:8010/health"
LOGFILE="dev-mock.log"
MAX_RETRIES=30

for i in $(seq 1 ${MAX_RETRIES}); do
  if curl -sSfS "${URL}" >/dev/null 2>&1; then
    echo "dev mock backend is up"
    exit 0
  fi
  echo "waiting for dev mock backend... (${i}/${MAX_RETRIES})"
  sleep 1
done

echo "dev mock backend did not start after ${MAX_RETRIES}s"
echo "---- dev-mock.log ----"
if [ -f "${LOGFILE}" ]; then
  tail -n 500 "${LOGFILE}" || true
else
  echo "(no ${LOGFILE} found)"
fi
echo "---- end dev-mock.log ----"

exit 1
