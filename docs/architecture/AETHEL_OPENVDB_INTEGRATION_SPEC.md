# Aethel Engine — OpenVDB Integration Spec (Onda G)

**Version:** 1.0 (Integration Framework)  
**Status:** **Draft** — **Onda G** — Interoperability Core  
**Canonical:** `AETHEL_SUPREMACY_ROADMAP.md`  
**Extends:** Volumetric Engine (`svo_terrain_world_partition.rs`, `volumetric_extinction_medium.rs`)  

---

## Executive mandate

OpenVDB is the Academy Award-winning volumetric hierarchy format standard from DreamWorks Animation. In order to handle volumetric clouds, fire, and liquid simulations generated externally (e.g., Houdini) or exported from our internal SVO generators, Aethel must support OpenVDB (`.vdb`) natively.

**Engineering cost vs Wedge:**
- **Phase 1 Strategy:** Read and write the raw volumetric grids (Density, Temperature, Velocity). Due to OpenVDB's deep B+ Tree hierarchy (root, internal, leaf), parsing this structure in pure Rust without external libraries is extremely difficult.
- **Implementation Mechanism:** We will utilize an existing Rust OpenVDB parser like `vdb-rs` (if viable) or wrap the official C++ OpenVDB library through a strict FFI boundary. The parsed voxel data will be piped directly into Aethel's native `SceneGraph` volumetric representations (e.g., SVOs or 3D textures).
- **Zero-MVP:** True AAA volumetric parity means accepting sparse inputs dynamically, without unrolling the entire VDB into dense RAM (which would cause OOM errors on large Hollywood assets).

---

## State today (audit — honest)

| Capability | Status | Evidence |
|------------|--------|----------|
| Native Volumetric Rendering | **REAL** | `volumetric_extinction_medium.rs` |
| Native SVO Traversal | **REAL** | `svo_terrain_world_partition.rs`, `svo_depth_lod.rs` |
| Internal Fluid Solvers | **REAL** | `lattice_boltzmann_fluid_solver.rs`, `aerodynamic_navier_stokes.rs` |
| OpenVDB Parser (Rust) | **AUSENTE** | No `.vdb` ingest capability |
| VDB to SVO Bridge | **AUSENTE** | No translation layer |
| Desktop IPC Import/Export | **AUSENTE** | No Tauri commands to stream `.vdb` files |

**Implementation score today:** ~0/10 for external interchange, ~9/10 for internal volumetric rendering.

---

## Onda G delivery map

### Pilar V.A — Rust Translation Bridge

| Step | Deliverable | Depends | Ship |
|------|-------------|---------|------|
| **V.1** | **OpenVDB Crate Validation** — Audit the `vdb-rs` crate (or similar pure-Rust parsers). If incomplete, establish a minimal C++ FFI specifically for extracting LeafNode arrays of `FloatGrid` and `Vec3SGrid`. | N/A | G |
| **V.2** | **VDB to SVO Ingestion** — Map the imported B+ tree onto Aethel's internal Sparse Voxel Octree structure, discarding empty space automatically. | V.1 | G |
| **V.3** | **Export Generation** — Transpile Aethel's Fluid/Smoke simulation states into an OpenVDB hierarchy and serialize to disk. | V.2 | G |

### Pilar V.B — Web Volumetric Inspector

| Step | Deliverable | Depends | Ship |
|------|-------------|---------|------|
| **V.4** | **VDB Dashboard Widget** — Create a React component in the IDE that inspects imported `.vdb` bounding boxes, grid names (`density`, `temperature`), and voxel counts before committing to VRAM. | V.2 | G |

---

## Contracts

Proposed Rust Bridge (`packages/aethel-kernel-rust/src/openvdb_bridge.rs`):

```rust
pub struct OpenVdbBridge;

pub enum OpenVdbParseError {
    InvalidMagic,
    UnsupportedGridType,
    OomProtection,
}

impl OpenVdbBridge {
    /// Ingests a .vdb file and maps its FloatGrid density into the internal SVO system.
    pub fn ingest_vdb_to_svo(payload: &[u8], target_svo: &mut SvoTerrain) -> Result<(), OpenVdbParseError>;
    
    /// Serializes a region of the Aethel SVO into the OpenVDB binary format.
    pub fn export_svo_to_vdb(svo: &SvoTerrain, buffer: &mut Vec<u8>) -> Result<(), OpenVdbParseError>;
}
```

---

## Acceptance and Ship Gates

- **Gate 1 (Import Parity):** Import an industry-standard Disney/Houdini `.vdb` cloud (containing `density` and `temperature` grids). The Aethel `SvoTerrain` must represent the identical bounding box and density values without allocating dense `N x N x N` arrays (preserving memory sparsity).
- **Gate 2 (Export Sanity):** Write an internal smoke simulation state into a `.vdb` blob. Ensure the blob passes validation when opened in Blender's OpenVDB volume object importer, with correct scale and voxel alignment.

---

## Known limitations

1. **C++ FFI Risk:** If pure-Rust libraries fail to support modern OpenVDB compression schemes (Blosc/Zlib), linking the official C++ OpenVDB library will introduce significant build complexity (CMake, Boost, TBB dependencies) which compromises Aethel's fast-build culture. FFI isolation must be strict.
2. **Animation (VDB Sequences):** Phase 1 targets static frame imports. Sequences of VDB files (`frame.001.vdb`) require asynchronous streaming architecture from disk to VRAM, which is deferred to Wave H (Streaming).
