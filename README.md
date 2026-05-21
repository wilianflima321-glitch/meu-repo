# Aethel Engine

Aethel Engine is an AI-native creative operating system for apps, games, films, research, browser operation, and local/cloud production workflows.

The active web product lives in `cloud-web-app/web`. The native runtime lives in `apps/studio-local`. The shared contracts live in `packages/runtime-contracts`.

## Canonical Direction

Read these first:

1. `docs/master/100_AUDITORIA_V22_EXECUTION_STATUS_2026-05-25.md`
2. `cloud-web-app/web/docs/DEEP_GAME_PRODUCTION_BIBLE_V22.md`
3. `cloud-web-app/web/docs/GAME_PRODUCTION_BIBLE_V22.md`
4. `cloud-web-app/web/docs/GAME_SCOPE_ORCHESTRATOR_V22.md`
5. `cloud-web-app/web/docs/CURATED_ASSET_SOURCING_V22.md`
6. `cloud-web-app/web/docs/GAME_PLAYTEST_SPINE_V22.md`
7. `cloud-web-app/web/docs/AI_QUALITY_ORCHESTRATOR_V22.md`
8. `AETHEL_INTERFACE_BLUEPRINTS/00_INDEX.md`

Older audits under `docs/master/` and `docs/archive/` are historical. They are useful for context, but they are not the current execution source of truth unless referenced by the V22 status document.

## Current Product Spine

- Public and authenticated Next.js app: `cloud-web-app/web`
- Studio surfaces: level, scene, material, animation, VFX, film, audio, terrain, landscape, cloth, facial, fluid, foliage, hair, rig, water, sprite
- AI production spine: agents, evidence, scope locks, read receipts, cost visibility, browser replay, game/film production contracts
- Runtime depth model: Browser preview/review, Studio Local for heavy local work, Cloud Stream for configured final review
- Game production model: user chooses `prototype`, `demo`, or `complete-game-plan`; agents receive deep internal contracts while the UI stays compact

## Guardrails

Aethel does not claim autonomous AAA, Unreal-grade, final game, marketplace-ready, or release-ready output without runtime evidence, asset provenance, playtest replay, performance traces, rollback, and human approval.

Draft AI assets are not final. Raw text-to-3D meshes remain draft until curated, optimized, proven, and reviewed.

## Setup Local

```bash
npm install
cd cloud-web-app/web
npm install
cd ../..
```

Create local runtime env files:

```bash
npm run setup:local-runtime
```

Then configure at least:

- `cloud-web-app/web/.env.local` with `JWT_SECRET` and `CSRF_SECRET`
- One AI provider key such as `OPENROUTER_API_KEY`, or use the documented demo mode when available

Run the web app:

```bash
cd cloud-web-app/web
npm run dev
```

## QA Shortlist

From `cloud-web-app/web`:

```bash
npm run qa:deep-production-bible
npm run qa:game-production-bible
npm run qa:game-playtest-spine
npm run qa:curated-asset-sourcing
npm run qa:ai-quality-orchestrator
npm run qa:typecheck-v22-surfaces
npm run qa:no-fake-success
npm run qa:marketing-claims
```

Full enterprise gate:

```bash
cd cloud-web-app/web
npm run qa:enterprise-gate
```

## Studio Local

```bash
cd apps/studio-local
npm run test
npm run build
```

Studio Local is beta until signed installers and release evidence exist.

## Repository Hygiene

- Keep runtime dependencies and dev-only dependencies separated.
- Keep docs current with V22 execution status.
- Prefer evidence-backed gates over broad claims.
- Commit implementation before writing another major audit.
