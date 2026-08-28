# AETHEL ENGINE: MANUAL REFINEMENT & EXPOSURE SPECIFICATION

**Status:** SUPREME LAW (Zero-AI Base Doctrine)
**Author:** Gemini (Opus Max Level) / Triumvirate Standard

## 0. THE SOVEREIGNTY OF THE HUMAN ARTIST

Aethel Engine is fundamentally a professional AAA creation suite. Artificial Intelligence is merely an orchestration layer on top of a fully exposed, fully manual, mathematically rigorous Engine. 

**Absolute Law:** *If a user unplugs the internet and disables all AI Assistants, they must still possess 100% granular, sub-pixel, manual control over every rendering, physics, and gameplay variable within the Aethel Studio IDE, with an ergonomic workflow that matches or exceeds Unreal Engine 5.*

AI generates drafts; Human Technical Artists perform the **Final Refinement**. The IDE must never hide complex engine features behind an AI prompt.

---

## 1. MANUAL EXPOSURE PILLARS

### 1.1 The Material Node Editor (S1 Studio Pillar)
Artists must be able to sculpt materials manually, exactly as in UE5's Material Editor, without writing WGSL code or asking an AI.
*   **Visual Node Graph:** Fully manual drag-and-drop nodes for math (Add, Multiply, Dot Product, Lerp) and textures (Sample2D, Triplanar).
*   **Substrate Slabs:** Manual sliders for Base Color, Metallic, Roughness, Anisotropy, Clearcoat, and Subsurface Scattering.
*   **Real-time Compilation:** The graph compiles deterministically to WGSL locally in the browser/Tauri client, immediately updating the viewport.

### 1.2 Post-Process & Lighting Volumes
Technical Artists control the emotional tone of the game manually.
*   **Volume System:** Drag-and-drop bounding boxes (Volumes) into the 3D viewport.
*   **Manual Sliders:** The `DetailInspectorPanel` must expose precise float inputs and sliders for:
    *   **Bloom:** Threshold, Intensity, Scatter.
    *   **Tone Mapping:** Exposure, Contrast, Toe, Shoulder (ACES Film curve adjustments).
    *   **Radiance (GI):** Bounce intensity, Ray steps, Voxel grid resolution.
*   **No "Magic":** These are pure mathematical parameters passed via memory-mapped buffers (SAB) to the WGPU Renderer.

### 1.3 The Physics Constraint Editor (XPBD)
Technical Animators must manually tune the ragdolls and physical interactions.
*   **Joint Manipulation:** Visual gizmos in the viewport to limit rotation angles (Swing 1, Swing 2, Twist).
*   **Compliance & Stiffness:** Direct numerical input for XPBD constraint compliance.

---

## 2. THE DETAIL INSPECTOR UX (YJS SYNCHRONIZED)

The `DetailInspectorPanel` is the heart of Manual Supremacy. 
*   **Ergonomics:** Every float, vector, and color in the Rust ECS (Entity Component System) must automatically reflect in the Inspector.
*   **Zero-Latency Dragging:** When an artist clicks and drags a slider in the React UI, the value must flow over the Tauri IPC / SharedArrayBuffer and update the Rust Kernel at 120Hz, providing buttery-smooth visual feedback in the viewport.
*   **Multi-User Manual Tuning:** If Artist A changes the Sun Intensity, Artist B (on another machine) sees the slider move locally via Yjs CRDT. This works flawlessly without AI.

---
**Verdict:** The Aethel Engine is built for the hands of the Master Artisan. The AI is the apprentice.
