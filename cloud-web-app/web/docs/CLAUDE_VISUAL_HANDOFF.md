# CLAUDE_VISUAL_HANDOFF.md
> **Canonical visual / UX / polish handoff for Claude**
> Composer already owns: Auth, queues, workers, Rapier, VisualScript play, SAML, share API,
> playtest API, context registry, deprecated AI routes. **Do not touch those.**
>
> Your scope: everything the user **sees, feels, and reads**. Pass all gates. Ship premium.

---

## Design System Reference

All color and spacing must come from these tokens (defined in `app/globals.css`):

```
--aethel-primary         #3b82f6   (blue)
--aethel-primary-light   #93c5fd
--aethel-primary-dark    #1d4ed8
--aethel-secondary       #14b8a6   (teal)
--aethel-accent          #8b5cf6   (violet)
--aethel-accent-light    #c4b5fd
--aethel-neon-cyan       #22d3ee
--aethel-neon-amber      #fbbf24
--aethel-neon-emerald    #34d399
--aethel-glow-cyan       0 0 8px rgba(34,211,238,.45), 0 0 24px rgba(34,211,238,.18)
--aethel-glass-bg        rgba(16,22,36,0.72)
--aethel-glass-border    rgba(255,255,255,0.08)
--aethel-glass-blur      16px
--aethel-surface-primary   #0a0a0f
--aethel-surface-secondary #101622
--aethel-surface-tertiary  #171f2d
--aethel-text-primary    #f7f9fc
--aethel-text-secondary  #c6cfdd
--aethel-text-tertiary   #94a0b8
--aethel-border-primary  rgba(148,163,184,0.18)
--aethel-border-subtle   rgba(255,255,255,0.10)
```

**Utility classes available** in `globals.css`:
- `.aethel-glass` — glass morphism surface
- `.aethel-panel` — dark panel with gradient + shadow
- `.aethel-shimmer` — skeleton loading shimmer
- `.animate-glow-cyan` / `.animate-glow-amber` — pulsing glow
- `.aethel-beacon` — live pulsing dot (::after ring)
- `.aethel-progress-stripe` — animated diagonal stripes

---

## P0 — Gate Compliance (already fixed by Composer — verify with `npm run qa:interface-gate`)

> **STATUS: COMPLETED** — All 17 `indigo-*` tokens have been replaced.
> The following 4 files were corrected:
> - `app/studio/StudioRunboardActions.tsx` (8 tokens → `var(--aethel-primary)` + light variant)
> - `components/assets/RenderQueueDashboard.tsx` (4 tokens)
> - `app/studio/StudioRunboardHeader.tsx` (3 tokens)
> - `components/settings/BYOKVaultPanel.tsx` (2 tokens)
>
> **Verify**: `cd meu-repo/cloud-web-app/web && npm run qa:interface-gate`
> Expected output: `PASS legacy-accent-tokens=0`

---

## P1-A — AI Chat: Wire `ActiveContextBadge` into `AIChatHeader`

### What exists

| File | Role |
|------|------|
| `components/ide/ActiveContextBadge.tsx` | Fully built chip strip. Props: `items: ActiveContextItem[]`, `compact?: boolean` |
| `contexts/AethelContextRegistry.tsx` | `useAethelContext()` returns `{ chips: ContextChip[] }` where `ContextChip` has `kind: 'viewport' | 'file' | 'blueprint' | 'terminal' | 'function'` and `label: string` |
| `components/agents/chat/header/AIChatHeader.tsx` | Header component — add the badge below the top toolbar row |

### What to do

**File: `components/agents/chat/header/AIChatHeader.tsx`**

1. Add imports at top:
```tsx
import { ActiveContextBadge } from '@/components/ide/ActiveContextBadge'
import type { ActiveContextItem } from '@/components/ide/ActiveContextBadge'
import { useAethelContext } from '@/contexts/AethelContextRegistry'
```

