/**
 * Refactoring Manager
 * Provides code refactoring operations
 */

export interface RefactoringAction {
  id: string;
  title: string;
  kind: 'refactor.extract' | 'refactor.inline' | 'refactor.rewrite' | 'refactor.move';
  description?: string;
  range: Range;
}

export interface Range {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

export interface WorkspaceEdit {
  changes: Record<string, TextEdit[]>;
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export class RefactoringManager {
  /**
   * Get available refactorings for range
   */
  async getRefactorings(uri: string, range: Range, languageId: string): Promise<RefactoringAction[]> {
    const actions: RefactoringAction[] = [];

    // Extract method/function
    if (this.canExtractMethod(range)) {
      actions.push({
        id: 'extract-method',
        title: 'Extract Method',
        kind: 'refactor.extract',
        description: 'Extract selection to a new method',
        range,
      });
    }

    // Extract variable
    if (this.canExtractVariable(range)) {
      actions.push({
        id: 'extract-variable',
        title: 'Extract Variable',
        kind: 'refactor.extract',
        description: 'Extract selection to a new variable',
        range,
      });
    }

    // Extract constant
    if (this.canExtractConstant(range)) {
      actions.push({
        id: 'extract-constant',
        title: 'Extract Constant',
        kind: 'refactor.extract',
        description: 'Extract selection to a new constant',
        range,
      });
    }

    // Inline variable
    actions.push({
      id: 'inline-variable',
      title: 'Inline Variable',
      kind: 'refactor.inline',
      description: 'Inline variable at all usage sites',
      range,
    });

    // Convert to arrow function (TypeScript/JavaScript)
    if (languageId === 'typescript' || languageId === 'javascript') {
      actions.push({
        id: 'convert-arrow-function',
        title: 'Convert to Arrow Function',
        kind: 'refactor.rewrite',
        description: 'Convert function to arrow function',
        range,
      });

      actions.push({
        id: 'convert-async-await',
        title: 'Convert to Async/Await',
        kind: 'refactor.rewrite',
        description: 'Convert Promise chain to async/await',
        range,
      });
    }

    // Move to new file
    actions.push({
      id: 'move-to-file',
      title: 'Move to New File',
      kind: 'refactor.move',
      description: 'Move selection to a new file',
      range,
    });

    return actions;
  }

  /**
   * Extract method
   */
  async extractMethod(uri: string, range: Range, content: string, methodName: string): Promise<WorkspaceEdit> {
    const lines = content.split('\n');
    const selectedLines = this.getSelectedLines(lines, range);
    const selectedText = selectedLines.join('\n');

    // Analyze variables used in selection
    const variables = this.analyzeVariables(selectedText);
    const params = variables.used.filter(v => !variables.declared.includes(v));
    const returnVars = variables.declared.filter(v => this.isUsedAfter(v, lines, range.end.line));

    // Generate method
    const methodSignature = this.generateMethodSignature(methodName, params, returnVars);
    const methodBody = this.indentCode(selectedText, 1);
    const returnStatement = returnVars.length > 0 ? `\n\treturn ${returnVars.join(', ')};` : '';
    const newMethod = `\n${methodSignature} {\n${methodBody}${returnStatement}\n}\n`;

    // Generate method call
    const methodCall = this.generateMethodCall(methodName, params, returnVars);

    // Create edits
    const edits: TextEdit[] = [];

    // Replace selection with method call
    edits.push({
      range,
      newText: methodCall,
    });

    // Insert new method after current function
    const insertLine = this.findInsertionPoint(lines, range.start.line);
    edits.push({
      range: {
        start: { line: insertLine, character: 0 },
        end: { line: insertLine, character: 0 },
      },
      newText: newMethod,
    });

    return { changes: { [uri]: edits } };
  }

  /**
   * Extract variable
   */
  async extractVariable(uri: string, range: Range, content: string, variableName: string): Promise<WorkspaceEdit> {
    const lines = content.split('\n');
    const selectedText = this.getSelectedText(lines, range);

    // Find all occurrences of the expression
    const occurrences = this.findOccurrences(lines, selectedText, range);

    // Create variable declaration
    const declaration = `const ${variableName} = ${selectedText};\n`;

    // Create edits
    const edits: TextEdit[] = [];

    // Insert variable declaration before first occurrence
    const insertLine = range.start.line;
    const indent = this.getIndentation(lines[insertLine]);
    edits.push({
      range: {
        start: { line: insertLine, character: 0 },
        end: { line: insertLine, character: 0 },
      },
      newText: indent + declaration,
    });

    // Replace all occurrences with variable name
    for (const occurrence of occurrences) {
      edits.push({
        range: occurrence,
        newText: variableName,
      });
    }

    return { changes: { [uri]: edits } };
  }

  /**
   * Extract constant
   */
  async extractConstant(uri: string, range: Range, content: string, constantName: string): Promise<WorkspaceEdit> {
    const lines = content.split('\n');
    const selectedText = this.getSelectedText(lines, range);

    // Create constant declaration at top of file
    const declaration = `const ${constantName} = ${selectedText};\n\n`;

    // Find first non-import line
    const insertLine = this.findFirstNonImportLine(lines);

    // Create edits
    const edits: TextEdit[] = [];

    // Insert constant declaration
    edits.push({
      range: {
        start: { line: insertLine, character: 0 },
        end: { line: insertLine, character: 0 },
      },
      newText: declaration,
    });

    // Replace selection with constant name
    edits.push({
      range,
      newText: constantName,
    });

    return { changes: { [uri]: edits } };
  }

  /**
   * Inline variable
   */
  async inlineVariable(uri: string, range: Range, content: string): Promise<WorkspaceEdit> {
    const lines = content.split('\n');
    
    // Find variable declaration
    const declaration = this.findVariableDeclaration(lines, range);
    if (!declaration) {
      throw new Error('No variable declaration found');
    }

    // Find all usages
    const usages = this.findVariableUsages(lines, declaration.name, declaration.line);

    // Create edits
    const edits: TextEdit[] = [];

    // Replace all usages with the value
    for (const usage of usages) {
      edits.push({
        range: usage,
        newText: declaration.value,
      });
    }

    // Remove variable declaration
    edits.push({
      range: {
        start: { line: declaration.line, character: 0 },
        end: { line: declaration.line + 1, character: 0 },
      },
      newText: '',
    });

    return { changes: { [uri]: edits } };
  }

  /**
   * Convert to arrow function
   */
  async convertToArrowFunction(uri: string, range: Range, content: string): Promise<WorkspaceEdit> {
    const lines = content.split('\n');
    const functionText = this.getSelectedText(lines, range);

    // Parse function
    const match = functionText.match(/function\s+(\w+)?\s*\(([^)]*)\)\s*{([\s\S]*)}/);
    if (!match) {
      throw new Error('Not a valid function');
    }

    const [, name, params, body] = match;
    
    // Generate arrow function
    let arrowFunction: string;
    if (name) {
      arrowFunction = `const ${name} = (${params}) => {${body}}`;
    } else {
      arrowFunction = `(${params}) => {${body}}`;
    }

    return {
      changes: {
        [uri]: [{
          range,
          newText: arrowFunction,
        }],
      },
    };
  }

