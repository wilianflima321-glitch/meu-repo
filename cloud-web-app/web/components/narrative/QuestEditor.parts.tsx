'use client';

import React, { useState } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coins,
  Gift,
  Link,
  MapPin,
  MessageCircle,
  Package,
  Play,
  Plus,
  Scroll,
  Settings,
  Shield,
  Star,
  Swords,
  Target,
  Trash2,
  Unlink,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { QUEST_CATEGORIES } from './quest-editor-models';
import type { ObjectiveType, QuestNodeData, QuestObjective, QuestPrerequisite, QuestReward, QuestState, RewardType } from './quest-editor-models';

// ============================================================================
// CONSTANTS
// ============================================================================

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
    unavailable: 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]',
    available: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]',
    active: 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]',
    completed: 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]',
    failed: 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]',
  };

  const stateIcons: Record<QuestState, React.ReactNode> = {
    unavailable: <Unlink className="w-4 h-4 text-[var(--aethel-text-quaternary)]" />,
    available: <Star className="w-4 h-4 text-[var(--aethel-warning-light)]" />,
    active: <Play className="w-4 h-4 text-[var(--aethel-info-light)]" />,
    completed: <CheckCircle2 className="w-4 h-4 text-[var(--aethel-success-light)]" />,
    failed: <XCircle className="w-4 h-4 text-[var(--aethel-error-light)]" />,
  };

  return (
    <div
      className={`w-72 rounded-lg border-2 shadow-lg ${stateColors[data.state]} ${
        selected ? 'ring-2 ring-white' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--aethel-text-tertiary)]" />

      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-md flex items-center gap-2"
        style={{ borderBottom: `2px solid ${category?.color || 'var(--aethel-text-muted)'}` }}
      >
        <span className="text-lg">{category?.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-[var(--aethel-text-primary)] truncate">{data.title}</span>
            {data.isMainQuest && <Star className="w-3 h-3 text-[var(--aethel-warning-light)] flex-shrink-0" />}
          </div>
          <div className="text-[10px] text-[var(--aethel-text-tertiary)]">Lvl {data.level} • {category?.name}</div>
        </div>
        {stateIcons[data.state]}
      </div>

      {/* Description */}
      <div className="px-3 py-2 text-xs text-[var(--aethel-text-secondary)] line-clamp-2 border-b border-[var(--aethel-border-primary)]/50">
        {data.description}
      </div>

      {/* Objectives preview */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between text-[10px] text-[var(--aethel-text-tertiary)] mb-1">
          <span>Objectives</span>
          <span>{completedObjectives}/{totalObjectives}</span>
        </div>
        <div className="h-1.5 bg-[var(--aethel-surface-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--aethel-info)] to-[var(--aethel-success)] transition-all"
            style={{ width: `${totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0}%` }}
          />
        </div>

        {/* Show first 2 objectives */}
        <div className="mt-2 space-y-1">
          {data.objectives.slice(0, 2).map((obj) => (
            <div
              key={obj.id}
              className={`flex items-center gap-1.5 text-[10px] ${
                obj.currentCount >= obj.targetCount ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-text-tertiary)]'
              }`}
            >
              {OBJECTIVE_ICONS[obj.type]}
              <span className="truncate flex-1">{obj.description}</span>
              <span>{obj.currentCount}/{obj.targetCount}</span>
            </div>
          ))}
          {data.objectives.length > 2 && (
            <div className="text-[10px] text-[var(--aethel-text-quaternary)] italic">
              +{data.objectives.length - 2} more...
            </div>
          )}
        </div>
      </div>

      {/* Rewards preview */}
      {data.rewards.length > 0 && (
        <div className="px-3 py-2 border-t border-[var(--aethel-border-primary)]/50">
          <div className="flex items-center gap-2 flex-wrap">
            {data.rewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded text-[10px]"
              >
                {reward.type === 'xp' && <Star className="w-3 h-3 text-[var(--aethel-info-light)]" />}
                {reward.type === 'gold' && <Coins className="w-3 h-3 text-[var(--aethel-warning-light)]" />}
                {reward.type === 'item' && <Package className="w-3 h-3 text-[var(--aethel-info-light)]" />}
                {reward.type === 'reputation' && <Award className="w-3 h-3 text-[var(--aethel-success-light)]" />}
                <span>{reward.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--aethel-text-tertiary)]" />
    </div>
  );
}

// ============================================================================
// NODE TYPES
// ============================================================================

export const nodeTypes = {
  quest: QuestNode,
};

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
    <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] rounded p-3 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <select
          value={objective.type}
          onChange={(e) => onUpdate({ ...objective, type: e.target.value as ObjectiveType })}
          className="bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-sm"
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

        <button type="button"
          onClick={onDelete}
          className="p-1 rounded bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]"
        >
          <Trash2 className="w-3 h-3 text-[var(--aethel-error-light)]" />
        </button>
      </div>

      <input
        value={objective.description}
        onChange={(e) => onUpdate({ ...objective, description: e.target.value })}
        className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-3 py-1.5 text-sm mb-2"
        placeholder="Objective description..."
      />

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-[var(--aethel-text-tertiary)] block mb-1">Target ID</label>
          <input
            value={objective.targetId || ''}
            onChange={(e) => onUpdate({ ...objective, targetId: e.target.value })}
            className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-xs"
          />
        </div>
        <div className="w-20">
          <label className="text-[10px] text-[var(--aethel-text-tertiary)] block mb-1">Count</label>
          <input
            type="number"
            value={objective.targetCount}
            onChange={(e) => onUpdate({ ...objective, targetCount: parseInt(e.target.value) || 1 })}
            className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-xs"
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
    <div className="flex items-center gap-2 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] rounded p-2 mb-2">
      <select
        value={reward.type}
        onChange={(e) => onUpdate({ ...reward, type: e.target.value as RewardType })}
        className="bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-xs"
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
          className="flex-1 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-xs"
          placeholder="Item ID"
        />
      )}

      <input
        type="number"
        value={reward.amount}
        onChange={(e) => onUpdate({ ...reward, amount: parseInt(e.target.value) || 0 })}
        className="w-20 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-xs"
        min={0}
      />

      <button type="button"
        onClick={onDelete}
        aria-label="Remove reward"
        className="p-1 rounded bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]"
      >
        <Trash2 className="w-3 h-3 text-[var(--aethel-error-light)]" />
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

export function QuestInspector({ node, onUpdate, onDelete }: QuestInspectorProps) {
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
      <div className="p-4 text-center text-[var(--aethel-text-quaternary)]">
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
        <button type="button"
          onClick={() => toggleSection('basic')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium mb-2"
        >
          {openSections.basic ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Scroll className="w-4 h-4 text-[var(--aethel-info-light)]" />
          Basic Info
        </button>

        {openSections.basic && (
          <div className="pl-6 space-y-3">
            <div>
              <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Title</label>
              <input
                value={data.title}
                onChange={(e) => updateData({ title: e.target.value })}
                className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Description</label>
              <textarea
                value={data.description}
                onChange={(e) => updateData({ description: e.target.value })}
                className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-3 py-2 text-sm resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Category</label>
                <select
                  value={data.category}
                  onChange={(e) => updateData({ category: e.target.value })}
                  className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1.5 text-sm"
                >
                  {QUEST_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Level</label>
                <input
                  type="number"
                  value={data.level}
                  onChange={(e) => updateData({ level: parseInt(e.target.value) || 1 })}
                  className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1.5 text-sm"
                  min={1}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">State</label>
                <select
                  value={data.state}
                  onChange={(e) => updateData({ state: e.target.value as QuestState })}
                  className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1.5 text-sm"
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
                <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Quest Giver</label>
                <input
                  value={data.giver || ''}
                  onChange={(e) => updateData({ giver: e.target.value })}
                  className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Location</label>
                <input
                  value={data.location || ''}
                  onChange={(e) => updateData({ location: e.target.value })}
                  className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Objectives */}
      <div>
        <button type="button"
          onClick={() => toggleSection('objectives')}
          aria-label={openSections.objectives ? 'Collapse objectives' : 'Expand objectives'}
          aria-expanded={openSections.objectives}
          className="flex items-center gap-2 w-full text-left text-sm font-medium mb-2"
        >
          {openSections.objectives ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Target className="w-4 h-4 text-[var(--aethel-success-light)]" />
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

            <button type="button"
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
              className="flex items-center gap-1 w-full p-2 bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded text-xs"
            >
              <Plus className="w-3 h-3" />
              Add Objective
            </button>
          </div>
        )}
      </div>

      {/* Rewards */}
      <div>
        <button type="button"
          onClick={() => toggleSection('rewards')}
          aria-label={openSections.rewards ? 'Collapse rewards' : 'Expand rewards'}
          aria-expanded={openSections.rewards}
          className="flex items-center gap-2 w-full text-left text-sm font-medium mb-2"
        >
          {openSections.rewards ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Gift className="w-4 h-4 text-[var(--aethel-warning-light)]" />
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

            <button type="button"
              onClick={() => {
                const newReward: QuestReward = {
                  id: `reward_${Date.now()}`,
                  type: 'xp',
                  amount: 100,
                  description: '',
                };
                updateData({ rewards: [...data.rewards, newReward] });
              }}
              className="flex items-center gap-1 w-full p-2 bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] rounded text-xs"
            >
              <Plus className="w-3 h-3" />
              Add Reward
            </button>
          </div>
        )}
      </div>

      {/* Prerequisites */}
      <div>
        <button type="button"
          onClick={() => toggleSection('prerequisites')}
          aria-label={openSections.prerequisites ? 'Collapse prerequisites' : 'Expand prerequisites'}
          aria-expanded={openSections.prerequisites}
          className="flex items-center gap-2 w-full text-left text-sm font-medium mb-2"
        >
          {openSections.prerequisites ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Link className="w-4 h-4 text-[var(--aethel-info-light)]" />
          Prerequisites ({data.prerequisites.length})
        </button>

        {openSections.prerequisites && (
          <div className="pl-6">
            {data.prerequisites.map((prereq, i) => (
              <div key={i} className="flex items-center gap-2 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] rounded p-2 mb-2">
                <select
                  value={prereq.type}
                  onChange={(e) => {
                    const prerequisites = [...data.prerequisites];
                    prerequisites[i] = { ...prereq, type: e.target.value as QuestPrerequisite['type'] };
                    updateData({ prerequisites });
                  }}
                  className="bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-xs"
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
                    className="flex-1 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-xs"
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
                    className="w-16 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-xs"
                    min={1}
                  />
                )}

                <button type="button"
                  onClick={() => {
                    const prerequisites = [...data.prerequisites];
                    prerequisites.splice(i, 1);
                    updateData({ prerequisites });
                  }}
                  aria-label="Remove prerequisite"
                  className="p-1 rounded bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]"
                >
                  <Trash2 className="w-3 h-3 text-[var(--aethel-error-light)]" />
                </button>
              </div>
            ))}

            <button type="button"
              onClick={() => {
                const newPrereq: QuestPrerequisite = { type: 'quest', questId: '' };
                updateData({ prerequisites: [...data.prerequisites, newPrereq] });
              }}
              className="flex items-center gap-1 w-full p-2 bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] rounded text-xs"
            >
              <Plus className="w-3 h-3" />
              Add Prerequisite
            </button>
          </div>
        )}
      </div>

      {/* Advanced */}
      <div>
        <button type="button"
          onClick={() => toggleSection('advanced')}
          className="flex items-center gap-2 w-full text-left text-sm font-medium mb-2"
        >
          {openSections.advanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Settings className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
          Advanced
        </button>

        {openSections.advanced && (
          <div className="pl-6 space-y-3">
            <div>
              <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Time Limit (seconds)</label>
              <input
                type="number"
                value={data.timeLimit || ''}
                onChange={(e) => updateData({ timeLimit: parseInt(e.target.value) || undefined })}
                className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1.5 text-sm"
                placeholder="No limit"
                min={0}
              />
            </div>

            <div>
              <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Repeatable After (seconds)</label>
              <input
                type="number"
                value={data.repeatableAfter || ''}
                onChange={(e) => updateData({ repeatableAfter: parseInt(e.target.value) || undefined })}
                className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1.5 text-sm"
                placeholder="Not repeatable"
                min={0}
              />
            </div>

            <div>
              <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Journal Entry</label>
              <textarea
                value={data.journalEntry || ''}
                onChange={(e) => updateData({ journalEntry: e.target.value })}
                className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="Extended journal entry..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Delete */}
      <button type="button"
        onClick={() => onDelete(node.id)}
        className="flex items-center justify-center gap-2 w-full p-2 bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] rounded text-[var(--aethel-error-light)] text-sm"
      >
        <Trash2 className="w-4 h-4" />
        Delete Quest
      </button>
    </div>
  );
}
