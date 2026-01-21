/**
 * useSystemHealth Hook
 * 
 * Hook React para monitorar saúde do sistema em tempo real
 * via WebSocket. Exibe métricas de CPU, memória, GPU, rede, etc.
 * 
 * @module hooks/useSystemHealth
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AethelWebSocketClient } from '../websocket/websocket-client';

// ============================================================================
// Types
// ============================================================================

export interface CPUMetrics {
  usage: number;
  cores: number;
  temperature: number | null;
  frequency: number | null;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  available: number;
}

export interface GPUMetrics {
  name: string;
  usage: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number | null;
  fanSpeed: number | null;
}

export interface DiskMetrics {
  name: string;
  used: number;
  total: number;
  percentage: number;
  readSpeed: number;
  writeSpeed: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  latency: number;
  connections: number;
}

export interface ProcessMetrics {
  pid: number;
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  status: 'running' | 'sleeping' | 'stopped' | 'zombie';
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latency: number | null;
  lastCheck: Date;
  message: string | null;
}

export interface SystemHealthData {
  timestamp: Date;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  gpu: GPUMetrics | null;
  disks: DiskMetrics[];
  network: NetworkMetrics;
  processes: ProcessMetrics[];
  services: ServiceHealth[];
  uptime: number;
  loadAverage: [number, number, number];
}

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface UseSystemHealthOptions {
  wsUrl?: string;
  autoConnect?: boolean;
  refreshInterval?: number;
  enableProcesses?: boolean;
  enableServices?: boolean;
}

export interface UseSystemHealthReturn {
  health: SystemHealthData | null;
  status: HealthStatus;
  isConnected: boolean;
  error: string | null;
  history: SystemHealthData[];
  refresh: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_HEALTH_DATA: SystemHealthData = {
  timestamp: new Date(),
  cpu: { usage: 0, cores: 4, temperature: null, frequency: null },
  memory: { used: 0, total: 16 * 1024 * 1024 * 1024, percentage: 0, available: 0 },
  gpu: null,
  disks: [],
  network: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0, latency: 0, connections: 0 },
  processes: [],
  services: [],
  uptime: 0,
  loadAverage: [0, 0, 0],
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSystemHealth(options: UseSystemHealthOptions = {}): UseSystemHealthReturn {
  const {
    wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.aethel.io/ws',
    autoConnect = true,
    refreshInterval = 5000,
    enableProcesses = false,
    enableServices = true,
  } = options;

  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [status, setStatus] = useState<HealthStatus>('unknown');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SystemHealthData[]>([]);

  const wsRef = useRef<AethelWebSocketClient | null>(null);
  const historyMaxLength = 60; // 5 minutos de histórico a cada 5s

  // Calcula status geral baseado nas métricas
  const calculateStatus = useCallback((data: SystemHealthData): HealthStatus => {
    // CPU crítico > 90%, warning > 70%
    if (data.cpu.usage > 90) return 'critical';
    if (data.cpu.usage > 70) return 'warning';
    
    // Memória crítico > 95%, warning > 85%
    if (data.memory.percentage > 95) return 'critical';
    if (data.memory.percentage > 85) return 'warning';
    
    // GPU crítico > 95%, warning > 80%
    if (data.gpu && data.gpu.usage > 95) return 'critical';
    if (data.gpu && data.gpu.usage > 80) return 'warning';
    
    // Disco crítico > 95%, warning > 85%
    const criticalDisk = data.disks.find(d => d.percentage > 95);
    if (criticalDisk) return 'critical';
    const warningDisk = data.disks.find(d => d.percentage > 85);
    if (warningDisk) return 'warning';
    
    // Serviços
    const unhealthyService = data.services.find(s => s.status === 'unhealthy');
    if (unhealthyService) return 'critical';
    const degradedService = data.services.find(s => s.status === 'degraded');
    if (degradedService) return 'warning';
    
    return 'healthy';
  }, []);

  // Inicializa conexão WebSocket
  useEffect(() => {
    if (!autoConnect) return;

    const ws = new AethelWebSocketClient({
      url: wsUrl,
      autoReconnect: true,
      debug: process.env.NODE_ENV === 'development',
    });

    wsRef.current = ws;

    ws.on('connected', () => {
      setIsConnected(true);
      setError(null);
      
      // Subscribe ao canal de health
      ws.send({
        type: 'SUBSCRIBE',
        channel: 'system:health',
        payload: {
          interval: refreshInterval,
          includeProcesses: enableProcesses,
          includeServices: enableServices,
        },
      });
    });

    ws.on('disconnected', () => {
      setIsConnected(false);
    });

    ws.on('error', (err) => {
      setError(err.message || 'Erro de conexão WebSocket');
    });

    // Handler de mensagens
    ws.on('message', (msg: any) => {
      if (msg.type === 'system:health' || msg.channel === 'system:health') {
        const data = parseHealthData(msg.payload);
        setHealth(data);
        setStatus(calculateStatus(data));
        
        // Adiciona ao histórico
        setHistory(prev => {
          const updated = [...prev, data];
          if (updated.length > historyMaxLength) {
            return updated.slice(-historyMaxLength);
          }
          return updated;
        });
      }
    });

    ws.connect().catch((err) => {
      setError('Não foi possível conectar ao servidor de monitoramento');
      console.error('WebSocket connection failed:', err);
    });

    return () => {
      ws.disconnect();
    };
  }, [wsUrl, autoConnect, refreshInterval, enableProcesses, enableServices, calculateStatus]);

  // Parse dos dados de health
  const parseHealthData = (payload: any): SystemHealthData => {
    return {
      timestamp: new Date(payload.timestamp || Date.now()),
      cpu: {
        usage: payload.cpu?.usage ?? 0,
        cores: payload.cpu?.cores ?? 4,
        temperature: payload.cpu?.temperature ?? null,
        frequency: payload.cpu?.frequency ?? null,
      },
      memory: {
        used: payload.memory?.used ?? 0,
        total: payload.memory?.total ?? 16 * 1024 * 1024 * 1024,
        percentage: payload.memory?.percentage ?? 0,
        available: payload.memory?.available ?? 0,
      },
      gpu: payload.gpu ? {
        name: payload.gpu.name ?? 'Unknown GPU',
        usage: payload.gpu.usage ?? 0,
        memoryUsed: payload.gpu.memoryUsed ?? 0,
        memoryTotal: payload.gpu.memoryTotal ?? 0,
        temperature: payload.gpu.temperature ?? null,
        fanSpeed: payload.gpu.fanSpeed ?? null,
      } : null,
      disks: (payload.disks ?? []).map((d: any) => ({
        name: d.name ?? 'Disk',
        used: d.used ?? 0,
        total: d.total ?? 0,
        percentage: d.percentage ?? 0,
        readSpeed: d.readSpeed ?? 0,
        writeSpeed: d.writeSpeed ?? 0,
      })),
      network: {
        bytesIn: payload.network?.bytesIn ?? 0,
        bytesOut: payload.network?.bytesOut ?? 0,
        packetsIn: payload.network?.packetsIn ?? 0,
        packetsOut: payload.network?.packetsOut ?? 0,
        latency: payload.network?.latency ?? 0,
        connections: payload.network?.connections ?? 0,
      },
      processes: (payload.processes ?? []).map((p: any) => ({
        pid: p.pid ?? 0,
        name: p.name ?? 'Unknown',
        cpuUsage: p.cpuUsage ?? 0,
        memoryUsage: p.memoryUsage ?? 0,
        status: p.status ?? 'unknown',
      })),
      services: (payload.services ?? []).map((s: any) => ({
        name: s.name ?? 'Unknown',
        status: s.status ?? 'unknown',
        latency: s.latency ?? null,
        lastCheck: new Date(s.lastCheck || Date.now()),
        message: s.message ?? null,
      })),
      uptime: payload.uptime ?? 0,
      loadAverage: payload.loadAverage ?? [0, 0, 0],
    };
  };

  // Força refresh manual
  const refresh = useCallback(() => {
    if (wsRef.current && isConnected) {
      wsRef.current.send({
        type: 'REQUEST',
        channel: 'system:health',
        payload: { immediate: true },
      });
    } else {
      // Fallback para API HTTP
      fetch('/api/system/health')
        .then(res => res.json())
        .then(data => {
          const parsed = parseHealthData(data);
          setHealth(parsed);
          setStatus(calculateStatus(parsed));
        })
        .catch(err => {
          console.error('Health check failed:', err);
          setError('Falha ao obter status do sistema');
        });
    }
  }, [isConnected, calculateStatus]);

  return {
    health,
    status,
    isConnected,
    error,
    history,
    refresh,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(' ') || '< 1m';
}

export function getStatusColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy': return '#10b981'; // green-500
    case 'warning': return '#f59e0b'; // amber-500
    case 'critical': return '#ef4444'; // red-500
    default: return '#6b7280'; // gray-500
  }
}

export default useSystemHealth;
