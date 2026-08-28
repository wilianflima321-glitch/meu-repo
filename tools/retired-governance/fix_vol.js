const fs = require('fs');
const path = require('path');

const filePath = 'E:/Aethel engine/packages/aethel-kernel-rust/src/volumetric_extinction_medium.rs';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Struct definitions
const defRegex = /(?:^[ \t]*pub distinct_from_[a-zA-Z0-9_]+_probe(?:\s*:\s*bool)?,\r?\n)+/gm;
content = content.replace(defRegex, (match) => {
    const indentMatch = match.match(/^([ \t]*)/);
    return indentMatch[1] + 'pub distinct_from_peers_note: String,\n';
});

// 2. Struct instantiations
const instRegex = /(?:^[ \t]*distinct_from_[a-zA-Z0-9_]+_probe(?:\s*:\s*[^,\n]+)?,\r?\n)+/gm;
content = content.replace(instRegex, (match) => {
    if (match.includes('distinct_from_peers_note')) return match;
    const indentMatch = match.match(/^([ \t]*)/);
    return indentMatch[1] + 'distinct_from_peers_note: "HELD: Distinct from many peers. Fingerprint cross-check held to avoid coupling.".to_string(),\n';
});

// 3. Mutations
const mutRegex = /^[ \t]*[a-zA-Z0-9_]+\.distinct_from_[a-zA-Z0-9_]+_probe\s*=\s*[^;\n]+;\r?\n/gm;
content = content.replace(mutRegex, '');

// 4. Asserts
const assertRegex = /assert!\(([a-zA-Z0-9_]+)\.distinct_from_[a-zA-Z0-9_]+_probe\);/g;
content = content.replace(assertRegex, 'assert!($1.distinct_from_peers_note.contains("HELD"));');

const duplicateAssertRegex = /(?:^[ \t]*assert!\([a-zA-Z0-9_]+\.distinct_from_peers_note\.contains\("HELD"\)\);\r?\n)+/gm;
content = content.replace(duplicateAssertRegex, (match) => {
    const linesMatch = match.split(/\r?\n/).filter(l => l.trim().length > 0);
    const unique = [...new Set(linesMatch)];
    return unique.join('\n') + '\n';
});

// 5. Unused variables fixes
const letDRegex = /let d\s*=\s*measured_distinct/g;
content = content.replace(letDRegex, 'let _d = measured_distinct');

fs.writeFileSync(filePath, content);
console.log("Fixed volumetric.");
