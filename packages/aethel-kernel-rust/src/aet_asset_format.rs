//! F4 — Aet Asset Format (Armadura Pesada, "Formato .aet"). letter **kp**.
//!
//! Formato binário proprietário de asset que espelha o layout RAM das
//! structs do kernel: colunas SoA de f32 little-endian, arena de blobs
//! (nomes/strings) e offsets RELATIVOS à base do buffer — carregar um .aet
//! é um mmap cru zero-copy, sem relocação em runtime (Law XV / doctrine #73).
//!
//! Fail-closed: toda leitura valida limites e magic; um buffer truncado ou
//! corrompido devolve None — nunca panica nem lê fora do mapeamento.
//!
//! Soak determinístico: mesma seed reproduz os bytes exatos; seeds distintas
//! divergem (resíduo de asset).
use serde::{Deserialize, Serialize};

/// Stable evidence tag — distinct from every sibling kernel (letter **kp**).
pub const AET_ASSET_EVIDENCE_KIND: &str = "aet_asset_format";
/// Magic de arquivo (u64 LE): "AETHEL01".
pub const AET_MAGIC: u64 = 0x4145_5448_454C_3031;
/// Versão do formato .aet.
pub const AET_VERSION: u32 = 1;
/// Layout SoA (0) é o único suportado nesta versão.
pub const LAYOUT_SOA: u32 = 0;
/// Número de colunas SoA por asset (espelha WorldSoA + massa/saúde).
pub const COLUMN_COUNT: usize = 8;
/// Bytes por elemento de coluna (f32 LE).
pub const STRIDE_BYTES: usize = 4;
/// Máximo de entidades suportado.
pub const MAX_ENTITIES: usize = 4096;
/// Tamanho fixo do header .aet (96 bytes — múltiplo de 4).
pub const HEADER_BYTES: usize = 96;
/// Capacidade padrão de um asset construído pelo builder.
pub const DEFAULT_CAPACITY: usize = 256;
/// Capacidade da arena de blobs (nomes/strings) em bytes.
pub const BLOB_CAP: usize = 4096;
/// Orçamento do hot path de probe (nanos).
pub const AET_HOT_BUDGET_NANOS: u64 = 1_000_000;
/// Endereçamento de colunas por índice semântico (0..COLUMN_COUNT).
pub mod col {
    /// Posição X.
    pub const POS_X: usize = 0;
    /// Posição Y.
    pub const POS_Y: usize = 1;
    /// Posição Z.
    pub const POS_Z: usize = 2;
    /// Velocidade X.
    pub const VEL_X: usize = 3;
    /// Velocidade Y.
    pub const VEL_Y: usize = 4;
    /// Velocidade Z.
    pub const VEL_Z: usize = 5;
    /// Massa (kg).
    pub const MASS: usize = 6;
    /// Saúde (0..1).
    pub const HEALTH: usize = 7;
}

/// Cabeçalho fixo do .aet (96 bytes). Campos em little-endian.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AetHeader {
    pub magic: u64,
    pub version: u32,
    pub header_size: u32,
    pub layout_kind: u32,
    pub endian: u32,
    pub entity_count: u32,
    pub entity_capacity: u32,
    pub stride: u32,
    pub columns: u32,
    pub columns_offset: u32,
    pub data_offset: u32,
    pub blob_offset: u32,
    pub blob_len: u32,
    pub flags: u32,
    pub reserved: [u32; 9],
}
impl AetHeader {
    /// Header vazio (todos os campos zero) — estado inicial.
    pub const fn empty() -> Self {
        Self {
            magic: 0,
            version: 0,
            header_size: 0,
            layout_kind: 0,
            endian: 0,
            entity_count: 0,
            entity_capacity: 0,
            stride: 0,
            columns: 0,
            columns_offset: 0,
            data_offset: 0,
            blob_offset: 0,
            blob_len: 0,
            flags: 0,
            reserved: [0; 9],
        }
    }

