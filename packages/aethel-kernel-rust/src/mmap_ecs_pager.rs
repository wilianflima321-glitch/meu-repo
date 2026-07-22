//! File-backed mmap ECS pager — letter **di**.
//!
//! Replaces `println!` + String-path theater. Real `memmap2::MmapMut` map of a
//! WorldHeader + SoA (pos/timescale) region, or fail-closed. Honesty probe
//! `mmap_ecs_pager_ready` / `mmapEcsPagerReady` flips only on map + write +
//! readback soak.
//!
//! **HELD:** mmap/SAB **production** marketing (`mmap_sab_production_ready`)
//! until a production host path is proven. Distinct from dh
//! `worldSoaSabLayoutReady` (heap SAB layout soak).

use std::fs::OpenOptions;
use std::io;
use std::mem::size_of;
use std::path::{Path, PathBuf};

use memmap2::MmapMut;

use crate::wasm_shared_memory_buffer::{
    WorldHeader, WORLD_FLAG_LAYOUT_SEALED, WORLD_HEADER_MAGIC, WORLD_HEADER_VERSION,
};

const SOAK_CAPACITY: usize = 8;
const SOAK_ENTITY_COUNT: usize = 3;

/// File-backed mmap of a WorldHeader + SoA byte region.
pub struct MmapEcsPager {
    path: PathBuf,
    mmap: MmapMut,
    header: WorldHeader,
}

impl MmapEcsPager {
    /// Create/truncate `path`, size to WorldHeader+SoA layout, map with memmap2.
    /// Fail-closed: returns `Err` if create/size/map fails (no theater Self).
    pub fn map_world_soa(path: impl AsRef<Path>, capacity: usize) -> io::Result<Self> {
        let path = path.as_ref().to_path_buf();
        let (header, total) = layout_for_capacity(capacity).ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidInput, "invalid WorldSoA mmap capacity")
        })?;

        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(true)
            .open(&path)?;
        file.set_len(total as u64)?;

        // SAFETY: file is exclusively owned here; length matches `total`.
        let mut mmap = unsafe { MmapMut::map_mut(&file)? };
        if mmap.len() < total {
            return Err(io::Error::new(
                io::ErrorKind::UnexpectedEof,
                "mmap shorter than WorldSoA layout",
            ));
        }

        header.write_le(&mut mmap[..WorldHeader::BYTE_SIZE]);
        // Default timescale column to 1.0.
        for i in 0..capacity {
            write_f32_at(
                &mut mmap,
                header.offset_timescale as usize,
                i,
                1.0,
            );
        }
        mmap.flush()?;

        Ok(Self {
            path,
            mmap,
            header,
        })
    }

    /// Legacy name — real map-or-fail-closed (no println theater).
    /// `size_mb` is ignored for layout; capacity is derived from a small
    /// soak-sized WorldSoA region so callers cannot invent a 50GB claim.
    pub fn initialize_nvme_virtual_memory(
        path: &str,
        _size_mb: u64,
    ) -> Result<Self, io::Error> {
        Self::map_world_soa(path, SOAK_CAPACITY)
    }

    #[inline]
    pub fn path(&self) -> &Path {
        &self.path
    }

    #[inline]
    pub fn capacity_bytes(&self) -> u64 {
        self.header.total_bytes as u64
    }

    #[inline]
    pub fn header(&self) -> &WorldHeader {
        &self.header
    }

    #[inline]
    pub fn as_bytes(&self) -> &[u8] {
        &self.mmap
    }

    pub fn write_entity(
        &mut self,
        index: usize,
        pos_x: f32,
        pos_y: f32,
        pos_z: f32,
        timescale: f32,
    ) -> bool {
        if index >= self.header.entity_capacity as usize {
            return false;
        }
        write_f32_at(
            &mut self.mmap,
            self.header.offset_pos_x as usize,
            index,
            pos_x,
        );
        write_f32_at(
            &mut self.mmap,
            self.header.offset_pos_y as usize,
            index,
            pos_y,
        );
        write_f32_at(
            &mut self.mmap,
            self.header.offset_pos_z as usize,
            index,
            pos_z,
        );
        write_f32_at(
            &mut self.mmap,
            self.header.offset_timescale as usize,
            index,
            timescale,
        );
        let next_count = (index as u32).saturating_add(1);
        if next_count > self.header.entity_count {
            self.header.entity_count = next_count;
        }
        self.header.flags |= WORLD_FLAG_LAYOUT_SEALED;
        self.header
            .write_le(&mut self.mmap[..WorldHeader::BYTE_SIZE]);
        true
    }

    pub fn read_entity(&self, index: usize) -> Option<(f32, f32, f32, f32)> {
        if index >= self.header.entity_count as usize {
            return None;
        }
        Some((
            read_f32_at(&self.mmap, self.header.offset_pos_x as usize, index)?,
            read_f32_at(&self.mmap, self.header.offset_pos_y as usize, index)?,
            read_f32_at(&self.mmap, self.header.offset_pos_z as usize, index)?,
            read_f32_at(&self.mmap, self.header.offset_timescale as usize, index)?,
        ))
    }

    pub fn flush(&mut self) -> io::Result<()> {
        self.mmap.flush()
    }

    /// Re-parse header from the mapped bytes (file-view honesty).
    pub fn header_from_map(&self) -> Option<WorldHeader> {
        WorldHeader::read_le(&self.mmap)
    }
}

