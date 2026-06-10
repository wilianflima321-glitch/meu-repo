import type { CodeChunk } from './rag-types'

export class CodeParser {
  parseFile(content: string, filePath: string, language: string): CodeChunk[] {
    const chunks: CodeChunk[] = []
    const lines = content.split('\n')
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        return this.parseTypeScript(content, filePath, language)
      case 'python':
        return this.parsePython(content, filePath)
      default:
        return this.parseGeneric(content, filePath, language)
    }
  }
  
  private parseTypeScript(content: string, filePath: string, language: string): CodeChunk[] {
    const chunks: CodeChunk[] = []
    const lines = content.split('\n')
    
    // Regex patterns for TypeScript/JavaScript
    const patterns = {
      function: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
      arrowFunction: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/,
      class: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/,
      interface: /^(?:export\s+)?interface\s+(\w+)/,
      type: /^(?:export\s+)?type\s+(\w+)/,
      import: /^import\s+/,
      export: /^export\s+/,
    }
    
    let currentChunk: (Partial<CodeChunk> & { content: string }) | null = null
    let braceCount = 0
    let chunkStartLine = 0
    
    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim()
      
      // Check for new chunk start
      if (!currentChunk) {
        for (const [type, pattern] of Object.entries(patterns)) {
          const match = trimmedLine.match(pattern)
          if (match) {
            currentChunk = {
              id: `${filePath}:${lineIndex}`,
              filePath,
              type: type as CodeChunk['type'],
              name: match[1],
              startLine: lineIndex + 1,
              language,
              content: '',
              metadata: {
                exported: trimmedLine.startsWith('export'),
                async: trimmedLine.includes('async'),
              },
            }
            chunkStartLine = lineIndex
            braceCount = 0
            break
          }
        }
      }
      
      // Track braces for function/class/interface boundaries
      if (currentChunk) {
        currentChunk.content += line + '\n'
        braceCount += (line.match(/{/g) || []).length
        braceCount -= (line.match(/}/g) || []).length
        
        // Check if chunk is complete
        const isImport = currentChunk.type === 'import'
        const isComplete = isImport 
          ? !line.endsWith(',') && (line.includes(';') || line.includes('from'))
          : braceCount === 0 && lineIndex > chunkStartLine
        
        if (isComplete && currentChunk.content.trim()) {
          const chunk = currentChunk
          chunks.push({
            ...chunk,
            endLine: lineIndex + 1,
            content: chunk.content.trim(),
          } as CodeChunk)
          currentChunk = null
        }
      }
    })
    
    // Handle remaining chunk - type assertion needed after forEach mutation
    const remainingChunk = currentChunk as (Partial<CodeChunk> & { content: string }) | null
    if (remainingChunk) {
      if (remainingChunk.content) {
        chunks.push({
          ...remainingChunk,
          endLine: lines.length,
          content: remainingChunk.content.trim(),
        } as CodeChunk)
      }
    }
    
    return chunks
  }
  
  private parsePython(content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = []
    const lines = content.split('\n')
    
    const patterns = {
      function: /^(?:async\s+)?def\s+(\w+)/,
      class: /^class\s+(\w+)/,
      import: /^(?:from\s+\S+\s+)?import\s+/,
    }
    
    let currentChunk: (Partial<CodeChunk> & { content: string }) | null = null
    let chunkIndent = 0
    
    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim()
      const currentIndent = line.length - line.trimStart().length
      
      // Check for new chunk
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        for (const [type, pattern] of Object.entries(patterns)) {
          const match = trimmedLine.match(pattern)
          if (match) {
            // Save previous chunk
            if (currentChunk && currentChunk.content) {
              chunks.push({
                ...currentChunk,
                endLine: lineIndex,
                content: currentChunk.content.trim(),
              } as CodeChunk)
            }
            
            currentChunk = {
              id: `${filePath}:${lineIndex}`,
              filePath,
              type: type as CodeChunk['type'],
              name: match[1],
              startLine: lineIndex + 1,
              language: 'python',
              content: '',
              metadata: {
                async: trimmedLine.startsWith('async'),
              },
            }
            chunkIndent = currentIndent
            break
          }
        }
      }
      
      // Add line to current chunk
      if (currentChunk) {
        // Check if we've dedented (chunk complete)
        if (trimmedLine && currentIndent <= chunkIndent && lineIndex > (currentChunk.startLine || 0)) {
          const chunk = currentChunk
          chunks.push({
            ...chunk,
            endLine: lineIndex,
            content: chunk.content.trim(),
          } as CodeChunk)
          currentChunk = null
        } else {
          currentChunk.content += line + '\n'
        }
      }
    })
    
    // Handle remaining chunk - type assertion needed after forEach mutation
    const remainingChunk = currentChunk as (Partial<CodeChunk> & { content: string }) | null
    if (remainingChunk) {
      if (remainingChunk.content) {
        chunks.push({
          ...remainingChunk,
          endLine: lines.length,
          content: remainingChunk.content.trim(),
        } as CodeChunk)
      }
    }
    
    return chunks
  }
  
  private parseGeneric(content: string, filePath: string, language: string): CodeChunk[] {
    // Simple chunking by lines for unknown languages
    const CHUNK_SIZE = 50 // lines
    const chunks: CodeChunk[] = []
    const lines = content.split('\n')
    
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const chunkLines = lines.slice(i, i + CHUNK_SIZE)
      chunks.push({
        id: `${filePath}:${i}`,
        filePath,
        type: 'other',
        startLine: i + 1,
        endLine: Math.min(i + CHUNK_SIZE, lines.length),
        language,
        content: chunkLines.join('\n'),
        metadata: {},
      })
    }
    
    return chunks
  }
}

// ============= Main RAG Index Class =============
