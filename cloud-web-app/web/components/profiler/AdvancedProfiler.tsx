/**
 * ADVANCED PROFILER - Aethel Engine
 * 
 * Profiler visual avançado no estilo Unreal Insights/Chrome DevTools.
 * Monitora performance em tempo real com visualizações detalhadas.
 * 
 * FEATURES:
 * - Frame timeline visualization
 * - GPU/CPU flame graphs
 * - Memory profiling
 * - Network stats
 * - Asset loading tracker
 * - Draw call breakdown
 * - Physics stats
 * - Custom markers
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { FrameTimeline } from './AdvancedProfiler.timeline';
import {
  categoryColors,
  type GPUStats,
  type MemoryStats,
  type ProfilerCategory,
  type ProfilerFrame,
  type ProfilerMarker,
  type ProfilerSession,
} from './AdvancedProfiler.types';

export type {
  GPUStats,
  MemoryStats,
  ProfilerCategory,
  ProfilerFrame,
  ProfilerMarker,
  ProfilerSession,
} from './AdvancedProfiler.types';

// ============================================================================
// FLAME GRAPH COMPONENT
// ============================================================================

interface FlameGraphProps {
  markers: ProfilerMarker[];
  frameTime: number;
  type: 'cpu' | 'gpu';
}

function FlameGraph({ markers, frameTime, type }: FlameGraphProps) {
  const [hoveredMarker, setHoveredMarker] = useState<ProfilerMarker | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  const flattenMarkers = useCallback((markers: ProfilerMarker[], depth = 0): (ProfilerMarker & { depth: number })[] => {
    const result: (ProfilerMarker & { depth: number })[] = [];
    
    for (const marker of markers) {
      result.push({ ...marker, depth });
      if (marker.children) {
        result.push(...flattenMarkers(marker.children, depth + 1));
      }
    }
    
    return result;
  }, []);
  
  const flatMarkers = useMemo(() => flattenMarkers(markers), [markers, flattenMarkers]);
  const maxDepth = useMemo(() => Math.max(...flatMarkers.map(m => m.depth), 0) + 1, [flatMarkers]);
  
  const handleMouseMove = (e: React.MouseEvent, marker: ProfilerMarker) => {
    setHoveredMarker(marker);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '8px' }}>
        {type === 'cpu' ? 'CPU' : 'GPU'} Flame Graph
      </h3>
      
      <div style={{
        background: '#0f172a',
        borderRadius: '8px',
        padding: '8px',
        position: 'relative',
        minHeight: `${maxDepth * 24 + 16}px`,
      }}>
        {flatMarkers.map((marker) => {
          const left = (marker.startTime / frameTime) * 100;
          const width = Math.max(0.5, (marker.duration / frameTime) * 100);
          
          return (
            <div
              key={marker.id}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${width}%`,
                top: `${marker.depth * 24 + 8}px`,
                height: '20px',
                background: categoryColors[marker.category] || marker.color,
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 4px',
                cursor: 'pointer',
                overflow: 'hidden',
                border: hoveredMarker?.id === marker.id ? '1px solid white' : 'none',
              }}
              onMouseMove={(e) => handleMouseMove(e, marker)}
              onMouseLeave={() => setHoveredMarker(null)}
            >
              <span style={{
                fontSize: '10px',
                color: 'white',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {marker.name}
              </span>
            </div>
          );
        })}
        
        {/* Time scale */}
        <div style={{
          position: 'absolute',
          bottom: '4px',
          left: '8px',
          right: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '9px',
          color: '#64748b',
        }}>
          <span>0ms</span>
          <span>{(frameTime / 4).toFixed(1)}ms</span>
          <span>{(frameTime / 2).toFixed(1)}ms</span>
          <span>{((frameTime * 3) / 4).toFixed(1)}ms</span>
          <span>{frameTime.toFixed(1)}ms</span>
        </div>
      </div>
      
      {/* Tooltip */}
      {hoveredMarker && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x + 10,
            top: tooltipPos.y + 10,
            background: '#1e293b',
            border: '1px solid #374151',
            borderRadius: '6px',
            padding: '8px 12px',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: 'white', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
            {hoveredMarker.name}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px' }}>
            Duration: {hoveredMarker.duration.toFixed(3)}ms
          </div>
          <div style={{ color: '#64748b', fontSize: '10px' }}>
            Category: {hoveredMarker.category}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MEMORY PANEL COMPONENT
// ============================================================================

interface MemoryPanelProps {
  stats: MemoryStats;
  history: MemoryStats[];
}

function MemoryPanel({ stats, history }: MemoryPanelProps) {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  
  const usagePercent = (stats.usedHeap / stats.totalHeap) * 100;
  
  return (
    <div style={{
      padding: '12px',
      background: '#0f172a',
      borderRadius: '8px',
    }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Memory</h3>
      
      {/* Heap usage bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Heap Usage</span>
          <span style={{ color: '#64748b', fontSize: '11px' }}>
            {formatBytes(stats.usedHeap)} / {formatBytes(stats.totalHeap)}
          </span>
        </div>
        <div style={{
          height: '8px',
          background: '#1e293b',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div
            style={{
              width: `${usagePercent}%`,
              height: '100%',
              background: usagePercent > 80 ? '#ef4444' : usagePercent > 60 ? '#f59e0b' : '#22c55e',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
      
      {/* Memory breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ padding: '8px', background: '#1e293b', borderRadius: '4px' }}>
          <div style={{ color: '#64748b', fontSize: '10px' }}>Textures</div>
          <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
            {formatBytes(stats.textures)}
          </div>
        </div>
        
        <div style={{ padding: '8px', background: '#1e293b', borderRadius: '4px' }}>
          <div style={{ color: '#64748b', fontSize: '10px' }}>Geometries</div>
          <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
            {formatBytes(stats.geometries)}
          </div>
        </div>
        
        <div style={{ padding: '8px', background: '#1e293b', borderRadius: '4px' }}>
          <div style={{ color: '#64748b', fontSize: '10px' }}>Materials</div>
          <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
            {formatBytes(stats.materials)}
          </div>
        </div>
        
        <div style={{ padding: '8px', background: '#1e293b', borderRadius: '4px' }}>
          <div style={{ color: '#64748b', fontSize: '10px' }}>Shaders</div>
          <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
            {formatBytes(stats.shaders)}
          </div>
        </div>
      </div>
      
      {/* Memory graph */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>History</div>
        <div style={{
          height: '50px',
          background: '#1e293b',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '4px',
          gap: '1px',
        }}>
          {history.slice(-50).map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${(h.usedHeap / h.totalHeap) * 100}%`,
                background: '#3b82f6',
                borderRadius: '1px',
                minWidth: '2px',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STATS PANEL COMPONENT
// ============================================================================

interface StatsPanelProps {
  frame: ProfilerFrame | null;
  session: ProfilerSession;
}

function StatsPanel({ frame, session }: StatsPanelProps) {
  const currentFPS = frame ? 1000 / frame.duration : 0;
  
  return (
    <div style={{
      padding: '12px',
      background: '#0f172a',
      borderRadius: '8px',
    }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Statistics</h3>
      
      {/* FPS display */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
      }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: `conic-gradient(
            ${currentFPS >= 60 ? '#22c55e' : currentFPS >= 30 ? '#f59e0b' : '#ef4444'} ${(currentFPS / 60) * 360}deg,
            #1e293b ${(currentFPS / 60) * 360}deg
          )`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
              {currentFPS.toFixed(0)}
            </span>
            <span style={{ color: '#64748b', fontSize: '10px' }}>FPS</span>
          </div>
        </div>
      </div>
      
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <StatBox label="Frame Time" value={`${frame?.duration.toFixed(2) ?? 0}ms`} />
        <StatBox label="CPU Time" value={`${frame?.cpuTime.toFixed(2) ?? 0}ms`} />
        <StatBox label="GPU Time" value={`${frame?.gpuTime.toFixed(2) ?? 0}ms`} />
        <StatBox label="Draw Calls" value={`${frame?.drawCalls ?? 0}`} />
        <StatBox label="Triangles" value={`${((frame?.triangles ?? 0) / 1000).toFixed(1)}K`} />
        <StatBox label="Vertices" value={`${((frame?.vertices ?? 0) / 1000).toFixed(1)}K`} />
      </div>
      
      {/* Session stats */}
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #374151' }}>
        <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '8px' }}>Session Statistics</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <StatBox label="Avg FPS" value={session.averageFPS.toFixed(0)} small />
          <StatBox label="Min FPS" value={session.minFPS.toFixed(0)} small warning={session.minFPS < 30} />
          <StatBox label="Max FPS" value={session.maxFPS.toFixed(0)} small />
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, small, warning }: { label: string; value: string; small?: boolean; warning?: boolean }) {
  return (
    <div style={{
      padding: small ? '6px' : '8px',
      background: '#1e293b',
      borderRadius: '4px',
      border: warning ? '1px solid #ef4444' : 'none',
    }}>
      <div style={{ color: '#64748b', fontSize: small ? '9px' : '10px' }}>{label}</div>
      <div style={{ 
        color: warning ? '#ef4444' : 'white', 
        fontSize: small ? '12px' : '14px', 
        fontWeight: 'bold' 
      }}>
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORY BREAKDOWN
// ============================================================================

interface CategoryBreakdownProps {
  markers: ProfilerMarker[];
  frameTime: number;
}

function CategoryBreakdown({ markers, frameTime }: CategoryBreakdownProps) {
  const categoryTimes = useMemo(() => {
    const times: Record<ProfilerCategory, number> = {
      render: 0, physics: 0, animation: 0, ai: 0, audio: 0,
      scripts: 0, ui: 0, network: 0, loading: 0, custom: 0,
    };
    
    const sumMarkers = (markers: ProfilerMarker[]) => {
      for (const marker of markers) {
        times[marker.category] = (times[marker.category] || 0) + marker.duration;
        if (marker.children) sumMarkers(marker.children);
      }
    };
    
    sumMarkers(markers);
    return times;
  }, [markers]);
  
  const sortedCategories = useMemo(() => {
    return Object.entries(categoryTimes)
      .filter(([_, time]) => time > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [categoryTimes]);
  
  return (
    <div style={{
      padding: '12px',
      background: '#0f172a',
      borderRadius: '8px',
    }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Category Breakdown</h3>
      
      {sortedCategories.map(([category, time]) => {
        const percent = (time / frameTime) * 100;
        
        return (
          <div key={category} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  background: categoryColors[category as ProfilerCategory],
                }} />
                <span style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'capitalize' }}>
                  {category}
                </span>
              </div>
              <span style={{ color: '#64748b', fontSize: '11px' }}>
                {time.toFixed(2)}ms ({percent.toFixed(1)}%)
              </span>
            </div>
            <div style={{
              height: '4px',
              background: '#1e293b',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div
                style={{
                  width: `${Math.min(100, percent)}%`,
                  height: '100%',
                  background: categoryColors[category as ProfilerCategory],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN PROFILER COMPONENT
// ============================================================================

export interface AdvancedProfilerProps {
  onCapture?: () => ProfilerFrame;
  autoCapture?: boolean;
  maxFrames?: number;
}

export function AdvancedProfiler({
  onCapture,
  autoCapture = true,
  maxFrames = 300,
}: AdvancedProfilerProps) {
  // Session state
  const [session, setSession] = useState<ProfilerSession>(() => ({
    id: crypto.randomUUID(),
    name: 'Session 1',
    startTime: Date.now(),
    frames: [],
    averageFPS: 0,
    minFPS: Infinity,
    maxFPS: 0,
  }));
  
  const [isRecording, setIsRecording] = useState(autoCapture);
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [viewRange, setViewRange] = useState({ start: 0, end: 100 });
  const [activeTab, setActiveTab] = useState<'timeline' | 'memory' | 'gpu'>('timeline');
  const [memoryHistory, setMemoryHistory] = useState<MemoryStats[]>([]);
  
  // Generate mock frame data for demo
  const generateMockFrame = useCallback((): ProfilerFrame => {
    const baseTime = 10 + Math.random() * 10;
    const spike = Math.random() > 0.95 ? 20 : 0;
    const duration = baseTime + spike;
    
    return {
      frameId: session.frames.length,
      timestamp: Date.now(),
      duration,
      cpuTime: duration * 0.7,
      gpuTime: duration * 0.3,
      markers: [
        {
          id: crypto.randomUUID(),
          name: 'Render',
          category: 'render',
          startTime: 0,
          duration: duration * 0.4,
          depth: 0,
          color: categoryColors.render,
          children: [
            {
              id: crypto.randomUUID(),
              name: 'Shadow Pass',
              category: 'render',
              startTime: 0,
              duration: duration * 0.15,
              depth: 1,
              color: categoryColors.render,
            },
            {
              id: crypto.randomUUID(),
              name: 'Main Pass',
              category: 'render',
              startTime: duration * 0.15,
              duration: duration * 0.2,
              depth: 1,
              color: categoryColors.render,
            },
          ],
        },
        {
          id: crypto.randomUUID(),
          name: 'Physics',
          category: 'physics',
          startTime: duration * 0.4,
          duration: duration * 0.2,
          depth: 0,
          color: categoryColors.physics,
        },
        {
          id: crypto.randomUUID(),
          name: 'Animation',
          category: 'animation',
          startTime: duration * 0.6,
          duration: duration * 0.15,
          depth: 0,
          color: categoryColors.animation,
        },
        {
          id: crypto.randomUUID(),
          name: 'Scripts',
          category: 'scripts',
          startTime: duration * 0.75,
          duration: duration * 0.1,
          depth: 0,
          color: categoryColors.scripts,
        },
        {
          id: crypto.randomUUID(),
          name: 'UI',
          category: 'ui',
          startTime: duration * 0.85,
          duration: duration * 0.1,
          depth: 0,
          color: categoryColors.ui,
        },
      ],
      memory: {
        totalHeap: 256 * 1024 * 1024,
        usedHeap: (128 + Math.random() * 64) * 1024 * 1024,
        textures: 64 * 1024 * 1024,
        geometries: 32 * 1024 * 1024,
        materials: 8 * 1024 * 1024,
        shaders: 4 * 1024 * 1024,
      },
      drawCalls: 500 + Math.floor(Math.random() * 200),
      triangles: 500000 + Math.floor(Math.random() * 200000),
      vertices: 250000 + Math.floor(Math.random() * 100000),
    };
  }, [session.frames.length]);
  
  // Recording loop
  useEffect(() => {
    if (!isRecording) return;
    
    const interval = setInterval(() => {
      const frame = onCapture?.() ?? generateMockFrame();
      
      setSession(prev => {
        const frames = [...prev.frames, frame].slice(-maxFrames);
        const fps = 1000 / frame.duration;
        const totalFPS = frames.reduce((sum, f) => sum + 1000 / f.duration, 0);
        
        return {
          ...prev,
          frames,
          averageFPS: totalFPS / frames.length,
          minFPS: Math.min(prev.minFPS === Infinity ? fps : prev.minFPS, fps),
          maxFPS: Math.max(prev.maxFPS, fps),
        };
      });
      
      setMemoryHistory(prev => [...prev.slice(-100), frame.memory]);
      
      // Auto-scroll
      setViewRange(prev => {
        const frameCount = session.frames.length + 1;
        if (frameCount > prev.end) {
          const viewSize = prev.end - prev.start;
          return { start: frameCount - viewSize, end: frameCount };
        }
        return prev;
      });
    }, 16);
    
    return () => clearInterval(interval);
  }, [isRecording, onCapture, generateMockFrame, maxFrames, session.frames.length]);
  
  const currentFrame = selectedFrame !== null 
    ? session.frames.find(f => f.frameId === selectedFrame) 
    : session.frames[session.frames.length - 1];
  
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0f172a' }}>
      {/* Main content */}
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <h2 style={{ color: 'white', fontSize: '18px' }}>📊 Advanced Profiler</h2>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsRecording(!isRecording)}
              style={{
                background: isRecording ? '#ef4444' : '#22c55e',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              {isRecording ? '⏹ Stop' : '⏺ Record'}
            </button>
            
            <button
              onClick={() => {
                setSession({
                  id: crypto.randomUUID(),
                  name: `Session ${Date.now()}`,
                  startTime: Date.now(),
                  frames: [],
                  averageFPS: 0,
                  minFPS: Infinity,
                  maxFPS: 0,
                });
                setSelectedFrame(null);
              }}
              style={{
                background: '#1e293b',
                border: '1px solid #374151',
                borderRadius: '6px',
                padding: '8px 16px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              🗑 Clear
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {(['timeline', 'memory', 'gpu'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? '#3b82f6' : '#1e293b',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'timeline' && (
            <>
              <FrameTimeline
                frames={session.frames}
                selectedFrame={selectedFrame}
                onSelectFrame={setSelectedFrame}
                viewRange={viewRange}
                onViewRangeChange={setViewRange}
              />
              
              {currentFrame && (
                <FlameGraph
                  markers={currentFrame.markers}
                  frameTime={currentFrame.duration}
                  type="cpu"
                />
              )}
            </>
          )}
          
          {activeTab === 'memory' && currentFrame && (
            <MemoryPanel stats={currentFrame.memory} history={memoryHistory} />
          )}
          
          {activeTab === 'gpu' && currentFrame && (
            <FlameGraph
              markers={currentFrame.markers.filter(m => m.category === 'render')}
              frameTime={currentFrame.gpuTime}
              type="gpu"
            />
          )}
        </div>
      </div>
      
      {/* Right sidebar */}
      <div style={{
        width: '300px',
        borderLeft: '1px solid #1e293b',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto',
      }}>
        <StatsPanel frame={currentFrame ?? null} session={session} />
        
        {currentFrame && (
          <CategoryBreakdown markers={currentFrame.markers} frameTime={currentFrame.duration} />
        )}
      </div>
    </div>
  );
}

export default AdvancedProfiler;
