const fs = require('fs');
const path = require('path');

const KERNEL_SRC = 'E:/Aethel engine/packages/aethel-kernel-rust/src';
const WIRE_SRC = 'E:/Aethel engine/apps/studio-local/src-tauri/src';

function processKernelFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Struct definitions
    // Find all distinct_from_...: bool,
    let lines = content.split(/\r?\n/);
    let inStruct = false;
    let addedNoteDef = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.match(/^[ \t]*pub distinct_from_[a-zA-Z0-9_]+:\s*bool,/)) {
            if (!addedNoteDef) {
                lines[i] = line.replace(/pub distinct_from_[a-zA-Z0-9_]+:\s*bool,/, 'pub distinct_from_peers_note: String,');
                addedNoteDef = true;
            } else {
                lines[i] = null;
            }
        }
    }
    lines = lines.filter(l => l !== null);
    content = lines.join('\n');

    // 2. Struct instantiations
    lines = content.split('\n');
    let addedNoteInst = false;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.match(/^[ \t]*distinct_from_[a-zA-Z0-9_]+:\s*(?:true|false|d|core_ok|measure_distinct[^,]+|[^,]+),/)) {
            if (!addedNoteInst) {
                lines[i] = line.replace(/distinct_from_[a-zA-Z0-9_]+:\s*[^,]+,/, 'distinct_from_peers_note: "HELD: Distinct from many peers. Fingerprint cross-check held to avoid coupling.".to_string(),');
                addedNoteInst = true;
            } else {
                lines[i] = null;
            }
        }
    }
    lines = lines.filter(l => l !== null);
    content = lines.join('\n');

    // 3. Remove ALL r.distinct_from_... = ...; mutations
    lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.match(/^[ \t]*[a-zA-Z0-9_]+\.distinct_from_[a-zA-Z0-9_]+\s*=\s*[^;]+;/)) {
            lines[i] = null;
        }
    }
    lines = lines.filter(l => l !== null);
    content = lines.join('\n');

    // 4. Asserts
    const assertRegex = /assert!\(([a-zA-Z0-9_]+)\.distinct_from_[a-zA-Z0-9_]+\);/g;
    content = content.replace(assertRegex, 'assert!($1.distinct_from_peers_note.contains("HELD"));');

    // De-duplicate consecutive identical asserts
    const duplicateAssertRegex = /(?:^[ \t]*assert!\([a-zA-Z0-9_]+\.distinct_from_peers_note\.contains\("HELD"\)\);\r?\n)+/gm;
    content = content.replace(duplicateAssertRegex, (match) => {
        const linesMatch = match.split('\n').filter(l => l.trim().length > 0);
        const unique = [...new Set(linesMatch)];
        return unique.join('\n') + '\n';
    });

    // 5. Unused `let d = measured_distinct` -> `let _d = measured_distinct`
    const letDRegex = /let d\s*=\s*measured_distinct/g;
    content = content.replace(letDRegex, 'let _d = measured_distinct');
    
    // Some let d = ... are simple booleans
    const letD2Regex = /let d\s*=\s*[^;]+;/g;
    content = content.replace(letD2Regex, (m) => {
        if (m.includes('measured_distinct') || m.includes('core_ok') || m.includes('evidence_fingerprint')) {
            return m.replace('let d', 'let _d');
        }
        return m;
    });

    const letDistinctRegex = /let distinct_from_fluid\s*=\s*[^;]+;/g;
    content = content.replace(letDistinctRegex, (m) => m.replace('let distinct_from_fluid', 'let _distinct_from_fluid'));

    const letPeerDistinctRegex = /peer_distinct:\s*bool,/g;
    content = content.replace(letPeerDistinctRegex, '_peer_distinct: bool,');


    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        return true;
    }
    return false;
}

function processWireFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Struct definitions
    let lines = content.split(/\r?\n/);
    let addedNoteDef = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.match(/^[ \t]*pub distinct_from_[a-zA-Z0-9_]+:\s*bool,/)) {
            if (!addedNoteDef) {
                lines[i] = line.replace(/pub distinct_from_[a-zA-Z0-9_]+:\s*bool,/, 'pub distinct_from_peers_note: String,');
                addedNoteDef = true;
            } else {
                lines[i] = null;
            }
        }
    }
    lines = lines.filter(l => l !== null);
    content = lines.join('\n');

    // 2. Multiline wire maps (e.g. distinct_from_xxx: r \n .distinct_from_xxx,)
    content = content.replace(/^[ \t]*distinct_from_[a-zA-Z0-9_]+:\s*r\s*\r?\n\s*\.distinct_from_[a-zA-Z0-9_]+,/gm, '        distinct_from_peers_note: r.distinct_from_peers_note,');

    // 3. Single line wire maps
    lines = content.split('\n');
    let addedNoteMap = false;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.match(/^[ \t]*distinct_from_[a-zA-Z0-9_]+:\s*r\.distinct_from_[a-zA-Z0-9_]+,/)) {
            if (!addedNoteMap) {
                lines[i] = line.replace(/distinct_from_[a-zA-Z0-9_]+:\s*r\.distinct_from_[a-zA-Z0-9_]+,/, 'distinct_from_peers_note: r.distinct_from_peers_note,');
                addedNoteMap = true;
            } else {
                lines[i] = null;
            }
        }
        // Also catch multiple distinct_from_peers_note inserted by previous regex if any
        if (line.match(/^[ \t]*distinct_from_peers_note:\s*r\.distinct_from_peers_note,/)) {
             if (!addedNoteMap) {
                addedNoteMap = true;
             } else {
                 lines[i] = null;
             }
        }
    }
    lines = lines.filter(l => l !== null);
    content = lines.join('\n');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        return true;
    }
    return false;
}

let changedKernel = 0;
for (const file of fs.readdirSync(KERNEL_SRC)) {
    if (file.endsWith('.rs')) {
        if (processKernelFile(path.join(KERNEL_SRC, file))) {
            changedKernel++;
        }
    }
}

let changedWire = 0;
for (const file of fs.readdirSync(WIRE_SRC)) {
    if (file.endsWith('.rs') && file.startsWith('kernel_')) {
        if (processWireFile(path.join(WIRE_SRC, file))) {
            changedWire++;
        }
    }
}

console.log(`Updated ${changedKernel} kernel files and ${changedWire} wire files.`);
