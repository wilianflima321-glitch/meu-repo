"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedInputSystem = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
// ============================================================================
// INPUT SYSTEM
// ============================================================================
let AdvancedInputSystem = class AdvancedInputSystem {
    constructor() {
        this.devices = new Map();
        this.actions = new Map();
        this.contexts = new Map();
        this.activeContext = 'default';
        // Input state
        this.pressedActions = new Set();
        this.axisStates = new Map();
        this.inputBuffer = [];
        // Combo system
        this.combos = new Map();
        this.comboStates = new Map();
        // Gesture recognition
        this.touchPoints = new Map();
        this.gestureState = {};
        // Raw input
        this.keyStates = new Map();
        this.mousePosition = { x: 0, y: 0 };
        this.mouseDelta = { x: 0, y: 0 };
        this.gamepadStates = new Map();
        // Events
        this.onActionEmitter = new common_1.Emitter();
        this.onAction = this.onActionEmitter.event;
        this.onAxisEmitter = new common_1.Emitter();
        this.onAxis = this.onAxisEmitter.event;
        this.onGestureEmitter = new common_1.Emitter();
        this.onGesture = this.onGestureEmitter.event;
        this.onComboEmitter = new common_1.Emitter();
        this.onCombo = this.onComboEmitter.event;
        this.onDeviceEmitter = new common_1.Emitter();
        this.onDevice = this.onDeviceEmitter.event;
    }
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    initialize() {
        this.setupDefaultActions();
        this.setupDefaultContexts();
        this.registerEventListeners();
        this.startGamepadPolling();
        console.log('[InputSystem] Initialized');
    }
    setupDefaultActions() {
        // Movement
        this.registerAction({
            name: 'move',
            category: 'movement',
            contexts: ['gameplay'],
            holdable: true,
            bufferWindow: 0,
            bindings: [
                { device: 'keyboard', input: 'WASD' },
                { device: 'gamepad_xbox', input: 'left_stick', deadzone: 0.15 },
                { device: 'gamepad_playstation', input: 'left_stick', deadzone: 0.15 },
            ],
            defaultBindings: [],
        });
        this.registerAction({
            name: 'look',
            category: 'camera',
            contexts: ['gameplay'],
            holdable: true,
            bufferWindow: 0,
            bindings: [
                { device: 'mouse', input: 'delta', sensitivity: 1.0 },
                { device: 'gamepad_xbox', input: 'right_stick', deadzone: 0.1, sensitivity: 2.0 },
            ],
            defaultBindings: [],
        });
        // Actions
        this.registerAction({
            name: 'jump',
            category: 'actions',
            contexts: ['gameplay'],
            holdable: false,
            bufferWindow: 100,
            bindings: [
                { device: 'keyboard', input: 'Space' },
                { device: 'gamepad_xbox', input: 'A' },
                { device: 'gamepad_playstation', input: 'X' },
            ],
            defaultBindings: [],
        });
        this.registerAction({
            name: 'attack',
            category: 'combat',
            contexts: ['gameplay'],
            holdable: true,
            bufferWindow: 150,
            bindings: [
                { device: 'mouse', input: 'left' },
                { device: 'gamepad_xbox', input: 'RB' },
                { device: 'gamepad_playstation', input: 'R1' },
            ],
            defaultBindings: [],
        });
        this.registerAction({
            name: 'block',
            category: 'combat',
            contexts: ['gameplay'],
            holdable: true,
            bufferWindow: 50,
            bindings: [
                { device: 'mouse', input: 'right' },
                { device: 'gamepad_xbox', input: 'LB' },
                { device: 'gamepad_playstation', input: 'L1' },
            ],
            defaultBindings: [],
        });
        this.registerAction({
            name: 'interact',
            category: 'actions',
            contexts: ['gameplay'],
            holdable: false,
            bufferWindow: 100,
            bindings: [
                { device: 'keyboard', input: 'E' },
                { device: 'gamepad_xbox', input: 'X' },
                { device: 'gamepad_playstation', input: 'Square' },
            ],
            defaultBindings: [],
        });
        this.registerAction({
            name: 'dodge',
            category: 'movement',
            contexts: ['gameplay'],
            holdable: false,
            bufferWindow: 100,
            bindings: [
                { device: 'keyboard', input: 'Shift' },
                { device: 'gamepad_xbox', input: 'B' },
                { device: 'gamepad_playstation', input: 'Circle' },
            ],
            defaultBindings: [],
        });
        this.registerAction({
            name: 'sprint',
            category: 'movement',
            contexts: ['gameplay'],
            holdable: true,
            bufferWindow: 0,
            bindings: [
                { device: 'keyboard', input: 'Shift' },
                { device: 'gamepad_xbox', input: 'LS' },
                { device: 'gamepad_playstation', input: 'L3' },
            ],
            defaultBindings: [],
        });
        // UI
        this.registerAction({
            name: 'pause',
            category: 'ui',
            contexts: ['gameplay', 'menu'],
            holdable: false,
            bufferWindow: 0,
            bindings: [
                { device: 'keyboard', input: 'Escape' },
                { device: 'gamepad_xbox', input: 'Start' },
                { device: 'gamepad_playstation', input: 'Options' },
            ],
            defaultBindings: [],
        });
        this.registerAction({
            name: 'inventory',
            category: 'ui',
            contexts: ['gameplay'],
            holdable: false,
            bufferWindow: 0,
            bindings: [
                { device: 'keyboard', input: 'I' },
                { device: 'gamepad_xbox', input: 'Back' },
                { device: 'gamepad_playstation', input: 'TouchpadPress' },
            ],
            defaultBindings: [],
        });
    }
    setupDefaultContexts() {
        this.registerContext({
            name: 'default',
            priority: 0,
            active: true,
            actions: [],
            exclusive: false,
        });
        this.registerContext({
            name: 'gameplay',
            priority: 10,
            active: true,
            actions: ['move', 'look', 'jump', 'attack', 'block', 'dodge', 'sprint', 'interact', 'pause', 'inventory'],
            exclusive: false,
        });
        this.registerContext({
            name: 'menu',
            priority: 100,
            active: false,
            actions: ['pause', 'navigate', 'select', 'back'],
            exclusive: true,
        });
        this.registerContext({
            name: 'dialogue',
            priority: 50,
            active: false,
            actions: ['advance', 'select', 'skip'],
            exclusive: true,
        });
        this.registerContext({
            name: 'vehicle',
            priority: 20,
            active: false,
            actions: ['accelerate', 'brake', 'steer', 'exit', 'look'],
            exclusive: false,
        });
    }
    registerEventListeners() {
        // Keyboard
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this.onKeyDown.bind(this));
            window.addEventListener('keyup', this.onKeyUp.bind(this));
            // Mouse
            window.addEventListener('mousedown', this.onMouseDown.bind(this));
            window.addEventListener('mouseup', this.onMouseUp.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            window.addEventListener('wheel', this.onMouseWheel.bind(this));
            // Touch
            window.addEventListener('touchstart', this.onTouchStart.bind(this));
            window.addEventListener('touchmove', this.onTouchMove.bind(this));
            window.addEventListener('touchend', this.onTouchEnd.bind(this));
            // Gamepad
            window.addEventListener('gamepadconnected', this.onGamepadConnected.bind(this));
            window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected.bind(this));
        }
    }
    // ========================================================================
    // INPUT HANDLERS
    // ========================================================================
    onKeyDown(event) {
        if (this.keyStates.get(event.code))
            return; // Already pressed
        this.keyStates.set(event.code, true);
        const action = this.findActionForInput('keyboard', event.code);
        if (action && this.isActionAvailable(action.name)) {
            this.triggerAction(action.name, 'pressed', 1, this.getKeyboardDevice());
        }
    }
    onKeyUp(event) {
        this.keyStates.set(event.code, false);
        const action = this.findActionForInput('keyboard', event.code);
        if (action && this.pressedActions.has(action.name)) {
            this.triggerAction(action.name, 'released', 0, this.getKeyboardDevice());
        }
    }
    onMouseDown(event) {
        const button = ['left', 'middle', 'right'][event.button] || 'left';
        const action = this.findActionForInput('mouse', button);
        if (action && this.isActionAvailable(action.name)) {
            this.triggerAction(action.name, 'pressed', 1, this.getMouseDevice());
        }
    }
    onMouseUp(event) {
        const button = ['left', 'middle', 'right'][event.button] || 'left';
        const action = this.findActionForInput('mouse', button);
        if (action && this.pressedActions.has(action.name)) {
            this.triggerAction(action.name, 'released', 0, this.getMouseDevice());
        }
    }
    onMouseMove(event) {
        this.mouseDelta.x = event.movementX;
        this.mouseDelta.y = event.movementY;
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;
        // Look action
        const lookAction = this.actions.get('look');
        if (lookAction && this.isActionAvailable('look')) {
            const binding = lookAction.bindings.find(b => b.device === 'mouse');
            const sensitivity = binding?.sensitivity || 1.0;
            this.onAxisEmitter.fire({
                action: 'look',
                x: this.mouseDelta.x * sensitivity,
                y: this.mouseDelta.y * sensitivity * (binding?.inverted ? -1 : 1),
                device: this.getMouseDevice(),
                raw: { ...this.mouseDelta },
            });
        }
    }
    onMouseWheel(event) {
        const action = this.findActionForInput('mouse', 'wheel');
        if (action && this.isActionAvailable(action.name)) {
            this.triggerAction(action.name, 'axis', Math.sign(event.deltaY), this.getMouseDevice());
        }
    }
    onTouchStart(event) {
        const now = Date.now();
        for (const touch of Array.from(event.changedTouches)) {
            this.touchPoints.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
                startTime: now,
            });
        }
        this.detectGestures(event);
    }
    onTouchMove(event) {
        for (const touch of Array.from(event.changedTouches)) {
            const startPoint = this.touchPoints.get(touch.identifier);
            if (startPoint) {
                // Update for gesture detection
                this.gestureState.delta = {
                    x: touch.clientX - startPoint.x,
                    y: touch.clientY - startPoint.y,
                };
            }
        }
        this.detectGestures(event);
    }
    onTouchEnd(event) {
        const now = Date.now();
        for (const touch of Array.from(event.changedTouches)) {
            const startPoint = this.touchPoints.get(touch.identifier);
            if (startPoint) {
                const duration = now - startPoint.startTime;
                const deltaX = touch.clientX - startPoint.x;
                const deltaY = touch.clientY - startPoint.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                // Tap detection
                if (duration < 200 && distance < 20) {
                    this.onGestureEmitter.fire({
                        type: 'tap',
                        position: { x: touch.clientX, y: touch.clientY },
                        fingers: 1,
                    });
                }
                // Swipe detection
                if (duration < 500 && distance > 50) {
                    this.onGestureEmitter.fire({
                        type: 'swipe',
                        position: { x: touch.clientX, y: touch.clientY },
                        delta: { x: deltaX, y: deltaY },
                        velocity: { x: deltaX / duration, y: deltaY / duration },
                        fingers: 1,
                    });
                }
                this.touchPoints.delete(touch.identifier);
            }
        }
    }
    detectGestures(event) {
        const touches = Array.from(event.touches);
        if (touches.length === 2) {
            const [t1, t2] = touches;
            const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            // Pinch gesture
            if (this.gestureState.scale !== undefined) {
                const newScale = currentDist / (this.gestureState.scale * 100);
                this.onGestureEmitter.fire({
                    type: 'pinch',
                    position: {
                        x: (t1.clientX + t2.clientX) / 2,
                        y: (t1.clientY + t2.clientY) / 2,
                    },
                    scale: newScale,
                    fingers: 2,
                });
            }
            this.gestureState.scale = currentDist / 100;
        }
    }
    onGamepadConnected(event) {
        const gamepad = event.gamepad;
        const device = {
            id: `gamepad_${gamepad.index}`,
            type: this.detectGamepadType(gamepad),
            name: gamepad.id,
            connected: true,
            capabilities: {
                hasVibration: 'vibrationActuator' in gamepad,
                hasGyro: false,
                hasAccelerometer: false,
                hasTouchpad: gamepad.id.includes('DualSense') || gamepad.id.includes('DualShock 4'),
                hasAdaptiveTriggers: gamepad.id.includes('DualSense'),
                numButtons: gamepad.buttons.length,
                numAxes: gamepad.axes.length,
                numTouchPoints: 0,
            },
        };
        this.devices.set(device.id, device);
        this.gamepadStates.set(device.id, {
            buttons: new Array(gamepad.buttons.length).fill(false),
            axes: new Array(gamepad.axes.length).fill(0),
        });
        this.onDeviceEmitter.fire({ device, connected: true });
        console.log(`[InputSystem] Gamepad connected: ${device.name}`);
    }
    onGamepadDisconnected(event) {
        const id = `gamepad_${event.gamepad.index}`;
        const device = this.devices.get(id);
        if (device) {
            device.connected = false;
            this.onDeviceEmitter.fire({ device, connected: false });
            this.devices.delete(id);
            this.gamepadStates.delete(id);
        }
    }
    // ========================================================================
    // GAMEPAD POLLING
    // ========================================================================
    startGamepadPolling() {
        if (typeof requestAnimationFrame === 'undefined')
            return;
        const poll = () => {
            this.pollGamepads();
            requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
    }
    pollGamepads() {
        if (typeof navigator === 'undefined' || !navigator.getGamepads)
            return;
        const gamepads = navigator.getGamepads();
        for (const gamepad of gamepads) {
            if (!gamepad)
                continue;
            const id = `gamepad_${gamepad.index}`;
            const device = this.devices.get(id);
            const state = this.gamepadStates.get(id);
            if (!device || !state)
                continue;
            // Process buttons
            for (let i = 0; i < gamepad.buttons.length; i++) {
                const button = gamepad.buttons[i];
                const wasPressed = state.buttons[i];
                const isPressed = button.pressed;
                if (isPressed && !wasPressed) {
                    const buttonName = this.getGamepadButtonName(device.type, i);
                    const action = this.findActionForInput(device.type, buttonName);
                    if (action && this.isActionAvailable(action.name)) {
                        this.triggerAction(action.name, 'pressed', button.value, device);
                    }
                }
                else if (!isPressed && wasPressed) {
                    const buttonName = this.getGamepadButtonName(device.type, i);
                    const action = this.findActionForInput(device.type, buttonName);
                    if (action && this.pressedActions.has(action.name)) {
                        this.triggerAction(action.name, 'released', 0, device);
                    }
                }
                state.buttons[i] = isPressed;
            }
            // Process axes (sticks)
            this.processGamepadStick(device, state, gamepad.axes, 0, 1, 'left_stick', 'move');
            this.processGamepadStick(device, state, gamepad.axes, 2, 3, 'right_stick', 'look');
            // Process triggers
            if (gamepad.axes.length > 4) {
                this.processGamepadTrigger(device, state, gamepad.buttons, 6, 'LT', 'aim');
                this.processGamepadTrigger(device, state, gamepad.buttons, 7, 'RT', 'shoot');
            }
        }
    }
    processGamepadStick(device, state, axes, xIndex, yIndex, stickName, actionName) {
        const x = axes[xIndex] || 0;
        const y = axes[yIndex] || 0;
        const action = this.actions.get(actionName);
        if (!action || !this.isActionAvailable(actionName))
            return;
        const binding = action.bindings.find(b => b.device === device.type && b.input === stickName);
        const deadzone = binding?.deadzone || 0.15;
        const sensitivity = binding?.sensitivity || 1.0;
        // Apply deadzone
        let processedX = Math.abs(x) < deadzone ? 0 : x;
        let processedY = Math.abs(y) < deadzone ? 0 : (binding?.inverted ? -y : y);
        // Normalize outside deadzone
        if (processedX !== 0) {
            processedX = Math.sign(x) * ((Math.abs(x) - deadzone) / (1 - deadzone));
        }
        if (processedY !== 0) {
            processedY = Math.sign(processedY) * ((Math.abs(y) - deadzone) / (1 - deadzone));
        }
        // Apply sensitivity
        processedX *= sensitivity;
        processedY *= sensitivity;
        this.axisStates.set(actionName, { x: processedX, y: processedY });
        this.onAxisEmitter.fire({
            action: actionName,
            x: processedX,
            y: processedY,
            device,
            raw: { x, y },
        });
    }
    processGamepadTrigger(device, state, buttons, index, triggerName, actionName) {
        const button = buttons[index];
        if (!button)
            return;
        const value = button.value;
        const wasPressed = state.buttons[index];
        const isPressed = value > 0.1;
        const action = this.findActionForInput(device.type, triggerName);
        if (!action || !this.isActionAvailable(action.name))
            return;
        if (isPressed && !wasPressed) {
            this.triggerAction(action.name, 'pressed', value, device);
        }
        else if (!isPressed && wasPressed) {
            this.triggerAction(action.name, 'released', 0, device);
        }
        else if (isPressed) {
            this.triggerAction(action.name, 'held', value, device);
        }
    }
    // ========================================================================
    // ACTION HANDLING
    // ========================================================================
    triggerAction(actionName, type, value, device) {
        const action = this.actions.get(actionName);
        if (!action)
            return;
        if (type === 'pressed') {
            this.pressedActions.add(actionName);
            this.addToBuffer(actionName);
        }
        else if (type === 'released') {
            this.pressedActions.delete(actionName);
        }
        const event = {
            action: actionName,
            type,
            value,
            device,
            timestamp: Date.now(),
            modifiers: this.getActiveModifiers(),
        };
        this.onActionEmitter.fire(event);
        // Check combos
        this.checkCombos(event);
    }
    addToBuffer(actionName) {
        const action = this.actions.get(actionName);
        if (!action || action.bufferWindow === 0)
            return;
        const now = Date.now();
        // Clean old entries
        this.inputBuffer = this.inputBuffer.filter(entry => now - entry.timestamp < action.bufferWindow);
        this.inputBuffer.push({ action: actionName, timestamp: now });
    }
    consumeBufferedInput(actionName) {
        const now = Date.now();
        const action = this.actions.get(actionName);
        if (!action)
            return false;
        const index = this.inputBuffer.findIndex(entry => entry.action === actionName && now - entry.timestamp < action.bufferWindow);
        if (index >= 0) {
            this.inputBuffer.splice(index, 1);
            return true;
        }
        return false;
    }
    // ========================================================================
    // COMBO SYSTEM
    // ========================================================================
    registerCombo(combo) {
        this.combos.set(combo.name, combo);
        this.comboStates.set(combo.name, {
            combo,
            progress: 0,
            lastInputTime: 0,
            completed: false,
        });
    }
    checkCombos(event) {
        const now = Date.now();
        for (const [name, state] of this.comboStates) {
            if (state.completed)
                continue;
            const combo = state.combo;
            const nextInput = combo.inputs[state.progress];
            // Check timeout
            if (state.progress > 0 && now - state.lastInputTime > combo.timeout) {
                state.progress = 0;
            }
            // Check if current event matches next input
            if (nextInput && event.action === nextInput.action) {
                const matchesType = (nextInput.type === 'press' && event.type === 'pressed') ||
                    (nextInput.type === 'release' && event.type === 'released') ||
                    (nextInput.type === 'hold' && event.type === 'held');
                if (matchesType) {
                    state.progress++;
                    state.lastInputTime = now;
                    // Combo completed
                    if (state.progress >= combo.inputs.length) {
                        state.completed = true;
                        state.progress = 0;
                        this.onComboEmitter.fire({ combo: name });
                        // Reset after short delay
                        setTimeout(() => {
                            state.completed = false;
                        }, 100);
                    }
                }
            }
        }
    }
    // ========================================================================
    // HAPTIC FEEDBACK
    // ========================================================================
    async playHaptic(deviceId, effect) {
        const device = this.devices.get(deviceId);
        if (!device || !device.capabilities.hasVibration)
            return;
        if (typeof navigator === 'undefined')
            return;
        const gamepads = navigator.getGamepads();
        const index = parseInt(deviceId.split('_')[1]);
        const gamepad = gamepads[index];
        if (!gamepad)
            return;
        if ('vibrationActuator' in gamepad) {
            const actuator = gamepad.vibrationActuator;
            if (effect.type === 'rumble') {
                await actuator.playEffect('dual-rumble', {
                    duration: effect.duration,
                    strongMagnitude: effect.motors?.left ?? effect.intensity,
                    weakMagnitude: effect.motors?.right ?? effect.intensity,
                });
            }
        }
    }
    stopHaptic(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device)
            return;
        if (typeof navigator === 'undefined')
            return;
        const gamepads = navigator.getGamepads();
        const index = parseInt(deviceId.split('_')[1]);
        const gamepad = gamepads[index];
        if (gamepad && 'vibrationActuator' in gamepad) {
            const actuator = gamepad.vibrationActuator;
            actuator.reset();
        }
    }
    // ========================================================================
    // CONTEXT MANAGEMENT
    // ========================================================================
    registerContext(context) {
        this.contexts.set(context.name, context);
    }
    activateContext(name) {
        const context = this.contexts.get(name);
        if (!context)
            return;
        context.active = true;
        // If exclusive, deactivate lower priority contexts
        if (context.exclusive) {
            for (const [otherName, otherContext] of this.contexts) {
                if (otherName !== name && otherContext.priority < context.priority) {
                    otherContext.active = false;
                }
            }
        }
        this.activeContext = name;
    }
    deactivateContext(name) {
        const context = this.contexts.get(name);
        if (context) {
            context.active = false;
        }
        // Find highest priority active context
        let highest;
        for (const ctx of this.contexts.values()) {
            if (ctx.active && (!highest || ctx.priority > highest.priority)) {
                highest = ctx;
            }
        }
        this.activeContext = highest?.name || 'default';
    }
    isActionAvailable(actionName) {
        const action = this.actions.get(actionName);
        if (!action)
            return false;
        // Check if action is available in any active context
        for (const context of this.contexts.values()) {
            if (context.active && action.contexts.includes(context.name)) {
                return true;
            }
        }
        return false;
    }
    // ========================================================================
    // BINDING MANAGEMENT
    // ========================================================================
    registerAction(action) {
        action.defaultBindings = [...action.bindings];
        this.actions.set(action.name, action);
    }
    rebind(actionName, binding) {
        const action = this.actions.get(actionName);
        if (!action)
            return;
        // Remove existing binding for same device
        action.bindings = action.bindings.filter(b => b.device !== binding.device);
        action.bindings.push(binding);
    }
    resetBindings(actionName) {
        if (actionName) {
            const action = this.actions.get(actionName);
            if (action) {
                action.bindings = [...action.defaultBindings];
            }
        }
        else {
            for (const action of this.actions.values()) {
                action.bindings = [...action.defaultBindings];
            }
        }
    }
    getBindings(actionName) {
        return this.actions.get(actionName)?.bindings || [];
    }
    exportBindings() {
        const bindings = {};
        for (const [name, action] of this.actions) {
            bindings[name] = action.bindings;
        }
        return bindings;
    }
    importBindings(bindings) {
        for (const [name, actionBindings] of Object.entries(bindings)) {
            const action = this.actions.get(name);
            if (action) {
                action.bindings = actionBindings;
            }
        }
    }
    // ========================================================================
    // QUERY METHODS
    // ========================================================================
    isPressed(actionName) {
        return this.pressedActions.has(actionName);
    }
    getAxis(actionName) {
        return this.axisStates.get(actionName) || { x: 0, y: 0 };
    }
    getMousePosition() {
        return { ...this.mousePosition };
    }
    getMouseDelta() {
        return { ...this.mouseDelta };
    }
    getConnectedDevices() {
        return Array.from(this.devices.values()).filter(d => d.connected);
    }
    getActiveModifiers() {
        const modifiers = [];
        if (this.keyStates.get('ShiftLeft') || this.keyStates.get('ShiftRight'))
            modifiers.push('shift');
        if (this.keyStates.get('ControlLeft') || this.keyStates.get('ControlRight'))
            modifiers.push('ctrl');
        if (this.keyStates.get('AltLeft') || this.keyStates.get('AltRight'))
            modifiers.push('alt');
        return modifiers;
    }
    // ========================================================================
    // HELPERS
    // ========================================================================
    findActionForInput(device, input) {
        for (const action of this.actions.values()) {
            const binding = action.bindings.find(b => b.device === device && b.input === input);
            if (binding)
                return action;
        }
        return undefined;
    }
    detectGamepadType(gamepad) {
        const id = gamepad.id.toLowerCase();
        if (id.includes('xbox') || id.includes('xinput')) {
            return 'gamepad_xbox';
        }
        if (id.includes('playstation') || id.includes('dualshock') || id.includes('dualsense')) {
            return 'gamepad_playstation';
        }
        if (id.includes('switch') || id.includes('joy-con') || id.includes('pro controller')) {
            return 'gamepad_switch';
        }
        return 'gamepad_generic';
    }
    getGamepadButtonName(type, index) {
        const xboxButtons = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'LS', 'RS', 'Up', 'Down', 'Left', 'Right', 'Guide'];
        const psButtons = ['X', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', 'Up', 'Down', 'Left', 'Right', 'PS'];
        if (type === 'gamepad_playstation') {
            return psButtons[index] || `Button${index}`;
        }
        return xboxButtons[index] || `Button${index}`;
    }
    getKeyboardDevice() {
        return {
            id: 'keyboard',
            type: 'keyboard',
            name: 'Keyboard',
            connected: true,
            capabilities: {
                hasVibration: false,
                hasGyro: false,
                hasAccelerometer: false,
                hasTouchpad: false,
                hasAdaptiveTriggers: false,
                numButtons: 104,
                numAxes: 0,
                numTouchPoints: 0,
            },
        };
    }
    getMouseDevice() {
        return {
            id: 'mouse',
            type: 'mouse',
            name: 'Mouse',
            connected: true,
            capabilities: {
                hasVibration: false,
                hasGyro: false,
                hasAccelerometer: false,
                hasTouchpad: false,
                hasAdaptiveTriggers: false,
                numButtons: 5,
                numAxes: 2,
                numTouchPoints: 0,
            },
        };
    }
};
exports.AdvancedInputSystem = AdvancedInputSystem;
exports.AdvancedInputSystem = AdvancedInputSystem = __decorate([
    (0, inversify_1.injectable)()
], AdvancedInputSystem);
