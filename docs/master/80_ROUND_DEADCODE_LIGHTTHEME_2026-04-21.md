# Round 80 — Dead-code removal, Next/Image restore, Light-theme toggle

**Date:** 2026-04-21
**Branch:** `genspark_ai_developer`
**Audit reference:** V5 (19 Apr 2026) — commit `35d61b4`

## Objective

Close the most expensive V5 regressions (dead libraries, Next/Image
`unoptimized`, Windows paths in `.aethelrules`) and actually ship the light
theme that ThemeContext has been wired for since Round 77.

## Commits in this round

1. `chore(cleanup): remove 24k lines of dead engine libs, fix .aethelrules paths, re-enable next/image`
2. `feat(ux): ship ThemeToggle in header + Storybook coverage + tests`

## Scope

### 1. Dead-code removal (~24,008 lines, 22 files)

Deleted files (all confirmed with zero imports across `app/`, `components/`,
other `lib/` modules, and the removed `lib/index.ts` dead barrel):

| File | Lines |
|------|------:|
| `lib/aethel-engine.ts`                         |   515 |
| `lib/ai-3d-generation-system.ts`               | 1,173 |
| `lib/ai-integration-total.ts`                  | 1,144 |
| `lib/audio-synthesis.ts`                       | 1,168 |
| `lib/behavior-tree.ts`                         | 1,186 |
| `lib/collaboration-realtime.ts`                | 1,189 |
| `lib/engine/navigation-ai.ts`                  | 1,173 |
| `lib/engine/particle-system.ts`                | 1,196 |
| `lib/hair-fur-system.ts`                       | 1,168 |
| `lib/navigation-mesh.ts`                       |   948 |
| `lib/profiler-integrated.ts`                   | 1,169 |
| `lib/save-load-system.ts`                      |   819 |
| `lib/sequencer-cinematics.ts`                  | 1,187 |
| `lib/skeletal-animation.ts`                    | 1,183 |
| `lib/vfx-graph-editor.ts`                      | 1,189 |
| `lib/water-ocean-system.ts`                    | 1,169 |
| `lib/world-partition.ts`                       | 1,180 |
| `lib/store/workspace-store.ts`                 | 1,182 |
| `lib/theme/theme-service.ts`                   | 1,163 |
| `lib/achievements/achievement-system.tsx`      | 1,072 |
| `lib/replay/replay-system.tsx`                 | 1,169 |
| `lib/index.ts` (dead barrel)                   |   666 |
| **Total**                                      | **24,008** |

Empty directories removed: `lib/achievements`, `lib/replay`, `lib/store`,
`lib/theme`.

### 2. Infrastructure fixes

- **Next/Image restored:** removed `images: { unoptimized: true }` from
  `cloud-web-app/web/next.config.js`. LCP < 2.5s budget is now achievable
  again and the Lighthouse Perf score should recover from the V5 5.2 baseline.
- **.aethelrules absolute paths:** replaced every
  `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\…` reference with
  `cloud-web-app/web/…` project-relative paths so the rules file works on
  Linux CI / macOS / Cursor / Windsurf without surprise. Expanded the
  **Observability**, **Collaboration**, **Accessibility**, **Testing** and
  **Deployment** sections so the shared context surfaces the canonical
  decisions (logger, token escape hatches, Yjs contract, no hex colours).

### 3. Light theme toggle (UX-facing)

- `components/ui/ThemeToggle.tsx` — sun/moon accessible button, `aria-pressed`
  mirrors light state, `aria-label` announces the target theme, fixed-size
  icon container avoids layout shift. Two sizes: `sm` (27x28 header) and
  `md` (40x40 settings).
- Wired into `components/AethelHeaderPro.tsx` right section so every
  authenticated screen inherits the toggle.
- Re-exported from `components/ui/index.ts` for consistent imports.
- Storybook: `components/ui/ThemeToggle.stories.tsx` with four stories
  (dark/light × sm/md). Decorator flips `data-theme` on the document root so
  the stage rebuilds with the real Aethel tokens — this doubles as a visual
  regression for the `:root[data-theme="light"]` block in `globals.css`.
- Tests: `__tests__/ThemeToggle.test.tsx` — four cases covering label
  announcement, `aria-pressed` mirroring, and both click paths
  (dark→light-plus, light→dark-plus).

## Gates

```
check-design-system-consistency.mjs  ✅  0 findings (766 files)
check-hardcoded-colors.mjs           ✅  0 findings
grep console.(log|info|debug) in new files  ✅  0 matches
```

## Benchmark delta vs Audit V5

| Dimension                           | V5 (before) | Round 80 (after) |
|-------------------------------------|-------------|------------------|
| Dead-lib lines                      | ~24k        | 0                |
| `.aethelrules` portable             | ❌ Windows  | ✅ relative      |
| `next.config.js` image optimization | Disabled    | Enabled          |
| Light theme shipped                 | Partial     | ✅ Toggle live   |
| Storybook stories                   | 8           | 12 (+4 toggle)   |
| Hard-coded hex in TSX               | 0 (R79)     | 0                |

## Next round (Round 81 candidates)

- Split god components: `FullscreenIDE.tsx` (1,808 lines) →
  `components/ide/fullscreen/*` ≤ 300 lines each.
- `AIChatPanelPro.tsx` (1,750 lines) → `components/ai-chat/*` ≤ 300 lines
  each.
- Enable `jest.config.ts` coverage (`collectCoverage: true`,
  threshold 40 % → 70 %).
- Prisma `migrations/init` folder.
- i18n codemod: PT hard-coded → ICU MessageFormat, ≥ 500 EN keys.
- Lighthouse CI gate (Perf ≥ 90, A11y ≥ 95, SEO ≥ 95).
- Admin route consolidation (47 → 6 canonical areas).
