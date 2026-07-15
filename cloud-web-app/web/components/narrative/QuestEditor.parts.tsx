'use client';

import { useState } from 'react';
import type { Node } from '@xyflow/react';
import {
  ChevronDown,
  ChevronRight,
  Gift,
  Link,
  Plus,
  Scroll,
  Settings,
  Target,
  Trash2,
} from 'lucide-react';

import { ObjectiveEditor, RewardEditor } from './QuestEditor.field-editors';
import { QUEST_CATEGORIES } from './quest-editor-models';
import type { QuestNodeData, QuestObjective, QuestPrerequisite, QuestReward, QuestState } from './quest-editor-models';

export { nodeTypes } from './QuestEditor.node';

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
