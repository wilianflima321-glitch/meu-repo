'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GitBranch,
  Lock,
  RotateCcw,
  Shield,
  Unlock,
} from 'lucide-react';

export interface BoneNode {
  id: string;
  name: string;
  isIKTarget?: boolean;
  locked?: boolean;
  visible?: boolean;
  children?: BoneNode[];
}

const DEFAULT_SKELETON: BoneNode = {
  id: 'root',
  name: 'Root',
  children: [
    {
      id: 'pelvis',
      name: 'Pelvis',
      children: [
        {
          id: 'spine_01',
          name: 'Spine_01',
          children: [
            {
              id: 'spine_02',
              name: 'Spine_02',
              children: [
                {
                  id: 'neck',
                  name: 'Neck',
                  children: [{ id: 'head', name: 'Head' }],
                },
                {
                  id: 'clavicle_l',
                  name: 'Clavicle_L',
                  children: [
                    {
                      id: 'upperarm_l',
                      name: 'UpperArm_L',
                      children: [
                        {
                          id: 'lowerarm_l',
                          name: 'LowerArm_L',
                          children: [{ id: 'hand_l', name: 'Hand_L', isIKTarget: true }],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'clavicle_r',
                  name: 'Clavicle_R',
                  children: [
                    {
                      id: 'upperarm_r',
                      name: 'UpperArm_R',
                      children: [
                        {
                          id: 'lowerarm_r',
                          name: 'LowerArm_R',
                          children: [{ id: 'hand_r', name: 'Hand_R', isIKTarget: true }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'thigh_l',
          name: 'Thigh_L',
          children: [
            {
              id: 'calf_l',
              name: 'Calf_L',
              children: [{ id: 'foot_l', name: 'Foot_L', isIKTarget: true }],
            },
          ],
        },
        {
          id: 'thigh_r',
          name: 'Thigh_R',
          children: [
            {
              id: 'calf_r',
              name: 'Calf_R',
              children: [{ id: 'foot_r', name: 'Foot_R', isIKTarget: true }],
            },
          ],
        },
      ],
    },
  ],
};

interface SkeletonHierarchyTreeProps {
  rootBone?: BoneNode;
  selectedBoneId?: string | null;
  onSelectBone?: (id: string) => void;
}

export function SkeletonHierarchyTree({
  rootBone = DEFAULT_SKELETON,
  selectedBoneId,
  onSelectBone,
}: SkeletonHierarchyTreeProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleVisible = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderBone = (bone: BoneNode, depth = 0) => {
    const isSelected = selectedBoneId === bone.id;
    const isLocked = locks[bone.id] ?? false;
    const isHidden = visibility[bone.id] ?? false;
    const isExpanded = !collapsed[bone.id];
    const hasChildren = Boolean(bone.children?.length);

    return (
      <div key={bone.id} className="select-none">
        <div
          onClick={() => onSelectBone?.(bone.id)}
          className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-mono transition cursor-pointer ${
            isSelected
              ? 'border border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)]'
              : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]'
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(bone.id);
                }}
                className="text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)]"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            ) : (
              <span className="w-3" />
            )}

            <GitBranch className="h-3.5 w-3.5 shrink-0 text-[var(--aethel-text-tertiary)]" />
            <span className="truncate">{bone.name}</span>

            {bone.isIKTarget && (
              <span className="ml-1 rounded border border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-1 py-0.2 text-[8px] font-bold text-[var(--aethel-warning-light)]">
                IK
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => toggleVisible(bone.id, e)}
              className="text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)] p-0.5"
            >
              {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={(e) => toggleLock(bone.id, e)}
              className="text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)] p-0.5"
            >
              {isLocked ? <Lock className="h-3 w-3 text-[var(--aethel-warning)]" /> : <Unlock className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-[var(--aethel-border-subtle)] ml-3">
            {bone.children!.map((child) => renderBone(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-4 w-4 text-[var(--aethel-primary)]" />
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-primary)]">
            Skeleton & IK Hierarchy
          </h3>
        </div>
        <span className="font-mono text-[9px] text-[var(--aethel-text-quaternary)]">
          Humanoid Retarget
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-0.5 pr-1">
        {renderBone(rootBone)}
      </div>
    </div>
  );
}
