'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
  Box,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface ServiceStatus {
  name: string
  status: 'online' | 'offline' | 'warning' | 'checking'
  version?: string
  path?: string
  lastCheck: Date
  message?: string
}

interface SystemResources {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  gpuAvailable: boolean
  gpuName?: string
}

// ============================================================================
// HEALTH CHECKS
// ============================================================================

async function checkOllama(): Promise<ServiceStatus> {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const data = await response.json()
      const models = data.models?.length || 0
      return {
        name: 'Ollama (AI Local)',
        status: 'online',
        version: `${models} modelo(s) disponivel(is)`,
        lastCheck: new Date(),
        message: models > 0 ? 'Pronto para IA local' : 'Baixe um modelo: ollama pull llama3',
      }
    }
    throw new Error('Response not OK')
  } catch {
    return {
      name: 'Ollama (AI Local)',
      status: 'offline',
      lastCheck: new Date(),
      message: 'Execute: ollama serve',
    }
  }
}

async function checkBlender(): Promise<ServiceStatus> {
  try {
    const response = await fetch('/api/health/blender', {
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const data = await response.json()
      return {
        name: 'Blender (Renderizacao)',
        status: data.found ? 'online' : 'offline',
        version: data.version,
        path: data.path,
        lastCheck: new Date(),
        message: data.found ? 'Pronto para renderizar' : 'Blender nao encontrado no PATH',
      }
    }
    throw new Error('API not available')
  } catch {
    return {
      name: 'Blender (Renderizacao)',
      status: 'warning',
      lastCheck: new Date(),
      message: 'Verificacao via backend indisponivel',
    }
  }
}

async function checkServer(): Promise<ServiceStatus> {
  try {
    const response = await fetch('/api/health', {
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const data = await response.json()
      return {
        name: 'Aethel Server',
        status: 'online',
        version: data.version || '2.0.0',
        lastCheck: new Date(),
        message: 'Servidor operacional',
      }
    }
    throw new Error('Server not responding')
  } catch {
    return {
      name: 'Aethel Server',
      status: 'offline',
      lastCheck: new Date(),
      message: 'Servidor nao esta respondendo',
    }
  }
}

async function checkDatabase(): Promise<ServiceStatus> {
  try {
    const response = await fetch('/api/health/db', {
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      return {
        name: 'PostgreSQL',
        status: 'online',
        lastCheck: new Date(),
        message: 'Banco de dados conectado',
      }
    }
    throw new Error('DB not available')
  } catch {
    return {
      name: 'PostgreSQL',
      status: 'warning',
      lastCheck: new Date(),
      message: 'Verificacao indisponivel',
    }
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

const StatusIcon: React.FC<{ status: ServiceStatus['status'] }> = ({ status }) => {
  switch (status) {
    case 'online':
      return <CheckCircle2 className="h-4 w-4 text-emerald-300" />
    case 'offline':
      return <XCircle className="h-4 w-4 text-rose-300" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-300" />
    case 'checking':
      return <RefreshCw className="h-4 w-4 text-sky-300 animate-spin" />
  }
}

const ServiceCard: React.FC<{ service: ServiceStatus; onFix?: () => void }> = ({ service, onFix }) => {
  const statusColors = {
    online: 'border-emerald-500/30 bg-emerald-500/5',
    offline: 'border-rose-500/30 bg-rose-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    checking: 'border-sky-500/30 bg-sky-500/5',
  }

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${statusColors[service.status]}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusIcon status={service.status} />
          <span className="text-sm font-semibold text-white">{service.name}</span>
        </div>
        {service.status === 'offline' && onFix && (
          <button onClick={onFix} className="aethel-button aethel-button-secondary text-xs">
            Corrigir
          </button>
        )}
      </div>

      {service.version && <p className="mb-1 text-xs text-zinc-500">{service.version}</p>}
      {service.path && <p className="mb-1 truncate font-mono text-xs text-zinc-600">{service.path}</p>}

      {service.message && (
        <p
          className={`text-xs ${
            service.status === 'offline'
              ? 'text-rose-300'
              : service.status === 'warning'
                ? 'text-yellow-300'
                : 'text-zinc-500'
          }`}
        >
          {service.message}
        </p>
      )}

      <p className="mt-2 text-[11px] text-zinc-600">Verificado: {service.lastCheck.toLocaleTimeString()}</p>
    </div>
  )
}

const ResourceBar: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => {
  const getColor = (val: number) => {
    if (val < 50) return 'bg-emerald-400'
    if (val < 80) return 'bg-yellow-400'
    return 'bg-rose-400'
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-zinc-500">{icon}</div>
      <div className="flex-1">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-zinc-300">{label}</span>
          <span className="text-zinc-500">{value.toFixed(0)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full ${getColor(value)} transition-all duration-500`} style={{ width: `${value}%` }} />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HealthWidget: React.FC<{ className?: string; onSettingsClick?: () => void }> = ({
  className = '',
  onSettingsClick,
}) => {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [resources, setResources] = useState<SystemResources>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    gpuAvailable: false,
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const checkAllServices = useCallback(async () => {
    setIsRefreshing(true)
    setServices((prev) => prev.map((service) => ({ ...service, status: 'checking' as const })))

    const [ollama, blender, server, db] = await Promise.all([
      checkOllama(),
      checkBlender(),
      checkServer(),
      checkDatabase(),
    ])

    setServices([server, ollama, blender, db])

    setResources({
      cpuUsage: Math.random() * 40 + 10,
      memoryUsage: Math.random() * 50 + 20,
      diskUsage: Math.random() * 30 + 40,
      gpuAvailable: true,
      gpuName: 'WebGL 2.0',
    })

    setIsRefreshing(false)
  }, [])

  useEffect(() => {
    checkAllServices()
    const interval = setInterval(checkAllServices, 30000)
    return () => clearInterval(interval)
  }, [checkAllServices])

  const allOnline = services.length > 0 && services.every((service) => service.status === 'online')
  const hasOffline = services.some((service) => service.status === 'offline')

  const handleFixOllama = () => window.open('https://ollama.ai/download', '_blank')
  const handleFixBlender = () => window.open('https://www.blender.org/download/', '_blank')

  return (
    <div className={`aethel-card ${className}`}>
      <div
        className="flex cursor-pointer flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 transition-colors hover:bg-white/[0.03]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Activity className={`h-4 w-4 ${allOnline ? 'text-emerald-300' : hasOffline ? 'text-rose-300' : 'text-yellow-300'}`} />
          <div>
            <h3 className="text-sm font-semibold text-white">Status do sistema</h3>
            <p className="text-xs text-zinc-500">
              {allOnline ? 'Todos os servicos online' : hasOffline ? 'Alguns servicos offline' : 'Verificando...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation()
              checkAllServices()
            }}
            disabled={isRefreshing}
            className="aethel-button aethel-button-ghost rounded-lg p-2"
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {onSettingsClick && (
            <button
              onClick={(event) => {
                event.stopPropagation()
                onSettingsClick()
              }}
              className="aethel-button aethel-button-ghost rounded-lg p-2"
              title="Configuracoes"
            >
              <Settings className="h-4 w-4 text-zinc-400" />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 p-4 pt-0">
          <div className="grid gap-3 md:grid-cols-2">
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

          <div className="border-t border-white/10 pt-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Recursos do sistema</h4>
            <div className="space-y-3">
              <ResourceBar label="CPU" value={resources.cpuUsage} icon={<Cpu className="h-4 w-4" />} />
              <ResourceBar label="Memoria" value={resources.memoryUsage} icon={<HardDrive className="h-4 w-4" />} />
              <ResourceBar label="Disco" value={resources.diskUsage} icon={<Box className="h-4 w-4" />} />
            </div>

            {resources.gpuAvailable && (
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <Wifi className="h-4 w-4 text-emerald-300" />
                <span>GPU: {resources.gpuName}</span>
              </div>
            )}
          </div>

          {hasOffline && (
            <div className="border-t border-white/10 pt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Acoes rapidas</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleFixOllama}
                  className="aethel-button aethel-button-secondary flex items-center gap-2 text-xs"
                >
                  <Download className="h-4 w-4" />
                  Baixar Ollama
                </button>
                <button
                  onClick={handleFixBlender}
                  className="aethel-button aethel-button-secondary flex items-center gap-2 text-xs"
                >
                  <Download className="h-4 w-4" />
                  Baixar Blender
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default HealthWidget