fn layout_for_capacity(capacity: usize) -> Option<(WorldHeader, usize)> {
    if capacity == 0 || capacity > u32::MAX as usize {
        return None;
    }
    let col_bytes = capacity
        .checked_mul(size_of::<f32>())?
        .checked_mul(4)?;
    let total = WorldHeader::BYTE_SIZE.checked_add(col_bytes)?;
    if total > u32::MAX as usize {
        return None;
    }

    let mut offset = WorldHeader::BYTE_SIZE as u32;
    let stride = (capacity * size_of::<f32>()) as u32;
    let offset_pos_x = offset;
    offset = offset.checked_add(stride)?;
    let offset_pos_y = offset;
    offset = offset.checked_add(stride)?;
    let offset_pos_z = offset;
    offset = offset.checked_add(stride)?;
    let offset_timescale = offset;

    let header = WorldHeader {
        magic: WORLD_HEADER_MAGIC,
        version: WORLD_HEADER_VERSION,
        entity_capacity: capacity as u32,
        entity_count: 0,
        offset_pos_x,
        offset_pos_y,
        offset_pos_z,
        offset_timescale,
        total_bytes: total as u32,
        flags: 0,
    };
    Some((header, total))
}

#[inline]
fn write_f32_at(buf: &mut [u8], column_base: usize, index: usize, value: f32) {
    let start = column_base + index * size_of::<f32>();
    buf[start..start + 4].copy_from_slice(&value.to_le_bytes());
}

#[inline]
fn read_f32_at(buf: &[u8], column_base: usize, index: usize) -> Option<f32> {
    let start = column_base + index * size_of::<f32>();
    let end = start + 4;
    if end > buf.len() {
        return None;
    }
    Some(f32::from_le_bytes(buf[start..end].try_into().ok()?))
}

/// Prefer E: soak dirs; fall back to system temp if neither exists.
/// Unique filename per call so parallel tests never collide on one map file.
fn soak_temp_path() -> PathBuf {
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static SEQ: AtomicU64 = AtomicU64::new(0);
    let seq = SEQ.fetch_add(1, Ordering::Relaxed);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let name = format!("mmap_ecs_pager_di_soak_{nanos}_{seq}.bin");

    let candidates = [
        PathBuf::from(r"E:\aethel-target-gnu"),
        PathBuf::from(r"E:\Aethel engine"),
    ];
    for dir in &candidates {
        if dir.is_dir() {
            return dir.join(&name);
        }
    }
    std::env::temp_dir().join(name)
}

