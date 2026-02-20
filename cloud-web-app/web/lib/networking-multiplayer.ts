/** Networking and multiplayer runtime core. */
import {
  MessageType,
  type Lobby,
  type NetworkConfig,
  type NetworkInput,
  type NetworkMessage,
  type NetworkPlayer,
  type PlayerState,
} from './networking-multiplayer-types';

export { MessageType };
export type {
  Lobby,
  NetworkConfig,
  NetworkInput,
  NetworkMessage,
  NetworkPlayer,
  PlayerState,
} from './networking-multiplayer-types';
// BINARY SERIALIZATION

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

// NETWORK CLIENT

type NetworkEventHandler = (data: unknown) => void;

export class NetworkClient {
  private ws: WebSocket | null = null;
  private config: NetworkConfig;
  private playerId: string = '';
  private players: Map<string, NetworkPlayer> = new Map();
  private eventHandlers: Map<MessageType, NetworkEventHandler[]> = new Map();
  private messageSequence: number = 0;
  private ping: number = 0;
  private lastPingTime: number = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private interpolators: Map<string, StateInterpolator> = new Map();
  private prediction: ClientPrediction | null = null;
  private localState: PlayerState | null = null;
  private inputSequence: number = 0;
  
  constructor(config: NetworkConfig) {
    this.config = config;
  }
  
  async connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.serverUrl);
        this.ws.binaryType = 'arraybuffer';
        
        this.ws.onopen = () => {
          // Request player ID
          this.send(MessageType.CONNECT, {});
          this.startPingLoop();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onerror = (error) => {
          reject(error);
        };
        
        this.ws.onclose = () => {
          this.cleanup();
        };
        
        // Wait for connect response
        this.on(MessageType.CONNECT, (data: unknown) => {
          const { playerId } = data as { playerId: string };
          this.playerId = playerId;
          resolve(playerId);
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  disconnect(): void {
    if (this.ws) {
      this.send(MessageType.DISCONNECT, { playerId: this.playerId });
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
  }
  
  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.players.clear();
    this.interpolators.clear();
    this.eventHandlers.clear();
  }
  
  private startPingLoop(): void {
    this.pingInterval = setInterval(() => {
      this.lastPingTime = performance.now();
      this.send(MessageType.PING, { time: this.lastPingTime });
    }, 1000);
  }
  
  private handleMessage(data: ArrayBuffer | string): void {
    let message: NetworkMessage;
    
    if (data instanceof ArrayBuffer) {
      message = NetworkSerializer.deserializeMessage(data);
    } else {
      message = JSON.parse(data);
    }
    
    // Handle pong
    if (message.type === MessageType.PONG) {
      const payload = message.payload as { time: number };
      this.ping = performance.now() - payload.time;
    }
    
    // Call event handlers
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(message.payload);
      }
    }
    
    // Handle state updates
    if (message.type === MessageType.STATE_UPDATE) {
      this.handleStateUpdate(message.payload as { playerId: string; state: PlayerState });
    }
  }
  
  private handleStateUpdate(data: { playerId: string; state: PlayerState }): void {
    const { playerId, state } = data;
    
    if (playerId === this.playerId) {
      // Server reconciliation for local player
      if (this.prediction && this.localState) {
        this.localState = this.prediction.reconcile(state, this.inputSequence);
      }
    } else {
      // Add state to interpolator for remote players
      let interpolator = this.interpolators.get(playerId);
      if (!interpolator) {
        interpolator = new StateInterpolator(this.config.interpolationDelay);
        this.interpolators.set(playerId, interpolator);
      }
      interpolator.addState(Date.now(), state);
    }
    
    // Update player in list
    const player = this.players.get(playerId);
    if (player) {
      player.state = state;
    }
  }
  
  send(type: MessageType, payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }
    
    const message: NetworkMessage = {
      type,
      timestamp: Date.now(),
      sequence: this.messageSequence++,
      payload,
    };
    
    // Use binary for game data, JSON for control messages
    if (type === MessageType.INPUT || type === MessageType.STATE_UPDATE) {
      this.ws.send(NetworkSerializer.serializeMessage(message));
    } else {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  sendInput(input: Omit<NetworkInput, 'timestamp' | 'sequence' | 'playerId'>): void {
    const fullInput: NetworkInput = {
      ...input,
      timestamp: Date.now(),
      sequence: this.inputSequence++,
      playerId: this.playerId,
    };
    
    // Apply prediction locally
    if (this.config.predictionEnabled && this.prediction && this.localState) {
      this.localState = this.prediction.predict(this.localState, fullInput);
      this.prediction.addInput(fullInput);
    }
    
    // Send to server
    this.send(MessageType.INPUT, fullInput);
  }
  
  on(type: MessageType, handler: NetworkEventHandler): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, []);
    }
    this.eventHandlers.get(type)!.push(handler);
  }
  
  off(type: MessageType, handler: NetworkEventHandler): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  // Lobby functions
  async joinLobby(lobbyId: string): Promise<Lobby> {
    return new Promise((resolve, reject) => {
      this.send(MessageType.JOIN_LOBBY, { lobbyId, playerId: this.playerId });
      
      const timeout = setTimeout(() => {
        reject(new Error('Join lobby timeout'));
      }, 5000);
      
      this.on(MessageType.LOBBY_UPDATE, (data: unknown) => {
        clearTimeout(timeout);
        resolve(data as Lobby);
      });
    });
  }
  
  leaveLobby(): void {
    this.send(MessageType.LEAVE_LOBBY, { playerId: this.playerId });
  }
  
  sendChat(message: string): void {
    this.send(MessageType.CHAT, { playerId: this.playerId, message, timestamp: Date.now() });
  }
  
  // Game functions
  startGame(): void {
    this.send(MessageType.GAME_START, { playerId: this.playerId });
  }
  
  rpc(method: string, args: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const rpcId = `${this.playerId}_${Date.now()}`;
      
      this.send(MessageType.RPC, { rpcId, method, args });
      
      const timeout = setTimeout(() => {
        reject(new Error('RPC timeout'));
      }, 5000);
      
      const handler = (data: unknown) => {
        const response = data as { rpcId: string; result?: unknown; error?: string };
        if (response.rpcId === rpcId) {
          clearTimeout(timeout);
          this.off(MessageType.RPC_RESPONSE, handler);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.result);
          }
        }
      };
      
      this.on(MessageType.RPC_RESPONSE, handler);
    });
  }
  
  // State
  getInterpolatedState(playerId: string): PlayerState | null {
    if (playerId === this.playerId) {
      return this.localState;
    }
    
    const interpolator = this.interpolators.get(playerId);
    if (!interpolator) return null;
    
    return interpolator.getInterpolatedState(Date.now());
  }
  
  getPlayers(): NetworkPlayer[] {
    return Array.from(this.players.values());
  }
  
  getLocalPlayerId(): string {
    return this.playerId;
  }
  
  getPing(): number {
    return this.ping;
  }
  
  setPrediction(simulateFunc: (state: PlayerState, input: NetworkInput) => PlayerState): void {
    this.prediction = new ClientPrediction(simulateFunc);
  }
  
  setLocalState(state: PlayerState): void {
    this.localState = state;
  }
}