  /**
   * Convert to async/await
   */
  async convertToAsyncAwait(uri: string, range: Range, content: string): Promise<WorkspaceEdit> {
    const lines = content.split('\n');
    const selectedText = this.getSelectedText(lines, range);

    // Convert .then() chains to async/await
    let converted = selectedText;
    
    // Simple conversion (can be enhanced)
    converted = converted.replace(/\.then\(\s*([^)]+)\s*=>\s*{([^}]+)}\s*\)/g, (match, param, body) => {
      return `\nconst ${param} = await ${body.trim()};`;
    });

    converted = converted.replace(/\.catch\(\s*([^)]+)\s*=>\s*{([^}]+)}\s*\)/g, (match, param, body) => {
      return `\ntry {\n\t// previous code\n} catch (${param}) {\n\t${body.trim()}\n}`;
    });

    return {
      changes: {
        [uri]: [{
          range,
          newText: converted,
        }],
      },
    };
  }

  /**
   * Move to new file
   */
  async moveToNewFile(uri: string, range: Range, content: string, newFileName: string): Promise<WorkspaceEdit> {
    const lines = content.split('\n');
    const selectedText = this.getSelectedText(lines, range);

    // Analyze imports needed
    const imports = this.analyzeImports(selectedText, content);

    // Generate new file content
    const newFileContent = `${imports}\n\n${selectedText}\n`;

    // Generate export statement
    const exportName = this.extractExportName(selectedText);
    const exportStatement = `export { ${exportName} } from './${newFileName}';\n`;

    // Create edits
    const newFileUri = uri.replace(/[^/]+$/, newFileName + '.ts');

    return {
      changes: {
        [uri]: [
          {
            range,
            newText: exportStatement,
          },
        ],
        [newFileUri]: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            newText: newFileContent,
          },
        ],
      },
    };
  }

  /**
   * Organize imports
   */
  async organizeImports(uri: string, content: string): Promise<WorkspaceEdit> {
    const lines = content.split('\n');
    
    // Find all imports
    const imports: { line: number; text: string; module: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('import ')) {
        const moduleMatch = line.match(/from\s+['"]([^'"]+)['"]/);
        imports.push({
          line: i,
          text: line,
          module: moduleMatch ? moduleMatch[1] : '',
        });
      }
    }

    if (imports.length === 0) {
      return { changes: {} };
    }

    // Sort imports
    const sorted = imports.sort((a, b) => {
      // External modules first, then relative
      const aExternal = !a.module.startsWith('.');
      const bExternal = !b.module.startsWith('.');
      
      if (aExternal !== bExternal) {
        return aExternal ? -1 : 1;
      }
      
      return a.module.localeCompare(b.module);
    });

    // Remove unused imports (simple check)
    const used = sorted.filter(imp => {
      const importedNames = this.extractImportedNames(imp.text);
      return importedNames.some(name => this.isNameUsed(name, lines, imp.line));
    });

    // Create edits
    const edits: TextEdit[] = [];

    // Remove all old imports
    for (const imp of imports) {
      edits.push({
        range: {
          start: { line: imp.line, character: 0 },
          end: { line: imp.line + 1, character: 0 },
        },
        newText: '',
      });
    }

    // Insert sorted imports
    const firstImportLine = imports[0].line;
    const newImports = used.map(imp => imp.text).join('\n') + '\n';
    edits.push({
      range: {
        start: { line: firstImportLine, character: 0 },
        end: { line: firstImportLine, character: 0 },
      },
      newText: newImports,
    });

    return { changes: { [uri]: edits } };
  }

  // Helper methods

  private canExtractMethod(range: Range): boolean {
    return range.end.line > range.start.line || 
           (range.end.line === range.start.line && range.end.character - range.start.character > 10);
  }

  private canExtractVariable(range: Range): boolean {
    return range.end.line === range.start.line && range.end.character - range.start.character > 3;
  }

  private canExtractConstant(range: Range): boolean {
    return this.canExtractVariable(range);
  }

  private getSelectedLines(lines: string[], range: Range): string[] {
    return lines.slice(range.start.line, range.end.line + 1);
  }

  private getSelectedText(lines: string[], range: Range): string {
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

  private analyzeVariables(code: string): { declared: string[]; used: string[] } {
    const declared: string[] = [];
    const used: string[] = [];

    // Simple variable detection (can be enhanced with AST)
    const declareMatch = code.matchAll(/(?:const|let|var)\s+(\w+)/g);
    for (const match of declareMatch) {
      declared.push(match[1]);
    }

    const useMatch = code.matchAll(/\b(\w+)\b/g);
    for (const match of useMatch) {
      if (!declared.includes(match[1]) && !this.isKeyword(match[1])) {
        used.push(match[1]);
      }
    }

    return { declared, used: [...new Set(used)] };
  }

  private isUsedAfter(variable: string, lines: string[], afterLine: number): boolean {
    for (let i = afterLine + 1; i < lines.length; i++) {
      if (lines[i].includes(variable)) {
        return true;
      }
    }
    return false;
  }

  private generateMethodSignature(name: string, params: string[], returnVars: string[]): string {
    const paramList = params.join(', ');
    const returnType = returnVars.length > 1 ? `[${returnVars.join(', ')}]` : returnVars[0] || 'void';
    return `function ${name}(${paramList})`;
  }

  private generateMethodCall(name: string, params: string[], returnVars: string[]): string {
    const paramList = params.join(', ');
    if (returnVars.length === 0) {
      return `${name}(${paramList});`;
    } else if (returnVars.length === 1) {
      return `const ${returnVars[0]} = ${name}(${paramList});`;
    } else {
      return `const [${returnVars.join(', ')}] = ${name}(${paramList});`;
    }
  }

  private indentCode(code: string, level: number): string {
    const indent = '\t'.repeat(level);
    return code.split('\n').map(line => indent + line).join('\n');
  }

  private getIndentation(line: string): string {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  private findInsertionPoint(lines: string[], currentLine: number): number {
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

  private findOccurrences(lines: string[], text: string, excludeRange: Range): Range[] {
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

  private findFirstNonImportLine(lines: string[]): number {
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed && !trimmed.startsWith('import ') && !trimmed.startsWith('//')) {
        return i;
      }
    }
    return 0;
  }

  private findVariableDeclaration(lines: string[], range: Range): { name: string; value: string; line: number } | null {
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

  private findVariableUsages(lines: string[], variableName: string, afterLine: number): Range[] {
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

  private analyzeImports(code: string, fullContent: string): string {
    // Extract imports needed for the code
    const imports: string[] = [];
    const lines = fullContent.split('\n');
    
    for (const line of lines) {
      if (line.trim().startsWith('import ')) {
        const importedNames = this.extractImportedNames(line);
        if (importedNames.some(name => code.includes(name))) {
          imports.push(line);
        }
      }
    }

    return imports.join('\n');
  }

  private extractImportedNames(importLine: string): string[] {
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

  private extractExportName(code: string): string {
    const match = code.match(/(?:function|class|const|let|var)\s+(\w+)/);
    return match ? match[1] : 'exported';
  }

  private isNameUsed(name: string, lines: string[], skipLine: number): boolean {
    for (let i = 0; i < lines.length; i++) {
      if (i === skipLine) continue;
      if (lines[i].includes(name)) {
        return true;
      }
    }
    return false;
  }

  private isKeyword(word: string): boolean {
    const keywords = ['if', 'else', 'for', 'while', 'return', 'function', 'const', 'let', 'var', 'class', 'import', 'export'];
    return keywords.includes(word);
  }
}

// Singleton instance
let refactoringManagerInstance: RefactoringManager | null = null;

export function getRefactoringManager(): RefactoringManager {
  if (!refactoringManagerInstance) {
    refactoringManagerInstance = new RefactoringManager();
  }
  return refactoringManagerInstance;
}