/// Letter **di** soak report — file-backed mmap ECS pager evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct MmapEcsPagerSoakReport {
    /// Soak-gated; distinct from dh `worldSoaSabLayoutReady`.
    pub mmap_ecs_pager_ready: bool,
    pub mapped: bool,
    pub header_valid: bool,
    pub columns_written: bool,
    pub roundtrip_ok: bool,
    pub flushed: bool,
    pub entity_capacity: u32,
    pub entity_count: u32,
    pub total_bytes: u32,
    pub offset_pos_x: u32,
    pub offset_timescale: u32,
    pub path: String,
    pub distinct_from_world_soa_sab_layout_probe: bool,
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_mut_dna_desktop_probe: bool,
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    /// Production mmap/SAB/COOP host — always false until proven later.
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn pager_held(
    mapped: bool,
    header_valid: bool,
    columns_written: bool,
    roundtrip_ok: bool,
    flushed: bool,
    entity_capacity: u32,
    entity_count: u32,
    total_bytes: u32,
    offset_pos_x: u32,
    offset_timescale: u32,
    path: String,
) -> MmapEcsPagerSoakReport {
    MmapEcsPagerSoakReport {
        mmap_ecs_pager_ready: false,
        mapped,
        header_valid,
        columns_written,
        roundtrip_ok,
        flushed,
        entity_capacity,
        entity_count,
        total_bytes,
        offset_pos_x,
        offset_timescale,
        path,
        distinct_from_world_soa_sab_layout_probe: true,
        distinct_from_desktop_wire_probe: true,
        distinct_from_mut_dna_desktop_probe: true,
        distinct_from_spectral_sonic_desktop_probe: true,
        distinct_from_kernel_foundation_probe: true,
        chaos_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Map a temp file, write WorldHeader + SoA columns, flush, read back.
/// Does **not** claim production mmap/SAB marketing readiness.
pub fn run_mmap_ecs_pager_soak() -> MmapEcsPagerSoakReport {
    let path = soak_temp_path();
    let path_str = path.display().to_string();

    let mut pager = match MmapEcsPager::map_world_soa(&path, SOAK_CAPACITY) {
        Ok(p) => p,
        Err(_) => {
            return pager_held(false, false, false, false, false, 0, 0, 0, 0, 0, path_str);
        }
    };

    let fixtures: [(f32, f32, f32, f32); SOAK_ENTITY_COUNT] = [
        (1.0, 2.0, 3.0, 1.0),
        (4.5, -1.25, 0.5, 0.25),
        (100.0, 200.0, 300.0, 2.0),
    ];
    for (i, (x, y, z, ts)) in fixtures.iter().enumerate() {
        if !pager.write_entity(i, *x, *y, *z, *ts) {
            return pager_held(
                true,
                false,
                false,
                false,
                false,
                SOAK_CAPACITY as u32,
                0,
                pager.header().total_bytes,
                pager.header().offset_pos_x,
                pager.header().offset_timescale,
                path_str,
            );
        }
    }

    let flushed = pager.flush().is_ok();
    if !flushed {
        return pager_held(
            true,
            false,
            true,
            false,
            false,
            SOAK_CAPACITY as u32,
            SOAK_ENTITY_COUNT as u32,
            pager.header().total_bytes,
            pager.header().offset_pos_x,
            pager.header().offset_timescale,
            path_str,
        );
    }

    let Some(parsed) = pager.header_from_map() else {
        return pager_held(
            true,
            false,
            true,
            false,
            true,
            SOAK_CAPACITY as u32,
            SOAK_ENTITY_COUNT as u32,
            pager.header().total_bytes,
            pager.header().offset_pos_x,
            pager.header().offset_timescale,
            path_str,
        );
    };

    let header_valid = parsed.is_valid_layout()
        && parsed.entity_count == SOAK_ENTITY_COUNT as u32
        && (parsed.flags & WORLD_FLAG_LAYOUT_SEALED) != 0
        && parsed.offset_pos_x == pager.header().offset_pos_x
        && parsed.offset_timescale == pager.header().offset_timescale;

    let mut roundtrip_ok = header_valid;
    for (i, expected) in fixtures.iter().enumerate() {
        match pager.read_entity(i) {
            Some(got) => {
                if (got.0 - expected.0).abs() > 1e-6
                    || (got.1 - expected.1).abs() > 1e-6
                    || (got.2 - expected.2).abs() > 1e-6
                    || (got.3 - expected.3).abs() > 1e-6
                {
                    roundtrip_ok = false;
                }
            }
            None => roundtrip_ok = false,
        }
    }

    // File durability honesty: drop map, then re-map (or fs::read fallback) and
    // verify WorldHeader + SoA bytes survived flush. Unique soak paths avoid
    // parallel-test collisions on Windows.
    let total = parsed.total_bytes as usize;
    drop(pager);
    let remap_ok = verify_persisted_world_soa(&path, total, &fixtures);
    if !remap_ok {
        roundtrip_ok = false;
    }

    let _ = std::fs::remove_file(&path);

    let ready = header_valid && roundtrip_ok && flushed;
    let mut report = pager_held(
        true,
        header_valid,
        true,
        roundtrip_ok,
        flushed,
        parsed.entity_capacity,
        parsed.entity_count,
        parsed.total_bytes,
        parsed.offset_pos_x,
        parsed.offset_timescale,
        path_str,
    );
    report.mmap_ecs_pager_ready = ready;
    report.mmap_sab_production_ready = false;
    report
}

fn verify_persisted_world_soa(
    path: &Path,
    total: usize,
    fixtures: &[(f32, f32, f32, f32); SOAK_ENTITY_COUNT],
) -> bool {
    // Prefer a fresh memmap2 map; if the OS still holds the prior mapping handle,
    // fall back to a plain file read (still proves flush durability).
    let bytes = match OpenOptions::new().read(true).write(true).open(path) {
        Ok(file) => match unsafe { MmapMut::map_mut(&file) } {
            Ok(mmap) if mmap.len() >= total => mmap[..total].to_vec(),
            _ => match std::fs::read(path) {
                Ok(b) if b.len() >= total => b,
                _ => return false,
            },
        },
        Err(_) => match std::fs::read(path) {
            Ok(b) if b.len() >= total => b,
            _ => return false,
        },
    };

    let Some(h) = WorldHeader::read_le(&bytes) else {
        return false;
    };
    if !h.is_valid_layout() || h.entity_count != SOAK_ENTITY_COUNT as u32 {
        return false;
    }
    let Some(x0) = read_f32_at(&bytes, h.offset_pos_x as usize, 0) else {
        return false;
    };
    let Some(ts1) = read_f32_at(&bytes, h.offset_timescale as usize, 1) else {
        return false;
    };
    (x0 - fixtures[0].0).abs() <= 1e-6 && (ts1 - fixtures[1].3).abs() <= 1e-6
}

/// Honesty probe — soak-gated `mmap_ecs_pager_ready` (**di**).
pub fn probe_mmap_ecs_pager() -> MmapEcsPagerSoakReport {
    run_mmap_ecs_pager_soak()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::wasm_shared_memory_buffer::probe_world_soa_sab_layout;

    #[test]
    fn map_world_soa_writes_valid_header() {
        let path = soak_temp_path().with_extension("map_test.bin");
        let pager = MmapEcsPager::map_world_soa(&path, 4).expect("map");
        let h = pager.header_from_map().expect("header");
        assert!(h.is_valid_layout());
        assert_eq!(h.magic, WORLD_HEADER_MAGIC);
        assert_eq!(h.entity_capacity, 4);
        assert_eq!(h.offset_pos_x as usize, WorldHeader::BYTE_SIZE);
        drop(pager);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn initialize_nvme_is_map_or_fail_not_theater() {
        let path = soak_temp_path().with_extension("legacy_api.bin");
        let pager = MmapEcsPager::initialize_nvme_virtual_memory(
            path.to_str().expect("utf8 path"),
            64,
        )
        .expect("map");
        assert!(pager.capacity_bytes() > 0);
        assert!(pager.header().is_valid_layout());
        drop(pager);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn mmap_ecs_pager_soak_flips_ready_production_held() {
        let r = probe_mmap_ecs_pager();
        assert!(r.mmap_ecs_pager_ready, "{r:?}");
        assert!(r.mapped);
        assert!(r.header_valid);
        assert!(r.columns_written);
        assert!(r.roundtrip_ok);
        assert!(r.flushed);
        assert_eq!(r.entity_capacity, SOAK_CAPACITY as u32);
        assert_eq!(r.entity_count, SOAK_ENTITY_COUNT as u32);
        assert!(r.offset_pos_x as usize >= WorldHeader::BYTE_SIZE);
        assert!(r.offset_timescale > r.offset_pos_x);
        assert!(r.distinct_from_world_soa_sab_layout_probe);
        assert!(r.distinct_from_desktop_wire_probe);
        assert!(r.distinct_from_mut_dna_desktop_probe);
        assert!(r.distinct_from_spectral_sonic_desktop_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
        assert!(!r.mmap_sab_production_ready);
        assert!(!r.chaos_parity_ready);
        assert!(!r.unreal_mass_100k_ready);
        assert!(!r.avx512_kernel_ready);
        assert!(!r.gr_raymarch_ready);
        assert!(!r.dual_timeline_240_ready);
    }

    #[test]
    fn mmap_ecs_pager_probe_distinct_from_dh_de_df_dg_dc() {
        let mmap = probe_mmap_ecs_pager();
        let sab = probe_world_soa_sab_layout();
        let desk = crate::desktop_soak::probe_kernel_desktop_wire();
        let mut_dna = crate::desktop_soak::probe_kernel_mut_dna_desktop();
        let spectral = crate::desktop_soak::probe_kernel_spectral_sonic_desktop();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(mmap.mmap_ecs_pager_ready);
        assert!(sab.world_soa_sab_layout_ready);
        assert!(desk.kernel_desktop_wire_ready);
        assert!(mut_dna.kernel_mut_dna_desktop_ready);
        assert!(spectral.kernel_spectral_sonic_desktop_ready);
        assert!(found.foundation_closed());

        assert!(mmap.distinct_from_world_soa_sab_layout_probe);
        assert!(mmap.distinct_from_desktop_wire_probe);
        assert!(mmap.distinct_from_mut_dna_desktop_probe);
        assert!(mmap.distinct_from_spectral_sonic_desktop_probe);
        assert!(mmap.distinct_from_kernel_foundation_probe);

        // Distinct report shapes — di does not claim dh heap-layout field names.
        assert!(mmap.mapped && mmap.flushed);
        assert!(sab.buffer_allocated);
        assert!(desk.lbm_stepped);
        assert!(mut_dna.mut_dna_replayed);
        assert!(spectral.timescale_dilated);
        assert!(found.world_soa_ready);
        assert!(!mmap.mmap_sab_production_ready);
        assert!(!sab.mmap_sab_production_ready);
    }
}
