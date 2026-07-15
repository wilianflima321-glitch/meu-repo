import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type CaptureSystemConstructor = typeof import('../capture/capture-system').CaptureSystem;
type WorldStreamingSystemConstructor = typeof import('../world/world-streaming').WorldStreamingSystem;
type OctreeConstructor = typeof import('../world/world-streaming').Octree;

// ============================================================================
// CAPTURE SYSTEM TESTS
// ============================================================================

describe('CaptureSystem', () => {
  let CaptureSystem: CaptureSystemConstructor;

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
  let WorldStreamingSystem: WorldStreamingSystemConstructor;

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
  let Octree: OctreeConstructor;

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
