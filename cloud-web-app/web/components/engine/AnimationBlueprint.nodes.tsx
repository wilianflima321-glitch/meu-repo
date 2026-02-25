'use client';

import { Handle, Position, type NodeTypes } from '@xyflow/react';
import type { AnimationStateType } from './animation-blueprint-types';

function StateNode({
  data,
  selected,
}: {
  data: { label: string; type: AnimationStateType; animation?: string; isEntry?: boolean };
  selected: boolean;
}) {
  const getNodeColor = () => {
    switch (data.type) {
      case 'entry':
        return '#4caf50';
      case 'conduit':
        return '#ff9800';
      case 'blend':
        return '#9c27b0';
      case 'blendspace1d':
      case 'blendspace2d':
        return '#00bcd4';
      case 'montage':
        return '#f44336';
      case 'slot':
        return '#795548';
      default:
        return '#3f51b5';
    }
  };

  const getNodeIcon = () => {
    switch (data.type) {
      case 'entry':
        return 'Start';
      case 'conduit':
        return 'Cond';
      case 'blend':
        return 'Blend';
      case 'blendspace1d':
        return '1D';
      case 'blendspace2d':
        return '2D';
      case 'montage':
        return 'Mont';
      case 'slot':
        return 'Slot';
      default:
        return 'State';
    }
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        background: '#1a1a2e',
        border: `2px solid ${selected ? '#fff' : getNodeColor()}`,
        borderRadius: data.type === 'entry' ? '50%' : '8px',
        minWidth: data.type === 'entry' ? '60px' : '140px',
        textAlign: 'center',
        boxShadow: selected ? `0 0 12px ${getNodeColor()}` : '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {data.type !== 'entry' && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: getNodeColor(), width: '12px', height: '12px', border: '2px solid #fff' }}
        />
      )}

      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: data.animation ? '8px' : 0 }}
      >
        <span>{getNodeIcon()}</span>
        <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '13px' }}>{data.label}</span>
      </div>

      {data.animation && (
        <div
          style={{
            fontSize: '11px',
            color: '#888',
            padding: '4px 8px',
            background: '#0f0f23',
            borderRadius: '4px',
          }}
        >
          {data.animation}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: getNodeColor(), width: '12px', height: '12px', border: '2px solid #fff' }}
      />
    </div>
  );
}

export const animationBlueprintNodeTypes: NodeTypes = {
  animState: StateNode,
};
