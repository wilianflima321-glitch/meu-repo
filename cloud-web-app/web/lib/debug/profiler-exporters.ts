import type { ProfilerFrame, ProfilerSample } from './profiler-contracts';

export interface FlameGraphNode {
  name: string;
  value: number;
  children: FlameGraphNode[];
  category?: string;
}

interface ChromeTraceEvent {
  name: string;
  cat: string;
  ph: string;
  ts: number;
  pid: number;
  tid: number;
  args?: Record<string, unknown>;
}

export function buildFlameGraph(frame: ProfilerFrame): FlameGraphNode {
  const root: FlameGraphNode = {
    name: `Frame ${frame.frameNumber}`,
    value: frame.duration,
    children: [],
  };

  const nodeMap = new Map<string, FlameGraphNode>();
  nodeMap.set('root', root);

  const sortedSamples = [...frame.samples].sort((a: ProfilerSample, b: ProfilerSample) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.startTime - b.startTime;
  });

  for (const sample of sortedSamples) {
    const node: FlameGraphNode = {
      name: sample.name,
      value: sample.duration,
      children: [],
      category: sample.category,
    };

    nodeMap.set(sample.id, node);

    const parentNode = sample.parent
      ? nodeMap.get(sample.parent)
      : root;

    parentNode?.children.push(node);
  }

  return root;
}

export function buildChromeTraceEvents(frames: ProfilerFrame[]): ChromeTraceEvent[] {
  const events: ChromeTraceEvent[] = [];

  for (const frame of frames) {
    for (const sample of frame.samples) {
      events.push({
        name: sample.name,
        cat: sample.category,
        ph: 'B',
        ts: sample.startTime * 1000,
        pid: 1,
        tid: 1,
      });

      events.push({
        name: sample.name,
        cat: sample.category,
        ph: 'E',
        ts: sample.endTime * 1000,
        pid: 1,
        tid: 1,
      });
    }
  }

  return events;
}
