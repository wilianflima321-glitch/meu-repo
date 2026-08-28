/**
 * _audit_wire_depth.js — S-11 R0 depth audit of the kernel wire orphans.
 *
 * Anti-Hallucination Protocol: this script MEASURES real disk state; it never
 * hardcodes conclusions. It:
 *   1. Parses the source-of-truth registry (packages/aethel-kernel-rust/src/kernel_registry.rs)
 *      for {wire_module, kernel_module, letter, status} per wire.
 *   2. Cross-checks the registry against the actual files on disk (a mini
 *      wire-check — same invariant R1's `xtask wire-check` will enforce).
 *   3. Measures depth-of-functioning for every wire:
 *        - wire file line count (studio)
 *        - kernel module line count (kernel pkg)  ← real-solver-vs-stub proxy
 *        - presence of `*SoakReport` struct, `run_*_soak`, `*_ready` / `*_aaa_ready`
 *        - presence of a `mod tests` module
 *        - presence of a documented letter
 *   4. Classifies each wire as Deep / Medium / Shallow and flags stubs.
 *
 * Output: full per-wire table + a distribution summary (printed to stdout).
 *
 * Usage:  node _audit_wire_depth.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REGISTRY = path.join(ROOT, 'packages', 'aethel-kernel-rust', 'src', 'kernel_registry.rs');
const STUDIO_SRC = path.join(ROOT, 'apps', 'studio-local', 'src-tauri', 'src');
const KERNEL_SRC = path.join(ROOT, 'packages', 'aethel-kernel-rust', 'src');

/** Parse registry entries: {wire_module, kernel_module, letter, status}[] */
function parseRegistry(regText) {
  const entries = [];
  const re = /KernelWireEntry\s*\{([\s\S]*?)\n\s*\},/g;
  let m;
  while ((m = re.exec(regText)) !== null) {
    const body = m[1];
    const get = (key) => {
      const km = new RegExp(key + ':\\s*"([^"]*)"').exec(body);
      return km ? km[1] : '';
    };
    const st = /status:\s*WireStatus::(\w+)/.exec(body);
    entries.push({
      wire_module: get('wire_module'),
      kernel_module: get('kernel_module'),
      letter: get('letter'),
      status: st ? st[1] : 'Unknown',
    });
  }
  return entries.filter((e) => e.wire_module.length > 0);
}

/** File line count (0 if missing). */
function lineCount(p) {
  try {
    const t = fs.readFileSync(p, 'utf8');
    return t.split('\n').length;
  } catch (_) {
    return 0;
  }
}

/** Read text ('' if missing). */
function read(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (_) {
    return '';
  }
}

function has(needle, text) {
  return needle.some((n) => text.includes(n));
}

