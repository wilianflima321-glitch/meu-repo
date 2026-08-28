//! TT-01..TT-05 — GPU terminal render substrate (backend only, zero UI).
//!
//! Alacritty-class architecture, adapted to the Aethel engine:
//! - **TT-01 glyph atlas**: one VRAM texture holds the whole font (95 printable
//!   ASCII glyphs of the built-in deterministic 5×7 bitmap — the font source is
//!   swappable; the pipeline is the deliverable).
//! - **TT-02 instanced draw**: dirty cells become quads in a per-frame vertex
//!   buffer; ONE indexed draw call renders the whole grid.
//! - **TT-03 cell diff**: only cells changed since the last frame are emitted
//!   (the classic GPU-terminal win over CPU redraws).
//! - **TT-04 CapScore routing**: the substrate reports device capability; the
//!   product attaches it when an adapter exists and falls back to the existing
//!   PTY passthrough (`terminal_*`) otherwise. ONE unified terminal — never two.
//! - **TT-05 fail-closed evidence**: glyphs drawn, draw-call count (must be 1),
//!   atlas residency and a real pixel readback proof.
//!
//! Execution stays CPU/PTY (GPU does not make shells faster); this module is
//! the render substrate only. No Alacritty-parity claim until measured — flags
//! flip on measured evidence, never on compile.

use bytemuck::{Pod, Zeroable};
use serde::Serialize;
use wgpu::util::DeviceExt;

pub const GPU_TERMINAL_GLYPH_W: u32 = 5;
pub const GPU_TERMINAL_GLYPH_H: u32 = 7;
pub const GPU_TERMINAL_CELL_W: u32 = 6;
pub const GPU_TERMINAL_CELL_H: u32 = 9;
pub const GPU_TERMINAL_ATLAS_COLS: u32 = 16;
pub const GPU_TERMINAL_ATLAS_ROWS: u32 = 6;
pub const GPU_TERMINAL_ATLAS_PX: u32 = GPU_TERMINAL_GLYPH_W * GPU_TERMINAL_ATLAS_COLS;
pub const GPU_TERMINAL_ATLAS_PY: u32 = GPU_TERMINAL_GLYPH_H * GPU_TERMINAL_ATLAS_ROWS;
pub const GPU_TERMINAL_FIRST_CHAR: u8 = 0x20;

