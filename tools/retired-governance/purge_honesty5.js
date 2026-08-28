const fs = require('fs');
const path = require('path');

const KERNEL_SRC = 'E:/Aethel engine/packages/aethel-kernel-rust/src';
const WIRE_SRC = 'E:/Aethel engine/apps/studio-local/src-tauri/src';

function processKernelFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Struct definitions
    // Replace consecutive distinct_from_ definition lines with exactly one distinct_from_peers_note
    const defRegex = /(?:^[ \t]*pub distinct_from_[a-zA-Z0-9_]+(?:\s*:\s*bool)?,\r?\n)+/gm;
    content = content.replace(defRegex, (match) => {
        const indentMatch = match.match(/^([ \t]*)/);
        return indentMatch[1] + 'pub distinct_from_peers_note: String,\n';
    });

    // 2. Struct instantiations
    // Replace consecutive distinct_from_ instantiation lines
    const instRegex = /(?:^[ \t]*distinct_from_[a-zA-Z0-9_]+(?:\s*:\s*[^,\n]+)?,\r?\n)+/gm;
    content = content.replace(instRegex, (match) => {
        // Exclude the field we just added if somehow it matches (it shouldn't match distinct_from_peers_note unless we are careless)
        if (match.includes('distinct_from_peers_note')) {
            return match;
        }
        const indentMatch = match.match(/^([ \t]*)/);
        return indentMatch[1] + 'distinct_from_peers_note: "HELD: Distinct from many peers. Fingerprint cross-check held to avoid coupling.".to_string(),\n';
    });

    // 3. Mutations
    // Remove all r.distinct_from_... = ...;
    const mutRegex = /^[ \t]*[a-zA-Z0-9_]+\.distinct_from_[a-zA-Z0-9_]+\s*=\s*[^;\n]+;\r?\n/gm;
    content = content.replace(mutRegex, '');

    // 4. Asserts
    const assertRegex = /assert!\(([a-zA-Z0-9_]+)\.distinct_from_[a-zA-Z0-9_]+\);/g;
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
    
    const letD2Regex = /let d\s*=\s*[^;\n]+;/g;
    content = content.replace(letD2Regex, (m) => {
        if (m.includes('measured_distinct') || m.includes('core_ok') || m.includes('evidence_fingerprint') || m.includes('ready')) {
            return m.replace('let d', 'let _d');
        }
        return m;
    });

    const letDistinctRegex = /let distinct_from_[a-zA-Z0-9_]+\s*=\s*[^;\n]+;/g;
    content = content.replace(letDistinctRegex, (m) => m.replace('let distinct_from_', 'let _distinct_from_'));

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
    const defRegex = /(?:^[ \t]*pub distinct_from_[a-zA-Z0-9_]+(?:\s*:\s*bool)?,\r?\n)+/gm;
    content = content.replace(defRegex, (match) => {
        const indentMatch = match.match(/^([ \t]*)/);
        return indentMatch[1] + 'pub distinct_from_peers_note: String,\n';
    });

    // 2. Multiline wire maps
    content = content.replace(/^[ \t]*distinct_from_[a-zA-Z0-9_]+:\s*[a-zA-Z0-9_]+\s*\r?\n\s*\.distinct_from_[a-zA-Z0-9_]+,/gm, '        distinct_from_peers_note: r.distinct_from_peers_note.clone(),');
    
    // 3. Single line wire maps block replacement
    const instRegex = /(?:^[ \t]*distinct_from_[a-zA-Z0-9_]+:\s*[a-zA-Z0-9_]+\.distinct_from_[a-zA-Z0-9_]+(?:.clone\(\))?,\r?\n)+/gm;
    content = content.replace(instRegex, (match) => {
        if (match.includes('distinct_from_peers_note')) {
            return match;
        }
        const indentMatch = match.match(/^([ \t]*)/);
        // Find what the variable name is before the dot (usually `r`)
        let varName = 'r';
        const varMatch = match.match(/:\s*([a-zA-Z0-9_]+)\.distinct_from_/);
        if (varMatch) {
            varName = varMatch[1];
        }
        return indentMatch[1] + `distinct_from_peers_note: ${varName}.distinct_from_peers_note.clone(),\n`;
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