2. Inside the `AIChatHeader` function body (before `return`):
```tsx
const { chips } = useAethelContext()

const contextItems: ActiveContextItem[] = chips.map((chip) => ({
  kind: chip.kind === 'viewport' ? 'viewport'
      : chip.kind === 'file'     ? 'code'
      : chip.kind === 'blueprint'? 'node'
      : 'custom',
  label: chip.label,
}))
```

3. Insert badge row **between** the top toolbar `<div>` and the `<AIChatAgentLane>` (line ~88 area):
```tsx
{contextItems.length > 0 && (
  <ActiveContextBadge
    items={contextItems}
    className="border-b border-[var(--aethel-border-subtle)]"
  />
)}
```

The badge has a built-in pulse dot, kind-colored chips, and renders `null` when `items` is empty — no extra guards needed.

---

## P1-B — Viewport: Wire Orphaned HUD Components

### File map

| Component | File | Status |
|-----------|------|--------|
| `FlyCameraHUD` | `components/viewport/FlyCameraHUD.tsx` | Built, not mounted |
| `ViewportContextMenu` | `components/viewport/ViewportContextMenu.tsx` | Built, not mounted |
| `ViewportDropGhost` | `components/viewport/ViewportDropGhost.tsx` | Built, not mounted |
| `ResourceMonitorHUD` | `components/agents/chat/ResourceMonitorHUD.tsx` | Built, not mounted |

### Target file: `components/viewport/AethelViewport3D.tsx` (or `ViewportSceneCanvas.runtime.tsx`)

Locate the container that wraps `<Canvas>` (the `data-aethel-nanite` canvas). This is the overlay mount point.

**1. FlyCameraHUD** — show when `creativeMode === 'fly'` or when the viewport is in fly-camera mode. Props: `isActive: boolean`, `speed: number`.

```tsx
import { FlyCameraHUD } from './FlyCameraHUD'
// Inside the viewport overlay div:
<FlyCameraHUD isActive={isFlyMode} speed={flySpeed} />
```

**2. ViewportContextMenu** — show on right-click over a scene object. Props: `isOpen: boolean`, `x: number`, `y: number`, `targetId: string | null`, `onClose: () => void`, `items?: ViewportContextMenuItem[]`.

```tsx
import { ViewportContextMenu } from './ViewportContextMenu'
// Add state:
const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; targetId: string | null } | null>(null)
// On canvas right-click: setCtxMenu({ x: e.clientX, y: e.clientY, targetId: selectedId })
// Render:
{ctxMenu && (
  <ViewportContextMenu
    isOpen
    x={ctxMenu.x}
    y={ctxMenu.y}
    targetId={ctxMenu.targetId}
    onClose={() => setCtxMenu(null)}
  />
)}
```

**3. ViewportDropGhost** — show while dragging assets from the asset browser. Props: `isDragging: boolean`, `assetName: string`, `position: { x: number; y: number }`.

```tsx
import { ViewportDropGhost } from './ViewportDropGhost'
// On dragover: track position; on drop / dragleave: clear
{isDragging && (
  <ViewportDropGhost
    isDragging={isDragging}
    assetName={draggedAssetName}
    position={dragPos}
  />
)}
```

**4. ResourceMonitorHUD** — toggle via toolbar button (add to existing viewport toolbar). Props: `fps?: number`, `memoryMB?: number`, `visible?: boolean`.

```tsx
import { ResourceMonitorHUD } from '@/components/agents/chat/ResourceMonitorHUD'
// Add toggle button in toolbar: title="Resource Monitor (F2)"
// Render in overlay:
<ResourceMonitorHUD fps={currentFps} memoryMB={currentMem} visible={showResourceMonitor} />
```

### Nanite badge (enhance, don't restructure)

The `data-aethel-nanite` attribute is already set in `ViewportSceneCanvas.runtime.tsx:87`. When `naniteEnabled === true`, add a visible HUD badge overlay so it's obvious to the user:

