/**
 * ADVANCED INPUT SYSTEM - Aethel Engine
 * 
 * Sistema avançado de input para games.
 * 
 * FEATURES:
 * - Input rebinding
 * - Context switching
 * - Combo detection
 * - Gesture recognition
 * - Controller support (gamepads)
 * - Touch support
 * - Input recording/playback
 * - Dead zones
 * - Input buffering
 */

// ============================================================================
// TYPES
// ============================================================================

import type {
  ComboStep,
  GestureConfig,
  InputAction,
  InputBinding,
  InputCombo,
  InputContext,
  InputDeviceType,
  InputState,
  KeyCode,
  RecordedInput,
} from './advanced-input-system.types';
import { InputDeviceManager } from './advanced-input-device-manager';
export { InputDeviceManager } from './advanced-input-device-manager';
export type {
  ComboStep,
  GestureConfig,
  InputAction,
  InputBinding,
  InputCombo,
  InputContext,
  InputDeviceType,
  InputState,
  KeyCode,
  RecordedInput,
} from './advanced-input-system.types';

// ============================================================================
// INPUT BUFFER
// ============================================================================

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

export class ComboDetector {
  private combos: InputCombo[] = [];
  private activeSequences: Map<InputCombo, { step: number; lastTime: number }> = new Map();
  
  addCombo(combo: InputCombo): void {
    this.combos.push(combo);
  }
  
  removeCombo(name: string): void {
    this.combos = this.combos.filter(c => c.name !== name);
    for (const combo of this.combos) {
      if (combo.name === name) {
        this.activeSequences.delete(combo);
      }
    }
  }
  
  processInput(action: string): void {
    const now = Date.now();
    
    for (const combo of this.combos) {
      let state = this.activeSequences.get(combo);
      
      if (!state) {
        // Check if this action starts the combo
        if (combo.steps[0].action === action) {
          this.activeSequences.set(combo, { step: 1, lastTime: now });
        }
        continue;
      }
      
      const currentStep = combo.steps[state.step];
      
      // Check timeout
      if (now - state.lastTime > currentStep.maxDelay) {
        this.activeSequences.delete(combo);
        
        // Check if this action restarts the combo
        if (combo.steps[0].action === action) {
          this.activeSequences.set(combo, { step: 1, lastTime: now });
        }
        continue;
      }
      
      // Check if action matches
      if (currentStep.action === action) {
        state.step++;
        state.lastTime = now;
        
        // Check if combo complete
        if (state.step >= combo.steps.length) {
          combo.onComplete();
          this.activeSequences.delete(combo);
        }
      }
    }
  }
  
  reset(): void {
    this.activeSequences.clear();
  }
}

// ============================================================================
// GESTURE RECOGNIZER
// ============================================================================

export class GestureRecognizer {
  private gestures: Map<string, GestureConfig> = new Map();
  private callbacks: Map<string, ((data: any) => void)[]> = new Map();
  
  private touchStart: Map<number, { x: number; y: number; time: number }> = new Map();
  private lastTapTime: number = 0;
  private tapCount: number = 0;
  
  registerGesture(name: string, config: GestureConfig): void {
    this.gestures.set(name, config);
    this.callbacks.set(name, []);
  }
  
  onGesture(name: string, callback: (data: any) => void): void {
    const callbacks = this.callbacks.get(name);
    if (callbacks) {
      callbacks.push(callback);
    }
  }
  
  processTouchStart(touches: Map<number, { x: number; y: number }>): void {
    const now = Date.now();
    
    for (const [id, pos] of touches) {
      this.touchStart.set(id, { x: pos.x, y: pos.y, time: now });
    }
  }
  
  processTouchEnd(touches: Map<number, { x: number; y: number }>): void {
    const now = Date.now();
    
    for (const [id, endPos] of touches) {
      const start = this.touchStart.get(id);
      if (!start) continue;
      
      const deltaX = endPos.x - start.x;
      const deltaY = endPos.y - start.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const duration = now - start.time;
      
      // Check each gesture
      for (const [name, config] of this.gestures) {
        if (this.matchesGesture(config, distance, duration, deltaX, deltaY, touches.size)) {
          this.emit(name, { deltaX, deltaY, distance, duration });
        }
      }
      
      this.touchStart.delete(id);
    }
  }
  
