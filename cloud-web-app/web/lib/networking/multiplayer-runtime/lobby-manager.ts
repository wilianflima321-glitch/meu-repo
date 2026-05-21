/**
 * Networking & Multiplayer System - split runtime modules.
 *
 * Keep this package Studio/runtime-only. Public surfaces should lazy-load it
 * through explicit boundaries rather than importing the multiplayer barrel.
 */

import { EventEmitter } from 'events';
import type { LobbyInfo, NetworkTransport } from './types';

export class LobbyManager extends EventEmitter {
  private transport: NetworkTransport;
  private currentLobby: LobbyInfo | null = null;
  private lobbies: Map<string, LobbyInfo> = new Map();
  
  constructor(transport: NetworkTransport) {
    super();
    this.transport = transport;
    this.setupMessageHandlers();
  }
  
  private setupMessageHandlers(): void {
    this.transport.onMessage((message) => {
      switch (message.type) {
        case 'lobby_list':
          this.handleLobbyList(message.data as LobbyInfo[]);
          break;
        case 'lobby_joined':
          this.handleLobbyJoined(message.data as LobbyInfo);
          break;
        case 'lobby_left':
          this.handleLobbyLeft();
          break;
        case 'lobby_updated':
          this.handleLobbyUpdated(message.data as LobbyInfo);
          break;
      }
    });
  }
  
  async refreshLobbies(): Promise<LobbyInfo[]> {
    this.transport.send({
      type: 'get_lobbies',
      senderId: 'local',
      timestamp: Date.now(),
      reliable: true,
      data: null,
    });
    
    return new Promise((resolve) => {
      const handler = (lobbies: LobbyInfo[]) => {
        this.off('lobbiesUpdated', handler);
        resolve(lobbies);
      };
      this.on('lobbiesUpdated', handler);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        this.off('lobbiesUpdated', handler);
        resolve([]);
      }, 5000);
    });
  }
  
  async createLobby(name: string, maxPlayers: number, gameMode: string, isPrivate = false): Promise<LobbyInfo | null> {
    this.transport.send({
      type: 'create_lobby',
      senderId: 'local',
      timestamp: Date.now(),
      reliable: true,
      data: { name, maxPlayers, gameMode, isPrivate },
    });
    
    return new Promise((resolve) => {
      const handler = (lobby: LobbyInfo) => {
        this.off('lobbyJoined', handler);
        resolve(lobby);
      };
      this.on('lobbyJoined', handler);
      
      setTimeout(() => {
        this.off('lobbyJoined', handler);
        resolve(null);
      }, 5000);
    });
  }
  
  async joinLobby(lobbyId: string, password?: string): Promise<boolean> {
    this.transport.send({
      type: 'join_lobby',
      senderId: 'local',
      timestamp: Date.now(),
      reliable: true,
      data: { lobbyId, password },
    });
    
    return new Promise((resolve) => {
      const successHandler = () => {
        this.off('lobbyJoined', successHandler);
        this.off('lobbyJoinFailed', failHandler);
        resolve(true);
      };
      
      const failHandler = () => {
        this.off('lobbyJoined', successHandler);
        this.off('lobbyJoinFailed', failHandler);
        resolve(false);
      };
      
      this.on('lobbyJoined', successHandler);
      this.on('lobbyJoinFailed', failHandler);
      
      setTimeout(() => {
        this.off('lobbyJoined', successHandler);
        this.off('lobbyJoinFailed', failHandler);
        resolve(false);
      }, 5000);
    });
  }
  
  leaveLobby(): void {
    this.transport.send({
      type: 'leave_lobby',
      senderId: 'local',
      timestamp: Date.now(),
      reliable: true,
      data: null,
    });
  }
  
  startGame(): void {
    if (!this.currentLobby) return;
    
    this.transport.send({
      type: 'start_game',
      senderId: 'local',
      timestamp: Date.now(),
      reliable: true,
      data: { lobbyId: this.currentLobby.id },
    });
  }
  
  getCurrentLobby(): LobbyInfo | null {
    return this.currentLobby;
  }
  
  getLobbies(): LobbyInfo[] {
    return Array.from(this.lobbies.values());
  }
  
  private handleLobbyList(lobbies: LobbyInfo[]): void {
    this.lobbies.clear();
    for (const lobby of lobbies) {
      this.lobbies.set(lobby.id, lobby);
    }
    this.emit('lobbiesUpdated', lobbies);
  }
  
  private handleLobbyJoined(lobby: LobbyInfo): void {
    this.currentLobby = lobby;
    this.emit('lobbyJoined', lobby);
  }
  
  private handleLobbyLeft(): void {
    this.currentLobby = null;
    this.emit('lobbyLeft');
  }
  
  private handleLobbyUpdated(lobby: LobbyInfo): void {
    if (this.currentLobby?.id === lobby.id) {
      this.currentLobby = lobby;
    }
    this.lobbies.set(lobby.id, lobby);
    this.emit('lobbyUpdated', lobby);
  }
}

// ============================================================================
// NETWORK MANAGER
// ============================================================================
