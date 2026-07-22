//! WorldSoA SAB / shared-memory layout — letter **dh**.
//!
//! Replaces pointer-theater (`println`, never init). Real `#[repr(C)]`
//! [`WorldHeader`] + column offset table that can back a SharedArrayBuffer
//! view (WASM/JS host wire is later). Honesty probe
//! `world_soa_sab_layout_ready` / `worldSoaSabLayoutReady` flips only on
//! layout + allocate + column roundtrip soak.
//!
//! **HELD:** mmap/SAB production marketing (`mmap_sab_production_ready`) until
//! real COOP/SAB host proven. Distinct from de/df/dg desktop probes.

use std::mem::size_of;

/// Little-endian ASCII `AETH`.
pub const WORLD_HEADER_MAGIC: u32 = 0x4854_4541;
pub const WORLD_HEADER_VERSION: u32 = 1;
/// Bit0: layout sealed (header + columns written consistently).
pub const WORLD_FLAG_LAYOUT_SEALED: u32 = 1;

const SOAK_CAPACITY: usize = 8;
const SOAK_ENTITY_COUNT: usize = 3;

/// Contiguous SAB-view header (fixed layout, little-endian fields).
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct WorldHeader {
    pub magic: u32,
    pub version: u32,
    pub entity_capacity: u32,
    pub entity_count: u32,
    /// Byte offsets from buffer base for SoA columns (minimum: pos + timescale).
    pub offset_pos_x: u32,
    pub offset_pos_y: u32,
    pub offset_pos_z: u32,
    pub offset_timescale: u32,
    pub total_bytes: u32,
    /// Layout flags only — never claims production SAB/COOP readiness.
    pub flags: u32,
}

/// Column byte offsets derived from / mirrored in [`WorldHeader`].
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ColumnOffsetTable {
    pub pos_x: u32,
    pub pos_y: u32,
    pub pos_z: u32,
    pub timescale: u32,
}

impl WorldHeader {
    pub const BYTE_SIZE: usize = size_of::<Self>();

    #[inline]
    pub fn column_offsets(&self) -> ColumnOffsetTable {
        ColumnOffsetTable {
            pos_x: self.offset_pos_x,
            pos_y: self.offset_pos_y,
            pos_z: self.offset_pos_z,
            timescale: self.offset_timescale,
        }
    }

    pub fn write_le(&self, dst: &mut [u8]) {
        assert!(dst.len() >= Self::BYTE_SIZE);
        let fields = [
            self.magic,
            self.version,
            self.entity_capacity,
            self.entity_count,
            self.offset_pos_x,
            self.offset_pos_y,
            self.offset_pos_z,
            self.offset_timescale,
            self.total_bytes,
            self.flags,
        ];
        for (i, v) in fields.iter().enumerate() {
            let start = i * 4;
            dst[start..start + 4].copy_from_slice(&v.to_le_bytes());
        }
    }

    pub fn read_le(src: &[u8]) -> Option<Self> {
        if src.len() < Self::BYTE_SIZE {
            return None;
        }
        let mut vals = [0u32; 10];
        for (i, slot) in vals.iter_mut().enumerate() {
            let start = i * 4;
            *slot = u32::from_le_bytes(src[start..start + 4].try_into().ok()?);
        }
        Some(Self {
            magic: vals[0],
            version: vals[1],
            entity_capacity: vals[2],
            entity_count: vals[3],
            offset_pos_x: vals[4],
            offset_pos_y: vals[5],
            offset_pos_z: vals[6],
            offset_timescale: vals[7],
            total_bytes: vals[8],
            flags: vals[9],
        })
    }

    pub fn is_valid_layout(&self) -> bool {
        self.magic == WORLD_HEADER_MAGIC
            && self.version == WORLD_HEADER_VERSION
            && self.entity_capacity > 0
            && self.entity_count <= self.entity_capacity
            && self.offset_pos_x as usize >= Self::BYTE_SIZE
            && self.offset_pos_y > self.offset_pos_x
            && self.offset_pos_z > self.offset_pos_y
            && self.offset_timescale > self.offset_pos_z
            && self.total_bytes as usize
                >= self.offset_timescale as usize
                    + self.entity_capacity as usize * size_of::<f32>()
    }
}

/// Owned byte buffer: header + packed SoA columns (pos_x/y/z + timescale).
/// Allocation happens once; hot path mutates columns in place.
pub struct WorldSoaSabBuffer {
    bytes: Vec<u8>,
    header: WorldHeader,
}

impl WorldSoaSabBuffer {
    /// Compute layout offsets and allocate a single contiguous buffer.
    pub fn allocate(capacity: usize) -> Option<Self> {
        if capacity == 0 || capacity > u32::MAX as usize {
            return None;
        }
        let col_bytes = capacity
            .checked_mul(size_of::<f32>())?
            .checked_mul(4)?; // pos_x, pos_y, pos_z, timescale
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

        let mut bytes = vec![0u8; total];
        header.write_le(&mut bytes[..WorldHeader::BYTE_SIZE]);
        // Default timescale column to 1.0 for every slot.
        for i in 0..capacity {
            write_f32_at(&mut bytes, offset_timescale as usize, i, 1.0);
        }

        Some(Self { bytes, header })
    }

