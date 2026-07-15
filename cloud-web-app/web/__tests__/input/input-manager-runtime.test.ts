import { describe, expect, it } from 'vitest'
import { getBindingValue, updateAxisValue } from '@/lib/input/input-manager-runtime/axis'
import { cleanInputBuffer, createInputBufferEntry, inputBufferHasCombo } from '@/lib/input/input-manager-runtime/buffer'
import { detectTouchGestures } from '@/lib/input/input-manager-runtime/gestures'
import { updateGamepadSnapshots } from '@/lib/input/input-manager-runtime/gamepad'
import type { GamepadAxis, GamepadButton, InputAxis, MouseButton, Touch } from '@/lib/input/input-manager-runtime/types'

describe('input manager runtime helpers', () => {
  it('updates axis values with keyboard bindings and gravity', () => {
    const axis: InputAxis = {
      name: 'moveX',
      positiveBindings: [{ device: 'keyboard', key: 'KeyD' }],
      negativeBindings: [{ device: 'keyboard', key: 'KeyA' }],
      sensitivity: 3,
      gravity: 3,
      deadzone: 0.1,
    }
    const state = {
      keyState: new Map([['KeyD', true]]),
      mouseButtonState: new Map<MouseButton, boolean>(),
      gamepadButtonState: new Map<number, Map<GamepadButton, boolean>>(),
      gamepadAxisState: new Map<number, Map<GamepadAxis, number>>(),
    }

    const next = updateAxisValue({
      axis,
      currentValue: 0,
      deltaTime: 0.5,
      getValue: (binding) => getBindingValue(binding, state),
    })

    expect(next).toBe(1)
    expect(updateAxisValue({ axis, currentValue: 0.5, deltaTime: 0.5, getValue: () => 0 })).toBe(0)
  })

  it('detects combos and pinch gestures deterministically', () => {
    const buffer = [
      createInputBufferEntry('KeyA', 'keyboard', 100),
      createInputBufferEntry('KeyB', 'keyboard', 200),
      createInputBufferEntry('KeyC', 'keyboard', 300),
    ]
    expect(cleanInputBuffer(buffer, 150, 320).map((entry) => entry.action)).toEqual(['KeyB', 'KeyC'])
    expect(inputBufferHasCombo(buffer, ['KeyB', 'KeyC'])).toBe(true)

    const touches: Touch[] = [
      { id: 1, position: { x: 0, y: 0 }, startPosition: { x: 0, y: 0 }, delta: { x: 0, y: 0 }, pressure: 1, isActive: true },
      { id: 2, position: { x: 20, y: 0 }, startPosition: { x: 10, y: 0 }, delta: { x: 10, y: 0 }, pressure: 1, isActive: true },
    ]
    expect(detectTouchGestures(touches)[0]).toMatchObject({ type: 'pinch', scale: 2, position: { x: 10, y: 0 } })
  })

  it('updates gamepad button and axis state through callbacks', () => {
    const emitted: string[] = []
    const state = {
      gamepads: new Map<number, Gamepad>(),
      gamepadButtonState: new Map<number, Map<GamepadButton, boolean>>(),
      gamepadAxisState: new Map<number, Map<GamepadAxis, number>>(),
    }
    const gamepad = {
      index: 0,
      id: 'pad',
      buttons: [{ pressed: true, value: 1 }, { pressed: false, value: 0 }, {}, {}, {}, {}, { value: 0.25 }, { value: 0.75 }],
      axes: [0.5, -0.5],
    } as Gamepad

    updateGamepadSnapshots([gamepad], state, {
      emit: (eventName) => emitted.push(eventName),
      addToBuffer: (input) => emitted.push(input),
      checkActionTriggers: (_device, input, pressed) => emitted.push(`${input}:${pressed}`),
    })

    expect(state.gamepadButtonState.get(0)?.get('a')).toBe(true)
    expect(state.gamepadAxisState.get(0)?.get('left_x')).toBe(0.5)
    expect(state.gamepadAxisState.get(0)?.get('rt')).toBe(0.75)
    expect(emitted).toContain('gamepad_a')
    expect(emitted).toContain('gamepadButtonDown')
  })
})
