# 68_L5_UX_HARDENING_DELTA_2026-04-01
Status: ACTIVE DELTA
Date: 2026-04-01

## Summary
This delta captures the L5 UX hardening sweep across IDE, chat, preview, and core UI primitives.
Primary goals: eliminate template palette drift, localize user-facing copy, and keep state honesty in critical flows.

## Implemented (Code)
- IDE Git panel: PT-BR copy, explicit loading/error/empty states, Aethel tokens across status badges and CTAs.
- Chat stack: PT-BR normalization and Aethel tokens across AIChatPanel, InlineAIChat, Command Center, Squad Chat.
- Preview/runtime surfaces: PT-BR labels, honest fallback language, consistent provider/strategy signaling.
- Editor UX: GitGutter, TabBar, InlineCompletion now use Aethel tokens and localized strings.
- Core UI primitives: Input/Select/Toast/Tabs/Dropdown/Avatar/Progress/Slider/VirtualList/Accessibility updated to Aethel tokens.
- Removal of legacy palette fragments (sky/blue/emerald/red/gray) in touched surfaces.

## UX Benchmarks Applied (Directional)
- Accessibility: visible focus + clear state labels per WCAG 2.2 guidance.
- Billing and onboarding patterns: clarity of next action and explicit operational state.
- Developer tools parity: preview/runtime transparency and chat context clarity (Vercel/Cursor/Linear-grade expectations).

## Evidence (Representative Files)
- `cloud-web-app/web/components/ide/GitPanelPro.tsx`
- `cloud-web-app/web/components/ide/InlineCompletion.tsx`
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`
- `cloud-web-app/web/components/ide/InlineAIChat.tsx`
- `cloud-web-app/web/components/preview/CanonicalPreviewSurface.tsx`
- `cloud-web-app/web/components/ui/Input.tsx`
- `cloud-web-app/web/components/ui/Select.tsx`
- `cloud-web-app/web/components/ui/Toast.tsx`

## Remaining Gaps (Open)
- Large monolithic legacy components still exist in engine/media areas.
- Some advanced settings panels still contain English labels; requires a final localization sweep.
- Full lint/typecheck run pending once runtime dependencies are restored.

## Execution Rules
- Do not claim readiness for preview/runtime without provider credentials and verified health.
- Any future UI work must use Aethel tokens first; avoid Tailwind default palettes.
- Keep explicit empty/error/blocked states on critical paths.
