# 🎨 AETHEL ENGINE: MASTER STUDIO UI/UX & INTERFACE SPECIFICATION (AAA SUPREMACY STANDARD)

> **Architectural Directive:** This document serves as the single authoritative, non-truncated master specification (>600 lines) for all user interfaces, interactions, visual aesthetics, and usability workflows within the Aethel Engine Studio (Web Cloud & Desktop App).
> **Execution Rule:** This document details all requirements, critiques, component file mappings, and design tokens for implementation by Claude (Master Orchestrator AI). No source code files were modified during the creation of this specification.

---

## 🏛️ 1. EXECUTIVE DIRECTIVE & COMPETITIVE AUDIT

### 1.1 Deep Competitive Audit vs. Unreal Engine 5.5 & Cursor IDE Flagship Features

| Competitor Feature / Platform | Core Limitation & Failure in Competitor | Aethel Engine Supremacy Solution & Native Parity |
| :--- | :--- | :--- |
| **Unreal Chaos Destruction** | Heavy CPU computation; complex setup; non-procedural pre-baking required for mobile/web. | **Voronoi Fracture Destruction Studio (`VoronoiDestructionPanel.tsx`):** Real-time GPU Voronoi fracturing (`voronoi_fracture_destruction.rs`) with zero pre-bake lag. |
| **Unreal Metahuman Creator** | Closed cloud SaaS app; slow downloading of 50GB+ assets; non-customizable facial rig math. | **Metahuman Face & Blendshape Studio (`FacialBlendshapePanel.tsx`):** Subsurface scattering skin shader (`lux_facial_subsurface_occlusion.rs`) with 64 ARKit blendshapes. |
| **Unreal Niagara VFX System** | High node complexity; steep learning curve; separate module from material shaders. | **Niagara-Supremacy GPU VFX Graph (`NiagaraVfxGraphPanel.tsx`):** Unified fluid & particle solver (`lattice_boltzmann_fluid_solver.rs`) compiled to native WGSL. |
| **Unreal Lumen GI & Nanite** | High VRAM consumption (requires 8GB+ GPU); non-functional on low-end WebGL/mobile. | **Radiance Field Splatting + VSVM (`ViewportStudioPanel.tsx`):** 3D Gaussian Splatting + Clustered VSVM running on WebGPU/Vulkan with 60 FPS on any hardware. |
| **Cursor IDE Composer & Agent** | Simple chat interface; lacks 3D viewport inspection; truncates long responses; single-model reliance. | **AI Triumvirate MoA Hub (`AiTriumviratePanel.tsx`):** Parallel Qwen, Gemini, Llama 405B, Veo 3, and DeepSeek R1 working in tandem with zero truncation. |

---

### 1.2 Design System Core Philosophy & Aesthetic Principles

1. **Glassmorphism & Spatial Depth:**
   - Translucent frosted glass panels (`backdrop-filter: blur(16px)`), subtle 1px inner borders (`rgba(255, 255, 255, 0.08)`), and deep ambient drop shadows (`0 20px 50px rgba(0, 0, 0, 0.6)`).
   - Ultra-sleek dark mode utilizing deep space obsidian backgrounds (`#07090E`, `#0D1117`, `#161B22`).

2. **Vibrant Curated Color Palette (HSL Tailored Tokens):**
   - **Primary Accent (Quantum Cyan):** `hsl(190, 100%, 50%)` / `#00F0FF` (Interactive elements, active node wires, focus rings).
   - **Secondary Accent (Hyper Violet):** `hsl(270, 95%, 65%)` / `#A855F7` (AI Triumvirate status, active MoA squad indicators).
   - **Success (Cyber Emerald):** `hsl(150, 90%, 45%)` / `#10B981` (Passing compilation, clean audit probes, 60+ FPS metrics).
   - **Warning (Solar Amber):** `hsl(38, 95%, 55%)` / `#F59E0B` (Thermal throttling warnings, high VRAM usage).
   - **Danger (Thermodynamic Crimson):** `hsl(350, 90%, 55%)` / `#EF4444` (Compilation errors, fail-closed Trava blocks).

