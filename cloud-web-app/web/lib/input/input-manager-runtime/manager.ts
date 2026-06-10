import { EventEmitter } from 'events';
import { MOUSE_BUTTON_MAP } from './constants';
import { getBindingValue as getRuntimeBindingValue, updateAxisValue } from './axis';
import { cleanInputBuffer, createInputBufferEntry, inputBufferHasCombo } from './buffer';
import { registerDefaultInputMappings } from './default-mappings';
import { bindInputRuntimeEvents } from './event-bindings';
import { connectGamepad, disconnectGamepad, updateGamepadSnapshots } from './gamepad';
import { detectTouchGestures } from './gestures';
import { createInputSnapshot, hydrateInputMappings, serializeInputMappings } from './state';
import type { GamepadAxis, GamepadButton, Gesture, InputAction, InputAxis, InputBinding, InputBuffer, InputDeviceType, InputState, KeyCode, MouseButton, Touch } from './types';

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
  private detachRuntimeEvents?: () => void;

  constructor() {
    super();
    this.setupDefaultMappings();
  }

  initialize(element: HTMLElement | Window = window): void {
    this.detachRuntimeEvents?.();
    this.detachRuntimeEvents = bindInputRuntimeEvents(element, {
      keyDown: (event) => this.handleKeyDown(event),
      keyUp: (event) => this.handleKeyUp(event),
      mouseDown: (event) => this.handleMouseDown(event),
      mouseUp: (event) => this.handleMouseUp(event),
      mouseMove: (event) => this.handleMouseMove(event),
      wheel: (event) => this.handleWheel(event),
      contextMenu: (event) => this.handleContextMenu(event),
      touchStart: (event) => this.handleTouchStart(event),
      touchMove: (event) => this.handleTouchMove(event),
      touchEnd: (event) => this.handleTouchEnd(event),
      touchCancel: (event) => this.handleTouchCancel(event),
      gamepadConnected: (event) => this.handleGamepadConnected(event),
      gamepadDisconnected: (event) => this.handleGamepadDisconnected(event),
    });

    this.startUpdateLoop();
    this.emit('initialized');
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
    this.gestures.push(...detectTouchGestures(this.touches.values()));
  }

  private handleGamepadConnected(e: GamepadEvent): void {
    const gamepad = e.gamepad;
    connectGamepad(gamepad, this.getGamepadRuntimeState());
    this.emit('gamepadConnected', { index: gamepad.index, id: gamepad.id });
  }

  private handleGamepadDisconnected(e: GamepadEvent): void {
    const gamepad = e.gamepad;
    disconnectGamepad(gamepad, this.getGamepadRuntimeState());
    this.emit('gamepadDisconnected', { index: gamepad.index, id: gamepad.id });
  }

  private updateGamepads(): void {
    updateGamepadSnapshots(navigator.getGamepads ? navigator.getGamepads() : [], this.getGamepadRuntimeState(), {
      emit: (eventName, payload) => this.emit(eventName, payload),
      addToBuffer: (input, device) => this.addToBuffer(input, device),
      checkActionTriggers: (device, input, pressed) => this.checkActionTriggers(device, input, pressed),
    });
  }

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
      this.axisValues.set(name, updateAxisValue({
        axis,
        currentValue: this.axisValues.get(name) ?? 0,
        deltaTime,
        getValue: (binding) => this.getBindingValue(binding),
      }));
    }
  }

  private getBindingValue(binding: InputBinding): number {
    return getRuntimeBindingValue(binding, {
      keyState: this.keyState,
      mouseButtonState: this.mouseButtonState,
      gamepadButtonState: this.gamepadButtonState,
      gamepadAxisState: this.gamepadAxisState,
    });
  }

  private getGamepadRuntimeState() {
    return { gamepads: this.gamepads, gamepadButtonState: this.gamepadButtonState, gamepadAxisState: this.gamepadAxisState };
  }

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

  private addToBuffer(input: string, device: InputDeviceType): void {
    this.inputBuffer.push(createInputBufferEntry(input, device));
  }

  private cleanInputBuffer(): void {
    this.inputBuffer = cleanInputBuffer(this.inputBuffer, this.bufferDuration);
  }

  checkCombo(sequence: string[]): boolean {
    return inputBufferHasCombo(this.inputBuffer, sequence);
  }

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

  private setupDefaultMappings(): void {
    registerDefaultInputMappings(this);
  }

  exportMappings(): { actions: InputAction[]; axes: InputAxis[] } {
    return serializeInputMappings(this.actions, this.axes);
  }

  importMappings(data: { actions?: InputAction[]; axes?: InputAxis[] }): void {
    hydrateInputMappings(
      data,
      (action) => this.registerAction(action),
      (axis) => this.registerAxis(axis)
    );
    this.emit('mappingsImported', { data });
  }

  getState(): InputState {
    return createInputSnapshot(this.actions, this.axisValues, {
      isActionPressed: (actionName) => this.isActionPressed(actionName),
      getMousePosition: () => this.getMousePosition(),
      getMouseDelta: () => this.getMouseDelta(),
      getScroll: () => this.getScroll(),
      getTouches: () => this.getTouches(),
    });
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.detachRuntimeEvents?.();
    this.detachRuntimeEvents = undefined;

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
