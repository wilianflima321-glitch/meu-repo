/** Networking and multiplayer shared runtime primitives. */
import {
  type NetworkInput,
  type NetworkMessage,
  type PlayerState,
} from './networking-multiplayer-types';

export class NetworkSerializer {
  private static textEncoder = new TextEncoder();
  private static textDecoder = new TextDecoder();
  
  static serializeState(state: PlayerState): ArrayBuffer {
    // Calculate size: 3 floats pos + 4 floats rot + 3 floats vel + 1 float hp + string + custom
    const animBytes = this.textEncoder.encode(state.animation);
    const customJson = JSON.stringify(state.customData);
    const customBytes = this.textEncoder.encode(customJson);
    
    const size = 4 * 11 + // floats
                 4 + animBytes.length + // animation string length + data
                 4 + customBytes.length; // custom data length + data
    
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    let offset = 0;
    
    // Position
    view.setFloat32(offset, state.position.x, true); offset += 4;
    view.setFloat32(offset, state.position.y, true); offset += 4;
    view.setFloat32(offset, state.position.z, true); offset += 4;
    
    // Rotation
    view.setFloat32(offset, state.rotation.x, true); offset += 4;
    view.setFloat32(offset, state.rotation.y, true); offset += 4;
    view.setFloat32(offset, state.rotation.z, true); offset += 4;
    view.setFloat32(offset, state.rotation.w, true); offset += 4;
    
    // Velocity
    view.setFloat32(offset, state.velocity.x, true); offset += 4;
    view.setFloat32(offset, state.velocity.y, true); offset += 4;
    view.setFloat32(offset, state.velocity.z, true); offset += 4;
    
    // Health
    view.setFloat32(offset, state.health, true); offset += 4;
    
    // Animation
    view.setUint32(offset, animBytes.length, true); offset += 4;
    new Uint8Array(buffer, offset, animBytes.length).set(animBytes);
    offset += animBytes.length;
    
    // Custom data
    view.setUint32(offset, customBytes.length, true); offset += 4;
    new Uint8Array(buffer, offset, customBytes.length).set(customBytes);
    
    return buffer;
  }
  
  static deserializeState(buffer: ArrayBuffer): PlayerState {
    const view = new DataView(buffer);
    let offset = 0;
    
    const position = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    offset += 12;
    
    const rotation = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
      w: view.getFloat32(offset + 12, true),
    };
    offset += 16;
    
    const velocity = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    offset += 12;
    
    const health = view.getFloat32(offset, true);
    offset += 4;
    
    const animLength = view.getUint32(offset, true);
    offset += 4;
    const animation = this.textDecoder.decode(new Uint8Array(buffer, offset, animLength));
    offset += animLength;
    
    const customLength = view.getUint32(offset, true);
    offset += 4;
    const customJson = this.textDecoder.decode(new Uint8Array(buffer, offset, customLength));
    const customData = JSON.parse(customJson);
    
