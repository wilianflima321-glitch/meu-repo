import type { InputBuffer, InputDeviceType } from './types'

export function createInputBufferEntry(input: string, device: InputDeviceType, timestamp = performance.now()): InputBuffer {
  return { action: input, timestamp, device }
}

export function cleanInputBuffer(buffer: InputBuffer[], durationMs: number, now = performance.now()): InputBuffer[] {
  return buffer.filter((item) => now - item.timestamp < durationMs)
}

export function inputBufferHasCombo(buffer: InputBuffer[], sequence: string[]): boolean {
  if (sequence.length > buffer.length) return false
  const recentInputs = buffer.slice(-sequence.length)
  return sequence.every((input, index) => recentInputs[index].action === input)
}
