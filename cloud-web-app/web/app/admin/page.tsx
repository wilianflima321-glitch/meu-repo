"use client"

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { motion } from 'framer-motion';
import { 
  Users, Shield, Cpu, Zap, Database, Settings, 
  BarChart3, AlertTriangle, CheckCircle, Clock,
  Server, Globe, Lock, Eye, TrendingUp, Activity,
  Layers, Terminal, Brain, Sparkles, Crown, Gem
} from 'lucide-react';

// Mock data para modo dev
const mockUsers = [
  { id: '1', name: 'Alice Johnson', email: 'alice@studio.com', plan: 'enterprise', _count: { projects: 24 }, createdAt: new Date().toISOString(), status: 'active' },
  { id: '2', name: 'Bob Smith', email: 'bob@gamedev.io', plan: 'pro', _count: { projects: 12 }, createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'active' },
  { id: '3', name: 'Carol White', email: 'carol@indie.dev', plan: 'pro', _count: { projects: 8 }, createdAt: new Date(Date.now() - 172800000).toISOString(), status: 'active' },
  { id: '4', name: 'David Lee', email: 'david@nexus.gg', plan: 'free', _count: { projects: 3 }, createdAt: new Date(Date.now() - 259200000).toISOString(), status: 'pending' },
  { id: '5', name: 'Eva Martinez', email: 'eva@aaa.studio', plan: 'enterprise', _count: { projects: 45 }, createdAt: new Date(Date.now() - 345600000).toISOString(), status: 'active' },
];