// WEBRTC PEER CONNECTION (P2P and Voice)

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  dataChannelConfig?: RTCDataChannelInit;
}

export class WebRTCConnection {
  private connection: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private remoteId: string;
  private onMessageCallback: ((data: ArrayBuffer | string) => void) | null = null;
  private onConnectedCallback: (() => void) | null = null;
  private onDisconnectedCallback: (() => void) | null = null;
  
  constructor(remoteId: string, config: WebRTCConfig, isInitiator: boolean = false) {
    this.remoteId = remoteId;
    
    this.connection = new RTCPeerConnection({
      iceServers: config.iceServers,
    });
    
    this.connection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send candidate to signaling server
        this.onIceCandidate(event.candidate);
      }
    };
    
    this.connection.onconnectionstatechange = () => {
      if (this.connection.connectionState === 'connected') {
        this.onConnectedCallback?.();
      } else if (this.connection.connectionState === 'disconnected') {
        this.onDisconnectedCallback?.();
      }
    };
    
    if (isInitiator) {
      // Create data channel
      this.dataChannel = this.connection.createDataChannel('data', config.dataChannelConfig);
      this.setupDataChannel(this.dataChannel);
    } else {
      this.connection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }
  }
  
  private setupDataChannel(channel: RTCDataChannel): void {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      console.log('Data channel opened');
    };
    
    channel.onmessage = (event) => {
      this.onMessageCallback?.(event.data);
    };
    
    channel.onclose = () => {
      console.log('Data channel closed');
    };
  }
  
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);
    return offer;
  }
  
  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.connection.setRemoteDescription(offer);
    const answer = await this.connection.createAnswer();
    await this.connection.setLocalDescription(answer);
    return answer;
  }
  
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    await this.connection.setRemoteDescription(description);
  }
  
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this.connection.addIceCandidate(candidate);
  }
  
  protected onIceCandidate(_candidate: RTCIceCandidate): void {
    // Override this to send candidate via signaling server
  }
  
  send(data: ArrayBuffer | string): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(data as any);
    }
  }
  
  onMessage(callback: (data: ArrayBuffer | string) => void): void {
    this.onMessageCallback = callback;
  }
  
  onConnected(callback: () => void): void {
    this.onConnectedCallback = callback;
  }
  
  onDisconnected(callback: () => void): void {
    this.onDisconnectedCallback = callback;
  }
  
  getRemoteId(): string {
    return this.remoteId;
  }
  
  close(): void {
    this.dataChannel?.close();
    this.connection.close();
  }
  
  // Voice chat
  async addVoiceTrack(stream: MediaStream): Promise<void> {
    for (const track of stream.getAudioTracks()) {
      this.connection.addTrack(track, stream);
    }
  }
  
  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.connection.ontrack = (event) => {
      callback(event.streams[0]);
    };
  }
}

// MATCHMAKING

export interface MatchmakingConfig {
  gameMode: string;
  skillRating?: number;
  region?: string;
  maxWaitTime?: number;
}