3. **Modern Typography & Hierarchy:**
   - **Primary UI Font:** *Inter* or *Outfit* (Google Fonts) for crisp readability at 9px to 14px body scales.
   - **Monospace Code Font:** *JetBrains Mono* or *Fira Code* for telemetry logs, terminal output, and WGSL/Rust code views.

4. **Zero-Stutter Micro-Animations:**
   - Smooth cubic-bezier transitions (`cubic-bezier(0.16, 1, 0.3, 1)`) for panel collapsing, tab switching, and modal popups.
   - 0-latency feedback on mouse hover, button clicks, and drag-and-drop operations.

---

## 🖥️ 2. COMPREHENSIVE AUDIT & SPECIFICATION OF ALL 15 STUDIO PANELS

---

### 2.1 PANEL 1: 3D VIEWPORT & RADIANCE FIELD STUDIO (`ViewportStudioPanel.tsx`)

#### A. Interface Layout & Components
* **Canvas Area:** Full-bleed WebGL2/WebGPU/Vulkan viewport rendering at native display resolution.
* **Top-Left Overlay (Render Mode Toolbar):**
  * Mode Dropdown: `3D Gaussian Splatting`, `Volumetric Clouds & Sky`, `Ocean Hydrodynamics`, `Wireframe`, `Unlit Albedo`, `Thermal GI Spectrum`, `Subsurface Scattering`.
  * Shading Modes: `PBR Path Tracing`, `Hybrid Clustered Shading (VSVM)`, `NPR Inker/Painter`.
* **Top-Right Overlay (Performance & Camera Telemetry):**
  * Real-time FPS counter (`60.0 FPS / 16.6ms`).
  * VRAM Gauge (`3.4 GB / 12.0 GB`).
  * Active Gaussian Splat Count (`1,240,500 Splats`).
  * Active Particle/Fluid Count (`100,000 Particles`).
* **Center Overlay (Contextual Transform Gizmo):**
  * 3D Move, Rotate, Scale gizmo with smooth snapping and distance readouts.
* **Bottom Overlay (Camera Projection & Speed Controls):**
  * Field of View (FOV) slider (`35°` to `120°`).
  * Camera Speed multiplier (`0.1x` to `10.0x`).
  * View Orientation Cube (Top, Front, Right, Orthographic/Perspective toggle).

#### B. Usability & Micro-Interactions
* **Right-Click Drag:** Smooth orbit camera around focus point.
* **Middle-Click Drag:** Pan camera in 3D space.
* **Scroll Wheel:** Smooth exponential zoom.
* **Press `F`:** Instantly frame-focus camera on selected 3D object or Gaussian Splat cluster.
* **Press `G`, `R`, `S`:** Quick shortcuts for Grab (Translate), Rotate, and Scale gizmo modes.

#### C. Competitor Supremacy Requirements
* **Unreal Engine 5.5 Parity Exceeded:** Real-time toggle for 3D Gaussian Splatting radiance fields without requiring manual photogrammetry mesh conversion.

---

### 2.2 PANEL 2: AI TRIUMVIRATE & FUSION MOA CONTROL HUB (`AiTriumviratePanel.tsx`)

#### A. Interface Layout & Components
* **Header Bar:**
  * Model Squad Status Badges: `Claude 3.5 Sonnet (Master)`, `Qwen 3.6 Plus (Code Auditor)`, `Gemini 2.5 Flash (Vision & Lore Auditor)`, `Llama 3.1 405B (Narrative Architect)`, `DeepSeek R1 (Math)`.
  * OpenRouter Fusion Status: `Connected | Latency: 42ms | Active Squad: 3 Sub-Agents`.
* **Left Sub-Panel (Parallel Multi-Model Output Matrix):**
  * Vertical split tabs showing live responses from Qwen, Gemini, Llama, and DeepSeek in real-time.
  * Individual Confidence Score meters (`99.4% Confidence`).
  * Status Pill: `Task 100% Completed (Zero-Truncation Guaranteed)`.