```tsx
{naniteEnabled && (
  <div
    aria-label="Nanite virtualized geometry active"
    className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-[var(--aethel-neon-cyan)]/30 bg-[var(--aethel-neon-cyan)]/8 px-2.5 py-1"
  >
    <span className="aethel-beacon h-1.5 w-1.5 rounded-full bg-[var(--aethel-neon-cyan)]" aria-hidden />
    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-neon-cyan)]">
      Nanite
    </span>
  </div>
)}
```

---

## P1-C — Voice / Live: Mount `LiveSessionHUD`

### What exists

| File | Role |
|------|------|
| `components/agents/chat/live/LiveSessionHUD.tsx` | Built UI. Props: `status`, `speaker`, `transcript?`, `isMuted`, `onToggleMute`, `onEndSession`, `amplitude?` |
| `components/agents/chat/voice/useRealtimeVoiceSession.ts` | Complete hook. Returns `{ status, speaker, transcript, amplitude, isMuted, toggleMute, endSession }` |
| `components/ide/AIChatPanelPro.tsx` | Has `isLiveMode: boolean` prop (line 54) and `onToggleLiveMode` prop |

### Target: `components/ide/AIChatPanelPro.tsx`

The component already receives `isLiveMode`. Wire the session and render the HUD above the messages pane.

**Add imports** (top of file):
```tsx
import { AnimatePresence } from 'framer-motion'
import { LiveSessionHUD } from '@/components/agents/chat/live/LiveSessionHUD'
import { useRealtimeVoiceSession } from '@/components/agents/chat/voice/useRealtimeVoiceSession'
```

**Add hook** (inside the function body, after existing hooks):
```tsx
const voiceSession = useRealtimeVoiceSession({
  isEnabled: isLiveMode,
  modelId: currentModel,
  onMessageReceived: (text) => {
    onSendMessage?.({ role: 'user', content: text, id: crypto.randomUUID(), timestamp: Date.now() })
  },
})
```

**Add HUD** (just before `<AIChatMessagesPane>`, inside the `flex-1 flex-col` div):
```tsx
<AnimatePresence>
  {isLiveMode && (
    <LiveSessionHUD
      status={voiceSession.status}
      speaker={voiceSession.speaker}
      transcript={voiceSession.transcript}
      isMuted={voiceSession.isMuted}
      onToggleMute={voiceSession.toggleMute}
      onEndSession={() => {
        voiceSession.endSession()
        onToggleLiveMode?.()
      }}
      amplitude={voiceSession.amplitude}
    />
  )}
</AnimatePresence>
```

**503 empty state** — if the voice session returns `status === 'disconnected'` after the first connection attempt and `isLiveMode` is true, show an honest banner:
```tsx
{isLiveMode && voiceSession.status === 'disconnected' && (
  <div className="mx-4 mb-2 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-4 py-3 text-[11px] text-[var(--aethel-text-tertiary)]">
    <span className="font-semibold text-[var(--aethel-warning)]">Voice unavailable</span>
    {' '}— configure an OpenAI key in Settings → BYOK Vault to enable realtime voice.
  </div>
)}
```

---

## P1-D — Research: Wire `ResearchProgressCard`

### What exists

| File | Role |
|------|------|
| `components/nexus/AethelResearch.tsx` | Contains `handleSearch` which sets `result.status = 'searching'` on POST to `/api/research` |
| `components/agents/chat/ResearchProgressCard.tsx` | Built card. Props: `query: string`, `status: 'searching' | 'complete' | 'fallback'`, `sourceCount?: number` |

### Target: `components/nexus/AethelResearch.tsx`

**Import** (top):
```tsx
import { ResearchProgressCard } from '@/components/agents/chat/ResearchProgressCard'
```

**Render** — immediately after the `<form>` block (around line 243), inside the `{result.status !== 'idle' && (...)}` block, add as the **first child**:
```tsx
{result.status === 'searching' && (
  <ResearchProgressCard
    query={result.query}
    status="searching"
  />
)}
```

The card should remain visible until `status === 'complete'` or `'fallback'`, then be replaced by the existing results block via `AnimatePresence` if you want the transition.

---

## P1-E — Settings: Visual Sub-tabs (Engine / Simulation / Controls / Audio / VR)