export interface MatchResult {
  matchId: string;
  players: NetworkPlayer[];
  serverUrl: string;
  gameMode: string;
}

export class Matchmaker {
  private client: NetworkClient;
  private searching: boolean = false;
  private searchStartTime: number = 0;
  
  constructor(client: NetworkClient) {
    this.client = client;
  }
  
  async findMatch(config: MatchmakingConfig): Promise<MatchResult> {
    return new Promise((resolve, reject) => {
      this.searching = true;
      this.searchStartTime = Date.now();
      
      const maxWaitTime = config.maxWaitTime || 60000;
      
      const timeout = setTimeout(() => {
        this.searching = false;
        reject(new Error('Matchmaking timeout'));
      }, maxWaitTime);
      
      // Send matchmaking request
      this.client.send(MessageType.RPC, {
        method: 'matchmaking.search',
        args: [config],
      });
      
      // Listen for match found
      this.client.on(MessageType.RPC_RESPONSE, (data: unknown) => {
        const response = data as { method?: string; result?: MatchResult };
        if (response.method === 'matchmaking.found') {
          clearTimeout(timeout);
          this.searching = false;
          resolve(response.result!);
        }
      });
    });
  }
  
  cancelSearch(): void {
    if (this.searching) {
      this.client.send(MessageType.RPC, {
        method: 'matchmaking.cancel',
        args: [],
      });
      this.searching = false;
    }
  }
  
  isSearching(): boolean {
    return this.searching;
  }
  
  getSearchTime(): number {
    return this.searching ? Date.now() - this.searchStartTime : 0;
  }
}

// NETWORK MANAGER (HIGH-LEVEL API)

export class NetworkManager {
  private client: NetworkClient | null = null;
  private webrtcConnections: Map<string, WebRTCConnection> = new Map();
  private matchmaker: Matchmaker | null = null;
  private rollback: RollbackNetcode | null = null;
  
  async connect(config: NetworkConfig): Promise<string> {
    this.client = new NetworkClient(config);
    const playerId = await this.client.connect();
    
    this.matchmaker = new Matchmaker(this.client);
    
    return playerId;
  }
  
  disconnect(): void {
    // Close all WebRTC connections
    for (const connection of this.webrtcConnections.values()) {
      connection.close();
    }
    this.webrtcConnections.clear();
    
    // Disconnect from server
    this.client?.disconnect();
    this.client = null;
    this.matchmaker = null;
    this.rollback = null;
  }
  
  getClient(): NetworkClient | null {
    return this.client;
  }
  
  getMatchmaker(): Matchmaker | null {
    return this.matchmaker;
  }
  
  // WebRTC P2P
  async createP2PConnection(remoteId: string, config: WebRTCConfig): Promise<WebRTCConnection> {
    const connection = new WebRTCConnection(remoteId, config, true);
    this.webrtcConnections.set(remoteId, connection);
    
    const offer = await connection.createOffer();
    
    // Send offer via signaling server
    this.client?.send(MessageType.RPC, {
      method: 'webrtc.offer',
      args: [remoteId, offer],
    });
    
    return connection;
  }
  
  async handleOffer(remoteId: string, offer: RTCSessionDescriptionInit, config: WebRTCConfig): Promise<void> {
    const connection = new WebRTCConnection(remoteId, config, false);
    this.webrtcConnections.set(remoteId, connection);
    
    const answer = await connection.createAnswer(offer);
    
    // Send answer via signaling server
    this.client?.send(MessageType.RPC, {
      method: 'webrtc.answer',
      args: [remoteId, answer],
    });
  }
  
  async handleAnswer(remoteId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const connection = this.webrtcConnections.get(remoteId);
    if (connection) {
      await connection.setRemoteDescription(answer);
    }
  }
  
  async handleIceCandidate(remoteId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const connection = this.webrtcConnections.get(remoteId);
    if (connection) {
      await connection.addIceCandidate(candidate);
    }
  }
  
  getP2PConnection(remoteId: string): WebRTCConnection | undefined {
    return this.webrtcConnections.get(remoteId);
  }
  
  // Rollback netcode
  enableRollback(
    maxFrames: number,
    simulateFunc: (states: Map<string, PlayerState>, inputs: Map<string, NetworkInput>) => Map<string, PlayerState>
  ): void {
    this.rollback = new RollbackNetcode(maxFrames, simulateFunc);
  }
  
  getRollback(): RollbackNetcode | null {
    return this.rollback;
  }
}

// EXPORTS

export const networkManager = new NetworkManager();

export function createNetworkConfig(serverUrl: string, options: Partial<NetworkConfig> = {}): NetworkConfig {
  return {
    serverUrl,
    maxPlayers: 16,
    tickRate: 60,
    interpolationDelay: 100,
    predictionEnabled: true,
    rollbackFrames: 7,
    ...options,
  };
}

export function createWebRTCConfig(stunServers: string[] = []): WebRTCConfig {
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      ...stunServers.map(url => ({ urls: url })),
    ],
    dataChannelConfig: {
      ordered: false,
      maxRetransmits: 0,
    },
  };
}
