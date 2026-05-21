# AI Video Generation Spine V22

Generated: deterministic local contract.

## Purpose

Aethel can plan and govern text-to-video work for game cinematics, trailers, animatics, cutscene references and marketing clips without pretending that every provider is available by default. This spine closes the V22 gap where competitors expose text-to-video while Aethel had no governed route.

## Contract

- Canonical generation route: `POST /api/ai/video/generate`
- Status/provider route: `GET /api/ai/video/status`
- Internal provider spine: `lib/server/ai-video-generation.ts`
- Expensive generation kind: `video`
- Rate-limit config: `AI_EXPENSIVE_VIDEO_RATE_LIMIT`
- Status rate-limit capability: `ai.status.video`

## Provider Strategy

The route supports explicit provider wiring only:

- `custom-webhook`: `AETHEL_VIDEO_GENERATION_WEBHOOK_URL` and optional `AETHEL_VIDEO_STATUS_WEBHOOK_URL`
- `runway`: `RUNWAY_API_KEY` plus explicit `RUNWAY_API_URL`
- `sora`: `OPENAI_API_KEY` plus explicit `SORA_API_URL`
- `pika`: `PIKA_API_KEY` plus explicit `PIKA_API_URL`

No vendor URL is guessed in source. If a provider is not configured, the route returns `AI_VIDEO_PROVIDER_UNAVAILABLE` with status `503` and missing evidence/env metadata.

## Quality Rules

- No fake success: missing providers return `503`, never `success: true`.
- Draft videos are not final.
- Cloud/video generation cost applies.
- Human review required before release footage.
- Status URLs must match configured provider origins; arbitrary polling URLs are rejected.
- Generated footage is evidence for cutscenes, mood, timing and trailers, not automatic proof of final game quality.

## How Agents Should Use It

1. Use the production bible or director plan to decide whether video is needed.
2. Prefer storyboard, animatic and cutscene reference lanes before expensive final renders.
3. Ask the quality orchestrator for blockers, budget and runtime target.
4. Call `/api/ai/video/generate` only after cost guard passes.
5. Keep the asset in `needs-review` until human approval, provenance and usage rights are captured.

## What This Does Not Claim

- It does not claim Aethel can autonomously ship Unreal-grade cinematics.
- It does not claim Sora, Runway or Pika are enabled without configured credentials and endpoints.
- It does not bypass marketplace, license, human review or cost gates.
