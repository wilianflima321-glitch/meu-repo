import React, { useState, useEffect, useRef } from 'react';
import { useIDEStore } from '@/store/ideStore';
import { startProfiling, stopProfiling, addProfileSample, getProfilingSessions } from '@/services/api';
import { 
  Activity, Play, Square, Clock, Cpu, HardDrive, Zap, TrendingUp,
  BarChart3, RefreshCw, Download, Trash2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const ProfilingTools = () => {
  const {
    currentProject, profilingSessions, setProfilingSessions,
    currentProfilingSession, setCurrentProfilingSession,
    profilingActive, setProfilingActive
  } = useIDEStore();
  
  const [samples, setSamples] = useState([]);
  const [summary, setSummary] = useState(null);
  const intervalRef = useRef(null);
  
  // Load sessions
  useEffect(() => {
    if (currentProject?.id) {
      loadSessions();
    }
  }, [currentProject?.id]);
  
  // Simulated profiling data collection
  useEffect(() => {
    if (profilingActive && currentProfilingSession) {
      intervalRef.current = setInterval(() => {
        const newSample = {
          timestamp: Date.now() / 1000,
          cpu: Math.random() * 100,
          memory: 30 + Math.random() * 40,
          fps: 55 + Math.random() * 10
        };
        
        setSamples(prev => [...prev.slice(-100), newSample]);
        
        // Send to backend
        addProfileSample(currentProfilingSession.id, newSample).catch(console.error);
      }, 100);
    } else {
      clearInterval(intervalRef.current);
    }
    
    return () => clearInterval(intervalRef.current);
  }, [profilingActive, currentProfilingSession]);
  
  const loadSessions = async () => {
    try {
      const response = await getProfilingSessions(currentProject.id);
      setProfilingSessions(response.data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };
  
  const handleStartProfiling = async () => {
    if (!currentProject?.id) return;
    try {
      const response = await startProfiling(currentProject.id, {
        name: `Session ${profilingSessions.length + 1}`
      });
      setCurrentProfilingSession(response.data);
      setProfilingActive(true);
      setSamples([]);
      setSummary(null);
    } catch (err) {
      console.error('Failed to start profiling:', err);
    }
  };
  
  const handleStopProfiling = async () => {
    if (!currentProfilingSession) return;
    try {
      const response = await stopProfiling(currentProfilingSession.id);
      setProfilingActive(false);
      setSummary(response.data.summary);
      await loadSessions();
    } catch (err) {
      console.error('Failed to stop profiling:', err);
    }
  };
  
  const currentStats = samples.length > 0 ? samples[samples.length - 1] : null;
  
  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-white">Profiler</span>
          {profilingActive && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Recording
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!profilingActive ? (
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleStartProfiling} data-testid="start-profiling">
              <Play className="w-3 h-3" /> Start
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-red-400" onClick={handleStopProfiling} data-testid="stop-profiling">
              <Square className="w-3 h-3" /> Stop
            </Button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Real-time Stats */}
          {currentStats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                  <Cpu className="w-3 h-3" /> CPU
                </div>
                <div className="text-xl font-bold text-blue-400">
                  {currentStats.cpu.toFixed(1)}%
                </div>
                <Progress value={currentStats.cpu} className="h-1 mt-2" />
              </div>
              
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                  <HardDrive className="w-3 h-3" /> Memory
                </div>
                <div className="text-xl font-bold text-green-400">
                  {currentStats.memory.toFixed(1)}%
                </div>
                <Progress value={currentStats.memory} className="h-1 mt-2" />
              </div>
              
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                  <Zap className="w-3 h-3" /> FPS
                </div>
                <div className="text-xl font-bold text-yellow-400">
                  {currentStats.fps.toFixed(0)}
                </div>
                <Progress value={(currentStats.fps / 60) * 100} className="h-1 mt-2" />
              </div>
            </div>
          )}
          
          {/* Charts */}
          {samples.length > 0 && (
            <div className="space-y-4">
              {/* CPU Chart */}
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xs text-zinc-400 mb-2">CPU Usage Over Time</div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={samples}>
                      <defs>
                        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#9CA3AF' }}
                      />
                      <Area type="monotone" dataKey="cpu" stroke="#3B82F6" fill="url(#cpuGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Memory Chart */}
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xs text-zinc-400 mb-2">Memory Usage Over Time</div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={samples}>
                      <defs>
                        <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#9CA3AF' }}
                      />
                      <Area type="monotone" dataKey="memory" stroke="#10B981" fill="url(#memGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          
          {/* Summary */}
          {summary && (
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Session Summary
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-zinc-500 text-xs">Total Samples</div>
                  <div className="text-white">{summary.total_samples}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">Duration</div>
                  <div className="text-white">{summary.duration?.toFixed(2)}s</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">Avg CPU</div>
                  <div className="text-blue-400">{summary.avg_cpu?.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">Peak CPU</div>
                  <div className="text-red-400">{summary.peak_cpu?.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">Avg Memory</div>
                  <div className="text-green-400">{summary.avg_memory?.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">Peak Memory</div>
                  <div className="text-yellow-400">{summary.peak_memory?.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Previous Sessions */}
          {profilingSessions.length > 0 && (
            <div>
              <div className="text-xs text-zinc-400 mb-2">Previous Sessions</div>
              <div className="space-y-2">
                {profilingSessions.slice(-5).map(session => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex items-center justify-between p-2 bg-zinc-800/50 rounded cursor-pointer hover:bg-zinc-800",
                      currentProfilingSession?.id === session.id && "ring-1 ring-green-500"
                    )}
                    onClick={() => setCurrentProfilingSession(session)}
                    data-testid={`session-${session.id}`}
                  >
                    <div>
                      <div className="text-sm text-white">{session.name}</div>
                      <div className="text-xs text-zinc-500">
                        {session.summary?.total_samples || 0} samples
                      </div>
                    </div>
                    <Clock className="w-4 h-4 text-zinc-500" />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {!profilingActive && samples.length === 0 && !summary && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="w-12 h-12 text-zinc-600 mb-3" />
              <p className="text-zinc-500 text-sm">Click Start to begin profiling</p>
              <p className="text-zinc-600 text-xs mt-1">Monitor CPU, memory, and performance in real-time</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProfilingTools;
