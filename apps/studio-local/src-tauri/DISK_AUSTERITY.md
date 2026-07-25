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
cargo test
```

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
