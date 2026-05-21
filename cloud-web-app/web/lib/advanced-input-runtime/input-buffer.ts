/**
 * Advanced Input System - split runtime modules.
 *
 * Keep input runtime isolated from public route shells; Studio/game surfaces can
 * lazy-load the barrel when they need keyboard, mouse, touch, or gamepad input.
 */

export class InputBuffer {
  private buffer: Array<{ action: string; timestamp: number }> = [];
  private bufferWindow: number;
  
  constructor(bufferWindow: number = 100) {
    this.bufferWindow = bufferWindow;
  }
  
  add(action: string): void {
    this.buffer.push({ action, timestamp: Date.now() });
    this.cleanup();
  }
  
  hasAction(action: string): boolean {
    this.cleanup();
    return this.buffer.some(b => b.action === action);
  }
  
  consume(action: string): boolean {
    this.cleanup();
    const index = this.buffer.findIndex(b => b.action === action);
    if (index !== -1) {
      this.buffer.splice(index, 1);
      return true;
    }
    return false;
  }
  
  private cleanup(): void {
    const now = Date.now();
    this.buffer = this.buffer.filter(b => now - b.timestamp < this.bufferWindow);
  }
  
  clear(): void {
    this.buffer = [];
  }
}

// ============================================================================
// COMBO DETECTOR
// ============================================================================
