/**
 * Input Manager System - Sistema de Gerenciamento de Input
 * 
 * Sistema completo de input com:
 * - Keyboard, Mouse, Gamepad, Touch
 * - Input mapping/rebinding
 * - Action/Axis system
 * - Input buffering
 * - Multi-device support
 * - Gesture recognition
 * 
 * @module lib/input/input-manager
 */

import { EventEmitter } from 'events';
import { registerDefaultInputMappings } from './input-manager-default-mappings';
import {
  GAMEPAD_AXIS_MAP,
  GAMEPAD_BUTTON_MAP,
  MOUSE_BUTTON_MAP,
  type GamepadAxis,
  type GamepadButton,
  type Gesture,
  type InputAction,
  type InputAxis,
  type InputBinding,
  type InputBuffer,
  type InputDeviceType,
  type InputState,
  type KeyCode,
  type MouseButton,
  type Touch,
} from './input-manager-types';
export type {
  GamepadAxis,
  GamepadButton,
  Gesture,
  InputAction,
  InputAxis,
  InputBinding,
  InputBuffer,
  InputDeviceType,
  InputState,
  KeyCode,
  MouseButton,
  Touch,
} from './input-manager-types';

// ============================================================================
// INPUT MANAGER
// ============================================================================

export class InputManager extends EventEmitter {
  private actions: Map<string, InputAction> = new Map();
  private axes: Map<string, InputAxis> = new Map();
  
  // Current state
  private keyState: Map<string, boolean> = new Map();
  private mouseButtonState: Map<MouseButton, boolean> = new Map();
  private gamepadButtonState: Map<number, Map<GamepadButton, boolean>> = new Map();
  private gamepadAxisState: Map<number, Map<GamepadAxis, number>> = new Map();
  
  private mousePosition = { x: 0, y: 0 };
  private mouseDelta = { x: 0, y: 0 };
  private mouseScroll = { x: 0, y: 0 };
  
  private touches: Map<number, Touch> = new Map();
  private gestures: Gesture[] = [];
  
  // Axis values (smoothed)
  private axisValues: Map<string, number> = new Map();
  
  // Input buffer for combo detection
  private inputBuffer: InputBuffer[] = [];
  private bufferDuration = 300; // ms
  
  // Configuration
  private enabled = true;
  private mouseCapture = false;
  private gamepads: Map<number, Gamepad> = new Map();
  
  // Animation frame
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  
  constructor() {
    super();
    this.setupDefaultMappings();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  initialize(element: HTMLElement | Window = window): void {
    this.setupKeyboardListeners(element);
    this.setupMouseListeners(element);
    this.setupTouchListeners(element);
    this.setupGamepadListeners();
    
    this.startUpdateLoop();
    this.emit('initialized');
  }
  
  private setupKeyboardListeners(element: HTMLElement | Window): void {
    element.addEventListener('keydown', (e) => this.handleKeyDown(e as KeyboardEvent));
    element.addEventListener('keyup', (e) => this.handleKeyUp(e as KeyboardEvent));
  }
  
  private setupMouseListeners(element: HTMLElement | Window): void {
    element.addEventListener('mousedown', (e) => this.handleMouseDown(e as MouseEvent));
    element.addEventListener('mouseup', (e) => this.handleMouseUp(e as MouseEvent));
    element.addEventListener('mousemove', (e) => this.handleMouseMove(e as MouseEvent));
    element.addEventListener('wheel', (e) => this.handleWheel(e as WheelEvent), { passive: false });
    element.addEventListener('contextmenu', (e) => this.handleContextMenu(e as MouseEvent));
  }
  
  private setupTouchListeners(element: HTMLElement | Window): void {
    element.addEventListener('touchstart', (e) => this.handleTouchStart(e as TouchEvent));
    element.addEventListener('touchmove', (e) => this.handleTouchMove(e as TouchEvent));
    element.addEventListener('touchend', (e) => this.handleTouchEnd(e as TouchEvent));
    element.addEventListener('touchcancel', (e) => this.handleTouchCancel(e as TouchEvent));
  }
  
  private setupGamepadListeners(): void {
    window.addEventListener('gamepadconnected', (e) => this.handleGamepadConnected(e as GamepadEvent));
    window.addEventListener('gamepaddisconnected', (e) => this.handleGamepadDisconnected(e as GamepadEvent));
  }
  
  private startUpdateLoop(): void {
    const update = (time: number) => {
      const deltaTime = (time - this.lastFrameTime) / 1000;
      this.lastFrameTime = time;
      
      this.updateGamepads();
      this.updateAxes(deltaTime);
      this.cleanInputBuffer();
      this.detectGestures();
      
      // Reset per-frame values
      this.mouseDelta = { x: 0, y: 0 };
      this.mouseScroll = { x: 0, y: 0 };
      this.gestures = [];
      
      this.animationFrameId = requestAnimationFrame(update);
    };
    
    this.animationFrameId = requestAnimationFrame(update);
  }
  
  // ============================================================================
  // KEYBOARD HANDLERS
  // ============================================================================
  
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;
    
    const wasPressed = this.keyState.get(e.code);
    this.keyState.set(e.code, true);
    
    if (!wasPressed) {
      this.addToBuffer(e.code, 'keyboard');
      this.emit('keyDown', { code: e.code, key: e.key, modifiers: this.getModifiers(e) });
      this.checkActionTriggers('keyboard', e.code, true, e);
    }
    
    this.emit('keyHeld', { code: e.code, key: e.key });
  }
  
