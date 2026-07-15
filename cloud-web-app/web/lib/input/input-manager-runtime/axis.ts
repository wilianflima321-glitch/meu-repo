import type { GamepadAxis, GamepadButton, InputAxis, InputBinding, MouseButton } from './types'

export interface BindingStateReaders {
  keyState: Map<string, boolean>
  mouseButtonState: Map<MouseButton, boolean>
  gamepadButtonState: Map<number, Map<GamepadButton, boolean>>
  gamepadAxisState: Map<number, Map<GamepadAxis, number>>
}

export function getBindingValue(binding: InputBinding, state: BindingStateReaders): number {
  switch (binding.device) {
    case 'keyboard':
      return state.keyState.get(binding.key!) ? 1 : 0
    case 'mouse':
      return state.mouseButtonState.get(binding.button as MouseButton) ? 1 : 0
    case 'gamepad':
      if (binding.axis) {
        const axisState = state.gamepadAxisState.values().next().value
        if (axisState) {
          let value = axisState.get(binding.axis) ?? 0
          const deadzone = binding.deadzone ?? 0.1
          if (Math.abs(value) < deadzone) value = 0
          return value
        }
      }
      if (binding.button) {
        const buttonState = state.gamepadButtonState.values().next().value
        if (buttonState) return buttonState.get(binding.button as GamepadButton) ? 1 : 0
      }
      return 0
    default:
      return 0
  }
}

export function updateAxisValue({
  axis,
  currentValue,
  deltaTime,
  getValue,
}: {
  axis: InputAxis
  currentValue: number
  deltaTime: number
  getValue: (binding: InputBinding) => number
}): number {
  let targetValue = 0
  const gravity = axis.gravity ?? 3
  const sensitivity = axis.sensitivity ?? 3

  for (const binding of axis.positiveBindings) {
    targetValue += getValue(binding) * (binding.scale ?? 1)
  }
  for (const binding of axis.negativeBindings) {
    targetValue -= getValue(binding) * (binding.scale ?? 1)
  }

  const deadzone = axis.deadzone ?? 0.1
  if (Math.abs(targetValue) < deadzone) targetValue = 0

  if (axis.snap && targetValue !== 0 && Math.sign(targetValue) !== Math.sign(currentValue)) {
    currentValue = 0
  }

  if (targetValue !== 0) {
    const diff = targetValue - currentValue
    return Math.max(-1, Math.min(1, currentValue + diff * sensitivity * deltaTime))
  }

  if (currentValue > 0) return Math.max(0, currentValue - gravity * deltaTime)
  if (currentValue < 0) return Math.min(0, currentValue + gravity * deltaTime)
  return currentValue
}
