'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Download,
  Settings,
  Cpu,
  HardDrive,
  Wifi,
  Box
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'warning' | 'checking';
  version?: string;
  path?: string;
  lastCheck: Date;
  message?: string;
}

interface SystemResources {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  gpuAvailable: boolean;
  gpuName?: string;
}

// ============================================================================
// HEALTH CHECK SERVICE
// ============================================================================

async function checkOllama(): Promise<ServiceStatus> {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      const models = data.models?.length || 0;
      return {
        name: 'Ollama (AI Local)',
        status: 'online',
        version: `${models} modelo(s) disponível(is)`,
        lastCheck: new Date(),
        message: models > 0 ? 'Pronto para IA local' : 'Baixe um modelo: ollama pull llama3'
      };
    }
    throw new Error('Response not OK');
  } catch {
    return {
      name: 'Ollama (AI Local)',
      status: 'offline',
      lastCheck: new Date(),
      message: 'Execute: ollama serve'
    };
  }
}

async function checkBlender(): Promise<ServiceStatus> {
  // Browser não pode verificar diretamente, depende do backend
  try {
    const response = await fetch('/api/health/blender', {
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        name: 'Blender (Renderização)',
        status: data.found ? 'online' : 'offline',
        version: data.version,
        path: data.path,
        lastCheck: new Date(),
        message: data.found ? 'Pronto para renderizar' : 'Blender não encontrado no PATH'
      };
    }
    throw new Error('API not available');
  } catch {
    return {
      name: 'Blender (Renderização)',
      status: 'warning',
      lastCheck: new Date(),
      message: 'Verificação via backend indisponível'
    };
  }
}

async function checkServer(): Promise<ServiceStatus> {
  try {
    const response = await fetch('/api/health', {
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        name: 'Aethel Server',
        status: 'online',
        version: data.version || '2.0.0',
        lastCheck: new Date(),
        message: 'Servidor operacional'
      };
    }
    throw new Error('Server not responding');
  } catch {
    return {
      name: 'Aethel Server',
      status: 'offline',
      lastCheck: new Date(),
      message: 'Servidor não está respondendo'
    };
  }
}