  private matchesGesture(
    config: GestureConfig,
    distance: number,
    duration: number,
    deltaX: number,
    deltaY: number,
    fingerCount: number
  ): boolean {
    if (config.fingers && config.fingers !== fingerCount) return false;
    
    switch (config.type) {
      case 'swipe':
        return distance >= (config.minDistance ?? 50) && duration < (config.maxTime ?? 500);
        
      case 'tap':
        return distance < 10 && duration < 200;
        
      case 'hold':
        return distance < 10 && duration >= (config.maxTime ?? 500);
        
      default:
        return false;
    }
  }
  
  private emit(name: string, data: any): void {
    const callbacks = this.callbacks.get(name);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(data);
      }
    }
  }
}

// ============================================================================
// INPUT RECORDER
// ============================================================================

export class InputRecorder {
  private recording: boolean = false;
  private playing: boolean = false;
  private recordedInputs: RecordedInput[] = [];
  private playbackIndex: number = 0;
  private playbackStartTime: number = 0;
  private recordStartTime: number = 0;
  
  private onInputCallback: ((input: RecordedInput) => void) | null = null;
  
  startRecording(): void {
    this.recording = true;
    this.recordedInputs = [];
    this.recordStartTime = Date.now();
  }
  
  stopRecording(): RecordedInput[] {
    this.recording = false;
    return [...this.recordedInputs];
  }
  
  recordInput(type: RecordedInput['type'], key?: string, value?: any): void {
    if (!this.recording) return;
    
    this.recordedInputs.push({
      timestamp: Date.now() - this.recordStartTime,
      type,
      key,
      value
    });
  }
  
  startPlayback(inputs?: RecordedInput[]): void {
    if (inputs) {
      this.recordedInputs = inputs;
    }
    
    this.playing = true;
    this.playbackIndex = 0;
    this.playbackStartTime = Date.now();
  }
  
  stopPlayback(): void {
    this.playing = false;
    this.playbackIndex = 0;
  }
  
  setInputCallback(callback: (input: RecordedInput) => void): void {
    this.onInputCallback = callback;
  }
  
  update(): void {
    if (!this.playing) return;
    
    const elapsed = Date.now() - this.playbackStartTime;
    
    while (this.playbackIndex < this.recordedInputs.length) {
      const input = this.recordedInputs[this.playbackIndex];
      
      if (input.timestamp > elapsed) break;
      
      if (this.onInputCallback) {
        this.onInputCallback(input);
      }
      
      this.playbackIndex++;
    }
    
    if (this.playbackIndex >= this.recordedInputs.length) {
      this.playing = false;
    }
  }
  
  isRecording(): boolean {
    return this.recording;
  }
  
  isPlaying(): boolean {
    return this.playing;
  }
  
  exportRecording(): string {
    return JSON.stringify(this.recordedInputs);
  }
  
  importRecording(json: string): void {
    this.recordedInputs = JSON.parse(json);
  }
}

// ============================================================================
// MAIN INPUT MANAGER
// ============================================================================

export class InputManager {
  private contexts: Map<string, InputContext> = new Map();
  private activeContexts: InputContext[] = [];
  
  private bindings: Map<string, InputBinding[]> = new Map();
  
  private state: InputState = {
    pressed: new Set(),
    justPressed: new Set(),
    justReleased: new Set(),
    axisValues: new Map(),
    axis2DValues: new Map(),
    mousePosition: { x: 0, y: 0 },
    mouseDelta: { x: 0, y: 0 }
  };
  
  private previousKeys: Set<string> = new Set();
  private holdTimers: Map<string, number> = new Map();
  private tapTimers: Map<string, { count: number; lastTime: number }> = new Map();
  
  private deviceManager: InputDeviceManager;
  private buffer: InputBuffer;
  private comboDetector: ComboDetector;
  private gestureRecognizer: GestureRecognizer;
  private recorder: InputRecorder;
  
  private actionCallbacks: Map<string, ((value: number | { x: number; y: number }) => void)[]> = new Map();
  
  private pointerLocked: boolean = false;
  
