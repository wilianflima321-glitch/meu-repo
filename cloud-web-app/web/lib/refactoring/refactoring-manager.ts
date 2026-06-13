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

import {
  analyzeImports,
  analyzeVariables,
  canExtractConstant,
  canExtractMethod,
  canExtractVariable,
  extractExportName,
  findFirstNonImportLine,
  findInsertionPoint,
  findOccurrences,
  extractImportedNames,
  findVariableDeclaration,
  findVariableUsages,
  generateMethodCall,
  generateMethodSignature,
  getIndentation,
  getSelectedLines,
  getSelectedText,
  indentCode,
  isNameUsed,
  isUsedAfter,
} from './refactoring-utils';

export class RefactoringManager {
  /**
   * Get available refactorings for range
   */
  async getRefactorings(uri: string, range: Range, languageId: string): Promise<RefactoringAction[]> {
    const actions: RefactoringAction[] = [];

    // Extract method/function
    if (canExtractMethod(range)) {
      actions.push({
        id: 'extract-method',
        title: 'Extract Method',
        kind: 'refactor.extract',
        description: 'Extract selection to a new method',
        range,
      });
    }

    // Extract variable
    if (canExtractVariable(range)) {
      actions.push({
        id: 'extract-variable',
        title: 'Extract Variable',
        kind: 'refactor.extract',
        description: 'Extract selection to a new variable',
        range,
      });
    }

    // Extract constant
    if (canExtractConstant(range)) {
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
    const selectedLines = getSelectedLines(lines, range);
    const selectedText = selectedLines.join('\n');

    // Analyze variables used in selection
    const variables = analyzeVariables(selectedText);
    const params = variables.used.filter(v => !variables.declared.includes(v));
    const returnVars = variables.declared.filter(v => isUsedAfter(v, lines, range.end.line));

    // Generate method
    const methodSignature = generateMethodSignature(methodName, params, returnVars);
    const methodBody = indentCode(selectedText, 1);
    const returnStatement = returnVars.length > 0 ? `\n\treturn ${returnVars.join(', ')};` : '';
    const newMethod = `\n${methodSignature} {\n${methodBody}${returnStatement}\n}\n`;

    // Generate method call
    const methodCall = generateMethodCall(methodName, params, returnVars);

    // Create edits
    const edits: TextEdit[] = [];

    // Replace selection with method call
    edits.push({
      range,
      newText: methodCall,
    });

    // Insert new method after current function
    const insertLine = findInsertionPoint(lines, range.start.line);
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
    const selectedText = getSelectedText(lines, range);

    // Find all occurrences of the expression
    const occurrences = findOccurrences(lines, selectedText, range);

    // Create variable declaration
    const declaration = `const ${variableName} = ${selectedText};\n`;

    // Create edits
    const edits: TextEdit[] = [];

    // Insert variable declaration before first occurrence
    const insertLine = range.start.line;
    const indent = getIndentation(lines[insertLine]);
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
    const selectedText = getSelectedText(lines, range);

    // Create constant declaration at top of file
    const declaration = `const ${constantName} = ${selectedText};\n\n`;

    // Find first non-import line
    const insertLine = findFirstNonImportLine(lines);

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
    const declaration = findVariableDeclaration(lines, range);
    if (!declaration) {
      throw new Error('No variable declaration found');
    }

    // Find all usages
    const usages = findVariableUsages(lines, declaration.name, declaration.line);

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
    const functionText = getSelectedText(lines, range);

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
    const selectedText = getSelectedText(lines, range);

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
    const selectedText = getSelectedText(lines, range);

    // Analyze imports needed
    const imports = analyzeImports(selectedText, content);

    // Generate new file content
    const newFileContent = `${imports}\n\n${selectedText}\n`;

    // Generate export statement
    const exportName = extractExportName(selectedText);
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
      const importedNames = extractImportedNames(imp.text);
      return importedNames.some(name => isNameUsed(name, lines, imp.line));
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


}

// Singleton instance
let refactoringManagerInstance: RefactoringManager | null = null;

export function getRefactoringManager(): RefactoringManager {
  if (!refactoringManagerInstance) {
    refactoringManagerInstance = new RefactoringManager();
  }
  return refactoringManagerInstance;
}
