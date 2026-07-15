'use client';

import { useMemo } from 'react';
import type { Node } from '@xyflow/react';
import type { QuestNodeData, QuestState } from './quest-editor-models';

interface QuestStatsProps {
  nodes: Node<QuestNodeData>[];
}

export function QuestStats({ nodes }: QuestStatsProps) {
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
    <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] rounded p-3 text-xs space-y-2">
      <div className="font-medium text-[var(--aethel-text-secondary)] mb-2">Quest Statistics</div>
      <div className="flex justify-between">
        <span className="text-[var(--aethel-text-tertiary)]">Total Quests:</span>
        <span>{stats.total}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-[var(--aethel-text-tertiary)]">Main Quests:</span>
        <span className="text-[var(--aethel-warning-light)]">{stats.mainQuests}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-[var(--aethel-text-tertiary)]">Total Objectives:</span>
        <span>{stats.totalObjectives}</span>
      </div>
      <div className="h-px bg-[var(--aethel-surface-tertiary)] my-2" />
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]" />
        <span className="text-[var(--aethel-text-tertiary)]">Available:</span>
        <span className="ml-auto">{stats.byState.available}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]" />
        <span className="text-[var(--aethel-text-tertiary)]">Active:</span>
        <span className="ml-auto">{stats.byState.active}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]" />
        <span className="text-[var(--aethel-text-tertiary)]">Completed:</span>
        <span className="ml-auto">{stats.byState.completed}</span>
      </div>
    </div>
  );
}
