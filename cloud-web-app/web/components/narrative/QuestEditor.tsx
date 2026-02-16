/**
 * QUEST EDITOR - Aethel Engine
 * 
 * Editor profissional de quests/missões com sistema de objetivos,
 * pré-requisitos, recompensas e tracking de progresso.
 * 
 * FEATURES:
 * - Quest states (available, active, completed, failed)
 * - Objective types (collect, kill, explore, talk, escort)
 * - Branching quest paths
 * - Prerequisites & dependencies
 * - Rewards (XP, items, reputation, currency)
 * - Optional objectives
 * - Time limits
 * - Quest chains
 * - Journal integration
 * - Real-time preview
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  NodeProps,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Scroll,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  Gift,
  Users,
  MapPin,
  Swords,
  Package,
  MessageCircle,
  Shield,
  Star,
  Plus,
  Trash2,
  Settings,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  Eye,
  Play,
  Link,
  Unlink,
  Flag,
  Award,
  Coins,
  Zap,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type QuestState = 'unavailable' | 'available' | 'active' | 'completed' | 'failed';

export type ObjectiveType = 
  | 'collect' 
  | 'kill' 
  | 'explore' 
  | 'talk' 
  | 'escort' 
  | 'defend' 
  | 'craft'
  | 'deliver'
  | 'custom';

export type RewardType = 'xp' | 'gold' | 'item' | 'reputation' | 'skill' | 'unlock';

export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  targetId?: string;
  targetCount: number;
  currentCount: number;
  isOptional: boolean;
  isHidden: boolean;
  timeLimit?: number;
  hints: string[];
  onComplete?: string;
}

export interface QuestReward {
  id: string;
  type: RewardType;
  itemId?: string;
  amount: number;
  description: string;
}

export interface QuestPrerequisite {
  type: 'quest' | 'level' | 'reputation' | 'item' | 'variable';
  questId?: string;
  level?: number;
  faction?: string;
  reputationAmount?: number;
  itemId?: string;
  variable?: string;
  value?: any;
}

export interface QuestNodeData extends Record<string, unknown> {
  questId: string;
  title: string;
  description: string;
  state: QuestState;
  category: string;
  level: number;
  isMainQuest: boolean;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisites: QuestPrerequisite[];
  giver?: string;
  location?: string;
  timeLimit?: number;
  repeatableAfter?: number;
  journalEntry?: string;
}

export interface QuestCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const QUEST_CATEGORIES: QuestCategory[] = [
  { id: 'main', name: 'Main Story', color: '#eab308', icon: '⭐' },
  { id: 'side', name: 'Side Quest', color: '#3b82f6', icon: '📜' },
  { id: 'faction', name: 'Faction', color: '#8b5cf6', icon: '🛡️' },
  { id: 'bounty', name: 'Bounty', color: '#ef4444', icon: '⚔️' },
  { id: 'exploration', name: 'Exploration', color: '#22c55e', icon: '🗺️' },
  { id: 'crafting', name: 'Crafting', color: '#f97316', icon: '🔨' },
];

const OBJECTIVE_ICONS: Record<ObjectiveType, React.ReactNode> = {
  collect: <Package className="w-4 h-4" />,
  kill: <Swords className="w-4 h-4" />,
  explore: <MapPin className="w-4 h-4" />,
  talk: <MessageCircle className="w-4 h-4" />,
  escort: <Users className="w-4 h-4" />,
  defend: <Shield className="w-4 h-4" />,
  craft: <Zap className="w-4 h-4" />,
  deliver: <Gift className="w-4 h-4" />,
  custom: <Target className="w-4 h-4" />,
};

// ============================================================================
// QUEST NODE COMPONENT
// ============================================================================

function QuestNode({ data, selected }: NodeProps<Node<QuestNodeData>>) {
  const category = QUEST_CATEGORIES.find((c) => c.id === data.category);
  const completedObjectives = data.objectives.filter((o) => o.currentCount >= o.targetCount).length;
  const totalObjectives = data.objectives.length;
  
  const stateColors: Record<QuestState, string> = {
    unavailable: 'border-slate-600 bg-slate-800/50',
    available: 'border-yellow-500 bg-yellow-900/20',
    active: 'border-blue-500 bg-blue-900/20',
    completed: 'border-green-500 bg-green-900/20',
    failed: 'border-red-500 bg-red-900/20',
  };
  
  const stateIcons: Record<QuestState, React.ReactNode> = {
    unavailable: <Unlink className="w-4 h-4 text-slate-500" />,
    available: <Star className="w-4 h-4 text-yellow-400" />,
    active: <Play className="w-4 h-4 text-blue-400" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    failed: <XCircle className="w-4 h-4 text-red-400" />,
  };
  
  return (
    <div 
      className={`w-72 rounded-lg border-2 shadow-lg ${stateColors[data.state]} ${
        selected ? 'ring-2 ring-white' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      
      {/* Header */}
      <div 
        className="px-3 py-2 rounded-t-md flex items-center gap-2"
        style={{ borderBottom: `2px solid ${category?.color || '#64748b'}` }}
      >
        <span className="text-lg">{category?.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-white truncate">{data.title}</span>
            {data.isMainQuest && <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
          </div>
          <div className="text-[10px] text-slate-400">Lvl {data.level} • {category?.name}</div>
        </div>
        {stateIcons[data.state]}
      </div>
      
      {/* Description */}
      <div className="px-3 py-2 text-xs text-slate-300 line-clamp-2 border-b border-slate-700/50">
        {data.description}
      </div>
      
      {/* Objectives preview */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
          <span>Objectives</span>
          <span>{completedObjectives}/{totalObjectives}</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
            style={{ width: `${totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0}%` }}
          />
        </div>
        
        {/* Show first 2 objectives */}
        <div className="mt-2 space-y-1">
          {data.objectives.slice(0, 2).map((obj) => (
            <div 
              key={obj.id}
              className={`flex items-center gap-1.5 text-[10px] ${
                obj.currentCount >= obj.targetCount ? 'text-green-400' : 'text-slate-400'
              }`}
            >
              {OBJECTIVE_ICONS[obj.type]}
              <span className="truncate flex-1">{obj.description}</span>
              <span>{obj.currentCount}/{obj.targetCount}</span>
            </div>
          ))}
          {data.objectives.length > 2 && (
            <div className="text-[10px] text-slate-500 italic">
              +{data.objectives.length - 2} more...
            </div>
          )}
        </div>
      </div>
      
      {/* Rewards preview */}
      {data.rewards.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-700/50">
          <div className="flex items-center gap-2 flex-wrap">
            {data.rewards.map((reward) => (
              <div 
                key={reward.id}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/50 rounded text-[10px]"
              >
                {reward.type === 'xp' && <Star className="w-3 h-3 text-blue-400" />}
                {reward.type === 'gold' && <Coins className="w-3 h-3 text-yellow-400" />}
                {reward.type === 'item' && <Package className="w-3 h-3 text-blue-400" />}
                {reward.type === 'reputation' && <Award className="w-3 h-3 text-green-400" />}
                <span>{reward.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
}

// ============================================================================
// NODE TYPES
// ============================================================================

const nodeTypes = {
  quest: QuestNode,
};

// ============================================================================
// INITIAL DATA
// ============================================================================

const initialNodes: Node<QuestNodeData>[] = [
  {
    id: 'q1',
    type: 'quest',
    position: { x: 100, y: 50 },
    data: {
      questId: 'main_001',
      title: 'The Lost Artifact',
      description: 'An ancient artifact has been discovered in the ruins. Retrieve it before the enemy forces do.',
      state: 'available',
      category: 'main',
      level: 5,
      isMainQuest: true,
      objectives: [
        { id: 'o1', type: 'explore', description: 'Find the Ancient Ruins', targetCount: 1, currentCount: 0, isOptional: false, isHidden: false, hints: [] },
        { id: 'o2', type: 'collect', description: 'Retrieve the Artifact', targetId: 'artifact_001', targetCount: 1, currentCount: 0, isOptional: false, isHidden: false, hints: [] },
        { id: 'o3', type: 'kill', description: 'Defeat the Guardian', targetId: 'guardian_boss', targetCount: 1, currentCount: 0, isOptional: false, isHidden: false, hints: [] },
      ],
      rewards: [
        { id: 'r1', type: 'xp', amount: 500, description: '500 XP' },
        { id: 'r2', type: 'gold', amount: 100, description: '100 Gold' },
      ],
      prerequisites: [],
      giver: 'Elder Mage',
      location: 'Ancient Ruins',
    },
  },
  {
    id: 'q2',
    type: 'quest',
    position: { x: 100, y: 350 },
    data: {
      questId: 'main_002',
      title: 'Deciphering the Past',
      description: 'The artifact contains mysterious inscriptions. Find someone who can translate them.',
      state: 'unavailable',
      category: 'main',
      level: 7,
      isMainQuest: true,
      objectives: [
        { id: 'o1', type: 'talk', description: 'Speak to the Scholar', targetId: 'npc_scholar', targetCount: 1, currentCount: 0, isOptional: false, isHidden: false, hints: [] },
        { id: 'o2', type: 'collect', description: 'Gather Research Materials', targetId: 'research_mat', targetCount: 5, currentCount: 0, isOptional: false, isHidden: false, hints: [] },
      ],
      rewards: [
        { id: 'r1', type: 'xp', amount: 750, description: '750 XP' },
        { id: 'r2', type: 'item', itemId: 'translation_book', amount: 1, description: 'Ancient Translation Guide' },
      ],
      prerequisites: [{ type: 'quest', questId: 'main_001' }],
      giver: 'Elder Mage',
    },
  },
  {
    id: 'q3',
    type: 'quest',
    position: { x: 450, y: 150 },
    data: {
      questId: 'side_001',
      title: "Merchant's Request",
      description: 'The local merchant needs help dealing with bandits on the trade route.',
      state: 'available',
      category: 'side',
      level: 4,
      isMainQuest: false,
      objectives: [
        { id: 'o1', type: 'kill', description: 'Clear Bandits from Trade Route', targetId: 'bandit', targetCount: 10, currentCount: 0, isOptional: false, isHidden: false, hints: [] },
      ],
      rewards: [
        { id: 'r1', type: 'xp', amount: 200, description: '200 XP' },
        { id: 'r2', type: 'gold', amount: 50, description: '50 Gold' },
        { id: 'r3', type: 'reputation', amount: 10, description: '+10 Merchant Guild Rep' },
      ],
      prerequisites: [],
      giver: 'Traveling Merchant',
    },
  },
];

const initialEdges: Edge[] = [
  { 
    id: 'e1', 
    source: 'q1', 
    target: 'q2', 
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#eab308', strokeWidth: 2 },
    label: 'requires',
    labelStyle: { fill: '#eab308', fontSize: 10 },
    labelBgStyle: { fill: '#1e293b' },
  },
];

// ============================================================================
// OBJECTIVE EDITOR
// ============================================================================

interface ObjectiveEditorProps {
  objective: QuestObjective;
  onUpdate: (obj: QuestObjective) => void;
  onDelete: () => void;
}

function ObjectiveEditor({ objective, onUpdate, onDelete }: ObjectiveEditorProps) {
  return (
    <div className="bg-slate-800/50 rounded p-3 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <select
          value={objective.type}
          onChange={(e) => onUpdate({ ...objective, type: e.target.value as ObjectiveType })}
          className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
        >
          {Object.keys(OBJECTIVE_ICONS).map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        
        <div className="flex-1" />
        
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={objective.isOptional}
            onChange={(e) => onUpdate({ ...objective, isOptional: e.target.checked })}
            className="rounded"
          />
          Optional
        </label>
        
        <button
          onClick={onDelete}
          className="p-1 rounded bg-red-600/30 hover:bg-red-600/50"
        >
          <Trash2 className="w-3 h-3 text-red-400" />
        </button>
      </div>
      
      <input
        value={objective.description}
        onChange={(e) => onUpdate({ ...objective, description: e.target.value })}
        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm mb-2"
        placeholder="Objective description..."
      />
      
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-slate-400 block mb-1">Target ID</label>
          <input
            value={objective.targetId || ''}
            onChange={(e) => onUpdate({ ...objective, targetId: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
          />
        </div>
        <div className="w-20">
          <label className="text-[10px] text-slate-400 block mb-1">Count</label>
          <input
            type="number"
            value={objective.targetCount}
            onChange={(e) => onUpdate({ ...objective, targetCount: parseInt(e.target.value) || 1 })}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
            min={1}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REWARD EDITOR
// ============================================================================

interface RewardEditorProps {
  reward: QuestReward;
  onUpdate: (r: QuestReward) => void;
  onDelete: () => void;
}

function RewardEditor({ reward, onUpdate, onDelete }: RewardEditorProps) {
  return (
    <div className="flex items-center gap-2 bg-slate-800/50 rounded p-2 mb-2">
      <select
        value={reward.type}
        onChange={(e) => onUpdate({ ...reward, type: e.target.value as RewardType })}
        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
      >
        <option value="xp">XP</option>
        <option value="gold">Gold</option>
        <option value="item">Item</option>
        <option value="reputation">Reputation</option>
        <option value="skill">Skill</option>
        <option value="unlock">Unlock</option>
      </select>
      
      {reward.type === 'item' && (
        <input
          value={reward.itemId || ''}
          onChange={(e) => onUpdate({ ...reward, itemId: e.target.value })}
          className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
          placeholder="Item ID"
        />
      )}
      
      <input
        type="number"
        value={reward.amount}
        onChange={(e) => onUpdate({ ...reward, amount: parseInt(e.target.value) || 0 })}
        className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
        min={0}
      />
      
      <button
        onClick={onDelete}
        className="p-1 rounded bg-red-600/30 hover:bg-red-600/50"
      >
        <Trash2 className="w-3 h-3 text-red-400" />
      </button>
    </div>
  );
}

// ============================================================================
// QUEST INSPECTOR
// ============================================================================

interface QuestInspectorProps {
  node: Node<QuestNodeData> | null;
  onUpdate: (id: string, data: QuestNodeData) => void;
  onDelete: (id: string) => void;
}

function QuestInspector({ node, onUpdate, onDelete }: QuestInspectorProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    objectives: true,
    rewards: true,
    prerequisites: false,
    advanced: false,
  });
  
  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };
  
  if (!node) {
    return (
      <div className="p-4 text-center text-slate-500">
        <Scroll className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select a quest to edit</p>
      </div>
    );
  }
  
  const data = node.data;
  
  const updateData = (updates: Partial<QuestNodeData>) => {
    onUpdate(node.id, { ...data, ...updates });
  };
  
  return (
    <div className="p-4 space-y-4">
      {/* Basic Info */}
      <div>
        <button
          onClick={() => toggleSection('basic')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium mb-2"
        >
          {openSections.basic ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Scroll className="w-4 h-4 text-blue-400" />
          Basic Info
        </button>
        
        {openSections.basic && (
          <div className="pl-6 space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Title</label>
              <input
                value={data.title}
                onChange={(e) => updateData({ title: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="text-xs text-slate-400 block mb-1">Description</label>
              <textarea
                value={data.description}
                onChange={(e) => updateData({ description: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm resize-none"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Category</label>
                <select
                  value={data.category}
                  onChange={(e) => updateData({ category: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm"
                >
                  {QUEST_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs text-slate-400 block mb-1">Level</label>
                <input
                  type="number"
                  value={data.level}
                  onChange={(e) => updateData({ level: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm"
                  min={1}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">State</label>
                <select
                  value={data.state}
                  onChange={(e) => updateData({ state: e.target.value as QuestState })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm"
                >
                  <option value="unavailable">Unavailable</option>
                  <option value="available">Available</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={data.isMainQuest}
                    onChange={(e) => updateData({ isMainQuest: e.target.checked })}
                    className="rounded"
                  />
                  Main Quest
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Quest Giver</label>
                <input
                  value={data.giver || ''}
                  onChange={(e) => updateData({ giver: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm"
                />
              </div>
              
              <div>
                <label className="text-xs text-slate-400 block mb-1">Location</label>
                <input
                  value={data.location || ''}
                  onChange={(e) => updateData({ location: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Objectives */}
      <div>
        <button
          onClick={() => toggleSection('objectives')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium mb-2"
        >
          {openSections.objectives ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Target className="w-4 h-4 text-green-400" />
          Objectives ({data.objectives.length})
        </button>
        
        {openSections.objectives && (
          <div className="pl-6">
            {data.objectives.map((obj, i) => (
              <ObjectiveEditor
                key={obj.id}
                objective={obj}
                onUpdate={(updated) => {
                  const objectives = [...data.objectives];
                  objectives[i] = updated;
                  updateData({ objectives });
                }}
                onDelete={() => {
                  const objectives = [...data.objectives];
                  objectives.splice(i, 1);
                  updateData({ objectives });
                }}
              />
            ))}
            
            <button
              onClick={() => {
                const newObj: QuestObjective = {
                  id: `obj_${Date.now()}`,
                  type: 'collect',
                  description: 'New objective',
                  targetCount: 1,
                  currentCount: 0,
                  isOptional: false,
                  isHidden: false,
                  hints: [],
                };
                updateData({ objectives: [...data.objectives, newObj] });
              }}
              className="flex items-center gap-1 w-full p-2 bg-green-600/20 hover:bg-green-600/30 rounded text-xs"
            >
              <Plus className="w-3 h-3" />
              Add Objective
            </button>
          </div>
        )}
      </div>
      
      {/* Rewards */}
      <div>
        <button
          onClick={() => toggleSection('rewards')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium mb-2"
        >
          {openSections.rewards ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Gift className="w-4 h-4 text-yellow-400" />
          Rewards ({data.rewards.length})
        </button>
        
        {openSections.rewards && (
          <div className="pl-6">
            {data.rewards.map((reward, i) => (
              <RewardEditor
                key={reward.id}
                reward={reward}
                onUpdate={(updated) => {
                  const rewards = [...data.rewards];
                  rewards[i] = updated;
                  updateData({ rewards });
                }}
                onDelete={() => {
                  const rewards = [...data.rewards];
                  rewards.splice(i, 1);
                  updateData({ rewards });
                }}
              />
            ))}
            
            <button
              onClick={() => {
                const newReward: QuestReward = {
                  id: `reward_${Date.now()}`,
                  type: 'xp',
                  amount: 100,
                  description: '',
                };
                updateData({ rewards: [...data.rewards, newReward] });
              }}
              className="flex items-center gap-1 w-full p-2 bg-yellow-600/20 hover:bg-yellow-600/30 rounded text-xs"
            >
              <Plus className="w-3 h-3" />
              Add Reward
            </button>
          </div>
        )}
      </div>
      
      {/* Prerequisites */}
      <div>
        <button
          onClick={() => toggleSection('prerequisites')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium mb-2"
        >
          {openSections.prerequisites ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Link className="w-4 h-4 text-blue-400" />
          Prerequisites ({data.prerequisites.length})
        </button>
        
        {openSections.prerequisites && (
          <div className="pl-6">
            {data.prerequisites.map((prereq, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-800/50 rounded p-2 mb-2">
                <select
                  value={prereq.type}
                  onChange={(e) => {
                    const prerequisites = [...data.prerequisites];
                    prerequisites[i] = { ...prereq, type: e.target.value as QuestPrerequisite['type'] };
                    updateData({ prerequisites });
                  }}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                >
                  <option value="quest">Quest</option>
                  <option value="level">Level</option>
                  <option value="reputation">Reputation</option>
                  <option value="item">Item</option>
                  <option value="variable">Variable</option>
                </select>
                
                {prereq.type === 'quest' && (
                  <input
                    value={prereq.questId || ''}
                    onChange={(e) => {
                      const prerequisites = [...data.prerequisites];
                      prerequisites[i] = { ...prereq, questId: e.target.value };
                      updateData({ prerequisites });
                    }}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                    placeholder="Quest ID"
                  />
                )}
                
                {prereq.type === 'level' && (
                  <input
                    type="number"
                    value={prereq.level || 1}
                    onChange={(e) => {
                      const prerequisites = [...data.prerequisites];
                      prerequisites[i] = { ...prereq, level: parseInt(e.target.value) || 1 };
                      updateData({ prerequisites });
                    }}
                    className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                    min={1}
                  />
                )}
                
                <button
                  onClick={() => {
                    const prerequisites = [...data.prerequisites];
                    prerequisites.splice(i, 1);
                    updateData({ prerequisites });
                  }}
                  className="p-1 rounded bg-red-600/30 hover:bg-red-600/50"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            ))}
            
            <button
              onClick={() => {
                const newPrereq: QuestPrerequisite = { type: 'quest', questId: '' };
                updateData({ prerequisites: [...data.prerequisites, newPrereq] });
              }}
              className="flex items-center gap-1 w-full p-2 bg-blue-600/20 hover:bg-blue-600/30 rounded text-xs"
            >
              <Plus className="w-3 h-3" />
              Add Prerequisite
            </button>
          </div>
        )}
      </div>
      
      {/* Advanced */}
      <div>
        <button
          onClick={() => toggleSection('advanced')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium mb-2"
        >
          {openSections.advanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Settings className="w-4 h-4 text-slate-400" />
          Advanced
        </button>
        
        {openSections.advanced && (
          <div className="pl-6 space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Time Limit (seconds)</label>
              <input
                type="number"
                value={data.timeLimit || ''}
                onChange={(e) => updateData({ timeLimit: parseInt(e.target.value) || undefined })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm"
                placeholder="No limit"
                min={0}
              />
            </div>
            
            <div>
              <label className="text-xs text-slate-400 block mb-1">Repeatable After (seconds)</label>
              <input
                type="number"
                value={data.repeatableAfter || ''}
                onChange={(e) => updateData({ repeatableAfter: parseInt(e.target.value) || undefined })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm"
                placeholder="Not repeatable"
                min={0}
              />
            </div>
            
            <div>
              <label className="text-xs text-slate-400 block mb-1">Journal Entry</label>
              <textarea
                value={data.journalEntry || ''}
                onChange={(e) => updateData({ journalEntry: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="Extended journal entry..."
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Delete */}
      <button
        onClick={() => onDelete(node.id)}
        className="flex items-center justify-center gap-2 w-full p-2 bg-red-600/20 hover:bg-red-600/30 rounded text-red-400 text-sm"
      >
        <Trash2 className="w-4 h-4" />
        Delete Quest
      </button>
    </div>
  );
}

// ============================================================================
// QUEST STATS
// ============================================================================

interface QuestStatsProps {
  nodes: Node<QuestNodeData>[];
}

function QuestStats({ nodes }: QuestStatsProps) {
  const stats = useMemo(() => {
    const byState: Record<QuestState, number> = {
      unavailable: 0,
      available: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };
    
    const byCategory: Record<string, number> = {};
    let mainQuests = 0;
    let totalObjectives = 0;
    
    nodes.forEach((node) => {
      const data = node.data;
      byState[data.state]++;
      byCategory[data.category] = (byCategory[data.category] || 0) + 1;
      if (data.isMainQuest) mainQuests++;
      totalObjectives += data.objectives.length;
    });
    
    return { byState, byCategory, mainQuests, totalObjectives, total: nodes.length };
  }, [nodes]);
  
  return (
    <div className="bg-slate-800/50 rounded p-3 text-xs space-y-2">
      <div className="font-medium text-slate-300 mb-2">Quest Statistics</div>
      
      <div className="flex justify-between">
        <span className="text-slate-400">Total Quests:</span>
        <span>{stats.total}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-slate-400">Main Quests:</span>
        <span className="text-yellow-400">{stats.mainQuests}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-slate-400">Total Objectives:</span>
        <span>{stats.totalObjectives}</span>
      </div>
      
      <div className="h-px bg-slate-700 my-2" />
      
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-yellow-400" />
        <span className="text-slate-400">Available:</span>
        <span className="ml-auto">{stats.byState.available}</span>
      </div>
      
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-blue-400" />
        <span className="text-slate-400">Active:</span>
        <span className="ml-auto">{stats.byState.active}</span>
      </div>
      
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-slate-400">Completed:</span>
        <span className="ml-auto">{stats.byState.completed}</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN QUEST EDITOR
// ============================================================================

export interface QuestEditorProps {
  gameId?: string;
  onSave?: (nodes: Node<QuestNodeData>[], edges: Edge[]) => void;
  onExport?: (format: 'json' | 'yaml') => void;
}

export default function QuestEditor({
  gameId,
  onSave,
  onExport,
}: QuestEditorProps) {
  // Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Selection
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const selectedNode = useMemo(() => 
    nodes.find((n) => selectedNodes.includes(n.id)),
    [nodes, selectedNodes]
  );
  
  // Connection handler
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({
        ...connection,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#eab308', strokeWidth: 2 },
        label: 'requires',
        labelStyle: { fill: '#eab308', fontSize: 10 },
        labelBgStyle: { fill: '#1e293b' },
      }, eds));
    },
    [setEdges]
  );
  
  // Selection handler
  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    setSelectedNodes(nodes.map((n) => n.id));
  }, []);
  
  // Update node data
  const updateNodeData = useCallback((id: string, data: QuestNodeData) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data } : n)));
  }, [setNodes]);
  
  // Delete node
  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);
  
  // Add quest
  const addQuest = useCallback((category: string) => {
    const id = `quest_${Date.now()}`;
    const categoryData = QUEST_CATEGORIES.find((c) => c.id === category);
    
    const newNode: Node<QuestNodeData> = {
      id,
      type: 'quest',
      position: { x: 300, y: 200 },
      data: {
        questId: id,
        title: 'New Quest',
        description: 'Quest description...',
        state: 'unavailable',
        category,
        level: 1,
        isMainQuest: category === 'main',
        objectives: [],
        rewards: [],
        prerequisites: [],
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);
  
  return (
    <div className="flex h-full w-full bg-slate-900 text-slate-200">
      {/* Main Flow */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[20, 20]}
        >
          <Background color="#334155" gap={20} />
          <Controls className="!bg-slate-800 !border-slate-700" />
          <MiniMap 
            className="!bg-slate-800 !border-slate-700"
            nodeColor={(node) => {
              const data = node.data as QuestNodeData;
              return QUEST_CATEGORIES.find((c) => c.id === data.category)?.color || '#64748b';
            }}
          />
          
          {/* Add Quest Buttons */}
          <Panel position="top-left" className="flex gap-2 flex-wrap">
            {QUEST_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => addQuest(cat.id)}
                className="flex items-center gap-1 px-3 py-2 rounded text-sm"
                style={{ backgroundColor: cat.color + '33', color: cat.color }}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </Panel>
          
          {/* Actions */}
          <Panel position="top-right" className="flex gap-2">
            <button
              onClick={() => onExport?.('json')}
              className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
          </Panel>
          
          {/* Stats */}
          <Panel position="bottom-left">
            <QuestStats nodes={nodes} />
          </Panel>
        </ReactFlow>
      </div>
      
      {/* Right Panel - Inspector */}
      <div className="w-80 border-l border-slate-700 flex flex-col">
        <div className="p-3 border-b border-slate-700">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            Quest Inspector
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <QuestInspector
            node={selectedNode ?? null}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
          />
        </div>
        
        {/* Legend */}
        <div className="border-t border-slate-700 p-3">
          <div className="text-xs text-slate-400 mb-2">Legend</div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Unavailable
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Available
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Active
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Completed
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Failed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
