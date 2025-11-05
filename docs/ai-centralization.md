# AI Centralization Plan

This document describes a conservative migration plan to centralize AI/LLM provider configuration, billing hooks, and UI registration for the Theia fork present in `cloud-ide-desktop/aethel_theia_fork`.

Goals
- Provide a single source-of-truth for LLM provider configuration and registry.
- Centralize metering/billing hooks so usage is recorded consistently across providers.
- Keep migration low-risk and incremental so CI and dev flows remain functional.

Target locations
- Preferences: `AI_LLM_PROVIDERS_PREF` (workspace/global preference namespace).
- Provider registry service: `LlmProviderRegistry` (single registry under `packages/ai-ide/src/common/llm-provider-registry.ts`).
- Provider runtime adapters: `packages/ai-ide/src/common/providers/*` (adapters per provider: http, custom, llm-sdk).
- Billing hooks and metering: `packages/ai-ide/src/common/billing.ts` (single module exposing cost calc + events).
- UI entries (provider settings, admin pages): `packages/ai-ide/src/browser/settings/*` and `packages/ai-ide/src/browser/admin/*`.

High-level steps (incremental, safe)
1. Create `AI_LLM_PROVIDERS_PREF` preference schema and a lightweight `LlmProviderRegistry` API that reads from preferences and supports runtime registration.
   - Add the registry as an injectable service (Inversify) with methods: `register(providerDef)`, `getProvider(id)`, `list()`.
   - Backwards compatibility: if per-package provider config exists, the registry will merge them into the preference namespace at startup and log a migration hint.

2. Implement `billing.ts` with two minimal exports:
   - `calcEstimatedProviderCost(payload): number` — conservative estimate, dollars/token or default unit.
   - `emitUsageEvent(event)` — emits (in memory) events; later persisted to storage when available.

3. Replace direct reads of provider config in `LlmProviderService` with registry lookups. Keep a fallback to existing configuration points.

4. Provide small UI pages for provider configuration and a tools/admin page to inspect usage events. Do this incrementally and behind a feature-flag.

5. Tests and validation:
   - Unit tests for registry and billing logic.
   - Small e2e or smoke test validating provider registration + a fake provider request path.

Migration notes
- Keep provider adapter APIs stable and add adapters that implement a `sendRequest(request)` signature returning either a full `LanguageModelResponse` or a simplified object (the registry will normalize responses).
- Avoid big type changes during migration. Use `unknown` + narrow helpers on adapter boundaries.
- Document each migration step in `docs/` and ship as a small PRs chain.

Next immediate tasks (this sprint)
- Create `LlmProviderRegistry` skeleton and preference schema entry.
- Implement `billing.ts` minimal hooks.
- Add sample JSON contracts to `docs/samples/`.
- Update agent code to query the registry for provider selection (non-destructive fallback to current behavior).