function main() {
  const regText = read(REGISTRY);
  if (!regText) {
    console.error('FATAL: registry not found: ' + REGISTRY);
    process.exit(1);
  }
  const registry = parseRegistry(regText);

  // --- 1. Disk reality: all kernel_*_wire.rs files present ---
  const wireFiles = fs
    .readdirSync(STUDIO_SRC)
    .filter((f) => /^kernel_.*_wire\.rs$/.test(f))
    .map((f) => f.replace(/\.rs$/, ''))
    .sort();

  const registryModules = new Set(registry.map((e) => e.wire_module));
  const diskModules = new Set(wireFiles);

  // Wires on disk but missing from registry (R1 fail-closed violation).
  const missingFromRegistry = wireFiles.filter((w) => !registryModules.has(w));
  // Wires in registry but missing on disk (phantom entries).
  const phantomInRegistry = registry.filter((e) => !diskModules.has(e.wire_module));

  // --- 2. Depth measurement per wire ---
  const rows = [];
  for (const e of registry) {
    const wirePath = path.join(STUDIO_SRC, e.wire_module + '.rs');
    const kernelPath = path.join(KERNEL_SRC, e.kernel_module + '.rs');
    const wireText = read(wirePath);
    const kernelText = read(kernelPath);

    const wireLines = wireText ? wireText.split('\n').length : 0;
    const kernelLines = kernelText ? kernelText.split('\n').length : 0;

    const hasSoakReport = has([`SoakReport`], kernelText) || has([`ProbeReport`], kernelText);
    const hasSoakFn = has([`run_${e.kernel_module}_soak`, 'fn run_', 'fn probe_'], kernelText);
    const hasTests = has(['mod tests'], kernelText);
    const hasReady = has(['_ready', '_aaa_ready', 'ready:'], kernelText);
    const hasHelds = has(['_held', 'held:'], kernelText);
    const hasLetter = e.letter.length > 0;
    const hasEvidence = has(['evidence_fingerprint', 'fingerprint'], kernelText);

    // Depth classification (evidence-first, conservative).
    let depth = 'Shallow';
    if (kernelLines >= 300 && hasSoakReport && hasTests) depth = 'Deep';
    else if (kernelLines >= 100 && (hasSoakReport || hasTests)) depth = 'Medium';

    // A wire that is only a thin probe with NO kernel-side real solver (empty
    // or tiny kernel module) is a genuine STUB risk.
    const stubRisk =
      e.status !== 'Active' && (kernelLines < 60 || (!hasSoakReport && !hasTests && kernelLines < 150));

    rows.push({
      wire_module: e.wire_module,
      kernel_module: e.kernel_module,
      letter: e.letter || '—',
      status: e.status,
      wireLines,
      kernelLines,
      hasSoakReport,
      hasSoakFn,
      hasTests,
      hasReady,
      hasHelds,
      hasEvidence,
      hasLetter,
      depth,
      stubRisk,
    });
  }

  rows.sort((a, b) => a.kernelLines - b.kernelLines); // shallowest first

  // --- 3. Summary ---
  const counts = { Deep: 0, Medium: 0, Shallow: 0 };
  for (const r of rows) counts[r.depth]++;
  const stubRows = rows.filter((r) => r.stubRisk);
  const active = rows.filter((r) => r.status === 'Active');
  const wires = rows.filter((r) => r.status === 'Wire');
  const held = rows.filter((r) => r.status === 'Held');

  console.log('=== S-11 R0 WIRE DEPTH AUDIT (measured, never assumed) ===\n');
  console.log(`Registry entries parsed:        ${registry.length}`);
  console.log(`Wire files on disk (studio):    ${wireFiles.length}`);
  console.log(`Wires on disk MISSING from registry: ${missingFromRegistry.length} ${missingFromRegistry.length ? '→ ' + missingFromRegistry.join(', ') : ''}`);
  console.log(`Phantom registry entries (no file):  ${phantomInRegistry.length} ${phantomInRegistry.length ? '→ ' + phantomInRegistry.map((p) => p.wire_module).join(', ') : ''}`);
  console.log(`Status distribution: Active=${active.length} Wire=${wires.length} Held=${held.length}`);
  console.log(`Wires with documented letter:  ${rows.filter((r) => r.hasLetter).length}`);
  console.log(`Wires missing letter:          ${rows.filter((r) => !r.hasLetter).length}`);
  console.log(`\nDepth distribution (kernel-module line-count based):`);
  console.log(`  Deep   (>=300L + soak report + tests): ${counts.Deep}`);
  console.log(`  Medium (>=100L + soak or tests):       ${counts.Medium}`);
  console.log(`  Shallow (<100L or no soak/tests):      ${counts.Shallow}`);
  console.log(`  STUB-RISK wires (thin kernel substrate): ${stubRows.length}\n`);

  if (stubRows.length) {
    console.log('--- STUB-RISK wires (need deepening or unification) ---');
    for (const r of stubRows) {
      console.log(
        `  ${r.wire_module}  →  ${r.kernel_module}.rs (${r.kernelLines}L, letter ${r.letter}, soakReport=${r.hasSoakReport} tests=${r.hasTests})`
      );
    }
    console.log('');
  }

  console.log('--- FULL TABLE (shallowest first) ---');
  console.log(
    'wire | kernel | L(wire) | L(kernel) | soak | tests | evidence | letter | status | depth | stub'
  );
  for (const r of rows) {
    console.log(
      `${r.wire_module} | ${r.kernel_module}.rs | ${r.wireLines} | ${r.kernelLines} | ${r.hasSoakReport ? 'Y' : 'n'} | ${r.hasTests ? 'Y' : 'n'} | ${r.hasEvidence ? 'Y' : 'n'} | ${r.letter} | ${r.status} | ${r.depth} | ${r.stubRisk ? 'STUB' : ''}`
    );
  }
}

main();
