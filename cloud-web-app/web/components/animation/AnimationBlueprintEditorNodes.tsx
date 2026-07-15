import { Edge, EdgeProps, getBezierPath, Handle, Node, NodeProps, Position } from '@xyflow/react';
import type { StateNodeData, TransitionEdgeData } from './animation-blueprint-editor.types';

function StateNode({ data, selected }: NodeProps<Node<StateNodeData>>) {
  const { state, isDefault, onEdit, onSetDefault } = data;
  const getNodeColor = () => {
    switch (state.type) {
      case 'entry': return 'var(--aethel-success)';
      case 'exit': return 'var(--aethel-error)';
      case 'conduit': return 'var(--aethel-warning)';
      case 'blend_space_1d':
      case 'blend_space_2d': return 'var(--aethel-accent)';
      default: return 'var(--aethel-primary)';
    }
  };
  return (
    <div
      style={{
        background: selected ? 'var(--aethel-surface-quaternary)' : 'var(--aethel-surface-tertiary)',
        border: `2px solid ${isDefault ? 'var(--aethel-success)' : getNodeColor()}`,
        borderRadius: '8px',
        padding: '12px 16px',
        minWidth: '150px',
        color: 'white',
        position: 'relative',
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'var(--aethel-text-quaternary)', width: 10, height: 10 }}
      />
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: getNodeColor(),
          }}
        />
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{state.name}</span>
        {isDefault && (
          <span style={{ fontSize: '10px', background: 'var(--aethel-success)', padding: '2px 6px', borderRadius: '4px' }}>
            Default
          </span>
        )}
      </div>
      {/* Animation info */}
      {state.animation && (
        <div style={{ fontSize: '12px', color: 'var(--aethel-text-tertiary)', marginBottom: '4px' }}>
          Anim {state.animation}
        </div>
      )}
      {/* Blend tree indicator */}
      {state.blendTree && (
        <div style={{ fontSize: '12px', color: 'var(--aethel-accent)' }}>
          Blend Blend Tree ({state.blendTree.type})
        </div>
      )}
      {/* Speed */}
      <div style={{ fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginTop: '4px' }}>
        Speed: {state.speed}x {state.loop ? 'loop' : ''}
      </div>
      {/* Notifies count */}
      {state.notifies.length > 0 && (
        <div style={{ fontSize: '11px', color: 'var(--aethel-warning)', marginTop: '2px' }}>
          Notes {state.notifies.length} notifies
        </div>
      )}
      {/* Context menu buttons (visible on hover) */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          display: 'flex',
          gap: '4px',
          opacity: selected ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      >
        <button type="button" aria-label={`Edit state ${state.name}`}
          onClick={(e) => { e.stopPropagation(); onEdit(state); }}
          style={{
            background: 'var(--aethel-surface-quaternary)',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '10px',
          }}
        >
          Edit
        </button>
        {!isDefault && state.type === 'state' && (
          <button type="button" aria-label={`Set ${state.name} as default state`}
            onClick={(e) => { e.stopPropagation(); onSetDefault(state.id); }}
            style={{
              background: 'var(--aethel-surface-quaternary)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            Set Default
          </button>
        )}
      </div>
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'var(--aethel-text-quaternary)', width: 10, height: 10 }}
      />
    </div>
  );
}
function TransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<Edge<TransitionEdgeData>>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const transition = data?.transition;
  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={selected ? 3 : 2}
        stroke={selected ? 'var(--aethel-primary)' : 'var(--aethel-text-quaternary)'}
        fill="none"
        markerEnd="url(#arrow)"
      />
      {/* Transition label */}
      {transition && (
        <foreignObject
          x={labelX - 50}
          y={labelY - 15}
          width={100}
          height={30}
          style={{ overflow: 'visible' }}
        >
          <div
            style={{
              background: 'var(--aethel-surface-tertiary)',
              border: '1px solid var(--aethel-border-primary)',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '10px',
              color: 'var(--aethel-text-tertiary)',
              textAlign: 'center',
              cursor: 'pointer',
            }}
            onClick={() => data?.onEdit?.(transition)}
          >
            {transition.conditions.length > 0
              ? `${transition.conditions.length} conditions`
              : 'No conditions'}
            <br />
            <span style={{ color: 'var(--aethel-text-quaternary)' }}>{transition.blendTime}s blend</span>
          </div>
        </foreignObject>
      )}
    </>
  );
}

export const nodeTypes = {
  state: StateNode,
};

export const edgeTypes = {
  transition: TransitionEdge,
};