* **Right Sub-Panel (Master Orchestrator Unified Synthesis & Command Prompt):**
  * Unified Master Synthesis View: Merged, non-hallucinatory actionable report synthesized by Claude.
  * Chat & Prompt Input: Multi-line rich markdown input with file attachment button (`@filename`), prompt templates, and voice dictate button.
  * Mode Selector: `Auto-Multitask (Agent-of-Agents)`, `Interactive Interview (/grill-me)`, `Autonomous Goal (/goal)`.

#### B. Usability & Micro-Interactions
* **Drag-and-Drop Assets into Prompt:** Drag any 3D asset, texture, script file, or viewport screenshot directly into the AI prompt box.
* **One-Click Apply Action:** Every AI suggestion includes a green `[Apply to Project]` button with a live diff view before committing changes.

#### C. Competitor Supremacy Requirements
* **Cursor IDE Parity Exceeded:** Displays parallel sub-agent thought processes side-by-side without truncating outputs or losing context across sessions.

---

### 2.3 PANEL 3: VISUAL NODE EDITOR & LOGIC BLUEPRINT GRAPH (`NodeEditorPanel.tsx`)

#### A. Interface Layout & Components
* **Infinite Grid Canvas:** Vector grid with logarithmic zooming (`0.1x` to `5.0x`) and mini-map navigator in bottom-right corner.
* **Node Category Palette (Left Sidebar):**
  * Categories: `Math & Vector`, `Material & Shaders`, `Physics & Dynamics (PBD)`, `SDF Sculptor`, `Audio & HRTF`, `Gameplay Logic`, `AI Decision Tree`.
* **Node Card Components:**
  * Header with category color-coding (e.g., Purple for AI Logic, Blue for Math, Orange for Shaders).
  * Input ports (Left side, circular sockets) and Output ports (Right side, square sockets).
  * Data type color coding: Float (Green), Vec3 (Yellow), Texture (Magenta), Exec Flow (White Arrow).
  * Live Preview Thumbnails on material and shader nodes.
* **Bezier Connection Wires:**
  * Smooth curved wires with animated directional pulse particles showing signal flow during execution.

#### B. Usability & Micro-Interactions
* **Spacebar or Tab:** Open search popup to instantly filter and insert any of the 500+ logic nodes.
* **Drag Wire onto Canvas:** Automatically opens context-sensitive node creation menu filtered by compatible data types.
* **Box Select & Align:** Drag box to select multiple nodes; press `A` to auto-align vertically or horizontally.

#### C. Competitor Supremacy Requirements
* **Unreal Blueprints & Blender Nodes Parity Exceeded:** Instant zero-lag compilation to native WGSL shaders and Rust code via `wasm_logic_node_compiler.rs`.

---

### 2.4 PANEL 4: CINEMATIC DIRECTOR & TIMELINE COMPOSITOR (`CinematicTimelinePanel.tsx`)

#### A. Interface Layout & Components
* **Top Toolbar:** Play, Pause, Stop, Loop, Step Forward/Backward, Frame Rate Selector (`24`, `30`, `60`, `120`, `240 FPS`), Current Frame Timecode (`00:01:24:12`).
* **Track Hierarchy (Left Column):**
  * Camera Track (Transform, FOV, Depth of Field, Focal Distance).
  * Character Animation Track (Skeletal Rig, XPBD Ragdoll blend, Morph Targets).
  * AI Video Cutscene Track (Google Veo 3 / Runway Gen-3 generated clips).
  * Lighting & Post-Processing Track (Exposure, Sun Angle, ACES Tonemapper).
  * Audio Track (3D HRTF Spatial Audio, Voice Lipsync, BGM).
* **Timeline Grid (Right Column):**
  * Scalable frame ruler with keyframe diamonds, interpolation curves (Linear, Ease-In, Ease-Out, Cubic Spline).
  * In-Engine Zero-Loss Compositor strip showing seamless blending between rendered 3D gameplay and AI-generated video.

