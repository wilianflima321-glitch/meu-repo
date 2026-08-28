/**
 * WebGPU context-loss recovery policy (fail-closed).
 *
 * The device-lost path must never leave the context claiming "initialized"
 * while dead, and must not spin an infinite re-acquisition loop. Exactly ONE
 * automatic recovery attempt is allowed; after that the context reports
 * deviceLost and `getDevice()` throws with the loss reason.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebGPUContext } from '@aethel/engine/renderer/WebGPUContext';

type LostResolver = (info: { message: string }) => void;

function installMockGpu(behavior: {
  requestDevice?: () => Promise<unknown>;
  requestAdapterInfo?: () => Promise<unknown>;
  failRequestAdapterOnCall?: number;
}): { lostResolvers: LostResolver[]; adapterRequestCount: () => number; deviceRequestCount: () => number } {
  const lostResolvers: LostResolver[] = [];
  const adapterRequestCount = { value: 0 };
  const deviceRequestCount = { value: 0 };
  const makeDevice = () => {
    const lost = new Promise<{ message: string }>((resolve) => {
      lostResolvers.push(resolve);
    });
    return { lost };
  };
  const requestAdapter = vi.fn(async () => {
    adapterRequestCount.value += 1;
    if (behavior.failRequestAdapterOnCall && adapterRequestCount.value === behavior.failRequestAdapterOnCall) {
      throw new Error('simulated adapter re-acquisition failure');
    }
    const device = behavior.requestDevice ? await behavior.requestDevice() : makeDevice();
    deviceRequestCount.value += 1;
    return {
      requestDevice: async () => device,
      requestAdapterInfo: behavior.requestAdapterInfo ?? (async () => ({ device: 'MockAdapter' })),
    };
  });
  Object.defineProperty(navigator, 'gpu', {
    value: { requestAdapter },
    configurable: true,
  });
  return {
    lostResolvers,
    adapterRequestCount: () => adapterRequestCount.value,
    deviceRequestCount: () => deviceRequestCount.value,
  };
}

beforeEach(() => {
  WebGPUContext.__resetForTests();
});

afterEach(() => {
  delete (navigator as unknown as { gpu?: unknown }).gpu;
  WebGPUContext.__resetForTests();
});

describe('WebGPUContext device-loss recovery', () => {
  it('recovers once on device loss and reports health honestly', async () => {
    const mock = installMockGpu({});
    await WebGPUContext.init();
    expect(WebGPUContext.getHealth()).toMatchObject({
      initialized: true,
      deviceLost: false,
      recoveryAttempts: 0,
    });
    const deviceBefore = WebGPUContext.getDevice();

    // Simulate device loss. Auto-recovery re-initializes exactly once with a
    // fresh device, and a successful re-acquisition clears the historical loss.
    mock.lostResolvers[0]!({ message: 'simulated driver reset' });
    await vi.waitFor(() => {
      expect(WebGPUContext.getHealth().recoveryAttempts).toBe(1);
    });
    const health = WebGPUContext.getHealth();
    expect(health.initialized).toBe(true);
    expect(health.deviceLost).toBe(false);
    expect(health.lastLossMessage).toBeNull();
    expect(WebGPUContext.getDevice()).not.toBe(deviceBefore);
    expect(mock.adapterRequestCount()).toBe(2);
  });

  it('stays fail-closed when the single recovery attempt fails', async () => {
    const mock = installMockGpu({ failRequestAdapterOnCall: 2 });
    await WebGPUContext.init();
    mock.lostResolvers[0]!({ message: 'driver crash' });
    await vi.waitFor(() => {
      expect(WebGPUContext.getHealth().recoveryAttempts).toBe(1);
    });
    const health = WebGPUContext.getHealth();
    expect(health.initialized).toBe(false);
    expect(health.deviceLost).toBe(true);
    expect(health.lastLossMessage).toBe('driver crash');
    expect(() => WebGPUContext.getDevice()).toThrow(/deviceLost=true/);
  });

  it('getDevice throws with loss context when uninitialized', () => {
    expect(() => WebGPUContext.getDevice()).toThrow(/not initialized/);
  });
});