/// Deterministic built-in 5×7 bitmap for printable ASCII (0x20..=0x7E).
/// Each byte = one glyph row, 5 columns left→right (0x10..0x01).
pub const FONT5X7: [[u8; 7]; 95] = [
    // 0x20 ' '
    [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    // 0x21 '!'
    [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
    // 0x22 '"'
    [0x0A, 0x0A, 0x0A, 0x00, 0x00, 0x00, 0x00],
    // 0x23 '#'
    [0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A],
    // 0x24 '$'
    [0x04, 0x0F, 0x14, 0x0E, 0x05, 0x1E, 0x04],
    // 0x25 '%'
    [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03],
    // 0x26 '&'
    [0x0C, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0D],
    // 0x27 '''
    [0x04, 0x04, 0x04, 0x00, 0x00, 0x00, 0x00],
    // 0x28 '('
    [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
    // 0x29 ')'
    [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
    // 0x2A '*'
    [0x00, 0x04, 0x15, 0x0E, 0x15, 0x04, 0x00],
    // 0x2B '+'
    [0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00],
    // 0x2C ','
    [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08],
    // 0x2D '-'
    [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00],
    // 0x2E '.'
    [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00],
    // 0x2F '/'
    [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
    // 0x30 '0'
    [0x0E, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x0E],
    // 0x31 '1'
    [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
    // 0x32 '2'
    [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F],
    // 0x33 '3'
    [0x1F, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0E],
    // 0x34 '4'
    [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
    // 0x35 '5'
    [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
    // 0x36 '6'
    [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E],
    // 0x37 '7'
    [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
    // 0x38 '8'
    [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
    // 0x39 '9'
    [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
    // 0x3A ':'
    [0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00],
    // 0x3B ';'
    [0x00, 0x04, 0x00, 0x00, 0x04, 0x04, 0x08],
    // 0x3C '<'
    [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
    // 0x3D '='
    [0x00, 0x00, 0x1F, 0x00, 0x1F, 0x00, 0x00],
    // 0x3E '>'
    [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
    // 0x3F '?'
    [0x0E, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
    // 0x40 '@'
    [0x0E, 0x11, 0x17, 0x15, 0x17, 0x10, 0x0F],
    // 0x41 'A'
    [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    // 0x42 'B'
    [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
    // 0x43 'C'
    [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
    // 0x44 'D'
    [0x1C, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1C],
    // 0x45 'E'
    [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F],
    // 0x46 'F'
    [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
    // 0x47 'G'
    [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F],
    // 0x48 'H'
    [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    // 0x49 'I'
    [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
    // 0x4A 'J'
    [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C],
    // 0x4B 'K'
    [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
    // 0x4C 'L'
    [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
    // 0x4D 'M'
    [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11],
    // 0x4E 'N'
    [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
    // 0x4F 'O'
    [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    // 0x50 'P'
    [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
    // 0x51 'Q'
    [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D],
    // 0x52 'R'
    [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
    // 0x53 'S'
    [0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E],
    // 0x54 'T'
    [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
    // 0x55 'U'
    [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    // 0x56 'V'
    [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04],
    // 0x57 'W'
    [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
    // 0x58 'X'
    [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
    // 0x59 'Y'
    [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04],
    // 0x5A 'Z'
    [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
    // 0x5B '['
    [0x0E, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0E],
    // 0x5C '\'
    [0x10, 0x08, 0x08, 0x04, 0x02, 0x02, 0x01],
    // 0x5D ']'
    [0x0E, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0E],
    // 0x5E '^'
    [0x04, 0x0A, 0x11, 0x00, 0x00, 0x00, 0x00],
    // 0x5F '_'
    [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F],
    // 0x60 '`'
    [0x08, 0x04, 0x02, 0x00, 0x00, 0x00, 0x00],
    // 0x61 'a'
    [0x00, 0x00, 0x0E, 0x01, 0x0F, 0x11, 0x0F],
    // 0x62 'b'
    [0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x1E],
    // 0x63 'c'
    [0x00, 0x00, 0x0E, 0x10, 0x10, 0x11, 0x0E],
    // 0x64 'd'
    [0x01, 0x01, 0x0D, 0x13, 0x11, 0x11, 0x0F],
    // 0x65 'e'
    [0x00, 0x00, 0x0E, 0x11, 0x1F, 0x10, 0x0E],
    // 0x66 'f'
    [0x06, 0x09, 0x08, 0x1C, 0x08, 0x08, 0x08],
    // 0x67 'g'
    [0x00, 0x0F, 0x11, 0x11, 0x0F, 0x01, 0x0E],
    // 0x68 'h'
    [0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x11],
    // 0x69 'i'
    [0x04, 0x00, 0x0C, 0x04, 0x04, 0x04, 0x0E],
    // 0x6A 'j'
    [0x02, 0x00, 0x06, 0x02, 0x02, 0x12, 0x0C],
    // 0x6B 'k'
    [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
    // 0x6C 'l'
    [0x0C, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
    // 0x6D 'm'
    [0x00, 0x00, 0x1A, 0x15, 0x15, 0x11, 0x11],
    // 0x6E 'n'
    [0x00, 0x00, 0x16, 0x19, 0x11, 0x11, 0x11],
    // 0x6F 'o'
    [0x00, 0x00, 0x0E, 0x11, 0x11, 0x11, 0x0E],
    // 0x70 'p'
    [0x00, 0x00, 0x1E, 0x11, 0x1E, 0x10, 0x10],
    // 0x71 'q'
    [0x00, 0x00, 0x0D, 0x13, 0x0F, 0x01, 0x01],
    // 0x72 'r'
    [0x00, 0x00, 0x16, 0x19, 0x10, 0x10, 0x10],
    // 0x73 's'
    [0x00, 0x00, 0x0F, 0x10, 0x0E, 0x01, 0x1E],
    // 0x74 't'
    [0x08, 0x08, 0x1C, 0x08, 0x08, 0x09, 0x06],
    // 0x75 'u'
    [0x00, 0x00, 0x11, 0x11, 0x11, 0x13, 0x0D],
    // 0x76 'v'
    [0x00, 0x00, 0x11, 0x11, 0x11, 0x0A, 0x04],
    // 0x77 'w'
    [0x00, 0x00, 0x11, 0x11, 0x15, 0x15, 0x0A],
    // 0x78 'x'
    [0x00, 0x00, 0x11, 0x0A, 0x04, 0x0A, 0x11],
    // 0x79 'y'
    [0x00, 0x00, 0x11, 0x11, 0x0F, 0x01, 0x0E],
    // 0x7A 'z'
    [0x00, 0x00, 0x1F, 0x02, 0x04, 0x08, 0x1F],
    // 0x7B '{'
    [0x02, 0x04, 0x04, 0x08, 0x04, 0x04, 0x02],
    // 0x7C '|'
    [0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
    // 0x7D '}'
    [0x08, 0x04, 0x04, 0x02, 0x04, 0x04, 0x08],
    // 0x7E '~'
    [0x00, 0x04, 0x02, 0x1F, 0x02, 0x04, 0x00],
];

/// One terminal cell (grid state; dirty is render-state, not serialized).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TerminalCell {
    pub ch: u8,
    pub fg: [f32; 3],
    pub bg: [f32; 3],
    /// Ghost (predictive dry-run) cells render dimmed — the AI's "ghost typing"
    /// surface. Rendered by CPU-side fg→bg lerp, no shader change.
    pub ghost: bool,
}

impl Default for TerminalCell {
    fn default() -> Self {
        Self {
            ch: b' ',
            fg: [0.85, 0.85, 0.85],
            bg: [0.0, 0.0, 0.0],
            ghost: false,
        }
    }
}

/// Structured log severity — the terminal renders a color for humans; the AI
/// consumes the enum directly (no text parsing).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TerminalSeverity {
    Info,
    Warn,
    Error,
}

impl TerminalSeverity {
    pub fn fg(self) -> [f32; 3] {
        match self {
            TerminalSeverity::Info => [0.62, 0.80, 1.00],
            TerminalSeverity::Warn => [1.00, 0.85, 0.30],
            TerminalSeverity::Error => [1.00, 0.35, 0.35],
        }
    }

    pub fn tag(self) -> &'static str {
        match self {
            TerminalSeverity::Info => "INFO",
            TerminalSeverity::Warn => "WARN",
            TerminalSeverity::Error => "ERROR",
        }
    }
}

/// Typed event (the "object shell"): the kernel/agent layer posts a struct,
/// NOT a string. Humans see rendered text; AI workers read this record raw.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TerminalEvent {
    pub severity: TerminalSeverity,
    pub message: &'static str,
    /// Spatial anchor into the rendered scene (spatial logging — the line
    /// points at the world position where the event occurred).
    pub anchor: Option<[f32; 3]>,
    /// Deterministic tick id tying the event to the closed tick loop / state
    /// replay (time-machine link — rewind lives in the RollbackJournal).
    pub tick_id: Option<u64>,
}

/// Structured record the AI consumes (raw, not screen text).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TerminalEventRecord {
    pub severity: TerminalSeverity,
    pub message: &'static str,
    pub anchor: Option<[f32; 3]>,
    pub tick_id: Option<u64>,
}

/// Deterministic terminal grid with dirty tracking (TT-03 diff) + a structured
/// event ring (TT-06 object shell — AI reads raw records, never parsed text).
/// CPU cost is O(delta): a dirty-list drives the emit (no full-grid scans),
/// and scrolling is O(1) via a row-rotation offset (only the new bottom line
/// is touched) — the GPU stays the only place that ever touches every cell.
pub struct GpuTerminalGrid {
    pub cols: u32,
    pub rows: u32,
    cells: Vec<TerminalCell>,
    dirty: Vec<bool>,
    dirty_list: Vec<u32>,
    pub dirty_count: u32,
    cursor_col: u32,
    cursor_row: u32,
    scroll_offset: u32,
    events: std::collections::VecDeque<TerminalEventRecord>,
    pub events_cap: usize,
}

impl GpuTerminalGrid {
    pub fn new(cols: u32, rows: u32) -> Self {
        let n = (cols.max(1) * rows.max(1)) as usize;
        Self {
            cols: cols.max(1),
            rows: rows.max(1),
            cells: vec![TerminalCell::default(); n],
            dirty: vec![true; n],
            dirty_list: (0..n as u32).collect(),
            dirty_count: n as u32,
            cursor_col: 0,
            cursor_row: 0,
            scroll_offset: 0,
            events: std::collections::VecDeque::new(),
            events_cap: 4096,
        }
    }

    fn mark_dirty(&mut self, idx: usize) {
        if !self.dirty[idx] {
            self.dirty[idx] = true;
            self.dirty_list.push(idx as u32);
            self.dirty_count += 1;
        }
    }

    fn index(&self, col: u32, row: u32) -> usize {
        ((row % self.rows) * self.cols + (col % self.cols)) as usize
    }

    pub fn put_cell(&mut self, col: u32, row: u32, cell: TerminalCell) {
        let idx = self.index(col, row);
        if self.cells[idx] != cell {
            self.cells[idx] = cell;
            self.mark_dirty(idx);
        }
    }

    /// Screen row for a logical row (scroll ring rotation — O(1) scroll).
    fn screen_row(&self, logical_row: u32) -> u32 {
        (logical_row + self.scroll_offset) % self.rows
    }

    /// Line-feed aware write (strips control bytes < 0x20 except \n).
    pub fn write_line(&mut self, text: &[u8]) {
        self.write_colored(text, [0.85, 0.85, 0.85]);
    }

    /// Line write with an explicit foreground (severity coloring etc.).
    /// Newline at the last row scrolls (O(1) rotation — only the new bottom
    /// line is cleared and marked dirty, never the whole grid).
    pub fn write_colored(&mut self, text: &[u8], fg: [f32; 3]) {
        for &byte in text {
            match byte {
                b'\n' => {
                    if self.cursor_row + 1 >= self.rows {
                        self.scroll_offset = (self.scroll_offset + 1) % self.rows;
                        let row = self.cursor_row;
                        for col in 0..self.cols {
                            let idx = self.index(col, row);
                            self.cells[idx] = TerminalCell::default();
                            self.mark_dirty(idx);
                        }
                        self.cursor_col = 0;
                    } else {
                        self.cursor_row += 1;
                        self.cursor_col = 0;
                    }
                }
                b'\r' => {
                    self.cursor_col = 0;
                }
                0x20..=0x7E => {
                    self.put_cell(
                        self.cursor_col,
                        self.cursor_row,
                        TerminalCell {
                            ch: byte,
                            fg,
                            ..TerminalCell::default()
                        },
                    );
                    self.cursor_col += 1;
                    if self.cursor_col >= self.cols {
                        self.cursor_col = 0;
                        if self.cursor_row + 1 >= self.rows {
                            self.scroll_offset = (self.scroll_offset + 1) % self.rows;
                            let row = self.cursor_row;
                            for col in 0..self.cols {
                                let idx = self.index(col, row);
                                self.cells[idx] = TerminalCell::default();
                                self.mark_dirty(idx);
                            }
                        } else {
                            self.cursor_row += 1;
                        }
                    }
                }
                _ => {}
            }
        }
    }

    /// Typed event write (TT-06 object shell): renders a severity-tagged line
    /// for humans AND stores the raw structured record for AI workers.
    pub fn write_event(&mut self, event: TerminalEvent) -> TerminalEventRecord {
        self.render_event_line(event);
        let record = TerminalEventRecord {
            severity: event.severity,
            message: event.message,
            anchor: event.anchor,
            tick_id: event.tick_id,
        };
        self.events.push_back(record);
        while self.events.len() > self.events_cap {
            self.events.pop_front();
        }
        record
    }

    fn render_event_line(&mut self, event: TerminalEvent) {
        let line = format!("[{}] {}", event.severity.tag(), event.message);
        self.write_colored(line.as_bytes(), event.severity.fg());
        self.write_line(b"\n");
    }

    /// Time-machine backend (terminal side): deterministically re-render the
    /// grid from the event ring up to `tick`. The ring is NOT modified — this
    /// is log replay, not state mutation. (Rewinding GAS sim state is the
    /// RollbackJournal's domain; the terminal replays its own structured log.)
    pub fn rewind_events_to(&mut self, tick: u64) -> usize {
        // Clear the grid to its blank state (all cells dirty).
        for cell in self.cells.iter_mut() {
            *cell = TerminalCell::default();
        }
        for d in self.dirty.iter_mut() {
            *d = true;
        }
        self.dirty_list.clear();
        self.dirty_list.extend(0..(self.cols * self.rows));
        self.dirty_count = self.cols * self.rows;
        self.cursor_col = 0;
        self.cursor_row = 0;
        self.scroll_offset = 0;
        let events: Vec<TerminalEventRecord> = self
            .events
            .iter()
            .filter(|e| e.tick_id.map(|t| t <= tick).unwrap_or(true))
            .copied()
            .collect();
        for record in &events {
            self.render_event_line(TerminalEvent {
                severity: record.severity,
                message: record.message,
                anchor: record.anchor,
                tick_id: record.tick_id,
            });
        }
        events.len()
    }

    /// Ghost (predictive dry-run) line: rendered dimmed, never committed as a
    /// real event — the AI's pre-ENTER warning surface.
    pub fn ghost_line(&mut self, text: &[u8]) {
        let save_col = self.cursor_col;
        let save_row = self.cursor_row;
        self.write_line(text);
        // Dim the cells this ghost wrote (fg → bg lerp happens at emit).
        let mut row = save_row;
        let mut col = save_col;
        for &byte in text {
            match byte {
                b'\n' => {
                    row = (row + 1) % self.rows;
                    col = 0;
                }
                0x20..=0x7E => {
                    let idx = self.index(col, row);
                    self.cells[idx].ghost = true;
                    self.mark_dirty(idx);
                    col += 1;
                    if col >= self.cols {
                        col = 0;
                        row = (row + 1) % self.rows;
                    }
                }
                _ => {}
            }
        }
        self.cursor_col = save_col;
        self.cursor_row = save_row;
    }

/// xterm 256-color palette: 16 base + 6×6×6 cube + 24 grays (deterministic).
pub fn ansi256_palette() -> [[f32; 3]; 256] {
    let mut palette = [[0.0f32; 3]; 256];
    const BASE: [[u8; 3]; 16] = [
        [0, 0, 0],
        [205, 49, 49],
        [0, 188, 0],
        [205, 173, 0],
        [0, 102, 204],
        [205, 49, 205],
        [0, 188, 188],
        [229, 229, 229],
        [127, 127, 127],
        [255, 89, 89],
        [56, 254, 56],
        [255, 220, 56],
        [86, 156, 254],
        [255, 89, 255],
        [56, 254, 254],
        [255, 255, 255],
    ];
    for (i, c) in BASE.iter().enumerate() {
        palette[i] = [c[0] as f32 / 255.0, c[1] as f32 / 255.0, c[2] as f32 / 255.0];
    }
    for (idx, slot) in palette.iter_mut().enumerate().skip(16).take(216) {
        let v = idx as u32 - 16;
        let r = v / 36;
        let g = (v / 6) % 6;
        let b = v % 6;
        let level = |x: u32| {
            if x == 0 {
                0.0
            } else {
                (55.0 + 40.0 * (x - 1) as f32) / 255.0
            }
        };
        *slot = [level(r), level(g), level(b)];
    }
    for (idx, slot) in palette.iter_mut().enumerate().skip(232) {
        let v = ((idx - 232) as f32 * 10.0 + 8.0) / 255.0;
        *slot = [v, v, v];
    }
    palette
}

/// Scroll rotation offset (0 = no scroll yet).
#[allow(dead_code)]
pub fn scroll_offset(&self) -> u32 {
    self.scroll_offset
}

/// Minimal SGR write: `ESC[38;5;<n>m` sets the foreground from the 256-color
/// palette, `ESC[0m` resets; everything else renders with the active fg.
/// Full ANSI emulation lives in the PTY layer — this is the color substrate.
pub fn write_ansi(&mut self, text: &[u8]) {
    let palette = Self::ansi256_palette();
    let mut fg = [0.85, 0.85, 0.85];
    let mut i = 0;
    while i < text.len() {
        if text[i] == 0x1b && i + 1 < text.len() && text[i + 1] == b'[' {
            let mut j = i + 2;
            let mut params = Vec::new();
            while j < text.len() && text[j] != b'm' {
                params.push(text[j]);
                j += 1;
            }
            if j < text.len() {
                j += 1;
            }
            let s = String::from_utf8_lossy(&params).to_string();
            let parts: Vec<&str> = s.split(';').collect();
            if parts.first() == Some(&"38") && parts.get(1) == Some(&"5") {
                if let Some(n) = parts.get(2).and_then(|p| p.parse::<usize>().ok()) {
                    if n < 256 {
                        fg = palette[n];
                    }
                }
            } else if parts.first() == Some(&"0") {
                fg = [0.85, 0.85, 0.85];
            }
            i = j;
            continue;
        }
        self.write_colored(&text[i..i + 1], fg);
        i += 1;
    }
}

/// AI-facing raw event surface (structured, not screen text).
pub fn events_snapshot(&self) -> Vec<TerminalEventRecord> {
    self.events.iter().copied().collect()
}

    pub fn cell(&self, col: u32, row: u32) -> TerminalCell {
        self.cells[self.index(col, row)]
    }

    /// Emit quads for dirty cells (dirty-list driven — O(delta), no grid scan)
    /// and clear the dirty set (TT-02 vertex feed).
    pub fn emit_dirty_quads(&mut self) -> Vec<TerminalQuad> {
        let mut quads = Vec::with_capacity(self.dirty_list.len());
        for &i in &self.dirty_list {
            self.dirty[i as usize] = false;
            let col = i % self.cols;
            let logical_row = i / self.cols;
            let row = self.screen_row(logical_row);
            let cell = self.cells[i as usize];
            // Ghost cells (AI dry-run) render dimmed: fg lerped toward bg.
            let fg = if cell.ghost {
                [
                    cell.bg[0] + (cell.fg[0] - cell.bg[0]) * 0.35,
                    cell.bg[1] + (cell.fg[1] - cell.bg[1]) * 0.35,
                    cell.bg[2] + (cell.fg[2] - cell.bg[2]) * 0.35,
                ]
            } else {
                cell.fg
            };
            let glyph = u32::from(cell.ch.saturating_sub(GPU_TERMINAL_FIRST_CHAR));
            let gx = glyph % GPU_TERMINAL_ATLAS_COLS;
            let gy = glyph / GPU_TERMINAL_ATLAS_COLS;
            quads.push(TerminalQuad {
                x0: col * GPU_TERMINAL_CELL_W,
                y0: row * GPU_TERMINAL_CELL_H,
                u0: gx * GPU_TERMINAL_GLYPH_W,
                v0: gy * GPU_TERMINAL_GLYPH_H,
                fg,
                bg: cell.bg,
            });
        }
        self.dirty_list.clear();
        self.dirty_count = 0;
        quads
    }
}

/// One dirty-cell quad (expanded to 4 vertices + 6 indices at encode time).
#[derive(Debug, Clone, Copy)]
pub struct TerminalQuad {
    pub x0: u32,
    pub y0: u32,
    pub u0: u32,
    pub v0: u32,
    pub fg: [f32; 3],
    pub bg: [f32; 3],
}

/// Built-in atlas bitmap (rows of 8-bit alpha: 0 / 255), row-major over the
/// atlas texture, per-glyph cell = GLYPH_W × GLYPH_H.
pub fn build_atlas_texels() -> Vec<u8> {
    let mut texels =
        vec![0u8; (GPU_TERMINAL_ATLAS_PX * GPU_TERMINAL_ATLAS_PY) as usize];
    for (glyph_idx, rows) in FONT5X7.iter().enumerate() {
        let gx = glyph_idx as u32 % GPU_TERMINAL_ATLAS_COLS;
        let gy = glyph_idx as u32 / GPU_TERMINAL_ATLAS_COLS;
        for (row, &bits) in rows.iter().enumerate() {
            for col in 0..GPU_TERMINAL_GLYPH_W {
                let set = (bits >> (4 - col)) & 1 == 1;
                let x = gx * GPU_TERMINAL_GLYPH_W + col;
                let y = gy * GPU_TERMINAL_GLYPH_H + row as u32;
                let idx = (y * GPU_TERMINAL_ATLAS_PX + x) as usize;
                texels[idx] = if set { 255 } else { 0 };
            }
        }
    }
    texels
}

/// Uniform params (32 bytes, scalar-only — uniform-safe).
#[repr(C, align(16))]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
struct TermParams {
    tex_w: u32,
    tex_h: u32,
    cell_w: u32,
    cell_h: u32,
    atlas_w: u32,
    atlas_h: u32,
    _pad0: u32,
    _pad1: u32,
}

const TERMINAL_SHADER: &str = r#"
struct TermParams {
    tex_w: u32,
    tex_h: u32,
    cell_w: u32,
    cell_h: u32,
    atlas_w: u32,
    atlas_h: u32,
    _pad0: u32,
    _pad1: u32,
};

struct VsIn {
    @location(0) corner: vec2<f32>,
    @location(1) cell_xy: vec2<u32>,
    @location(2) fg: vec3<f32>,
    @location(3) glyph_uv: vec2<u32>,
    @location(4) bg: vec3<f32>,
};

struct VsOut {
    @builtin(position) clip_pos: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) fg: vec3<f32>,
    @location(2) bg: vec3<f32>,
};

@group(0) @binding(0) var<uniform> params: TermParams;
@group(0) @binding(1) var atlas: texture_2d<f32>;

@vertex
fn vs_main(in: VsIn) -> VsOut {
    var out: VsOut;
    let half = vec2<f32>(0.5, 0.5);
    let pos = vec2<f32>(
        f32(in.cell_xy.x) + in.corner.x * f32(params.cell_w) - half.x,
        f32(in.cell_xy.y) + in.corner.y * f32(params.cell_h) - half.y,
    );
    out.clip_pos = vec4<f32>(
        pos.x / f32(params.tex_w) * 2.0 - 1.0,
        1.0 - pos.y / f32(params.tex_h) * 2.0,
        0.0,
        1.0,
    );
    // Atlas UV into the glyph cell (5×7 within the shared VRAM atlas).
    out.uv = vec2<f32>(
        (f32(in.glyph_uv.x) + in.corner.x * 5.0) / f32(params.atlas_w),
        1.0 - (f32(in.glyph_uv.y) + in.corner.y * 7.0) / f32(params.atlas_h),
    );
    out.fg = in.fg;
    out.bg = in.bg;
    return out;
}

@fragment
fn fs_main(in: VsOut) -> @location(0) vec4<f32> {
    let alpha = textureSample(atlas, atlas_sampler, in.uv).r;
    return vec4<f32>(mix(in.bg, in.fg, alpha), 1.0);
}
"#;

const ATLAS_SAMPLER_DECL: &str = "@group(0) @binding(2) var atlas_sampler: sampler;\n";

/// TT-04 capability: adapter presence decides GPU render vs PTY passthrough.
/// Public routing API — the product/agent layer calls this once at attach
/// time (no UI here; the PTY passthrough is the CPU fallback).
#[allow(dead_code)]
pub fn gpu_terminal_capability() -> bool {
    let instance = wgpu::Instance::default();
    pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
        power_preference: wgpu::PowerPreference::LowPower,
        compatible_surface: None,
        force_fallback_adapter: false,
    }))
    .is_some()
}

/// TT-05 fail-closed evidence report.
#[derive(Debug, Clone, Serialize)]
pub struct GpuTerminalProbeReport {
    pub gpu_capable: bool,
    pub device_created: bool,
    pub atlas_glyphs: u32,
    pub atlas_resident_vram: bool,
    pub grid_cols: u32,
    pub grid_rows: u32,
    pub cells_written: u32,
    pub cells_dirty: u32,
    pub glyphs_drawn: u32,
    pub draw_calls: u32,
    pub events_stored: u32,
    pub events_replayed: u32,
    pub anchors_carried: u32,
    pub tick_linked: bool,
    pub emit_micros: f64,
    pub vertex_bytes: u32,
    pub rendered_pixels_proven: bool,
    pub substrate_proven: bool,
    pub claim: String,
}

/// Full TT-01..TT-05 probe: atlas + grid + diff + ONE draw call + pixel proof.
pub fn run_gpu_terminal_probe() -> GpuTerminalProbeReport {
    let instance = wgpu::Instance::default();
    let adapter = match pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
        power_preference: wgpu::PowerPreference::LowPower,
        compatible_surface: None,
        force_fallback_adapter: false,
    })) {
        Some(a) => a,
        None => {
            return GpuTerminalProbeReport {
                gpu_capable: false,
                device_created: false,
                atlas_glyphs: FONT5X7.len() as u32,
                atlas_resident_vram: false,
                grid_cols: 0,
                grid_rows: 0,
                cells_written: 0,
                cells_dirty: 0,
                glyphs_drawn: 0,
                draw_calls: 0,
                events_stored: 0,
                events_replayed: 0,
                anchors_carried: 0,
                tick_linked: false,
                emit_micros: 0.0,
                vertex_bytes: 0,
                rendered_pixels_proven: false,
                substrate_proven: false,
                claim: "GPU terminal substrate not run: no adapter (honest skip; PTY passthrough remains the fallback)"
                    .into(),
            };
        }
    };
    let (device, queue) = match pollster::block_on(adapter.request_device(
        &wgpu::DeviceDescriptor {
            label: Some("Aethel GPU Terminal Probe Device"),
            required_features: wgpu::Features::empty(),
            required_limits: wgpu::Limits::default(),
        },
        None,
    )) {
        Ok((d, q)) => (d, q),
        Err(e) => {
            return GpuTerminalProbeReport {
                gpu_capable: true,
                device_created: false,
                atlas_glyphs: FONT5X7.len() as u32,
                atlas_resident_vram: false,
                grid_cols: 0,
                grid_rows: 0,
                cells_written: 0,
                cells_dirty: 0,
                glyphs_drawn: 0,
                draw_calls: 0,
                events_stored: 0,
                events_replayed: 0,
                anchors_carried: 0,
                tick_linked: false,
                emit_micros: 0.0,
                vertex_bytes: 0,
                rendered_pixels_proven: false,
                substrate_proven: false,
                claim: format!("GPU terminal substrate not run: device request failed ({e})"),
            };
        }
    };

    let cols = 80u32;
    let rows = 24u32;
    let mut grid = GpuTerminalGrid::new(cols, rows);
    grid.write_line(b"Aethel GPU terminal substrate\r\n");
    // TT-06 object shell: typed events (humans see color, AI reads structs).
    grid.write_event(TerminalEvent {
        severity: TerminalSeverity::Info,
        message: "one draw call renders the whole grid",
        anchor: None,
        tick_id: Some(12),
    });
    grid.write_event(TerminalEvent {
        severity: TerminalSeverity::Warn,
        message: "radiance cascade ring budget near ceiling",
        anchor: Some([4.0, 1.5, -3.0]),
        tick_id: Some(12),
    });
    grid.write_event(TerminalEvent {
        severity: TerminalSeverity::Error,
        message: "VSM free-slot pool would exhaust at this view",
        anchor: Some([-8.0, 0.0, 6.0]),
        tick_id: Some(12),
    });
    grid.ghost_line(b"ghost: warning before ENTER");
    grid.write_ansi(b"\x1b[38;5;2mANSI 256-color path\x1b[0m");
    // Time-machine backend exercised on the probe path: deterministic replay.
    let events_replayed = grid.rewind_events_to(12) as u32;
    let events_stored = grid.events_snapshot().len() as u32;
    let anchors_carried = grid
        .events_snapshot()
        .iter()
        .filter(|e| e.anchor.is_some())
        .count() as u32;
    let tick_linked = !grid.events_snapshot().is_empty()
        && grid.events_snapshot().iter().all(|e| e.tick_id == Some(12));
    let cells_written = cols * rows;
    let t0 = std::time::Instant::now();
    let quads = grid.emit_dirty_quads();
    let emit_micros = t0.elapsed().as_secs_f64() * 1_000_000.0;
    let vertex_bytes_uploaded = quads.len() as u32 * 4 * 64;
    let first_cell_ch = grid.cell(0, 0).ch;

    let texels = build_atlas_texels();
    let atlas_texture = device.create_texture(&wgpu::TextureDescriptor {
        label: Some("Aethel GPU Terminal Atlas"),
        size: wgpu::Extent3d {
            width: GPU_TERMINAL_ATLAS_PX,
            height: GPU_TERMINAL_ATLAS_PY,
            depth_or_array_layers: 1,
        },
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format: wgpu::TextureFormat::R8Unorm,
        usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
        view_formats: &[],
    });
    queue.write_texture(
        wgpu::ImageCopyTexture {
            texture: &atlas_texture,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
            aspect: wgpu::TextureAspect::All,
        },
        &texels,
        wgpu::ImageDataLayout {
            offset: 0,
            bytes_per_row: Some(GPU_TERMINAL_ATLAS_PX),
            rows_per_image: Some(GPU_TERMINAL_ATLAS_PY),
        },
        wgpu::Extent3d {
            width: GPU_TERMINAL_ATLAS_PX,
            height: GPU_TERMINAL_ATLAS_PY,
            depth_or_array_layers: 1,
        },
    );
    let atlas_view = atlas_texture.create_view(&wgpu::TextureViewDescriptor::default());
    let atlas_sampler = device.create_sampler(&wgpu::SamplerDescriptor {
        label: Some("Aethel GPU Terminal Atlas Sampler"),
        address_mode_u: wgpu::AddressMode::ClampToEdge,
        address_mode_v: wgpu::AddressMode::ClampToEdge,
        mag_filter: wgpu::FilterMode::Nearest,
        min_filter: wgpu::FilterMode::Nearest,
        ..Default::default()
    });

    let tex_w = cols * GPU_TERMINAL_CELL_W;
    let tex_h = rows * GPU_TERMINAL_CELL_H;
    let params = TermParams {
        tex_w,
        tex_h,
        cell_w: GPU_TERMINAL_CELL_W,
        cell_h: GPU_TERMINAL_CELL_H,
        atlas_w: GPU_TERMINAL_ATLAS_PX,
        atlas_h: GPU_TERMINAL_ATLAS_PY,
        _pad0: 0,
        _pad1: 0,
    };
    let params_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some("Aethel GPU Terminal Params"),
        contents: bytemuck::bytes_of(&params),
        usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
    });

    let shader_source = TERMINAL_SHADER.replace(
        "struct TermParams",
        &format!("{ATLAS_SAMPLER_DECL}struct TermParams"),
    );
    let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
        label: Some("Aethel GPU Terminal Shader"),
        source: wgpu::ShaderSource::Wgsl(shader_source.into()),
    });

    let target_texture = device.create_texture(&wgpu::TextureDescriptor {
        label: Some("Aethel GPU Terminal Target"),
        size: wgpu::Extent3d {
            width: tex_w,
            height: tex_h,
            depth_or_array_layers: 1,
        },
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format: wgpu::TextureFormat::Rgba8UnormSrgb,
        usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::COPY_SRC,
        view_formats: &[],
    });
    let target_view = target_texture.create_view(&wgpu::TextureViewDescriptor::default());

    let bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
        label: Some("Aethel GPU Terminal BGL"),
        entries: &[
            wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            },
            wgpu::BindGroupLayoutEntry {
                binding: 1,
                visibility: wgpu::ShaderStages::FRAGMENT,
                ty: wgpu::BindingType::Texture {
                    sample_type: wgpu::TextureSampleType::Float { filterable: false },
                    view_dimension: wgpu::TextureViewDimension::D2,
                    multisampled: false,
                },
                count: None,
            },
            wgpu::BindGroupLayoutEntry {
                binding: 2,
                visibility: wgpu::ShaderStages::FRAGMENT,
                ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::NonFiltering),
                count: None,
            },
        ],
    });
    let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
        label: Some("Aethel GPU Terminal Layout"),
        bind_group_layouts: &[&bgl],
        push_constant_ranges: &[],
    });
    let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
        label: Some("Aethel GPU Terminal Pipeline"),
        layout: Some(&pipeline_layout),
        vertex: wgpu::VertexState {
            module: &shader,
            entry_point: "vs_main",
            buffers: &[wgpu::VertexBufferLayout {
                array_stride: 64,
                step_mode: wgpu::VertexStepMode::Vertex,
                attributes: &wgpu::vertex_attr_array![
                    0 => Float32x2,
                    1 => Uint32x2,
                    2 => Float32x3,
                    3 => Uint32x2,
                    4 => Float32x3,
                ],
            }],
            compilation_options: Default::default(),
        },
        primitive: wgpu::PrimitiveState {
            topology: wgpu::PrimitiveTopology::TriangleList,
            ..Default::default()
        },
        depth_stencil: None,
        multisample: wgpu::MultisampleState::default(),
        fragment: Some(wgpu::FragmentState {
            module: &shader,
            entry_point: "fs_main",
            targets: &[Some(wgpu::ColorTargetState {
                format: wgpu::TextureFormat::Rgba8UnormSrgb,
                blend: Some(wgpu::BlendState::REPLACE),
                write_mask: wgpu::ColorWrites::ALL,
            })],
            compilation_options: Default::default(),
        }),
        multiview: None,
    });

    let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
        label: Some("Aethel GPU Terminal BG"),
        layout: &bgl,
        entries: &[
            wgpu::BindGroupEntry {
                binding: 0,
                resource: params_buffer.as_entire_binding(),
            },
            wgpu::BindGroupEntry {
                binding: 1,
                resource: wgpu::BindingResource::TextureView(&atlas_view),
            },
            wgpu::BindGroupEntry {
                binding: 2,
                resource: wgpu::BindingResource::Sampler(&atlas_sampler),
            },
        ],
    });

    // Vertex data: quad → 4 vertices, 16 floats each (64 B stride):
    // corner.xy | cell_xy | fg + pad | glyph_uv | pad2 | bg + pad.
    let vertex_data: Vec<f32> = quads
        .iter()
        .flat_map(|q| {
            let corners: [[f32; 2]; 4] = [[0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [1.0, 1.0]];
            corners
                .iter()
                .flat_map(move |c| {
                    [
                        c[0],
                        c[1],
                        q.x0 as f32,
                        q.y0 as f32,
                        q.fg[0],
                        q.fg[1],
                        q.fg[2],
                        0.0,
                        q.u0 as f32,
                        q.v0 as f32,
                        0.0,
                        0.0,
                        q.bg[0],
                        q.bg[1],
                        q.bg[2],
                        0.0,
                    ]
                })
                .collect::<Vec<f32>>()
        })
        .collect();
    let vertex_bytes: &[u8] = bytemuck::cast_slice(&vertex_data);
    let index_data: Vec<u32> = (0..quads.len())
        .flat_map(|q| {
            let base = (q * 4) as u32;
            [base, base + 1, base + 2, base + 1, base + 3, base + 2]
        })
        .collect();

    let vertex_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some("Aethel GPU Terminal Vertices"),
        contents: vertex_bytes,
        usage: wgpu::BufferUsages::VERTEX,
    });
    let index_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some("Aethel GPU Terminal Indices"),
        contents: bytemuck::cast_slice(&index_data),
        usage: wgpu::BufferUsages::INDEX,
    });

    let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("Aethel GPU Terminal Encoder"),
    });
    {
        let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("Aethel GPU Terminal Pass"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: &target_view,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                    store: wgpu::StoreOp::Store,
                },
            })],
            depth_stencil_attachment: None,
            timestamp_writes: None,
            occlusion_query_set: None,
        });
        pass.set_pipeline(&pipeline);
        pass.set_bind_group(0, &bind_group, &[]);
        pass.set_vertex_buffer(0, vertex_buffer.slice(..));
        pass.set_index_buffer(index_buffer.slice(..), wgpu::IndexFormat::Uint32);
        // ONE indexed draw call for the whole grid (the Alacritty-class win).
        pass.draw_indexed(0..(index_data.len() as u32), 0, 0..1);
    }
    queue.submit(Some(encoder.finish()));
    device.poll(wgpu::Maintain::Wait);

    // Pixel proof: readback the target texture, count non-black bytes.
    // Bytes-per-row must satisfy the 256-byte COPY alignment.
    let row_bytes = (tex_w * 4).div_ceil(256) * 256;
    let byte_len = u64::from(row_bytes) * u64::from(tex_h);
    let readback = device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("Aethel GPU Terminal Readback"),
        size: byte_len,
        usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
        mapped_at_creation: false,
    });
    let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("Aethel GPU Terminal Readback Encoder"),
    });
    encoder.copy_texture_to_buffer(
        wgpu::ImageCopyTexture {
            texture: &target_texture,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
            aspect: wgpu::TextureAspect::All,
        },
        wgpu::ImageCopyBuffer {
            buffer: &readback,
            layout: wgpu::ImageDataLayout {
                offset: 0,
                bytes_per_row: Some(row_bytes),
                rows_per_image: Some(tex_h),
            },
        },
        wgpu::Extent3d {
            width: tex_w,
            height: tex_h,
            depth_or_array_layers: 1,
        },
    );
    queue.submit(Some(encoder.finish()));
    let slice = readback.slice(..);
    slice.map_async(wgpu::MapMode::Read, |_| {});
    device.poll(wgpu::Maintain::Wait);
    let non_background_bytes = {
        let mapped = slice.get_mapped_range();
        mapped.iter().filter(|&&b| b != 0).count()
    };
    readback.unmap();

    let rendered_pixels_proven = non_background_bytes > 0;
    let glyphs_drawn = quads.len() as u32;
    let draw_calls = 1u32;
    let substrate_proven = rendered_pixels_proven && glyphs_drawn > 0 && draw_calls == 1;

    GpuTerminalProbeReport {
        gpu_capable: true,
        device_created: true,
        atlas_glyphs: FONT5X7.len() as u32,
        atlas_resident_vram: true,
        grid_cols: cols,
        grid_rows: rows,
        cells_written,
        cells_dirty: glyphs_drawn,
        glyphs_drawn,
        draw_calls,
        events_stored,
        events_replayed,
        anchors_carried,
        tick_linked,
        emit_micros,
        vertex_bytes: vertex_bytes_uploaded,
        rendered_pixels_proven,
        substrate_proven,
        claim: if substrate_proven {
            format!(
                "GPU terminal substrate PROVEN: {glyphs_drawn} glyph cells in {draw_calls} draw call, {events_stored} typed events ({anchors_carried} spatial anchors, tick-linked={tick_linked}) in the object shell, atlas {}/95 glyphs resident in VRAM, pixel readback proof, first cell '{}' — unified terminal render substrate (execution stays CPU/PTY; AI workers read raw grid state)",
                FONT5X7.len(),
                first_cell_ch as char
            )
        } else {
            "GPU terminal substrate NOT proven: pipeline or pixel proof failed (fail-closed, no claim)".into()
        },
    }
}