    /// True quando o header carrega magic, versão e tamanho canônicos.
    pub fn is_valid(self) -> bool {
        self.magic == AET_MAGIC
            && self.version == AET_VERSION
            && self.header_size == HEADER_BYTES as u32
            && self.layout_kind == LAYOUT_SOA
            && self.columns == COLUMN_COUNT as u32
            && self.stride == STRIDE_BYTES as u32
            && (self.entity_capacity as usize) <= MAX_ENTITIES
            && self.entity_count <= self.entity_capacity
    }
    /// Serializa o header em little-endian dentro de `dst` (fail-closed).
    pub fn write_le(&self, dst: &mut [u8]) {
        put_u64(dst, 0, self.magic);
        put_u32(dst, 8, self.version);
        put_u32(dst, 12, self.header_size);
        put_u32(dst, 16, self.layout_kind);
        put_u32(dst, 20, self.endian);
        put_u32(dst, 24, self.entity_count);
        put_u32(dst, 28, self.entity_capacity);
        put_u32(dst, 32, self.stride);
        put_u32(dst, 36, self.columns);
        put_u32(dst, 40, self.columns_offset);
        put_u32(dst, 44, self.data_offset);
        put_u32(dst, 48, self.blob_offset);
        put_u32(dst, 52, self.blob_len);
        put_u32(dst, 56, self.flags);
        for (i, r) in self.reserved.iter().enumerate() {
            put_u32(dst, 60 + i * 4, *r);
        }
    }
}
fn put_u64(dst: &mut [u8], off: usize, v: u64) {
    let b = v.to_le_bytes();
    if off + b.len() <= dst.len() {
        dst[off..off + b.len()].copy_from_slice(&b);
    }
}
fn put_u32(dst: &mut [u8], off: usize, v: u32) {
    let b = v.to_le_bytes();
    if off + b.len() <= dst.len() {
        dst[off..off + b.len()].copy_from_slice(&b);
    }
}
fn get_u64(src: &[u8], off: usize) -> Option<u64> {
    let end = off.checked_add(8)?;
    let slice = src.get(off..end)?;
    Some(u64::from_le_bytes(slice.try_into().ok()?))
}
fn get_u32(src: &[u8], off: usize) -> Option<u32> {
    let end = off.checked_add(4)?;
    let slice = src.get(off..end)?;
    Some(u32::from_le_bytes(slice.try_into().ok()?))
}
fn get_f32(src: &[u8], off: usize) -> Option<f32> {
    let end = off.checked_add(4)?;
    let slice = src.get(off..end)?;
    Some(f32::from_le_bytes(slice.try_into().ok()?))
}
impl AetHeader {
    /// Desserializa o header .aet de um mapeamento (fail-closed).
    pub fn read_le(src: &[u8]) -> Option<Self> {
        let mut r = [0u32; 9];
        for (i, slot) in r.iter_mut().enumerate() {
            *slot = get_u32(src, 60 + i * 4)?;
        }
        let header = Self {
            magic: get_u64(src, 0)?,
            version: get_u32(src, 8)?,
            header_size: get_u32(src, 12)?,
            layout_kind: get_u32(src, 16)?,
            endian: get_u32(src, 20)?,
            entity_count: get_u32(src, 24)?,
            entity_capacity: get_u32(src, 28)?,
            stride: get_u32(src, 32)?,
            columns: get_u32(src, 36)?,
            columns_offset: get_u32(src, 40)?,
            data_offset: get_u32(src, 44)?,
            reserved: r,
            blob_offset: get_u32(src, 48)?,
            blob_len: get_u32(src, 52)?,
            flags: get_u32(src, 56)?,
        };
        if header.is_valid() {
            Some(header)
        } else {
            None
        }
    }
}
/// View zero-copy sobre bytes .aet (típica de um mmap cru).
///
/// Toda leitura valida limites; buffers truncados ou corrompidos fazem o
/// construtor devolver None — o kernel nunca panica com asset inválido.
pub struct AetAssetView<'a> {
    bytes: &'a [u8],
    header: AetHeader,
}

impl<'a> AetAssetView<'a> {
    /// Abre uma view sobre um mapeamento .aet (fail-closed).
    pub fn new(bytes: &'a [u8]) -> Option<Self> {
        let header = AetHeader::read_le(bytes)?;
        let capacity = header.entity_capacity as usize;
        let data_len = capacity.checked_mul(COLUMN_COUNT)?.checked_mul(STRIDE_BYTES)?;
        let data_base = header.data_offset as usize;
        let blob_off = header.blob_offset as usize;
        let blob_end = blob_off.checked_add(header.blob_len as usize)?;
        if data_base.checked_add(data_len)? > bytes.len() {
            return None;
        }
        if blob_end > bytes.len() {
            return None;
        }
        Some(Self { bytes, header })
    }

    /// Header validado da view.
    pub fn header(&self) -> AetHeader {
        self.header
    }

