# Aethel Engine — MaterialX Integration Spec (Onda G)

**Version:** 1.0 (Integration Framework)  
**Status:** **Draft** — **Onda G** — Interoperability Core  
**Canonical:** `AETHEL_SUPREMACY_ROADMAP.md`  
**Extends:** PBR Material System (`material-editor-models.ts`)  

---

## Executive mandate

MaterialX represents the industry-standard interchange format for physically based materials, developed by Lucasfilm and ILM. Integrating it ensures that Aethel's procedural materials can traverse seamlessly between Unreal, Maya, Blender, and Aethel, guaranteeing zero vendor lock-in and 100% parity with Hollywood visual standards. 

**Engineering cost vs Wedge:**
- **Phase 1 Strategy:** MaterialX will serve exclusively as an Import/Export translation layer (`.mtlx`) that maps to Aethel's existing internal shader uniform and node-graph models (e.g. `material-editor-models.ts`). We will **not** replace the internal shader execution engine with native MaterialX evaluation on Phase 1, avoiding massive technical debt and API churn.
- **Implementation Mechanism:** The backend `packages/aethel-kernel-rust` will leverage existing Rust crates (e.g. `roxmltree` or a lightweight `mtlx` parser if mature, avoiding heavy C++ FFI bindings unless strictly required) to ingest XML nodes and bridge them to `SceneGraph` PBR fields.

**Zero-MVP:** We don't claim "Full MaterialX Support" until the test suite mathematically verifies that imported GGX roughness, metallic, and base color maps match the Aethel `SceneGraph` struct exactly.

---

## State today (audit — honest)

| Capability | Status | Evidence |
|------------|--------|----------|
| Internal Material PBR Vectors | **REAL** | `ecs_core.rs` (`roughness_x`, `roughness_y`, `metallic`) |
| Anisotropic BRDF Evaluation | **REAL** | `anisotropic_neural_microfacets.rs` O(1) solver |
| Web Material Node Graph | **REAL** | `material-editor-models.ts`, `hair-fur-model.ts` |
| MaterialX Parser (Rust) | **AUSENTE** | No `.mtlx` xml parsing exists |
| MaterialX to ECS Bridge | **AUSENTE** | No `materialx_bridge.rs` module |
| Desktop IPC Export/Import | **AUSENTE** | No Tauri commands to handle `.mtlx` |

**Implementation score today:** ~0/10 for external interchange, ~8/10 for internal PBR representation.

---

## Onda G delivery map

### Pilar M.A — Rust Translation Bridge

| Step | Deliverable | Depends | Ship |
|------|-------------|---------|------|
| **M.1** | **MaterialX XML Parser** — Investigate `roxmltree` vs dedicated `materialx-rs` crate to parse ASWF XML securely and fast in `materialx_bridge.rs`. | N/A | G |
| **M.2** | **MaterialX Graph Mapping** — Extract `standard_surface` nodes to map onto `SceneGraph` fields (`roughness_x`, `metallic`, `emission_r`). | M.1 | G |
| **M.3** | **Export Generation** — Reverse bridge to serialize Aethel materials into valid `.mtlx` ASCII trees for Blender/Maya injection. | M.2 | G |

### Pilar M.B — Web Node Injection

| Step | Deliverable | Depends | Ship |
|------|-------------|---------|------|
| **M.4** | **Material Editor Sync** — Wire the MaterialX Bridge up to the UI (`material-editor-models.ts`) so drag-and-dropping `.mtlx` creates visual nodes instantly. | M.2 | G |

---

## Contracts

Proposed Rust Bridge (`packages/aethel-kernel-rust/src/materialx_bridge.rs`):

```rust
pub struct MaterialXBridge;

pub enum MaterialXParseError {
    InvalidXml,
    MissingStandardSurface,
    UnsupportedNodeGroup,
}

impl MaterialXBridge {
    /// Ingests a .mtlx file and applies standard_surface maps directly to the SceneGraph.
    pub fn ingest_mtlx_to_ecs(payload: &[u8], ecs: &mut SceneGraph, entity_id: usize) -> Result<(), MaterialXParseError>;
    
    /// Serializes an entity's PBR attributes into a .mtlx valid XML payload.
    pub fn export_ecs_to_mtlx(ecs: &SceneGraph, entity_id: usize, buffer: &mut String) -> Result<(), MaterialXParseError>;
}
```

---

## Acceptance and Ship Gates

- **Gate 1 (Import Parity):** Import an official `.mtlx` file from the Academy Software Foundation containing a `standard_surface` material (with BaseColor, Metallic, Roughness). The `SceneGraph` must successfully reflect the parameters precisely (assert `ecs.metallic[id] == parsed_metallic`).
- **Gate 2 (Export Sanity):** Write out a `.mtlx` string from the kernel. Validate that the string contains valid XML headers, `material` tags, and `surfaceshader` links, matching the ASWF schema well enough to be read by Blender.

---

## Known limitations

1. **Procedural Noise Limitation:** Advanced MaterialX procedural noises (Simplex, Worley) imported from other engines cannot be mathematically 1:1 mapped to Aethel's shader uniform blocks immediately. Phase 1 will support baked textures and uniform scalars, but complex node math must fall back or fail gracefully.
2. **C++ FFI Avoidance:** To keep the kernel fully static, secure, and cross-compilable to WebAssembly, we will not dynamically link the official C++ MaterialX library unless absolutely blocked. A pure-Rust XML AST traversal will be used to extract the `standard_surface` data, trading 100% node coverage for speed and safety.
