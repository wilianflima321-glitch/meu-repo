import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backlogPath = join(__dirname, '..', '..', '..', 'docs', 'BACKLOG_MASTER.md');

let content = readFileSync(backlogPath, 'utf8');

// Replace the top header
content = content.replace(
  /# BACKLOG MASTER — Aethel Engine[\s\S]*?## 0 · EXECUTIVE SUMMARY/,
  `# BACKLOG MASTER — Aethel Engine: V34 The Dominance Wave

> **Generated:** 2026-07-15 (updated with V34 Market Dominance strategy)  
> **Repo:** \`wilianflima321-glitch/meu-repo\` · \`main\` · HEAD \`17e3a89\`  
> **Product:** \`cloud-web-app/web/\` (Next.js 15, aethel-portal v0.2.0)  
> **Purpose:** Single checklist for Claude + Gemini on any platform

---

## 00 · V34 THE DOMINANCE WAVE

Aethel is no longer just stabilizing. We are competing with the absolute best in the market. The execution standard is now:

1. **The Cursor Standard (Performance & AI):** Ultra-low latency code generation, deep workspace indexing, multi-file editing, and imperceptible \`diffReviewCenter\` diffing.
2. **The Unreal Standard (Performance Visual & Engine):** Flawless WebGPU framerates in \`CreativeWorkbenchShell\`. A Rust Kernel (Tauri) that handles heavy processing outside the browser. Node-based visual scripting (Quest/Logic) parity.
3. **The Adobe Standard (UX/Aesthetics):** Premium glassmorphism, native Dark Mode, precise contrasts, and micro-animations. No UI flickers, non-destructive editing history.

Every feature built from here out must meet one of these three bars.

---

## 0 · EXECUTIVE SUMMARY`
);

// Update Gaps that were solved
content = content.replace(
  /\| 1 \| `\/studio` home uses legacy `CreativeStudioShell` \(should be `CreativeWorkbenchShell`\) \| `app\/studio\/page\.tsx` \| 🔴 P0 \|/,
  '| 1 | `/studio` home uses legacy `CreativeStudioShell` | `app/studio/page.tsx` | ✅ DONE |'
);
content = content.replace(
  /\| 2 \| 3 different patterns for 6 studio pages \| animation\/level\/vfx via StudioGroupedEditor, film via FilmStudioClient, quest direct ✅, cinematic via CloudStreamStudioClient \| 🔴 P0 \|/,
  '| 2 | 3 different patterns for 6 studio pages | Converged to CreativeWorkbenchShell | ✅ DONE |'
);
content = content.replace(
  /\| 3 \| `AgentsWindow` not wired in `ModernIDEShell` \| `components\/ide\/modern-shell\/ModernIDEShellPanels\.tsx` \| 🔴 P0 \|/,
  '| 3 | `AgentsWindow` not wired in `ModernIDEShell` | `ModernIDEShellPanels.tsx` | ✅ DONE |'
);
content = content.replace(
  /\| 25 \| `enforceToolBus: true` default in production \| ❌ \| Still opt-in \|/,
  '| 25 | `enforceToolBus: true` default in production | ✅ | Now enforced by default in prod |'
);

// Update P0 tasks in MASTER PROMPT
content = content.replace(
  /P0 TASKS \(in order\):[\s\S]*?REFERENCE FILES:/,
  `P0 TASKS (in order) [V34 THE DOMINANCE WAVE]:
1. IMPLEMENTATION: 18 admin sub-folders missing page.tsx.
2. TAURI RUST KERNEL: Expand Cargo.toml with real dependencies (tokio, wgpu, ffmpeg-next) and replace 30-LOC skeletons.
3. RENDER FARM & EXPORT: Build real providers in lib/render-farm/ and lib/export/ (Modal, RunPod, ffmpeg webcodecs) beyond the current stub endpoints.
4. ON-DEVICE AI: Build mediapipe-bridge and whisper-web in lib/ai-ondevice/.
5. UX POLISH (ADOBE STANDARD): Enforce micro-animations and smooth transitions across ModernIDEShell and CreativeWorkbenchShell. No flickers.

REFERENCE FILES:`
);

// Update the ROOT CLEANUP status
content = content.replace(
  /### Structural Gap #1 — Root cleanup[\s\S]*?\*\*Result:\*\* root goes from 30\+ entries to ~14\./,
  `### Structural Gap #1 — Root cleanup (✅ COMPLETED)
Root folders \`cloud-admin-ia, diagnostics, metrics, shared, infra, components, lib\` removed.
Legacy CLI and scripts archived to \`packages/aethel-cli-legacy/\`.
Test specs consolidated in \`tests/e2e/legacy/\`.`
);

content = content.replace(
  /Product = "Cursor with receipts" \+ optional creative studio\. NOT Unreal-killer yet\./,
  'Product = V34 Dominance Wave. We are competing with Cursor (AI/IDE), Unreal (Engine/Performance), and Adobe (UX/Aesthetics).'
);


writeFileSync(backlogPath, content, 'utf8');
console.log('BACKLOG_MASTER.md updated with V34 Dominance Wave vision.');
