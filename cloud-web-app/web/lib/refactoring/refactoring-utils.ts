import type { Range } from './refactoring-manager';

export function canExtractMethod(range: Range): boolean {
    return range.end.line > range.start.line || 
           (range.end.line === range.start.line && range.end.character - range.start.character > 10);
  }

export function canExtractVariable(range: Range): boolean {
    return range.end.line === range.start.line && range.end.character - range.start.character > 3;
  }

export function canExtractConstant(range: Range): boolean {
    return canExtractVariable(range);
  }

export function getSelectedLines(lines: string[], range: Range): string[] {
    return lines.slice(range.start.line, range.end.line + 1);
  }

export function getSelectedText(lines: string[], range: Range): string {
    if (range.start.line === range.end.line) {
      return lines[range.start.line].substring(range.start.character, range.end.character);
    }
    
    const selected: string[] = [];
    selected.push(lines[range.start.line].substring(range.start.character));
    for (let i = range.start.line + 1; i < range.end.line; i++) {
      selected.push(lines[i]);
    }
    selected.push(lines[range.end.line].substring(0, range.end.character));
    return selected.join('\n');
  }

export function analyzeVariables(code: string): { declared: string[]; used: string[] } {
    const declared: string[] = [];
    const used: string[] = [];

    // Simple variable detection (can be enhanced with AST)
    const declareMatch = code.matchAll(/(?:const|let|var)\s+(\w+)/g);
    for (const match of declareMatch) {
      declared.push(match[1]);
    }

    const useMatch = code.matchAll(/\b(\w+)\b/g);
    for (const match of useMatch) {
      if (!declared.includes(match[1]) && !isRefactoringKeyword(match[1])) {
        used.push(match[1]);
      }
    }

    return { declared, used: [...new Set(used)] };
  }

export function isUsedAfter(variable: string, lines: string[], afterLine: number): boolean {
    for (let i = afterLine + 1; i < lines.length; i++) {
      if (lines[i].includes(variable)) {
        return true;
      }
    }
    return false;
  }

export function generateMethodSignature(name: string, params: string[], returnVars: string[]): string {
    const paramList = params.join(', ');
    const returnType = returnVars.length > 1 ? `[${returnVars.join(', ')}]` : returnVars[0] || 'void';
    return `function ${name}(${paramList})`;
  }

export function generateMethodCall(name: string, params: string[], returnVars: string[]): string {
    const paramList = params.join(', ');
    if (returnVars.length === 0) {
      return `${name}(${paramList});`;
    } else if (returnVars.length === 1) {
      return `const ${returnVars[0]} = ${name}(${paramList});`;
    } else {
      return `const [${returnVars.join(', ')}] = ${name}(${paramList});`;
    }
  }

export function indentCode(code: string, level: number): string {
    const indent = '\t'.repeat(level);
    return code.split('\n').map(line => indent + line).join('\n');
  }

export function getIndentation(line: string): string {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

export function findInsertionPoint(lines: string[], currentLine: number): number {
    // Find end of current function
    let braceCount = 0;
    for (let i = currentLine; i < lines.length; i++) {
      for (const char of lines[i]) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (braceCount === 0 && char === '}') {
          return i + 1;
        }
      }
    }
    return lines.length;
  }

export function findOccurrences(lines: string[], text: string, excludeRange: Range): Range[] {
    const occurrences: Range[] = [];
    const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedText, 'g');

    for (let i = 0; i < lines.length; i++) {
      let match;
      while ((match = regex.exec(lines[i])) !== null) {
        const range: Range = {
          start: { line: i, character: match.index },
          end: { line: i, character: match.index + text.length },
        };
        
        // Exclude the original selection
        if (i !== excludeRange.start.line || match.index !== excludeRange.start.character) {
          occurrences.push(range);
        }
      }
    }

    return occurrences;
  }

export function findFirstNonImportLine(lines: string[]): number {
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed && !trimmed.startsWith('import ') && !trimmed.startsWith('//')) {
        return i;
      }
    }
    return 0;
  }

export function findVariableDeclaration(lines: string[], range: Range): { name: string; value: string; line: number } | null {
    const line = lines[range.start.line];
    const match = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(.+);/);
    if (match) {
      return {
        name: match[1],
        value: match[2],
        line: range.start.line,
      };
    }
    return null;
  }

export function findVariableUsages(lines: string[], variableName: string, afterLine: number): Range[] {
    const usages: Range[] = [];
    const regex = new RegExp(`\\b${variableName}\\b`, 'g');

    for (let i = afterLine + 1; i < lines.length; i++) {
      let match;
      while ((match = regex.exec(lines[i])) !== null) {
        usages.push({
          start: { line: i, character: match.index },
          end: { line: i, character: match.index + variableName.length },
        });
      }
    }

    return usages;
  }

export function analyzeImports(code: string, fullContent: string): string {
    // Extract imports needed for the code
    const imports: string[] = [];
    const lines = fullContent.split('\n');
    
    for (const line of lines) {
      if (line.trim().startsWith('import ')) {
        const importedNames = extractImportedNames(line);
        if (importedNames.some(name => code.includes(name))) {
          imports.push(line);
        }
      }
    }

    return imports.join('\n');
  }

export function extractImportedNames(importLine: string): string[] {
    const match = importLine.match(/import\s+{([^}]+)}/);
    if (match) {
      return match[1].split(',').map(s => s.trim());
    }
    const defaultMatch = importLine.match(/import\s+(\w+)/);
    if (defaultMatch) {
      return [defaultMatch[1]];
    }
    return [];
  }

export function extractExportName(code: string): string {
    const match = code.match(/(?:function|class|const|let|var)\s+(\w+)/);
    return match ? match[1] : 'exported';
  }

export function isNameUsed(name: string, lines: string[], skipLine: number): boolean {
    for (let i = 0; i < lines.length; i++) {
      if (i === skipLine) continue;
      if (lines[i].includes(name)) {
        return true;
      }
    }
    return false;
  }

export function isRefactoringKeyword(word: string): boolean {
    const keywords = ['if', 'else', 'for', 'while', 'return', 'function', 'const', 'let', 'var', 'class', 'import', 'export'];
    return keywords.includes(word);
  }