  constructor() {
    this.deviceManager = new InputDeviceManager();
    this.buffer = new InputBuffer();
    this.comboDetector = new ComboDetector();
    this.gestureRecognizer = new GestureRecognizer();
    this.recorder = new InputRecorder();
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (!this.previousKeys.has(e.code)) {
        this.state.justPressed.add(e.code);
      }
      this.state.pressed.add(e.code);
      this.recorder.recordInput('press', e.code);
    });
    
    window.addEventListener('keyup', (e) => {
      this.state.pressed.delete(e.code);
      this.state.justReleased.add(e.code);
      this.recorder.recordInput('release', e.code);
    });
    
    // Mouse
    window.addEventListener('mousedown', (e) => {
      const key = `Mouse${e.button}`;
      if (!this.previousKeys.has(key)) {
        this.state.justPressed.add(key);
      }
      this.state.pressed.add(key);
      this.recorder.recordInput('press', key);
    });
    
    window.addEventListener('mouseup', (e) => {
      const key = `Mouse${e.button}`;
      this.state.pressed.delete(key);
      this.state.justReleased.add(key);
      this.recorder.recordInput('release', key);
    });
    
    window.addEventListener('mousemove', (e) => {
      const prevX = this.state.mousePosition.x;
      const prevY = this.state.mousePosition.y;
      
      this.state.mousePosition.x = e.clientX;
      this.state.mousePosition.y = e.clientY;
      
      if (this.pointerLocked) {
        this.state.mouseDelta.x = e.movementX;
        this.state.mouseDelta.y = e.movementY;
      } else {
        this.state.mouseDelta.x = e.clientX - prevX;
        this.state.mouseDelta.y = e.clientY - prevY;
      }
      
      this.recorder.recordInput('mouse', undefined, this.state.mousePosition);
    });
    
    window.addEventListener('wheel', (e) => {
      this.state.axisValues.set('MouseWheel', e.deltaY);
    });
    
    // Pointer lock
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement !== null;
    });
  }
  
  // ============================================================================
  // CONTEXT MANAGEMENT
  // ============================================================================
  
  createContext(name: string, priority: number = 0): InputContext {
    const context: InputContext = {
      name,
      priority,
      actions: [],
      consumeInput: true,
      enabled: true
    };
    
    this.contexts.set(name, context);
    this.updateActiveContexts();
    
    return context;
  }
  
  enableContext(name: string): void {
    const context = this.contexts.get(name);
    if (context) {
      context.enabled = true;
      this.updateActiveContexts();
    }
  }
  
  disableContext(name: string): void {
    const context = this.contexts.get(name);
    if (context) {
      context.enabled = false;
      this.updateActiveContexts();
    }
  }
  
  private updateActiveContexts(): void {
    this.activeContexts = Array.from(this.contexts.values())
      .filter(c => c.enabled)
      .sort((a, b) => b.priority - a.priority);
  }
  
  // ============================================================================
  // ACTION MANAGEMENT
  // ============================================================================
  
  addAction(contextName: string, action: InputAction): void {
    const context = this.contexts.get(contextName);
    if (!context) return;
    
    context.actions.push(action);
    
    // Register default bindings
    for (const binding of action.defaultBindings) {
      this.addBinding(action.name, binding);
    }
  }
  
  addBinding(action: string, binding: InputBinding): void {
    let bindings = this.bindings.get(action);
    if (!bindings) {
      bindings = [];
      this.bindings.set(action, bindings);
    }
    bindings.push(binding);
  }
  
  removeBinding(action: string, keys: KeyCode[]): void {
    const bindings = this.bindings.get(action);
    if (!bindings) return;
    
    const index = bindings.findIndex(b => 
      b.keys.length === keys.length && 
      b.keys.every((k, i) => k === keys[i])
    );
    
    if (index !== -1) {
      bindings.splice(index, 1);
    }
  }
  
  rebind(action: string, oldKeys: KeyCode[], newKeys: KeyCode[]): void {
    const bindings = this.bindings.get(action);
    if (!bindings) return;
    
    const binding = bindings.find(b => 
      b.keys.length === oldKeys.length && 
      b.keys.every((k, i) => k === oldKeys[i])
    );
    
    if (binding) {
      binding.keys = newKeys;
    }
  }
  
  // ============================================================================
  // INPUT QUERIES
  // ============================================================================
  
  isActionPressed(action: string): boolean {
    const bindings = this.bindings.get(action);
    if (!bindings) return false;
    
    for (const binding of bindings) {
      // Check modifiers
      if (binding.modifiers) {
        const allModifiers = binding.modifiers.every(m => this.state.pressed.has(m));
        if (!allModifiers) continue;
      }
      
      // Check keys
      const anyKey = binding.keys.some(k => this.state.pressed.has(k));
      if (anyKey) return true;
    }
    
    return false;
  }
  
  isActionJustPressed(action: string): boolean {
    const bindings = this.bindings.get(action);
    if (!bindings) return false;
    
    for (const binding of bindings) {
      if (binding.modifiers) {
        const allModifiers = binding.modifiers.every(m => this.state.pressed.has(m));
        if (!allModifiers) continue;
      }
      
      const anyKey = binding.keys.some(k => this.state.justPressed.has(k));
      if (anyKey) return true;
    }
    
    return false;
  }
  
  isActionJustReleased(action: string): boolean {
    const bindings = this.bindings.get(action);
    if (!bindings) return false;
    
    for (const binding of bindings) {
      const anyKey = binding.keys.some(k => this.state.justReleased.has(k));
      if (anyKey) return true;
    }
    
    return false;
  }
  
  getActionHoldTime(action: string): number {
    return this.holdTimers.get(action) ?? 0;
  }
  
  getAxisValue(action: string): number {
    return this.state.axisValues.get(action) ?? 0;
  }
  
  getAxis2DValue(action: string): { x: number; y: number } {
    return this.state.axis2DValues.get(action) ?? { x: 0, y: 0 };
  }
  
  getMousePosition(): { x: number; y: number } {
    return { ...this.state.mousePosition };
  }
  
  getMouseDelta(): { x: number; y: number } {
    return { ...this.state.mouseDelta };
  }
  
  // ============================================================================
  // CALLBACKS
  // ============================================================================
  
  onAction(action: string, callback: (value: number | { x: number; y: number }) => void): void {
    let callbacks = this.actionCallbacks.get(action);
    if (!callbacks) {
      callbacks = [];
      this.actionCallbacks.set(action, callbacks);
    }
    callbacks.push(callback);
  }
  
  offAction(action: string, callback: (value: number | { x: number; y: number }) => void): void {
    const callbacks = this.actionCallbacks.get(action);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  private emitAction(action: string, value: number | { x: number; y: number }): void {
    const callbacks = this.actionCallbacks.get(action);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(value);
      }
    }
  }
  
  // ============================================================================
  // COMBOS
  // ============================================================================
  
  addCombo(combo: InputCombo): void {
    this.comboDetector.addCombo(combo);
  }
  
  removeCombo(name: string): void {
    this.comboDetector.removeCombo(name);
  }
  
  // ============================================================================
  // GESTURES
  // ============================================================================
  
  registerGesture(name: string, config: GestureConfig): void {
    this.gestureRecognizer.registerGesture(name, config);
  }
  
  onGesture(name: string, callback: (data: any) => void): void {
    this.gestureRecognizer.onGesture(name, callback);
  }
  
  // ============================================================================
  // RECORDING
  // ============================================================================
  
  startRecording(): void {
    this.recorder.startRecording();
  }
  
  stopRecording(): RecordedInput[] {
    return this.recorder.stopRecording();
  }
  
  startPlayback(inputs?: RecordedInput[]): void {
    this.recorder.startPlayback(inputs);
    this.recorder.setInputCallback((input) => {
      if (input.type === 'press' && input.key) {
        this.state.pressed.add(input.key);
        this.state.justPressed.add(input.key);
      } else if (input.type === 'release' && input.key) {
        this.state.pressed.delete(input.key);
        this.state.justReleased.add(input.key);
      }
    });
  }
  
  stopPlayback(): void {
    this.recorder.stopPlayback();
  }
  
  // ============================================================================
  // UPDATE
  // ============================================================================
  
  update(deltaTime: number): void {
    // Poll gamepads
    this.deviceManager.pollGamepads();
    
    // Update gamepad buttons and axes
    this.updateGamepadState();
    
    // Process hold timers
    for (const [action] of this.bindings) {
      if (this.isActionPressed(action)) {
        const current = this.holdTimers.get(action) ?? 0;
        this.holdTimers.set(action, current + deltaTime * 1000);
      } else {
        this.holdTimers.delete(action);
      }
    }
    
    // Process combos
    for (const action of this.state.justPressed) {
      this.comboDetector.processInput(action);
    }
    
    // Process actions and emit callbacks
    for (const [action, bindings] of this.bindings) {
      for (const binding of bindings) {
        if (binding.holdTime) {
          const holdTime = this.getActionHoldTime(action);
          if (holdTime >= binding.holdTime) {
            this.emitAction(action, 1);
          }
        } else if (this.isActionJustPressed(action)) {
          this.emitAction(action, 1);
          this.buffer.add(action);
        }
      }
    }
    
    // Update recorder
    this.recorder.update();
    
    // Save current state for next frame
    this.previousKeys = new Set(this.state.pressed);
    
    // Clear frame-specific state
    this.state.justPressed.clear();
    this.state.justReleased.clear();
    this.state.mouseDelta = { x: 0, y: 0 };
    this.state.axisValues.delete('MouseWheel');
  }
  
  private updateGamepadState(): void {
    // Standard gamepad button mapping
    const buttonMap: Record<number, string> = {
      0: 'Gamepad_A',
      1: 'Gamepad_B',
      2: 'Gamepad_X',
      3: 'Gamepad_Y',
      4: 'Gamepad_LB',
      5: 'Gamepad_RB',
      6: 'Gamepad_LT',
      7: 'Gamepad_RT',
      8: 'Gamepad_Back',
      9: 'Gamepad_Start',
      10: 'Gamepad_LS',
      11: 'Gamepad_RS',
      12: 'Gamepad_Up',
      13: 'Gamepad_Down',
      14: 'Gamepad_Left',
      15: 'Gamepad_Right'
    };
    
    for (let i = 0; i < 4; i++) {
      // Buttons
      for (let b = 0; b < 16; b++) {
        const key = `Gamepad${i}_${buttonMap[b] ?? b}`;
        const pressed = this.deviceManager.getGamepadButton(i, b);
        
        if (pressed && !this.previousKeys.has(key)) {
          this.state.justPressed.add(key);
        } else if (!pressed && this.previousKeys.has(key)) {
          this.state.justReleased.add(key);
        }
        
        if (pressed) {
          this.state.pressed.add(key);
        } else {
          this.state.pressed.delete(key);
        }
      }
      
      // Axes
      const leftStick = this.deviceManager.getGamepadStick(i, 'left');
      const rightStick = this.deviceManager.getGamepadStick(i, 'right');
      
      this.state.axis2DValues.set(`Gamepad${i}_LeftStick`, leftStick);
      this.state.axis2DValues.set(`Gamepad${i}_RightStick`, rightStick);
      
      this.state.axisValues.set(`Gamepad${i}_LeftStickX`, leftStick.x);
      this.state.axisValues.set(`Gamepad${i}_LeftStickY`, leftStick.y);
      this.state.axisValues.set(`Gamepad${i}_RightStickX`, rightStick.x);
      this.state.axisValues.set(`Gamepad${i}_RightStickY`, rightStick.y);
    }
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  requestPointerLock(element: HTMLElement): void {
    element.requestPointerLock();
  }
  
  exitPointerLock(): void {
    document.exitPointerLock();
  }
  
  isPointerLocked(): boolean {
    return this.pointerLocked;
  }
  
  getDeviceManager(): InputDeviceManager {
    return this.deviceManager;
  }
  
  getBuffer(): InputBuffer {
    return this.buffer;
  }
  
  getAllBindings(): Map<string, InputBinding[]> {
    return new Map(this.bindings);
  }
  
  exportBindings(): string {
    const obj: Record<string, InputBinding[]> = {};
    for (const [action, bindings] of this.bindings) {
      obj[action] = bindings;
    }
    return JSON.stringify(obj);
  }
  
  importBindings(json: string): void {
    const obj = JSON.parse(json) as Record<string, InputBinding[]>;
    for (const [action, bindings] of Object.entries(obj)) {
      this.bindings.set(action, bindings);
    }
  }
  
  dispose(): void {
    this.contexts.clear();
    this.bindings.clear();
    this.actionCallbacks.clear();
    this.holdTimers.clear();
    this.buffer.clear();
    this.comboDetector.reset();
  }
}