### What exists

| File | Role |
|------|------|
| `components/settings/SettingsUI.tsx` | Flat list view using `SettingsCategorySidebar` on the left |
| `components/settings/ui/settings-provider.tsx` | `SettingsProvider` context + categories data |
| `components/settings/SettingsPageData.items.engine.ts` | Has keys: `engine.nanite.viewport`, `engine.physics.gravity` |
| `app/settings/page.tsx` | Mounts `SettingsUI` in the "Advanced editor" tab |

### What to do

**File: `components/settings/SettingsUI.tsx`** — add a horizontal sub-tab bar above the `SettingsCategorySidebar`/`SettingsResultsPane` split for the following engine groups:

```
ENGINE | SIMULATION | CONTROLS | AUDIO | VR
```

Use the existing `SettingsCategory` filter already in `useSettingsUiState` — just add `activeGroup` state and filter `filteredSettings` accordingly.

**Sub-tab design** (glass, cyberpunk polish):
```tsx
const ENGINE_GROUPS = [
  { id: 'engine',     label: 'Engine',     icon: <Cpu className="h-3.5 w-3.5" /> },
  { id: 'simulation', label: 'Simulation',  icon: <Atom className="h-3.5 w-3.5" /> },
  { id: 'controls',   label: 'Controls',   icon: <Gamepad2 className="h-3.5 w-3.5" /> },
  { id: 'audio',      label: 'Audio',      icon: <Volume2 className="h-3.5 w-3.5" /> },
  { id: 'vr',         label: 'VR',         icon: <Glasses className="h-3.5 w-3.5" /> },
] as const
```

Tab button style (active):
```
border-b-2 border-[var(--aethel-neon-cyan)] bg-[rgba(34,211,238,0.06)] text-[var(--aethel-neon-cyan)]
```

Tab button style (inactive):
```
text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)]
```

**Play-mode-affecting toggles** — highlight settings whose keys match:
- `simulation.timeDilation`
- `simulation.godMode`
- `engine.nanite.viewport`
- `engine.physics.gravity`

Add a small amber badge: `⚡ Affects Play Mode` next to the toggle label.

---

## P1-F — i18n / Copy (PT → EN)

### File: `components/billing/CreditWallet.tsx`

**Line 76–78** — tab labels are currently PT:
```tsx
// BEFORE:
{ id: 'overview', label: 'Resumo', icon: <Coins className="w-4 h-4" /> },
{ id: 'history', label: 'Historico', icon: <Clock className="w-4 h-4" /> },
{ id: 'purchase', label: 'Comprar', icon: <CreditCard className="w-4 h-4" /> },

// AFTER:
{ id: 'overview', label: 'Overview', icon: <Coins className="w-4 h-4" /> },
{ id: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
{ id: 'purchase', label: 'Buy Credits', icon: <CreditCard className="w-4 h-4" /> },
```

**Line 83** — comment `// PACOTES DE CREDITOS` → `// CREDIT PACKAGES`
**Line 33** — comment `// TIPOS` → `// TYPES`

### Audit: search for other hardcoded PT-BR in authenticated surfaces

Run: `grep -rn --include="*.tsx" "Resumo\|Histórico\|Carteira\|Saldo\|Extrato\|Recarregar\|Comprar" app/ components/`

Translate anything found in user-facing surfaces. Backend error messages in `app/api/agents/stream/route.ts` are optional but translate `"Body JSON invalido"` → `"Invalid JSON body"`.

---

## P2-A — Glass Cyberpunk Polish: Studio Runboard

### Files

| File | Target |
|------|--------|
| `app/studio/StudioRunboardHeader.tsx` | Header panel |
| `app/studio/StudioRunboardActions.tsx` | Action buttons |
| `components/studio/CreativeStudioShell.tsx` | Shell chrome |

### Design language

The studio runboard should feel like **Unreal's dark editor** crossed with **Cursor's AI panel** — deep dark surfaces, cyan neon accents, chamfered/notched corners, subtle glass blur.

