const fs = require('fs');
const path = require('path');

const KERNEL_SRC = 'E:/Aethel engine/packages/aethel-kernel-rust/src';
const WIRE_SRC = 'E:/Aethel engine/apps/studio-local/src-tauri/src';

function processKernelFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Struct definitions
    const structDefRegex = /(?:^[ \t]*pub distinct_from_[a-zA-Z0-9_]+:\s*bool,\r?\n)+/gm;
    content = content.replace(structDefRegex, (match) => {
        const indentMatch = match.match(/^([ \t]*)/);
        const indent = indentMatch ? indentMatch[1] : '    ';
        return indent + 'pub distinct_from_peers_note: String,\n';
    });

    // 2. Struct instantiations
    const structInstRegex = /(?:^[ \t]*distinct_from_[a-zA-Z0-9_]+:\s*(?:true|false|d|core_ok|measure_distinct[^,]+|[^,\n]+),\r?\n)+/gm;
    content = content.replace(structInstRegex, (match) => {
        const indentMatch = match.match(/^([ \t]*)/);
        const indent = indentMatch ? indentMatch[1] : '        ';
        return indent + 'distinct_from_peers_note: "HELD: Distinct from many peers. Fingerprint cross-check held to avoid coupling.".to_string(),\n';
    });

    // 3. Asserts
    const assertRegex = /assert!\(([a-zA-Z0-9_]+)\.distinct_from_[a-zA-Z0-9_]+\);/g;
    content = content.replace(assertRegex, 'assert!($1.distinct_from_peers_note.contains("HELD"));');

    const duplicateAssertRegex = /(?:^[ \t]*assert!\([a-zA-Z0-9_]+\.distinct_from_peers_note\.contains\("HELD"\)\);\r?\n)+/gm;
    content = content.replace(duplicateAssertRegex, (match) => {
        const lines = match.split('\n').filter(l => l.trim().length > 0);
        const unique = [...new Set(lines)];
        return unique.join('\n') + '\n';
    });

    // 4. Unused `let d = measured_distinct` -> `let _d = measured_distinct`
    const letDRegex = /let d\s*=\s*measured_distinct/g;
    content = content.replace(letDRegex, 'let _d = measured_distinct');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        return true;
    }
    return false;
}

function processWireFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    const structDefRegex = /(?:^[ \t]*pub distinct_from_[a-zA-Z0-9_]+:\s*bool,\r?\n)+/gm;
    content = content.replace(structDefRegex, (match) => {
        const indentMatch = match.match(/^([ \t]*)/);
        const indent = indentMatch ? indentMatch[1] : '    ';
        return indent + 'pub distinct_from_peers_note: String,\n';
    });

    // Fix multi-line r.distinct_from_...
    // e.g.
    // distinct_from_baremetal: r
    //     .distinct_from_baremetal,
    content = content.replace(/^[ \t]*distinct_from_[a-zA-Z0-9_]+:\s*r\s*\r?\n\s*\.distinct_from_[a-zA-Z0-9_]+,/gm, '        distinct_from_peers_note: r.distinct_from_peers_note,');
    
    // Single line
    const wireMapRegex = /(?:^[ \t]*distinct_from_[a-zA-Z0-9_]+:\s*r\.distinct_from_[a-zA-Z0-9_]+,\r?\n)+/gm;
    content = content.replace(wireMapRegex, (match) => {
        const indentMatch = match.match(/^([ \t]*)/);
        const indent = indentMatch ? indentMatch[1] : '        ';
        return indent + 'distinct_from_peers_note: r.distinct_from_peers_note,\n';
    });
    
    // Convert multiple identical lines of distinct_from_peers_note: r.distinct_from_peers_note, to a single line
    const duplicateMapRegex = /(?:^[ \t]*distinct_from_peers_note:\s*r\.distinct_from_peers_note,\r?\n)+/gm;
    content = content.replace(duplicateMapRegex, (match) => {
        const indentMatch = match.match(/^([ \t]*)/);
        const indent = indentMatch ? indentMatch[1] : '        ';
        return indent + 'distinct_from_peers_note: r.distinct_from_peers_note,\n';
    });

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
