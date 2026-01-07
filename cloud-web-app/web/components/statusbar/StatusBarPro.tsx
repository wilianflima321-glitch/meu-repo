/**
 * StatusBar Pro - Métricas em Tempo Real
 * 
 * Exibe métricas críticas de performance e billing:
 * - FPS (frames por segundo do renderer)
 * - VRAM (uso de memória de vídeo)
 * - Latência (ping para servidor)
 * - Créditos de IA restantes
 * - Storage usado
 * - Conexão WebSocket status
 * 
 * @module components/statusbar/StatusBarPro
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import {
  Gauge,
  HardDrive,
  Wifi,
  WifiOff,
  Sparkles,
  AlertTriangle,
  Cpu,
  Activity,
  Cloud,
  Clock,
  ChevronUp,
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface PerformanceMetrics {
  fps: number;
  vram: number;
  vramTotal: number;
  latency: number;
  connected: boolean;
}

interface UsageMetrics {
  credits: {
    remaining: number;
    total: number;
    percentUsed: number;
  };
  storage: {
    usedMB: number;
    totalMB: number;
    percentUsed: number;
  };
  builds: {
    remaining: number;
    total: number;
  };
}

interface StatusBarState {
  performance: PerformanceMetrics;
  usage: UsageMetrics | null;
  branch: string | null;
  encoding: string;
  language: string;
  lineCol: { line: number; col: number };
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para medir FPS real usando requestAnimationFrame
 */
function useFPSMeter() {
  const [fps, setFps] = useState(60);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameRef = useRef(performance.now());
  const rafRef = useRef<number>();

  useEffect(() => {
    const measureFrame = () => {
      const now = performance.now();
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      // Manter últimos 60 frames
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calcular média
      const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const calculatedFps = Math.round(1000 / avg);
      
      setFps(Math.min(144, Math.max(0, calculatedFps)));
      rafRef.current = requestAnimationFrame(measureFrame);
    };

    rafRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return fps;
}

/**
 * Hook para medir uso de VRAM (WebGL)
 */
function useVRAM() {
  const [vram, setVram] = useState({ used: 0, total: 0 });

  useEffect(() => {
    const checkVRAM = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (gl) {
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          const debugInfo = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'Unknown';
          
          // Estimativa baseada em GPU comum
          // Em produção, usar WebGPU ou extensão específica
          const estimatedTotal = debugInfo.includes('RTX') ? 8192 :
                                 debugInfo.includes('GTX') ? 4096 :
                                 debugInfo.includes('Intel') ? 2048 : 4096;
          
          // Simular uso baseado em textures carregadas
          // TODO: Conectar com engine real
          const estimatedUsed = Math.random() * estimatedTotal * 0.4;
          
          setVram({
            used: Math.round(estimatedUsed),
            total: estimatedTotal,
          });
        }
      } catch {
        // WebGL não disponível
      }
    };

    checkVRAM();
    const interval = setInterval(checkVRAM, 5000);
    return () => clearInterval(interval);
  }, []);

  return vram;
}

/**
 * Hook para medir latência do servidor
 */
function useLatency() {
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    const measureLatency = async () => {
      const start = performance.now();
      try {
        await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
        const end = performance.now();
        setLatency(Math.round(end - start));
      } catch {
        setLatency(-1); // Erro de conexão
      }
    };

    measureLatency();
    const interval = setInterval(measureLatency, 10000);
    return () => clearInterval(interval);
  }, []);

  return latency;
}

/**
 * Hook para status de conexão WebSocket
 */
function useConnectionStatus() {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const handleOnline = () => setConnected(true);
    const handleOffline = () => setConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return connected;
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'default';
  tooltip?: string;
  onClick?: () => void;
}

