export type SequencerCommand<TState> = {
  label: string
  apply(state: TState): TState
  revert(state: TState): TState
}

export type SequencerUndoRedoState<TState> = {
  past: Array<SequencerCommand<TState>>
  future: Array<SequencerCommand<TState>>
  state: TState
}

export function createSequencerUndoRedoState<TState>(state: TState): SequencerUndoRedoState<TState> {
  return { past: [], future: [], state }
}

export function applySequencerCommand<TState>(stack: SequencerUndoRedoState<TState>, command: SequencerCommand<TState>): SequencerUndoRedoState<TState> {
  return { past: [...stack.past, command], future: [], state: command.apply(stack.state) }
}

export function undoSequencerCommand<TState>(stack: SequencerUndoRedoState<TState>): SequencerUndoRedoState<TState> {
  const command = stack.past[stack.past.length - 1]
  if (!command) return stack
  return { past: stack.past.slice(0, -1), future: [command, ...stack.future], state: command.revert(stack.state) }
}

export function redoSequencerCommand<TState>(stack: SequencerUndoRedoState<TState>): SequencerUndoRedoState<TState> {
  const command = stack.future[0]
  if (!command) return stack
  return { past: [...stack.past, command], future: stack.future.slice(1), state: command.apply(stack.state) }
}
