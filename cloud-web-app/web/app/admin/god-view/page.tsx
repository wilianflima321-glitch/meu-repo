'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Eye,
  Users,
  Activity,
  Globe,
  Monitor,
  Smartphone,
  MapPin,
  Clock,
  Bot,
  DollarSign,
  Pause,
  Play,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  Zap,
  MousePointer,
  Code,
  FileCode,
  Box
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface LiveSession {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  
  projectId?: string;
  projectName?: string;
  
  socketId?: string;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  
  currentPage?: string;
  currentTool?: string;
  lastAction?: string;
  
  aiCallsCount: number;
  aiTokensUsed: number;
  aiCostIncurred: number;
  
  startedAt: string;
  lastPingAt: string;
  
  isActive: boolean;
  
  // Derived
  duration: number; // seconds
  device: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
}

interface GodViewStats {
  totalActive: number;
  totalAICalls: number;
  totalAICost: number;
  totalTokens: number;
  byCountry: { country: string; count: number }[];
  byDevice: { device: string; count: number }[];
  byPlan: { plan: string; count: number }[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function parseUserAgent(ua?: string): { device: 'desktop' | 'mobile' | 'tablet'; browser?: string } {
  if (!ua) return { device: 'desktop' };
  
  const isMobile = /Mobile|Android|iPhone|iPod/.test(ua);
  const isTablet = /iPad|Tablet/.test(ua);
  
  let browser: string | undefined;
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  return {
    device: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
    browser,
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function getToolIcon(tool?: string) {
  if (!tool) return Box;
  const lower = tool.toLowerCase();
  if (lower.includes('code') || lower.includes('script')) return Code;
  if (lower.includes('file')) return FileCode;
  if (lower.includes('ai') || lower.includes('copilot')) return Bot;
  return Box;
}

// =============================================================================
// COMPONENTS
// =============================================================================

function StatsOverview({ stats }: { stats: GodViewStats }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase">Live Users</span>
          <Users className="w-4 h-4 text-green-400" />
        </div>
        <p className="text-3xl font-bold text-white">{stats.totalActive}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">Live</span>
        </div>
      </div>
      
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase">AI Calls</span>
          <Bot className="w-4 h-4 text-blue-400" />
        </div>
        <p className="text-3xl font-bold text-white">{stats.totalAICalls.toLocaleString()}</p>
        <p className="text-xs text-gray-500 mt-2">{stats.totalTokens.toLocaleString()} tokens</p>
      </div>
      
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase">AI Cost (Live)</span>
          <DollarSign className="w-4 h-4 text-yellow-400" />
        </div>
        <p className="text-3xl font-bold text-white">${stats.totalAICost.toFixed(2)}</p>
        <p className="text-xs text-gray-500 mt-2">Current sessions</p>
      </div>
      
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase">Top Region</span>
          <Globe className="w-4 h-4 text-purple-400" />
        </div>
        <p className="text-3xl font-bold text-white">
          {stats.byCountry[0]?.country || 'N/A'}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {stats.byCountry[0]?.count || 0} users
        </p>
      </div>
    </div>
  );
}

function SessionCard({ 
  session, 
  isExpanded, 
  onToggle 
}: { 
  session: LiveSession; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const DeviceIcon = session.device === 'mobile' ? Smartphone : Monitor;
  const ToolIcon = getToolIcon(session.currentTool);
  
  return (
    <div 
      className={`
        bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden
        ${session.aiCostIncurred > 1 ? 'border-l-4 border-l-yellow-500' : ''}
      `}
    >
      {/* Header Row */}
      <div 
        className="p-4 cursor-pointer hover:bg-[#252525] transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Status Indicator */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#252525] flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {session.userName?.charAt(0) || session.userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-[#1a1a1a]" />
            </div>
            
            {/* User Info */}
            <div>
              <p className="text-sm font-medium text-white">
                {session.userName || session.userEmail}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {session.projectName && (
                  <span className="text-xs text-gray-400">
                    {session.projectName}
                  </span>
                )}
                {session.country && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {session.city && `${session.city}, `}{session.country}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-gray-400">Duration</p>
              <p className="text-sm text-white flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(session.duration)}
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-gray-400">AI Calls</p>
              <p className="text-sm text-white flex items-center gap-1">
                <Bot className="w-3 h-3" />
                {session.aiCallsCount}
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-gray-400">Cost</p>
              <p className={`text-sm font-medium flex items-center gap-1 ${
                session.aiCostIncurred > 1 ? 'text-yellow-400' : 'text-white'
              }`}>
                <DollarSign className="w-3 h-3" />
                {session.aiCostIncurred.toFixed(3)}
              </p>
            </div>
            
            <DeviceIcon className="w-4 h-4 text-gray-500" />
            
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`} />
          </div>
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[#333] pt-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Activity */}
            <div className="space-y-3">
              <h4 className="text-xs text-gray-400 uppercase">Current Activity</h4>
              
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-400">Page</p>
                  <p className="text-sm text-white">{session.currentPage || 'Unknown'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <ToolIcon className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-400">Active Tool</p>
                  <p className="text-sm text-white">{session.currentTool || 'None'}</p>
                </div>
              </div>
              
              {session.lastAction && (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-400">Last Action</p>
                    <p className="text-sm text-white">{session.lastAction}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Technical */}
            <div className="space-y-3">
              <h4 className="text-xs text-gray-400 uppercase">Technical</h4>
              
              <div>
                <p className="text-xs text-gray-400">Session ID</p>
                <p className="text-sm text-white font-mono">{session.id.slice(0, 12)}...</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-400">IP Address</p>
                <p className="text-sm text-white font-mono">{session.ipAddress || 'Unknown'}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-400">Browser</p>
                <p className="text-sm text-white">{session.browser || 'Unknown'}</p>
              </div>
            </div>
            
            {/* AI Usage */}
            <div className="space-y-3">
              <h4 className="text-xs text-gray-400 uppercase">AI Usage</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#252525] rounded p-2">
                  <p className="text-xs text-gray-400">Calls</p>
                  <p className="text-lg font-medium text-white">{session.aiCallsCount}</p>
                </div>
                
                <div className="bg-[#252525] rounded p-2">
                  <p className="text-xs text-gray-400">Tokens</p>
                  <p className="text-lg font-medium text-white">
                    {session.aiTokensUsed.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="bg-[#252525] rounded p-2">
                <p className="text-xs text-gray-400">Session Cost</p>
                <p className={`text-xl font-bold ${
                  session.aiCostIncurred > 1 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  ${session.aiCostIncurred.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WorldMap({ byCountry }: { byCountry: { country: string; count: number }[] }) {
  // Simplified text representation - in production use a proper map library
  const maxCount = Math.max(...byCountry.map(c => c.count), 1);
  
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <Globe className="w-4 h-4" />
        Active by Region
      </h3>
      
      <div className="space-y-2">
        {byCountry.slice(0, 10).map(({ country, count }) => (
          <div key={country} className="flex items-center gap-3">
            <span className="text-sm text-gray-400 w-20 truncate">{country}</span>
            <div className="flex-1 h-2 bg-[#252525] rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-300 w-12 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function GodViewPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [stats, setStats] = useState<GodViewStats>({
    totalActive: 0,
    totalAICalls: 0,
    totalAICost: 0,
    totalTokens: 0,
    byCountry: [],
    byDevice: [],
    byPlan: [],
  });
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'duration' | 'cost' | 'ai'>('duration');
  
  const fetchSessions = useCallback(async () => {
    if (paused) return;
    
    try {
      const res = await fetch('/api/admin/god-view/sessions');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      // Enrich sessions with derived data
      const enriched = data.sessions.map((s: any) => {
        const { device, browser } = parseUserAgent(s.userAgent);
        const duration = Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000);
        return { ...s, device, browser, duration };
      });
      
      setSessions(enriched);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [paused]);
  
  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // 5s refresh for live feel
    return () => clearInterval(interval);
  }, [fetchSessions]);
  
  // Filter and sort sessions
  const filteredSessions = sessions
    .filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.userEmail.toLowerCase().includes(q) ||
        s.userName?.toLowerCase().includes(q) ||
        s.projectName?.toLowerCase().includes(q) ||
        s.country?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'cost': return b.aiCostIncurred - a.aiCostIncurred;
        case 'ai': return b.aiCallsCount - a.aiCallsCount;
        default: return b.duration - a.duration;
      }
    });
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Eye className="w-6 h-6" />
            God View
            {!paused && (
              <span className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-400">
            Real-time view of all active user sessions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users, projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-sm text-white placeholder-gray-500 w-64"
            />
          </div>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-sm text-white"
          >
            <option value="duration">Sort by Duration</option>
            <option value="cost">Sort by AI Cost</option>
            <option value="ai">Sort by AI Calls</option>
          </select>
          
          {/* Pause/Play */}
          <button
            onClick={() => setPaused(!paused)}
            className={`p-2 rounded-lg border ${
              paused 
                ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' 
                : 'border-[#333] text-gray-400 hover:text-white'
            }`}
            title={paused ? 'Resume live updates' : 'Pause live updates'}
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          
          {/* Manual Refresh */}
          <button
            onClick={fetchSessions}
            className="p-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Stats Overview */}
      <StatsOverview stats={stats} />
      
      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Sessions List */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400">
              {filteredSessions.length} Active Sessions
            </h2>
          </div>
          
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-[#1a1a1a] border border-[#333] rounded-lg">
              <Users className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-400">No active sessions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isExpanded={expandedId === session.id}
                  onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Side Panel */}
        <div className="space-y-4">
          <WorldMap byCountry={stats.byCountry} />
          
          {/* Device Breakdown */}
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Device Types
            </h3>
            
            <div className="space-y-3">
              {stats.byDevice.map(({ device, count }) => (
                <div key={device} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {device === 'mobile' ? (
                      <Smartphone className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Monitor className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-300 capitalize">{device}</span>
                  </div>
                  <span className="text-sm text-white font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* High Cost Alert */}
          {filteredSessions.some(s => s.aiCostIncurred > 1) && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">High AI Usage</span>
              </div>
              <p className="text-xs text-gray-400">
                {filteredSessions.filter(s => s.aiCostIncurred > 1).length} session(s) 
                have exceeded $1 in AI costs this session.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