    #[inline]
    pub fn as_bytes(&self) -> &[u8] {
        &self.bytes
    }

    #[inline]
    pub fn as_bytes_mut(&mut self) -> &mut [u8] {
        &mut self.bytes
    }

    #[inline]
    pub fn header(&self) -> &WorldHeader {
        &self.header
    }

    #[inline]
    pub fn column_offsets(&self) -> ColumnOffsetTable {
        self.header.column_offsets()
    }

    /// Write pos + timescale at entity index; advances `entity_count` when needed.
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
            &mut self.bytes,
            self.header.offset_pos_x as usize,
            index,
            pos_x,
        );
        write_f32_at(
            &mut self.bytes,
            self.header.offset_pos_y as usize,
            index,
            pos_y,
        );
        write_f32_at(
            &mut self.bytes,
            self.header.offset_pos_z as usize,
            index,
            pos_z,
        );
        write_f32_at(
            &mut self.bytes,
            self.header.offset_timescale as usize,
            index,
            timescale,
        );
        let next_count = (index as u32).saturating_add(1);
        if next_count > self.header.entity_count {
            self.header.entity_count = next_count;
        }
        self.header.flags |= WORLD_FLAG_LAYOUT_SEALED;
        self.header.write_le(&mut self.bytes[..WorldHeader::BYTE_SIZE]);
        true
    }

    pub fn read_entity(&self, index: usize) -> Option<(f32, f32, f32, f32)> {
        if index >= self.header.entity_count as usize {
            return None;
        }
        Some((
            read_f32_at(&self.bytes, self.header.offset_pos_x as usize, index)?,
            read_f32_at(&self.bytes, self.header.offset_pos_y as usize, index)?,
            read_f32_at(&self.bytes, self.header.offset_pos_z as usize, index)?,
            read_f32_at(&self.bytes, self.header.offset_timescale as usize, index)?,
        ))
    }

    /// Re-parse header from the byte buffer (SAB-view honesty).
    pub fn header_from_buffer(&self) -> Option<WorldHeader> {
        WorldHeader::read_le(&self.bytes)
    }
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

/// Letter **dh** soak report — WorldSoA SAB layout evidence.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WorldSoaSabLayoutSoakReport {
    /// Soak-gated; distinct from de/df/dg desktop probes and dc foundation.
    pub world_soa_sab_layout_ready: bool,
    pub header_valid: bool,
    pub buffer_allocated: bool,
    pub columns_written: bool,
    pub roundtrip_ok: bool,
    pub entity_capacity: u32,
    pub entity_count: u32,
    pub total_bytes: u32,
    pub offset_pos_x: u32,
    pub offset_timescale: u32,
    /// Always true — not de/df/dg/dc probes.
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

