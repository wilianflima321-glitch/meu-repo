# LLM Mock - Developer Quickstart

This folder contains a lightweight developer mock backend for LLM providers, billing and telemetry used by the ai-ide.

Quick commands (PowerShell - Windows)

Start the mock in background as a PowerShell job (recommended in Windows dev):

```powershell
Start-Job -Name llm-mock -ScriptBlock { Set-Location 'G:\repo\tools\llm-mock'; node server.js *> server.log }
```

Check health:

```powershell
Invoke-RestMethod -Uri 'http://localhost:8010/health' -Method Get
```

Send a test telemetry event:

```powershell
$body = @{ event='dev_smoke'; payload=@{ info='ok' } } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8010/api/llm/telemetry' -Method Post -Body $body -ContentType 'application/json'
```

View logs (tail):

```powershell
Get-Content 'G:\repo\tools\llm-mock\server.log' -Tail 200 -Wait
```

Quick commands (Unix / bash)

Start in background:

```bash
cd /path/to/repo/tools/llm-mock
nohup node server.js > server.log 2>&1 &
```

Health check and telemetry (curl):

```bash
curl -sS http://localhost:8010/health | jq .
curl -sS -X POST http://localhost:8010/api/llm/telemetry -H 'Content-Type: application/json' -d '{"event":"dev_smoke","payload":{"info":"ok"}}'
```

Where files are and notes
- `server.log`: server stdout/stderr captured when started as background job
- `data.json`: persisted mock data (providers, usage_events, billing_records, promos, telemetry)

Troubleshooting
- If `Invoke-RestMethod` returns connection error, ensure the mock job is running (use `Get-Job` in PowerShell) or check `server.log`.
- On Windows, quoting and Set-Location must use single quotes as above; avoid `cd /d` one-liners that are for cmd.exe.

Development tasks
- To run unit tests: `npm test` (inside this folder)
- To run the HTTP E2E script: `node e2e-http.js`

Security
- The encrypt/decrypt dev endpoints are gated by `DEV_MODE=true`. Do NOT enable `DEV_MODE` in production.

If you need additional automation (start/restart), see `health-check.ps1`.
Aethel LLM Mock Server

Quickstart
----------
This is a minimal mock server to test provider management and usage ingestion locally.

Install and run:

```powershell
cd tools/llm-mock
npm install
npm start
```

E2E (HTTP) quick run
--------------------

To run a lightweight end-to-end that creates a promo, redeems it, posts usage and reconciles, run:

	cd tools/llm-mock
	node e2e-http.js

Secret migration (dev)
----------------------

You can encrypt provider api keys with a base64 master key (dev only):

	# POST { "masterKey": "<base64-32bytes>" } to /api/llm/secrets/encrypt

This moves `provider.config.apiKey` -> `provider.config._encryptedApiKey` and removes the plaintext. To validate, use:

	GET /api/llm/secrets/decrypt?providerId=<id>&masterKey=<base64>

Keep your masterKey secret; in production use a KMS and do not expose these endpoints.

Gemini provider example
------------------------

A sample Gemini provider entry is included in `providers-to-migrate.json` for reference. It shows the minimal fields our mock expects when migrating or adding a new provider:

```
{
	"id": "provider-gemini-sample",
	"name": "Gemini (sample)",
	"type": "custom",
	"endpoint": "https://gemini.googleapis.com/v1/models/gemini-proto:generate",
	"apiKey": "REPLACE_WITH_YOUR_KEY",
	"description": "Example Gemini provider entry for documentation. Replace apiKey and endpoint as needed.",
	"isEnabled": false
}
```

How to use the sample entry

- Copy the entry into `data.json` providers array or import it via your migration tooling.
- Replace `apiKey` with your actual key. For testing locally, set `isEnabled` to `false` to avoid accidental calls.
- If you want to test calls against Gemini, set `isEnabled=true` and ensure your machine/network can reach the Gemini endpoint and you have a valid key.

Local example file
------------------

For convenience we also include a dedicated example file under `tools/llm-mock/providers/gemini-example.json` that you can copy into `data.json` or POST to `/api/llm/providers` when testing locally. It contains a small `config` block (model + options) to show typical Gemini fields. Again: never commit real API keys.

Example usage (PowerShell):

```powershell
# POST the example provider into the running mock
$json = Get-Content -Raw 'tools/llm-mock/providers/gemini-example.json'
Invoke-RestMethod -Uri 'http://localhost:8010/api/llm/providers' -Method Post -Body $json -ContentType 'application/json'
```

Security note: Do not commit real API keys to the repository. Use the `/api/llm/secrets/encrypt` endpoint (with `DEV_MODE=true`) to encrypt keys for local testing, or store them in your environment and populate provider records at runtime.
```

It listens on http://localhost:8010 and provides:
- GET /api/llm/providers
- POST /api/llm/providers
- PUT /api/llm/providers
- POST /api/llm/usage

Behavior
--------
- `POST /api/llm/usage` deduplicates by (providerId, requestId) using a unique index and returns the existing record id if detected.
- Providers are stored in a local sqlite DB `data.sqlite` under `tools/llm-mock`.

Note
----
This is a simple mock for development and testing only. Do not use in production. Secrets are kept in plaintext in the SQLite DB in this mock; in prod you must encrypt with KMS/vault.

Postgres dev stack (optional)
-----------------------------
To run the mock against a local Postgres (recommended for durable testing):

1. Start Postgres via Docker Compose:

	cd tools/llm-mock
	docker compose -f docker-compose.dev.yml up -d

2. Apply schema and migrate `data.json` into Postgres:

	node migrate_to_postgres.js

Alternative: SQL dump for SQLite
--------------------------------
If you cannot build native `better-sqlite3` on your machine, use the generated SQL dump:

	node migrate_to_sqlite_sql_dump.js
	sqlite3 data.sqlite < data.sqlite.sql

This imports `usage_events`, `billing_records` and `payments` into a new `data.sqlite`.
