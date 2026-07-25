# Studio-local disk austerity (CW7)

This workstation keeps **C:** near-full. Do **not** let Cargo write `target/` under `C:\Users\...`.

## Canonical target (binding for local Windows)

| Setting | Value |
|---------|--------|
| Target dir | `E:\aethel-target-gnu` |
| Env var | `CARGO_TARGET_DIR=E:\aethel-target-gnu` |
| Example config | `.cargo/config.toml.example` |
| Local override | `.cargo/config.toml` (**gitignored** — never commit) |

## One-time setup (Windows workstation)

```powershell
# 1) Prefer env (safe for CI / Linux — set only in your shell profile)
$env:CARGO_TARGET_DIR = "E:\aethel-target-gnu"

# 2) Optional: local cargo config (gitignored; CI never sees E:)
New-Item -ItemType Directory -Force -Path "E:\Aethel engine\apps\studio-local\src-tauri\.cargo" | Out-Null
Copy-Item `
  "E:\Aethel engine\apps\studio-local\src-tauri\.cargo\config.toml.example" `
  "E:\Aethel engine\apps\studio-local\src-tauri\.cargo\config.toml" `
  -Force
```

Example contents (already in `.cargo/config.toml.example`):

```toml
[build]
target-dir = "E:/aethel-target-gnu"
```

**CI rule:** do not commit `config.toml` with an absolute `E:` path. Linux agents use default `target/` or their own `CARGO_TARGET_DIR`. Root `.gitignore` ignores `**/.cargo/config.toml` and allows `config.toml.example`.

## Required for local Rust builds

```powershell
$env:CARGO_TARGET_DIR = "E:\aethel-target-gnu"
cd "E:\Aethel engine\apps\studio-local\src-tauri"
cargo check
cargo clippy -- -D warnings
cargo test --lib -- --test-threads=1
```

**`--test-threads=1` is required, not optional**, on this crate's `--lib` suite: several
`kernel_*_wire` / `wgpu_renderer` / `gpu_culling` tests request a real `wgpu` adapter/device
against the physical GPU. Running them concurrently (the default multi-threaded harness)
causes intermittent multi-minute hangs from driver-level contention when two threads race
to acquire the adapter at once — not a logic bug, confirmed by the identical suite completing
in ~3s single-threaded with 53/53 passing vs. hanging indefinitely multi-threaded. Do not
"fix" this by weakening a test; keep `--test-threads=1` for this crate's `cargo test` invocations
(CI and local).

Kernel package:

```powershell
$env:CARGO_TARGET_DIR = "E:\aethel-target-gnu"
cd "E:\Aethel engine\packages\aethel-kernel-rust"
cargo test --lib
```

## Do not

- Download large ONNX / weight dumps without Founder drop + content-addressed cache
- Duplicate `target/` trees across probe-letter suffixes unless isolating a soak (`E:\aethel-target-gnu-*` orphans may be pruned when unused)
- Delete user project data under `E:\` or Documents — only unused cargo target trees
- Claim CW7 DONE without orphan prune + CAS cook + CI-enforced single target
