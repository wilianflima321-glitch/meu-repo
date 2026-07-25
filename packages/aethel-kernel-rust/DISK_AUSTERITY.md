# Kernel Rust disk austerity (CW7)

Use a single cargo target on **E:** for this workstation.

| Setting | Value |
|---------|--------|
| Target dir | `E:\aethel-target-gnu` |
| Env var | `CARGO_TARGET_DIR=E:\aethel-target-gnu` |

```powershell
$env:CARGO_TARGET_DIR = "E:\aethel-target-gnu"
cd "E:\Aethel engine\packages\aethel-kernel-rust"
cargo check
cargo test --lib
```

Optional local cargo config (same pattern as studio-local — **gitignored** `config.toml`):

```powershell
New-Item -ItemType Directory -Force -Path "E:\Aethel engine\packages\aethel-kernel-rust\.cargo" | Out-Null
@"
[build]
target-dir = "E:/aethel-target-gnu"
"@ | Set-Content -Encoding utf8 "E:\Aethel engine\packages\aethel-kernel-rust\.cargo\config.toml"
```

See also `apps/studio-local/src-tauri/DISK_AUSTERITY.md` + `.cargo/config.toml.example`.
Do not invent new exotic kernel modules during Consolidation Wave (CW0 freeze).
Do not claim CW7 DONE without orphan prune + CAS cook + CI-enforced single target.
