/**
 * Admin Ops Layout - Layout Persistente para Painel Administrativo
 * 
 * Interface densa estilo Stripe/Datadog para controle total.
 * Sidebar fixa + Header com status do sistema.
 * 
 * @see PLANO_ACAO_TECNICA_2026.md - Seção 3 (Aethel Ops)
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Brain,
  Server,
  Shield,
  Settings,
  AlertTriangle,
  Activity,
  Database,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Zap,
  TrendingUp,
  Clock,
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface SystemStatus {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  redis: 'healthy' | 'degraded' | 'down';
  ai: 'healthy' | 'degraded' | 'down';
  websocket: 'healthy' | 'degraded' | 'down';
}

interface QuickStats {
  activeUsers: number;
  requestsPerMinute: number;
  aiCostToday: number;
  emergencyLevel: 'normal' | 'warning' | 'critical' | 'shutdown';
}

// ============================================================================
// NAVEGAÇÃO
// ============================================================================

const navItems = [
  {
    title: 'Painel',
    href: '/admin',
    icon: LayoutDashboard,
    permission: 'ops:dashboard:view',
  },
  {
    title: 'Finanças',
    href: '/admin/finance',
    icon: CreditCard,
    permission: 'ops:finance:view',
    badge: 'MRR',
  },
  {
    title: 'Usuários',
    href: '/admin/users',
    icon: Users,
    permission: 'ops:users:view',
  },
  {
    title: 'Monitor de IA',
    href: '/admin/ai-monitor',
    icon: Brain,
    permission: 'ops:agents:view',
    badge: 'Ao vivo',
  },
  {
    title: 'Infraestrutura',
    href: '/admin/infra',
    icon: Server,
    permission: 'ops:infra:view',
  },
  {
    title: 'Moderação',
    href: '/admin/moderation',
    icon: Shield,
    permission: 'ops:moderation:view',
  },
  {
    title: 'Análises',
    href: '/admin/analytics',
    icon: TrendingUp,
    permission: 'ops:dashboard:metrics',
  },
  {
    title: 'Configurações',
    href: '/admin/settings',
    icon: Settings,
    permission: 'ops:settings:view',
  },
];

// ============================================================================
// COMPONENTE: STATUS INDICATOR
// ============================================================================

function StatusIndicator({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const colors = {
    healthy: 'bg-green-500',
    degraded: 'bg-amber-500',
    down: 'bg-red-500',
  };
  
  return (
    <span className={`w-2 h-2 rounded-full ${colors[status]} ${status !== 'healthy' ? 'animate-pulse' : ''}`} />
  );
}

// ============================================================================
// COMPONENTE: QUICK STAT CARD
// ============================================================================

function QuickStatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend,
  alert 
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  alert?: boolean;
}) {
  return (
    <div className={`
      flex items-center gap-3 px-4 py-2 rounded-lg border
      ${alert ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-800/50 border-zinc-700'}
    `}>
      <Icon className={`w-4 h-4 ${alert ? 'text-red-400' : 'text-zinc-400'}`} />
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className={`text-sm font-semibold ${alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: SIDEBAR
// ============================================================================

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  
  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-zinc-900 border-r border-zinc-800
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Aethel Ops</p>
              <p className="text-[10px] text-zinc-500">Admin Panel</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-lg text-sm
                  transition-colors
                  ${isActive 
                    ? 'bg-purple-600/20 text-purple-400' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.title}
                </div>
                {item.badge && (
                  <span className={`
                    text-[10px] px-1.5 py-0.5 rounded
                    ${item.badge === 'Live' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}
                  `}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        
        {/* Emergency Button */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-zinc-800">
          <Link
            href="/admin/emergency"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-medium transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Emergency Mode
          </Link>
        </div>
      </aside>
    </>
  );
}

// ============================================================================
// COMPONENTE: HEADER
// ============================================================================

function Header({ 
  onMenuClick, 
  systemStatus,
  quickStats 
}: { 
  onMenuClick: () => void;
  systemStatus: SystemStatus | null;
  quickStats: QuickStats | null;
}) {
  return (
    <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
      {/* Left: Menu + Status */}
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden text-zinc-500 hover:text-white">
          <Menu className="w-5 h-5" />
        </button>
        
        {/* System Status */}
        {systemStatus && (
          <div className="hidden md:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <StatusIndicator status={systemStatus.api} />
              <span className="text-zinc-500">API</span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusIndicator status={systemStatus.database} />
              <span className="text-zinc-500">DB</span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusIndicator status={systemStatus.redis} />
              <span className="text-zinc-500">Redis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusIndicator status={systemStatus.ai} />
              <span className="text-zinc-500">IA</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Center: Quick Stats */}
      {quickStats && (
        <div className="hidden lg:flex items-center gap-3">
          <QuickStatCard 
            icon={Users} 
            label="Online" 
            value={quickStats.activeUsers} 
          />
          <QuickStatCard 
            icon={Activity} 
            label="Req/min" 
            value={quickStats.requestsPerMinute} 
          />
          <QuickStatCard 
            icon={CreditCard} 
            label="Custo de IA hoje" 
            value={`$${quickStats.aiCostToday.toFixed(2)}`}
            alert={quickStats.aiCostToday > 50}
          />
          {quickStats.emergencyLevel !== 'normal' && (
            <QuickStatCard 
              icon={AlertTriangle} 
              label="Emergência" 
              value={quickStats.emergencyLevel.toUpperCase()}
              alert
            />
          )}
        </div>
      )}
      
      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-zinc-500 hover:text-white">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-white">
          <span>Admin</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: LAYOUT
// ============================================================================

export default function AdminOpsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Fetch system status
  const { data: statusData } = useSWR('/api/admin/status', {
    refreshInterval: 10000, // 10 segundos
  });
  
  // Fetch quick stats
  const { data: statsData } = useSWR('/api/admin/quick-stats', {
    refreshInterval: 30000, // 30 segundos
  });
  
  const systemStatus = statusData?.status || null;
  const quickStats = statsData?.stats || null;
  
  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          systemStatus={systemStatus}
          quickStats={quickStats}
        />
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        
        {/* Footer com última atualização */}
        <footer className="h-8 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-4 text-xs text-zinc-500">
          <span>Aethel Engine Admin v2.0</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Last sync: {new Date().toLocaleTimeString()}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
