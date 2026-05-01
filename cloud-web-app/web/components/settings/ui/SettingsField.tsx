import { Copy, Minus, Plus, RotateCcw } from 'lucide-react';

import type { SettingDefinition } from './settings-types';

interface BaseSettingFieldProps {
  definition: SettingDefinition;
  modified: boolean;
  onReset: () => void;
}

interface SettingFieldProps extends BaseSettingFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
}

function SettingLabel({
  definition,
  modified,
  onReset,
}: BaseSettingFieldProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{definition.key}</span>
          {modified && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] rounded bg-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)] text-[var(--aethel-info-light)]">
              Modified
            </span>
          )}
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--aethel-text-secondary)]">{definition.description}</p>
        {!!definition.tags?.length && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {definition.tags.map(tag => (
              <span
                key={tag}
                className="rounded-full bg-[var(--aethel-surface-tertiary)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      {modified && (
        <button
          type="button"
          onClick={onReset}
          className="rounded p-1 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
          title="Restore default"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function BooleanSetting({ definition, value, onChange, modified, onReset }: BaseSettingFieldProps & {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={value}
        onChange={event => onChange(event.target.checked)}
        className="mt-1 rounded border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-info)] focus:ring-[var(--aethel-info)]"
      />
      <div className="min-w-0 flex-1">
        <SettingLabel definition={definition} modified={modified} onReset={onReset} />
      </div>
    </div>
  );
}

function StringSetting({ definition, value, onChange, modified, onReset }: BaseSettingFieldProps & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <SettingLabel definition={definition} modified={modified} onReset={onReset} />
      <input
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 w-full rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-sm text-[var(--aethel-text-primary)] outline-none focus:ring-1 focus:ring-[var(--aethel-info)]"
      />
    </div>
  );
}

function NumberSetting({ definition, value, onChange, modified, onReset }: BaseSettingFieldProps & {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <SettingLabel definition={definition} modified={modified} onReset={onReset} />
      <div className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={definition.minimum}
          max={definition.maximum}
          value={value}
          onChange={event => onChange(parseFloat(event.target.value))}
          step={definition.maximum && definition.maximum <= 1 ? 0.1 : 1}
          className="flex-1"
        />
        <input
          type="number"
          min={definition.minimum}
          max={definition.maximum}
          value={value}
          onChange={event => onChange(parseFloat(event.target.value))}
          step={definition.maximum && definition.maximum <= 1 ? 0.01 : 1}
          className="w-24 rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-2 py-1 text-sm text-[var(--aethel-text-primary)] outline-none focus:ring-1 focus:ring-[var(--aethel-info)]"
        />
      </div>
    </div>
  );
}

function EnumSetting({ definition, value, onChange, modified, onReset }: BaseSettingFieldProps & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <SettingLabel definition={definition} modified={modified} onReset={onReset} />
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 w-full rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-sm text-[var(--aethel-text-primary)] outline-none focus:ring-1 focus:ring-[var(--aethel-info)]"
      >
        {definition.enum?.map((option, index) => (
          <option key={option} value={option}>
            {option}
            {definition.enumDescriptions?.[index] && ` - ${definition.enumDescriptions[index]}`}
          </option>
        ))}
      </select>
    </div>
  );
}

function ArraySetting({ definition, value, onChange, modified, onReset }: BaseSettingFieldProps & {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const addItem = () => onChange([...value, '']);
  const removeItem = (index: number) => onChange(value.filter((_, itemIndex) => itemIndex !== index));
  const updateItem = (index: number, nextValue: string) =>
    onChange(value.map((item, itemIndex) => (itemIndex === index ? nextValue : item)));

  return (
    <div>
      <SettingLabel definition={definition} modified={modified} onReset={onReset} />
      <div className="mt-2 space-y-2">
        {value.map((item, index) => (
          <div key={`${definition.key}-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={event => updateItem(index, event.target.value)}
              className="flex-1 rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-sm text-[var(--aethel-text-primary)] outline-none focus:ring-1 focus:ring-[var(--aethel-info)]"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-error)]"
              aria-label={`Remove ${definition.key} item ${index + 1}`}
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-sm text-[var(--aethel-text-secondary)] transition-colors hover:text-[var(--aethel-text-primary)]"
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
      </div>
    </div>
  );
}

function ColorSetting({ definition, value, onChange, modified, onReset }: BaseSettingFieldProps & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <SettingLabel definition={definition} modified={modified} onReset={onReset} />
      <div className="mt-2 flex items-center gap-3">
        <input type="color" value={value} onChange={event => onChange(event.target.value)} className="h-10 w-16 rounded" />
        <input
          type="text"
          value={value}
          onChange={event => onChange(event.target.value)}
          className="flex-1 rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-sm text-[var(--aethel-text-primary)] outline-none focus:ring-1 focus:ring-[var(--aethel-info)]"
        />
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(value)}
          className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
          aria-label={`Copy ${definition.key} value`}
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SettingField({ definition, value, onChange, modified, onReset }: SettingFieldProps) {
  const sharedProps = { definition, modified, onReset };
  const fallbackNumber =
    typeof definition.default === 'number' && Number.isFinite(definition.default)
      ? definition.default
      : 0;
  const resolvedNumber = typeof value === 'number' && Number.isFinite(value) ? value : fallbackNumber;
  const resolvedBoolean = typeof value === 'boolean' ? value : Boolean(definition.default);

  switch (definition.type) {
    case 'boolean':
      return <BooleanSetting {...sharedProps} value={resolvedBoolean} onChange={onChange as (value: boolean) => void} />;
    case 'number':
      return <NumberSetting {...sharedProps} value={resolvedNumber} onChange={onChange as (value: number) => void} />;
    case 'enum':
      return <EnumSetting {...sharedProps} value={String(value ?? '')} onChange={onChange as (value: string) => void} />;
    case 'array':
      return <ArraySetting {...sharedProps} value={(value as string[]) || []} onChange={onChange as (value: string[]) => void} />;
    case 'color':
      return <ColorSetting {...sharedProps} value={String(value ?? '#000000')} onChange={onChange as (value: string) => void} />;
    default:
      return <StringSetting {...sharedProps} value={String(value ?? '')} onChange={onChange as (value: string) => void} />;
  }
}
