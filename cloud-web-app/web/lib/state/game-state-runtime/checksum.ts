/**
 * Game State Manager - split persistence runtime.
 *
 * This keeps save/load, migration, compression, and React bindings isolated so
 * editor shells can load only the state surface they need.
 */

export class Checksum {
  static calculate(data: string): string {
    // Simple hash for integrity check
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  static verify(data: string, checksum: string): boolean {
    return this.calculate(data) === checksum;
  }
}

// ============================================================================
// GAME STATE MANAGER
// ============================================================================
