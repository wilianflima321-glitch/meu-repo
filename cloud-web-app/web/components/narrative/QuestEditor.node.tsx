import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import type { ReactNode } from 'react';
import {
  Award,
  CheckCircle2,
  Coins,
  Package,
  Play,
  Star,
  Unlink,
  XCircle,
} from 'lucide-react';

import { OBJECTIVE_ICONS } from './QuestEditor.icons';
import { QUEST_CATEGORIES } from './quest-editor-models';
import type { QuestNodeData, QuestState } from './quest-editor-models';

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

  const stateIcons: Record<QuestState, ReactNode> = {
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

      <div className="px-3 py-2 text-xs text-[var(--aethel-text-secondary)] line-clamp-2 border-b border-[var(--aethel-border-primary)]/50">
        {data.description}
      </div>

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

export const nodeTypes = {
  quest: QuestNode,
};
