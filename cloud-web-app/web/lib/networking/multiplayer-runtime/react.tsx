/**
 * Networking & Multiplayer System - split runtime modules.
 *
 * Keep this package Studio/runtime-only. Public surfaces should lazy-load it
 * through explicit boundaries rather than importing the multiplayer barrel.
 */

import { useState, useCallback, useRef, useEffect, useContext, createContext, type ReactNode } from 'react';
import { NetworkManager } from './network-manager';
import type { ConnectionState, LobbyInfo, NetworkConfig, Player, SyncMode } from './types';

const NetworkContext = createContext<NetworkManager | null>(null);

export function NetworkProvider({ 
  children, 
  config 
}: { 
  children: ReactNode;
  config?: Partial<NetworkConfig>;
}) {
  const managerRef = useRef<NetworkManager>(new NetworkManager(config));
  
  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);
  
  return (
    <NetworkContext.Provider value={managerRef.current}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const manager = useContext(NetworkContext);
  if (!manager) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [players, setPlayers] = useState<Player[]>([]);
  const [ping, setPing] = useState(0);
  
  useEffect(() => {
    const updatePlayers = () => setPlayers(manager.getAllPlayers());
    const updateConnection = () => setConnectionState(manager.getConnectionState());
    
    manager.on('connected', updateConnection);
    manager.on('disconnected', updateConnection);
    manager.on('playerJoined', updatePlayers);
    manager.on('playerLeft', updatePlayers);
    manager.on('playerUpdated', updatePlayers);
    manager.on('welcome', updatePlayers);
    
    const pingInterval = setInterval(() => {
      setPing(manager.getPing());
    }, 1000);
    
    return () => {
      manager.off('connected', updateConnection);
      manager.off('disconnected', updateConnection);
      manager.off('playerJoined', updatePlayers);
      manager.off('playerLeft', updatePlayers);
      manager.off('playerUpdated', updatePlayers);
      manager.off('welcome', updatePlayers);
      clearInterval(pingInterval);
    };
  }, [manager]);
  
  const connect = useCallback(async (url?: string) => {
    await manager.connect(url);
  }, [manager]);
  
  const disconnect = useCallback(() => {
    manager.disconnect();
  }, [manager]);
  
  return {
    manager,
    connectionState,
    players,
    ping,
    connect,
    disconnect,
    isConnected: connectionState === 'connected',
    isHost: manager.isHost(),
    localPlayer: manager.getLocalPlayer(),
    rpc: manager.rpc.bind(manager),
    registerRPC: manager.registerRPC.bind(manager),
    spawnEntity: manager.spawnEntity.bind(manager),
    despawnEntity: manager.despawnEntity.bind(manager),
    lobbyManager: manager.getLobbyManager(),
  };
}

export function useSyncedVariable<T>(name: string, initialValue: T, mode: SyncMode = 'reliable'): [T, (value: T) => void] {
  const { manager } = useNetwork();
  const [value, setValue] = useState<T>(initialValue);
  
  useEffect(() => {
    manager.syncVariable(name, initialValue, mode);
  }, [manager, name, initialValue, mode]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const syncedValue = manager.getSyncedVariable<T>(name);
      if (syncedValue !== undefined) {
        setValue(syncedValue);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [manager, name]);
  
  const setSyncedValue = useCallback((newValue: T) => {
    setValue(newValue);
    manager.setSyncedVariable(name, newValue);
  }, [manager, name]);
  
  return [value, setSyncedValue];
}
