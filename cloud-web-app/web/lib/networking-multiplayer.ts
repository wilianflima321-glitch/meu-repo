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
import {
  WebRTCConnection,
  type WebRTCConfig,
  createWebRTCConfig,
} from './networking-multiplayer-webrtc';
import {
  ClientPrediction,
  InputBuffer,
  NetworkSerializer,
  RollbackNetcode,
  StateInterpolator,
} from './networking-multiplayer-core';

export { MessageType };
export { createWebRTCConfig, WebRTCConnection };
export type {
  Lobby,
  NetworkConfig,
  NetworkInput,
  NetworkMessage,
  NetworkPlayer,
  PlayerState,
} from './networking-multiplayer-types';
export type { WebRTCConfig };

export {
  ClientPrediction,
  InputBuffer,
  NetworkSerializer,
  RollbackNetcode,
  StateInterpolator,
};

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

