const fs = require('fs');
const path = require('path');

const KERNEL_SRC = 'E:/Aethel engine/packages/aethel-kernel-rust/src';

for (const file of fs.readdirSync(KERNEL_SRC)) {
    if (!file.endsWith('.rs')) continue;
    let p = path.join(KERNEL_SRC, file);
    let c = fs.readFileSync(p, 'utf8');
    
    let originalC = c;
    
    // For definitions:
    c = c.replace(/(?:pub\s+)?struct\s+[a-zA-Z0-9_]+\s*\{([^}]*)\}/g, (match) => {
        let count = 0;
        return match.replace(/^[ \t]*pub distinct_from_peers_note: String,\r?\n/gm, (m) => {
            count++;
            return count === 1 ? m : '';
        });
    });

    // For instantiations:
    c = c.replace(/[a-zA-Z0-9_]+SoakReport\s*\{([^}]*)\}/g, (match) => {
        let count = 0;
        return match.replace(/^[ \t]*distinct_from_peers_note: "HELD: Distinct from many peers\. Fingerprint cross-check held to avoid coupling\."\.to_string\(\),\r?\n/gm, (m) => {
            count++;
            return count === 1 ? m : '';
        });
    });
    
    // Some instantiations might have `r.distinct_from_peers_note.clone(),` in wire maps, wait wire is in `studio-local` but we only touch KERNEL_SRC here. So that's fine.

    if (c !== originalC) {
        fs.writeFileSync(p, c);
    }
}

console.log("Fixed duplicates.");
