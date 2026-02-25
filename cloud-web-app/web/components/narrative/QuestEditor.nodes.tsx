import type { ReactNode } from 'react';
import { CheckCircle2, Play, Star, Unlink, XCircle } from 'lucide-react';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';

import { OBJECTIVE_ICONS, QUEST_CATEGORIES } from './QuestEditor.catalog';
import type { QuestNodeData, QuestState } from './QuestEditor.types';

export function QuestNode({ data, selected }: NodeProps<Node<QuestNodeData>>) {
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

  const stateIcons: Record<QuestState, ReactNode> = {
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

      <div className="px-3 py-2 text-xs text-slate-300 line-clamp-2 border-b border-slate-700/50">
        {data.description}
      </div>

      <div className="px-3 py-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
          <span>Objectives</span>
          <span>
            {completedObjectives}/{totalObjectives}
          </span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
            style={{ width: `${totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0}%` }}
          />
        </div>

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
              <span>
                {obj.currentCount}/{obj.targetCount}
              </span>
            </div>
          ))}
          {data.objectives.length > 2 && (
            <div className="text-[10px] text-slate-500 italic">+{data.objectives.length - 2} more...</div>
          )}
        </div>
      </div>

      <div className="px-3 py-1.5 border-t border-slate-700/50 flex items-center justify-between text-[10px]">
        <span className="text-slate-500">{data.rewards.length} rewards</span>
        {data.timeLimit && <span className="text-orange-400">⏱ {data.timeLimit}m</span>}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
}

export const questNodeTypes = {
  quest: QuestNode,
};