const mockStats = {
  totalUsers: 1247,
  activeProjects: 3892,
  aiRequests: 284500,
  uptime: 99.97,
  revenue: 45890,
  newUsersToday: 23,
  activeNow: 156,
  storageUsed: 2.4,
};

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  change, 
  color = 'cyan',
  delay = 0 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  change?: string;
  color?: 'cyan' | 'purple' | 'green' | 'orange' | 'pink';
  delay?: number;
}) {
  const colorMap = {
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
    green: 'from-green-500/20 to-green-600/5 border-green-500/30 text-green-400',
    orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/30 text-orange-400',
    pink: 'from-pink-500/20 to-pink-600/5 border-pink-500/30 text-pink-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br backdrop-blur-sm p-5 ${colorMap[color]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {change && (
            <p className={`text-xs mt-1 ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
              {change}
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-white/5">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-3xl opacity-20 bg-cyan-500" />
    </motion.div>
  );
}

function AdminNavCard({ 
  href, 
  icon: Icon, 
  title, 
  description,
  badge,
  delay = 0 
}: { 
  href: string; 
  icon: any; 
  title: string; 
  description: string;
  badge?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Link 
        href={href}
        className="group block relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-sm p-5 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 group-hover:border-cyan-500/30 transition-colors">
            <Icon className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                {title}
              </h3>
              {badge && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{description}</p>
          </div>
        </div>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl bg-cyan-500/10" />
        </div>
      </Link>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => fetcher(`${API_BASE}/admin/users`),
    retry: false,
  });

  const users = data?.users || mockUsers;
  const stats = mockStats;

  const planConfig: Record<string, { label: string; color: string; icon: any }> = {
    enterprise: { label: 'Enterprise', color: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: Crown },
    pro: { label: 'Pro', color: 'bg-gradient-to-r from-cyan-500 to-blue-500', icon: Gem },
    free: { label: 'Free', color: 'bg-gray-600', icon: Users },
  };

  const statusConfig: Record<string, { color: string; icon: any }> = {
    active: { color: 'text-green-400', icon: CheckCircle },
    pending: { color: 'text-yellow-400', icon: Clock },
    suspended: { color: 'text-red-400', icon: AlertTriangle },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-purple-200 bg-clip-text text-transparent">
              Admin Control Center
            </h1>
          </div>
          <p className="text-gray-400 ml-12">
            Gerencie usuários, IA, assinaturas e infraestrutura do Aethel Engine.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Total de Usuários" value={stats.totalUsers.toLocaleString()} change="+12% este mês" color="cyan" delay={0.1} />
          <StatCard icon={Layers} label="Projetos Ativos" value={stats.activeProjects.toLocaleString()} change="+8% esta semana" color="purple" delay={0.15} />
          <StatCard icon={Brain} label="Requisições de IA" value={`${(stats.aiRequests / 1000).toFixed(0)}k`} change="+23% hoje" color="pink" delay={0.2} />
          <StatCard icon={Activity} label="Uptime" value={`${stats.uptime}%`} color="green" delay={0.25} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={TrendingUp} label="Receita Mensal" value={`$${stats.revenue.toLocaleString()}`} change="+15%" color="green" delay={0.3} />
          <StatCard icon={Sparkles} label="Novos Hoje" value={stats.newUsersToday} color="orange" delay={0.35} />
          <StatCard icon={Eye} label="Online Agora" value={stats.activeNow} color="cyan" delay={0.4} />
          <StatCard icon={Database} label="Storage Usado" value={`${stats.storageUsed} TB`} color="purple" delay={0.45} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8 rounded-xl border border-white/10 bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-sm overflow-hidden"
        >
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Usuários Recentes</h2>
            </div>
            <Link href="/admin/users" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              Ver todos →
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 mt-2">Carregando usuários...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Usuário</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Plano</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Projetos</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Membro desde</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 5).map((user: any, index: number) => {
                    const plan = planConfig[user.plan] || planConfig.free;
                    const status = statusConfig[user.status] || statusConfig.active;
                    const StatusIcon = status.icon;
                    
                    return (
                      <motion.tr 
                        key={user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.05 }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-medium">
                              {user.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-white">{user.name || 'Sem nome'}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white ${plan.color}`}>
                            <plan.icon className="w-3 h-3" />
                            {plan.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-300">{user._count?.projects || 0}</span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 ${status.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            <span className="text-sm capitalize">{user.status || 'active'}</span>
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">
                          {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Painéis de Administração
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AdminNavCard href="/admin/users" icon={Users} title="Gerenciar Usuários" description="Visualize e edite perfis, funções, permissões e detalhes de usuários." delay={0.75} />
            <AdminNavCard href="/admin/ai-config" icon={Brain} title="Configuração de IA" description="Configure modelos, limites de tokens e comportamento da IA." badge="AI" delay={0.8} />
            <AdminNavCard href="/admin/subscriptions" icon={Gem} title="Assinaturas" description="Gerencie planos, upgrades, downgrades e histórico de pagamentos." delay={0.85} />
            <AdminNavCard href="/admin/analytics" icon={BarChart3} title="Analytics" description="Métricas de uso, performance, retenção e crescimento." delay={0.9} />
            <AdminNavCard href="/admin/security" icon={Lock} title="Segurança" description="Logs de acesso, tentativas de login, 2FA e políticas." delay={0.95} />
            <AdminNavCard href="/admin/infrastructure" icon={Server} title="Infraestrutura" description="Status dos servidores, CDN, databases e microserviços." delay={1.0} />
            <AdminNavCard href="/admin/ai-enhancements" icon={Sparkles} title="Melhorias de IA" description="IDEs avançadas, geração de áudio/música, modo sonho." badge="Premium" delay={1.05} />
            <AdminNavCard href="/admin/ai-evolution" icon={Cpu} title="Evolução de IA" description="Auto-evolução, auto-cura, pesquisa APIs e web avançado." badge="Experimental" delay={1.1} />
            <AdminNavCard href="/admin/ip-registry" icon={Globe} title="Registro de IP" description="Licenças, IPs permitidos e ingestão RAG por IP." delay={1.15} />
            <AdminNavCard href="/admin/audit-logs" icon={Terminal} title="Logs de Auditoria" description="Histórico completo de ações administrativas." delay={1.2} />
            <AdminNavCard href="/admin/content-moderation" icon={Eye} title="Moderação de Conteúdo" description="Review de projetos públicos, assets e comentários." delay={1.25} />
            <AdminNavCard href="/admin/system-health" icon={Activity} title="Saúde do Sistema" description="Monitoramento em tempo real de todos os serviços." delay={1.3} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="mt-8 p-4 rounded-xl border border-white/10 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-300">Ações Rápidas:</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-medium transition-colors border border-cyan-500/30">
                Enviar Notificação Global
              </button>
              <button className="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm font-medium transition-colors border border-purple-500/30">
                Exportar Relatório
              </button>
              <button className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium transition-colors border border-green-500/30">
                Verificar Sistema
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
