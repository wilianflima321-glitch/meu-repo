'use client';

import { Handle, type NodeTypes, Position } from '@xyflow/react';
import type { AnimationStateType, TransitionCondition } from './AnimationBlueprint';

function StateNode({ data, selected }: { data: { label: string; type: AnimationStateType; animation?: string; isEntry?: boolean }; selected: boolean }) {
  const getNodeColor = () => {
    switch (data.type) {
      case 'entry': return 'var(--aethel-success)';
      case 'conduit': return 'var(--aethel-warning)';
      case 'blend': return 'var(--aethel-accent)';
      case 'blendspace1d':
      case 'blendspace2d': return 'var(--aethel-info)';
      case 'montage': return 'var(--aethel-error)';
      case 'slot': return 'var(--aethel-text-quaternary)';
      default: return 'var(--aethel-primary)';
    }
  };

  const getNodeIcon = () => {
    switch (data.type) {
      case 'entry': return 'START';
      case 'conduit': return 'FX';
      case 'blend': return 'BLEND';
      case 'blendspace1d': return '1D';
      case 'blendspace2d': return '2D';
      case 'montage': return 'ANIM';
      case 'slot': return 'SLOT';
      default: return 'STATE';
    }
  };

  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--aethel-surface-tertiary)',
      border: `2px solid ${selected ? 'var(--aethel-text-primary)' : getNodeColor()}`,
      borderRadius: data.type === 'entry' ? '50%' : '8px',
      minWidth: data.type === 'entry' ? '60px' : '140px',
      textAlign: 'center',
      boxShadow: selected ? `0 0 12px ${getNodeColor()}` : '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      {/* Input handle */}
      {data.type !== 'entry' && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: getNodeColor(),
            width: '12px',
            height: '12px',
            border: '2px solid var(--aethel-text-primary)',
          }}
        />
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: data.animation ? '8px' : 0,
      }}>
        <span>{getNodeIcon()}</span>
        <span style={{
          fontWeight: 'bold',
          color: 'var(--aethel-text-primary)',
          fontSize: '13px',
        }}>
          {data.label}
        </span>
      </div>

      {/* Animation name */}
      {data.animation && (
        <div style={{
          fontSize: '11px',
          color: 'var(--aethel-text-quaternary)',
          padding: '4px 8px',
          background: 'var(--aethel-surface-primary)',
          borderRadius: '4px',
        }}>
          ANIM {data.animation}
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: getNodeColor(),
          width: '12px',
          height: '12px',
          border: '2px solid var(--aethel-text-primary)',
        }}
      />
    </div>
  );
}

export function TransitionLabel({ data }: { data: { conditions?: TransitionCondition[]; blendTime: number } }) {
  if (!data.conditions?.length) {
    return (
      <div style={{
        padding: '4px 8px',
        background: 'var(--aethel-surface-tertiary)',
        borderRadius: '4px',
        fontSize: '10px',
        color: 'var(--aethel-text-quaternary)',
        border: '1px solid var(--aethel-border-primary)',
      }}>
        Auto ({data.blendTime}s)
      </div>
    );
  }

  return (
    <div style={{
      padding: '6px 10px',
      background: 'var(--aethel-surface-tertiary)',
      borderRadius: '4px',
      fontSize: '10px',
      color: 'var(--aethel-text-secondary)',
      border: '1px solid var(--aethel-border-primary)',
      maxWidth: '120px',
    }}>
      {data.conditions.map((cond, i) => (
        <div key={i}>
          {cond.variable} {cond.operator} {String(cond.value)}
        </div>
      ))}
      <div style={{ color: 'var(--aethel-text-muted)', marginTop: '2px' }}>
        Blend: {data.blendTime}s
      </div>
    </div>
  );
}

export const nodeTypes: NodeTypes = {
  animState: StateNode,
};
