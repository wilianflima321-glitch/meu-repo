/**
 * Networking & Multiplayer System - split runtime modules.
 *
 * Keep this package Studio/runtime-only. Public surfaces should lazy-load it
 * through explicit boundaries rather than importing the multiplayer barrel.
 */

import { InputPredictor } from './input-predictor';
import { LobbyManager } from './lobby-manager';
import { NetworkManager } from './network-manager';
import { useNetwork, useSyncedVariable, NetworkProvider } from './react';
import { StateSynchronizer } from './state-synchronizer';
import { WebSocketTransport } from './websocket-transport';

const __defaultExport = {
  NetworkManager,
  NetworkProvider,
  useNetwork,
  useSyncedVariable,
  WebSocketTransport,
  StateSynchronizer,
  InputPredictor,
  LobbyManager,
};

export default __defaultExport;