fn sab_held(
    header_valid: bool,
    buffer_allocated: bool,
    columns_written: bool,
    roundtrip_ok: bool,
    entity_capacity: u32,
    entity_count: u32,
    total_bytes: u32,
    offset_pos_x: u32,
    offset_timescale: u32,
) -> WorldSoaSabLayoutSoakReport {
    WorldSoaSabLayoutSoakReport {
        world_soa_sab_layout_ready: false,
        header_valid,
        buffer_allocated,
        columns_written,
        roundtrip_ok,
        entity_capacity,
        entity_count,
        total_bytes,
        offset_pos_x,
        offset_timescale,
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

/// Allocate once, write header + SoA columns (pos + timescale), read back.
/// Does **not** claim production SharedArrayBuffer / COOP host readiness.
pub fn run_world_soa_sab_layout_soak() -> WorldSoaSabLayoutSoakReport {
    let Some(mut buf) = WorldSoaSabBuffer::allocate(SOAK_CAPACITY) else {
        return sab_held(false, false, false, false, 0, 0, 0, 0, 0);
    };

    let fixtures: [(f32, f32, f32, f32); SOAK_ENTITY_COUNT] = [
        (1.0, 2.0, 3.0, 1.0),
        (4.5, -1.25, 0.5, 0.25),
        (100.0, 200.0, 300.0, 2.0),
    ];
    for (i, (x, y, z, ts)) in fixtures.iter().enumerate() {
        if !buf.write_entity(i, *x, *y, *z, *ts) {
            return sab_held(
                false,
                true,
                false,
                false,
                SOAK_CAPACITY as u32,
                0,
                buf.header().total_bytes,
                buf.header().offset_pos_x,
                buf.header().offset_timescale,
            );
        }
    }

    let Some(parsed) = buf.header_from_buffer() else {
        return sab_held(
            false,
            true,
            true,
            false,
            SOAK_CAPACITY as u32,
            SOAK_ENTITY_COUNT as u32,
            buf.header().total_bytes,
            buf.header().offset_pos_x,
            buf.header().offset_timescale,
        );
    };
    let header_valid = parsed.is_valid_layout()
        && parsed.entity_count == SOAK_ENTITY_COUNT as u32
        && (parsed.flags & WORLD_FLAG_LAYOUT_SEALED) != 0
        && parsed.offset_pos_x == buf.header().offset_pos_x
        && parsed.offset_timescale == buf.header().offset_timescale;

    let mut roundtrip_ok = header_valid;
    for (i, expected) in fixtures.iter().enumerate() {
        match buf.read_entity(i) {
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

    // Cross-check column reads via offsets table (SAB-view path).
    let offs = parsed.column_offsets();
    if let Some(x0) = read_f32_at(buf.as_bytes(), offs.pos_x as usize, 0) {
        if (x0 - fixtures[0].0).abs() > 1e-6 {
            roundtrip_ok = false;
        }
    } else {
        roundtrip_ok = false;
    }
    if let Some(ts1) = read_f32_at(buf.as_bytes(), offs.timescale as usize, 1) {
        if (ts1 - fixtures[1].3).abs() > 1e-6 {
            roundtrip_ok = false;
        }
    } else {
        roundtrip_ok = false;
    }

    let ready = header_valid && roundtrip_ok;
    let mut report = sab_held(
        header_valid,
        true,
        true,
        roundtrip_ok,
        parsed.entity_capacity,
        parsed.entity_count,
        parsed.total_bytes,
        parsed.offset_pos_x,
        parsed.offset_timescale,
    );
    report.world_soa_sab_layout_ready = ready;
    // Explicit: layout soak ≠ production mmap/SAB marketing.
    report.mmap_sab_production_ready = false;
    report
}

/// Honesty probe — soak-gated `world_soa_sab_layout_ready` (**dh**).
pub fn probe_world_soa_sab_layout() -> WorldSoaSabLayoutSoakReport {
    run_world_soa_sab_layout_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn world_header_repr_c_size_is_40() {
        assert_eq!(WorldHeader::BYTE_SIZE, 40);
        assert_eq!(size_of::<ColumnOffsetTable>(), 16);
    }

    #[test]
    fn allocate_writes_valid_header_and_offsets() {
        let buf = WorldSoaSabBuffer::allocate(4).expect("alloc");
        let h = buf.header_from_buffer().expect("header");
        assert!(h.is_valid_layout());
        assert_eq!(h.magic, WORLD_HEADER_MAGIC);
        assert_eq!(h.entity_capacity, 4);
        assert_eq!(h.offset_pos_x as usize, WorldHeader::BYTE_SIZE);
        assert!(h.offset_timescale > h.offset_pos_z);
        assert_eq!(
            h.total_bytes as usize,
            WorldHeader::BYTE_SIZE + 4 * 4 * size_of::<f32>()
        );
    }

    #[test]
    fn sab_layout_soak_flips_ready_production_held() {
        let r = probe_world_soa_sab_layout();
        assert!(r.world_soa_sab_layout_ready, "{r:?}");
        assert!(r.header_valid);
        assert!(r.buffer_allocated);
        assert!(r.columns_written);
        assert!(r.roundtrip_ok);
        assert_eq!(r.entity_capacity, SOAK_CAPACITY as u32);
        assert_eq!(r.entity_count, SOAK_ENTITY_COUNT as u32);
        assert!(r.offset_pos_x as usize >= WorldHeader::BYTE_SIZE);
        assert!(r.offset_timescale > r.offset_pos_x);
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
    fn sab_layout_probe_distinct_from_de_df_dg_dc() {
        let sab = probe_world_soa_sab_layout();
        let desk = crate::desktop_soak::probe_kernel_desktop_wire();
        let mut_dna = crate::desktop_soak::probe_kernel_mut_dna_desktop();
        let spectral = crate::desktop_soak::probe_kernel_spectral_sonic_desktop();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(sab.world_soa_sab_layout_ready);
        assert!(desk.kernel_desktop_wire_ready);
        assert!(mut_dna.kernel_mut_dna_desktop_ready);
        assert!(spectral.kernel_spectral_sonic_desktop_ready);
        assert!(found.foundation_closed());

        assert!(sab.distinct_from_desktop_wire_probe);
        assert!(sab.distinct_from_mut_dna_desktop_probe);
        assert!(sab.distinct_from_spectral_sonic_desktop_probe);
        assert!(sab.distinct_from_kernel_foundation_probe);

        // Distinct report shapes — dh does not claim de/df/dg ready fields.
        assert!(sab.roundtrip_ok);
        assert!(desk.lbm_stepped);
        assert!(mut_dna.mut_dna_replayed);
        assert!(spectral.timescale_dilated);
        assert!(found.world_soa_ready);
        assert!(!sab.mmap_sab_production_ready);
    }
}
