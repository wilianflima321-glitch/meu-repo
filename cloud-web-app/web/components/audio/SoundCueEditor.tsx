'use client';

/**
 * Sound cue node editor - Aethel Engine.
 * Visual graph for routing, modulation, effects, spatialization and preview.
 *
 * Core capabilities:
 * - Node-based audio graph
 * - Mixer/routing nodes
 * - Modulation (LFO, envelope, random)
 * - Effects (reverb, delay, filter, distortion)
 * - 3D spatialization
 * - Real-time preview
 * - Attenuation visualization
 * - Parameter binding
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Music } from 'lucide-react';
import { createComponentLogger } from '@/lib/observability/logger'
import { nodeDefinitions } from './sound-cue-models';
import { SoundNode, type SoundNodeData } from './SoundCueEditor.node';
import { playSoundCuePreview, type SoundCuePlaybackHandle } from '@/lib/audio/sound-cue-playback';
import type {
  SoundCue,
  SoundCueConnection,
  SoundCueNode,
  SoundCueParameter,
  SoundNodeDefinition,
  SoundNodeType,
} from './sound-cue-models';

const log = createComponentLogger('SoundCueEditor')

export type {
  SoundCue,
  SoundCueConnection,
  SoundCueNode,
  SoundCueParameter,
  SoundNodeDefinition,
  SoundNodeType,
} from './sound-cue-models';
// ============================================================================
// NODE CATALOG
// ============================================================================

interface NodeCatalogProps {
  onAddNode: (type: SoundNodeType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function NodeCatalog({ onAddNode, searchQuery, onSearchChange }: NodeCatalogProps) {
  const categories = useMemo(() => {
    const cats: Record<string, SoundNodeDefinition[]> = {};

    Object.values(nodeDefinitions).forEach((def) => {
      if (!cats[def.category]) cats[def.category] = [];
      cats[def.category].push(def);
    });

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      Object.keys(cats).forEach((cat) => {
        cats[cat] = cats[cat].filter((def) =>
          def.name.toLowerCase().includes(query) ||
          def.category.toLowerCase().includes(query)
        );
        if (cats[cat].length === 0) delete cats[cat];
      });
    }

    return cats;
  }, [searchQuery]);

  return (
    <div style={{ padding: '12px', background: 'var(--aethel-surface-primary)', borderRadius: '8px' }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Node Catalog</h3>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search nodes..."
        style={{
          width: '100%',
          background: 'var(--aethel-surface-secondary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '4px',
          padding: '8px',
          color: 'white',
          fontSize: '12px',
          marginBottom: '12px',
        }}
      />

      {/* Categories */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {Object.entries(categories).map(([category, nodes]) => (
          <div key={category} style={{ marginBottom: '12px' }}>
            <h4 style={{
              color: 'var(--aethel-text-muted)',
              fontSize: '11px',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              {category}
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {nodes.map((def) => (
                <button type="button" aria-label={`Add node ${def.type}`}
                  key={def.type}
                  onClick={() => onAddNode(def.type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--aethel-surface-secondary)',
                    border: '1px solid var(--aethel-border-primary)',
                    borderRadius: '4px',
                    padding: '6px 10px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    background: def.color,
                  }} />
                  {def.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PREVIEW PANEL
// ============================================================================

interface PreviewPanelProps {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

function VUMeterChannel({ label, level }: { label: 'L' | 'R'; level: number }) {
  // level: 0..1 (0 = silence, 1 = 0dBFS clipping)
  const db = level > 0 ? 20 * Math.log10(level) : -Infinity;
  const isClipping = level >= 1.0;
  const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '28px' }}>
      {/* Channel label */}
      <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--aethel-text-quaternary)', textTransform: 'uppercase' }}>{label}</span>

      {/* Clipping LED */}
      <div style={{
        width: '20px',
        height: '8px',
        borderRadius: '2px',
        background: isClipping ? 'var(--aethel-error)' : 'color-mix(in srgb, var(--aethel-error) 22%, transparent)',
        border: '1px solid color-mix(in srgb, var(--aethel-error) 35%, transparent)',
        transition: 'background 80ms',
      }} />

      {/* Meter bar (vertical, bottom-up) */}
      <div style={{
        position: 'relative',
        width: '20px',
        height: '120px',
        background: 'var(--aethel-surface-primary)',
        borderRadius: '3px',
        overflow: 'hidden',
        border: '1px solid var(--aethel-border-subtle)',
      }}>
        {/* Gradient fill — green → yellow → red */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${pct}%`,
          background: 'linear-gradient(to top, var(--aethel-success) 0%, #a3e635 60%, var(--aethel-warning) 80%, var(--aethel-error) 100%)',
          borderRadius: '0 0 2px 2px',
          transition: 'height 60ms linear',
        }} />
        {/* dB scale notches */}
        {[-6, -12, -24, -48].map((dbMark) => {
          const markPct = ((dbMark + 60) / 60) * 100;
          return (
            <div
              key={dbMark}
              style={{
                position: 'absolute',
                bottom: `${markPct}%`,
                left: 0,
                right: 0,
                height: '1px',
                background: 'color-mix(in srgb, white 20%, transparent)',
              }}
            />
          );
        })}
      </div>

      {/* dB readout */}
      <span style={{ fontSize: '9px', fontFamily: 'monospace', color: isClipping ? 'var(--aethel-error)' : 'var(--aethel-text-quaternary)' }}>
        {db === -Infinity ? '-inf' : `${db.toFixed(1)}`}
      </span>
    </div>
  );
}

function PreviewPanel({ isPlaying, onPlay, onStop, volume, onVolumeChange }: PreviewPanelProps) {
  // Simulate animated meter levels when playing (no real AnalyserNode wired yet —
  // this is authoring state. The real AnalyserNode feeds from sound-cue-playback.ts)
  const [meterL, setMeterL] = useState(0);
  const [meterR, setMeterR] = useState(0);

  useEffect(() => {
    if (!isPlaying) {
      setMeterL(0);
      setMeterR(0);
      return;
    }
    const interval = setInterval(() => {
      // Deterministic pseudo-animation tied to volume for honest representation
      const base = volume * (0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 300)));
      setMeterL(Math.min(1, base * (0.85 + 0.15 * Math.abs(Math.sin(Date.now() / 120)))));
      setMeterR(Math.min(1, base * (0.85 + 0.15 * Math.abs(Math.cos(Date.now() / 140)))));
    }, 60);
    return () => clearInterval(interval);
  }, [isPlaying, volume]);

  return (
    <div style={{
      padding: '12px',
      background: 'var(--aethel-surface-primary)',
      borderRadius: '8px',
    }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Preview</h3>

      {/* Playback controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button type="button" aria-label={isPlaying ? 'Stop audio preview' : 'Start audio preview'}
          onClick={isPlaying ? onStop : onPlay}
          style={{
            flex: 1,
            background: isPlaying ? 'var(--aethel-error)' : 'var(--aethel-success)',
            border: 'none',
            borderRadius: '6px',
            padding: '10px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          {isPlaying ? 'Stop' : 'Play'}
        </button>
      </div>

      {/* Volume */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '12px' }}>Master Volume</label>
          <span style={{ color: 'var(--aethel-text-muted)', fontFamily: 'monospace', fontSize: '11px' }}>{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* VU Peak Meters — Stereo L/R with dB scale and clipping LED */}
      <div style={{
        marginTop: '16px',
        padding: '10px',
        background: 'var(--aethel-surface-secondary)',
        borderRadius: '6px',
        border: '1px solid var(--aethel-border-subtle)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--aethel-text-quaternary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            VU Peak Meter
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            {[-6, -12, -24, -48].map((db) => (
              <span key={db} style={{ fontSize: '8px', fontFamily: 'monospace', color: 'var(--aethel-text-quaternary)' }}>
                {db}dB
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <VUMeterChannel label="L" level={meterL} />
          <VUMeterChannel label="R" level={meterR} />
        </div>
      </div>

      {/* 5-Band Parametric EQ display (authored values, no live DSP in web mode) */}
      <div style={{
        marginTop: '12px',
        padding: '10px',
        background: 'var(--aethel-surface-secondary)',
        borderRadius: '6px',
        border: '1px solid var(--aethel-border-subtle)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--aethel-text-quaternary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            5-Band EQ
          </span>
          <span style={{ fontSize: '9px', color: 'var(--aethel-neon-cyan)', fontFamily: 'monospace' }}>
            20Hz–20kHz
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
          {[
            { label: 'LF', freq: '80Hz', gain: 0 },
            { label: 'LMF', freq: '300Hz', gain: 0 },
            { label: 'MF', freq: '1kHz', gain: 0 },
            { label: 'HMF', freq: '4kHz', gain: 0 },
            { label: 'HF', freq: '12kHz', gain: 0 },
          ].map((band) => (
            <div key={band.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
              <span style={{ fontSize: '9px', color: 'var(--aethel-text-quaternary)', fontFamily: 'monospace' }}>{band.freq}</span>
              <input
                type="range"
                min={-24}
                max={24}
                step={0.5}
                defaultValue={0}
                aria-label={`EQ band ${band.label} gain`}
                style={{
                  writingMode: 'vertical-lr',
                  direction: 'rtl',
                  height: '64px',
                  width: '20px',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '8px', color: 'var(--aethel-text-quaternary)', fontFamily: 'monospace' }}>{band.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Deterministic bar heights for the decorative playback indicator above —
// fixed pattern, not Math.random(), so it doesn't imply real amplitude data.
const EQUALIZER_BAR_HEIGHTS = Array.from({ length: 20 }, (_, i) =>
  20 + Math.round(12 * Math.abs(Math.sin(i * 0.7)))
);

// ============================================================================
// PARAMETERS PANEL
// ============================================================================

interface ParametersPanelProps {
  parameters: SoundCueParameter[];
  onChange: (params: SoundCueParameter[]) => void;
  runtimeValues: Record<string, number | boolean>;
  onRuntimeValueChange: (id: string, value: number | boolean) => void;
}

function ParametersPanel({ parameters, onChange, runtimeValues, onRuntimeValueChange }: ParametersPanelProps) {
  const [newParamName, setNewParamName] = useState('');

  const addParameter = () => {
    if (!newParamName.trim()) return;

    const newParam: SoundCueParameter = {
      id: crypto.randomUUID(),
      name: newParamName,
      type: 'float',
      defaultValue: 0,
      min: 0,
      max: 1,
    };

    onChange([...parameters, newParam]);
    setNewParamName('');
  };

  return (
    <div style={{
      padding: '12px',
      background: 'var(--aethel-surface-primary)',
      borderRadius: '8px',
    }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Cue Parameters</h3>

      {/* Parameter list */}
      <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
        {parameters.map((param) => (
          <div
            key={param.id}
            style={{
              padding: '8px',
              background: 'var(--aethel-surface-secondary)',
              borderRadius: '4px',
              marginBottom: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'white', fontSize: '12px' }}>{param.name}</span>
              <button type="button" aria-label={`Remove parameter ${param.name}`}
                onClick={() => onChange(parameters.filter(p => p.id !== param.id))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--aethel-error)',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ×
              </button>
            </div>

            {param.type === 'float' && (
              <>
                <input
                  type="range"
                  min={param.min ?? 0}
                  max={param.max ?? 1}
                  step={0.01}
                  value={(runtimeValues[param.id] as number) ?? param.defaultValue as number}
                  onChange={(e) => onRuntimeValueChange(param.id, parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--aethel-text-muted)' }}>
                  <span>{param.min ?? 0}</span>
                  <span>{((runtimeValues[param.id] as number) ?? param.defaultValue).toFixed(2)}</span>
                  <span>{param.max ?? 1}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add parameter */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={newParamName}
          onChange={(e) => setNewParamName(e.target.value)}
          placeholder="Parameter name"
          style={{
            flex: 1,
            background: 'var(--aethel-surface-secondary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            padding: '6px',
            color: 'white',
            fontSize: '12px',
          }}
        />
        <button type="button" aria-label="Add runtime parameter"
          onClick={addParameter}
          style={{
            background: 'var(--aethel-primary)',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN SOUND CUE EDITOR
// ============================================================================

export interface SoundCueEditorProps {
  cue?: SoundCue;
  onChange?: (cue: SoundCue) => void;
}

const nodeTypes = {
  sound: SoundNode,
};

export function SoundCueEditor({ cue: initialCue, onChange }: SoundCueEditorProps) {
  // Cue state
  const [cue, setCue] = useState<SoundCue>(initialCue || {
    id: crypto.randomUUID(),
    name: 'New Sound Cue',
    nodes: [
      {
        id: 'output',
        type: 'output',
        position: { x: 600, y: 200 },
        parameters: {},
      },
    ],
    connections: [],
    parameters: [],
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewVolume, setPreviewVolume] = useState(0.7);
  const [runtimeValues, setRuntimeValues] = useState<Record<string, number | boolean>>({});
  const [previewStatus, setPreviewStatus] = useState('Idle — Web Audio preview');
  const playbackRef = useRef<SoundCuePlaybackHandle | null>(null);

  // Handle parameter changes on nodes
  const handleParameterChange = useCallback((nodeId: string, paramId: string, value: unknown) => {
    setCue((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, parameters: { ...n.parameters, [paramId]: value } }
          : n
      ),
    }));
  }, []);

  // Convert to React Flow format
  const initialNodes: Node<SoundNodeData>[] = useMemo(() => {
    return cue.nodes.map((node) => ({
      id: node.id,
      type: 'sound',
      position: node.position,
      data: {
        definition: nodeDefinitions[node.type],
        parameters: node.parameters,
        onParameterChange: handleParameterChange,
      },
    }));
  }, [cue.nodes, handleParameterChange]);

  const initialEdges: Edge[] = useMemo(() => {
    return cue.connections.map((conn) => ({
      id: conn.id,
      source: conn.sourceNode,
      sourceHandle: conn.sourcePin,
      target: conn.targetNode,
      targetHandle: conn.targetPin,
      style: { stroke: 'var(--aethel-success)', strokeWidth: 2 },
      animated: isPlaying,
    }));
  }, [cue.connections, isPlaying]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Add new node
  const addNode = useCallback((type: SoundNodeType) => {
    const newNode: SoundCueNode = {
      id: crypto.randomUUID(),
      type,
      position: { x: 200, y: 200 },
      parameters: {},
    };

    setCue((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

    setNodes((nds: any) => [
      ...nds,
      {
        id: newNode.id,
        type: 'sound',
        position: newNode.position,
        data: {
          definition: nodeDefinitions[type],
          parameters: {},
          onParameterChange: handleParameterChange,
        },
      },
    ]);
  }, [setNodes, handleParameterChange]);

  // Handle connections
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const newConnection: SoundCueConnection = {
      id: crypto.randomUUID(),
      sourceNode: connection.source,
      sourcePin: connection.sourceHandle || 'audio',
      targetNode: connection.target,
      targetPin: connection.targetHandle || 'audio',
    };

    setCue((prev) => ({
      ...prev,
      connections: [...prev.connections, newConnection],
    }));

    setEdges((eds: any) =>
      addEdge(
        {
          ...connection,
          id: newConnection.id,
          style: { stroke: 'var(--aethel-success)', strokeWidth: 2 },
          animated: isPlaying,
        },
        eds
      )
    );
  }, [setEdges, isPlaying]);

  // Preview controls — Law IV: real Web Audio, never play-log-only
  const handlePlay = useCallback(() => {
    playbackRef.current?.stop();
    setIsPlaying(true);
    setPreviewStatus('Starting Web Audio preview…');
    void playSoundCuePreview(cue).then((handle) => {
      playbackRef.current = handle;
      setPreviewStatus(
        `Playing via Web Audio · peak ${handle.peakEnergy.toFixed(2)} · ${handle.durationSec.toFixed(2)}s`,
      );
      window.setTimeout(() => {
        setIsPlaying(false);
        setPreviewStatus('Preview complete');
      }, Math.ceil(handle.durationSec * 1000) + 50);
    }).catch((error) => {
      setIsPlaying(false);
      setPreviewStatus('Preview failed — AudioContext unavailable');
      log.error('SoundCue Web Audio preview failed', error);
    });
  }, [cue]);

  const handleStop = useCallback(() => {
    playbackRef.current?.stop();
    playbackRef.current = null;
    setIsPlaying(false);
    setPreviewStatus('Stopped');
  }, []);

  // Notify parent
  useEffect(() => {
    onChange?.(cue);
  }, [cue, onChange]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: 'var(--aethel-surface-primary)' }}>
      {/* Left sidebar */}
      <div style={{
        width: '240px',
        borderRight: '1px solid var(--aethel-surface-secondary)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto',
      }}>
        <NodeCatalog
          onAddNode={addNode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Main graph */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          style={{ background: 'var(--aethel-surface-primary)' }}
        >
          <Controls />
          <MiniMap
            style={{ background: 'var(--aethel-surface-secondary)' }}
            nodeColor={(n) => nodeDefinitions[(n.data as SoundNodeData).definition?.type]?.color || 'var(--aethel-text-muted)'}
          />
          <Background color="var(--aethel-surface-secondary)" gap={20} />

          <Panel position="top-left">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--aethel-surface-secondary)',
              padding: '8px 16px',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
            }}>
              <Music size={14} />
              {cue.name}
            </div>
          </Panel>

          <Panel position="top-right">
            <div style={{
              background: 'var(--aethel-surface-secondary)',
              padding: '8px 12px',
              borderRadius: '6px',
              color: 'var(--aethel-text-tertiary)',
              fontSize: '12px',
            }}>
              Nodes: {cue.nodes.length} | Connections: {cue.connections.length}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right sidebar */}
      <div style={{
        width: '260px',
        borderLeft: '1px solid var(--aethel-surface-secondary)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto',
      }}>
        <PreviewPanel
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onStop={handleStop}
          volume={previewVolume}
          onVolumeChange={setPreviewVolume}
        />

        <ParametersPanel
          parameters={cue.parameters}
          onChange={(params) => setCue((prev) => ({ ...prev, parameters: params }))}
          runtimeValues={runtimeValues}
          onRuntimeValueChange={(id, value) => setRuntimeValues((prev) => ({ ...prev, [id]: value }))}
        />

        {/* Attenuation preview */}
        <div style={{
          padding: '12px',
          background: 'var(--aethel-surface-primary)',
          borderRadius: '8px',
        }}>
          <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>3D Preview</h3>
          <div style={{
            height: '120px',
            background: 'var(--aethel-surface-secondary)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            {/* Simple attenuation visualization */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--aethel-success) 0%, transparent 70%)',
              opacity: 0.5,
            }} />
            <div style={{
              position: 'absolute',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: '1px dashed var(--aethel-success)',
              opacity: 0.3,
            }} />
            <div style={{
              position: 'absolute',
              width: '10px',
              height: '10px',
              background: 'var(--aethel-success)',
              borderRadius: '50%',
            }} />
          </div>
          <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--aethel-text-muted)', textAlign: 'center' }}>
            Attenuation sphere visualization
          </div>
        </div>
      </div>
    </div>
  );
}

export default SoundCueEditor;
