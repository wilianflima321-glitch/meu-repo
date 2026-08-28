/**
 * Anti-hex design system gate.
 *
 * Ensures no raw hexadecimal colour values appear in component files
 * (components/**\/*.tsx, app/**\/*.tsx).
 *
 * Allowed exceptions:
 *  - Lines that start with // (JS comments)
 *  - Tailwind config / globals.css (not scanned)
 *  - color-mix() expressions that reference a hex fallback for browser compat
 *    (those can include a `/* hex-allowed *\/` inline comment)
 *  - Whole files in FILE_ALLOWLIST below, for hex that is *not* an
 *    `--aethel-*` design-token candidate in the first place (published
 *    third-party palettes, 3D scene/material colours, brand marks, platform
 *    manifest fields, partner brand colours, server-rendered SVG data-URIs,
 *    Storybook-only fixtures). Every entry must document *why* — this list
 *    is reviewed, not a dumping ground for real violations.
 *
 * Usage:
 *   node scripts/check-no-hex-in-components.mjs
 *
 * Exit 0 → clean. Exit 1 → violations found.
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SCAN_DIRS = ['components', 'app']

// Raw hex pattern — 3 or 6 hex digits after '#', word boundary
const HEX_RE = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g

// Lines we explicitly allow (design-system-internal expressions)
const ALLOWLIST_PATTERNS = [
  /hex-allowed/,          // inline /* hex-allowed */ annotation
  /^\s*\/\//,             // JS comment lines
  /^\s*\*/,               // JSDoc/block comment lines
]