**Panel wrapper** (apply to the runboard root):
```tsx
style={{
  background: 'rgba(2,6,23,0.92)',
  border: '1px solid rgba(34,211,238,0.14)',
  backdropFilter: 'blur(20px) saturate(160%)',
  boxShadow: '0 0 0 1px rgba(34,211,238,0.06), 0 24px 80px rgba(0,0,0,0.55)',
  // Chamfered corner top-right
  clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)',
}}
```

**Neon top-line accent** (1px gradient at very top):
```tsx
<div
  aria-hidden
  className="pointer-events-none h-px w-full"
  style={{ background: 'linear-gradient(90deg, transparent, #22d3ee 30%, #8b5cf6 70%, transparent)' }}
/>
```

**Focus glow on interactive buttons**:
```
focus-visible:ring-2 focus-visible:ring-[var(--aethel-neon-cyan)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--aethel-surface-primary)]
```

**Active state for "Run / Submit" primary button** — already uses `from-cyan-500 to-[var(--aethel-primary)]` after P0 fix. Add `.animate-glow-cyan` class when `isAIWorking` is true.

---

## P2-B — Glass Cyberpunk Polish: Chat Panel

### File: `components/agents/AgentsWorkspaceContainer.tsx`

The outer container (line 129–186) wraps the Composer/Agents rail switcher.

**Rail switcher** — currently a plain toggle. Make it feel premium:
```tsx
// Rail tab active state:
'bg-[rgba(34,211,238,0.08)] text-[var(--aethel-neon-cyan)] border-b border-[var(--aethel-neon-cyan)]'
// Rail tab inactive:
'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
```

**Panel chrome** — add top-line neon accent (same as runboard above) to the outer container.

### File: `components/agents/chat/header/AIChatHeader.tsx`

The header background is currently `bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)]`. Increase to:
```
bg-[rgba(10,14,24,0.82)] backdrop-blur-[12px]
```
and add `border-b border-[rgba(34,211,238,0.08)]`.

---

## P2-C — BlueprintsAIInput Animation Polish

### File: `components/visual-scripting/BlueprintsAIInput.tsx`

The component already has framer-motion enter/exit and a typing glow. These enhancements should be applied without changing the behavior:

**1. Scan line animation on open** — add a thin cyan horizontal scan line that sweeps top→bottom once on mount:
```tsx
<motion.div
  initial={{ top: 0, opacity: 0.7 }}
  animate={{ top: '100%', opacity: 0 }}
  transition={{ duration: 0.6, ease: 'linear' }}
  className="pointer-events-none absolute left-0 right-0 h-px"
  style={{ background: 'rgba(0,229,255,0.5)', zIndex: 20 }}
  aria-hidden
/>
```

**2. Sparkles button** — when `isGenerating`, replace with a `animate-spin` Sparkles icon (already present) AND add the outer `animate-glow-cyan` class to the submit button:
```tsx
className={`... ${isFilled && !isGenerating ? 'animate-glow-cyan' : ''}`}
```

**3. Quick prompt chips** — on hover: add `box-shadow: var(--aethel-glow-cyan)`:
```tsx
className="... hover:shadow-[var(--aethel-glow-cyan)] hover:border-[rgba(34,211,238,0.4)] hover:text-[var(--aethel-neon-cyan)]"
```

---

## P2-D — WorldStudioClient: Visual States per `?tool=`

### File: `app/studio/level/WorldStudioClient.tsx`

`WorldStudioClient` already reads `?tool=` and resolves `activeTool` via `resolveActiveTool()`. The `WorldToolPicker` sidebar shows tool buttons correctly.

**What's missing**: the main viewport area (`WorldStudioViewport`) doesn't reflect any visual state from the active tool. When the tool changes:

1. **Show a tool identity banner** at the top of the viewport (temporary, 2s fade):
```tsx
<AnimatePresence>
  {recentlyChanged && (
    <motion.div
      key={activeTool.id}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-glass-bg)] px-3 py-2 backdrop-blur-[var(--aethel-glass-blur)]"
    >
      <span className="text-xs font-semibold text-[var(--aethel-text-primary)]">{activeTool.label}</span>
      <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">{activeTool.maturity}</span>
    </motion.div>
  )}
</AnimatePresence>
```

