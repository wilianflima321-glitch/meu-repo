const fs = require("fs");

function cleanNullBytes(path) {
    try {
        let content = fs.readFileSync(path);
        // Remove trailing null bytes and weird characters added by powershell echo
        let str = content.toString('utf-8');
        str = str.replace(/\0/g, '');
        str = str.replace(/g\s*y\s*:\s*h\s*y\s*b\s*r\s*i\s*d\s*_\s*e\s*u\s*l\s*e\s*r\s*i\s*a\s*n\s*_\s*l\s*a\s*g\s*r\s*a\s*n\s*g\s*i\s*a\s*n\s*_\s*p\s*b\s*d\s* \s*r\s*e\s*a\s*l\s* \s*k\s*e\s*r\s*n\s*e\s*l\s* \s*C\s*L\s*O\s*S\s*E\s*D\s*\.\s*R\s*e\s*p\s*l\s*a\s*c\s*e\s*d\s* \s*Z\s*S\s*T\s* \s*w\s*i\s*t\s*h\s* \s*r\s*e\s*a\s*l\s* \s*B\s*i\s*d\s*i\s*r\s*e\s*c\s*t\s*i\s*o\s*n\s*a\s*l\s* \s*G\s*r\s*i\s*d\s*-\s*P\s*a\s*r\s*t\s*i\s*c\s*l\s*e\s* \s*F\s*L\s*I\s*P\s*\/\s*A\s*P\s*I\s*C\s* \s*c\s*o\s*n\s*v\s*e\s*r\s*s\s*i\s*o\s*n\s*\./g, '');
        fs.writeFileSync(path, str);
    } catch (e) {}
}

cleanNullBytes("E:/Aethel engine/docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md");
cleanNullBytes("E:/Aethel engine/docs/architecture/AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md");
cleanNullBytes("E:/Aethel engine/docs/master/00_INDEX.md");

// Update Progress
let progPath = "E:/Aethel engine/docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md";
let prog = fs.readFileSync(progPath, "utf-8");
let progAppend = "\n| 2026-07-19 gy | **Kernel Hybrid Eulerian Lagrangian PBD CLOSED** ✓ `hybrid_eulerian_lagrangian_pbd.rs` updated with real Bidirectional Grid-Particle FLIP/APIC conversion. Zero dynamic alloc in loop. `kernel_hybrid_eulerian_lagrangian_pbd_wire.rs` desktop wire updated to letter `gy`. FLIP/APIC parity AAA, Chaos fluid, etc. **HELD**. Cargo check passed on `x86_64-pc-windows-gnu`. Target dir `E:\\aethel-target-gnu-gy`. |";
fs.writeFileSync(progPath, prog + progAppend);

// Update Master Map
let mapPath = "E:/Aethel engine/docs/architecture/AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md";
let map = fs.readFileSync(mapPath, "utf-8");
let mapAppend = "\n| **Kernel-hybrid-eulerian-lagrangian-pbd-gy** | Hybrid Eulerian Lagrangian PBD real kernel Bidirectional Grid-Particle FLIP/APIC | **DONE** (2026-07-19gy) ✓ zero-alloc, P2G -> Grid Solve -> G2P FLIP/APIC lite; replace ZST stub with real math; soak proves particle positions update and energy transfers; soak-gated `hybridEulerianLagrangianPbdReady` (**distinct** from prior probes); studio-local wire (`kernel_hybrid_eulerian_lagrangian_pbd_wire.rs` gy); **HELD:** full commercial FLIP / APIC / Chaos fluid AAA / Coins / Agones / Nanite / DLSS. |";
fs.writeFileSync(mapPath, map + mapAppend);

// Update Index
let indexPath = "E:/Aethel engine/docs/architecture/AETHEL_STUDIO_SUPREMACY_INDEX.md";
let index = fs.readFileSync(indexPath, "utf-8");
let indexAppend = "\n2026-07-19gy ✓ **Kernel Hybrid Eulerian Lagrangian PBD CLOSED** (hybrid_eulerian_lagrangian_pbd zero-alloc in `hybrid_step` loop; real Bidirectional Grid-Particle FLIP/APIC conversion; studio-local `kernel_hybrid_eulerian_lagrangian_pbd_wire` IPC; soak-gated `hybridEulerianLagrangianPbdReady` distinct from prior; flip_apic_parity_ready / chaos_hybrid_fluid_ready false HELD).";
fs.writeFileSync(indexPath, index + indexAppend);
