# Studio Session Runtime - Aethel Engine

Date: 2026-05-11
Status: implemented gate
Scope: cloud Studio session state, bounded parallel task waves, stop/cancel safety, rollback forwarding, Mission Ledger evidence.

## Why This Exists

The Studio cannot depend on loose chat messages when agents are working on apps, games, films, audio, browser operations, and release work. A serious user needs a durable session with mission, runtime target, active tasks, evidence references, logs, stop/cancel behavior, and rollback routing.

This closes the gap where `/api/studio/session/*`, `/api/studio/tasks/run-wave`, and `/api/studio/tasks/[id]/rollback` were capability-gated instead of operational.

## Runtime Contract

- `POST /api/studio/session/start` creates a durable Studio session.
- `GET /api/studio/session/:id` reads the session state for the current user.
- `POST /api/studio/session/:id/stop` stops the session and records the reason.
- `POST /api/studio/tasks/run-wave` creates a bounded parallel task wave and attaches every task to the session Mission Ledger.
- `POST /api/studio/tasks/:id/rollback` forwards to the implemented AI change rollback endpoint and records the result on the task.

## Safety Rules

- No unauthenticated Studio session mutation.
- No entitlement-free task wave creation.
- Stopped sessions reject new waves with `STUDIO_SESSION_STOPPED`.
- Waves are bounded by `MAX_WAVE_AGENTS` to avoid runaway parallel work.
- Every created task gets a `mission-ledger://` evidence reference.
- Rollback requires `rollbackToken`, `rollbackTokens`, or `runId`.
- Rollback is delegated to `/api/ai/change/rollback` instead of pretending to restore files locally.
- Failed rollback marks the task blocked, not done: no fake success.

## Product Impact

This gives the Producer/Senior Agent a real durable handle for coordinating parallel agents without adding a new visual surface. The UI can stay clean: mission card, evidence, active agents, pause/stop, and review. Internally, the platform now has a session primitive that can coordinate Project Brain, Mission Ledger, Repository Cartography, Browser Operator, game/film/audio editors, and Studio Local runtime routing.

## Remaining Work

- Add UI affordance for session pause/resume in the Agent Fleet panel.
- Attach runtime job IDs from Studio Local to `activeTaskIds` or a dedicated `activeJobIds` field.
- Add session resume across browser refresh on the Studio Home.
- Add route-level telemetry for session start, wave planned, wave blocked, and rollback result.
- Promote rollback evidence into the Validation Graph when available.
