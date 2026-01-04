import { Event } from '@theia/core/lib/common';
/**
 * ============================================================================
 * ADVANCED INPUT SYSTEM - AAA-LEVEL INPUT HANDLING
 * ============================================================================
 *
 * Sistema completo de input para jogos AAA:
 *
 * 1. MULTI-DEVICE SUPPORT
 *    - Keyboard & Mouse
 *    - Gamepads (Xbox, PlayStation, Switch, Generic)
 *    - Touch screens
 *    - Motion controllers (VR)
 *    - Racing wheels, flight sticks
 *
 * 2. INPUT MAPPING
 *    - Action-based mapping (não raw input)
 *    - Context-sensitive bindings
 *    - Rebindable controls
 *    - Multiple profiles
 *
 * 3. ADVANCED FEATURES
 *    - Input buffering
 *    - Combo detection
 *    - Gesture recognition
 *    - Haptic feedback
 *    - Adaptive triggers (PS5)
 *    - Motion controls (gyro aiming)
 */
export type InputDeviceType = 'keyboard' | 'mouse' | 'gamepad_xbox' | 'gamepad_playstation' | 'gamepad_switch' | 'gamepad_generic' | 'touch' | 'vr_controller' | 'wheel' | 'joystick';
export interface InputDevice {
    id: string;
    type: InputDeviceType;
    name: string;
    connected: boolean;
    capabilities: DeviceCapabilities;
}
export interface DeviceCapabilities {
    hasVibration: boolean;
    hasGyro: boolean;
    hasAccelerometer: boolean;
    hasTouchpad: boolean;
    hasAdaptiveTriggers: boolean;
    numButtons: number;
    numAxes: number;
    numTouchPoints: number;
}
export interface InputAction {
    name: string;
    category: string;
    bindings: InputBinding[];
    defaultBindings: InputBinding[];
    /** Action is active in these contexts */
    contexts: string[];
    /** Can be held */
    holdable: boolean;
    /** Buffer window in ms */
    bufferWindow: number;
}
export interface InputBinding {
    device: InputDeviceType;
    input: string;
    modifiers?: string[];
    /** For analog inputs */
    deadzone?: number;
    sensitivity?: number;
    inverted?: boolean;
}
export interface InputContext {
    name: string;
    priority: number;
    active: boolean;
    /** Actions available in this context */
    actions: string[];
    /** Block lower priority contexts */
    exclusive: boolean;
}
export interface InputEvent {
    action: string;
    type: 'pressed' | 'released' | 'held' | 'axis';
    value: number;
    device: InputDevice;
    timestamp: number;
    modifiers: string[];
}
export interface AxisInput {
    action: string;
    x: number;
    y: number;
    device: InputDevice;
    raw: {
        x: number;
        y: number;
    };
}
export interface GestureEvent {
    type: GestureType;
    position: {
        x: number;
        y: number;
    };
    delta?: {
        x: number;
        y: number;
    };
    scale?: number;
    rotation?: number;
    fingers: number;
    velocity?: {
        x: number;
        y: number;
    };
}
export type GestureType = 'tap' | 'double_tap' | 'long_press' | 'swipe' | 'pinch' | 'rotate' | 'pan';
export interface ComboDefinition {
    name: string;
    inputs: ComboInput[];
    timeout: number;
    priority: number;
}
export interface ComboInput {
    action: string;
    type: 'press' | 'release' | 'hold';
    holdTime?: number;
    window?: number;
}
export interface ComboState {
    combo: ComboDefinition;
    progress: number;
    lastInputTime: number;
    completed: boolean;
}
export interface HapticEffect {
    type: 'rumble' | 'trigger' | 'pattern';
    intensity: number;
    duration: number;
    /** For rumble motors */
    motors?: {
        left: number;
        right: number;
    };
    /** For adaptive triggers */
    trigger?: {
        mode: 'off' | 'feedback' | 'weapon' | 'vibration';
        position: number;
        strength: number;
    };
    /** For pattern */
    pattern?: number[];
}
export declare class AdvancedInputSystem {
    private devices;
    private actions;
    private contexts;
    private activeContext;
    private pressedActions;
    private axisStates;
    private inputBuffer;
    private combos;
    private comboStates;
    private touchPoints;
    private gestureState;
    private keyStates;
    private mousePosition;
    private mouseDelta;
    private gamepadStates;
    private readonly onActionEmitter;
    readonly onAction: Event<InputEvent>;
    private readonly onAxisEmitter;
    readonly onAxis: Event<AxisInput>;
    private readonly onGestureEmitter;
    readonly onGesture: Event<GestureEvent>;
    private readonly onComboEmitter;
    readonly onCombo: Event<{
        combo: string;
    }>;
    private readonly onDeviceEmitter;
    readonly onDevice: Event<{
        device: InputDevice;
        connected: boolean;
    }>;
    initialize(): void;
    private setupDefaultActions;
    private setupDefaultContexts;
    private registerEventListeners;
    private onKeyDown;
    private onKeyUp;
    private onMouseDown;
    private onMouseUp;
    private onMouseMove;
    private onMouseWheel;
    private onTouchStart;
    private onTouchMove;
    private onTouchEnd;
    private detectGestures;
    private onGamepadConnected;
    private onGamepadDisconnected;
    private startGamepadPolling;
    private pollGamepads;
    private processGamepadStick;
    private processGamepadTrigger;
    private triggerAction;
    private addToBuffer;
    consumeBufferedInput(actionName: string): boolean;
    registerCombo(combo: ComboDefinition): void;
    private checkCombos;
    playHaptic(deviceId: string, effect: HapticEffect): Promise<void>;
    stopHaptic(deviceId: string): void;
    registerContext(context: InputContext): void;
    activateContext(name: string): void;
    deactivateContext(name: string): void;
    private isActionAvailable;
    registerAction(action: InputAction): void;
    rebind(actionName: string, binding: InputBinding): void;
    resetBindings(actionName?: string): void;
    getBindings(actionName: string): InputBinding[];
    exportBindings(): Record<string, InputBinding[]>;
    importBindings(bindings: Record<string, InputBinding[]>): void;
    isPressed(actionName: string): boolean;
    getAxis(actionName: string): {
        x: number;
        y: number;
    };
    getMousePosition(): {
        x: number;
        y: number;
    };
    getMouseDelta(): {
        x: number;
        y: number;
    };
    getConnectedDevices(): InputDevice[];
    getActiveModifiers(): string[];
    private findActionForInput;
    private detectGamepadType;
    private getGamepadButtonName;
    private getKeyboardDevice;
    private getMouseDevice;
}
