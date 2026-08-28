const fs = require('fs');
const path = require('path');

const KERNEL_SRC = 'E:/Aethel engine/packages/aethel-kernel-rust/src';
const WIRE_SRC = 'E:/Aethel engine/apps/studio-local/src-tauri/src';

function processKernelFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Remove `r.distinct_from_... = d;`
    const mutateRegex = /(?:^[ \t]*[a-zA-Z0-9_]+\.distinct_from_[a-zA-Z0-9_]+\s*=\s*[^;]+;\r?\n)+/gm;
    content = content.replace(mutateRegex, '');

    // Replace ANY remaining `distinct_from_.*_probe:\s*bool` in structs just in case
    const structDefRegex = /(?:^[ \t]*pub distinct_from_[a-zA-Z0-9_]+:\s*bool,\r?\n)+/gm;
    content = content.replace(structDefRegex, (match) => {
        const indentMatch = match.match(/^([ \t]*)/);
        const indent = indentMatch ? indentMatch[1] : '    ';
        return indent + 'pub distinct_from_peers_note: String,\n';
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

console.log(`Updated ${changedKernel} kernel files.`);
