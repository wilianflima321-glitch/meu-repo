/**
 * Advanced Input System - split runtime modules.
 *
 * Keep input runtime isolated from public route shells; Studio/game surfaces can
 * lazy-load the barrel when they need keyboard, mouse, touch, or gamepad input.
 */

import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('advanced-input-system');

export class InputDeviceManager {
  private gamepads: Map<number, Gamepad> = new Map();
  private deadZone: number = 0.15;
  
  private touchPoints: Map<number, { x: number; y: number; startX: number; startY: number; startTime: number }> = new Map();
  
  constructor() {
    this.setupGamepadListeners();
    this.setupTouchListeners();
  }
  
  private setupGamepadListeners(): void {
    window.addEventListener('gamepadconnected', (e) => {
      log.info(`Gamepad connected: ${e.gamepad.id}`);
      this.gamepads.set(e.gamepad.index, e.gamepad);
    });
    
    window.addEventListener('gamepaddisconnected', (e) => {
      log.info(`Gamepad disconnected: ${e.gamepad.id}`);
      this.gamepads.delete(e.gamepad.index);
    });
  }
  
  private setupTouchListeners(): void {
    window.addEventListener('touchstart', (e) => {
      for (const touch of Array.from(e.changedTouches)) {
        this.touchPoints.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
          startX: touch.clientX,
          startY: touch.clientY,
          startTime: Date.now()
        });
      }
    });
    
    window.addEventListener('touchmove', (e) => {
      for (const touch of Array.from(e.changedTouches)) {
        const point = this.touchPoints.get(touch.identifier);
        if (point) {
          point.x = touch.clientX;
          point.y = touch.clientY;
        }
      }
    });
    
    window.addEventListener('touchend', (e) => {
      for (const touch of Array.from(e.changedTouches)) {
        this.touchPoints.delete(touch.identifier);
      }
    });
  }
  
  pollGamepads(): Map<number, Gamepad> {
    const gamepads = navigator.getGamepads();
    for (const gamepad of gamepads) {
      if (gamepad) {
        this.gamepads.set(gamepad.index, gamepad);
      }
    }
    return this.gamepads;
  }
  
  getGamepadButton(index: number, button: number): boolean {
    const gamepad = this.gamepads.get(index);
    if (!gamepad) return false;
    return gamepad.buttons[button]?.pressed ?? false;
  }
  
  getGamepadAxis(index: number, axis: number): number {
    const gamepad = this.gamepads.get(index);
    if (!gamepad) return 0;
    
    const value = gamepad.axes[axis] ?? 0;
    return Math.abs(value) < this.deadZone ? 0 : value;
  }
  
  getGamepadStick(index: number, stick: 'left' | 'right'): { x: number; y: number } {
    const axisOffset = stick === 'left' ? 0 : 2;
    return {
      x: this.getGamepadAxis(index, axisOffset),
      y: this.getGamepadAxis(index, axisOffset + 1)
    };
  }
  
  getTouchPoints(): Map<number, { x: number; y: number; startX: number; startY: number; startTime: number }> {
    return new Map(this.touchPoints);
  }
  
  setDeadZone(value: number): void {
    this.deadZone = Math.max(0, Math.min(1, value));
  }
}

// ============================================================================
// INPUT BUFFER
// ============================================================================
