# Environment Checklist (P0 Reliability)

## Required for stable local/CI runtime
1. `NEXT_PUBLIC_APP_URL` set to valid absolute URL.
2. `AETHEL_WS_URL` (or `NEXT_PUBLIC_WS_URL`) set for terminal/collab/debug websocket surfaces.
3. Stripe variables present when checkout is expected:
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_BASIC`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_STUDIO`
- `STRIPE_PRICE_ENTERPRISE`
4. Redis/rate-limit variables for full metering behavior:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Optional but recommended
1. Docker runtime available for execution surfaces.
2. `AETHEL_WORKSPACE_ROOT` configured for deterministic project scoping.
3. Provider keys configured for AI features (OpenAI/Anthropic/Gemini as used by deployment policy).

## Known warning classes and action
1. `NOT_IMPLEMENTED` in AI routes:
- Action: configure provider keys or keep explicit gated behavior.
2. `PAYMENT_GATEWAY_NOT_IMPLEMENTED`:
- Action: set admin gateway to Stripe in this build.
3. `DEPRECATED_ROUTE` hits:
- Action: migrate clients to canonical routes and monitor 2-cycle cutoff telemetry.
4. Cache/revalidate URL warnings:
- Action: verify app URL/env completeness before release gate.