    return { position, rotation, velocity, animation, health, customData };
  }
  
  static serializeInput(input: NetworkInput): ArrayBuffer {
    const keysArray = Array.from(input.keys);
    const keysJson = JSON.stringify(keysArray);
    const keysBytes = this.textEncoder.encode(keysJson);
    
    const actionsJson = JSON.stringify(input.actions);
    const actionsBytes = this.textEncoder.encode(actionsJson);
    
    const playerIdBytes = this.textEncoder.encode(input.playerId);
    
    const size = 8 + // timestamp
                 4 + // sequence
                 4 + playerIdBytes.length + // player id
                 4 + keysBytes.length + // keys
                 4 * 2 + // mouse x, y
                 4 + // mouse buttons
                 4 + actionsBytes.length; // actions
    
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    let offset = 0;
    
    // Timestamp (double precision for accuracy)
    view.setFloat64(offset, input.timestamp, true); offset += 8;
    
    // Sequence
    view.setUint32(offset, input.sequence, true); offset += 4;
    
    // Player ID
    view.setUint32(offset, playerIdBytes.length, true); offset += 4;
    new Uint8Array(buffer, offset, playerIdBytes.length).set(playerIdBytes);
    offset += playerIdBytes.length;
    
    // Keys
    view.setUint32(offset, keysBytes.length, true); offset += 4;
    new Uint8Array(buffer, offset, keysBytes.length).set(keysBytes);
    offset += keysBytes.length;
    
    // Mouse
    view.setFloat32(offset, input.mouseX, true); offset += 4;
    view.setFloat32(offset, input.mouseY, true); offset += 4;
    view.setUint32(offset, input.mouseButtons, true); offset += 4;
    
    // Actions
    view.setUint32(offset, actionsBytes.length, true); offset += 4;
    new Uint8Array(buffer, offset, actionsBytes.length).set(actionsBytes);
    
    return buffer;
  }
  
  static deserializeInput(buffer: ArrayBuffer): NetworkInput {
    const view = new DataView(buffer);
    let offset = 0;
    
    const timestamp = view.getFloat64(offset, true); offset += 8;
    const sequence = view.getUint32(offset, true); offset += 4;
    
    const playerIdLength = view.getUint32(offset, true); offset += 4;
    const playerId = this.textDecoder.decode(new Uint8Array(buffer, offset, playerIdLength));
    offset += playerIdLength;
    
    const keysLength = view.getUint32(offset, true); offset += 4;
    const keysJson = this.textDecoder.decode(new Uint8Array(buffer, offset, keysLength));
    const keys = new Set<string>(JSON.parse(keysJson));
    offset += keysLength;
    
    const mouseX = view.getFloat32(offset, true); offset += 4;
    const mouseY = view.getFloat32(offset, true); offset += 4;
    const mouseButtons = view.getUint32(offset, true); offset += 4;
    
    const actionsLength = view.getUint32(offset, true); offset += 4;
    const actionsJson = this.textDecoder.decode(new Uint8Array(buffer, offset, actionsLength));
    const actions = JSON.parse(actionsJson);
    
    return { timestamp, sequence, playerId, keys, mouseX, mouseY, mouseButtons, actions };
  }
  
  static serializeMessage(message: NetworkMessage): ArrayBuffer {
    const typeBytes = this.textEncoder.encode(message.type);
    const payloadJson = JSON.stringify(message.payload);
    const payloadBytes = this.textEncoder.encode(payloadJson);
    
    const size = 1 + typeBytes.length + // type
                 8 + // timestamp
                 4 + // sequence
                 4 + payloadBytes.length; // payload
    
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    let offset = 0;
    
    // Type (1 byte length + data)
    view.setUint8(offset, typeBytes.length); offset += 1;
    new Uint8Array(buffer, offset, typeBytes.length).set(typeBytes);
    offset += typeBytes.length;
    
    // Timestamp
    view.setFloat64(offset, message.timestamp, true); offset += 8;
    
    // Sequence
    view.setUint32(offset, message.sequence, true); offset += 4;
    
    // Payload
    view.setUint32(offset, payloadBytes.length, true); offset += 4;
    new Uint8Array(buffer, offset, payloadBytes.length).set(payloadBytes);
    
    return buffer;
  }
  
  static deserializeMessage(buffer: ArrayBuffer): NetworkMessage {
    const view = new DataView(buffer);
    let offset = 0;
    
    const typeLength = view.getUint8(offset); offset += 1;
    const type = this.textDecoder.decode(new Uint8Array(buffer, offset, typeLength)) as MessageType;
    offset += typeLength;
    
    const timestamp = view.getFloat64(offset, true); offset += 8;
    const sequence = view.getUint32(offset, true); offset += 4;
    
    const payloadLength = view.getUint32(offset, true); offset += 4;
    const payloadJson = this.textDecoder.decode(new Uint8Array(buffer, offset, payloadLength));
    const payload = JSON.parse(payloadJson);
    
    return { type, timestamp, sequence, payload };
  }
}

// INPUT BUFFER FOR ROLLBACK

export class InputBuffer {
  private inputs: Map<number, NetworkInput> = new Map();
  private confirmedFrame: number = 0;
  private maxBufferSize: number;
  
  constructor(maxSize: number = 120) {
    this.maxBufferSize = maxSize;
  }
  
  add(frame: number, input: NetworkInput): void {
    this.inputs.set(frame, input);
    
    // Clean old inputs
    const oldestFrame = frame - this.maxBufferSize;
    for (const [f] of this.inputs) {
      if (f < oldestFrame) {
        this.inputs.delete(f);
      }
    }
  }
  
  get(frame: number): NetworkInput | undefined {
    return this.inputs.get(frame);
  }
  
  confirm(frame: number): void {
    this.confirmedFrame = frame;
  }
  
  getConfirmedFrame(): number {
    return this.confirmedFrame;
  }
  
