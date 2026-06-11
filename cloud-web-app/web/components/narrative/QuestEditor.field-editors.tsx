import { Trash2 } from 'lucide-react';

import { OBJECTIVE_ICONS } from './QuestEditor.icons';
import type { ObjectiveType, QuestObjective, QuestReward, RewardType } from './quest-editor-models';

interface ObjectiveEditorProps {
  objective: QuestObjective;
  onUpdate: (obj: QuestObjective) => void;
  onDelete: () => void;
}

export function ObjectiveEditor({ objective, onUpdate, onDelete }: ObjectiveEditorProps) {
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

interface RewardEditorProps {
  reward: QuestReward;
  onUpdate: (r: QuestReward) => void;
  onDelete: () => void;
}

export function RewardEditor({ reward, onUpdate, onDelete }: RewardEditorProps) {
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
