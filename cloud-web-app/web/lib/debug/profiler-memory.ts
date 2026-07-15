import type { MemorySnapshot } from './profiler-contracts';

export function getMemoryTrend(memorySnapshots: MemorySnapshot[]): { growing: boolean; rate: number } {
  if (memorySnapshots.length < 2) {
    return { growing: false, rate: 0 };
  }

  const recent = memorySnapshots.slice(-10);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const delta = last.heapUsed - first.heapUsed;
  const timeDelta = last.timestamp - first.timestamp;
  const rate = delta / timeDelta * 1000;

  return {
    growing: rate > 1000,
    rate,
  };
}