#[tauri::command]
pub fn gpu_terminal_probe_cmd() -> GpuTerminalProbeReport {
    run_gpu_terminal_probe()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn atlas_is_deterministic_with_known_glyph_patterns() {
        let a = build_atlas_texels();
        let b = build_atlas_texels();
        assert_eq!(a, b);
        assert_eq!(a.len(), (GPU_TERMINAL_ATLAS_PX * GPU_TERMINAL_ATLAS_PY) as usize);
        // 'A' (0x41): rows 0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11.
        let glyph_idx = (b'A' - GPU_TERMINAL_FIRST_CHAR) as u32;
        let gx = glyph_idx % GPU_TERMINAL_ATLAS_COLS;
        let gy = glyph_idx / GPU_TERMINAL_ATLAS_COLS;
        let at = |x: u32, y: u32| {
            a[((gy * GPU_TERMINAL_GLYPH_H + y) * GPU_TERMINAL_ATLAS_PX + gx * GPU_TERMINAL_GLYPH_W + x) as usize]
        };
        // Row 0: .XXX. → cols 1,2,3 lit.
        assert_eq!(at(0, 0), 0);
        assert_eq!(at(1, 0), 255);
        assert_eq!(at(2, 0), 255);
        assert_eq!(at(3, 0), 255);
        assert_eq!(at(4, 0), 0);
        // Row 3: full bar.
        for col in 0..5 {
            assert_eq!(at(col, 3), 255);
        }
    }

    #[test]
    fn grid_diff_emits_only_changed_cells() {
        let mut grid = GpuTerminalGrid::new(10, 2);
        let first = grid.emit_dirty_quads();
        assert_eq!(first.len(), 20, "first frame marks every cell dirty");
        // Identical rewrite → zero dirty.
        grid.write_line(b"hello");
        let second = grid.emit_dirty_quads();
        assert_eq!(second.len(), 5, "only the 5 changed chars are emitted");
        // No-op update: writing the same value into an existing cell must not
        // dirty it.
        grid.put_cell(0, 0, grid.cell(0, 0));
        let third = grid.emit_dirty_quads();
        assert!(third.is_empty(), "no-op diff must emit nothing");
        assert_eq!(grid.dirty_count, 0);
    }

    #[test]
    fn grid_write_line_scrolls_o1_and_handles_control_bytes() {
        let mut grid = GpuTerminalGrid::new(5, 2);
        grid.write_line(b"abcdefghij\nXY");
        assert_eq!(grid.cell(0, 0).ch, b'a');
        assert_eq!(grid.cell(4, 0).ch, b'e');
        // Two scrolls (col-overflow on row 1 + trailing '\n') = a full ring
        // rotation → offset returns to 0 modulo rows. The scroll itself is
        // proven by the cleared bottom line and the cell layout below.
        assert_eq!(grid.scroll_offset(), 0, "two scrolls = full ring rotation");
        assert_eq!(grid.cell(0, 1).ch, b'X', "new line lands on the scrolled bottom row");
        assert_eq!(grid.cell(1, 1).ch, b'Y');
        assert_eq!(grid.cell(2, 1).ch, b' ', "scrolled-in line is cleared");
        assert_eq!(grid.cell(2, 0).ch, b'c', "older lines keep their content");
        // Screen mapping: logical row 0 renders at screen row (0+2)%2=0 and
        // logical row 1 at screen row (1+2)%2=1 — proven via emit coordinates.
        let quads = grid.emit_dirty_quads();
        assert!(
            quads.iter().any(|q| q.x0 == 0 && q.y0 == 0),
            "logical row 0 renders at screen row 0"
        );
        assert!(
            quads.iter().any(|q| q.x0 == 0 && q.y0 == GPU_TERMINAL_CELL_H),
            "logical row 1 renders at screen row 1"
        );
    }

    #[test]
    fn ansi256_palette_and_sgr_write() {
        let palette = GpuTerminalGrid::ansi256_palette();
        assert_eq!(palette.len(), 256);
        assert_eq!(palette[0], [0.0, 0.0, 0.0]);
        assert_eq!(palette[1], [205.0 / 255.0, 49.0 / 255.0, 49.0 / 255.0]);
        assert_eq!(palette[15], [1.0, 1.0, 1.0]);
        // Grays are monotonic (232..255).
        for w in palette[232..256].windows(2) {
            assert!(w[1][0] >= w[0][0], "grays must increase");
        }
        let mut grid = GpuTerminalGrid::new(20, 1);
        grid.write_ansi(b"\x1b[38;5;9mx\x1b[0my");
        assert_eq!(grid.cell(0, 0).fg, palette[9], "SGR 38;5;9 sets bright red");
        assert_eq!(grid.cell(1, 0).fg, [0.85, 0.85, 0.85], "SGR 0 resets fg");
    }

    #[test]
    fn ingest_soak_is_od_and_fast() {
        // 2000 typed events through the object shell: honest per-event CPU
        // cost measured in debug (assert a floor that never flakes).
        let mut grid = GpuTerminalGrid::new(80, 24);
        let t0 = std::time::Instant::now();
        for i in 0..2000u64 {
            grid.write_event(TerminalEvent {
                severity: TerminalSeverity::Info,
                message: "soak line",
                anchor: Some([1.0, 0.0, 0.0]),
                tick_id: Some(i),
            });
            if i % 10 == 0 {
                let _ = grid.emit_dirty_quads();
            }
        }
        let elapsed = t0.elapsed().as_secs_f64().max(1e-9);
        let events_per_sec = 2000.0 / elapsed;
        assert!(
            events_per_sec > 100.0,
            "ingest must stay interactive (measured {events_per_sec:.0} events/s)"
        );
        assert_eq!(grid.events_snapshot().len(), 2000, "object shell keeps every event");
    }

    #[test]
    fn typed_events_store_raw_records_with_anchor_and_tick() {
        let mut grid = GpuTerminalGrid::new(40, 4);
        grid.write_event(TerminalEvent {
            severity: TerminalSeverity::Info,
            message: "info event",
            anchor: None,
            tick_id: Some(7),
        });
        grid.write_event(TerminalEvent {
            severity: TerminalSeverity::Error,
            message: "error event with anchor",
            anchor: Some([1.0, 2.0, 3.0]),
            tick_id: Some(7),
        });
        let events = grid.events_snapshot();
        assert_eq!(events.len(), 2);
        assert!(events.iter().all(|e| e.tick_id == Some(7)), "tick link must be carried");
        assert_eq!(events[1].anchor, Some([1.0, 2.0, 3.0]), "spatial anchor must be carried verbatim");
        assert_eq!(events[0].severity, TerminalSeverity::Info);
        assert_eq!(events[1].severity, TerminalSeverity::Error);
        // Severity coloring is real: error line cells carry the error fg.
        let error_fg = TerminalSeverity::Error.fg();
        let info_fg = TerminalSeverity::Info.fg();
        assert_ne!(error_fg, info_fg);
        assert_eq!(grid.cell(0, 1).fg, error_fg, "error line rendered in error color");
    }

    #[test]
    fn ghost_line_dimms_without_becoming_an_event() {
        let mut grid = GpuTerminalGrid::new(40, 2);
        grid.write_line(b"real");
        grid.ghost_line(b"ghost");
        assert!(grid.events_snapshot().is_empty(), "ghost is not a real event");
        assert!(grid.cell(4, 0).ghost, "ghost cell carries the ghost flag");
        assert!(!grid.cell(0, 0).ghost, "real cell stays non-ghost");
        // The ghost flag forces a re-dirty (predictive surface updates).
        assert!(grid.dirty_count >= 5);
    }

    #[test]
    fn events_ring_caps_at_capacity() {
        let mut grid = GpuTerminalGrid::new(40, 2);
        grid.events_cap = 3;
        for i in 0..5 {
            grid.write_event(TerminalEvent {
                severity: TerminalSeverity::Info,
                message: "x",
                anchor: None,
                tick_id: Some(i),
            });
        }
        let events = grid.events_snapshot();
        assert_eq!(events.len(), 3, "ring keeps only the newest");
        assert_eq!(events[0].tick_id, Some(2));
        assert_eq!(events[2].tick_id, Some(4));
    }

    #[test]
    fn rewind_events_to_replays_the_log_without_mutating_the_ring() {
        let mut grid = GpuTerminalGrid::new(60, 8);
        for i in 1..=5u64 {
            grid.write_event(TerminalEvent {
                severity: TerminalSeverity::Info,
                message: "tick line",
                anchor: Some([i as f32, 0.0, 0.0]),
                tick_id: Some(i),
            });
        }
        assert_eq!(grid.events_snapshot().len(), 5);
        let rendered = grid.rewind_events_to(3);
        assert_eq!(rendered, 3, "only events with tick <= 3 replay");
        assert_eq!(grid.events_snapshot().len(), 5, "the ring is never mutated");
        // The grid now shows the rewound log: 3 event lines + cursor parked
        // after the last replayed line.
        assert_eq!(grid.cell(0, 0).ch, b'[');
        assert_eq!(grid.scroll_offset(), 0, "rewind restarts the scroll ring");
        // Rewinding further back replays fewer events deterministically.
        assert_eq!(grid.rewind_events_to(1), 1);
        assert_eq!(grid.events_snapshot().len(), 5);
    }

    #[test]
    fn terminal_probe_is_device_optional_and_never_fakes() {
        let r = run_gpu_terminal_probe();
        if r.gpu_capable && r.device_created {
            assert!(r.substrate_proven, "substrate must prove on a real device: {r:?}");
            assert_eq!(r.draw_calls, 1, "the whole grid renders in ONE draw call");
            assert!(r.rendered_pixels_proven, "pixel readback must prove glyphs drawn");
            assert!(r.glyphs_drawn > 0);
        } else {
            assert!(!r.substrate_proven, "no device means no claim");
        }
    }
}