  getInputRange(startFrame: number, endFrame: number): NetworkInput[] {
    const result: NetworkInput[] = [];
    for (let f = startFrame; f <= endFrame; f++) {
      const input = this.inputs.get(f);
      if (input) result.push(input);
    }
    return result;
  }
  
  clear(): void {
    this.inputs.clear();
    this.confirmedFrame = 0;
  }
}

// STATE INTERPOLATION

export class StateInterpolator {
  private stateBuffer: { timestamp: number; state: PlayerState }[] = [];
  private maxBufferSize: number;
  private interpolationDelay: number;
  
  constructor(interpolationDelay: number = 100, maxSize: number = 20) {
    this.interpolationDelay = interpolationDelay;
    this.maxBufferSize = maxSize;
  }
  
  addState(timestamp: number, state: PlayerState): void {
    this.stateBuffer.push({ timestamp, state });
    this.stateBuffer.sort((a, b) => a.timestamp - b.timestamp);
    
    // Trim buffer
    while (this.stateBuffer.length > this.maxBufferSize) {
      this.stateBuffer.shift();
    }
  }
  
  getInterpolatedState(currentTime: number): PlayerState | null {
    const renderTime = currentTime - this.interpolationDelay;
    
    // Find surrounding states
    let before: { timestamp: number; state: PlayerState } | null = null;
    let after: { timestamp: number; state: PlayerState } | null = null;
    
    for (let i = 0; i < this.stateBuffer.length - 1; i++) {
      if (this.stateBuffer[i].timestamp <= renderTime &&
          this.stateBuffer[i + 1].timestamp >= renderTime) {
        before = this.stateBuffer[i];
        after = this.stateBuffer[i + 1];
        break;
      }
    }
    
    if (!before || !after) {
      // Extrapolate from latest state
      if (this.stateBuffer.length > 0) {
        return this.stateBuffer[this.stateBuffer.length - 1].state;
      }
      return null;
    }
    
    // Calculate interpolation factor
    const range = after.timestamp - before.timestamp;
    const t = range > 0 ? (renderTime - before.timestamp) / range : 0;
    
    return this.interpolateStates(before.state, after.state, t);
  }
  
  private interpolateStates(a: PlayerState, b: PlayerState, t: number): PlayerState {
    return {
      position: {
        x: a.position.x + (b.position.x - a.position.x) * t,
        y: a.position.y + (b.position.y - a.position.y) * t,
        z: a.position.z + (b.position.z - a.position.z) * t,
      },
      rotation: this.slerpQuaternion(a.rotation, b.rotation, t),
      velocity: {
        x: a.velocity.x + (b.velocity.x - a.velocity.x) * t,
        y: a.velocity.y + (b.velocity.y - a.velocity.y) * t,
        z: a.velocity.z + (b.velocity.z - a.velocity.z) * t,
      },
      animation: t < 0.5 ? a.animation : b.animation,
      health: a.health + (b.health - a.health) * t,
      customData: { ...a.customData, ...b.customData },
    };
  }
  
  private slerpQuaternion(
    a: { x: number; y: number; z: number; w: number },
    b: { x: number; y: number; z: number; w: number },
    t: number
  ): { x: number; y: number; z: number; w: number } {
    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    
    // Ensure shortest path
    if (dot < 0) {
      b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
      dot = -dot;
    }
    
    if (dot > 0.9995) {
      // Linear interpolation for very close quaternions
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        w: a.w + (b.w - a.w) * t,
      };
    }
    
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const wa = Math.sin((1 - t) * theta) / sinTheta;
    const wb = Math.sin(t * theta) / sinTheta;
    
    return {
      x: a.x * wa + b.x * wb,
      y: a.y * wa + b.y * wb,
      z: a.z * wa + b.z * wb,
      w: a.w * wa + b.w * wb,
    };
  }
  
  clear(): void {
    this.stateBuffer = [];
  }
}

// CLIENT-SIDE PREDICTION

export class ClientPrediction {
  private pendingInputs: NetworkInput[] = [];
  private lastConfirmedSequence: number = 0;
  private simulateFunc: (state: PlayerState, input: NetworkInput) => PlayerState;
  
  constructor(simulateFunc: (state: PlayerState, input: NetworkInput) => PlayerState) {
    this.simulateFunc = simulateFunc;
  }
  
  addInput(input: NetworkInput): void {
    this.pendingInputs.push(input);
  }
  
