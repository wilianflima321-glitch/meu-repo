const fs = require('fs');
const path = require('path');

const KERNEL_SRC = 'E:/Aethel engine/packages/aethel-kernel-rust/src';
const WIRE_SRC = 'E:/Aethel engine/apps/studio-local/src-tauri/src';

function removeCopy(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Find any struct that has distinct_from_peers_note: String
    // We can just look for #[derive(...Copy...)] right above a pub struct ... { ... pub distinct_from_peers_note: String,
    
    // Instead of complex regex, let's just find any struct definition line that has #[derive(...)] with Copy
    // and if the struct contains distinct_from_peers_note, remove Copy.
    
    const structRegex = /#\[derive\(([^\]]+)\)\]\r?\n(?:pub )?struct ([a-zA-Z0-9_]+)/g;
    let match;
    let toReplace = [];
    while ((match = structRegex.exec(content)) !== null) {
        let derives = match[1];
        let structName = match[2];
        if (derives.includes('Copy')) {
            // Find if this struct has distinct_from_peers_note
            let structStart = content.indexOf(`struct ${structName}`);
            let nextStruct = content.indexOf('struct ', structStart + 10);
            if (nextStruct === -1) nextStruct = content.length;
            
            let structBody = content.substring(structStart, nextStruct);
            if (structBody.includes('distinct_from_peers_note')) {
                // Remove Copy
                let newDerives = derives.replace('Copy, ', '').replace(', Copy', '').replace('Copy', '');
                toReplace.push({
                    oldStr: `#[derive(${derives})]`,
                    newStr: `#[derive(${newDerives})]`
                });
            }
        }
    }
    
    // Also remove Copy from wire structs which might be #[derive(serde::Serialize, Clone, Copy)]
    const wireStructRegex = /#\[derive\(([^\]]+)\)\]\r?\npub struct ([a-zA-Z0-9_]+)/g;
    let match2;
    while ((match2 = wireStructRegex.exec(content)) !== null) {
        let derives = match2[1];
        let structName = match2[2];
        if (derives.includes('Copy')) {
            let structStart = content.indexOf(`struct ${structName}`);
            let nextStruct = content.indexOf('struct ', structStart + 10);
            if (nextStruct === -1) nextStruct = content.length;
            
            let structBody = content.substring(structStart, nextStruct);
            if (structBody.includes('distinct_from_peers_note')) {
                let newDerives = derives.replace('Copy, ', '').replace(', Copy', '').replace('Copy', '');
                toReplace.push({
                    oldStr: `#[derive(${derives})]`,
                    newStr: `#[derive(${newDerives})]`
                });
            }
        }
    }

    for (let r of toReplace) {
        content = content.replace(r.oldStr, r.newStr);
    }

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        return true;
    }
    return false;
}

let changedKernel = 0;
for (const file of fs.readdirSync(KERNEL_SRC)) {
    if (file.endsWith('.rs')) {
        if (removeCopy(path.join(KERNEL_SRC, file))) {
            changedKernel++;
        }
    }
}

let changedWire = 0;
for (const file of fs.readdirSync(WIRE_SRC)) {
    if (file.endsWith('.rs')) {
        if (removeCopy(path.join(WIRE_SRC, file))) {
            changedWire++;
        }
    }
}

console.log(`Removed Copy from ${changedKernel} kernel files and ${changedWire} wire files.`);