    /// True enquanto o mapeamento permanece válido e coerente.
    pub fn is_valid(&self) -> bool {
        self.header.is_valid()
    }

    /// Quantidade de entidades gravadas no asset.
    pub fn entity_count(&self) -> usize {
        self.header.entity_count as usize
    }

    /// Capacidade (máximo de entidades) do asset.
    pub fn entity_capacity(&self) -> usize {
        self.header.entity_capacity as usize
    }
}
impl<'a> AetAssetView<'a> {
    /// Tabela de offsets absolutos-por-base de cada coluna (fail-closed).
    pub fn column_table(&self) -> Option<[u32; COLUMN_COUNT]> {
        let mut table = [0u32; COLUMN_COUNT];
        for (i, slot) in table.iter_mut().enumerate() {
            *slot = get_u32(self.bytes, HEADER_BYTES + i * 4)?;
        }
        Some(table)
    }

    /// Offset relativo-à-base da coluna `column` (fail-closed).
    pub fn column_base(&self, column: usize) -> Option<usize> {
        if column >= COLUMN_COUNT {
            return None;
        }
        let cap = self.entity_capacity();
        (self.header.data_offset as usize)
            .checked_add(column.checked_mul(cap)?.checked_mul(STRIDE_BYTES)?)
    }
}
impl<'a> AetAssetView<'a> {
    /// Slice cru da arena de blobs.
    pub fn blob(&self) -> &'a [u8] {
        let off = self.header.blob_offset as usize;
        let end = off + self.header.blob_len as usize;
        self.bytes.get(off..end).unwrap_or(&[])
    }

    /// Arena de blobs interpretada como UTF-8 (fail-closed).
    pub fn blob_str(&self) -> Option<&'a str> {
        std::str::from_utf8(self.blob()).ok()
    }

    /// Slice da coluna `column` com as entidades gravadas.
    pub fn column_slice(&self, column: usize) -> Option<&'a [u8]> {
        if column >= COLUMN_COUNT {
            return None;
        }
        let count = self.entity_count();
        let len = count.checked_mul(STRIDE_BYTES)?;
        let base = self.column_base(column)?;
        let end = base.checked_add(len)?;
        if end > self.bytes.len() {
            return None;
        }
        Some(&self.bytes[base..end])
    }
}
impl<'a> AetAssetView<'a> {
    /// Lê um f32 da coluna (fail-closed: bounds + coluna inválida).
    pub fn read_f32(&self, column: usize, index: usize) -> Option<f32> {
        if column >= COLUMN_COUNT {
            return None;
        }
        if index >= self.entity_count() {
            return None;
        }
        let base = self.column_base(column)?;
        get_f32(self.bytes, base.checked_add(index.checked_mul(STRIDE_BYTES)?)?)
    }

    /// Lê a posição (x, y, z) da entidade.
    pub fn read_position(&self, index: usize) -> Option<[f32; 3]> {
        let x = self.read_f32(col::POS_X, index)?;
        let y = self.read_f32(col::POS_Y, index)?;
        let z = self.read_f32(col::POS_Z, index)?;
        Some([x, y, z])
    }
}
/// Builder determinístico do .aet — header + tabela + colunas + blobs.
pub struct AetAssetBuilder {
    bytes: Vec<u8>,
    header: AetHeader,
    capacity: usize,
    blob_cursor: usize,
}

impl AetAssetBuilder {
    /// Cria um asset com `capacity` entidades (clamp 1..=MAX_ENTITIES).
    pub fn new(capacity: usize) -> Self {
        let capacity = capacity.clamp(1, MAX_ENTITIES);
        let data_base = HEADER_BYTES + COLUMN_COUNT * 4;
        let data_len = capacity * COLUMN_COUNT * STRIDE_BYTES;
        let blob_base = data_base + data_len;
        let bytes = vec![0u8; blob_base + BLOB_CAP];
        let mut header = AetHeader::empty();
        header.magic = AET_MAGIC;
        header.version = AET_VERSION;
        header.header_size = HEADER_BYTES as u32;
        header.layout_kind = LAYOUT_SOA;
        header.endian = 0x0403_0201;
        header.entity_capacity = capacity as u32;
        header.stride = STRIDE_BYTES as u32;
        header.columns = COLUMN_COUNT as u32;
        header.columns_offset = HEADER_BYTES as u32;
        header.data_offset = data_base as u32;
        header.blob_offset = blob_base as u32;
        let mut b = Self {
            bytes,
            header,
            capacity,
            blob_cursor: 0,
        };
        b.write_header();
        b.write_column_table();
        b
    }