async function checkDatabase(): Promise<ServiceStatus> {
  try {
    const response = await fetch('/api/health/db', {
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      return {
        name: 'PostgreSQL',
        status: 'online',
        lastCheck: new Date(),
        message: 'Banco de dados conectado'
      };
    }
    throw new Error('DB not available');
  } catch {
    return {
      name: 'PostgreSQL',
      status: 'warning',
      lastCheck: new Date(),
      message: 'Verificação indisponível'
    };
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

const StatusIcon: React.FC<{ status: ServiceStatus['status'] }> = ({ status }) => {
  switch (status) {
    case 'online':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'offline':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'checking':
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
  }
};

const ServiceCard: React.FC<{ 
  service: ServiceStatus;
  onFix?: () => void;
}> = ({ service, onFix }) => {
  const statusColors = {
    online: 'border-green-500/30 bg-green-500/5',
    offline: 'border-red-500/30 bg-red-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    checking: 'border-blue-500/30 bg-blue-500/5',
  };

  return (
    <div className={`
      rounded-lg border p-4 transition-all duration-200
      ${statusColors[service.status]}
    `}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon status={service.status} />
          <span className="font-medium text-white">{service.name}</span>
        </div>
        {service.status === 'offline' && onFix && (
          <button
            onClick={onFix}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
          >
            Corrigir
          </button>
        )}
      </div>
      
      {service.version && (
        <p className="text-sm text-gray-400 mb-1">{service.version}</p>
      )}
      
      {service.path && (
        <p className="text-xs text-gray-500 font-mono truncate mb-1">{service.path}</p>
      )}
      
      {service.message && (
        <p className={`text-sm ${
          service.status === 'offline' ? 'text-red-400' : 
          service.status === 'warning' ? 'text-yellow-400' : 
          'text-gray-400'
        }`}>
          {service.message}
        </p>
      )}
      
      <p className="text-xs text-gray-600 mt-2">
        Verificado: {service.lastCheck.toLocaleTimeString()}
      </p>
    </div>
  );
};

const ResourceBar: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => {
  const getColor = (v: number) => {
    if (v < 50) return 'bg-green-500';
    if (v < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-300">{label}</span>
          <span className="text-gray-400">{value.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getColor(value)} transition-all duration-500`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HealthWidget: React.FC<{
  className?: string;
  onSettingsClick?: () => void;
}> = ({ className = '', onSettingsClick }) => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [resources, setResources] = useState<SystemResources>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    gpuAvailable: false,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const checkAllServices = useCallback(async () => {
    setIsRefreshing(true);
    
    // Set all to checking
    setServices(prev => prev.map(s => ({ ...s, status: 'checking' as const })));
    
    // Check all services in parallel
    const [ollama, blender, server, db] = await Promise.all([
      checkOllama(),
      checkBlender(),
      checkServer(),
      checkDatabase(),
    ]);
    
    setServices([server, ollama, blender, db]);
    
    // Simulate resource check (in real app, this comes from backend)
    setResources({
      cpuUsage: Math.random() * 40 + 10,
      memoryUsage: Math.random() * 50 + 20,
      diskUsage: Math.random() * 30 + 40,
      gpuAvailable: true,
      gpuName: 'WebGL 2.0',
    });
    
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    checkAllServices();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkAllServices, 30000);
    return () => clearInterval(interval);
  }, [checkAllServices]);

  const allOnline = services.every(s => s.status === 'online');
  const hasOffline = services.some(s => s.status === 'offline');

  const handleFixOllama = () => {
    window.open('https://ollama.ai/download', '_blank');
  };

  const handleFixBlender = () => {
    window.open('https://www.blender.org/download/', '_blank');
  };

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Activity className={`w-5 h-5 ${
            allOnline ? 'text-green-500' : 
            hasOffline ? 'text-red-500' : 
            'text-yellow-500'
          }`} />
          <div>
            <h3 className="font-semibold text-white">Status do Sistema</h3>
            <p className="text-xs text-gray-400">
              {allOnline 
                ? 'Todos os serviços online' 
                : hasOffline 
                  ? 'Alguns serviços offline'
                  : 'Verificando...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              checkAllServices();
            }}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          
          {onSettingsClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSettingsClick();
              }}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Configurações"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Content */}
      {expanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {services.map((service, idx) => (
              <ServiceCard 
                key={idx} 
                service={service}
                onFix={
                  service.name.includes('Ollama') && service.status === 'offline' 
                    ? handleFixOllama 
                    : service.name.includes('Blender') && service.status === 'offline'
                      ? handleFixBlender
                      : undefined
                }
              />
            ))}
          </div>

          {/* Resources */}
          <div className="border-t border-gray-800 pt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Recursos do Sistema</h4>
            <div className="space-y-3">
              <ResourceBar 
                label="CPU" 
                value={resources.cpuUsage} 
                icon={<Cpu className="w-4 h-4" />}
              />
              <ResourceBar 
                label="Memória" 
                value={resources.memoryUsage} 
                icon={<HardDrive className="w-4 h-4" />}
              />
              <ResourceBar 
                label="Disco" 
                value={resources.diskUsage} 
                icon={<Box className="w-4 h-4" />}
              />
            </div>
            
            {resources.gpuAvailable && (
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-400">
                <Wifi className="w-4 h-4 text-green-500" />
                <span>GPU: {resources.gpuName}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {hasOffline && (
            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Ações Rápidas</h4>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleFixOllama}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 rounded-lg text-blue-400 text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar Ollama
                </button>
                <button 
                  onClick={handleFixBlender}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-600/30 rounded-lg text-orange-400 text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar Blender
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HealthWidget;
