/**
 * Multi-Cursor Manager
 * Manages multiple cursors and selections in the editor
 */

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Cursor {
  id: string;
  position: Position;
  selection?: Range;
  isPrimary: boolean;
}

export class MultiCursorManager {
  private cursors: Map<string, Cursor> = new Map();
  private nextId = 0;
  private primaryCursorId: string | null = null;

  /**
   * Add cursor at position
   */
  addCursor(position: Position, selection?: Range): string {
    const id = `cursor-${this.nextId++}`;
    
    const cursor: Cursor = {
      id,
      position,
      selection,
      isPrimary: this.cursors.size === 0,
    };

    this.cursors.set(id, cursor);

    if (cursor.isPrimary) {
      this.primaryCursorId = id;
    }

    console.log(`[Multi-Cursor] Added cursor at ${position.line}:${position.character}`);
    return id;
  }

  /**
   * Remove cursor
   */
  removeCursor(id: string): void {
    const cursor = this.cursors.get(id);
    if (!cursor) return;

    this.cursors.delete(id);

    // If removing primary cursor, make another one primary
    if (cursor.isPrimary && this.cursors.size > 0) {
      const firstCursor = this.cursors.values().next().value;
      firstCursor.isPrimary = true;
      this.primaryCursorId = firstCursor.id;
    }

    console.log(`[Multi-Cursor] Removed cursor ${id}`);
  }

  /**
   * Remove all cursors except primary
   */
  clearSecondaryCursors(): void {
    const primary = this.getPrimaryCursor();
    this.cursors.clear();
    
    if (primary) {
      this.cursors.set(primary.id, primary);
    }

    console.log('[Multi-Cursor] Cleared secondary cursors');
  }

  /**
   * Get all cursors
   */
  getCursors(): Cursor[] {
    return Array.from(this.cursors.values());
  }

  /**
   * Get primary cursor
   */
  getPrimaryCursor(): Cursor | null {
    if (!this.primaryCursorId) return null;
    return this.cursors.get(this.primaryCursorId) || null;
  }

  /**
   * Get cursor by ID
   */
  getCursor(id: string): Cursor | undefined {
    return this.cursors.get(id);
  }

  /**
   * Update cursor position
   */
  updateCursor(id: string, position: Position, selection?: Range): void {
    const cursor = this.cursors.get(id);
    if (!cursor) return;

    cursor.position = position;
    cursor.selection = selection;
  }

  /**
   * Move all cursors
   */
  moveCursors(delta: { line: number; character: number }): void {
    for (const cursor of this.cursors.values()) {
      cursor.position = {
        line: cursor.position.line + delta.line,
        character: cursor.position.character + delta.character,
      };

      if (cursor.selection) {
        cursor.selection = {
          start: {
            line: cursor.selection.start.line + delta.line,
            character: cursor.selection.start.character + delta.character,
          },
          end: {
            line: cursor.selection.end.line + delta.line,
            character: cursor.selection.end.character + delta.character,
          },
        };
      }
    }
  }

  /**
   * Add cursor above each existing cursor
   */
  addCursorsAbove(): void {
    const cursors = Array.from(this.cursors.values());
    
    for (const cursor of cursors) {
      if (cursor.position.line > 0) {
        this.addCursor({
          line: cursor.position.line - 1,
          character: cursor.position.character,
        });
      }
    }

    console.log('[Multi-Cursor] Added cursors above');
  }

  /**
   * Add cursor below each existing cursor
   */
  addCursorsBelow(): void {
    const cursors = Array.from(this.cursors.values());
    
    for (const cursor of cursors) {
      this.addCursor({
        line: cursor.position.line + 1,
        character: cursor.position.character,
      });
    }

    console.log('[Multi-Cursor] Added cursors below');
  }

  /**
   * Add cursors at all occurrences of selection
   */
  addCursorsAtOccurrences(text: string, content: string): void {
    if (!text) return;

    const lines = content.split('\n');
    const regex = new RegExp(this.escapeRegex(text), 'g');

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      let match: RegExpExecArray | null;

      while ((match = regex.exec(line)) !== null) {
        this.addCursor(
          { line: lineNum, character: match.index },
          {
            start: { line: lineNum, character: match.index },
            end: { line: lineNum, character: match.index + text.length },
          }
        );
      }
    }

