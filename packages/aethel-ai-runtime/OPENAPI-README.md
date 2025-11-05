OpenAPI & TypeScript client
===========================

This package should consume the canonical OpenAPI spec produced by the cloud-admin-ia backend.

1) Generate OpenAPI spec (run from repo root):

   PowerShell:

   ```powershell
   ./build/run_openapi_gen.ps1
   ```

2) Generate TypeScript types (requires Node):

   ```bash
   npx openapi-typescript cloud-admin-ia/backend/docs/ai-runtime.openapi.json --output cloud-ide-desktop/aethel_theia_fork/packages/aethel-ai-runtime/src/openapi-types.ts
   ```

3) Set runtime env in Theia backend shim or runtime process:

   - AI_RUNTIME_URL: base URL of the canonical backend (e.g. http://localhost:8000/ai-runtime)
   - AI_RUNTIME_ADMIN_TOKEN: optional admin token to call protected endpoints

Notes:
- Keep the Theia package lightweight: do inference only via the backend.
- If you change backend routes, regenerate the OpenAPI spec and types and run tsc to catch type issues.
OpenAPI & API contract

This package can consume the canonical `ai-runtime` OpenAPI spec produced by the backend.

Preferred flow for development:
1. Generate the OpenAPI spec from the backend with `python build/generate_openapi.py` (writes to `cloud-admin-ia/backend/docs/ai-runtime.openapi.json`).
2. Point your local environment to the backend URL via `AI_RUNTIME_URL` or configure your tooling to load the OpenAPI spec directly from `cloud-admin-ia/backend/docs/ai-runtime.openapi.json`.

Environment variables:
- `AI_RUNTIME_URL` - base URL for ai-runtime endpoints (default: http://localhost:8000/ai-runtime)
- `AI_RUNTIME_ADMIN_TOKEN` - admin token forwarded automatically by the shim when present

If you want to generate a TypeScript client from the OpenAPI spec, use tools like `openapi-generator` or `openapi-typescript`:

  npx openapi-typescript ../../../../cloud-admin-ia/backend/docs/ai-runtime.openapi.json --output src/common/api-types.ts
