/**
 * CineLink - Virtual Camera System
 * 
 * Transforma um smartphone em uma câmera virtual rastreada.
 * Usa giroscópio do celular para controlar a câmera 3D em tempo real.
 * 
 * Arquitetura:
 * - Desktop: Exibe QR Code, recebe dados via WebSocket
 * - Mobile: Envia orientação do dispositivo via WebSocket
 * 
 * @module CineLink
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Camera, 
  Smartphone, 
  QrCode, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Copy,
  Check,
  Video,
  VideoOff,
  Settings,
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  Move3d
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface DeviceOrientation {
  alpha: number | null;  // Z-axis rotation [0, 360)
  beta: number | null;   // X-axis rotation [-180, 180)
  gamma: number | null;  // Y-axis rotation [-90, 90)
}

interface CineLinkState {
  isConnected: boolean;
  isStreaming: boolean;
  deviceId: string | null;
  lastOrientation: DeviceOrientation;
  latency: number;
  batteryLevel: number | null;
}

interface CineLinkSettings {
  smoothing: number;        // 0-1, quanto suavizar os movimentos
  sensitivity: number;      // Multiplicador de sensibilidade
  invertX: boolean;
  invertY: boolean;
  deadzone: number;         // Zona morta para ignorar micro-movimentos
  updateRate: number;       // Hz - taxa de atualização
}

interface CineLinkMessage {
  type: 'CAM_MOVE' | 'CAM_CONNECT' | 'CAM_DISCONNECT' | 'CAM_BATTERY' | 'CAM_PING';
  deviceId?: string;
  rotation?: DeviceOrientation;
  battery?: number;
  timestamp?: number;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_SETTINGS: CineLinkSettings = {
  smoothing: 0.7,
  sensitivity: 1.0,
  invertX: false,
  invertY: false,
  deadzone: 0.5,
  updateRate: 60,
};

const DEFAULT_STATE: CineLinkState = {
  isConnected: false,
  isStreaming: false,
  deviceId: null,
  lastOrientation: { alpha: 0, beta: 0, gamma: 0 },
  latency: 0,
  batteryLevel: null,
};

// ============================================================================
// QR CODE GENERATOR (Simple SVG-based)
// ============================================================================

function generateQRCode(data: string, size: number = 200): string {
  // Placeholder: Em produção, usar biblioteca como 'qrcode' ou 'qrcode.react'
  // Por ora, criamos um SVG placeholder
  const encodedData = encodeURIComponent(data);
  
  // Simular um QR code com padrão visual (em produção usar qrcode-generator)
  const modules = 25; // 25x25 grid
  const moduleSize = size / modules;
  
  // Gerar padrão pseudo-aleatório baseado nos dados
  const hash = data.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  let paths = '';
  
  // Finder patterns (cantos)
  const finderPositions = [[0, 0], [0, modules - 7], [modules - 7, 0]];
  finderPositions.forEach(([x, y]) => {
    // Outer square
    paths += `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${7 * moduleSize}" height="${7 * moduleSize}" fill="black"/>`;
    paths += `<rect x="${(x + 1) * moduleSize}" y="${(y + 1) * moduleSize}" width="${5 * moduleSize}" height="${5 * moduleSize}" fill="white"/>`;
    paths += `<rect x="${(x + 2) * moduleSize}" y="${(y + 2) * moduleSize}" width="${3 * moduleSize}" height="${3 * moduleSize}" fill="black"/>`;
  });
  
  // Data modules (simulated)
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      // Skip finder pattern areas
      if ((row < 8 && col < 8) || (row < 8 && col >= modules - 8) || (row >= modules - 8 && col < 8)) continue;
      
      // Generate pseudo-random pattern
      const shouldFill = ((hash + row * col + row + col) % 3) === 0;
      if (shouldFill) {
        paths += `<rect x="${col * moduleSize}" y="${row * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }
  
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="white"/>
    ${paths}
  </svg>`;
}

// ============================================================================
// CINELINK CLIENT COMPONENT
// ============================================================================

interface CineLinkClientProps {
  serverUrl?: string;
  onCameraUpdate?: (orientation: DeviceOrientation) => void;
  onConnectionChange?: (connected: boolean) => void;
  className?: string;
}

export function CineLinkClient({
  serverUrl,
  onCameraUpdate,
  onConnectionChange,
  className = '',
}: CineLinkClientProps): JSX.Element {
  // State
  const [state, setState] = useState<CineLinkState>(DEFAULT_STATE);
  const [settings, setSettings] = useState<CineLinkSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [connectionUrl, setConnectionUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const lastPingRef = useRef<number>(0);
  const smoothedOrientationRef = useRef<DeviceOrientation>({ alpha: 0, beta: 0, gamma: 0 });
  
  // Generate connection URL
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = serverUrl || `${protocol}//${window.location.hostname}:1234`;
    const sessionId = Math.random().toString(36).substring(2, 10);
    const url = `${host}/cinelink?session=${sessionId}`;
    setConnectionUrl(url);
  }, [serverUrl]);
  
  // WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      const ws = new WebSocket(connectionUrl.replace('http', 'ws'));
      
      ws.onopen = () => {
        console.log('[CineLink] Connected');
        setState(prev => ({ ...prev, isConnected: true }));
        onConnectionChange?.(true);
        
        // Start ping interval
        lastPingRef.current = Date.now();
      };
      
      ws.onmessage = (event) => {
        try {
          const message: CineLinkMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error('[CineLink] Invalid message:', e);
        }
      };
      
      ws.onclose = () => {
        console.log('[CineLink] Disconnected');
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isStreaming: false,
          deviceId: null 
        }));
        onConnectionChange?.(false);
      };
      
      ws.onerror = (error) => {
        console.error('[CineLink] Error:', error);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('[CineLink] Connection failed:', error);
    }
  }, [connectionUrl, onConnectionChange]);
  
  // Handle incoming messages
  const handleMessage = useCallback((message: CineLinkMessage) => {
    switch (message.type) {
      case 'CAM_CONNECT':
        setState(prev => ({ 
          ...prev, 
          isStreaming: true,
          deviceId: message.deviceId || 'mobile-device'
        }));
        break;
        
      case 'CAM_DISCONNECT':
        setState(prev => ({ 
          ...prev, 
          isStreaming: false,
          deviceId: null 
        }));
        break;
        
      case 'CAM_MOVE':
        if (message.rotation) {
          // Apply smoothing
          const smoothed = smoothOrientation(
            smoothedOrientationRef.current,
            message.rotation,
            settings.smoothing
          );
          smoothedOrientationRef.current = smoothed;
          
          // Apply settings
          const processed = processOrientation(smoothed, settings);
          
          setState(prev => ({ ...prev, lastOrientation: processed }));
          onCameraUpdate?.(processed);
          
          // Calculate latency
          if (message.timestamp) {
            const latency = Date.now() - message.timestamp;
            setState(prev => ({ ...prev, latency }));
          }
        }
        break;
        
      case 'CAM_BATTERY':
        setState(prev => ({ ...prev, batteryLevel: message.battery || null }));
        break;
        
      case 'CAM_PING':
        // Respond to ping
        wsRef.current?.send(JSON.stringify({ type: 'CAM_PONG', timestamp: Date.now() }));
        break;
    }
  }, [settings, onCameraUpdate]);
  
  // Smooth orientation values
  const smoothOrientation = (
    current: DeviceOrientation,
    target: DeviceOrientation,
    factor: number
  ): DeviceOrientation => {
    const lerp = (a: number | null, b: number | null, t: number) => {
      if (a === null || b === null) return b;
      return a + (b - a) * (1 - t);
    };
    
    return {
      alpha: lerp(current.alpha, target.alpha, factor),
      beta: lerp(current.beta, target.beta, factor),
      gamma: lerp(current.gamma, target.gamma, factor),
    };
  };
  
  // Process orientation with settings
  const processOrientation = (
    orientation: DeviceOrientation,
    settings: CineLinkSettings
  ): DeviceOrientation => {
    const applyDeadzone = (value: number | null, deadzone: number) => {
      if (value === null) return null;
      return Math.abs(value) < deadzone ? 0 : value;
    };
    
    return {
      alpha: orientation.alpha !== null 
        ? orientation.alpha * settings.sensitivity 
        : null,
      beta: applyDeadzone(orientation.beta, settings.deadzone) !== null
        ? (orientation.beta || 0) * settings.sensitivity * (settings.invertY ? -1 : 1)
        : null,
      gamma: applyDeadzone(orientation.gamma, settings.deadzone) !== null
        ? (orientation.gamma || 0) * settings.sensitivity * (settings.invertX ? -1 : 1)
        : null,
    };
  };
  
  // Disconnect
  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);
  
  // Reset camera
  const resetCamera = useCallback(() => {
    smoothedOrientationRef.current = { alpha: 0, beta: 0, gamma: 0 };
    setState(prev => ({ ...prev, lastOrientation: { alpha: 0, beta: 0, gamma: 0 } }));
    onCameraUpdate?.({ alpha: 0, beta: 0, gamma: 0 });
  }, [onCameraUpdate]);
  
  // Copy URL to clipboard
  const copyUrl = async () => {
    try {
      // Create mobile-friendly URL
      const mobileUrl = connectionUrl.replace('/cinelink', '/mobile-cam');
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);
  
  // Generate QR code SVG
  const qrCodeSvg = connectionUrl 
    ? generateQRCode(connectionUrl.replace('/cinelink', '/mobile-cam'))
    : '';
  
  // Minimized view
  if (isMinimized) {
    return (
      <div className={`flex items-center gap-2 p-2 bg-gray-800 rounded-lg ${className}`}>
        <Camera className={`w-5 h-5 ${state.isConnected ? 'text-green-400' : 'text-gray-400'}`} />
        <span className="text-sm text-gray-300">CineLink</span>
        {state.isStreaming && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <Video className="w-3 h-3" />
            Live
          </span>
        )}
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1 hover:bg-gray-700 rounded"
        >
          <Maximize2 className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Camera className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-white">CineLink</span>
          {state.isStreaming && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition"
          >
            <Minimize2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-gray-800/50 border-b border-gray-700 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-white">Settings</h4>
            <button onClick={() => setShowSettings(false)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          {/* Smoothing */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Smoothing: {Math.round(settings.smoothing * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.smoothing * 100}
              onChange={(e) => setSettings(s => ({ ...s, smoothing: Number(e.target.value) / 100 }))}
              className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer"
            />
          </div>
          
          {/* Sensitivity */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Sensitivity: {settings.sensitivity.toFixed(1)}x
            </label>
            <input
              type="range"
              min="10"
              max="300"
              value={settings.sensitivity * 100}
              onChange={(e) => setSettings(s => ({ ...s, sensitivity: Number(e.target.value) / 100 }))}
              className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer"
            />
          </div>
          
          {/* Invert toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={settings.invertX}
                onChange={(e) => setSettings(s => ({ ...s, invertX: e.target.checked }))}
                className="rounded bg-gray-700 border-gray-600"
              />
              Invert X
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={settings.invertY}
                onChange={(e) => setSettings(s => ({ ...s, invertY: e.target.checked }))}
                className="rounded bg-gray-700 border-gray-600"
              />
              Invert Y
            </label>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="p-4">
        {/* QR Code Section */}
        {!state.isStreaming && (
          <div className="flex flex-col items-center">
            <div 
              className="w-48 h-48 bg-white rounded-lg p-2 mb-4"
              dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
            />
            <p className="text-sm text-gray-400 text-center mb-3">
              Scan with your phone to connect as virtual camera
            </p>
            
            {/* URL Copy */}
            <div className="flex items-center gap-2 w-full max-w-xs">
              <input
                type="text"
                value={connectionUrl.replace('/cinelink', '/mobile-cam')}
                readOnly
                className="flex-1 px-3 py-2 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 truncate"
              />
              <button
                onClick={copyUrl}
                className="p-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* Connected Device Info */}
        {state.isStreaming && (
          <div className="space-y-4">
            {/* Device Status */}
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {state.deviceId || 'Mobile Device'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Latency: {state.latency}ms
                  </p>
                </div>
              </div>
              {state.batteryLevel !== null && (
                <div className="text-xs text-gray-400">
                  🔋 {state.batteryLevel}%
                </div>
              )}
            </div>
            
            {/* Orientation Display */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-gray-800 rounded-lg text-center">
                <p className="text-xs text-gray-500 mb-1">Alpha (Z)</p>
                <p className="text-lg font-mono text-blue-400">
                  {state.lastOrientation.alpha?.toFixed(1) || '0.0'}°
                </p>
              </div>
              <div className="p-3 bg-gray-800 rounded-lg text-center">
                <p className="text-xs text-gray-500 mb-1">Beta (X)</p>
                <p className="text-lg font-mono text-green-400">
                  {state.lastOrientation.beta?.toFixed(1) || '0.0'}°
                </p>
              </div>
              <div className="p-3 bg-gray-800 rounded-lg text-center">
                <p className="text-xs text-gray-500 mb-1">Gamma (Y)</p>
                <p className="text-lg font-mono text-purple-400">
                  {state.lastOrientation.gamma?.toFixed(1) || '0.0'}°
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={resetCamera}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm">Reset</span>
              </button>
              <button
                onClick={disconnect}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition"
              >
                <VideoOff className="w-4 h-4" />
                <span className="text-sm">Disconnect</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-t border-gray-700">
        <div className="flex items-center gap-2">
          {state.isConnected ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-gray-500" />
          )}
          <span className={`text-xs ${state.isConnected ? 'text-green-400' : 'text-gray-500'}`}>
            {state.isConnected ? 'Server Connected' : 'Disconnected'}
          </span>
        </div>
        
        {!state.isConnected && (
          <button
            onClick={connect}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 rounded transition"
          >
            <RefreshCw className="w-3 h-3" />
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE PAGE COMPONENT (for phone browser)
// ============================================================================

interface CineLinkMobileProps {
  serverUrl: string;
}

export function CineLinkMobile({ serverUrl }: CineLinkMobileProps): JSX.Element {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [orientation, setOrientation] = useState<DeviceOrientation>({ alpha: 0, beta: 0, gamma: 0 });
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  
  // Request permission and start streaming
  const startStreaming = async () => {
    try {
      // Request device orientation permission (iOS 13+)
      if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (permission !== 'granted') {
          setError('Permission denied. Please allow motion sensors.');
          return;
        }
      }
      
      // Connect WebSocket
      const ws = new WebSocket(serverUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({ type: 'CAM_CONNECT', deviceId: 'mobile-' + Date.now() }));
        
        // Start listening to device orientation
        window.addEventListener('deviceorientation', handleOrientation);
        setIsStreaming(true);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        setIsStreaming(false);
        window.removeEventListener('deviceorientation', handleOrientation);
      };
      
      ws.onerror = () => {
        setError('Connection failed. Check if desktop is running.');
      };
      
      wsRef.current = ws;
    } catch (e) {
      setError('Failed to start: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };
  
  // Handle device orientation
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const newOrientation = {
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
    };
    
    setOrientation(newOrientation);
    
    // Send to desktop
    wsRef.current?.send(JSON.stringify({
      type: 'CAM_MOVE',
      rotation: newOrientation,
      timestamp: Date.now(),
    }));
  }, []);
  
  // Stop streaming
  const stopStreaming = () => {
    window.removeEventListener('deviceorientation', handleOrientation);
    wsRef.current?.send(JSON.stringify({ type: 'CAM_DISCONNECT' }));
    wsRef.current?.close();
    setIsStreaming(false);
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      wsRef.current?.close();
    };
  }, [handleOrientation]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Move3d className="w-16 h-16 mx-auto text-blue-400 mb-4" />
          <h1 className="text-2xl font-bold">Aethel CineLink</h1>
          <p className="text-gray-400">Virtual Camera Controller</p>
        </div>
        
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        
        {/* Status */}
        {!isStreaming ? (
          <button
            onClick={startStreaming}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-lg font-medium transition flex items-center justify-center gap-3"
          >
            <Video className="w-6 h-6" />
            Start Streaming
          </button>
        ) : (
          <>
            {/* Streaming indicator */}
            <div className="flex items-center justify-center gap-2 py-4 bg-green-500/20 rounded-xl">
              <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 font-medium">Streaming...</span>
            </div>
            
            {/* Orientation display */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-gray-800 rounded-xl text-center">
                <p className="text-xs text-gray-500 mb-2">Alpha</p>
                <p className="text-2xl font-mono text-blue-400">
                  {orientation.alpha?.toFixed(0) || 0}°
                </p>
              </div>
              <div className="p-4 bg-gray-800 rounded-xl text-center">
                <p className="text-xs text-gray-500 mb-2">Beta</p>
                <p className="text-2xl font-mono text-green-400">
                  {orientation.beta?.toFixed(0) || 0}°
                </p>
              </div>
              <div className="p-4 bg-gray-800 rounded-xl text-center">
                <p className="text-xs text-gray-500 mb-2">Gamma</p>
                <p className="text-2xl font-mono text-purple-400">
                  {orientation.gamma?.toFixed(0) || 0}°
                </p>
              </div>
            </div>
            
            {/* Stop button */}
            <button
              onClick={stopStreaming}
              className="w-full py-4 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl text-lg font-medium transition flex items-center justify-center gap-3"
            >
              <VideoOff className="w-6 h-6" />
              Stop Streaming
            </button>
          </>
        )}
        
        {/* Instructions */}
        <div className="text-center text-sm text-gray-500">
          <p>Point your phone at the screen and move it around.</p>
          <p>The 3D camera will follow your phone orientation.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CineLinkClient;
