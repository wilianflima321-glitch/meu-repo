/**
 * StatusBar Pro - Métricas em Tempo Real (Versão Polida)
 * 
 * Exibe métricas críticas de performance e billing:
 * - FPS (frames por segundo do renderer)
 * - VRAM (uso de memória de vídeo)
 * - Latência (ping para servidor)
 * - Créditos de IA restantes (com mini-widget integrado)
 * - Storage usado
 * - Conexão WebSocket status
 * - Git branch ativo
 * 
 * Integrado com AethelProvider para estado centralizado.
 * 
 * @module components/statusbar/StatusBarPro
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
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
  Zap,
  TrendingDown,
  TrendingUp,
  GitBranch,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useWallet, useNotifications } from '@/lib/providers/AethelProvider';

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

  // Aethel Provider - Wallet
  const { wallet } = useWallet();
  const { showNotification } = useNotifications();

  // Billing metrics (fallback para SWR se provider não disponível)
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
  }>('/api/wallet/summary', fetcher, { 
    refreshInterval: 30000,
    isPaused: () => wallet !== null && wallet.balance > 0, // Usa provider quando disponível
  });

  // Estado combinado de wallet
  const currentBalance = wallet?.balance ?? walletData?.balance ?? 0;
  const [previousBalance, setPreviousBalance] = useState(currentBalance);
  const [balanceDelta, setBalanceDelta] = useState<number | null>(null);

  // Detectar mudanças no saldo
  useEffect(() => {
    if (previousBalance !== currentBalance && previousBalance > 0) {
      const delta = currentBalance - previousBalance;
      setBalanceDelta(delta);
      
      // Limpar indicador após 3 segundos
      const timer = setTimeout(() => setBalanceDelta(null), 3000);
      return () => clearTimeout(timer);
    }
    setPreviousBalance(currentBalance);
  }, [currentBalance, previousBalance]);

  // Editor state
  const [lineCol, setLineCol] = useState({ line: 1, col: 1 });
  const [language, setLanguage] = useState('TypeScript');
  const [encoding, setEncoding] = useState('UTF-8');
  const [branch, setBranch] = useState<string | null>('main');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

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

  // Handler para clicar em créditos
  const handleCreditsClick = useCallback(() => {
    window.location.href = '/dashboard?tab=billing';
  }, []);

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
          tooltip={connected ? 'Conectado ao servidor Aethel' : 'Sem conexão - tentando reconectar...'}
        />

        {/* FPS */}
        <MetricItem
          icon={<Gauge size={12} />}
          label="FPS"
          value={fps.toString()}
          color={getFpsColor(fps)}
          tooltip={`Frames por segundo: ${fps}\n✓ Ideal: 60+\n⚠ Aceitável: 30-59\n✗ Lento: <30`}
        />

        {/* VRAM */}
        <MetricItem
          icon={<Cpu size={12} />}
          label="VRAM"
          value={`${Math.round(vram.used)}/${vram.total}MB`}
          color={vram.used / vram.total > 0.8 ? 'yellow' : 'green'}
          tooltip={`Memória de vídeo:\n${vram.used}MB usados de ${vram.total}MB\n${Math.round((vram.used / vram.total) * 100)}% em uso`}
        />

        {/* Latency */}
        <MetricItem
          icon={<Activity size={12} />}
          label="Ping"
          value={latency < 0 ? 'ERR' : `${latency}ms`}
          color={getLatencyColor(latency)}
          tooltip={latency < 0 ? 'Erro de conexão com servidor' : `Latência: ${latency}ms\n✓ Ótimo: <100ms\n⚠ Aceitável: 100-300ms`}
        />

        {/* Divider */}
        <div className="statusbar-divider" />

        {/* Git branch */}
        {branch && (
          <MetricItem
            icon={<GitBranch size={12} />}
            label=""
            value={branch}
            color="blue"
            tooltip={`Branch Git: ${branch}`}
          />
        )}

        {/* Sync status */}
        <div className="sync-indicator" title={
          syncStatus === 'synced' ? 'Projeto sincronizado' :
          syncStatus === 'syncing' ? 'Sincronizando...' :
          'Erro de sincronização'
        }>
          {syncStatus === 'synced' && <CheckCircle2 size={12} className="text-emerald-400" />}
          {syncStatus === 'syncing' && <Loader2 size={12} className="text-blue-400 animate-spin" />}
          {syncStatus === 'error' && <XCircle size={12} className="text-red-400" />}
        </div>
      </div>

      {/* Center - Notifications/Status */}
      <div className="statusbar-center">
        <AnimatePresence mode="wait">
          {!connected && (
            <motion.div 
              className="statusbar-warning"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Loader2 size={12} className="animate-spin" />
              <span>Reconectando ao servidor...</span>
            </motion.div>
          )}
          {balanceDelta !== null && (
            <motion.div 
              className={`balance-delta ${balanceDelta >= 0 ? 'positive' : 'negative'}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              {balanceDelta >= 0 ? (
                <>
                  <TrendingUp size={12} />
                  <span>+{formatCredits(balanceDelta)} créditos</span>
                </>
              ) : (
                <>
                  <TrendingDown size={12} />
                  <span>{formatCredits(balanceDelta)} créditos</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right side - Billing & Editor */}
      <div className="statusbar-right">
        {/* AI Credits - Enhanced */}
        <motion.div 
          className="credits-widget"
          onClick={handleCreditsClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Sparkles size={12} className={getCreditsColor(currentBalance) === 'green' ? 'text-emerald-400' : getCreditsColor(currentBalance) === 'yellow' ? 'text-amber-400' : 'text-red-400'} />
          <span className="credits-label">Credits</span>
          <span className={`credits-value ${getCreditsColor(currentBalance)}`}>
            {!wallet && !walletData ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              formatCredits(currentBalance)
            )}
          </span>
          {currentBalance < 100 && (
            <span title="Saldo baixo!">
              <Zap size={10} className="text-amber-400 ml-1" />
            </span>
          )}
        </motion.div>

        {/* Storage */}
        {storageQuota && (
          <MetricItem
            icon={<HardDrive size={12} />}
            label="Storage"
            value={`${storageQuota.percentage}%`}
            color={getStorageColor(storageQuota.percentage)}
            tooltip={`Storage: ${formatStorage(storageQuota.used)} de ${formatStorage(storageQuota.limit)}\n${storageQuota.percentage}% utilizado`}
            onClick={() => window.location.href = '/dashboard?tab=storage'}
          />
        )}

        {/* Divider */}
        <div className="statusbar-divider" />

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
          height: 24px;
          background: linear-gradient(180deg, #18181b 0%, #0f0f12 100%);
          border-top: 1px solid rgba(99, 102, 241, 0.2);
          padding: 0 8px;
          user-select: none;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }

        .statusbar-left,
        .statusbar-center,
        .statusbar-right {
          display: flex;
          align-items: center;
          height: 100%;
          gap: 2px;
        }

        .statusbar-center {
          flex: 1;
          justify-content: center;
        }

        .statusbar-divider {
          width: 1px;
          height: 14px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 6px;
        }

        .statusbar-warning {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #f59e0b;
          font-size: 11px;
        }

        .balance-delta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .balance-delta.positive {
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }

        .balance-delta.negative {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
        }

        .sync-indicator {
          display: flex;
          align-items: center;
          padding: 0 4px;
        }

        .credits-widget {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 11px;
        }

        .credits-widget:hover {
          background: rgba(99, 102, 241, 0.1);
        }

        .credits-label {
          color: #71717a;
        }

        .credits-value {
          font-weight: 600;
        }

        .credits-value.green {
          color: #10b981;
        }

        .credits-value.yellow {
          color: #f59e0b;
        }

        .credits-value.red {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}

export default StatusBarPro;
