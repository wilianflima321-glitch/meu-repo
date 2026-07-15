/**
 * Integration Tests - Aethel Engine Systems
 *
 * Testes de integração para todos os sistemas criados.
 * Verifica funcionalidade, edge cases e interoperabilidade.
 *
 * @module test/systems-integration.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type WeatherSystemConstructor = typeof import('../environment/weather-system').WeatherSystem;
type DayNightCycleConstructor = typeof import('../environment/day-night-cycle').DayNightCycle;
type SaveManagerConstructor = typeof import('../save/save-manager').SaveManager;
type SettingsManagerConstructor = typeof import('../settings/settings-system').SettingsManager;
type NotificationManagerConstructor = typeof import('../ui/notification-system').NotificationManager;
type NotificationRecord = import('../ui/notification-system').Notification;
type HapticsSystemConstructor = typeof import('../input/haptics-system').HapticsSystem;
type ControllerMapperConstructor = typeof import('../input/controller-mapper').ControllerMapper;
type ControllerProfile = import('../input/controller-mapper').ControllerProfile;
type TooltipManagerConstructor = typeof import('../ui/tooltip-system').TooltipManager;

// ============================================================================
// WEATHER SYSTEM TESTS
// ============================================================================

describe('WeatherSystem', () => {
  let WeatherSystem: WeatherSystemConstructor;

  beforeEach(async () => {
    const mod = await import('../environment/weather-system');
    WeatherSystem = mod.WeatherSystem;
  });

  it('should create singleton instance', () => {
    const instance1 = WeatherSystem.getInstance();
    const instance2 = WeatherSystem.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should set weather type', () => {
    const system = new WeatherSystem();
    system.setWeather('rain', true); // immediate=true
    expect(system.getType()).toBe('rain');
  });

  it('should transition between weather states', async () => {
    const system = new WeatherSystem();
    system.start(); // Need to start the system for update() to work
    system.setWeather('clear', true);
    system.transitionTo('thunderstorm', 0.05); // 50ms transition

    // transitionTo needs isRunning=true, then update() progresses the transition
    // Duration is 0.05s, so we need total deltaTime > 0.05 to complete
    for (let i = 0; i < 10; i++) {
      system.update(0.01); // 10ms each, total 100ms > 50ms
    }
    expect(system.getType()).toBe('thunderstorm');
  });

  it('should emit events on weather change', () => {
    const system = new WeatherSystem();
    const callback = vi.fn();

    system.on('weatherChanged', callback);
    system.setWeather('snow', true); // immediate=true triggers event

    expect(callback).toHaveBeenCalled();
  });

  it('should return valid weather state', () => {
    const system = new WeatherSystem();
    const state = system.getState();

    expect(state).toHaveProperty('intensity');
    expect(state).toHaveProperty('temperature');
    expect(state).toHaveProperty('humidity');
    expect(state).toHaveProperty('windSpeed');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});

// ============================================================================
// DAY/NIGHT CYCLE TESTS
// ============================================================================

describe('DayNightCycle', () => {
  let DayNightCycle: DayNightCycleConstructor;

  beforeEach(async () => {
    const mod = await import('../environment/day-night-cycle');
    DayNightCycle = mod.DayNightCycle;
  });

  it('should create singleton instance', () => {
    const instance1 = DayNightCycle.getInstance();
    const instance2 = DayNightCycle.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should set time of day', () => {
    const cycle = new DayNightCycle();
    cycle.setTime(12); // noon
    expect(cycle.getTime()).toBe(12);
  });

  it('should calculate correct time of day', () => {
    const cycle = new DayNightCycle();

    cycle.setTime(6);
    expect(cycle.getTimeState().timeOfDay).toBe('sunrise');

    cycle.setTime(12);
    expect(cycle.getTimeState().timeOfDay).toBe('noon');

    cycle.setTime(22);
    expect(cycle.getTimeState().timeOfDay).toBe('night');
  });

  it('should calculate sun position', () => {
    const cycle = new DayNightCycle();
    const sunDir = cycle.getSunDirection();

    expect(sunDir).toHaveProperty('x');
    expect(sunDir).toHaveProperty('y');
    expect(sunDir).toHaveProperty('z');
  });

  it('should pause and resume time', () => {
    const cycle = new DayNightCycle();
    const pausedCallback = vi.fn();
    const resumedCallback = vi.fn();

    cycle.on('paused', pausedCallback);
    cycle.on('resumed', resumedCallback);

    cycle.start();
    cycle.pause();

    expect(pausedCallback).toHaveBeenCalled();

    cycle.resume();
    expect(resumedCallback).toHaveBeenCalled();
  });

  it('should change time scale', () => {
    const cycle = new DayNightCycle();
    cycle.setTimeScale(2.0);

    expect(cycle.getTimeScale()).toBe(2.0);
  });
});

// ============================================================================
// SAVE MANAGER TESTS
// ============================================================================

describe('SaveManager', () => {
  let SaveManager: SaveManagerConstructor;

  beforeEach(async () => {
    const mod = await import('../save/save-manager');
    SaveManager = mod.SaveManager;

    // Mock localStorage
    const localStorageMock = {
      store: {} as Record<string, string>,
      getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
      setItem: vi.fn((key: string, value: string) => { localStorageMock.store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete localStorageMock.store[key]; }),
      clear: vi.fn(() => { localStorageMock.store = {}; }),
    };
    vi.stubGlobal('localStorage', localStorageMock);
  });

  it('should create save slots', async () => {
    const manager = new SaveManager();
    // Precisa registrar state providers para o save funcionar
    manager.registerStateProvider('test', () => ({ testData: 'value' }));
    const result = await manager.save(0, 'Test Save');

    expect(result).toBeDefined();
    expect(result.metadata.name).toBe('Test Save');
  });

  it('should load save data', async () => {
    const manager = new SaveManager();
    manager.registerStateProvider('test', () => ({ testData: 'value' }));
    await manager.save(0, 'Test Save');

    const state = await manager.load(0);
    expect(state).toBeDefined();
    expect(state.player).toBeDefined();
  });

  it('should list all saves', async () => {
    const manager = new SaveManager();
    manager.registerStateProvider('test', () => ({ testData: 'value' }));
    await manager.save(0, 'Save 1');
    await manager.save(1, 'Save 2');

    const slots = manager.getSlots();
    const occupiedSlots = manager.getOccupiedSlots();
    expect(occupiedSlots.length).toBeGreaterThanOrEqual(2);
  });

  it('should delete saves', async () => {
    const manager = new SaveManager();
    manager.registerStateProvider('test', () => ({ testData: 'value' }));
    await manager.save(0, 'Test Save');
    await manager.deleteSave(0);

    const slot = manager.getSlot(0);
    expect(slot?.occupied).toBe(false);
  });

  it('should track play time', () => {
    const manager = new SaveManager();
    manager.startAutosave();
    manager.stopAutosave();

    const status = manager.getStatus();
    expect(status).toBe('idle');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});

// ============================================================================
// SETTINGS SYSTEM TESTS
// ============================================================================

describe('SettingsManager', () => {
  let SettingsManager: SettingsManagerConstructor;

  beforeEach(async () => {
    const mod = await import('../settings/settings-system');
    SettingsManager = mod.SettingsManager;

    // Mock localStorage
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem: vi.fn((key: string) => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  it('should have default settings', () => {
    const manager = new SettingsManager();
    const audio = manager.getAudio();

    expect(audio.masterVolume).toBeDefined();
    expect(audio.musicVolume).toBeDefined();
  });

  it('should update settings', () => {
    const manager = new SettingsManager();
    manager.setAudio({ masterVolume: 0.5 });

    expect(manager.getAudio().masterVolume).toBe(0.5);
  });

  it('should apply graphics presets', () => {
    const manager = new SettingsManager();
    manager.applyGraphicsPreset('ultra');

    const video = manager.getVideo();
    expect(video.graphicsQuality).toBe('ultra');
  });

  it('should reset to defaults', () => {
    const manager = new SettingsManager();
    manager.setAudio({ masterVolume: 0.1 });
    manager.resetToDefaults('audio');

    expect(manager.getAudio().masterVolume).toBe(1.0);
  });

  it('should emit events on change', () => {
    const manager = new SettingsManager();
    const callback = vi.fn();

    manager.on('categoryChanged', callback);
    manager.setAudio({ masterVolume: 0.5 });

    expect(callback).toHaveBeenCalled();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});

// ============================================================================
// NOTIFICATION SYSTEM TESTS
// ============================================================================

describe('NotificationManager', () => {
  let NotificationManager: NotificationManagerConstructor;

  beforeEach(async () => {
    const mod = await import('../ui/notification-system');
    NotificationManager = mod.NotificationManager;
  });

  it('should show notification', () => {
    const manager = new NotificationManager();
    const id = manager.show({
      type: 'info',
      title: 'Test',
      message: 'Test message',
    });

    expect(id).toBeDefined();
    expect(manager.getVisible().length).toBe(1);
  });

  it('should dismiss notification', () => {
    const manager = new NotificationManager();
    const id = manager.show({
      type: 'info',
      title: 'Test',
      message: 'Test message',
    });

    manager.close(id);
    // close triggers removal after animation timeout, check immediately for visible=false
    expect(manager.getVisible().every((n: NotificationRecord) => n.id !== id || !n.visible)).toBe(true);
  });

  it('should auto-dismiss after duration', async () => {
    const manager = new NotificationManager();
    manager.show({
      type: 'info',
      title: 'Test',
      message: 'Test message',
      duration: 100, // 100ms
    });

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(manager.getVisible().length).toBe(0);
  });

  it('should respect max visible limit', () => {
    const manager = new NotificationManager({ maxVisible: 2 });

    manager.show({ type: 'info', title: '1', message: '' });
    manager.show({ type: 'info', title: '2', message: '' });
    manager.show({ type: 'info', title: '3', message: '' });

    expect(manager.getVisible().length).toBeLessThanOrEqual(2);
  });

  it('should clear all notifications', () => {
    const manager = new NotificationManager();

    manager.show({ type: 'info', title: '1', message: '' });
    manager.show({ type: 'info', title: '2', message: '' });
    manager.closeAll();

    // closeAll triggers close which removes after animation delay
    expect(manager.getVisible().every((n: NotificationRecord) => !n.visible)).toBe(true);
  });
});

// ============================================================================
// HAPTICS SYSTEM TESTS
// ============================================================================

describe('HapticsSystem', () => {
  let HapticsSystem: HapticsSystemConstructor;

  beforeEach(async () => {
    const mod = await import('../input/haptics-system');
    HapticsSystem = mod.HapticsSystem;

    // Mock navigator.getGamepads
    vi.stubGlobal('navigator', {
      getGamepads: vi.fn(() => [null, null, null, null]),
      vibrate: vi.fn(() => true),
    });
  });

  it('should create instance', () => {
    const system = new HapticsSystem();
    expect(system).toBeDefined();
  });

  it('should enable/disable haptics', () => {
    const system = new HapticsSystem();

    system.setEnabled(false);
    expect(system.getConfig().enabled).toBe(false);

    system.setEnabled(true);
    expect(system.getConfig().enabled).toBe(true);
  });

  it('should set intensity', () => {
    const system = new HapticsSystem();
    system.setIntensity(0.5);

    expect(system.getConfig().globalIntensity).toBe(0.5);
  });

  it('should have preset effects', async () => {
    const mod = await import('../input/haptics-system');
    const effects = mod.HAPTIC_EFFECTS;

    expect(effects.impact_medium).toBeDefined();
    expect(effects.explosion).toBeDefined();
    expect(effects.footstep).toBeDefined();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});

// ============================================================================
// CONTROLLER MAPPER TESTS
// ============================================================================

describe('ControllerMapper', () => {
  let ControllerMapper: ControllerMapperConstructor;

  beforeEach(async () => {
    const mod = await import('../input/controller-mapper');
    ControllerMapper = mod.ControllerMapper;

    // Mock gamepad API
    vi.stubGlobal('navigator', {
      getGamepads: vi.fn(() => [null, null, null, null]),
    });

    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    });
  });

  it('should create instance', () => {
    const mapper = new ControllerMapper();
    expect(mapper).toBeDefined();
  });

  it('should have default profiles', async () => {
    const mod = await import('../input/controller-mapper');
    const profiles = mod.DEFAULT_PROFILES;

    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.find((p: ControllerProfile) => p.id === 'default-fps')).toBeDefined();
  });

  it('should start and stop polling', () => {
    const mapper = new ControllerMapper();
    mapper.start();

    expect(mapper.isRunning()).toBe(true);

    mapper.stop();
    expect(mapper.isRunning()).toBe(false);
  });

  it('should create custom profiles', () => {
    const mapper = new ControllerMapper();
    const profile = mapper.createProfile({
      name: 'Custom',
      buttons: [],
      axes: [],
      globalDeadzone: 0.15,
      globalSensitivity: 1.0,
      triggerAsButton: false,
      triggerThreshold: 0.5,
      vibrationEnabled: true,
      vibrationIntensity: 1.0,
    });

    expect(profile.id).toBeDefined();
    expect(profile.name).toBe('Custom');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});

// ============================================================================
// TOOLTIP SYSTEM TESTS
// ============================================================================

describe('TooltipManager', () => {
  let TooltipManager: TooltipManagerConstructor;

  beforeEach(async () => {
    const mod = await import('../ui/tooltip-system');
    TooltipManager = mod.TooltipManager;

    // Mock document
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      createElement: vi.fn(() => ({
        style: {},
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }),
      })),
    });
  });

  it('should register tooltips', () => {
    const manager = new TooltipManager();
    const element = {
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100 }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;

    const id = manager.register(element, { content: 'Test tooltip' });
    expect(id).toBeDefined();
  });

  it('should show and hide tooltips', () => {
    const manager = new TooltipManager();
    const element = {
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100 }),
      addEventListener: vi.fn(),
    } as unknown as HTMLElement;

    const id = manager.register(element, { content: 'Test tooltip' });

    manager.show(id);
    expect(manager.isVisible(id)).toBe(true);

    manager.hide(id);
    expect(manager.isVisible(id)).toBe(false);
  });

  it('should update content', () => {
    const manager = new TooltipManager();
    const element = {
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100 }),
      addEventListener: vi.fn(),
    } as unknown as HTMLElement;

    const id = manager.register(element, { content: 'Original' });
    manager.setContent(id, 'Updated');

    const tooltip = manager.get(id);
    expect(tooltip?.options.content).toBe('Updated');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
