// One-off R0 measurement: extract (wire_module, letter, reachability) for S-11 registry.
// Reads studio lib.rs for `pub mod kernel_*_wire;` + letter doc comments, and main.rs for reachability.
const fs = require('fs');
const path = require('path');

const LIB_PATH = 'apps/studio-local/src-tauri/src/lib.rs';
const SRC_DIR = 'apps/studio-local/src-tauri/src';
const MAIN_PATH = 'apps/studio-local/src-tauri/src/main.rs';

const lib = fs.readFileSync(LIB_PATH, 'utf8');
const libLines = lib.split('\n');

const wires = [];
for (let i = 0; i < libLines.length; i++) {
  const m = libLines[i].match(/^pub mod (kernel_\w+_wire);/);
  if (!m) continue;
  const moduleName = m[1];
  let letter = '';
  for (let j = i - 1; j >= 0 && j >= i - 12; j--) {
    const lm = libLines[j].match(/letter\s*\*\*([\w.]+)\*\*/i);
    if (lm) { letter = lm[1]; break; }
    if (j < i - 12) break;
  }
  if (!letter) {
    const fp = path.join(SRC_DIR, moduleName + '.rs');
    if (fs.existsSync(fp)) {
      const head = fs.readFileSync(fp, 'utf8').split('\n').slice(0, 12).join('\n');
      const hm = head.match(/letter\s*\*\*([\w.]+)\*\*/i);
      if (hm) letter = hm[1];
    }
  }
  wires.push({ module: moduleName, letter: letter || '?' });
}

const main = fs.readFileSync(MAIN_PATH, 'utf8');
const reachable = new Set();
for (const m of main.matchAll(/aethel_studio_local::(kernel_\w+_wire)::/g)) {
  reachable.add(m[1]);
}
const globM = main.match(/use aethel_studio_local::(kernel_\w+_wire)::\*/);
if (globM) reachable.add(globM[1]);

wires.sort((a, b) => a.module.localeCompare(b.module));
const out = [];
for (const w of wires) {
  out.push(`${w.module}\t${w.letter}\t${reachable.has(w.module) ? 'REACHABLE' : 'ORPHAN'}`);
}
console.log(out.join('\n'));
console.log('TOTAL\t' + wires.length);
console.log('REACHABLE_COUNT\t' + reachable.size);
console.log('ORPHAN_COUNT\t' + (wires.length - reachable.size));