// ============================================================================
// DEFAULT CONTEXT PRESETS
// ============================================================================

export function createFPSContext(input: InputManager): InputContext {
  const ctx = input.createContext('fps', 10);
  
  input.addAction('fps', {
    name: 'move_forward',
    type: 'button',
    defaultBindings: [
      { action: 'move_forward', keys: ['KeyW'] },
      { action: 'move_forward', keys: ['Gamepad0_LeftStickY'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'move_back',
    type: 'button',
    defaultBindings: [
      { action: 'move_back', keys: ['KeyS'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'move_left',
    type: 'button',
    defaultBindings: [
      { action: 'move_left', keys: ['KeyA'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'move_right',
    type: 'button',
    defaultBindings: [
      { action: 'move_right', keys: ['KeyD'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'jump',
    type: 'button',
    defaultBindings: [
      { action: 'jump', keys: ['Space'] },
      { action: 'jump', keys: ['Gamepad0_Gamepad_A'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'sprint',
    type: 'button',
    defaultBindings: [
      { action: 'sprint', keys: ['ShiftLeft'] },
      { action: 'sprint', keys: ['Gamepad0_Gamepad_LS'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'crouch',
    type: 'button',
    defaultBindings: [
      { action: 'crouch', keys: ['ControlLeft'] },
      { action: 'crouch', keys: ['Gamepad0_Gamepad_B'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'fire',
    type: 'button',
    defaultBindings: [
      { action: 'fire', keys: ['Mouse0'] },
      { action: 'fire', keys: ['Gamepad0_Gamepad_RT'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'aim',
    type: 'button',
    defaultBindings: [
      { action: 'aim', keys: ['Mouse2'] },
      { action: 'aim', keys: ['Gamepad0_Gamepad_LT'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'reload',
    type: 'button',
    defaultBindings: [
      { action: 'reload', keys: ['KeyR'] },
      { action: 'reload', keys: ['Gamepad0_Gamepad_X'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'interact',
    type: 'button',
    defaultBindings: [
      { action: 'interact', keys: ['KeyE'] },
      { action: 'interact', keys: ['Gamepad0_Gamepad_Y'] }
    ]
  });
  
  return ctx;
}

export function createUIContext(input: InputManager): InputContext {
  const ctx = input.createContext('ui', 100);
  ctx.consumeInput = true;
  
  input.addAction('ui', {
    name: 'confirm',
    type: 'button',
    defaultBindings: [
      { action: 'confirm', keys: ['Enter'] },
      { action: 'confirm', keys: ['Gamepad0_Gamepad_A'] }
    ]
  });
  
  input.addAction('ui', {
    name: 'cancel',
    type: 'button',
    defaultBindings: [
      { action: 'cancel', keys: ['Escape'] },
      { action: 'cancel', keys: ['Gamepad0_Gamepad_B'] }
    ]
  });
  
  input.addAction('ui', {
    name: 'nav_up',
    type: 'button',
    defaultBindings: [
      { action: 'nav_up', keys: ['ArrowUp'] },
      { action: 'nav_up', keys: ['Gamepad0_Gamepad_Up'] }
    ]
  });
  
  input.addAction('ui', {
    name: 'nav_down',
    type: 'button',
    defaultBindings: [
      { action: 'nav_down', keys: ['ArrowDown'] },
      { action: 'nav_down', keys: ['Gamepad0_Gamepad_Down'] }
    ]
  });
  
  input.addAction('ui', {
    name: 'nav_left',
    type: 'button',
    defaultBindings: [
      { action: 'nav_left', keys: ['ArrowLeft'] },
      { action: 'nav_left', keys: ['Gamepad0_Gamepad_Left'] }
    ]
  });
  
  input.addAction('ui', {
    name: 'nav_right',
    type: 'button',
    defaultBindings: [
      { action: 'nav_right', keys: ['ArrowRight'] },
      { action: 'nav_right', keys: ['Gamepad0_Gamepad_Right'] }
    ]
  });
  
  return ctx;
}

export default InputManager;
