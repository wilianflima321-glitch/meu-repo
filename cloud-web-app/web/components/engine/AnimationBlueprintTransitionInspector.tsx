'use client';

import type { AnimationVariable, TransitionCondition, TransitionRule } from './AnimationBlueprint';

export function TransitionInspector({
  transition,
  variables,
  onUpdate,
}: {
  transition: TransitionRule | null;
  variables: AnimationVariable[];
  onUpdate: (updates: Partial<TransitionRule>) => void;
}) {
  if (!transition) return null;

  return (
    <div style={{ padding: '12px' }}>
      <div style={{
        fontWeight: 'bold',
        fontSize: '13px',
        color: 'var(--aethel-text-primary)',
        marginBottom: '16px',
      }}>
        Transition
      </div>

      {/* Blend Time */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>
          Blend Time: {transition.blendTime.toFixed(2)}s
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={transition.blendTime}
          onChange={(e) => onUpdate({ blendTime: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Blend Mode */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>
          Blend Mode
        </label>
        <select
          value={transition.blendMode}
          onChange={(e) => onUpdate({ blendMode: e.target.value as TransitionRule['blendMode'] })}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: 'var(--aethel-surface-primary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            fontSize: '12px',
          }}
        >
          <option value="linear">Linear</option>
          <option value="cubic">Cubic</option>
          <option value="custom">Custom Curve</option>
        </select>
      </div>

      {/* Automatic */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--aethel-text-secondary)',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={transition.automatic}
            onChange={(e) => onUpdate({ automatic: e.target.checked })}
          />
          Automatic (when animation ends)
        </label>
      </div>

      {/* Conditions */}
      <div style={{ marginTop: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--aethel-text-quaternary)' }}>Conditions</span>
          <button type="button" aria-label="Add condicao de transicao"
            onClick={() => {
              const newCondition: TransitionCondition = {
                variable: variables[0]?.name || '',
                operator: '==',
                value: 0,
              };
              onUpdate({ conditions: [...transition.conditions, newCondition] });
            }}
            style={{
              padding: '2px 8px',
              background: 'var(--aethel-surface-quaternary)',
              border: 'none',
              borderRadius: '3px',
              color: 'var(--aethel-text-primary)',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            + Add
          </button>
        </div>

        {transition.conditions.map((cond, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              marginBottom: '4px',
              padding: '6px',
              background: 'var(--aethel-surface-primary)',
              borderRadius: '4px',
            }}
          >
            <select
              value={cond.variable}
              onChange={(e) => {
                const newConditions = [...transition.conditions];
                newConditions[i] = { ...cond, variable: e.target.value };
                onUpdate({ conditions: newConditions });
              }}
              style={{
                flex: 1,
                padding: '2px 4px',
                background: 'var(--aethel-surface-tertiary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: '2px',
                color: 'var(--aethel-text-primary)',
                fontSize: '10px',
              }}
            >
              {variables.map((v) => (
                <option key={v.name} value={v.name}>{v.name}</option>
              ))}
            </select>

            <select
              value={cond.operator}
              onChange={(e) => {
                const newConditions = [...transition.conditions];
                newConditions[i] = { ...cond, operator: e.target.value as TransitionCondition['operator'] };
                onUpdate({ conditions: newConditions });
              }}
              style={{
                width: '40px',
                padding: '2px',
                background: 'var(--aethel-surface-tertiary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: '2px',
                color: 'var(--aethel-text-primary)',
                fontSize: '10px',
              }}
            >
              <option value="==">==</option>
              <option value="!=">!=</option>
              <option value="<">&lt;</option>
              <option value=">">&gt;</option>
              <option value="<=">&lt;=</option>
              <option value=">=">&gt;=</option>
            </select>

            <input
              type={typeof cond.value === 'boolean' ? 'checkbox' : 'number'}
              checked={typeof cond.value === 'boolean' ? cond.value : undefined}
              value={typeof cond.value !== 'boolean' ? cond.value : undefined}
              onChange={(e) => {
                const newConditions = [...transition.conditions];
                const varDef = variables.find(v => v.name === cond.variable);
                const value = varDef?.type === 'bool'
                  ? e.target.checked
                  : parseFloat(e.target.value);
                newConditions[i] = { ...cond, value };
                onUpdate({ conditions: newConditions });
              }}
              style={{
                width: '50px',
                padding: '2px 4px',
                background: 'var(--aethel-surface-tertiary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: '2px',
                color: 'var(--aethel-text-primary)',
                fontSize: '10px',
              }}
            />

            <button type="button" aria-label={`Remove condicao ${i + 1} da transicao`}
              onClick={() => {
                const newConditions = transition.conditions.filter((_, j) => j !== i);
                onUpdate({ conditions: newConditions });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--aethel-error)',
                cursor: 'pointer',
                padding: '2px',
                fontSize: '10px',
              }}
            >
              X
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