  private handleKeyUp(e: KeyboardEvent): void {
    if (!this.enabled) return;
    
    this.keyState.set(e.code, false);
    this.emit('keyUp', { code: e.code, key: e.key });
    this.checkActionTriggers('keyboard', e.code, false, e);
  }
  
  private getModifiers(e: KeyboardEvent | MouseEvent): InputBinding['modifiers'] {
    return {
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey,
    };
  }
  
  // ============================================================================
  // MOUSE HANDLERS
  // ============================================================================
  
  private handleMouseDown(e: MouseEvent): void {
    if (!this.enabled) return;
    
    const button = MOUSE_BUTTON_MAP[e.button];
    if (button) {
      this.mouseButtonState.set(button, true);
      this.addToBuffer(`mouse_${button}`, 'mouse');
      this.emit('mouseDown', { button, position: { x: e.clientX, y: e.clientY } });
      this.checkActionTriggers('mouse', button, true, e);
    }
  }
  
  private handleMouseUp(e: MouseEvent): void {
    if (!this.enabled) return;
    
    const button = MOUSE_BUTTON_MAP[e.button];
    if (button) {
      this.mouseButtonState.set(button, false);
      this.emit('mouseUp', { button, position: { x: e.clientX, y: e.clientY } });
      this.checkActionTriggers('mouse', button, false, e);
    }
  }
  
  private handleMouseMove(e: MouseEvent): void {
    if (!this.enabled) return;
    
    const newPosition = { x: e.clientX, y: e.clientY };
    
    this.mouseDelta = {
      x: this.mouseDelta.x + (e.movementX || newPosition.x - this.mousePosition.x),
      y: this.mouseDelta.y + (e.movementY || newPosition.y - this.mousePosition.y),
    };
    
    this.mousePosition = newPosition;
    this.emit('mouseMove', { position: newPosition, delta: this.mouseDelta });
  }
  
  private handleWheel(e: WheelEvent): void {
    if (!this.enabled) return;
    
    this.mouseScroll = {
      x: this.mouseScroll.x + e.deltaX,
      y: this.mouseScroll.y + e.deltaY,
    };
    
    this.emit('wheel', { delta: { x: e.deltaX, y: e.deltaY } });
  }
  
  private handleContextMenu(e: MouseEvent): void {
    if (this.mouseCapture) {
      e.preventDefault();
    }
  }
  
  // ============================================================================
  // TOUCH HANDLERS
  // ============================================================================
  
