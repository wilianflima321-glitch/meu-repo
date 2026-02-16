/**
 * AETHEL ENGINE - HEALTH DASHBOARD COMPONENT
 * ==========================================
 * 
 * Dashboard em tempo real mostrando saúde do sistema,
 * uso de recursos e métricas de performance.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Activity, 
    Cpu, 
    HardDrive, 
    MemoryStick, 
    Wifi, 
    WifiOff,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Server,
    Gauge,
    Clock,
    Thermometer
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface SystemHealth {
    status: 'healthy' | 'degraded' | 'critical' | 'offline';
    uptime: number;
    timestamp: number;
    components: {
        server: ComponentHealth;
        blender: ComponentHealth;
        ai: ComponentHealth;
        storage: ComponentHealth;
        database: ComponentHealth;
    };
    metrics: {
        cpu: number;
        memory: number;
        disk: number;
        gpuUsage?: number;
        gpuTemp?: number;
        networkLatency: number;
    };
    activeJobs: number;
    queuedJobs: number;
    completedToday: number;
    errors24h: number;
}

export interface ComponentHealth {
    status: 'online' | 'degraded' | 'offline' | 'unknown';
    latency?: number;
    lastCheck: number;
    message?: string;
    version?: string;
}

export interface HealthDashboardProps {
    health: SystemHealth | null;
    isConnected: boolean;
    onRefresh?: () => void;
    className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

function formatLatency(ms: number): string {
    if (ms < 100) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function getStatusColor(status: string): string {
    switch (status) {
        case 'healthy':
        case 'online':
            return 'text-green-500';
        case 'degraded':
            return 'text-yellow-500';
        case 'critical':
        case 'offline':
            return 'text-red-500';
        default:
            return 'text-gray-500';
    }
}

function getStatusBg(status: string): string {
    switch (status) {
        case 'healthy':
        case 'online':
            return 'bg-green-500/10 border-green-500/30';
        case 'degraded':
            return 'bg-yellow-500/10 border-yellow-500/30';
        case 'critical':
        case 'offline':
            return 'bg-red-500/10 border-red-500/30';
        default:
            return 'bg-gray-500/10 border-gray-500/30';
    }
}

function getMetricColor(value: number, thresholds: [number, number] = [70, 90]): string {
    if (value >= thresholds[1]) return 'text-red-500';
    if (value >= thresholds[0]) return 'text-yellow-500';
    return 'text-green-500';
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatusIconProps {
    status: string;
    size?: number;
}

const StatusIcon: React.FC<StatusIconProps> = ({ status, size = 16 }) => {
    const className = `${getStatusColor(status)}`;
    
    switch (status) {
        case 'healthy':
        case 'online':
            return <CheckCircle size={size} className={className} />;
        case 'degraded':
            return <AlertTriangle size={size} className={className} />;
        case 'critical':
        case 'offline':
            return <XCircle size={size} className={className} />;
        default:
            return <Activity size={size} className="text-gray-500" />;
    }
};

interface MetricBarProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    suffix?: string;
    thresholds?: [number, number];
}

const MetricBar: React.FC<MetricBarProps> = ({ 
    label, 
    value, 
    icon, 
    suffix = '%',
    thresholds = [70, 90]
}) => {
    const color = getMetricColor(value, thresholds);
    const bgColor = value >= thresholds[1] ? 'bg-red-500' 
                  : value >= thresholds[0] ? 'bg-yellow-500' 
                  : 'bg-green-500';
    
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                    {icon}
                    <span>{label}</span>
                </div>
                <span className={`font-mono ${color}`}>
                    {value.toFixed(1)}{suffix}
                </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${bgColor} transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(100, value)}%` }}
                />
            </div>
        </div>
    );
};

interface ComponentStatusProps {
    name: string;
    component: ComponentHealth;
    icon: React.ReactNode;
}

const ComponentStatus: React.FC<ComponentStatusProps> = ({ name, component, icon }) => {
    return (
        <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusBg(component.status)}`}>
            <div className="flex items-center gap-3">
                <div className={getStatusColor(component.status)}>
                    {icon}
                </div>
                <div>
                    <div className="font-medium text-white">{name}</div>
                    {component.message && (
                        <div className="text-xs text-gray-400">{component.message}</div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
                {component.latency !== undefined && (
                    <span className="text-xs text-gray-400 font-mono">
                        {formatLatency(component.latency)}
                    </span>
                )}
                <StatusIcon status={component.status} />
            </div>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HealthDashboard: React.FC<HealthDashboardProps> = ({
    health,
    isConnected,
    onRefresh,
    className = ''
}) => {
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    
    useEffect(() => {
        if (health) {
            setLastUpdate(new Date(health.timestamp));
        }
    }, [health]);
    
    // Offline state
    if (!isConnected) {
        return (
            <div className={`bg-gray-900 rounded-xl p-6 ${className}`}>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <WifiOff size={48} className="text-red-500 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                        Desconectado
                    </h3>
                    <p className="text-gray-400 mb-4">
                        Não foi possível conectar ao servidor
                    </p>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            <RefreshCw size={16} />
                            Reconectar
                        </button>
                    )}
                </div>
            </div>
        );
    }
    
    // Loading state
    if (!health) {
        return (
            <div className={`bg-gray-900 rounded-xl p-6 ${className}`}>
                <div className="flex flex-col items-center justify-center py-12">
                    <RefreshCw size={32} className="text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-400">Carregando dados de saúde...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`bg-gray-900 rounded-xl p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getStatusBg(health.status)}`}>
                        <Activity size={24} className={getStatusColor(health.status)} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">System Health</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Wifi size={14} className="text-green-500" />
                            <span>Conectado</span>
                            <span>•</span>
                            <Clock size={14} />
                            <span>Uptime: {formatUptime(health.uptime)}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBg(health.status)} ${getStatusColor(health.status)}`}>
                        {health.status.toUpperCase()}
                    </span>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            title="Atualizar"
                        >
                            <RefreshCw size={18} className="text-gray-400" />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-500">
                        {health.activeJobs}
                    </div>
                    <div className="text-xs text-gray-400">Jobs Ativos</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-500">
                        {health.queuedJobs}
                    </div>
                    <div className="text-xs text-gray-400">Na Fila</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-500">
                        {health.completedToday}
                    </div>
                    <div className="text-xs text-gray-400">Completos Hoje</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-500">
                        {health.errors24h}
                    </div>
                    <div className="text-xs text-gray-400">Erros 24h</div>
                </div>
            </div>
            
            {/* Two-column layout */}
            <div className="grid grid-cols-2 gap-6">
                {/* Metrics */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Recursos do Sistema
                    </h3>
                    
                    <MetricBar 
                        label="CPU" 
                        value={health.metrics.cpu} 
                        icon={<Cpu size={14} />} 
                    />
                    
                    <MetricBar 
                        label="Memória" 
                        value={health.metrics.memory} 
                        icon={<MemoryStick size={14} />} 
                    />
                    
                    <MetricBar 
                        label="Disco" 
                        value={health.metrics.disk} 
                        icon={<HardDrive size={14} />} 
                    />
                    
                    {health.metrics.gpuUsage !== undefined && (
                        <MetricBar 
                            label="GPU" 
                            value={health.metrics.gpuUsage} 
                            icon={<Gauge size={14} />} 
                        />
                    )}
                    
                    {health.metrics.gpuTemp !== undefined && (
                        <MetricBar 
                            label="GPU Temp" 
                            value={health.metrics.gpuTemp} 
                            icon={<Thermometer size={14} />}
                            suffix="°C"
                            thresholds={[70, 85]}
                        />
                    )}
                    
                    <div className="flex items-center justify-between text-sm pt-2">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Wifi size={14} />
                            <span>Latência</span>
                        </div>
                        <span className={`font-mono ${getMetricColor(health.metrics.networkLatency, [100, 500])}`}>
                            {health.metrics.networkLatency}ms
                        </span>
                    </div>
                </div>
                
                {/* Components */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Status dos Componentes
                    </h3>
                    
                    <ComponentStatus 
                        name="Servidor" 
                        component={health.components.server}
                        icon={<Server size={18} />}
                    />
                    
                    <ComponentStatus 
                        name="Blender" 
                        component={health.components.blender}
                        icon={<span className="text-lg">🎨</span>}
                    />
                    
                    <ComponentStatus 
                        name="AI Engine" 
                        component={health.components.ai}
                        icon={<span className="text-lg">🧠</span>}
                    />
                    
                    <ComponentStatus 
                        name="Storage" 
                        component={health.components.storage}
                        icon={<HardDrive size={18} />}
                    />
                    
                    <ComponentStatus 
                        name="Database" 
                        component={health.components.database}
                        icon={<span className="text-lg">🗄️</span>}
                    />
                </div>
            </div>
            
            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between text-xs text-gray-500">
                <span>
                    Última atualização: {lastUpdate.toLocaleTimeString()}
                </span>
                <span>
                    Aethel Engine v1.0.0
                </span>
            </div>
        </div>
    );
};

export default HealthDashboard;