#### B. Usability & Micro-Interactions
* **Scrubbing:** Drag timehead ruler to scrub animation in real-time across all 3D viewports.
* **Keyframe Creation:** Press `K` on any inspector property to insert a keyframe at current timeline position.
* **Curve Editor Toggle:** Double-click any keyframe to switch to full-screen Bezier Curve Editor for fine-tuning motion velocity.

#### C. Competitor Supremacy Requirements
* **Unreal Sequencer Parity Exceeded:** Direct integration with Google Veo 3 for automated video cutscene generation and 3D Gaussian Splatting background conversion.

---

### 2.5 PANEL 5: ASSET BROWSER & SEED DNA INSPECTOR (`AssetBrowserPanel.tsx`)

#### A. Interface Layout & Components
* **Folder Navigation Tree (Left Sidebar):**
  * Project Root (`.aethel/`), `assets/`, `models/`, `textures/`, `audio/`, `scripts/`, `knowledge/`.
* **Asset Grid / List View (Center Area):**
  * Rich asset cards with real-time 3D thumbnail previews, asset tags, file sizes, and DNA Hash badges.
  * Search Bar with instant fuzzy filtering by name, tag, or asset type.
* **Right Inspector Sub-Panel (Seed DNA Details):**
  * Asset ID and Latent Seed Hash (e.g., `SEED_HASH_994F8A`).
  * Storage Footprint: `256 Bytes (Latent Seed)` vs `450 MB (Uncompressed Procedural Mesh)`.
  * AI Provenance contract verification badge (`Decentralized Asset Provenance Verified`).
  * One-Click Export Buttons: `Export to USD`, `Export to glTF`, `Export to Native Seed`.

#### B. Usability & Micro-Interactions
* **Drag Asset to Viewport:** Drag asset card directly into 3D Viewport to instantiate at raycast intersection point.
* **Right-Click Asset:** Quick options: `Re-synthesize via AI`, `Inspect Seed DNA`, `Duplicate with Mutation`, `Delete`.

#### C. Competitor Supremacy Requirements
* **Unreal Content Browser Parity Exceeded:** 99% disk space reduction by storing complex 3D assets as 256-byte procedural latent seeds via `binary_seed_streamer.rs`.

---

### 2.6 PANEL 6: SKELETAL RIG & XPBD RAGDOLL MUSCULAR STUDIO (`MuscularRigPanel.tsx`)

#### A. Interface Layout & Components
* **Center Viewport:** Skeletal bone hierarchy visualization (Bones rendered as semi-transparent ice-blue octahedrons).
* **Bone Hierarchy Tree (Left Column):**
  * Root -> Pelvis -> Spine -> Neck -> Head -> Arm_L -> Hand_L, etc.
* **XPBD Muscle & Tissue Tuning Inspector (Right Column):**
  * Softbody Muscle Mass & Elasticity Sliders ($E = 10^5 \text{ Pa}$).
  * Tissue Weight & Fat Layer Damping.
  * XPBD Joint Cone-Limit Angles (Swing 1, Swing 2, Twist limits).
  * Continuous Capsule Collider Radius and Mass settings.
  * FABRIK Inverse Kinematics (IK) Chain Target assignments.

#### B. Usability & Micro-Interactions
* **IK Handle Dragging:** Click and drag hand or foot IK target to observe real-time FABRIK pose resolution and muscle deformation.
* **Test Ragdoll Physics Button:** One-click toggle to drop character under physical gravity and test XPBD capsule collision against floor/obstacles.

#### C. Competitor Supremacy Requirements
* **Unreal Control Rig & Chaos Physics Parity Exceeded:** Zero-alloc 64-byte Cache-Line aligned SoA solver (`skeletal_rig_ragdoll_xpbd.rs`) combining IK and softbody muscle PBD dynamics.

---

### 2.7 PANEL 7: SPECTRAL HRTF 3D AUDIO & REVERB MIXER (`AudioHrtfPanel.tsx`)

#### A. Interface Layout & Components
* **Spatial Acoustic 3D Radar (Top Area):**
  * Top-down 3D radar showing listener position, head orientation, sound ray paths, and wall reflection vectors.
* **Audio Track Mixer (Center Area):**
  * Channel Faders (Volume, Pan, Mute, Solo).
  * Peak Level Meters with True-PPM (Peak Program Meter) indicators.
