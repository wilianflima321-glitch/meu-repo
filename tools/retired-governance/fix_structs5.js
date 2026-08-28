const fs = require('fs');
const path = require('path');

const KERNEL_SRC = 'E:/Aethel engine/packages/aethel-kernel-rust/src';

for (const file of fs.readdirSync(KERNEL_SRC)) {
    if (!file.endsWith('.rs')) continue;
    let p = path.join(KERNEL_SRC, file);
    let lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    
    // Process block by block
    let inStructDef = false;
    let inStructInst = false;
    let structDefSeen = false;
    let structInstSeen = false;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        if (line.includes('struct ') && line.includes('{')) {
            inStructDef = true;
            structDefSeen = false;
        }
        else if ((line.includes('SoakReport {') || line.includes('Report {')) && !line.includes('struct ')) {
            inStructInst = true;
            structInstSeen = false;
        }
        
        // Match a block closing brace, but only if it's the only thing on the line to avoid false positives (e.g. `}`)
        if (line.trim() === '}') {
            inStructDef = false;
            inStructInst = false;
        }
        
        if (inStructDef && line.includes('pub distinct_from_peers_note: String,')) {
            if (structDefSeen) {
                lines[i] = ''; // remove duplicate
            } else {
                structDefSeen = true;
            }
        }
        
        if (inStructInst && line.includes('distinct_from_peers_note:') && line.includes('HELD: Distinct')) {
            if (structInstSeen) {
                lines[i] = ''; // remove duplicate
            } else {
                structInstSeen = true;
            }
        }
    }
    
    fs.writeFileSync(p, lines.filter(l => l !== '').join('\n'));
}

// Ensure unused variable in internal_voxel_density is prefixed
let ivdPath = path.join(KERNEL_SRC, 'internal_voxel_density.rs');
let ivdContent = fs.readFileSync(ivdPath, 'utf8');
ivdContent = ivdContent.replace(/peer_distinct:\s*bool,/g, '_peer_distinct: bool,');
fs.writeFileSync(ivdPath, ivdContent);

console.log("Fixed duplicates robustly.");