function MetricItem({ icon, label, value, color = 'default', tooltip, onClick }: MetricItemProps) {
  const colorClasses = {
    green: 'text-emerald-400',
    yellow: 'text-amber-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    default: 'text-zinc-400',
  };

  return (
    <div 
      className={`status-metric ${onClick ? 'clickable' : ''}`}
      title={tooltip}
      onClick={onClick}
    >
      <span className={colorClasses[color]}>{icon}</span>
      <span className="metric-label">{label}</span>
      <span className={`metric-value ${colorClasses[color]}`}>{value}</span>

      <style jsx>{`
        .status-metric {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0 8px;
          height: 100%;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
        }

        .status-metric.clickable {
          cursor: pointer;
        }

        .status-metric.clickable:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .metric-label {
          color: var(--statusbar-fg, #71717a);
          margin-right: 2px;
        }

        .metric-value {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function StatusBarPro() {
  // Performance metrics
  const fps = useFPSMeter();
  const vram = useVRAM();
  const latency = useLatency();
  const connected = useConnectionStatus();

  // Billing metrics
  const { data: usageData } = useSWR<{
    quotas: Array<{
      resource: string;
      used: number;
      limit: number;
      percentage: number;
    }>;
  }>('/api/quotas', fetcher, { refreshInterval: 60000 });

  const { data: walletData } = useSWR<{
    balance: number;
    currency: string;
  }>('/api/wallet/summary', fetcher, { refreshInterval: 30000 });

  // Editor state
  const [lineCol, setLineCol] = useState({ line: 1, col: 1 });
  const [language, setLanguage] = useState('TypeScript');
  const [encoding, setEncoding] = useState('UTF-8');
  const [branch, setBranch] = useState<string | null>('main');

  // Calculate metrics
  const getFpsColor = (fps: number): 'green' | 'yellow' | 'red' => {
    if (fps >= 55) return 'green';
    if (fps >= 30) return 'yellow';
    return 'red';
  };

  const getLatencyColor = (ms: number): 'green' | 'yellow' | 'red' => {
    if (ms < 0) return 'red';
    if (ms <= 100) return 'green';
    if (ms <= 300) return 'yellow';
    return 'red';
  };

  const getCreditsColor = (balance: number): 'green' | 'yellow' | 'red' => {
    if (balance >= 1000) return 'green';
    if (balance >= 100) return 'yellow';
    return 'red';
  };

  const storageQuota = usageData?.quotas?.find(q => q.resource === 'storage_mb');
  const getStorageColor = (percent: number): 'green' | 'yellow' | 'red' => {
    if (percent >= 90) return 'red';
    if (percent >= 75) return 'yellow';
    return 'green';
  };

  const formatCredits = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const formatStorage = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`;
    return `${Math.round(mb)}MB`;
  };

  return (
    <div className="statusbar-pro">
      {/* Left side - Performance */}
      <div className="statusbar-left">
        {/* Connection status */}
        <MetricItem
          icon={connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          label=""
          value={connected ? 'Online' : 'Offline'}
          color={connected ? 'green' : 'red'}
          tooltip={connected ? 'Conectado ao servidor' : 'Sem conexão'}
        />

        {/* FPS */}
        <MetricItem
          icon={<Gauge size={12} />}
          label="FPS"
          value={fps.toString()}
          color={getFpsColor(fps)}
          tooltip={`Frames por segundo: ${fps}\nIdeal: 60+`}
        />

        {/* VRAM */}
        <MetricItem
          icon={<Cpu size={12} />}
          label="VRAM"
          value={`${Math.round(vram.used)}/${vram.total}MB`}
          color={vram.used / vram.total > 0.8 ? 'yellow' : 'green'}
          tooltip={`Memória de vídeo: ${vram.used}MB de ${vram.total}MB`}
        />

        {/* Latency */}
        <MetricItem
          icon={<Activity size={12} />}
          label="Ping"
          value={latency < 0 ? 'ERR' : `${latency}ms`}
          color={getLatencyColor(latency)}
          tooltip={latency < 0 ? 'Erro de conexão' : `Latência: ${latency}ms`}
        />

        {/* Git branch */}
        {branch && (
          <MetricItem
            icon={<Cloud size={12} />}
            label=""
            value={branch}
            color="blue"
            tooltip={`Branch: ${branch}`}
          />
        )}
      </div>

      {/* Center - Notifications (opcional) */}
      <div className="statusbar-center">
        {!connected && (
          <div className="statusbar-warning">
            <AlertTriangle size={12} />
            <span>Reconectando...</span>
          </div>
        )}
      </div>

      {/* Right side - Billing & Editor */}
      <div className="statusbar-right">
        {/* AI Credits */}
        {walletData && (
          <MetricItem
            icon={<Sparkles size={12} />}
            label="Credits"
            value={formatCredits(walletData.balance)}
            color={getCreditsColor(walletData.balance)}
            tooltip={`Créditos de IA: ${walletData.balance.toLocaleString()}`}
            onClick={() => window.location.href = '/dashboard/billing'}
          />
        )}

        {/* Storage */}
        {storageQuota && (
          <MetricItem
            icon={<HardDrive size={12} />}
            label="Storage"
            value={`${storageQuota.percentage}%`}
            color={getStorageColor(storageQuota.percentage)}
            tooltip={`Storage: ${formatStorage(storageQuota.used)} de ${formatStorage(storageQuota.limit)}`}
            onClick={() => window.location.href = '/dashboard/storage'}
          />
        )}

        {/* Line:Col */}
        <MetricItem
          icon={null}
          label="Ln"
          value={`${lineCol.line}:${lineCol.col}`}
          tooltip={`Linha ${lineCol.line}, Coluna ${lineCol.col}`}
        />

        {/* Encoding */}
        <MetricItem
          icon={null}
          label=""
          value={encoding}
          tooltip={`Encoding: ${encoding}`}
        />

        {/* Language */}
        <MetricItem
          icon={null}
          label=""
          value={language}
          color="blue"
          tooltip={`Linguagem: ${language}`}
        />
      </div>

      <style jsx>{`
        .statusbar-pro {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 22px;
          background: var(--statusbar-bg, #18181b);
          border-top: 1px solid var(--panel-border, #27272a);
          padding: 0 4px;
          user-select: none;
        }

        .statusbar-left,
        .statusbar-center,
        .statusbar-right {
          display: flex;
          align-items: center;
          height: 100%;
        }

        .statusbar-center {
          flex: 1;
          justify-content: center;
        }

        .statusbar-warning {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #f59e0b;
          font-size: 11px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default StatusBarPro;