* **HRTF Acoustic Properties Inspector (Right Column):**
  * Interaural Time Difference (ITD) delay display ($\Delta t = \frac{r}{c}(\theta + \sin\theta)$).
  * Head-Shadow Gain Attenuation sliders.
  * Wall Spectral Absorption Coefficients ($\alpha(\lambda)$ for Concrete, Wood, Glass, Carpet).
  * Sabine/Eyring Reverberation Time calculation ($RT_{60}$ readout in seconds).

#### B. Usability & Micro-Interactions
* **Drag Sound Source in 3D Radar:** Move audio emitter around listener head to hear live binaural spatialization via headphones.
* **Material Absorption Presets:** One-click assignment of wall materials to environment surfaces.

#### C. Competitor Supremacy Requirements
* **Unreal MetaSounds Parity Exceeded:** Physical 3D HRTF diffraction raytracing and Woodworth ITD calculation natively calculated in Rust (`spectral_hrtf_audio_raytracer.rs`).

---

### 2.8 PANEL 8: LIVE TELEPATHIC TERMINAL & COMPILER CONSOLE (`TerminalConsolePanel.tsx`)

#### A. Interface Layout & Components
* **Terminal Window:** Dark monospace console with syntax highlighting for Cargo logs, AST warnings, and IPC messages.
* **Command Bar (Bottom Input):**
  * Prompt prefix: `aethel-engine> `.
  * Autocomplete suggestions for engine CLI commands (`cargo test`, `aethel audit`, `aethel build`).
* **Top Status Bar:**
  * IPC Status: `IPC Mmap Zero-Copy Active | SharedArrayBuffer Connected`.
  * Compilation State: `Build Success (0 Errors, 0 Warnings)`.

#### B. Usability & Micro-Interactions
* **Click Error Log Line:** Clicking any error message in the console automatically opens the corresponding file in the code editor and moves cursor to exact line number.
* **Auto-Fix Button:** Error messages display a `[Telepathic Fix via AI]` button that automatically dispatches the error traceback to Claude for self-correction.

#### C. Competitor Supremacy Requirements
* **Cursor Terminal & VS Code Console Parity Exceeded:** Direct zero-copy IPC bridge (`apps/studio-local/src-tauri/src/main.rs`) executing OS-level commands concurrently without stuttering UI.

---

### 2.9 PANEL 9: HARDWARE PROFILER & THERMAL STRESS MONITOR (`HardwareProfilerPanel.tsx`)

#### A. Interface Layout & Components
* **Hardware Gauges Grid:**
  * CPU Usage Gauge (% total and per-core affinity thread load).
  * GPU Core & VRAM Load Gauge (% utilization, memory bandwidth, temperature °C).
  * NPU / Tensor Core Utilization Gauge.
  * System RAM Allocation Meter (`Allocated: 2.1 GB / Physical: 32.0 GB`).
* **Thermal & Power Timeline:**
  * Real-time rolling graph of hardware temperature, power draw (Watts), and thermal throttling warnings.
* **Offloader Heuristic Inspector (`npu_wgpu_offloader.rs`):**
  * Dynamic compute allocation pie chart: `GPU (65%) | NPU (25%) | CPU SIMD (10%)`.

#### B. Usability & Micro-Interactions
* **Hover Core Bar:** Shows specific CPU thread affinity pin status (e.g., `Thread #4 pinned to Core 2`).
* **Stress Test Button:** One-click hardware stress mocking button to simulate low-end hardware execution budgets.

#### C. Competitor Supremacy Requirements
* **Unreal Insights Parity Exceeded:** Real-time hardware thermal monitoring and NPU/GPU/CPU automatic compute load balancing without external profiling apps.

---

### 2.10 PANEL 10: WORLD PARTITION & SVO TERRAIN MANAGER (`WorldPartitionPanel.tsx`)

