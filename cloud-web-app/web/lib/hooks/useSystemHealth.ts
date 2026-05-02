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
  status: 'running' | 'sleeping' | 'stopped' | 'zombie' | 'unknown';
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

type HealthRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is HealthRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toNumber = (value: unknown, fallback = 0): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const toString = (value: unknown, fallback: string): string => {
  return typeof value === 'string' ? value : fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const toRecordArray = (value: unknown): HealthRecord[] => {
  return Array.isArray(value) ? value.filter(isRecord) : [];
};

const toLoadAverage = (value: unknown): [number, number, number] => {
  if (!Array.isArray(value)) return [0, 0, 0];
  return [toNumber(value[0]), toNumber(value[1]), toNumber(value[2])];
};

const toHealthMessage = (value: unknown): { type?: string; channel?: string; payload?: unknown } => {
  return isRecord(value)
    ? {
        type: typeof value.type === 'string' ? value.type : undefined,
        channel: typeof value.channel === 'string' ? value.channel : undefined,
        payload: value.payload,
      }
    : {};
};

const toProcessStatus = (value: unknown): ProcessMetrics['status'] => {
  return value === 'running' || value === 'sleeping' || value === 'stopped' || value === 'zombie'
    ? value
    : 'unknown';
};

const toServiceStatus = (value: unknown): ServiceHealth['status'] => {
  return value === 'healthy' || value === 'degraded' || value === 'unhealthy'
    ? value
    : 'unknown';
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
    ws.on('message', (msg: unknown) => {
      const message = toHealthMessage(msg);
      if (message.type === 'system:health' || message.channel === 'system:health') {
        const data = parseHealthData(message.payload);
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
  const parseHealthData = (payload: unknown): SystemHealthData => {
    const data = isRecord(payload) ? payload : {};
    const cpu = isRecord(data.cpu) ? data.cpu : {};
    const memory = isRecord(data.memory) ? data.memory : {};
    const gpu = isRecord(data.gpu) ? data.gpu : null;
    const network = isRecord(data.network) ? data.network : {};

    return {
      timestamp: new Date(typeof data.timestamp === 'string' || typeof data.timestamp === 'number' ? data.timestamp : Date.now()),
      cpu: {
        usage: toNumber(cpu.usage),
        cores: toNumber(cpu.cores, 4),
        temperature: toNullableNumber(cpu.temperature),
        frequency: toNullableNumber(cpu.frequency),
      },
      memory: {
        used: toNumber(memory.used),
        total: toNumber(memory.total, 16 * 1024 * 1024 * 1024),
        percentage: toNumber(memory.percentage),
        available: toNumber(memory.available),
      },
      gpu: gpu ? {
        name: toString(gpu.name, 'Unknown GPU'),
        usage: toNumber(gpu.usage),
        memoryUsed: toNumber(gpu.memoryUsed),
        memoryTotal: toNumber(gpu.memoryTotal),
        temperature: toNullableNumber(gpu.temperature),
        fanSpeed: toNullableNumber(gpu.fanSpeed),
      } : null,
      disks: toRecordArray(data.disks).map((disk) => ({
        name: toString(disk.name, 'Disk'),
        used: toNumber(disk.used),
        total: toNumber(disk.total),
        percentage: toNumber(disk.percentage),
        readSpeed: toNumber(disk.readSpeed),
        writeSpeed: toNumber(disk.writeSpeed),
      })),
      network: {
        bytesIn: toNumber(network.bytesIn),
        bytesOut: toNumber(network.bytesOut),
        packetsIn: toNumber(network.packetsIn),
        packetsOut: toNumber(network.packetsOut),
        latency: toNumber(network.latency),
        connections: toNumber(network.connections),
      },
      processes: toRecordArray(data.processes).map((process) => ({
        pid: toNumber(process.pid),
        name: toString(process.name, 'Unknown'),
        cpuUsage: toNumber(process.cpuUsage),
        memoryUsage: toNumber(process.memoryUsage),
        status: toProcessStatus(process.status),
      })),
      services: toRecordArray(data.services).map((service) => ({
        name: toString(service.name, 'Unknown'),
        status: toServiceStatus(service.status),
        latency: toNullableNumber(service.latency),
        lastCheck: new Date(typeof service.lastCheck === 'string' || typeof service.lastCheck === 'number' ? service.lastCheck : Date.now()),
        message: typeof service.message === 'string' ? service.message : null,
      })),
      uptime: toNumber(data.uptime),
      loadAverage: toLoadAverage(data.loadAverage),
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
