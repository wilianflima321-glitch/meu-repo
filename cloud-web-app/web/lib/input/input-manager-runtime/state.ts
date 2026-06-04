import type { InputAction, InputAxis, InputState, Touch } from './types';

interface InputSnapshotQueries {
  isActionPressed: (actionName: string) => boolean;
  getMousePosition: () => { x: number; y: number };
  getMouseDelta: () => { x: number; y: number };
  getScroll: () => { x: number; y: number };
  getTouches: () => Touch[];
}

export function serializeInputMappings(
  actions: Map<string, InputAction>,
  axes: Map<string, InputAxis>
): { actions: InputAction[]; axes: InputAxis[] } {
  return {
    actions: Array.from(actions.values()),
    axes: Array.from(axes.values()),
  };
}

export function hydrateInputMappings(
  data: { actions?: InputAction[]; axes?: InputAxis[] },
  registerAction: (action: InputAction) => void,
  registerAxis: (axis: InputAxis) => void
): void {
  for (const action of data.actions ?? []) {
    registerAction(action);
  }

  for (const axis of data.axes ?? []) {
    registerAxis(axis);
  }
}

export function createInputSnapshot(
  actions: Map<string, InputAction>,
  axisValues: Map<string, number>,
  queries: InputSnapshotQueries
): InputState {
  const actionStates = new Map<string, boolean>();
  for (const action of actions.keys()) {
    actionStates.set(action, queries.isActionPressed(action));
  }

  return {
    actions: actionStates,
    axes: new Map(axisValues),
    mousePosition: queries.getMousePosition(),
    mouseDelta: queries.getMouseDelta(),
    scroll: queries.getScroll(),
    touches: queries.getTouches(),
  };
}