    fn write_header(&mut self) {
        self.header.write_le(&mut self.bytes);
    }

    fn write_column_table(&mut self) {
        for c in 0..COLUMN_COUNT {
            let off = self.column_offset(c);
            put_u32(&mut self.bytes, HEADER_BYTES + c * 4, off as u32);
        }
    }

    /// Offset relativo-à-base da coluna `column` (layout SoA fixo).
    fn column_offset(&self, column: usize) -> usize {
        let data_base = HEADER_BYTES + COLUMN_COUNT * 4;
        data_base + column * self.capacity * STRIDE_BYTES
    }

    /// Capacidade do asset.
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Bytes brutos do asset (pré-seal: header + tabela + colunas + blobs).
    pub fn bytes(&self) -> &[u8] {
        &self.bytes
    }
}
impl AetAssetBuilder {
    /// Grava um f32 LE na coluna (fail-closed: false fora dos limites).
    pub fn set_column_f32(&mut self, column: usize, index: usize, value: f32) -> bool {
        if column >= COLUMN_COUNT {
            return false;
        }
        if index >= self.capacity {
            return false;
        }
        let off = self.column_offset(column) + index * STRIDE_BYTES;
        if off + STRIDE_BYTES <= self.bytes.len() {
            put_u32(&mut self.bytes, off, value.to_bits());
            true
        } else {
            false
        }
    }

    /// Registra uma entidade (até a capacidade).
    pub fn add_entity(&mut self) -> bool {
        if (self.header.entity_count as usize) < self.capacity {
            self.header.entity_count += 1;
            true
        } else {
            false
        }
    }

    /// Quantidade de entidades registradas até o momento.
    pub fn entity_count(&self) -> usize {
        self.header.entity_count as usize
    }

    /// Bytes de blob gravados até o momento.
    pub fn blob_len(&self) -> usize {
        self.blob_cursor
    }

    /// Grava um blob na arena; devolve (offset relativo, len) — fail-closed.
    pub fn add_blob(&mut self, data: &[u8]) -> Option<(u32, u32)> {
        if self.blob_cursor + data.len() > BLOB_CAP {
            return None;
        }
        let rel = self.blob_cursor;
        let dst = self.header.blob_offset as usize + rel;
        self.bytes[dst..dst + data.len()].copy_from_slice(data);
        self.blob_cursor += data.len();
        Some((rel as u32, data.len() as u32))
    }
}
impl AetAssetBuilder {
    /// Finaliza o asset: grava entity_count e blob_len e devolve os bytes.
    pub fn seal(mut self) -> Vec<u8> {
        self.header.blob_len = self.blob_cursor as u32;
        put_u32(&mut self.bytes, 24, self.header.entity_count);
        put_u32(&mut self.bytes, 52, self.header.blob_len);
        self.bytes
    }
}

/// Resíduo de ambiente do .aet — deriva do seed, sempre dentro do domínio.
pub fn aet_environment_residue(seed: u64) -> u64 {
    (1u64 << (48 + (seed & 7)))
        | (seed.wrapping_mul(0x9E37_79B9_7F4A_7C15) & 0x0000_00FF_0000_0000)
}
/// Fixture determinística de entidades + blobs para o soak.
pub struct AetAssetFixture {
    pub positions: Vec<[f32; 3]>,
    pub velocities: Vec<[f32; 3]>,
    pub mass: Vec<f32>,
    pub health: Vec<f32>,
    pub names: Vec<String>,
}

/// Escala quantizada [0,1] determinística por (seed, índice).
pub fn quant_f32_scale(seed: u64, i: usize) -> f32 {
    let r = xorshift64(seed ^ (i as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15));
    (r & 0xFFFF) as f32 / 65535.0
}