2. **Inspector** (`WorldInspector`) — expand with a maturity badge and a preview of key tool capabilities (pull from `buildToolEvidence(activeTool)` which already returns structured data).

---

## P2-E — `/team` Page: Premium Layout

### File: `app/team/page.tsx` (or wherever the team shell is)

The API is already functional. Replace the existing shell with a premium layout:

**Layout**:
- **Header row**: Aethel logo left, team name center, "Invite" CTA button right (gradient cyan→primary)
- **Stat bar**: `Members`, `Active now`, `Pending invites` — three glass cards in a row
- **Member list**: Avatar (initials or image), name, role badge, `Last active` relative time, action menu (3-dot)
- **Role badges**: `OWNER` (amber), `ADMIN` (primary), `MEMBER` (tertiary), `VIEWER` (muted)

**Member card design**:
```tsx
<div className="flex items-center gap-3 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4 transition-colors hover:border-[var(--aethel-border-secondary)]">
  {/* Avatar */}
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--aethel-surface-quaternary)] text-sm font-bold text-[var(--aethel-text-secondary)]">
    {initials}
  </div>
  {/* Info */}
  <div className="min-w-0 flex-1">
    <p className="truncate text-sm font-semibold text-[var(--aethel-text-primary)]">{name}</p>
    <p className="text-[11px] text-[var(--aethel-text-quaternary)]">{email}</p>
  </div>
  {/* Role badge */}
  <RoleBadge role={role} />
</div>
```

---

## P2-F — WCAG / Regression Sweeps

Run the following commands and fix any failures that are **purely visual** (do not touch API contracts):

```bash
cd meu-repo/cloud-web-app/web

# Critical accessibility check
npm run qa:wcag-critical

# Visual regression
npm run qa:authenticated-visual-regression

# Mobile studio compression
npm run qa:studio-mobile-compression

# Billing loading runboard
npm run qa:billing-loading-runboard
```

**Common WCAG failures to watch for and fix**:
- Color contrast below 4.5:1 — use `var(--aethel-text-primary)` on `var(--aethel-surface-secondary)` (≥7:1)
- Missing `aria-label` on icon-only buttons
- Focus not visible on custom controls — add `focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)]`
- Touch targets below 44×44px — add `min-h-[44px] min-w-[44px]` or use `.aethel-target-min` class

---

## Verification Sequence (run in order)

```bash
cd meu-repo/cloud-web-app/web

# 1. Lint — must be clean
npm run lint

# 2. Interface gate — must be PASS with 0 legacy tokens
npm run qa:interface-gate

# 3. Enterprise gate (includes interface gate + others)
npm run qa:enterprise-gate

# 4. Type check
npx tsc --noEmit

# 5. WCAG sweep
npm run qa:wcag-critical
```

**Expected final output for enterprise gate**:
```
[enterprise-gate] PASS
```

---

## What NOT to touch

These are locked — Composer already verified them:

- `lib/auth-session-sync.ts` and auth flow
- `lib/queue-system.ts`, `server/workers/*`
- `contexts/AethelContextRegistry.tsx` (read-only from your side)
- `lib/rapier-bridge.ts`, `components/engine/VisualScriptRuntime/*`
- `app/api/auth/**`, `app/api/ai/voice/realtime-session/route.ts`
- `app/api/wallet/**`, `app/api/billing/**`
- `app/api/runtime/playtest/**`
- `lib/saml/**`, SAML ACS route
- `lib/share-service.ts`, `app/api/projects/*/share/**`
- `lib/nanite-virtualized-geometry.ts` (rendering contracts, not UI chrome)
- Any file ending in `.contracts.ts` or `.runtime-contracts.ts`

---

*Document version: 2026-06-24 | Composer P0 gate: PASSED (legacy-accent-tokens=0)*
