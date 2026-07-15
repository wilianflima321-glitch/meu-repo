/**
 * Controller Mapper - split input runtime.
 *
 * Gamepad mapping and hooks are isolated so game/editor surfaces can load them
 * without making public shells pay for controller support.
 */

import { createComponentLogger } from '@/lib/observability/logger';
import { EventEmitter } from 'events';
import { DEFAULT_PROFILES } from './profiles';
import { processMappedAxisValue, updateControllerStateFromGamepad } from './polling';
import { readCustomControllerProfiles, writeCustomControllerProfiles } from './profile-storage';
import { DEFAULT_CONTROLLER_MAPPER_CONFIG, createConnectedController, detectBestControllerProfile } from './state';
import type { ButtonState, ConnectedController, ControllerMapperConfig, ControllerProfile, GameAction, GamepadAxis, GamepadButton } from './types';

const log = createComponentLogger('input/controller-mapper');

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
      ...DEFAULT_CONTROLLER_MAPPER_CONFIG,
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
  
  private handleGamepadConnected(e: GamepadEvent): void {
    const gamepad = e.gamepad;
    
    if (this.controllers.size >= this.config.maxControllers) {
      this.log(`Max controllers (${this.config.maxControllers}) reached`);
      return;
    }
    
    const controller = createConnectedController(gamepad);
    this.controllers.set(controller.id, controller);
    
    // Auto-assign profile
    if (this.config.autoConnectProfile) {
      const profile = detectBestControllerProfile(controller, this.profiles);
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
    updateControllerStateFromGamepad(controller, gamepad, profile, this.config, {
      buttonPress: this.handleButtonPress.bind(this),
      buttonRelease: this.handleButtonRelease.bind(this),
      buttonHold: this.handleButtonHold.bind(this),
      axisMove: this.handleAxisMove.bind(this),
    });
  }
  
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
      
      processedValue = processMappedAxisValue(processedValue, profile, mapping);
      this.triggerAction(mapping.action, processedValue, controller.id);
    }
    
    this.emit('axisMove', { controller: controller.id, axis, value });
  }
  
private triggerAction(action: GameAction, value: number, controllerId: string): void {
    this.activeActions.set(action, value);
    this.emit('action', { action, value, controller: controllerId });
  }
  
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
    writeCustomControllerProfiles(this.profiles.values());
  }
  
  private loadProfiles(): void {
    for (const profile of readCustomControllerProfiles()) {
      this.profiles.set(profile.id, profile);
    }
  }
  
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
  
  private log(message: string): void {
    if (this.config.enableDebug) {
      log.info(`[ControllerMapper] ${message}`);
    }
  }
  
  setConfig(config: Partial<ControllerMapperConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configChanged', this.config);
  }
  
  getConfig(): ControllerMapperConfig {
    return { ...this.config };
  }
  
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