/// Constrói a fixture completa (posições, velocidades, massa, saúde, nomes).
pub fn build_aet_fixture(seed: u64, count: usize) -> AetAssetFixture {
    let mut f = AetAssetFixture {
        positions: Vec::with_capacity(count),
        velocities: Vec::with_capacity(count),
        mass: Vec::with_capacity(count),
        health: Vec::with_capacity(count),
        names: Vec::with_capacity(count),
    };
    for i in 0..count {
        f.positions.push([
            quant_f32_scale(seed, i * 5),
            quant_f32_scale(seed, i * 5 + 1),
            quant_f32_scale(seed, i * 5 + 2),
        ]);
        f.velocities.push([
            quant_f32_scale(seed, i * 5 + 100),
            quant_f32_scale(seed, i * 5 + 101),
            quant_f32_scale(seed, i * 5 + 102),
        ]);
        f.mass.push(quant_f32_scale(seed, i * 5 + 200) * 100.0 + 1.0);
        f.health.push(quant_f32_scale(seed, i * 5 + 300));
        f.names.push(format!("entity_{i:04}_seed_{seed}"));
    }
    f
}
/// Resultado da leitura de um asset para comparação bit-exact.
pub struct AetAssetOutcome {
    pub positions: Vec<[f32; 3]>,
    pub health: Vec<f32>,
    pub blob_str: String,
    pub bytes_written: usize,
}

/// Lê um buffer .aet e extrai o outcome (fail-closed).
pub fn build_aet_outcome(fixture: &AetAssetFixture, buffer: &[u8]) -> Option<AetAssetOutcome> {
    let view = AetAssetView::new(buffer)?;
    let n = fixture.positions.len();
    if view.entity_count() != n {
        return None;
    }
    let mut positions = Vec::with_capacity(n);
    let mut health = Vec::with_capacity(n);
    for i in 0..n {
        positions.push(view.read_position(i)?);
        health.push(view.read_f32(col::HEALTH, i)?);
    }
    let blob_str = view.blob_str()?.to_string();
    Some(AetAssetOutcome {
        positions,
        health,
        blob_str,
        bytes_written: buffer.len(),
    })
}/// Comparação bit-exact entre fixture e outcome lido.
pub fn values_match(fixture: &AetAssetFixture, outcome: &AetAssetOutcome) -> bool {
    if fixture.positions.len() != outcome.positions.len() {
        return false;
    }
    for (a, b) in fixture.positions.iter().zip(outcome.positions.iter()) {
        if a[0].to_bits() != b[0].to_bits()
            || a[1].to_bits() != b[1].to_bits()
            || a[2].to_bits() != b[2].to_bits()
        {
            return false;
        }
    }
    fixture
        .health
        .iter()
        .zip(outcome.health.iter())
        .all(|(a, b)| a.to_bits() == b.to_bits())
}
/// Relatório do soak do formato .aet (serde camelCase).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AetAssetReport {
    pub seed: u64,
    pub entities_written: usize,
    pub blob_used: usize,
    pub payload_bytes: usize,
    pub bytes_written: usize,
    pub aa_header_valid: bool,
    pub aa_value_roundtrip: bool,
    pub aa_blob_roundtrip: bool,
    pub aa_relocation_base_independent: bool,
    pub aa_fail_closed: bool,
    pub aa_deterministic: bool,
    pub aa_arena_within_budget: bool,
    pub ready: bool,
    pub fingerprint: u64,
}

impl AetAssetReport {
    /// Todos os campos dentro dos limites físicos do formato.
    pub fn is_finite(&self) -> bool {
        self.entities_written <= MAX_ENTITIES
            && self.blob_used <= BLOB_CAP
            && self.payload_bytes <= self.bytes_written
            && self.bytes_written
                <= MAX_ENTITIES * COLUMN_COUNT * STRIDE_BYTES + BLOB_CAP + HEADER_BYTES
    }
}
/// Report HELLD (fail-closed): nenhum invariante AAA é afirmado.
pub fn aet_held_report(seed: u64) -> AetAssetReport {
    AetAssetReport {
        seed,
        entities_written: 0,
        blob_used: 0,
        payload_bytes: 0,
        bytes_written: 0,
        aa_header_valid: false,
        aa_value_roundtrip: false,
        aa_blob_roundtrip: false,
        aa_relocation_base_independent: false,
        aa_fail_closed: false,
        aa_deterministic: false,
        aa_arena_within_budget: false,
        ready: false,
        fingerprint: 0xDEAD_BEEF_0000_0004,
    }
}

pub fn hash_mix(mut h: u64, x: u64) -> u64 {
    h = h.rotate_left(5) ^ x;
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= h >> 29;
    h
}
/// Quantiza um f32 em u64 (bits exatos).
pub fn quant_f32(v: f32) -> u64 {
    v.to_bits() as u64
}

