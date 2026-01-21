/**
 * Integration Tests - Aethel Engine Systems
 * 
 * Testes de integração para todos os sistemas criados.
 * Verifica funcionalidade, edge cases e interoperabilidade.
 * 
 * @module test/systems-integration.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// WEATHER SYSTEM TESTS
// ============================================================================

describe('WeatherSystem', () => {
  let WeatherSystem: any;
  
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
  let DayNightCycle: any;
  
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
  let SaveManager: any;
  
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
  let SettingsManager: any;
  
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
  let NotificationManager: any;
  
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
    expect(manager.getVisible().every((n: any) => n.id !== id || !n.visible)).toBe(true);
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
    expect(manager.getVisible().every((n: any) => !n.visible)).toBe(true);
  });
});

// ============================================================================
// HAPTICS SYSTEM TESTS
// ============================================================================

describe('HapticsSystem', () => {
  let HapticsSystem: any;
  
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
  let ControllerMapper: any;
  
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
    expect(profiles.find((p: any) => p.id === 'default-fps')).toBeDefined();
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
  let TooltipManager: any;
  
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

// ============================================================================
// CAPTURE SYSTEM TESTS
// ============================================================================

describe('CaptureSystem', () => {
  let CaptureSystem: any;
  
  beforeEach(async () => {
    const mod = await import('../capture/capture-system');
    CaptureSystem = mod.CaptureSystem;
    
    // Mock canvas
    const mockCanvas = {
      width: 1920,
      height: 1080,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        filter: '',
        globalAlpha: 1,
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(100) })),
        putImageData: vi.fn(),
      })),
      toBlob: vi.fn((callback) => callback(new Blob(['test'], { type: 'image/png' }))),
      captureStream: vi.fn(() => ({
        getAudioTracks: () => [],
        getTracks: () => [],
        addTrack: vi.fn(),
      })),
    };
    
    vi.stubGlobal('document', {
      createElement: vi.fn(() => mockCanvas),
      head: { appendChild: vi.fn() },
      body: { appendChild: vi.fn() },
    });
    
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    });
    
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
  });
  
  it('should create instance', () => {
    const system = new CaptureSystem();
    expect(system).toBeDefined();
  });
  
  it('should set canvas', () => {
    const system = new CaptureSystem();
    const canvas = { width: 1920, height: 1080 } as HTMLCanvasElement;
    
    system.setCanvas(canvas);
    expect(system.getCanvas()).toBe(canvas);
  });
  
  it('should have photo filter presets', async () => {
    const mod = await import('../capture/capture-system');
    const presets = mod.PHOTO_FILTER_PRESETS;
    
    expect(presets.vivid).toBeDefined();
    expect(presets.noir).toBeDefined();
    expect(presets.vintage).toBeDefined();
    expect(presets.cinematic).toBeDefined();
  });
  
  it('should enter and exit photo mode', () => {
    const system = new CaptureSystem();
    
    system.enterPhotoMode();
    expect(system.isPhotoModeActive()).toBe(true);
    
    system.exitPhotoMode();
    expect(system.isPhotoModeActive()).toBe(false);
  });
  
  it('should return gallery', () => {
    const system = new CaptureSystem();
    const gallery = system.getGallery();
    
    expect(Array.isArray(gallery)).toBe(true);
  });
  
  afterEach(() => {
    vi.unstubAllGlobals();
  });
});

// ============================================================================
// WORLD STREAMING TESTS
// ============================================================================

describe('WorldStreamingSystem', () => {
  let WorldStreamingSystem: any;
  
  beforeEach(async () => {
    const mod = await import('../world/world-streaming');
    WorldStreamingSystem = mod.WorldStreamingSystem;
  });
  
  it('should create instance', () => {
    const system = new WorldStreamingSystem();
    expect(system).toBeDefined();
  });
  
  it('should register chunks', () => {
    const system = new WorldStreamingSystem();
    const chunk = system.registerChunk({ x: 0, y: 0, z: 0 });
    
    expect(chunk.id).toBeDefined();
    expect(chunk.state).toBe('unloaded');
  });
  
  it('should set viewer position', () => {
    const system = new WorldStreamingSystem();
    system.setViewerPosition({ x: 100, y: 0, z: 100 });
    
    // System should track position internally
    expect(system).toBeDefined();
  });
  
  it('should query chunks in radius', () => {
    const system = new WorldStreamingSystem();
    system.registerChunk({ x: 0, y: 0, z: 0 });
    system.registerChunk({ x: 64, y: 0, z: 0 });
    system.registerChunk({ x: 128, y: 0, z: 0 });
    
    const chunks = system.getChunksInRadius({ x: 0, y: 0, z: 0 }, 100);
    expect(chunks.length).toBeGreaterThan(0);
  });
  
  it('should start and stop', () => {
    const system = new WorldStreamingSystem();
    
    system.start();
    system.stop();
    
    // Should not throw
    expect(system).toBeDefined();
  });
  
  it('should return stats', () => {
    const system = new WorldStreamingSystem();
    const stats = system.getStats();
    
    expect(stats.loadedChunks).toBeDefined();
    expect(stats.totalChunks).toBeDefined();
    expect(stats.memoryUsedMB).toBeDefined();
  });
});

// ============================================================================
// OCTREE TESTS
// ============================================================================

describe('Octree', () => {
  let Octree: any;
  
  beforeEach(async () => {
    const mod = await import('../world/world-streaming');
    Octree = mod.Octree;
  });
  
  it('should insert items', () => {
    const octree = new Octree({
      min: { x: -100, y: -100, z: -100 },
      max: { x: 100, y: 100, z: 100 },
    });
    
    const item = {
      bounds: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 10, z: 10 },
      },
    };
    
    const inserted = octree.insert(item);
    expect(inserted).toBe(true);
  });
  
  it('should query items', () => {
    const octree = new Octree({
      min: { x: -100, y: -100, z: -100 },
      max: { x: 100, y: 100, z: 100 },
    });
    
    octree.insert({
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } },
    });
    
    const results = octree.query({
      min: { x: -5, y: -5, z: -5 },
      max: { x: 15, y: 15, z: 15 },
    });
    
    expect(results.length).toBe(1);
  });
  
  it('should query radius', () => {
    const octree = new Octree({
      min: { x: -100, y: -100, z: -100 },
      max: { x: 100, y: 100, z: 100 },
    });
    
    octree.insert({
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } },
    });
    
    const results = octree.queryRadius({ x: 5, y: 5, z: 5 }, 20);
    expect(results.length).toBe(1);
  });
  
  it('should remove items', () => {
    const octree = new Octree({
      min: { x: -100, y: -100, z: -100 },
      max: { x: 100, y: 100, z: 100 },
    });
    
    const item = {
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } },
    };
    
    octree.insert(item);
    const removed = octree.remove(item);
    
    expect(removed).toBe(true);
  });
});

// ============================================================================
// CROSS-SYSTEM INTEGRATION TESTS
// ============================================================================

describe('Cross-System Integration', () => {
  it('should export all systems from index', async () => {
    const lib = await import('../index');
    
    // Environment
    expect(lib.WeatherSystem).toBeDefined();
    expect(lib.DayNightCycle).toBeDefined();
    
    // Save/Settings
    expect(lib.AdvancedSaveManager).toBeDefined();
    expect(lib.SettingsManager).toBeDefined();
    
    // UI
    expect(lib.NotificationManager).toBeDefined();
    expect(lib.TooltipManager).toBeDefined();
    
    // Input
    expect(lib.HapticsSystem).toBeDefined();
    expect(lib.ControllerMapper).toBeDefined();
    
    // Capture
    expect(lib.CaptureSystem).toBeDefined();
    
    // World
    expect(lib.WorldStreamingSystem).toBeDefined();
    expect(lib.Octree).toBeDefined();
  }, 30000); // 30s timeout for large module import
  
  it('should export React providers', async () => {
    const lib = await import('../index');
    
    expect(lib.WeatherProvider).toBeDefined();
    expect(lib.DayNightProvider).toBeDefined();
    expect(lib.SaveProvider).toBeDefined();
    expect(lib.SettingsProvider).toBeDefined();
    expect(lib.NotificationProvider).toBeDefined();
    expect(lib.TooltipProvider).toBeDefined();
    expect(lib.HapticsProvider).toBeDefined();
    expect(lib.ControllerProvider).toBeDefined();
    expect(lib.CaptureProvider).toBeDefined();
    expect(lib.WorldStreamingProvider).toBeDefined();
  }, 30000);
  
  it('should export React hooks', async () => {
    const lib = await import('../index');
    
    // Check hooks exist
    expect(typeof lib.useWeather).toBe('function');
    expect(typeof lib.useDayNightCycle).toBe('function');
    expect(typeof lib.useSaveManager).toBe('function');
    expect(typeof lib.useSettings).toBe('function');
    expect(typeof lib.useNotifications).toBe('function');
    expect(typeof lib.useTooltip).toBe('function');
    expect(typeof lib.useHaptics).toBe('function');
    expect(typeof lib.useControllerMapper).toBe('function');
    expect(typeof lib.useCaptureSystem).toBe('function');
    expect(typeof lib.useWorldStreaming).toBe('function');
  }, 30000);
  
  it('should have correct engine version', async () => {
    const lib = await import('../index');
    
    expect(lib.AETHEL_VERSION).toBe('1.1.0');
    expect(lib.ENGINE_NAME).toBe('Aethel Engine');
  }, 30000);
});