    console.log(`[Multi-Cursor] Added cursors at ${this.cursors.size} occurrences`);
  }

  /**
   * Add cursor at next occurrence of selection
   */
  addCursorAtNextOccurrence(text: string, content: string, fromPosition: Position): string | null {
    if (!text) return null;

    const lines = content.split('\n');
    const regex = new RegExp(this.escapeRegex(text), 'g');

    // Search from current position
    for (let lineNum = fromPosition.line; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const startChar = lineNum === fromPosition.line ? fromPosition.character + 1 : 0;
      
      regex.lastIndex = startChar;
      const match = regex.exec(line);

      if (match) {
        return this.addCursor(
          { line: lineNum, character: match.index },
          {
            start: { line: lineNum, character: match.index },
            end: { line: lineNum, character: match.index + text.length },
          }
        );
      }
    }

    return null;
  }

  /**
   * Select all occurrences
   */
  selectAllOccurrences(text: string, content: string): void {
    this.clearSecondaryCursors();
    this.addCursorsAtOccurrences(text, content);
  }

  /**
   * Insert text at all cursors
   */
  insertText(text: string, content: string): string {
    const lines = content.split('\n');
    const cursors = this.getSortedCursors();

    // Process cursors in reverse order to maintain positions
    for (let i = cursors.length - 1; i >= 0; i--) {
      const cursor = cursors[i];
      const line = lines[cursor.position.line];
      
      if (line !== undefined) {
        const before = line.substring(0, cursor.position.character);
        const after = line.substring(cursor.position.character);
        lines[cursor.position.line] = before + text + after;

        // Update cursor position
        cursor.position.character += text.length;
      }
    }

    return lines.join('\n');
  }

  /**
   * Delete selection at all cursors
   */
  deleteSelection(content: string): string {
    const lines = content.split('\n');
    const cursors = this.getSortedCursors();

    // Process cursors in reverse order
    for (let i = cursors.length - 1; i >= 0; i--) {
      const cursor = cursors[i];
      
      if (cursor.selection) {
        const { start, end } = cursor.selection;

        if (start.line === end.line) {
          // Single line selection
          const line = lines[start.line];
          const before = line.substring(0, start.character);
          const after = line.substring(end.character);
          lines[start.line] = before + after;
        } else {
          // Multi-line selection
          const firstLine = lines[start.line].substring(0, start.character);
          const lastLine = lines[end.line].substring(end.character);
          lines[start.line] = firstLine + lastLine;
          lines.splice(start.line + 1, end.line - start.line);
        }

        // Update cursor position
        cursor.position = start;
        cursor.selection = undefined;
      }
    }

    return lines.join('\n');
  }

  /**
   * Get cursors sorted by position
   */
  private getSortedCursors(): Cursor[] {
    return Array.from(this.cursors.values()).sort((a, b) => {
      if (a.position.line !== b.position.line) {
        return a.position.line - b.position.line;
      }
      return a.position.character - b.position.character;
    });
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Check if position is in range
   */
  private isInRange(position: Position, range: Range): boolean {
    if (position.line < range.start.line || position.line > range.end.line) {
      return false;
    }

    if (position.line === range.start.line && position.character < range.start.character) {
      return false;
    }

    if (position.line === range.end.line && position.character > range.end.character) {
      return false;
    }

    return true;
  }

  /**
   * Merge overlapping cursors
   */
  mergeOverlappingCursors(): void {
    const cursors = this.getSortedCursors();
    const toRemove: string[] = [];

    for (let i = 0; i < cursors.length - 1; i++) {
      const current = cursors[i];
      const next = cursors[i + 1];

      // Check if cursors overlap
      if (current.selection && next.selection) {
        if (this.rangesOverlap(current.selection, next.selection)) {
          // Merge into current
          current.selection = this.mergeRanges(current.selection, next.selection);
          toRemove.push(next.id);
        }
      } else if (
        current.position.line === next.position.line &&
        current.position.character === next.position.character
      ) {
        // Same position
        toRemove.push(next.id);
      }
    }

    // Remove merged cursors
    for (const id of toRemove) {
      this.removeCursor(id);
    }

    if (toRemove.length > 0) {
      console.log(`[Multi-Cursor] Merged ${toRemove.length} overlapping cursors`);
    }
  }

  /**
   * Check if ranges overlap
   */
  private rangesOverlap(a: Range, b: Range): boolean {
    return this.isInRange(a.start, b) || this.isInRange(a.end, b) ||
           this.isInRange(b.start, a) || this.isInRange(b.end, a);
  }

  /**
   * Merge two ranges
   */
  private mergeRanges(a: Range, b: Range): Range {
    const start = this.comparePositions(a.start, b.start) < 0 ? a.start : b.start;
    const end = this.comparePositions(a.end, b.end) > 0 ? a.end : b.end;
    return { start, end };
  }

  /**
   * Compare positions
   */
  private comparePositions(a: Position, b: Position): number {
    if (a.line !== b.line) {
      return a.line - b.line;
    }
    return a.character - b.character;
  }
}

// Singleton instance
let multiCursorManagerInstance: MultiCursorManager | null = null;

export function getMultiCursorManager(): MultiCursorManager {
  if (!multiCursorManagerInstance) {
    multiCursorManagerInstance = new MultiCursorManager();
  }
  return multiCursorManagerInstance;
}