  reconcile(confirmedState: PlayerState, confirmedSequence: number): PlayerState {
    // Remove inputs that have been confirmed
    this.pendingInputs = this.pendingInputs.filter(
      input => input.sequence > confirmedSequence
    );
    this.lastConfirmedSequence = confirmedSequence;
    
    // Re-apply pending inputs
    let state = confirmedState;
    for (const input of this.pendingInputs) {
      state = this.simulateFunc(state, input);
    }
    
    return state;
  }
  
  predict(currentState: PlayerState, input: NetworkInput): PlayerState {
    return this.simulateFunc(currentState, input);
  }
  
  getPendingInputCount(): number {
    return this.pendingInputs.length;
  }
  
  clear(): void {
    this.pendingInputs = [];
    this.lastConfirmedSequence = 0;
  }
}

// ROLLBACK NETCODE

export interface RollbackState {
  frame: number;
  state: Map<string, PlayerState>;
  inputs: Map<string, NetworkInput>;
}

export class RollbackNetcode {
  private stateHistory: RollbackState[] = [];
  private maxRollbackFrames: number;
  private currentFrame: number = 0;
  private confirmedFrame: number = 0;
  private playerInputBuffers: Map<string, InputBuffer> = new Map();
  private simulateFunc: (states: Map<string, PlayerState>, inputs: Map<string, NetworkInput>) => Map<string, PlayerState>;
  
  constructor(
    maxRollbackFrames: number,
    simulateFunc: (states: Map<string, PlayerState>, inputs: Map<string, NetworkInput>) => Map<string, PlayerState>
  ) {
    this.maxRollbackFrames = maxRollbackFrames;
    this.simulateFunc = simulateFunc;
  }
  
  addPlayer(playerId: string): void {
    this.playerInputBuffers.set(playerId, new InputBuffer(this.maxRollbackFrames * 2));
  }
  
  removePlayer(playerId: string): void {
    this.playerInputBuffers.delete(playerId);
  }
  
  addInput(playerId: string, frame: number, input: NetworkInput): void {
    const buffer = this.playerInputBuffers.get(playerId);
    if (buffer) {
      buffer.add(frame, input);
    }
  }
  
  confirmFrame(frame: number): void {
    this.confirmedFrame = frame;
    
    // Clean old history
    const oldestFrame = frame - this.maxRollbackFrames;
    this.stateHistory = this.stateHistory.filter(s => s.frame >= oldestFrame);
    
    // Confirm inputs for all players
    for (const buffer of this.playerInputBuffers.values()) {
      buffer.confirm(frame);
    }
  }
  
  saveState(frame: number, states: Map<string, PlayerState>, inputs: Map<string, NetworkInput>): void {
    // Deep copy states
    const stateCopy = new Map<string, PlayerState>();
    for (const [id, state] of states) {
      stateCopy.set(id, JSON.parse(JSON.stringify(state)));
    }
    
    // Deep copy inputs
    const inputCopy = new Map<string, NetworkInput>();
    for (const [id, input] of inputs) {
      inputCopy.set(id, {
        ...input,
        keys: new Set(input.keys),
        actions: [...input.actions],
      });
    }
    
    this.stateHistory.push({
      frame,
      state: stateCopy,
      inputs: inputCopy,
    });
    
    // Limit history size
    while (this.stateHistory.length > this.maxRollbackFrames) {
      this.stateHistory.shift();
    }
  }
  
  rollback(toFrame: number): Map<string, PlayerState> | null {
    // Find state to rollback to
    const targetState = this.stateHistory.find(s => s.frame === toFrame);
    if (!targetState) {
      console.warn(`Cannot rollback to frame ${toFrame}: state not found`);
      return null;
    }
    
    // Resimulate from target frame to current frame
    let currentStates = new Map(targetState.state);
    
    for (let frame = toFrame + 1; frame <= this.currentFrame; frame++) {
      const inputs = new Map<string, NetworkInput>();
      
      // Get inputs for this frame
      for (const [playerId, buffer] of this.playerInputBuffers) {
        const input = buffer.get(frame);
        if (input) {
          inputs.set(playerId, input);
        }
      }
      
      // Simulate frame
      currentStates = this.simulateFunc(currentStates, inputs);
    }
    
    return currentStates;
  }
  
  advanceFrame(): void {
    this.currentFrame++;
  }
  
  getCurrentFrame(): number {
    return this.currentFrame;
  }
  
  getConfirmedFrame(): number {
    return this.confirmedFrame;
  }
  
  reset(): void {
    this.stateHistory = [];
    this.currentFrame = 0;
    this.confirmedFrame = 0;
    this.playerInputBuffers.clear();
  }
}

