'use client';

/**
 * AETHEL ENGINE - useMultiplayerNetworking Hook
 * =============================================
 * 
 * React hook for the multiplayer networking system.
 * Integrates with WebTransport for low-latency game networking.
 * 
 * Features:
 * - Lobby management
 * - Player state synchronization
 * - Input handling with prediction
 * - Ping/RTT monitoring
 * - Chat integration
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  NetworkConfig,
  NetworkPlayer,
  PlayerState,
  NetworkInput,
  Lobby,
  MessageType,
} from '../networking-multiplayer';
import { useTransport } from '../transport';

// ============================================================================
// TYPES
// ============================================================================

export interface UseMultiplayerOptions {
  /** Server URL (WebTransport or WebSocket) */
  serverUrl: string;
  /** Player name */
  playerName: string;
  /** Max players per lobby */
  maxPlayers?: number;
  /** Server tick rate */
  tickRate?: number;
  /** Enable client-side prediction */
  enablePrediction?: boolean;
  /** Rollback frames for fighting games */
  rollbackFrames?: number;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Debug mode */
  debug?: boolean;
}

export interface UseMultiplayerResult {
  // Connection
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  ping: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Lobby
  currentLobby: Lobby | null;
  availableLobbies: Lobby[];
  createLobby: (name: string, gameMode: string, isPrivate?: boolean) => Promise<Lobby>;
  joinLobby: (lobbyId: string, password?: string) => Promise<void>;
  leaveLobby: () => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  
  // Players
  players: NetworkPlayer[];
  localPlayer: NetworkPlayer | null;
  isHost: boolean;
  
  // Game State
  gameState: 'lobby' | 'playing' | 'ended';
  sendInput: (input: Partial<NetworkInput>) => void;
  sendAction: (action: string, data?: unknown) => void;
  
  // Chat
  chatMessages: ChatMessage[];
  sendChatMessage: (message: string) => void;
  
  // RPC
  callRpc: <T = unknown>(method: string, args: unknown[]) => Promise<T>;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useMultiplayerNetworking(options: UseMultiplayerOptions): UseMultiplayerResult {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [availableLobbies, setAvailableLobbies] = useState<Lobby[]>([]);
  const [players, setPlayers] = useState<NetworkPlayer[]>([]);
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'ended'>('lobby');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const localPlayerIdRef = useRef<string | null>(null);
  const inputSequenceRef = useRef(0);
  const rpcCallbacksRef = useRef<Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>>(new Map());
  
  // Transport hook
  const {
    transport,
    state: transportState,
    rtt: ping,
    connect: transportConnect,
    disconnect: transportDisconnect,
    send,
    sendDatagram,
  } = useTransport({
    url: options.serverUrl,
    autoConnect: false,
    debug: options.debug,
    useDatagrams: true,
    onConnect: () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      
      // Send player info
      send(MessageType.CONNECT, {
        name: options.playerName,
        version: '1.0.0',
      });
    },
    onDisconnect: ({ reason }) => {
      setIsConnected(false);
      setIsConnecting(false);
      setCurrentLobby(null);
      setPlayers([]);
      if (reason) {
        setConnectionError(reason);
      }
    },
    onMessage: {
      [MessageType.LOBBY_UPDATE]: (payload: unknown) => {
        const lobby = payload as Lobby;
        setCurrentLobby(lobby);
        setPlayers(lobby.players);
      },
      [MessageType.GAME_START]: () => {
        setGameState('playing');
      },
      [MessageType.GAME_END]: () => {
        setGameState('ended');
      },
      [MessageType.STATE_UPDATE]: (payload: unknown) => {
        const data = payload as { players: NetworkPlayer[] };
        setPlayers(data.players);
      },
      [MessageType.CHAT]: (payload: unknown) => {
        const message = payload as ChatMessage;
        setChatMessages(prev => [...prev, message]);
      },
      [MessageType.RPC_RESPONSE]: (payload: unknown) => {
        const rpcPayload = payload as { id: string; result?: unknown; error?: string };
        const callback = rpcCallbacksRef.current.get(rpcPayload.id);
        if (callback) {
          if (rpcPayload.error) {
            callback.reject(new Error(rpcPayload.error));
          } else {
            callback.resolve(rpcPayload.result);
          }
          rpcCallbacksRef.current.delete(rpcPayload.id);
        }
      },
      // Store local player ID
      'player:id': (payload: unknown) => {
        const data = payload as { playerId: string };
        localPlayerIdRef.current = data.playerId;
      },
      // Lobby list
      'lobbies:list': (payload: unknown) => {
        const lobbies = payload as Lobby[];
        setAvailableLobbies(lobbies);
      },
    },
  });
  