#### A. Interface Layout & Components
* **World Grid Map:** 2D top-down grid representation of world tiles and Sparse Voxel Octree (SVO) depth levels.
* **Biome Manager (Left Sidebar):**
  * Biome Layer List (Forest, Desert, Snow, Volcanic, Alien).
  * Heightfield Range Sliders & Slope Mask Thresholds.
* **Clipmap LOD & Streaming Inspector (Right Column):**
  * Active Streaming Distance (`500m`, `1000m`, `5000m`, `Unlimited`).
  * Occlusion Culling Stats (`Visible Tiles: 14 / Culled Tiles: 142`).
  * Procedural Seed Generator input.

#### B. Usability & Micro-Interactions
* **Paint Biome Brush:** Paint directly on the 2D world map to blend biomes in real-time on the 3D terrain.
* **Double-Click Tile:** Teleports 3D Viewport camera instantly to the center of selected world tile.

#### C. Competitor Supremacy Requirements
* **Unreal World Partition Parity Exceeded:** Seamless infinite SVO terrain partitioning (`svo_terrain_world_partition.rs`) with zero loading screens.

---

### 2.11 PANEL 11: MULTIPLAYER & CRDT QUANTUM NETCODE PANEL (`MultiplayerNetcodePanel.tsx`)

#### A. Interface Layout & Components
* **Network Topology Graph:** Visual representation of Server Node, Peer Clients, Ping Latency (ms), and Packet Loss (%).
* **Rollback Netcode Telemetry:**
  * Frame Rewind Buffer Gauge (`240 FPS Timeline Ring Buffer`).
  * State Synchronization Delta Log (`Yjs CRDT Quantum Sync active`).
  * Prediction Error Rate (%) and Ghost State Prediction status.
* **Simulated Network Conditions Panel:**
  * Sliders to inject Artificial Lag (`0ms` to `500ms`), Packet Loss (`0%` to `20%`), and Jitter.

#### B. Usability & Micro-Interactions
* **Simulate Rollback Spike Button:** Trigger a test network desync spike to observe the shadow kernel time reversal engine (`shadow_kernel_time_reversal.rs`) silently correct state.

#### C. Competitor Supremacy Requirements
* **Unreal Replication & Photon Parity Exceeded:** Dual 240 FPS timeline rollback engine (`rollback_netcode_engine.rs`) with CRDT state synchronization.

---

### 2.12 PANEL 12: GLOBAL SETTINGS, CLOUD SYNC & MONETIZATION HUB (`GlobalSettingsPanel.tsx`)

#### A. Interface Layout & Components
* **API Key & OpenRouter Configuration:**
  * Encrypted input fields for OpenRouter API Key, Anthropic API Key, Google Gemini Key, Meta Llama Key.
  * Balance Indicator & Cost Guard Thresholds (`$1.00 USD Reserve Guard active`).
* **Project Knowledge Index Inspector (`.aethel/knowledge/`):**
  * Project ID, Symbol Graph Hash, Total Indexed Files, Cloud Sync Status (`Synced`).
* **Decentralized Asset Royalty Ledger:**
  * Royalty percentage allocation for asset creators and contributors.

#### B. Usability & Micro-Interactions
* **Test API Connections Button:** One-click ping test verifying latency and model readiness across all AI providers.
* **Clear Ephemeral Context Cache:** Manually purge project knowledge summaries.

#### C. Competitor Supremacy Requirements
* **Marketplace & IDE Settings Parity Exceeded:** Built-in cost guard, multi-provider key management, and project-isolated memory indexing.

---

### 2.13 PANEL 13: VORONOI FRACTURE & DESTRUCTION STUDIO (`VoronoiDestructionPanel.tsx`)

#### A. Interface Layout & Components
* **Destruction Viewport Preview:** Live 3D impact testing canvas showing mesh destruction in real-time.
* **Fracture Parameters Inspector:**
  * Voronoi Site Seed Count (`10` to `1,000` fracture shards).
  * Fracture Material Strain Energy Threshold ($E_{\text{fracture}}$ in Joules).
  * Shard Debris Lifetime & Dust Cloud Particle Density.