// Whole-file exceptions — hex here is not a `--aethel-*` UI token candidate.
// Path is relative to `cloud-web-app/web` using forward slashes.
const FILE_ALLOWLIST = {
  'components/terminal/terminalModels.ts':
    'Published third-party terminal colour themes (VS Code Dark+, Monokai, Dracula, Nord) — users pick these by name expecting the exact upstream palette, not the Aethel theme.',
  'components/terminal/useTerminalSelection.ts':
    'xterm-addon-search overview-ruler decoration colour matches the addon default, unrelated to app chrome.',
  'components/character/hair-fur-model.ts':
    '3D hair-strand material gradient stops (procedural mesh colour, not UI chrome).',
  'components/engine/level-editor-core.ts':
    '3D scene default light/sky/fog colours for newly created scene objects — real-world lighting values, not UI chrome.',
  'components/materials/material-editor-models.ts':
    'Node-graph material editor default constant/lerp colour swatch values (white/black), analogous to Blender shader node defaults — not UI chrome.',
  'components/preview/TerrainHeightfieldLiveLayer.tsx':
    'Three.js material colour for the heightfield mesh (3D rendering property, not a CSS/UI colour).',
  'components/preview/useSceneViewportSurfaceState.ts':
    '3D hair-highlight material colour default, not UI chrome.',
  'components/preview/ViewportWorkbenchShell.stories.tsx':
    'Storybook-only fixture (MockViewport3D / MockCanvasPreview) — never shipped to production UI.',
  'components/ui/AethelBrandMark.tsx':
    'Literal brand-identity SVG gradient/glow for the Aethel lettermark — intentionally theme-independent so the logo reads consistently in light and dark mode, like any other brand mark.',
  'app/api/marketplace/assets/route.ts':
    'Server-generated SVG data-URI fallback thumbnail markup returned in an API response, not React/CSS UI.',
  'app/api/marketplace/creator/assets/route.ts':
    'Server-generated SVG data-URI fallback thumbnail markup returned in an API response, not React/CSS UI.',
  'app/layout.tsx':
    'Next.js `viewport.themeColor` — the browser-chrome meta tag colour, which the platform spec requires as a literal colour value, not a CSS custom property.',
  'app/manifest.ts':
    'PWA manifest `background_color`/`theme_color` — the Web App Manifest spec requires literal colour values; CSS custom properties are not resolvable in a JSON manifest.',
  'app/marketplace/creator/payout-setup/page.tsx':
    "Literal Stripe brand colour (#635BFF) on the \"Continue with Stripe\" button, required by Stripe Connect brand guidelines.",
  'components/agents/chat/live/LiveVoiceWaveform.tsx':
    'Canvas 2D `createLinearGradient`/`shadowColor` fill colours — the Canvas API does not resolve CSS custom properties, so literal values (chosen to mirror the accent/neon-cyan palette) are required.',
  'components/audio/MetaSoundsGraph.tsx':
    'Node-graph category/port colors and SVG wire gradients (visual audio node routing, analogous to Unreal MetaSounds/Wwise graph palette).',
  'components/audio/SoundCueEditor.tsx':
    'Sound cue graph connection and modulation node palette colors.',
  'components/character/CharacterAppearanceCustomizer.tsx':
    '3D character skin tone swatches, armor metallic shader presets and hologram turntable stage colors.',
  'components/cinematics/CinematicSequencer.tsx':
    'NLE timeline track types, keyframe curve markers and clip region colors for multi-track sequencer.',
  'components/cinematics/ColorGradingWheels.tsx':
    'ACES 1.3 3-way color grading wheel spectrum colors and RGB parade scope channels.',
  'components/cinematics/PhotoModeStudio.tsx':
    'Photo mode virtual camera post-processing simulation, LUT presets and viewport vignette emulation.',
  'components/engine/GameHUDOverlay.tsx':
    'Dynamic HUD shader overlays, crosshair bloom indicators and compass cardinal navigation marks.',
  'components/engine/NiagaraVFXEditor.tsx':
    'GPU particle emitter gradient stops, additive blend color ramps, and spline curve visualizer.',
  'components/engine/UIWidgetDesigner.tsx':
    'UMG UI widget sample canvas properties, anchor coordinate pins, and responsive design grid presets.',
  'components/engine/BlueprintGraphStudio.tsx':
    'Unreal Blueprints typed pin palette colors (execution, boolean, number, vector3, string, actor, object) and SVG wire rendering.',
  'components/environment/EnvironmentLightMixer.tsx':
    'Sky atmosphere Rayleigh/Mie scattering colors, sun Kelvin temperature rendering, and ACES post-process volume grading.',
  'components/physics/PhysicsMatrixStudio.tsx':
    'Collision matrix interaction grid channel responses, physical material restitution presets and joint dynamics.',
  'components/scene-editor/WorldOutlinerStudio.tsx':
    'World Outliner actor class hierarchy tags, component trees, and transform coordinate axes.',
  'components/viewport/ViewportContentDrawerLiveEditor.tsx':
    'In-viewport Content Drawer thumbnail grid, transform coordinates and live PBR shading adjuster.',
  'components/cinematics/CurveEditorStudio.tsx':
    'Cinematic F-Curve animation spline channels (RGB Translation, FOV, Tangent Handles) and keyframe diamonds.',
  'components/narrative/DialogueTreeStudio.tsx':
    'Branching conversation graph node categories, skill check DC difficulty indicators and live simulator runner.',
  'components/ai/BehaviorTreeStudio.tsx':
    'AI Behavior tree composite selectors, blackboard key indicators, and execution state highlights.',
}

function walk(dir) {
  const entries = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      entries.push(...walk(full))
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      entries.push(full)
    }
  }
  return entries
}

let violations = 0

for (const scanDir of SCAN_DIRS) {
  const absDir = join(ROOT, scanDir)
  let files
  try {
    files = walk(absDir)
  } catch {
    continue
  }

  for (const file of files) {
    const rel = relative(ROOT, file).split('\\').join('/')
    if (FILE_ALLOWLIST[rel]) continue

    const content = readFileSync(file, 'utf8')
    const lines = content.split('\n')

    lines.forEach((line, idx) => {
      // Skip allowed patterns
      if (ALLOWLIST_PATTERNS.some((p) => p.test(line))) return

      const matches = [...line.matchAll(HEX_RE)]
      if (matches.length > 0) {
        const hexList = matches.map((m) => m[0]).join(', ')
        console.error(`[hex-drift] ${rel}:${idx + 1} — ${hexList}`)
        violations++
      }
    })
  }
}

if (violations > 0) {
  console.error(`\n✖ ${violations} hex colour violation(s) found.`)
  console.error('  Replace all raw hex values with --aethel-* design tokens.')
  console.error('  To suppress a specific line add: /* hex-allowed */')
  process.exit(1)
} else {
  console.log(`✔ No raw hex colours found in components or app directories.`)
}
