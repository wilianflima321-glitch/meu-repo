const fs = require('fs');
const path = require('path');

const DOCS_DIR = 'E:/Aethel engine/docs/architecture';
const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));

let debtRegistry = [];

const keywords = ['TODO', 'FIXME', 'DEBT', 'PENDING', 'NEEDS UPDATE', 'OUTDATED', 'CRITICA', 'HELD', 'MISSING', 'LACKING', 'UNFINISHED', 'REFACTOR'];

files.forEach(file => {
    let content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');
    let lines = content.split('\n');
    let fileDebts = [];
    
    for (let i = 0; i < lines.length; i++) {
        let upperLine = lines[i].toUpperCase();
        let foundKeyword = keywords.find(kw => upperLine.includes(kw));
        
        if (foundKeyword) {
            // Context window: 1 line before, the line itself, and 1 line after
            let context = [];
            if (i > 0 && lines[i-1].trim()) context.push(`  ${lines[i-1].trim()}`);
            context.push(`> ${lines[i].trim()}`);
            if (i < lines.length - 1 && lines[i+1].trim()) context.push(`  ${lines[i+1].trim()}`);
            
            fileDebts.push({ lineNum: i + 1, keyword: foundKeyword, context: context.join('\n') });
        }
    }
    
    if (fileDebts.length > 0) {
        debtRegistry.push({ file, debts: fileDebts });
    }
});

// Since the files are huge, let's aggregate and just count or list the most critical ones.
let report = '# Aethel Engine - Deep Plan Audit & Debt Registry\n\n';
report += `Total plans analyzed: ${files.length}\n\n`;

debtRegistry.forEach(entry => {
    // Only output if the count is reasonable, or summarize if it's too much.
    // E.g., AETHEL_FOCUS1_EXECUTION_PROGRESS.md will have a million 'HELD' matches.
    let heldCount = entry.debts.filter(d => d.keyword === 'HELD').length;
    let otherDebts = entry.debts.filter(d => d.keyword !== 'HELD');
    
    report += `## ${entry.file}\n`;
    report += `- 'HELD' modules detected: ${heldCount}\n`;
    report += `- Actionable Debts/Critiques: ${otherDebts.length}\n`;
    
    if (otherDebts.length > 0) {
        // Output up to 15 debts to avoid massive file sizes
        otherDebts.slice(0, 15).forEach(d => {
            report += `- Line ${d.lineNum} [${d.keyword}]:\n${d.context}\n\n`;
        });
        if (otherDebts.length > 15) {
            report += `  ... and ${otherDebts.length - 15} more actionable items.\n`;
        }
    }
    report += '\n';
});

fs.writeFileSync('E:/Aethel engine/automated_plan_audit.md', report);
console.log('Automated audit complete. Wrote to automated_plan_audit.md');