pub fn xorshift64(mut x: u64) -> u64 {
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

/// Fingerprint determinístico de evidência (distinto por seed e invariantes).
pub fn aet_evidence_fingerprint(r: &AetAssetReport) -> u64 {
    let mut h = 0xDEAD_BEEF_0000_0004;
    h = hash_mix(h, r.seed);
    h = hash_mix(h, r.entities_written as u64);
    h = hash_mix(h, r.blob_used as u64);
    h = hash_mix(h, r.payload_bytes as u64);
    h = hash_mix(h, r.bytes_written as u64);
    h = hash_mix(h, u64::from(r.aa_header_valid));
    h = hash_mix(h, u64::from(r.aa_value_roundtrip));
    h = hash_mix(h, u64::from(r.aa_blob_roundtrip));
    h = hash_mix(h, u64::from(r.aa_relocation_base_independent));
    h = hash_mix(h, u64::from(r.aa_fail_closed));
    h = hash_mix(h, u64::from(r.aa_deterministic));
    h = hash_mix(h, u64::from(r.aa_arena_within_budget));
    h
}/// Soak determinístico do formato .aet (7 invariantes AAA, fail-closed).
pub fn run_aet_asset_soak(seed: u64) -> AetAssetReport {
    const SOAK_ENTITIES: usize = 512;
    let fixture = build_aet_fixture(seed, SOAK_ENTITIES);

    fn build_bytes(fixture: &AetAssetFixture, names: &mut String) -> (Vec<u8>, usize) {
        let mut b = AetAssetBuilder::new(fixture.positions.len());
        for i in 0..fixture.positions.len() {
            let _ = b.add_entity();
            let _ = b.set_column_f32(col::POS_X, i, fixture.positions[i][0]);
            let _ = b.set_column_f32(col::POS_Y, i, fixture.positions[i][1]);
            let _ = b.set_column_f32(col::POS_Z, i, fixture.positions[i][2]);
            let _ = b.set_column_f32(col::VEL_X, i, fixture.velocities[i][0]);
            let _ = b.set_column_f32(col::VEL_Y, i, fixture.velocities[i][1]);
            let _ = b.set_column_f32(col::VEL_Z, i, fixture.velocities[i][2]);
            let _ = b.set_column_f32(col::MASS, i, fixture.mass[i]);
            let _ = b.set_column_f32(col::HEALTH, i, fixture.health[i]);
            if b.add_blob(fixture.names[i].as_bytes()).is_some() {
                names.push_str(&fixture.names[i]);
            }
        }
        let blob_used = b.blob_len();
        let bytes = b.seal();
        (bytes, blob_used)
    }

    let mut payload_a = String::new();
    let (buffer, blob_used) = build_bytes(&fixture, &mut payload_a);
    let payload_bytes = blob_used + SOAK_ENTITIES * COLUMN_COUNT * STRIDE_BYTES;
    let mut shifted = vec![0u8; 7];
    shifted.extend_from_slice(&buffer);
    let header_valid = match AetAssetView::new(&buffer) {
        Some(v) => v.is_valid(),
        None => return aet_held_report(seed),
    };
    let outcome = build_aet_outcome(&fixture, &buffer);
    let value_roundtrip = outcome
        .as_ref()
        .map(|o| values_match(&fixture, o))
        .unwrap_or(false);
    let blob_roundtrip = outcome
        .as_ref()
        .map(|o| o.blob_str == payload_a)
        .unwrap_or(false);
    let relocation = AetAssetView::new(&shifted[7..])
        .and_then(|_| build_aet_outcome(&fixture, &shifted[7..]))
        .map(|o| values_match(&fixture, &o))
        .unwrap_or(false);
    let blob_end = AetHeader::read_le(&buffer)
        .map_or(0, |h| h.blob_offset as usize + h.blob_len as usize);
    let truncated = (blob_end > 0 && AetAssetView::new(&buffer[..blob_end - 1]).is_none())
        && AetAssetView::new(&buffer[..20]).is_none();
    let mut bad = buffer.clone();
    bad[0] ^= 0xFF;
    let bad_magic = AetAssetView::new(&bad).is_none();
    let fail_closed = truncated && bad_magic;
    let mut payload_b = String::new();
    let (buffer2, _) = build_bytes(&fixture, &mut payload_b);
    let deterministic = buffer == buffer2;
    let arena_within_budget = blob_used <= BLOB_CAP;
    let bytes_written = buffer.len();
    let ready = header_valid
        && value_roundtrip
        && blob_roundtrip
        && relocation
        && fail_closed
        && deterministic
        && arena_within_budget;
    let report = AetAssetReport {
        seed,
        entities_written: SOAK_ENTITIES,
        blob_used,
        payload_bytes,
        bytes_written,
        aa_header_valid: header_valid,
        aa_value_roundtrip: value_roundtrip,
        aa_blob_roundtrip: blob_roundtrip,
        aa_relocation_base_independent: relocation,
        aa_fail_closed: fail_closed,
        aa_deterministic: deterministic,
        aa_arena_within_budget: arena_within_budget,
        ready,
        fingerprint: 0,
    };
    AetAssetReport {
        fingerprint: aet_evidence_fingerprint(&report),
        ..report
    }
}
/// Probe de runtime do formato .aet (hot path, budget).
pub struct AetAssetProbe {
    pub asset_ok: bool,
    pub entities: usize,
    pub blob_len: usize,
    pub hot_budget_nanos: u64,
    pub in_budget: bool,
}

/// Mede a abertura zero-copy de um asset (fail-closed, nunca panica).
pub fn probe_aet_asset(buffer: &[u8], budget_nanos: u64) -> AetAssetProbe {
    let start = std::time::Instant::now();
    let asset_ok = AetAssetView::new(buffer).is_some();
    let entities = match AetAssetView::new(buffer) {
        Some(v) => v.entity_count(),
        None => 0,
    };
    let blob_len = match AetAssetView::new(buffer) {
        Some(v) => v.blob().len(),
        None => 0,
    };
    let elapsed = start.elapsed().as_nanos() as u64;
    AetAssetProbe {
        asset_ok,
        entities,
        blob_len,
        hot_budget_nanos: budget_nanos,
        in_budget: elapsed <= budget_nanos,
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    fn write_one_entity(seed: u64) -> Vec<u8> {
        let fixture = build_aet_fixture(seed, 1);
        let mut b = AetAssetBuilder::new(1);
        let _ = b.add_entity();
        let vals = [
            fixture.positions[0][0],
            fixture.positions[0][1],
            fixture.positions[0][2],
            fixture.velocities[0][0],
            fixture.velocities[0][1],
            fixture.velocities[0][2],
            fixture.mass[0],
            fixture.health[0],
        ];
        for c in 0..COLUMN_COUNT {
            assert!(b.set_column_f32(c, 0, vals[c]));
        }
        let _ = b.add_blob(fixture.names[0].as_bytes());
        b.seal()
    }

    #[test]
    fn header_layout_is_fixed_96_bytes() {
        let buf = write_one_entity(1);
        let view = AetAssetView::new(&buf).unwrap();
        assert_eq!(view.header().header_size as usize, HEADER_BYTES);
        assert_eq!(view.header().columns as usize, COLUMN_COUNT);
        assert_eq!(view.header().stride as usize, STRIDE_BYTES);
    }

    #[test]
    fn empty_header_is_invalid() {
        assert!(!AetHeader::empty().is_valid());
    }
    #[test]
    fn header_write_read_roundtrip() {
        let buf = write_one_entity(2);
        let h = AetHeader::read_le(&buf).unwrap();
        assert!(h.is_valid());
        let mut dst = [0u8; HEADER_BYTES];
        h.write_le(&mut dst);
        let r = AetHeader::read_le(&dst).unwrap();
        assert_eq!(r, h);
    }

    #[test]
    fn builder_writes_valid_header_and_column_table() {
        let buf = write_one_entity(3);
        let view = AetAssetView::new(&buf).unwrap();
        assert!(view.is_valid());
        let table = view.column_table().unwrap();
        for c in 0..COLUMN_COUNT {
            assert_eq!(table[c] as usize, view.column_base(c).unwrap());
        }
    }

    #[test]
    fn blob_arena_roundtrip_utf8() {
        let buf = write_one_entity(4);
        let view = AetAssetView::new(&buf).unwrap();
        assert!(view.blob_str().unwrap().starts_with("entity_0000_seed_4"));
    }

    #[test]
    fn view_fail_closed_on_truncated_buffer() {
        let buf = write_one_entity(5);
        assert!(AetAssetView::new(&buf).is_some());
        let h = AetAssetView::new(&buf).unwrap().header();
        let blob_end = h.blob_offset as usize + h.blob_len as usize;
        assert!(AetAssetView::new(&buf[..blob_end - 1]).is_none());
        assert!(AetAssetView::new(&buf[..20]).is_none());
    }

    #[test]
    fn view_fail_closed_on_bad_magic() {
        let buf = write_one_entity(6);
        let mut bad = buf.clone();
        bad[0] ^= 0xFF;
        assert!(AetAssetView::new(&bad).is_none());
    }
    #[test]
    fn entity_values_roundtrip_exact() {
        let fixture = build_aet_fixture(11, 64);
        let mut b = AetAssetBuilder::new(64);
        for i in 0..64 {
            let _ = b.add_entity();
            let _ = b.set_column_f32(col::POS_X, i, fixture.positions[i][0]);
            let _ = b.set_column_f32(col::POS_Y, i, fixture.positions[i][1]);
            let _ = b.set_column_f32(col::POS_Z, i, fixture.positions[i][2]);
            let _ = b.set_column_f32(col::VEL_X, i, fixture.velocities[i][0]);
            let _ = b.set_column_f32(col::VEL_Y, i, fixture.velocities[i][1]);
            let _ = b.set_column_f32(col::VEL_Z, i, fixture.velocities[i][2]);
            let _ = b.set_column_f32(col::MASS, i, fixture.mass[i]);
            let _ = b.set_column_f32(col::HEALTH, i, fixture.health[i]);
            let _ = b.add_blob(fixture.names[i].as_bytes());
        }
        let buf = b.seal();
        let view = AetAssetView::new(&buf).unwrap();
        assert_eq!(view.entity_count(), 64);
        for i in 0..64 {
            let p = view.read_position(i).unwrap();
            assert_eq!(p[0].to_bits(), fixture.positions[i][0].to_bits());
            assert_eq!(p[1].to_bits(), fixture.positions[i][1].to_bits());
            assert_eq!(p[2].to_bits(), fixture.positions[i][2].to_bits());
        }
    }
    #[test]
    fn relocation_base_independent() {
        let buf = write_one_entity(7);
        let mut shifted = vec![0u8; 7];
        shifted.extend_from_slice(&buf);
        let a = AetAssetView::new(&buf).unwrap();
        let b = AetAssetView::new(&shifted[7..]).unwrap();
        assert_eq!(a.read_position(0), b.read_position(0));
        assert_eq!(a.blob(), b.blob());
    }

    #[test]
    fn builder_deterministic_same_seed_same_bytes() {
        assert_eq!(write_one_entity(8), write_one_entity(8));
    }

    #[test]
    fn blob_overflow_fails_closed() {
        let mut b = AetAssetBuilder::new(1);
        let _ = b.add_entity();
        let big = vec![0u8; BLOB_CAP + 1];
        assert!(b.add_blob(&big).is_none());
    }

    #[test]
    fn empty_asset_is_valid_zero_count() {
        let buf = AetAssetBuilder::new(8).seal();
        let view = AetAssetView::new(&buf).unwrap();
        assert!(view.is_valid());
        assert_eq!(view.entity_count(), 0);
        assert_eq!(view.read_f32(col::POS_X, 0), None);
    }
    #[test]
    fn soak_is_green_finite_and_ready() {
        let r = run_aet_asset_soak(0xA1E7);
        assert!(r.is_finite());
        assert!(r.aa_header_valid);
        assert!(r.aa_value_roundtrip);
        assert!(r.aa_blob_roundtrip);
        assert!(r.aa_relocation_base_independent);
        assert!(r.aa_fail_closed);
        assert!(r.aa_deterministic);
        assert!(r.aa_arena_within_budget);
        assert!(r.ready);
    }

    #[test]
    fn soak_fingerprint_deterministic_same_seed() {
        assert_eq!(
            run_aet_asset_soak(42).fingerprint,
            run_aet_asset_soak(42).fingerprint
        );
    }

    #[test]
    fn soak_distinct_evidence_across_seeds() {
        let a = run_aet_asset_soak(1).fingerprint;
        let b = run_aet_asset_soak(2).fingerprint;
        let c = run_aet_asset_soak(3).fingerprint;
        assert_ne!(a, b);
        assert_ne!(b, c);
        assert_ne!(a, c);
    }

    #[test]
    fn probe_reports_hit_and_budget() {
        let buf = write_one_entity(17);
        let p = probe_aet_asset(&buf, AET_HOT_BUDGET_NANOS);
        assert!(p.asset_ok);
        assert_eq!(p.entities, 1);
        assert!(p.in_budget);
        let mut bad = buf.clone();
        bad[0] ^= 0xFF;
        let q = probe_aet_asset(&bad, AET_HOT_BUDGET_NANOS);
        assert!(!q.asset_ok);
        assert_eq!(q.entities, 0);
        assert_eq!(q.blob_len, 0);
    }
}
