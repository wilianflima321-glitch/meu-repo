/**
 * Advanced Input System - split runtime modules.
 *
 * Keep input runtime isolated from public route shells; Studio/game surfaces can
 * lazy-load the barrel when they need keyboard, mouse, touch, or gamepad input.
 */

import { InputManager } from './input-manager';
import type { InputContext } from './types';

export function createFPSContext(input: InputManager): InputContext {
  const ctx = input.createContext('fps', 10);
  
  input.addAction('fps', {
    name: 'move_forward',
    type: 'button',
    defaultBindings: [
      { action: 'move_forward', keys: ['KeyW'] },
      { action: 'move_forward', keys: ['Gamepad0_LeftStickY'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'move_back',
    type: 'button',
    defaultBindings: [
      { action: 'move_back', keys: ['KeyS'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'move_left',
    type: 'button',
    defaultBindings: [
      { action: 'move_left', keys: ['KeyA'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'move_right',
    type: 'button',
    defaultBindings: [
      { action: 'move_right', keys: ['KeyD'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'jump',
    type: 'button',
    defaultBindings: [
      { action: 'jump', keys: ['Space'] },
      { action: 'jump', keys: ['Gamepad0_Gamepad_A'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'sprint',
    type: 'button',
    defaultBindings: [
      { action: 'sprint', keys: ['ShiftLeft'] },
      { action: 'sprint', keys: ['Gamepad0_Gamepad_LS'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'crouch',
    type: 'button',
    defaultBindings: [
      { action: 'crouch', keys: ['ControlLeft'] },
      { action: 'crouch', keys: ['Gamepad0_Gamepad_B'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'fire',
    type: 'button',
    defaultBindings: [
      { action: 'fire', keys: ['Mouse0'] },
      { action: 'fire', keys: ['Gamepad0_Gamepad_RT'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'aim',
    type: 'button',
    defaultBindings: [
      { action: 'aim', keys: ['Mouse2'] },
      { action: 'aim', keys: ['Gamepad0_Gamepad_LT'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'reload',
    type: 'button',
    defaultBindings: [
      { action: 'reload', keys: ['KeyR'] },
      { action: 'reload', keys: ['Gamepad0_Gamepad_X'] }
    ]
  });
  
  input.addAction('fps', {
    name: 'interact',
    type: 'button',
    defaultBindings: [
      { action: 'interact', keys: ['KeyE'] },
      { action: 'interact', keys: ['Gamepad0_Gamepad_Y'] }
    ]
  });
  
  return ctx;
}

export function createUIContext(input: InputManager): InputContext {
  const ctx = input.createContext('ui', 100);
  ctx.consumeInput = true;
  
  input.addAction('ui', {
    name: 'confirm',
    type: 'button',
    defaultBindings: [
      { action: 'confirm', keys: ['Enter'] },
      { action: 'confirm', keys: ['Gamepad0_Gamepad_A'] }
    ]
  });
  
  input.addAction('ui', {
    name: 'cancel',
    type: 'button',
    defaultBindings: [
      { action: 'cancel', keys: ['Escape'] },
      { action: 'cancel', keys: ['Gamepad0_Gamepad_B'] }
    ]
  });
  
  input.addAction('ui', {
    name: 'nav_up',
    type: 'button',
    defaultBindings: [
      { action: 'nav_up', keys: ['ArrowUp'] },
      { action: 'nav_up', keys: ['Gamepad0_Gamepad_Up'] }
    ]
  });
  
  input.addAction('ui', {
    name: 'nav_down',
    type: 'button',
    defaultBindings: [
      { action: 'nav_down', keys: ['ArrowDown'] },
      { action: 'nav_down', keys: ['Gamepad0_Gamepad_Down'] }
    ]
  });
  
  input.addAction('ui', {
    name: 'nav_left',
    type: 'button',
    defaultBindings: [
      { action: 'nav_left', keys: ['ArrowLeft'] },
      { action: 'nav_left', keys: ['Gamepad0_Gamepad_Left'] }
    ]
  });
  
  input.addAction('ui', {
    name: 'nav_right',
    type: 'button',
    defaultBindings: [
      { action: 'nav_right', keys: ['ArrowRight'] },
      { action: 'nav_right', keys: ['Gamepad0_Gamepad_Right'] }
    ]
  });
  
  return ctx;
}
