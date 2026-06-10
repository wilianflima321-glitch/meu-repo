import { GAMEPAD_AXIS_MAP, GAMEPAD_BUTTON_MAP } from './constants'
import type { GamepadAxis, GamepadButton } from './types'

export interface GamepadRuntimeState {
  gamepads: Map<number, Gamepad>
  gamepadButtonState: Map<number, Map<GamepadButton, boolean>>
  gamepadAxisState: Map<number, Map<GamepadAxis, number>>
}

export interface GamepadRuntimeCallbacks {
  emit: (eventName: string, payload: unknown) => void
  addToBuffer: (input: string, device: 'gamepad') => void
  checkActionTriggers: (device: 'gamepad', input: string, pressed: boolean) => void
}

export function connectGamepad(gamepad: Gamepad, state: GamepadRuntimeState): void {
  state.gamepads.set(gamepad.index, gamepad)
  state.gamepadButtonState.set(gamepad.index, new Map())
  state.gamepadAxisState.set(gamepad.index, new Map())
}

export function disconnectGamepad(gamepad: Gamepad, state: GamepadRuntimeState): void {
  state.gamepads.delete(gamepad.index)
  state.gamepadButtonState.delete(gamepad.index)
  state.gamepadAxisState.delete(gamepad.index)
}

export function updateGamepadSnapshots(
  gamepads: readonly (Gamepad | null)[],
  state: GamepadRuntimeState,
  callbacks: GamepadRuntimeCallbacks,
): void {
  for (const gamepad of gamepads) {
    if (!gamepad) continue
    state.gamepads.set(gamepad.index, gamepad)

    const buttonState = getOrCreateButtonState(gamepad.index, state)
    for (let i = 0; i < gamepad.buttons.length; i++) {
      const button = GAMEPAD_BUTTON_MAP[i]
      if (!button) continue

      const pressed = gamepad.buttons[i].pressed
      const wasPressed = buttonState.get(button)
      if (pressed === wasPressed) continue

      buttonState.set(button, pressed)
      if (pressed) {
        callbacks.addToBuffer(`gamepad_${button}`, 'gamepad')
        callbacks.emit('gamepadButtonDown', { gamepadIndex: gamepad.index, button })
      } else {
        callbacks.emit('gamepadButtonUp', { gamepadIndex: gamepad.index, button })
      }
      callbacks.checkActionTriggers('gamepad', button, pressed)
    }

    const axisState = getOrCreateAxisState(gamepad.index, state)
    for (let i = 0; i < gamepad.axes.length; i++) {
      const axis = GAMEPAD_AXIS_MAP[i]
      if (axis) axisState.set(axis, gamepad.axes[i])
    }
    if (gamepad.buttons[6]) axisState.set('lt', gamepad.buttons[6].value)
    if (gamepad.buttons[7]) axisState.set('rt', gamepad.buttons[7].value)
  }
}

function getOrCreateButtonState(index: number, state: GamepadRuntimeState): Map<GamepadButton, boolean> {
  let buttonState = state.gamepadButtonState.get(index)
  if (!buttonState) {
    buttonState = new Map()
    state.gamepadButtonState.set(index, buttonState)
  }
  return buttonState
}

function getOrCreateAxisState(index: number, state: GamepadRuntimeState): Map<GamepadAxis, number> {
  let axisState = state.gamepadAxisState.get(index)
  if (!axisState) {
    axisState = new Map()
    state.gamepadAxisState.set(index, axisState)
  }
  return axisState
}
