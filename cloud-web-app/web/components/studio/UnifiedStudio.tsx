'use client';

/**
 * UnifiedStudio - Interface Unificada Profissional
 * 
 * Centraliza TODOS os editores em uma única interface com:
 * - Viewport 3D compartilhado (reutilizável)
 * - Painéis dockáveis (drag & drop)
 * - Tabs para múltiplos editores
 * - Menu contextual inteligente
 * 
 * Inspiração: Unreal Engine 5 + Blender + Unity
 * 
 * @author Aethel Team
 * @version 2.0.0
 */

import React, { useState, useCallback, useRef, useEffect, useMemo, Suspense, lazy } from 'react';
import { 
  Menu, 
  X, 
  Maximize2, 
  Minimize2,
  PanelLeft,
  PanelRight,
  PanelTop,
  PanelBottom,
  Layers,
  Settings,
  Save,
  FolderOpen,
  Play,
  Square,
  Pause,
  RotateCcw,
  Grid3X3,
  Box,
  Lightbulb,
  Camera,
  Wind,
  Droplets,
  Palette,
  Film,
  Volume2,
  MessageSquare,
  Map,
  Code,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Move,
  RotateCw,
  Maximize,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  Undo,
  Redo,
  Search,
  Filter,
  MoreVertical,
  GripVertical,
  PanelLeftClose,
  PanelRightClose,
  Split,
  Columns,
  Rows,
  Home,
  Crosshair,
  SunMedium,
  Moon,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Zap,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type EditorMode = 
  | 'level' 
  | 'material' 
  | 'blueprint' 
  | 'animation' 
  | 'niagara' 
  | 'landscape' 
  | 'sequencer'
  | 'audio'
  | 'dialogue'
  | 'quest'
  | 'terrain'
  | 'hair'
  | 'cloth'
  | 'fluid';

export type PanelType = 
  | 'viewport' 
  | 'outliner' 
  | 'details' 
  | 'content' 
  | 'console' 
  | 'ai-chat'
  | 'timeline'
  | 'node-graph'
  | 'preview'
  | 'properties'
  | 'layers'
  | 'history';

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type ViewportView = 'perspective' | 'top' | 'front' | 'right' | 'ortho';

interface PanelConfig {
  id: string;
  type: PanelType;
  title: string;
  icon: React.ReactNode;
  position: 'left' | 'right' | 'bottom' | 'center' | 'floating';
  size: { width: number; height: number };
  minimized: boolean;
  visible: boolean;
  locked: boolean;
}

interface EditorTab {
  id: string;
  mode: EditorMode;
  title: string;
  icon: React.ReactNode;
  dirty: boolean;
  data?: unknown;
}

interface StudioState {
  activeTab: string;
  tabs: EditorTab[];
  panels: PanelConfig[];
  transformMode: TransformMode;
  viewportView: ViewportView;
  isPlaying: boolean;
  isPaused: boolean;
  showGrid: boolean;
  showStats: boolean;
  snapEnabled: boolean;
  snapValue: number;
}

// ============================================================================
// EDITOR REGISTRY - Mapeia modos para componentes
// ============================================================================

const EDITOR_REGISTRY: Record<EditorMode, {
  label: string;
  icon: React.ReactNode;
  color: string;
  panels: PanelType[];
}> = {
  level: {
    label: 'Level Editor',
    icon: <Grid3X3 className="w-4 h-4" />,
    color: 'from-green-500 to-green-700',
    panels: ['viewport', 'outliner', 'details', 'content'],
  },
  material: {
    label: 'Material Editor',
    icon: <Palette className="w-4 h-4" />,
    color: 'from-pink-500 to-pink-700',
    panels: ['viewport', 'node-graph', 'details', 'preview'],
  },
  blueprint: {
    label: 'Blueprint Editor',
    icon: <Code className="w-4 h-4" />,
    color: 'from-blue-500 to-blue-700',
    panels: ['node-graph', 'details', 'outliner', 'console'],
  },
  animation: {
    label: 'Animation Blueprint',
    icon: <Film className="w-4 h-4" />,
    color: 'from-cyan-500 to-cyan-700',
    panels: ['viewport', 'timeline', 'node-graph', 'details'],
  },
  niagara: {
    label: 'Niagara VFX',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'from-orange-500 to-orange-700',
    panels: ['viewport', 'node-graph', 'details', 'preview'],
  },
  landscape: {
    label: 'Landscape Editor',
    icon: <Map className="w-4 h-4" />,
    color: 'from-emerald-500 to-emerald-700',
    panels: ['viewport', 'details', 'layers', 'properties'],
  },
  sequencer: {
    label: 'Sequencer',
    icon: <Film className="w-4 h-4" />,
    color: 'from-red-500 to-red-700',
    panels: ['viewport', 'timeline', 'details', 'content'],
  },
  audio: {
    label: 'Audio Editor',
    icon: <Volume2 className="w-4 h-4" />,
    color: 'from-indigo-500 to-indigo-700',
    panels: ['viewport', 'timeline', 'details', 'properties'],
  },
  dialogue: {
    label: 'Dialogue Editor',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'from-teal-500 to-teal-700',
    panels: ['node-graph', 'details', 'preview', 'properties'],
  },
  quest: {
    label: 'Quest Editor',
    icon: <Map className="w-4 h-4" />,
    color: 'from-amber-500 to-amber-700',
    panels: ['node-graph', 'details', 'outliner', 'properties'],
  },
  terrain: {
    label: 'Terrain Sculpting',
    icon: <Box className="w-4 h-4" />,
    color: 'from-stone-500 to-stone-700',
    panels: ['viewport', 'details', 'layers', 'properties'],
  },
  hair: {
    label: 'Hair & Fur',
    icon: <Wind className="w-4 h-4" />,
    color: 'from-yellow-500 to-yellow-700',
    panels: ['viewport', 'details', 'properties', 'preview'],
  },
  cloth: {
    label: 'Cloth Simulation',
    icon: <Layers className="w-4 h-4" />,
    color: 'from-violet-500 to-violet-700',
    panels: ['viewport', 'details', 'timeline', 'properties'],
  },
  fluid: {
    label: 'Fluid Simulation',
    icon: <Droplets className="w-4 h-4" />,
    color: 'from-sky-500 to-sky-700',
    panels: ['viewport', 'details', 'timeline', 'properties'],
  },
};

// ============================================================================
// DEFAULT PANELS
// ============================================================================

const DEFAULT_PANELS: PanelConfig[] = [
  {
    id: 'viewport',
    type: 'viewport',
    title: 'Viewport',
    icon: <Box className="w-4 h-4" />,
    position: 'center',
    size: { width: 100, height: 100 },
    minimized: false,
    visible: true,
    locked: true,
  },
  {
    id: 'outliner',
    type: 'outliner',
    title: 'World Outliner',
    icon: <Layers className="w-4 h-4" />,
    position: 'right',
    size: { width: 280, height: 50 },
    minimized: false,
    visible: true,
    locked: false,
  },
  {
    id: 'details',
    type: 'details',
    title: 'Details',
    icon: <Settings className="w-4 h-4" />,
    position: 'right',
    size: { width: 280, height: 50 },
    minimized: false,
    visible: true,
    locked: false,
  },
  {
    id: 'content',
    type: 'content',
    title: 'Content Browser',
    icon: <FolderOpen className="w-4 h-4" />,
    position: 'bottom',
    size: { width: 100, height: 250 },
    minimized: false,
    visible: true,
    locked: false,
  },
  {
    id: 'console',
    type: 'console',
    title: 'Output Log',
    icon: <Code className="w-4 h-4" />,
    position: 'bottom',
    size: { width: 100, height: 200 },
    minimized: true,
    visible: true,
    locked: false,
  },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Top Menu Bar
const MenuBar: React.FC<{
  onSave: () => void;
  onLoad: () => void;
  onUndo: () => void;
  onRedo: () => void;
}> = ({ onSave, onLoad, onUndo, onRedo }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menus = [
    { id: 'file', label: 'File', items: ['New Level', 'Open Level', 'Save', 'Save As...', '-', 'Import', 'Export', '-', 'Exit'] },
    { id: 'edit', label: 'Edit', items: ['Undo', 'Redo', '-', 'Cut', 'Copy', 'Paste', 'Delete', '-', 'Select All', 'Deselect All'] },
    { id: 'view', label: 'View', items: ['Viewport', 'Outliner', 'Details', 'Content Browser', '-', 'Fullscreen', 'Reset Layout'] },
    { id: 'actor', label: 'Actor', items: ['Add Cube', 'Add Sphere', 'Add Cylinder', '-', 'Add Light', 'Add Camera', '-', 'Add Blueprint'] },
    { id: 'build', label: 'Build', items: ['Build All', 'Build Lighting Only', 'Build Geometry', '-', 'Build Navigation'] },
    { id: 'tools', label: 'Tools', items: ['Landscape', 'Foliage', 'Geometry Editing', '-', 'Merge Actors', 'Pivot Tool'] },
    { id: 'window', label: 'Window', items: ['Level Editor', 'Material Editor', 'Blueprint Editor', '-', 'Sequencer', 'Animation'] },
    { id: 'help', label: 'Help', items: ['Documentation', 'Tutorials', '-', 'About Aethel Engine'] },
  ];

  return (
    <div className="h-7 bg-[#2d2d2d] flex items-center border-b border-[#1a1a1a] text-xs select-none">
      {/* Logo */}
      <div className="px-3 flex items-center gap-2 border-r border-[#1a1a1a]">
        <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded" />
        <span className="font-semibold text-white">AETHEL</span>
      </div>

      {/* Menus */}
      <div className="flex items-center">
        {menus.map(menu => (
          <div 
            key={menu.id}
            className="relative"
            onMouseEnter={() => activeMenu && setActiveMenu(menu.id)}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <button
              onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
              className={`px-3 py-1.5 hover:bg-[#3d3d3d] transition-colors ${
                activeMenu === menu.id ? 'bg-[#3d3d3d]' : ''
              }`}
            >
              {menu.label}
            </button>
            
            {activeMenu === menu.id && (
              <div className="absolute top-full left-0 mt-px bg-[#2d2d2d] border border-[#1a1a1a] shadow-xl rounded min-w-[180px] py-1 z-50">
                {menu.items.map((item, i) => (
                  item === '-' ? (
                    <div key={i} className="h-px bg-[#3d3d3d] my-1" />
                  ) : (
                    <button
                      key={i}
                      className="w-full px-4 py-1.5 text-left hover:bg-blue-600 flex items-center justify-between"
                      onClick={() => {
                        setActiveMenu(null);
                        if (item === 'Save') onSave();
                        if (item === 'Open Level') onLoad();
                        if (item === 'Undo') onUndo();
                        if (item === 'Redo') onRedo();
                      }}
                    >
                      <span>{item}</span>
                      {item === 'Save' && <span className="text-gray-500">Ctrl+S</span>}
                      {item === 'Undo' && <span className="text-gray-500">Ctrl+Z</span>}
                      {item === 'Redo' && <span className="text-gray-500">Ctrl+Y</span>}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right side - Quick actions */}
      <div className="ml-auto flex items-center gap-1 px-2">
        <button onClick={onSave} className="p-1.5 hover:bg-[#3d3d3d] rounded" title="Save (Ctrl+S)">
          <Save className="w-3.5 h-3.5" />
        </button>
        <button onClick={onUndo} className="p-1.5 hover:bg-[#3d3d3d] rounded" title="Undo (Ctrl+Z)">
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button onClick={onRedo} className="p-1.5 hover:bg-[#3d3d3d] rounded" title="Redo (Ctrl+Y)">
          <Redo className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// Toolbar with transform and play controls
const Toolbar: React.FC<{
  transformMode: TransformMode;
  onTransformModeChange: (mode: TransformMode) => void;
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  snapEnabled: boolean;
  onSnapToggle: () => void;
  snapValue: number;
  onSnapValueChange: (value: number) => void;
}> = ({
  transformMode,
  onTransformModeChange,
  isPlaying,
  isPaused,
  onPlay,
  onPause,
  onStop,
  snapEnabled,
  onSnapToggle,
  snapValue,
  onSnapValueChange,
}) => {
  return (
    <div className="h-10 bg-[#252525] flex items-center px-2 gap-2 border-b border-[#1a1a1a]">
      {/* Transform Tools */}
      <div className="flex items-center bg-[#1e1e1e] rounded overflow-hidden">
        <button
          onClick={() => onTransformModeChange('translate')}
          className={`p-2 ${transformMode === 'translate' ? 'bg-blue-600' : 'hover:bg-[#3d3d3d]'}`}
          title="Move (W)"
        >
          <Move className="w-4 h-4" />
        </button>
        <button
          onClick={() => onTransformModeChange('rotate')}
          className={`p-2 ${transformMode === 'rotate' ? 'bg-blue-600' : 'hover:bg-[#3d3d3d]'}`}
          title="Rotate (E)"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => onTransformModeChange('scale')}
          className={`p-2 ${transformMode === 'scale' ? 'bg-blue-600' : 'hover:bg-[#3d3d3d]'}`}
          title="Scale (R)"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-6 bg-[#3d3d3d]" />

      {/* Snap Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onSnapToggle}
          className={`p-2 rounded ${snapEnabled ? 'bg-blue-600' : 'bg-[#1e1e1e] hover:bg-[#3d3d3d]'}`}
          title="Toggle Snap"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        <select
          value={snapValue}
          onChange={(e) => onSnapValueChange(Number(e.target.value))}
          className="bg-[#1e1e1e] text-xs px-2 py-1.5 rounded border border-[#3d3d3d]"
        >
          <option value={0.1}>0.1</option>
          <option value={0.5}>0.5</option>
          <option value={1}>1</option>
          <option value={5}>5</option>
          <option value={10}>10</option>
        </select>
      </div>

      <div className="w-px h-6 bg-[#3d3d3d]" />

      {/* Play Controls - Centro */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center bg-[#1e1e1e] rounded overflow-hidden">
          {!isPlaying ? (
            <button
              onClick={onPlay}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 flex items-center gap-2"
              title="Play (Alt+P)"
            >
              <Play className="w-4 h-4" />
              <span className="text-xs font-medium">Play</span>
            </button>
          ) : (
            <>
              <button
                onClick={isPaused ? onPlay : onPause}
                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500"
                title={isPaused ? "Resume" : "Pause"}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                onClick={onStop}
                className="px-3 py-2 bg-red-600 hover:bg-red-500"
                title="Stop (Esc)"
              >
                <Square className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right side - View options */}
      <div className="flex items-center gap-1">
        <button className="p-2 hover:bg-[#3d3d3d] rounded" title="Lighting Mode">
          <SunMedium className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-[#3d3d3d] rounded" title="Show Stats">
          <Monitor className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-[#3d3d3d] rounded" title="Viewport Options">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Editor Tabs
const EditorTabs: React.FC<{
  tabs: EditorTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  onAddTab: () => void;
}> = ({ tabs, activeTab, onTabChange, onTabClose, onAddTab }) => {
  return (
    <div className="h-8 bg-[#1e1e1e] flex items-center border-b border-[#1a1a1a]">
      <div className="flex items-center overflow-x-auto">
        {tabs.map(tab => {
          const config = EDITOR_REGISTRY[tab.mode];
          return (
            <div
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer border-r border-[#1a1a1a] min-w-fit ${
                activeTab === tab.id 
                  ? 'bg-[#2d2d2d] border-t-2 border-t-blue-500' 
                  : 'hover:bg-[#252525]'
              }`}
            >
              <span className={`p-1 rounded bg-gradient-to-br ${config.color}`}>
                {tab.icon}
              </span>
              <span className="text-xs whitespace-nowrap">
                {tab.title}
                {tab.dirty && <span className="text-blue-400 ml-1">•</span>}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="p-0.5 hover:bg-[#3d3d3d] rounded opacity-60 hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
      
      <button
        onClick={onAddTab}
        className="p-2 hover:bg-[#2d2d2d] ml-1"
        title="Add new tab"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

// Panel Component (Resizable)
const Panel: React.FC<{
  config: PanelConfig;
  children: React.ReactNode;
  onToggleMinimize: () => void;
  onClose: () => void;
}> = ({ config, children, onToggleMinimize, onClose }) => {
  if (!config.visible) return null;

  return (
    <div 
      className={`bg-[#252525] flex flex-col ${
        config.minimized ? 'h-8' : 'h-full'
      }`}
      style={{ 
        width: config.position === 'left' || config.position === 'right' ? config.size.width : '100%',
      }}
    >
      {/* Panel Header */}
      <div className="h-8 bg-[#2d2d2d] flex items-center px-2 gap-2 border-b border-[#1a1a1a] flex-shrink-0">
        <GripVertical className="w-3 h-3 text-gray-500 cursor-move" />
        {config.icon}
        <span className="text-xs font-medium flex-1">{config.title}</span>
        
        <button
          onClick={onToggleMinimize}
          className="p-1 hover:bg-[#3d3d3d] rounded"
        >
          {config.minimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
        </button>
        
        {!config.locked && (
          <button onClick={onClose} className="p-1 hover:bg-[#3d3d3d] rounded">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Panel Content */}
      {!config.minimized && (
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
};

// Placeholder panels
const ViewportPanel: React.FC = () => (
  <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center relative">
    <div className="absolute inset-0 grid grid-cols-[repeat(20,1fr)] grid-rows-[repeat(20,1fr)] opacity-10">
      {Array.from({ length: 400 }).map((_, i) => (
        <div key={i} className="border border-gray-700" />
      ))}
    </div>
    <div className="text-center z-10">
      <Box className="w-16 h-16 mx-auto mb-4 text-gray-500" />
      <p className="text-gray-400 text-sm">3D Viewport</p>
      <p className="text-gray-600 text-xs mt-1">Drag objects here or use Add menu</p>
    </div>
    
    {/* Viewport Gizmo */}
    <div className="absolute top-4 right-4 w-20 h-20 bg-[#1a1a1a]/80 rounded">
      <div className="w-full h-full flex items-center justify-center">
        <div className="relative w-12 h-12">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-6 bg-green-500 origin-bottom" />
          <div className="absolute bottom-1/2 left-0 w-6 h-1 bg-red-500 origin-right" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-blue-500 opacity-50" />
        </div>
      </div>
    </div>
    
    {/* Viewport Info */}
    <div className="absolute bottom-4 left-4 text-xs text-gray-500">
      <p>Perspective | Lit | Show: All</p>
    </div>
  </div>
);

const OutlinerPanel: React.FC = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ world: true });
  
  const items = [
    { id: 'world', name: 'World', type: 'folder', children: [
      { id: 'floor', name: 'Floor', type: 'mesh' },
      { id: 'light', name: 'DirectionalLight', type: 'light' },
      { id: 'sky', name: 'Sky Atmosphere', type: 'sky' },
      { id: 'player', name: 'PlayerStart', type: 'actor' },
    ]},
  ];

  const renderItem = (item: typeof items[0], depth = 0) => (
    <div key={item.id}>
      <div 
        className="flex items-center gap-1 px-2 py-1 hover:bg-[#3d3d3d] cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => item.children && setExpanded(e => ({ ...e, [item.id]: !e[item.id] }))}
      >
        {item.children ? (
          expanded[item.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
        ) : <span className="w-3" />}
        
        <span className="w-4 h-4 flex items-center justify-center">
          {item.type === 'folder' && <FolderOpen className="w-3 h-3 text-yellow-500" />}
          {item.type === 'mesh' && <Box className="w-3 h-3 text-blue-400" />}
          {item.type === 'light' && <Lightbulb className="w-3 h-3 text-yellow-400" />}
          {item.type === 'sky' && <SunMedium className="w-3 h-3 text-orange-400" />}
          {item.type === 'actor' && <Crosshair className="w-3 h-3 text-green-400" />}
        </span>
        
        <span className="text-xs">{item.name}</span>
        
        <div className="ml-auto flex items-center gap-1">
          <button className="p-0.5 hover:bg-[#4d4d4d] rounded opacity-0 group-hover:opacity-100">
            <Eye className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {item.children && expanded[item.id] && (
        <div>
          {item.children.map((child: { id: string; name: string; type: string }) => renderItem(child as typeof items[0], depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto text-gray-300">
      {/* Search */}
      <div className="p-2 border-b border-[#1a1a1a]">
        <div className="flex items-center bg-[#1e1e1e] rounded px-2">
          <Search className="w-3 h-3 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="bg-transparent text-xs py-1.5 px-2 flex-1 outline-none"
          />
        </div>
      </div>
      
      {/* Tree */}
      <div className="py-1">
        {items.map(item => renderItem(item))}
      </div>
    </div>
  );
};

const DetailsPanel: React.FC = () => (
  <div className="h-full overflow-y-auto text-gray-300 text-xs">
    <div className="p-3 border-b border-[#1a1a1a]">
      <p className="text-gray-500 text-center">Select an object to view details</p>
    </div>
    
    {/* Transform Section */}
    <div className="border-b border-[#1a1a1a]">
      <button className="w-full flex items-center gap-2 p-2 hover:bg-[#3d3d3d]">
        <ChevronDown className="w-3 h-3" />
        <span>Transform</span>
      </button>
      <div className="p-2 space-y-2">
        {['Location', 'Rotation', 'Scale'].map(label => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-16 text-gray-500">{label}</span>
            <div className="flex-1 flex gap-1">
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis} className="flex-1 flex items-center">
                  <span className={`text-xs px-1 ${
                    i === 0 ? 'text-red-400' : i === 1 ? 'text-green-400' : 'text-blue-400'
                  }`}>{axis}</span>
                  <input 
                    type="number" 
                    defaultValue="0" 
                    className="w-full bg-[#1e1e1e] px-1 py-0.5 rounded text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ContentBrowserPanel: React.FC = () => {
  const folders = ['Meshes', 'Materials', 'Textures', 'Blueprints', 'Audio', 'Animations'];
  
  return (
    <div className="h-full flex">
      {/* Folder Tree */}
      <div className="w-48 border-r border-[#1a1a1a] overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center gap-2 p-1.5 bg-[#3d3d3d] rounded">
            <FolderOpen className="w-4 h-4 text-yellow-500" />
            <span className="text-xs">Content</span>
          </div>
          {folders.map(folder => (
            <div key={folder} className="flex items-center gap-2 p-1.5 hover:bg-[#3d3d3d] rounded ml-2 cursor-pointer">
              <FolderOpen className="w-3 h-3 text-yellow-500/70" />
              <span className="text-xs text-gray-400">{folder}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Content Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-6 gap-4">
          {['Cube', 'Sphere', 'Cylinder', 'Plane', 'Cone', 'Torus'].map(item => (
            <div key={item} className="group cursor-pointer">
              <div className="aspect-square bg-[#1e1e1e] rounded-lg flex items-center justify-center group-hover:ring-2 ring-blue-500">
                <Box className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-xs text-center mt-1 text-gray-400 truncate">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ConsolePanel: React.FC = () => (
  <div className="h-full bg-[#1a1a1a] font-mono text-xs p-2 overflow-y-auto">
    <p className="text-gray-500">[Info] Aethel Engine v2.0.0 initialized</p>
    <p className="text-green-400">[Success] Project loaded successfully</p>
    <p className="text-yellow-400">[Warning] 2 assets need to be reimported</p>
    <p className="text-gray-500">[Info] Ready for editing</p>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UnifiedStudio() {
  // State
  const [state, setState] = useState<StudioState>({
    activeTab: 'main-level',
    tabs: [
      { id: 'main-level', mode: 'level', title: 'MainLevel', icon: <Grid3X3 className="w-4 h-4" />, dirty: false },
    ],
    panels: DEFAULT_PANELS,
    transformMode: 'translate',
    viewportView: 'perspective',
    isPlaying: false,
    isPaused: false,
    showGrid: true,
    showStats: false,
    snapEnabled: true,
    snapValue: 1,
  });

  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);

  // Handlers
  const handleSave = useCallback(() => {
    console.log('Saving...');
    // Mark current tab as not dirty
    setState(s => ({
      ...s,
      tabs: s.tabs.map(t => t.id === s.activeTab ? { ...t, dirty: false } : t),
    }));
  }, []);

  const handleUndo = useCallback(() => console.log('Undo'), []);
  const handleRedo = useCallback(() => console.log('Redo'), []);
  const handleLoad = useCallback(() => console.log('Load'), []);

  const handleAddTab = useCallback(() => {
    const modes: EditorMode[] = Object.keys(EDITOR_REGISTRY) as EditorMode[];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    const config = EDITOR_REGISTRY[mode];
    
    const newTab: EditorTab = {
      id: `tab-${Date.now()}`,
      mode,
      title: `New ${config.label}`,
      icon: config.icon,
      dirty: true,
    };
    
    setState(s => ({
      ...s,
      tabs: [...s.tabs, newTab],
      activeTab: newTab.id,
    }));
  }, []);

  const handleCloseTab = useCallback((id: string) => {
    setState(s => {
      const newTabs = s.tabs.filter(t => t.id !== id);
      return {
        ...s,
        tabs: newTabs,
        activeTab: s.activeTab === id 
          ? (newTabs[0]?.id || '') 
          : s.activeTab,
      };
    });
  }, []);

  const handleTogglePanelMinimize = useCallback((panelId: string) => {
    setState(s => ({
      ...s,
      panels: s.panels.map(p => 
        p.id === panelId ? { ...p, minimized: !p.minimized } : p
      ),
    }));
  }, []);

  const handleClosePanel = useCallback((panelId: string) => {
    setState(s => ({
      ...s,
      panels: s.panels.map(p => 
        p.id === panelId ? { ...p, visible: false } : p
      ),
    }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) handleRedo();
            else handleUndo();
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
        }
      }
      
      // Transform shortcuts
      switch (e.key.toLowerCase()) {
        case 'w':
          if (!e.ctrlKey) setState(s => ({ ...s, transformMode: 'translate' }));
          break;
        case 'e':
          if (!e.ctrlKey) setState(s => ({ ...s, transformMode: 'rotate' }));
          break;
        case 'r':
          if (!e.ctrlKey) setState(s => ({ ...s, transformMode: 'scale' }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo]);

  // Get panels by position
  const leftPanels = state.panels.filter(p => p.position === 'left' && p.visible);
  const rightPanels = state.panels.filter(p => p.position === 'right' && p.visible);
  const bottomPanels = state.panels.filter(p => p.position === 'bottom' && p.visible);
  const centerPanels = state.panels.filter(p => p.position === 'center' && p.visible);

  const renderPanelContent = (type: PanelType) => {
    switch (type) {
      case 'viewport': return <ViewportPanel />;
      case 'outliner': return <OutlinerPanel />;
      case 'details': return <DetailsPanel />;
      case 'content': return <ContentBrowserPanel />;
      case 'console': return <ConsolePanel />;
      default: return <div className="p-4 text-gray-500 text-sm">Panel: {type}</div>;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-gray-200 overflow-hidden select-none">
      {/* Menu Bar */}
      <MenuBar 
        onSave={handleSave}
        onLoad={handleLoad}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Toolbar */}
      <Toolbar
        transformMode={state.transformMode}
        onTransformModeChange={(mode) => setState(s => ({ ...s, transformMode: mode }))}
        isPlaying={state.isPlaying}
        isPaused={state.isPaused}
        onPlay={() => setState(s => ({ ...s, isPlaying: true, isPaused: false }))}
        onPause={() => setState(s => ({ ...s, isPaused: true }))}
        onStop={() => setState(s => ({ ...s, isPlaying: false, isPaused: false }))}
        snapEnabled={state.snapEnabled}
        onSnapToggle={() => setState(s => ({ ...s, snapEnabled: !s.snapEnabled }))}
        snapValue={state.snapValue}
        onSnapValueChange={(value) => setState(s => ({ ...s, snapValue: value }))}
      />

      {/* Editor Tabs */}
      <EditorTabs
        tabs={state.tabs}
        activeTab={state.activeTab}
        onTabChange={(id) => setState(s => ({ ...s, activeTab: id }))}
        onTabClose={handleCloseTab}
        onAddTab={handleAddTab}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel Toggle */}
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className="w-6 flex items-center justify-center bg-[#252525] hover:bg-[#3d3d3d] border-r border-[#1a1a1a]"
        >
          {leftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>

        {/* Left Panels */}
        {leftPanelOpen && leftPanels.length > 0 && (
          <div className="w-64 flex flex-col border-r border-[#1a1a1a]">
            {leftPanels.map(panel => (
              <Panel
                key={panel.id}
                config={panel}
                onToggleMinimize={() => handleTogglePanelMinimize(panel.id)}
                onClose={() => handleClosePanel(panel.id)}
              >
                {renderPanelContent(panel.type)}
              </Panel>
            ))}
          </div>
        )}

        {/* Center + Bottom */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Center (Viewport) */}
          <div className="flex-1 overflow-hidden">
            {centerPanels.map(panel => (
              <div key={panel.id} className="w-full h-full">
                {renderPanelContent(panel.type)}
              </div>
            ))}
          </div>

          {/* Bottom Panels */}
          {bottomPanelOpen && bottomPanels.length > 0 && (
            <div className="border-t border-[#1a1a1a]" style={{ height: 250 }}>
              <div className="flex h-full">
                {bottomPanels.map(panel => (
                  <div key={panel.id} className="flex-1 border-r border-[#1a1a1a] last:border-r-0">
                    <Panel
                      config={{ ...panel, size: { ...panel.size, height: 250 } }}
                      onToggleMinimize={() => handleTogglePanelMinimize(panel.id)}
                      onClose={() => handleClosePanel(panel.id)}
                    >
                      {renderPanelContent(panel.type)}
                    </Panel>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panels */}
        {rightPanelOpen && rightPanels.length > 0 && (
          <div className="w-72 flex flex-col border-l border-[#1a1a1a]">
            {rightPanels.map(panel => (
              <Panel
                key={panel.id}
                config={panel}
                onToggleMinimize={() => handleTogglePanelMinimize(panel.id)}
                onClose={() => handleClosePanel(panel.id)}
              >
                {renderPanelContent(panel.type)}
              </Panel>
            ))}
          </div>
        )}

        {/* Right Panel Toggle */}
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="w-6 flex items-center justify-center bg-[#252525] hover:bg-[#3d3d3d] border-l border-[#1a1a1a]"
        >
          {rightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Panel Toggle */}
      <button
        onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
        className="h-5 flex items-center justify-center bg-[#252525] hover:bg-[#3d3d3d] border-t border-[#1a1a1a]"
      >
        {bottomPanelOpen ? <PanelBottom className="w-4 h-4" /> : <PanelTop className="w-4 h-4" />}
      </button>

      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] flex items-center px-3 text-xs">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full" />
          Ready
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <span>FPS: 60</span>
          <span>Objects: 4</span>
          <span>Draw Calls: 12</span>
          <span>Memory: 256 MB</span>
        </div>
      </div>
    </div>
  );
}