  private handleTouchStart(e: TouchEvent): void {
    if (!this.enabled) return;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const touch: Touch = {
        id: t.identifier,
        position: { x: t.clientX, y: t.clientY },
        startPosition: { x: t.clientX, y: t.clientY },
        delta: { x: 0, y: 0 },
        pressure: t.force || 1,
        isActive: true,
      };
      this.touches.set(t.identifier, touch);
    }
    
    this.emit('touchStart', { touches: Array.from(this.touches.values()) });
  }
  
  private handleTouchMove(e: TouchEvent): void {
    if (!this.enabled) return;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const touch = this.touches.get(t.identifier);
      if (touch) {
        const newPos = { x: t.clientX, y: t.clientY };
        touch.delta = {
          x: newPos.x - touch.position.x,
          y: newPos.y - touch.position.y,
        };
        touch.position = newPos;
        touch.pressure = t.force || 1;
      }
    }
    
    this.emit('touchMove', { touches: Array.from(this.touches.values()) });
  }
  
  private handleTouchEnd(e: TouchEvent): void {
    if (!this.enabled) return;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const touch = this.touches.get(t.identifier);
      if (touch) {
        touch.isActive = false;
        this.touches.delete(t.identifier);
      }
    }
    
    this.emit('touchEnd', { touches: Array.from(this.touches.values()) });
  }
  
  private handleTouchCancel(e: TouchEvent): void {
    this.handleTouchEnd(e);
  }
  
  private detectGestures(): void {
    const activeTouches = Array.from(this.touches.values());
    
    // Detect pinch/zoom
    if (activeTouches.length === 2) {
      const t1 = activeTouches[0];
      const t2 = activeTouches[1];
      
      const currentDist = Math.hypot(
        t1.position.x - t2.position.x,
        t1.position.y - t2.position.y
      );
      
      const startDist = Math.hypot(
        t1.startPosition.x - t2.startPosition.x,
        t1.startPosition.y - t2.startPosition.y
      );
      
      if (startDist > 0) {
        const scale = currentDist / startDist;
        if (Math.abs(scale - 1) > 0.1) {
          this.gestures.push({
            type: 'pinch',
            scale,
            position: {
              x: (t1.position.x + t2.position.x) / 2,
              y: (t1.position.y + t2.position.y) / 2,
            },
          });
        }
      }
    }
  }
  
  // ============================================================================
  // GAMEPAD HANDLERS
  // ============================================================================
  
  private handleGamepadConnected(e: GamepadEvent): void {
    const gamepad = e.gamepad;
    this.gamepads.set(gamepad.index, gamepad);
    this.gamepadButtonState.set(gamepad.index, new Map());
    this.gamepadAxisState.set(gamepad.index, new Map());
    
    this.emit('gamepadConnected', { index: gamepad.index, id: gamepad.id });
  }
  
  private handleGamepadDisconnected(e: GamepadEvent): void {
    const gamepad = e.gamepad;
    this.gamepads.delete(gamepad.index);
    this.gamepadButtonState.delete(gamepad.index);
    this.gamepadAxisState.delete(gamepad.index);
    
    this.emit('gamepadDisconnected', { index: gamepad.index, id: gamepad.id });
  }
  
  private updateGamepads(): void {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    
    for (const gamepad of gamepads) {
      if (!gamepad) continue;
      
      this.gamepads.set(gamepad.index, gamepad);
      
      // Update buttons
      let buttonState = this.gamepadButtonState.get(gamepad.index);
      if (!buttonState) {
        buttonState = new Map();
        this.gamepadButtonState.set(gamepad.index, buttonState);
      }
      
      for (let i = 0; i < gamepad.buttons.length; i++) {
        const button = GAMEPAD_BUTTON_MAP[i];
        if (!button) continue;
        
        const pressed = gamepad.buttons[i].pressed;
        const wasPressed = buttonState.get(button);
        
        if (pressed !== wasPressed) {
          buttonState.set(button, pressed);
          
          if (pressed) {
            this.addToBuffer(`gamepad_${button}`, 'gamepad');
            this.emit('gamepadButtonDown', { gamepadIndex: gamepad.index, button });
          } else {
            this.emit('gamepadButtonUp', { gamepadIndex: gamepad.index, button });
          }
          
          this.checkActionTriggers('gamepad', button, pressed);
        }
      }
      
      // Update axes
      let axisState = this.gamepadAxisState.get(gamepad.index);
      if (!axisState) {
        axisState = new Map();
        this.gamepadAxisState.set(gamepad.index, axisState);
      }
      
      for (let i = 0; i < gamepad.axes.length; i++) {
        const axis = GAMEPAD_AXIS_MAP[i];
        if (!axis) continue;
        
        axisState.set(axis, gamepad.axes[i]);
      }
      
      // Triggers as axes
      if (gamepad.buttons[6]) {
        axisState.set('lt', gamepad.buttons[6].value);
      }
      if (gamepad.buttons[7]) {
        axisState.set('rt', gamepad.buttons[7].value);
      }
    }
  }
  
  // ============================================================================
  // ACTION SYSTEM
  // ============================================================================
  
  registerAction(action: InputAction): void {
    this.actions.set(action.name, action);
    this.emit('actionRegistered', { action });
  }
  
  registerAxis(axis: InputAxis): void {
    this.axes.set(axis.name, axis);
    this.axisValues.set(axis.name, 0);
    this.emit('axisRegistered', { axis });
  }
  
  removeAction(name: string): void {
    this.actions.delete(name);
    this.emit('actionRemoved', { name });
  }
  
  removeAxis(name: string): void {
    this.axes.delete(name);
    this.axisValues.delete(name);
    this.emit('axisRemoved', { name });
  }
  
  private checkActionTriggers(
    device: InputDeviceType,
    input: string,
    pressed: boolean,
    event?: KeyboardEvent | MouseEvent
  ): void {
    for (const action of this.actions.values()) {
      for (const binding of action.bindings) {
        if (binding.device !== device) continue;
        
        let matches = false;
        
        if (device === 'keyboard' && binding.key === input) {
          // Check modifiers
          if (binding.modifiers && event) {
            const mods = this.getModifiers(event as KeyboardEvent);
            if (mods && (
              (binding.modifiers.ctrl && !mods.ctrl) ||
              (binding.modifiers.alt && !mods.alt) ||
              (binding.modifiers.shift && !mods.shift) ||
              (binding.modifiers.meta && !mods.meta)
            )) {
              continue;
            }
          }
          matches = true;
        }
        
        if (device === 'mouse' && binding.button === input) {
          matches = true;
        }
        
        if (device === 'gamepad' && binding.button === input) {
          matches = true;
        }
        
        if (matches) {
          if (pressed) {
            this.emit('actionPressed', { action: action.name });
            this.emit(`action:${action.name}:pressed`);
          } else {
            this.emit('actionReleased', { action: action.name });
            this.emit(`action:${action.name}:released`);
          }
          
          if (action.consumeInput && event) {
            event.preventDefault();
            event.stopPropagation();
          }
        }
      }
    }
  }
  
  private updateAxes(deltaTime: number): void {
    for (const [name, axis] of this.axes) {
      let targetValue = 0;
      const gravity = axis.gravity ?? 3;
      const sensitivity = axis.sensitivity ?? 3;
      
      // Check positive bindings
      for (const binding of axis.positiveBindings) {
        const value = this.getBindingValue(binding);
        targetValue += value * (binding.scale ?? 1);
      }
      
      // Check negative bindings
      for (const binding of axis.negativeBindings) {
        const value = this.getBindingValue(binding);
        targetValue -= value * (binding.scale ?? 1);
      }
      
      // Apply deadzone
      const deadzone = axis.deadzone ?? 0.1;
      if (Math.abs(targetValue) < deadzone) {
        targetValue = 0;
      }
      
      // Get current value
      let currentValue = this.axisValues.get(name) ?? 0;
      
      // Apply snap (when direction changes, reset to 0)
      if (axis.snap && targetValue !== 0 && Math.sign(targetValue) !== Math.sign(currentValue)) {
        currentValue = 0;
      }
      
      // Smoothly interpolate
      if (targetValue !== 0) {
        // Move towards target
        const diff = targetValue - currentValue;
        currentValue += diff * sensitivity * deltaTime;
        currentValue = Math.max(-1, Math.min(1, currentValue));
      } else {
        // Apply gravity (return to 0)
        if (currentValue > 0) {
          currentValue = Math.max(0, currentValue - gravity * deltaTime);
        } else if (currentValue < 0) {
          currentValue = Math.min(0, currentValue + gravity * deltaTime);
        }
      }
      
      this.axisValues.set(name, currentValue);
    }
  }
  
  private getBindingValue(binding: InputBinding): number {
    switch (binding.device) {
      case 'keyboard':
        return this.keyState.get(binding.key!) ? 1 : 0;
        
      case 'mouse':
        return this.mouseButtonState.get(binding.button as MouseButton) ? 1 : 0;
        
      case 'gamepad':
        if (binding.axis) {
          // Get first connected gamepad
          const axisState = this.gamepadAxisState.values().next().value;
          if (axisState) {
            let value = axisState.get(binding.axis) ?? 0;
            const deadzone = binding.deadzone ?? 0.1;
            if (Math.abs(value) < deadzone) value = 0;
            return value;
          }
        }
        if (binding.button) {
          const buttonState = this.gamepadButtonState.values().next().value;
          if (buttonState) {
            return buttonState.get(binding.button as GamepadButton) ? 1 : 0;
          }
        }
        return 0;
        
      default:
        return 0;
    }
  }
  
  // ============================================================================
  // INPUT QUERIES
  // ============================================================================
  
  isKeyPressed(key: KeyCode): boolean {
    return this.keyState.get(key) ?? false;
  }
  
  isMouseButtonPressed(button: MouseButton): boolean {
    return this.mouseButtonState.get(button) ?? false;
  }
  
  isGamepadButtonPressed(button: GamepadButton, gamepadIndex = 0): boolean {
    const state = this.gamepadButtonState.get(gamepadIndex);
    return state?.get(button) ?? false;
  }
  
  getGamepadAxis(axis: GamepadAxis, gamepadIndex = 0): number {
    const state = this.gamepadAxisState.get(gamepadIndex);
    return state?.get(axis) ?? 0;
  }
  
  isActionPressed(actionName: string): boolean {
    const action = this.actions.get(actionName);
    if (!action) return false;
    
    for (const binding of action.bindings) {
      if (this.getBindingValue(binding) > 0) {
        return true;
      }
    }
    
    return false;
  }
  
  getAxisValue(axisName: string): number {
    return this.axisValues.get(axisName) ?? 0;
  }
  
  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }
  
  getMouseDelta(): { x: number; y: number } {
    return { ...this.mouseDelta };
  }
  
  getScroll(): { x: number; y: number } {
    return { ...this.mouseScroll };
  }
  
  getTouches(): Touch[] {
    return Array.from(this.touches.values());
  }
  
  getGestures(): Gesture[] {
    return [...this.gestures];
  }
  
  // ============================================================================
  // INPUT BUFFER (for combos)
  // ============================================================================
  
  private addToBuffer(input: string, device: InputDeviceType): void {
    this.inputBuffer.push({
      action: input,
      timestamp: performance.now(),
      device,
    });
  }
  
  private cleanInputBuffer(): void {
    const now = performance.now();
    this.inputBuffer = this.inputBuffer.filter(
      (item) => now - item.timestamp < this.bufferDuration
    );
  }
  
  checkCombo(sequence: string[]): boolean {
    if (sequence.length > this.inputBuffer.length) return false;
    
    const recentInputs = this.inputBuffer.slice(-sequence.length);
    
    for (let i = 0; i < sequence.length; i++) {
      if (recentInputs[i].action !== sequence[i]) {
        return false;
      }
    }
    
    return true;
  }
  
  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.emit('enabledChanged', { enabled });
  }
  
  setMouseCapture(capture: boolean): void {
    this.mouseCapture = capture;
    
    if (capture) {
      document.body.requestPointerLock?.();
    } else {
      document.exitPointerLock?.();
    }
    
    this.emit('mouseCaptureChanged', { capture });
  }
  
  setBufferDuration(ms: number): void {
    this.bufferDuration = ms;
  }
  
  // ============================================================================
  // DEFAULT MAPPINGS
  // ============================================================================
  
  private setupDefaultMappings(): void {
    registerDefaultInputMappings(
      (action) => this.registerAction(action),
      (axis) => this.registerAxis(axis)
    );
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================
  
  exportMappings(): { actions: InputAction[]; axes: InputAxis[] } {
    return {
      actions: Array.from(this.actions.values()),
      axes: Array.from(this.axes.values()),
    };
  }
  
  importMappings(data: { actions?: InputAction[]; axes?: InputAxis[] }): void {
    if (data.actions) {
      for (const action of data.actions) {
        this.registerAction(action);
      }
    }
    
    if (data.axes) {
      for (const axis of data.axes) {
        this.registerAxis(axis);
      }
    }
    
    this.emit('mappingsImported', { data });
  }
  
  // ============================================================================
  // STATE
  // ============================================================================
  
  getState(): InputState {
    const actionStates = new Map<string, boolean>();
    for (const action of this.actions.keys()) {
      actionStates.set(action, this.isActionPressed(action));
    }
    
    return {
      actions: actionStates,
      axes: new Map(this.axisValues),
      mousePosition: this.getMousePosition(),
      mouseDelta: this.getMouseDelta(),
      scroll: this.getScroll(),
      touches: this.getTouches(),
    };
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.actions.clear();
    this.axes.clear();
    this.keyState.clear();
    this.mouseButtonState.clear();
    this.gamepadButtonState.clear();
    this.gamepadAxisState.clear();
    this.touches.clear();
    
    this.removeAllListeners();
    this.emit('disposed');
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export function useInputManager() {
  const managerRef = useRef<InputManager>(new InputManager());
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    const manager = managerRef.current;
    manager.on('initialized', () => setIsInitialized(true));
    
    return () => {
      manager.dispose();
    };
  }, []);
  
  const initialize = useCallback((element?: HTMLElement) => {
    managerRef.current.initialize(element || window);
  }, []);
  
  const isActionPressed = useCallback((action: string) => {
    return managerRef.current.isActionPressed(action);
  }, []);
  
  const getAxis = useCallback((axis: string) => {
    return managerRef.current.getAxisValue(axis);
  }, []);
  
  const registerAction = useCallback((action: InputAction) => {
    managerRef.current.registerAction(action);
  }, []);
  
  const registerAxis = useCallback((axis: InputAxis) => {
    managerRef.current.registerAxis(axis);
  }, []);
  
  return {
    manager: managerRef.current,
    isInitialized,
    initialize,
    isActionPressed,
    getAxis,
    registerAction,
    registerAxis,
    getMousePosition: () => managerRef.current.getMousePosition(),
    getMouseDelta: () => managerRef.current.getMouseDelta(),
    setMouseCapture: (capture: boolean) => managerRef.current.setMouseCapture(capture),
    setEnabled: (enabled: boolean) => managerRef.current.setEnabled(enabled),
  };
}

export function useAction(actionName: string, callback: () => void) {
  const { manager } = useInputManager();
  
  useEffect(() => {
    const handler = () => callback();
    manager.on(`action:${actionName}:pressed`, handler);
    
    return () => {
      manager.off(`action:${actionName}:pressed`, handler);
    };
  }, [manager, actionName, callback]);
}

export function useAxis(axisName: string): number {
  const { manager } = useInputManager();
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    let frameId: number;
    
    const update = () => {
      setValue(manager.getAxisValue(axisName));
      frameId = requestAnimationFrame(update);
    };
    
    frameId = requestAnimationFrame(update);
    
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [manager, axisName]);
  
  return value;
}

const __defaultExport = {
  InputManager,
};

export default __defaultExport;