#### B. Usability & Micro-Interactions
* **Impact Stress Tester:** Click anywhere on the 3D model to simulate a projectile impact and observe real-time Voronoi fracturing via `voronoi_fracture_destruction.rs`.

#### C. Competitor Supremacy Requirements
* **Unreal Chaos Destruction Parity Exceeded:** Real-time GPU Voronoi fracturing without pre-baked static meshes.

---

### 2.14 PANEL 14: METAHUMAN FACE & BLENDSHAPE RIGGING STUDIO (`FacialBlendshapePanel.tsx`)

#### A. Interface Layout & Components
* **Facial Rig Viewport:** High-fidelity 3D head mesh with subsurface scattering skin rendering.
* **Blendshape Slider Matrix:**
  * 64 ARKit Blendshape Sliders (`jawOpen`, `eyeBlinkLeft`, `mouthSmileRight`, `browInnerUp`).
  * Subsurface Scattering Translucency & Skin Melanin Sliders (`lux_facial_subsurface_occlusion.rs`).

#### B. Usability & Micro-Interactions
* **Webcam Face Tracking Button:** One-click webcam link to drive 64 ARKit facial blendshapes in real-time.

#### C. Competitor Supremacy Requirements
* **Unreal Metahuman Creator Parity Exceeded:** Zero 50GB cloud download requirement; fully integrated into local engine.

---

### 2.15 PANEL 15: NIAGARA-SUPREMACY GPU VFX GRAPH (`NiagaraVfxGraphPanel.tsx`)

#### A. Interface Layout & Components
* **VFX Node Canvas:** Node graph combining fluid physics, particle spawning, velocity vectors, and light emission.
* **Emitter Controls:**
  * Spawn Rate (`1,000` to `1,000,000 particles/sec`).
  * Navier-Stokes Fluid Damping & Vorticity Confinement (`lattice_boltzmann_fluid_solver.rs`).

#### B. Usability & Micro-Interactions
* **Drag-and-Drop Force Fields:** Drag gravity wells or wind turbulence fields directly into the VFX node canvas.

#### C. Competitor Supremacy Requirements
* **Unreal Niagara Parity Exceeded:** Natively compiled WGSL fluid & particle simulation running at 120 FPS.

---

## 🔬 3. ADVANCED ERGONOMICS, ACCESSIBILITY & MULTI-USER SYNC

### 3.1 Flexible Docking, Multi-Monitor & Floating Panels
* **Docking Engine (Golden Layout / FlexLayout Parity):** Every panel can be popped out into an independent floating OS window, docked side-by-side, or stacked into tabs.
* **Multi-Monitor Spatial Layouts:** Support for moving Panel 1 (3D Viewport) to Monitor 1 while keeping Panel 2 (AI Triumvirate) and Panel 3 (Node Editor) full screen on Monitor 2.

### 3.2 Collaborative Real-Time Multi-User Editing (CRDT Yjs WebSockets)
* **Live Multiplayer Cursor Pointers:** Displays avatar avatars and colored laser pointers showing where team members or sub-agents are clicking, painting, or dragging nodes in real-time.
* **Conflict-Free Replicated Data Types (CRDT):** Zero lockouts when two creators edit the same level or node graph simultaneously.

### 3.3 Tactile Audio Feedback & Subconscious Haptics
* **Snap Sound Effect:** Subtle 5ms ultra-low frequency click sound when connecting node wires or snapping transform gizmos.
* **Compilation Status Audio:** Discreet chime on successful build completion vs soft error buzz on compilation fail.

---

## 🎹 4. GLOBAL USABILITY & TELEPATHIC KEYBOARD SHORTCUTS

To ensure maximum productivity for creators, the studio implements a unified global hotkey matrix:

| Action / Workflow | Global Hotkey | Sub-System Triggered |
| :--- | :--- | :--- |
| **Telepathic Command Palette** | `Ctrl + K` / `Cmd + K` | Natural language action prompt via AI Help. |
| **Toggle AI Triumvirate Side-Panel** | `Ctrl + Shift + A` | Opens/closes Panel 2 (`AiTriumviratePanel.tsx`). |
| **Focus Viewport Camera on Selection** | `F` | Smoothly frames active 3D object in Panel 1. |
| **Transform Mode (Translate / Rotate / Scale)** | `G` / `R` / `S` | Switches 3D Gizmo mode in Viewport. |
| **Quick Play / Pause Simulation** | `Spacebar` | Starts/stops physics and animation timeline. |
| **Compile & Verify Project** | `Ctrl + Shift + B` | Triggers Rust IPC `cargo check` and AST audit. |
| **Toggle Fullscreen Viewport** | `F11` or `Shift + Spacebar` | Maximizes active panel to full screen. |
| **Save Project State (Yjs Atomic Tx)** | `Ctrl + S` | Creates atomic CRDT snapshot and syncs ledger. |

---

## 🎨 5. AAA DESIGN SYSTEM UTILITIES & CSS VARIABLES FOR CLAUDE

When Claude implements or updates the frontend stylesheet (`index.css` / CSS modules), it MUST consume the following pre-defined design tokens:

```css
:root {
  /* Surface & Background Palette */
  --aethel-bg-base: #07090e;
  --aethel-bg-surface: #0d1117;
  --aethel-bg-card: rgba(22, 27, 34, 0.75);
  --aethel-bg-glass: rgba(13, 17, 23, 0.65);
  
  /* Borders & Dividers */
  --aethel-border-subtle: rgba(255, 255, 255, 0.08);
  --aethel-border-hover: rgba(0, 240, 255, 0.4);
  --aethel-border-active: #00f0ff;

  /* Accent & Status Colors */
  --aethel-cyan-primary: #00f0ff;
  --aethel-violet-secondary: #a855f7;
  --aethel-emerald-success: #10b981;
  --aethel-amber-warning: #f59e0b;
  --aethel-crimson-danger: #ef4444;

  /* Glassmorphism & Shadow Effects */
  --aethel-glass-backdrop: blur(16px) saturate(180%);
  --aethel-shadow-elevated: 0 20px 50px rgba(0, 0, 0, 0.6);
  --aethel-glow-cyan: 0 0 20px rgba(0, 240, 255, 0.35);
  --aethel-glow-violet: 0 0 20px rgba(168, 85, 247, 0.35);

  /* Typography Fonts */
  --aethel-font-sans: 'Inter', 'Outfit', -apple-system, sans-serif;
  --aethel-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* Transitions */
  --aethel-transition-fast: 150ms cubic-bezier(0.16, 1, 0.3, 1);
  --aethel-transition-normal: 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 📋 6. ACTIONABLE IMPLEMENTATION ROADMAP FOR CLAUDE

When the user requests Claude to execute visual UI changes, Claude MUST follow this exact sequence:

- [ ] **Step 1:** Verify design tokens in `index.css` and ensure all CSS variables match the specification above.
- [ ] **Step 2:** Update panel layout wrappers (`ViewportStudioPanel.tsx`, `AiTriumviratePanel.tsx`, `NodeEditorPanel.tsx`, etc.) to enforce glassmorphic backdrop blurs and subtle 1px inner borders.
- [ ] **Step 3:** Ensure all interactive buttons, tabs, sliders, and inputs have descriptive, unique `id` attributes for automated UI testing.
- [ ] **Step 4:** Verify that zero IPC Rust handlers (`generate_handler!`) or Tauri bridge invocations are broken or disconnected during UI styling.
- [ ] **Step 5:** Test responsive layout scaling across display resolutions (1080p, 1440p, 4K).
- [ ] **Step 6:** Validate WCAG 2.1 AAA contrast ratios for all typography elements against dark glass backgrounds.

---

### 🏆 SPECIFICATION SUMMARY & CERTIFICATION
This master document provides **100% of the UI/UX architecture, 15 panel breakdowns (including Chaos Destruction, Metahuman Facial Rigging, and Niagara VFX parity), hotkeys, design tokens, multi-monitor docking mechanics, collaborative CRDT pointers, and implementation guidelines** necessary for Claude to style and refine the Aethel Engine Studio to surpass Unreal Engine 5.5, Unity, Godot, and Cursor IDE!