  // Auto-connect
  useEffect(() => {
    if (options.autoConnect) {
      connect();
    }
    
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // ============================================================================
  // CONNECTION
  // ============================================================================
  
  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      await transportConnect();
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, transportConnect]);
  
  const disconnect = useCallback(() => {
    transportDisconnect();
    setCurrentLobby(null);
    setPlayers([]);
    setGameState('lobby');
  }, [transportDisconnect]);
  
  // ============================================================================
  // LOBBY
  // ============================================================================
  
  const createLobby = useCallback(async (
    name: string,
    gameMode: string,
    isPrivate = false
  ): Promise<Lobby> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Lobby creation timeout'));
      }, 5000);
      
      // Temporary listener for lobby creation response
      const handler = (lobby: Lobby) => {
        clearTimeout(timeout);
        resolve(lobby);
      };
      
      transport?.once('message:lobby:created', handler);
      
      send('lobby:create', {
        name,
        gameMode,
        isPrivate,
        maxPlayers: options.maxPlayers || 4,
      });
    });
  }, [send, transport, options.maxPlayers]);
  
  const joinLobby = useCallback(async (lobbyId: string, password?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join timeout'));
      }, 5000);
      
      const successHandler = () => {
        clearTimeout(timeout);
        resolve();
      };
      
      const errorHandler = (error: { message: string }) => {
        clearTimeout(timeout);
        reject(new Error(error.message));
      };
      
      transport?.once('message:lobby:joined', successHandler);
      transport?.once('message:lobby:error', errorHandler);
      
      send(MessageType.JOIN_LOBBY, { lobbyId, password });
    });
  }, [send, transport]);
  
  const leaveLobby = useCallback(() => {
    send(MessageType.LEAVE_LOBBY, {});
    setCurrentLobby(null);
    setPlayers([]);
    setGameState('lobby');
  }, [send]);
  
  const setReady = useCallback((ready: boolean) => {
    send('player:ready', { ready });
  }, [send]);
  
  const startGame = useCallback(() => {
    send(MessageType.GAME_START, {});
  }, [send]);
  
  // ============================================================================
  // GAME
  // ============================================================================
  
  const sendInput = useCallback((input: Partial<NetworkInput>) => {
    const fullInput: NetworkInput = {
      timestamp: Date.now(),
      sequence: inputSequenceRef.current++,
      playerId: localPlayerIdRef.current || '',
      keys: input.keys || new Set(),
      mouseX: input.mouseX || 0,
      mouseY: input.mouseY || 0,
      mouseButtons: input.mouseButtons || 0,
      actions: input.actions || [],
    };
    
    // Use unreliable datagrams for input (low latency)
    sendDatagram(MessageType.INPUT, fullInput);
  }, [sendDatagram]);
  
  const sendAction = useCallback((action: string, data?: unknown) => {
    send(MessageType.ACTION, { action, data });
  }, [send]);
  
  // ============================================================================
  // CHAT
  // ============================================================================
  
  const sendChatMessage = useCallback((message: string) => {
    send(MessageType.CHAT, {
      message,
      timestamp: Date.now(),
    });
  }, [send]);
  
  // ============================================================================
  // RPC
  // ============================================================================
  
  const callRpc = useCallback(<T = unknown>(method: string, args: unknown[]): Promise<T> => {
    return new Promise((resolve, reject) => {
      const id = `rpc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      rpcCallbacksRef.current.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      
      // Timeout RPC calls
      setTimeout(() => {
        if (rpcCallbacksRef.current.has(id)) {
          rpcCallbacksRef.current.delete(id);
          reject(new Error('RPC timeout'));
        }
      }, 10000);
      
      send(MessageType.RPC, { id, method, args });
    });
  }, [send]);
  
  // ============================================================================
  // COMPUTED
  // ============================================================================
  
  const localPlayer = useMemo(() => {
    return players.find(p => p.id === localPlayerIdRef.current) || null;
  }, [players]);
  
  const isHost = useMemo(() => {
    return localPlayer?.isHost || false;
  }, [localPlayer]);
  
  return {
    // Connection
    isConnected,
    isConnecting,
    connectionError,
    ping,
    connect,
    disconnect,
    
    // Lobby
    currentLobby,
    availableLobbies,
    createLobby,
    joinLobby,
    leaveLobby,
    setReady,
    startGame,
    
    // Players
    players,
    localPlayer,
    isHost,
    
    // Game State
    gameState,
    sendInput,
    sendAction,
    
    // Chat
    chatMessages,
    sendChatMessage,
    
    // RPC
    callRpc,
  };
}

export default useMultiplayerNetworking;
