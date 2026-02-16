/**
 * Controller Mapper System - Sistema de Mapeamento de Controles
 * 
 * Sistema completo com:
 * - Detecção automática de gamepads
 * - Mapeamento customizável de botões e eixos
 * - Perfis de controle por jogo/usuário
 * - Suporte a múltiplos controladores
 * - Deadzones e curvas de resposta
 * - Presets para controles populares
 * - Vibração e feedback
 * - Emulação de controle (keyboard to gamepad)
 * 
 * @module lib/input/controller-mapper
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type GamepadButton =
  | 'A' | 'B' | 'X' | 'Y'
  | 'LB' | 'RB' | 'LT' | 'RT'
  | 'BACK' | 'START' | 'GUIDE'
  | 'LS' | 'RS'
  | 'DPAD_UP' | 'DPAD_DOWN' | 'DPAD_LEFT' | 'DPAD_RIGHT';

export type GamepadAxis = 
  | 'LEFT_X' | 'LEFT_Y'
  | 'RIGHT_X' | 'RIGHT_Y'
  | 'LT' | 'RT';

export type GameAction = string;

export interface ButtonMapping {
  button: GamepadButton;
  action: GameAction;
  modifiers?: GamepadButton[];
  holdDuration?: number; // Hold for action
  doubleTapWindow?: number; // Double tap
  onPress?: boolean;
  onRelease?: boolean;
  onHold?: boolean;
}

export interface AxisMapping {
  axis: GamepadAxis;
  action: GameAction;
  inverted?: boolean;
  deadzone?: number;
  sensitivity?: number;
  curve?: 'linear' | 'exponential' | 'cubic' | 'custom';
  customCurve?: (value: number) => number;
}

export interface ControllerProfile {
  id: string;
  name: string;
  description?: string;
  buttons: ButtonMapping[];
  axes: AxisMapping[];
  globalDeadzone: number;
  globalSensitivity: number;
  triggerAsButton: boolean;
  triggerThreshold: number;
  vibrationEnabled: boolean;
  vibrationIntensity: number;
  created: number;
  modified: number;
}

export interface ConnectedController {
  id: string;
  index: number;
  name: string;
  vendor: string;
  product: string;
  connected: boolean;
  mapping: string;
  axes: number;
  buttons: number;
  hapticActuators: boolean;
  profile: string | null;
  state: ControllerState;
}

export interface ControllerState {
  buttons: Map<GamepadButton, ButtonState>;
  axes: Map<GamepadAxis, number>;
  timestamp: number;
}

export interface ButtonState {
  pressed: boolean;
  touched?: boolean;
  value: number;
  pressedAt: number;
  lastPressedAt: number;
  tapCount: number;
}

export interface ControllerMapperConfig {
  pollInterval: number;
  defaultDeadzone: number;
  defaultSensitivity: number;
  doubleTapWindow: number;
  holdDuration: number;
  triggerThreshold: number;
  autoConnectProfile: boolean;
  maxControllers: number;
  enableDebug: boolean;
}

// ============================================================================
// STANDARD BUTTON MAPPINGS
// ============================================================================

const STANDARD_BUTTON_MAP: Record<number, GamepadButton> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'BACK',
  9: 'START',
  10: 'LS',
  11: 'RS',
  12: 'DPAD_UP',
  13: 'DPAD_DOWN',
  14: 'DPAD_LEFT',
  15: 'DPAD_RIGHT',
  16: 'GUIDE',
};

const STANDARD_AXIS_MAP: Record<number, GamepadAxis> = {
  0: 'LEFT_X',
  1: 'LEFT_Y',
  2: 'RIGHT_X',
  3: 'RIGHT_Y',
};

// ============================================================================
// DEFAULT PROFILES
// ============================================================================

export const DEFAULT_PROFILES: ControllerProfile[] = [
  {
    id: 'default-fps',
    name: 'FPS Default',
    description: 'Standard FPS controls',
    buttons: [
      { button: 'A', action: 'jump', onPress: true },
      { button: 'B', action: 'crouch', onPress: true },
      { button: 'X', action: 'reload', onPress: true },
      { button: 'Y', action: 'switchWeapon', onPress: true },
      { button: 'LB', action: 'grenade', onPress: true },
      { button: 'RB', action: 'melee', onPress: true },
      { button: 'LT', action: 'aim', onPress: true, onRelease: true },
      { button: 'RT', action: 'shoot', onPress: true, onHold: true },
      { button: 'LS', action: 'sprint', onPress: true },
      { button: 'RS', action: 'meleeAlt', onPress: true },
      { button: 'START', action: 'pause', onPress: true },
      { button: 'BACK', action: 'scoreboard', onPress: true },
      { button: 'DPAD_UP', action: 'equipPrimary', onPress: true },
      { button: 'DPAD_DOWN', action: 'equipSecondary', onPress: true },
      { button: 'DPAD_LEFT', action: 'equipTactical', onPress: true },
      { button: 'DPAD_RIGHT', action: 'equipLethal', onPress: true },
    ],
    axes: [
      { axis: 'LEFT_X', action: 'moveX', sensitivity: 1.0 },
      { axis: 'LEFT_Y', action: 'moveY', sensitivity: 1.0, inverted: false },
      { axis: 'RIGHT_X', action: 'lookX', sensitivity: 1.0 },
      { axis: 'RIGHT_Y', action: 'lookY', sensitivity: 1.0, inverted: true },
    ],
    globalDeadzone: 0.15,
    globalSensitivity: 1.0,
    triggerAsButton: false,
    triggerThreshold: 0.5,
    vibrationEnabled: true,
    vibrationIntensity: 1.0,
    created: Date.now(),
    modified: Date.now(),
  },
  {
    id: 'default-racing',
    name: 'Racing Default',
    description: 'Standard racing controls',
    buttons: [
      { button: 'A', action: 'nitro', onPress: true },
      { button: 'B', action: 'handbrake', onPress: true, onRelease: true },
      { button: 'X', action: 'lookBack', onPress: true },
      { button: 'Y', action: 'resetCar', onPress: true },
      { button: 'LB', action: 'shiftDown', onPress: true },
      { button: 'RB', action: 'shiftUp', onPress: true },
      { button: 'START', action: 'pause', onPress: true },
      { button: 'BACK', action: 'rewind', onPress: true },
    ],
    axes: [
      { axis: 'LEFT_X', action: 'steer', sensitivity: 1.0, curve: 'cubic' },
      { axis: 'LT', action: 'brake', sensitivity: 1.0 },
      { axis: 'RT', action: 'accelerate', sensitivity: 1.0 },
      { axis: 'RIGHT_X', action: 'camera', sensitivity: 0.5 },
    ],
    globalDeadzone: 0.1,
    globalSensitivity: 1.0,
    triggerAsButton: false,
    triggerThreshold: 0.3,
    vibrationEnabled: true,
    vibrationIntensity: 1.0,
    created: Date.now(),
    modified: Date.now(),
  },
  {
    id: 'default-rpg',
    name: 'RPG Default',
    description: 'Standard RPG controls',
    buttons: [
      { button: 'A', action: 'interact', onPress: true },
      { button: 'B', action: 'cancel', onPress: true },
      { button: 'X', action: 'attack', onPress: true },
      { button: 'Y', action: 'special', onPress: true },
      { button: 'LB', action: 'prevItem', onPress: true },
      { button: 'RB', action: 'nextItem', onPress: true },
      { button: 'LT', action: 'block', onPress: true, onRelease: true },
      { button: 'RT', action: 'heavyAttack', onPress: true },
      { button: 'LS', action: 'sprint', onPress: true },
      { button: 'RS', action: 'lockOn', onPress: true },
      { button: 'START', action: 'menu', onPress: true },
      { button: 'BACK', action: 'map', onPress: true },
      { button: 'DPAD_UP', action: 'useItem', onPress: true },
      { button: 'DPAD_DOWN', action: 'crouch', onPress: true },
      { button: 'DPAD_LEFT', action: 'quickSlot1', onPress: true },
      { button: 'DPAD_RIGHT', action: 'quickSlot2', onPress: true },
    ],
    axes: [
      { axis: 'LEFT_X', action: 'moveX', sensitivity: 1.0 },
      { axis: 'LEFT_Y', action: 'moveY', sensitivity: 1.0, inverted: false },
      { axis: 'RIGHT_X', action: 'cameraX', sensitivity: 1.0 },
      { axis: 'RIGHT_Y', action: 'cameraY', sensitivity: 1.0, inverted: true },
    ],
    globalDeadzone: 0.15,
    globalSensitivity: 1.0,
    triggerAsButton: false,
    triggerThreshold: 0.5,
    vibrationEnabled: true,
    vibrationIntensity: 1.0,
    created: Date.now(),
    modified: Date.now(),
  },
];

// ============================================================================
// CONTROLLER MAPPER
// ============================================================================

export class ControllerMapper extends EventEmitter {
  private static instance: ControllerMapper | null = null;
  
  private config: ControllerMapperConfig;
  private controllers: Map<string, ConnectedController> = new Map();
  private profiles: Map<string, ControllerProfile> = new Map();
  private activeActions: Map<GameAction, number> = new Map();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  
  constructor(config: Partial<ControllerMapperConfig> = {}) {
    super();
    
    this.config = {
      pollInterval: 16, // ~60fps
      defaultDeadzone: 0.15,
      defaultSensitivity: 1.0,
      doubleTapWindow: 300,
      holdDuration: 500,
      triggerThreshold: 0.5,
      autoConnectProfile: true,
      maxControllers: 4,
      enableDebug: false,
      ...config,
    };
    
    // Load default profiles
    for (const profile of DEFAULT_PROFILES) {
      this.profiles.set(profile.id, profile);
    }
    
    // Load saved profiles
    this.loadProfiles();
    
    // Setup gamepad events
    if (typeof window !== 'undefined') {
      window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
      window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));
    }
  }
  
  static getInstance(): ControllerMapper {
    if (!ControllerMapper.instance) {
      ControllerMapper.instance = new ControllerMapper();
    }
    return ControllerMapper.instance;
  }
  
  // ============================================================================
  // GAMEPAD EVENTS
  // ============================================================================
  
  private handleGamepadConnected(e: GamepadEvent): void {
    const gamepad = e.gamepad;
    
    if (this.controllers.size >= this.config.maxControllers) {
      this.log(`Max controllers (${this.config.maxControllers}) reached`);
      return;
    }
    
    const controller = this.createController(gamepad);
    this.controllers.set(controller.id, controller);
    
    // Auto-assign profile
    if (this.config.autoConnectProfile) {
      const profile = this.detectBestProfile(controller);
      if (profile) {
        this.assignProfile(controller.id, profile.id);
      }
    }
    
    this.emit('connected', controller);
    this.log(`Controller connected: ${controller.name}`);
    
    // Start polling if not running
    if (!this.running) {
      this.start();
    }
  }
  
  private handleGamepadDisconnected(e: GamepadEvent): void {
    const controller = Array.from(this.controllers.values())
      .find(c => c.index === e.gamepad.index);
    
    if (controller) {
      controller.connected = false;
      this.controllers.delete(controller.id);
      this.emit('disconnected', controller);
      this.log(`Controller disconnected: ${controller.name}`);
    }
    
    // Stop polling if no controllers
    if (this.controllers.size === 0) {
      this.stop();
    }
  }
  
  private createController(gamepad: Gamepad): ConnectedController {
    // Parse vendor/product from id
    const idMatch = gamepad.id.match(/Vendor:\s*([0-9a-f]+)\s*Product:\s*([0-9a-f]+)/i);
    const vendor = idMatch?.[1] || 'unknown';
    const product = idMatch?.[2] || 'unknown';
    
    // Check for haptic support
    const hasHaptics = 'vibrationActuator' in gamepad || 
      (gamepad as any).hapticActuators?.length > 0;
    
    return {
      id: `controller_${gamepad.index}_${Date.now()}`,
      index: gamepad.index,
      name: gamepad.id,
      vendor,
      product,
      connected: gamepad.connected,
      mapping: gamepad.mapping,
      axes: gamepad.axes.length,
      buttons: gamepad.buttons.length,
      hapticActuators: hasHaptics,
      profile: null,
      state: this.createInitialState(),
    };
  }
  
  private createInitialState(): ControllerState {
    const buttons = new Map<GamepadButton, ButtonState>();
    const axes = new Map<GamepadAxis, number>();
    
    for (const button of Object.values(STANDARD_BUTTON_MAP)) {
      buttons.set(button, {
        pressed: false,
        value: 0,
        pressedAt: 0,
        lastPressedAt: 0,
        tapCount: 0,
      });
    }
    
    for (const axis of Object.values(STANDARD_AXIS_MAP)) {
      axes.set(axis, 0);
    }
    
    // Triggers as axes
    axes.set('LT', 0);
    axes.set('RT', 0);
    
    return { buttons, axes, timestamp: 0 };
  }
  
  private detectBestProfile(controller: ConnectedController): ControllerProfile | null {
    // Simple detection based on controller name
    const name = controller.name.toLowerCase();
    
    if (name.includes('xbox') || name.includes('xinput')) {
      return this.profiles.get('default-fps') || null;
    }
    if (name.includes('playstation') || name.includes('dualshock') || name.includes('dualsense')) {
      return this.profiles.get('default-fps') || null;
    }
    if (name.includes('switch') || name.includes('pro controller')) {
      return this.profiles.get('default-fps') || null;
    }
    
    return this.profiles.get('default-fps') || null;
  }
  
  // ============================================================================
  // POLLING
  // ============================================================================
  
  start(): void {
    if (this.running) return;
    
    this.running = true;
    this.pollTimer = setInterval(() => this.poll(), this.config.pollInterval);
    this.emit('started');
    this.log('Controller polling started');
  }
  
  stop(): void {
    if (!this.running) return;
    
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.emit('stopped');
    this.log('Controller polling stopped');
  }
  
  private poll(): void {
    const gamepads = navigator.getGamepads();
    
    for (const controller of this.controllers.values()) {
      const gamepad = gamepads[controller.index];
      if (!gamepad) continue;
      
      this.updateControllerState(controller, gamepad);
    }
  }
  
  private updateControllerState(controller: ConnectedController, gamepad: Gamepad): void {
    const profile = controller.profile ? this.profiles.get(controller.profile) ?? null : null;
    const now = performance.now();
    
    // Update buttons
    for (let i = 0; i < gamepad.buttons.length; i++) {
      const button = STANDARD_BUTTON_MAP[i];
      if (!button) continue;
      
      const gpButton = gamepad.buttons[i];
      const state = controller.state.buttons.get(button)!;
      const wasPressed = state.pressed;
      
      // Update state
      state.value = gpButton.value;
      state.touched = gpButton.touched ?? false;
      
      // Press event
      if (gpButton.pressed && !wasPressed) {
        state.pressed = true;
        state.lastPressedAt = state.pressedAt;
        state.pressedAt = now;
        
        // Double tap detection
        if (now - state.lastPressedAt < this.config.doubleTapWindow) {
          state.tapCount++;
        } else {
          state.tapCount = 1;
        }
        
        this.handleButtonPress(controller, button, state, profile);
      }
      
      // Release event
      if (!gpButton.pressed && wasPressed) {
        state.pressed = false;
        this.handleButtonRelease(controller, button, state, profile);
      }
      
      // Hold event
      if (gpButton.pressed && wasPressed) {
        const holdDuration = now - state.pressedAt;
        if (holdDuration >= this.config.holdDuration) {
          this.handleButtonHold(controller, button, state, profile, holdDuration);
        }
      }
    }
    
    // Update axes
    for (let i = 0; i < gamepad.axes.length; i++) {
      const axis = STANDARD_AXIS_MAP[i];
      if (!axis) continue;
      
      let value = gamepad.axes[i];
      
      // Apply deadzone
      const deadzone = profile?.globalDeadzone ?? this.config.defaultDeadzone;
      if (Math.abs(value) < deadzone) {
        value = 0;
      } else {
        // Rescale to 0-1 range after deadzone
        value = Math.sign(value) * ((Math.abs(value) - deadzone) / (1 - deadzone));
      }
      
      controller.state.axes.set(axis, value);
      
      if (value !== 0) {
        this.handleAxisMove(controller, axis, value, profile);
      }
    }
    
    // Triggers as axes (for profiles that need analog triggers)
    const ltButton = gamepad.buttons[6];
    const rtButton = gamepad.buttons[7];
    
    if (ltButton) {
      controller.state.axes.set('LT', ltButton.value);
      if (ltButton.value > 0) {
        this.handleAxisMove(controller, 'LT', ltButton.value, profile);
      }
    }
    if (rtButton) {
      controller.state.axes.set('RT', rtButton.value);
      if (rtButton.value > 0) {
        this.handleAxisMove(controller, 'RT', rtButton.value, profile);
      }
    }
    
    controller.state.timestamp = now;
  }
  
  // ============================================================================
  // INPUT HANDLING
  // ============================================================================
  
  private handleButtonPress(
    controller: ConnectedController,
    button: GamepadButton,
    state: ButtonState,
    profile: ControllerProfile | null
  ): void {
    const mapping = profile?.buttons.find(b => b.button === button);
    
    if (mapping?.onPress) {
      // Check modifiers
      if (mapping.modifiers?.length) {
        const allModifiersHeld = mapping.modifiers.every(mod => 
          controller.state.buttons.get(mod)?.pressed
        );
        if (!allModifiersHeld) return;
      }
      
      this.triggerAction(mapping.action, 1.0, controller.id);
    }
    
    this.emit('buttonPress', { controller: controller.id, button, state });
  }
  
  private handleButtonRelease(
    controller: ConnectedController,
    button: GamepadButton,
    state: ButtonState,
    profile: ControllerProfile | null
  ): void {
    const mapping = profile?.buttons.find(b => b.button === button);
    
    if (mapping?.onRelease) {
      this.triggerAction(`${mapping.action}:release`, 0, controller.id);
    }
    
    this.emit('buttonRelease', { controller: controller.id, button, state });
  }
  
  private handleButtonHold(
    controller: ConnectedController,
    button: GamepadButton,
    state: ButtonState,
    profile: ControllerProfile | null,
    duration: number
  ): void {
    const mapping = profile?.buttons.find(b => b.button === button);
    
    if (mapping?.onHold) {
      this.triggerAction(`${mapping.action}:hold`, duration / 1000, controller.id);
    }
    
    this.emit('buttonHold', { controller: controller.id, button, state, duration });
  }
  
  private handleAxisMove(
    controller: ConnectedController,
    axis: GamepadAxis,
    value: number,
    profile: ControllerProfile | null
  ): void {
    const mapping = profile?.axes.find(a => a.axis === axis);
    
    if (mapping) {
      let processedValue = value;
      
      // Apply inversion
      if (mapping.inverted) {
        processedValue = -processedValue;
      }
      
      // Apply sensitivity
      const sensitivity = mapping.sensitivity ?? profile?.globalSensitivity ?? 1.0;
      processedValue *= sensitivity;
      
      // Apply curve
      processedValue = this.applyCurve(processedValue, mapping.curve, mapping.customCurve);
      
      this.triggerAction(mapping.action, processedValue, controller.id);
    }
    
    this.emit('axisMove', { controller: controller.id, axis, value });
  }
  
  private applyCurve(
    value: number, 
    curve?: string, 
    customCurve?: (v: number) => number
  ): number {
    const sign = Math.sign(value);
    const abs = Math.abs(value);
    
    switch (curve) {
      case 'exponential':
        return sign * (abs * abs);
      case 'cubic':
        return sign * (abs * abs * abs);
      case 'custom':
        return customCurve ? customCurve(value) : value;
      case 'linear':
      default:
        return value;
    }
  }
  
  private triggerAction(action: GameAction, value: number, controllerId: string): void {
    this.activeActions.set(action, value);
    this.emit('action', { action, value, controller: controllerId });
  }
  
  // ============================================================================
  // PROFILE MANAGEMENT
  // ============================================================================
  
  createProfile(profile: Omit<ControllerProfile, 'id' | 'created' | 'modified'>): ControllerProfile {
    const now = Date.now();
    const newProfile: ControllerProfile = {
      ...profile,
      id: `profile_${now}`,
      created: now,
      modified: now,
    };
    
    this.profiles.set(newProfile.id, newProfile);
    this.saveProfiles();
    this.emit('profileCreated', newProfile);
    
    return newProfile;
  }
  
  updateProfile(id: string, updates: Partial<ControllerProfile>): ControllerProfile | null {
    const profile = this.profiles.get(id);
    if (!profile) return null;
    
    const updated: ControllerProfile = {
      ...profile,
      ...updates,
      id: profile.id,
      created: profile.created,
      modified: Date.now(),
    };
    
    this.profiles.set(id, updated);
    this.saveProfiles();
    this.emit('profileUpdated', updated);
    
    return updated;
  }
  
  deleteProfile(id: string): boolean {
    // Don't delete default profiles
    if (id.startsWith('default-')) return false;
    
    const deleted = this.profiles.delete(id);
    if (deleted) {
      // Unassign from controllers
      for (const controller of this.controllers.values()) {
        if (controller.profile === id) {
          controller.profile = null;
        }
      }
      
      this.saveProfiles();
      this.emit('profileDeleted', id);
    }
    
    return deleted;
  }
  
  duplicateProfile(id: string, newName: string): ControllerProfile | null {
    const original = this.profiles.get(id);
    if (!original) return null;
    
    return this.createProfile({
      ...original,
      name: newName,
    });
  }
  
  assignProfile(controllerId: string, profileId: string): boolean {
    const controller = this.controllers.get(controllerId);
    const profile = this.profiles.get(profileId);
    
    if (!controller || !profile) return false;
    
    controller.profile = profileId;
    this.emit('profileAssigned', { controller: controllerId, profile: profileId });
    
    return true;
  }
  
  getProfile(id: string): ControllerProfile | undefined {
    return this.profiles.get(id);
  }
  
  getAllProfiles(): ControllerProfile[] {
    return Array.from(this.profiles.values());
  }
  
  private saveProfiles(): void {
    if (typeof localStorage === 'undefined') return;
    
    const customProfiles = Array.from(this.profiles.values())
      .filter(p => !p.id.startsWith('default-'));
    
    localStorage.setItem('aethel_controller_profiles', JSON.stringify(customProfiles));
  }
  
  private loadProfiles(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('aethel_controller_profiles');
      if (saved) {
        const profiles: ControllerProfile[] = JSON.parse(saved);
        for (const profile of profiles) {
          this.profiles.set(profile.id, profile);
        }
      }
    } catch (e) {
      this.log('Failed to load profiles');
    }
  }
  
  // ============================================================================
  // BUTTON REMAPPING
  // ============================================================================
  
  async remapButton(
    profileId: string, 
    actionToRemap: GameAction,
    timeoutMs = 5000
  ): Promise<GamepadButton | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve(null);
      }, timeoutMs);
      
      const handler = (data: { button: GamepadButton }) => {
        cleanup();
        
        // Update profile
        const profile = this.profiles.get(profileId);
        if (profile) {
          const mapping = profile.buttons.find(b => b.action === actionToRemap);
          if (mapping) {
            mapping.button = data.button;
            this.updateProfile(profileId, { buttons: profile.buttons });
          }
        }
        
        resolve(data.button);
      };
      
      const cleanup = () => {
        clearTimeout(timeout);
        this.off('buttonPress', handler);
      };
      
      this.emit('remapStarted', actionToRemap);
      this.on('buttonPress', handler);
    });
  }
  
  // ============================================================================
  // VIBRATION
  // ============================================================================
  
  vibrate(
    controllerId: string | 'all',
    duration: number,
    weakMagnitude = 0.5,
    strongMagnitude = 0.5
  ): void {
    const controllers = controllerId === 'all'
      ? Array.from(this.controllers.values())
      : [this.controllers.get(controllerId)].filter(Boolean) as ConnectedController[];
    
    for (const controller of controllers) {
      if (!controller.hapticActuators) continue;
      
      const profile = controller.profile ? this.profiles.get(controller.profile) : null;
      if (profile && !profile.vibrationEnabled) continue;
      
      const intensity = profile?.vibrationIntensity ?? 1.0;
      
      const gamepad = navigator.getGamepads()[controller.index];
      if (!gamepad) continue;
      
      // Try vibrationActuator (Chrome)
      if ('vibrationActuator' in gamepad) {
        (gamepad as any).vibrationActuator.playEffect('dual-rumble', {
          duration,
          weakMagnitude: weakMagnitude * intensity,
          strongMagnitude: strongMagnitude * intensity,
        });
      }
      // Try hapticActuators (older API)
      else if ((gamepad as any).hapticActuators?.[0]) {
        (gamepad as any).hapticActuators[0].pulse(strongMagnitude * intensity, duration);
      }
    }
  }
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
  getController(id: string): ConnectedController | undefined {
    return this.controllers.get(id);
  }
  
  getControllerByIndex(index: number): ConnectedController | undefined {
    return Array.from(this.controllers.values()).find(c => c.index === index);
  }
  
  getAllControllers(): ConnectedController[] {
    return Array.from(this.controllers.values());
  }
  
  getConnectedCount(): number {
    return this.controllers.size;
  }
  
  getButtonState(controllerId: string, button: GamepadButton): ButtonState | undefined {
    return this.controllers.get(controllerId)?.state.buttons.get(button);
  }
  
  getAxisValue(controllerId: string, axis: GamepadAxis): number {
    return this.controllers.get(controllerId)?.state.axes.get(axis) ?? 0;
  }
  
  getActionValue(action: GameAction): number {
    return this.activeActions.get(action) ?? 0;
  }
  
  isActionActive(action: GameAction, threshold = 0.5): boolean {
    return Math.abs(this.getActionValue(action)) >= threshold;
  }
  
  isRunning(): boolean {
    return this.running;
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  private log(message: string): void {
    if (this.config.enableDebug) {
      console.log(`[ControllerMapper] ${message}`);
    }
  }
  
  setConfig(config: Partial<ControllerMapperConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configChanged', this.config);
  }
  
  getConfig(): ControllerMapperConfig {
    return { ...this.config };
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.stop();
    this.controllers.clear();
    this.profiles.clear();
    this.activeActions.clear();
    this.removeAllListeners();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
      window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));
    }
    
    ControllerMapper.instance = null;
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';

interface ControllerContextValue {
  mapper: ControllerMapper;
}

const ControllerContext = createContext<ControllerContextValue | null>(null);

export function ControllerProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<ControllerMapperConfig>;
}) {
  const value = useMemo(() => ({
    mapper: new ControllerMapper(config),
  }), [config]);
  
  useEffect(() => {
    value.mapper.start();
    
    return () => {
      value.mapper.dispose();
    };
  }, [value]);
  
  return (
    <ControllerContext.Provider value={value}>
      {children}
    </ControllerContext.Provider>
  );
}

export function useControllerMapper() {
  const context = useContext(ControllerContext);
  if (!context) {
    return ControllerMapper.getInstance();
  }
  return context.mapper;
}

export function useControllers() {
  const mapper = useControllerMapper();
  const [controllers, setControllers] = useState<ConnectedController[]>(mapper.getAllControllers());
  
  useEffect(() => {
    const update = () => setControllers(mapper.getAllControllers());
    
    mapper.on('connected', update);
    mapper.on('disconnected', update);
    
    return () => {
      mapper.off('connected', update);
      mapper.off('disconnected', update);
    };
  }, [mapper]);
  
  return controllers;
}

export function useController(index = 0) {
  const mapper = useControllerMapper();
  const [controller, setController] = useState<ConnectedController | undefined>(
    mapper.getControllerByIndex(index)
  );
  
  useEffect(() => {
    const update = () => setController(mapper.getControllerByIndex(index));
    
    mapper.on('connected', update);
    mapper.on('disconnected', update);
    
    return () => {
      mapper.off('connected', update);
      mapper.off('disconnected', update);
    };
  }, [mapper, index]);
  
  return controller;
}

export function useGamepadButton(button: GamepadButton, controllerIndex = 0) {
  const mapper = useControllerMapper();
  const [state, setState] = useState<ButtonState | undefined>();
  
  useEffect(() => {
    const handler = (data: { controller: string; button: GamepadButton; state: ButtonState }) => {
      const ctrl = mapper.getController(data.controller);
      if (ctrl?.index === controllerIndex && data.button === button) {
        setState(data.state);
      }
    };
    
    mapper.on('buttonPress', handler);
    mapper.on('buttonRelease', handler);
    
    return () => {
      mapper.off('buttonPress', handler);
      mapper.off('buttonRelease', handler);
    };
  }, [mapper, button, controllerIndex]);
  
  return state;
}

export function useGamepadAxis(axis: GamepadAxis, controllerIndex = 0) {
  const mapper = useControllerMapper();
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    const handler = (data: { controller: string; axis: GamepadAxis; value: number }) => {
      const ctrl = mapper.getController(data.controller);
      if (ctrl?.index === controllerIndex && data.axis === axis) {
        setValue(data.value);
      }
    };
    
    mapper.on('axisMove', handler);
    
    return () => {
      mapper.off('axisMove', handler);
    };
  }, [mapper, axis, controllerIndex]);
  
  return value;
}

export function useGameAction(action: GameAction) {
  const mapper = useControllerMapper();
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    const handler = (data: { action: GameAction; value: number }) => {
      if (data.action === action || data.action.startsWith(`${action}:`)) {
        setValue(data.value);
      }
    };
    
    mapper.on('action', handler);
    
    return () => {
      mapper.off('action', handler);
    };
  }, [mapper, action]);
  
  return value;
}

export function useControllerProfiles() {
  const mapper = useControllerMapper();
  const [profiles, setProfiles] = useState<ControllerProfile[]>(mapper.getAllProfiles());
  
  useEffect(() => {
    const update = () => setProfiles(mapper.getAllProfiles());
    
    mapper.on('profileCreated', update);
    mapper.on('profileUpdated', update);
    mapper.on('profileDeleted', update);
    
    return () => {
      mapper.off('profileCreated', update);
      mapper.off('profileUpdated', update);
      mapper.off('profileDeleted', update);
    };
  }, [mapper]);
  
  return profiles;
}

export function useVibration() {
  const mapper = useControllerMapper();
  
  return useCallback((
    duration: number,
    weak = 0.5,
    strong = 0.5,
    controllerId: string | 'all' = 'all'
  ) => {
    mapper.vibrate(controllerId, duration, weak, strong);
  }, [mapper]);
}

const __defaultExport = {
  ControllerMapper,
  ControllerProvider,
  useControllerMapper,
  useControllers,
  useController,
  useGamepadButton,
  useGamepadAxis,
  useGameAction,
  useControllerProfiles,
  useVibration,
  DEFAULT_PROFILES,
};

export default __defaultExport;
