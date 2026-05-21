# Cinematic Evidence Spine V22

Status: internal production contract.

## Purpose

Cinematics must become evidence, not marketing noise. Aethel can use storyboards, shot blocking, animatics, AI video references, engine captures, and Cloud Stream review, but none of those lanes can claim final footage without proof and human approval.

## Lanes

- Storyboard: intent, shot list, frames.
- Shot blocking: camera, subject, lens, gameplay handoff.
- Animatic draft: cheap timing proof.
- AI video reference: governed `/api/ai/video/generate` draft lane; provider and cost required.
- Engine render pass: capture from the actual playable scene.
- Release footage review: human approval before public footage.

## Hard Rules

- Draft videos are not final.
- Video provider required before AI video reference jobs.
- Cloud/video generation cost applies.
- Human review required before release footage.
- Engine footage beats standalone prompt footage for validating the actual game.
- No Unreal-grade, final cinematic, trailer-ready, or release-ready claim without runtime capture and evidence.

## UX Rule

Show a compact state, lane count, blockers, and next action. Do not expose every shot detail by default; keep deep shot contracts available for agents and evidence review.
