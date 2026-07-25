'use client';

/**
 * AETHEL ENGINE - Gameplay Ability System Editor
 *
 * Visual editor for the GAS (Gameplay Ability System).
 * Connects the 957-line backend system to a professional UI.
 *
 * Features:
 * - Tag-based ability browser
 * - Visual attribute editor
 * - Gameplay effect composer
 * - Ability cost/cooldown editor
 * - Real-time preview
 *
 * @see lib/gameplay-ability-system.ts for backend implementation
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Zap, Flame, Shield, Heart } from 'lucide-react';
import {
  AbilitySystemComponent,
  GameplayAbilitySpec,
  GameplayEffectSpec,
  GameplayTag,
  AttributeDefinition,
  AbilityActivationType,
  TargetingMode,
} from '@aethel/gameplay-ability-system';
import { useGameplayAbilitySystem } from '@/lib/hooks/useGameplayAbilitySystem';

// Icons (inline SVG to avoid dependencies)
const Icons = {
  Zap: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Shield: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Fire: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>,
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Save: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  Clock: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Target: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2}/><circle cx="12" cy="12" r="6" strokeWidth={2}/><circle cx="12" cy="12" r="2" strokeWidth={2}/></svg>,
};

// ============================================================================
// Types
// ============================================================================

interface AbilityEditorProps {
  asc?: AbilitySystemComponent;
  entityId?: string;
  onAbilityChange?: (ability: GameplayAbilitySpec) => void;
  onSave?: () => void;
  className?: string;
}

// ============================================================================
// Default Attributes (RPG Standard)
// ============================================================================

const DEFAULT_ATTRIBUTES: AttributeDefinition[] = [
  { name: 'Health', baseValue: 100, minValue: 0, maxValue: 1000, regenRate: 0 },
  { name: 'MaxHealth', baseValue: 100, minValue: 1, maxValue: 1000 },
  { name: 'Mana', baseValue: 50, minValue: 0, maxValue: 500, regenRate: 1 },
  { name: 'MaxMana', baseValue: 50, minValue: 1, maxValue: 500 },
  { name: 'Stamina', baseValue: 100, minValue: 0, maxValue: 200, regenRate: 5 },
  { name: 'Strength', baseValue: 10, minValue: 1, maxValue: 100 },
  { name: 'Defense', baseValue: 5, minValue: 0, maxValue: 100 },
  { name: 'AttackPower', baseValue: 10, minValue: 1, maxValue: 500 },
];

// ============================================================================
// Sample Abilities
// ============================================================================

function createSampleAbilities(): GameplayAbilitySpec[] {
  return [
    {
      id: 'fireball',
      name: 'Fireball',
      description: 'Launches a ball of fire at the target.',
      icon: 'Flame',
      activationType: 'triggered',
      targetingMode: 'projectile',
      costs: [{ attribute: 'Mana', value: 25 }],
      cooldown: { duration: 3, tags: [GameplayTag.fromString('Cooldown.Fireball')] },
      tags: {
        ability: [GameplayTag.fromString('Ability.Active'), GameplayTag.fromString('Damage.Fire')],
        cancel: [],
        block: [GameplayTag.fromString('State.Silenced')],
        activation: { required: [], blocked: [GameplayTag.fromString('State.Dead')] },
      },
      effects: [],
      range: 30,
    },
    {
      id: 'heal',
      name: 'Heal',
      description: 'Restores health to the target.',
      icon: 'Heart',
      activationType: 'triggered',
      targetingMode: 'single',
      costs: [{ attribute: 'Mana', value: 30 }],
      cooldown: { duration: 5, tags: [GameplayTag.fromString('Cooldown.Heal')] },
      tags: {
        ability: [GameplayTag.fromString('Ability.Active')],
        cancel: [],
        block: [],
        activation: { required: [], blocked: [] },
      },
      effects: [],
    },
    {
      id: 'shield',
      name: 'Shield Block',
      description: 'Raises shield, reducing incoming damage.',
      icon: 'Shield',
      activationType: 'toggle',
      targetingMode: 'self',
      costs: [{ attribute: 'Stamina', value: 10 }],
      tags: {
        ability: [GameplayTag.fromString('Ability.Active')],
        cancel: [],
        block: [],
        activation: { required: [], blocked: [] },
      },
      effects: [],
    },
  ];
}

// ============================================================================
// Components
// ============================================================================

function TagBadge({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  const getTagColor = (t: string) => {
    if (t.includes('Fire')) return 'bg-[var(--aethel-warning)]';
    if (t.includes('Ice')) return 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]';
    if (t.includes('Lightning')) return 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]';
    if (t.includes('Damage')) return 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]';
    if (t.includes('State')) return 'bg-[var(--aethel-primary)]';
    if (t.includes('Ability')) return 'bg-[var(--aethel-primary)]';
    return 'bg-[var(--aethel-success)]';
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs text-[var(--aethel-text-primary)] ${getTagColor(tag)}`}>
      {tag.split('.').pop()}
      {onRemove && (
        <button type="button" aria-label={`Remove tag ${tag}`} onClick={onRemove} className="ml-1 hover:text-[var(--aethel-error-light)]">×</button>
      )}
    </span>
  );
}

function AttributeBar({ name, current, max, color = 'blue' }: {
  name: string; current: number; max: number; color?: string;
}) {
  const percentage = Math.min(100, (current / max) * 100);
  const colorClass = {
    blue: 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]',
    green: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]',
    red: 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]',
    yellow: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]',
    purple: 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]',
  }[color] || 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[var(--aethel-text-tertiary)]">
        <span>{name}</span>
        <span>{current}/{max}</span>
      </div>
      <div className="h-2 bg-[var(--aethel-surface-secondary)] rounded-full overflow-hidden">
        <div className={`h-full ${colorClass} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function AbilityCard({
  ability,
  isSelected,
  isOnCooldown,
  cooldownRemaining,
  onClick
}: {
  ability: GameplayAbilitySpec;
  isSelected: boolean;
  isOnCooldown?: boolean;
  cooldownRemaining?: number;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'bg-[var(--aethel-primary)] ring-2 ring-[var(--aethel-info-light)]'
          : 'bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-secondary)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
          {ability.icon === 'Flame' ? <Flame className="w-4 h-4 text-orange-400" /> :
           ability.icon === 'Heart' ? <Heart className="w-4 h-4 text-emerald-400" /> :
           ability.icon === 'Shield' ? <Shield className="w-4 h-4 text-sky-400" /> :
           <Zap className="w-4 h-4 text-amber-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-[var(--aethel-text-primary)] truncate">{ability.name}</h4>
          <p className="text-xs text-[var(--aethel-text-tertiary)] truncate">{ability.description}</p>
        </div>
        {isOnCooldown ? (
          <span
            className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--aethel-warning-light)]"
            data-testid="ability-cooldown-badge"
          >
            {(cooldownRemaining ?? 0).toFixed(1)}s
          </span>
        ) : null}
      </div>
      <div className="flex gap-1 mt-2 flex-wrap">
        {ability.tags.ability.slice(0, 2).map((tag, i) => (
          <TagBadge key={i} tag={tag.name} />
        ))}
      </div>
    </div>
  );
}

function EffectCard({ effect }: { effect: GameplayEffectSpec }) {
  return (
    <div className="p-3 bg-[var(--aethel-surface-secondary)] rounded-lg">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[var(--aethel-text-primary)]">{effect.name}</span>
        <span className={`px-2 py-0.5 text-xs rounded ${
          effect.durationType === 'instant' ? 'bg-[var(--aethel-success)]' :
          effect.durationType === 'duration' ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]' : 'bg-[var(--aethel-primary)]'
        }`}>
          {effect.durationType}
        </span>
      </div>
      <p className="text-xs text-[var(--aethel-text-tertiary)] mt-1">{effect.description}</p>
      {effect.modifiers.length > 0 && (
        <div className="mt-2 space-y-1">
          {effect.modifiers.slice(0, 3).map((mod, i) => (
            <div key={i} className="text-xs text-[var(--aethel-text-secondary)]">
              {mod.attribute}: {mod.operation === 'add' ? '+' : '×'}{mod.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Editor Component
// ============================================================================

const INITIAL_ABILITIES = createSampleAbilities();

export function AbilityEditor({
  asc: externalAsc,
  entityId = 'player',
  onAbilityChange,
  onSave,
  className = '',
}: AbilityEditorProps): JSX.Element {
  // Live Gameplay Ability System — replaces the previous local-only sample
  // state (Anti-Mock fix): abilities are granted to a real ASC, costs/
  // cooldowns are paid for real on activation, and attribute regen ticks
  // at the hook's game-loop rate. `asc` prop is accepted for future callers
  // that own an external ASC; today's call sites don't supply one, so the
  // internal live system below is what actually backs this editor.
  const gas = useGameplayAbilitySystem({
    attributes: DEFAULT_ATTRIBUTES,
    useStandardAttributes: false,
    abilities: INITIAL_ABILITIES,
  });

  // State
  const [abilities, setAbilities] = useState<GameplayAbilitySpec[]>(INITIAL_ABILITIES);
  const [selectedAbility, setSelectedAbility] = useState<GameplayAbilitySpec | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'abilities' | 'attributes' | 'effects'>('abilities');
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    activationType: 'triggered' as AbilityActivationType,
    targetingMode: 'single' as TargetingMode,
    cooldownDuration: 0,
    manaCost: 0,
  });

  // Live runtime state (cooldown/canActivate/costs available) for the
  // currently selected ability — sourced from the real ASC, not a stub.
  const liveSelected = selectedAbility ? gas.abilities.get(selectedAbility.id) : undefined;

  // Handlers
  const handleSelectAbility = useCallback((ability: GameplayAbilitySpec) => {
    setSelectedAbility(ability);
    setTestFeedback(null);
    setFormData({
      name: ability.name,
      description: ability.description,
      activationType: ability.activationType,
      targetingMode: ability.targetingMode,
      cooldownDuration: ability.cooldown?.duration || 0,
      manaCost: ability.costs.find(c => c.attribute === 'Mana')?.value || 0,
    });
    onAbilityChange?.(ability);
  }, [onAbilityChange]);

  // Re-grant an edited spec to the live ASC (grantAbility no-ops if the id
  // already exists, so an in-place edit removes then re-grants).
  const applyAbilityUpdate = useCallback((updated: GameplayAbilitySpec) => {
    setAbilities(prev => prev.map(a => (a.id === updated.id ? updated : a)));
    setSelectedAbility(updated);
    gas.removeAbility(updated.id);
    gas.grantAbility(updated);
    onAbilityChange?.(updated);
  }, [gas, onAbilityChange]);

  const handleUpdateManaCost = useCallback((manaCost: number) => {
    if (!selectedAbility) return;
    applyAbilityUpdate({
      ...selectedAbility,
      costs: manaCost > 0 ? [{ attribute: 'Mana', value: manaCost }] : [],
    });
  }, [selectedAbility, applyAbilityUpdate]);

  const handleUpdateCooldown = useCallback((duration: number) => {
    if (!selectedAbility) return;
    applyAbilityUpdate({
      ...selectedAbility,
      cooldown: duration > 0
        ? { duration, tags: selectedAbility.cooldown?.tags ?? [] }
        : undefined,
    });
  }, [selectedAbility, applyAbilityUpdate]);

  const handleCreateAbility = useCallback(() => {
    const newAbility: GameplayAbilitySpec = {
      id: `ability_${Date.now()}`,
      name: formData.name || 'New Ability',
      description: formData.description || 'A new ability',
      activationType: formData.activationType,
      targetingMode: formData.targetingMode,
      costs: formData.manaCost > 0 ? [{ attribute: 'Mana', value: formData.manaCost }] : [],
      cooldown: formData.cooldownDuration > 0
        ? { duration: formData.cooldownDuration, tags: [] }
        : undefined,
      tags: {
        ability: [GameplayTag.fromString('Ability.Active')],
        cancel: [],
        block: [],
        activation: { required: [], blocked: [] },
      },
      effects: [],
    };

    setAbilities(prev => [...prev, newAbility]);
    setSelectedAbility(newAbility);
    setEditMode(false);
    gas.grantAbility(newAbility);
  }, [formData, gas]);

  const handleTestAbility = useCallback(() => {
    if (!selectedAbility) return;
    const live = gas.abilities.get(selectedAbility.id);
    if (live?.isOnCooldown) {
      setTestFeedback(`On cooldown — ${live.cooldownRemaining.toFixed(1)}s remaining`);
      return;
    }
    const activated = gas.activateAbility(selectedAbility.id);
    setTestFeedback(
      activated
        ? `Activated "${selectedAbility.name}" — costs paid against the live ASC.`
        : 'Cannot activate — insufficient resources or blocked by tags.',
    );
  }, [gas, selectedAbility]);

  const handleSave = useCallback(() => {
    onSave?.();
  }, [onSave]);

  // Effect presets
  const effectPresets: GameplayEffectSpec[] = useMemo(() => [
    {
      id: 'burn',
      name: 'Burn',
      description: 'Deals fire damage over time',
      durationType: 'duration',
      duration: 5,
      period: 1,
      modifiers: [{ id: 'burn_dmg', attribute: 'Health', operation: 'add', value: -5 }],
      grantedTags: [GameplayTag.fromString('State.Burning')],
      applicationTags: [],
      removalTags: [],
      requiredTags: [],
      blockedTags: [],
      stackingPolicy: 'aggregate',
      maxStacks: 5,
    },
    {
      id: 'shield',
      name: 'Shield',
      description: 'Increases defense temporarily',
      durationType: 'duration',
      duration: 10,
      modifiers: [{ id: 'shield_def', attribute: 'Defense', operation: 'add', value: 20 }],
      grantedTags: [GameplayTag.fromString('State.Shielded')],
      applicationTags: [],
      removalTags: [],
      requiredTags: [],
      blockedTags: [],
      stackingPolicy: 'refresh',
      maxStacks: 1,
    },
  ], []);

  return (
    <div className={`flex h-full bg-[var(--aethel-surface-secondary)] ${className}`}>
      {/* Left Panel - Ability List */}
      <div className="w-72 border-r border-[var(--aethel-border-primary)] flex flex-col">
        <div className="p-4 border-b border-[var(--aethel-border-primary)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Abilities</h2>
            <button type="button" aria-label="Create nova ability"
              onClick={() => setEditMode(true)}
              className="p-1.5 bg-[var(--aethel-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] rounded-lg transition"
            >
              <Icons.Plus />
            </button>
          </div>
          <input
            type="text"
            placeholder="Search abilities..."
            className="w-full px-3 py-2 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {abilities.map(ability => {
            const live = gas.abilities.get(ability.id);
            return (
              <AbilityCard
                key={ability.id}
                ability={ability}
                isSelected={selectedAbility?.id === ability.id}
                isOnCooldown={live?.isOnCooldown}
                cooldownRemaining={live?.cooldownRemaining}
                onClick={() => handleSelectAbility(ability)}
              />
            );
          })}
        </div>
      </div>

      {/* Center Panel - Editor */}
      <div className="flex-1 flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-[var(--aethel-border-primary)]">
          {(['abilities', 'attributes', 'effects'] as const).map(tab => (
            <button type="button" aria-label={`Open tab ${tab}`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition ${
                activeTab === tab
                  ? 'text-[var(--aethel-text-primary)] border-b-2 border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'abilities' && (
            <div className="space-y-6">
              {editMode ? (
                /* Create/Edit Form */
                <div className="max-w-xl space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Create Ability</h3>

                  <div>
                    <label className="block text-sm text-[var(--aethel-text-tertiary)] mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg text-[var(--aethel-text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[var(--aethel-text-tertiary)] mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg text-[var(--aethel-text-primary)] h-20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[var(--aethel-text-tertiary)] mb-1">Activation</label>
                      <select
                        value={formData.activationType}
                        onChange={e => setFormData(f => ({ ...f, activationType: e.target.value as AbilityActivationType }))}
                        className="w-full px-3 py-2 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg text-[var(--aethel-text-primary)]"
                      >
                        <option value="triggered">Triggered</option>
                        <option value="passive">Passive</option>
                        <option value="toggle">Toggle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--aethel-text-tertiary)] mb-1">Targeting</label>
                      <select
                        value={formData.targetingMode}
                        onChange={e => setFormData(f => ({ ...f, targetingMode: e.target.value as TargetingMode }))}
                        className="w-full px-3 py-2 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg text-[var(--aethel-text-primary)]"
                      >
                        <option value="self">Self</option>
                        <option value="single">Single Target</option>
                        <option value="aoe">Area of Effect</option>
                        <option value="projectile">Projectile</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[var(--aethel-text-tertiary)] mb-1">Cooldown (s)</label>
                      <input
                        type="number"
                        value={formData.cooldownDuration}
                        onChange={e => setFormData(f => ({ ...f, cooldownDuration: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg text-[var(--aethel-text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--aethel-text-tertiary)] mb-1">Mana Cost</label>
                      <input
                        type="number"
                        value={formData.manaCost}
                        onChange={e => setFormData(f => ({ ...f, manaCost: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg text-[var(--aethel-text-primary)]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" aria-label="Create ability com os dados do formulario"
                      onClick={handleCreateAbility}
                      className="px-4 py-2 bg-[var(--aethel-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] rounded-lg text-[var(--aethel-text-primary)] transition"
                    >
                      Create Ability
                    </button>
                    <button type="button" aria-label="Cancel ability creation"
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-secondary)] rounded-lg text-[var(--aethel-text-primary)] transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : selectedAbility ? (
                /* Ability Details */
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      {selectedAbility.icon === 'Flame' ? <Flame className="w-7 h-7 text-orange-400" /> :
                       selectedAbility.icon === 'Heart' ? <Heart className="w-7 h-7 text-emerald-400" /> :
                       selectedAbility.icon === 'Shield' ? <Shield className="w-7 h-7 text-sky-400" /> :
                       <Zap className="w-7 h-7 text-amber-400" />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-[var(--aethel-text-primary)]">{selectedAbility.name}</h3>
                      <p className="text-[var(--aethel-text-tertiary)] mt-1">{selectedAbility.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-[var(--aethel-surface-secondary)] rounded-lg">
                      <div className="flex items-center gap-2 text-[var(--aethel-text-tertiary)] mb-1">
                        <Icons.Zap />
                        <span className="text-sm">Activation</span>
                      </div>
                      <p className="text-[var(--aethel-text-primary)] font-medium capitalize">{selectedAbility.activationType}</p>
                    </div>
                    <div className="p-4 bg-[var(--aethel-surface-secondary)] rounded-lg">
                      <div className="flex items-center gap-2 text-[var(--aethel-text-tertiary)] mb-1">
                        <Icons.Target />
                        <span className="text-sm">Targeting</span>
                      </div>
                      <p className="text-[var(--aethel-text-primary)] font-medium capitalize">{selectedAbility.targetingMode}</p>
                    </div>
                    <div className="p-4 bg-[var(--aethel-surface-secondary)] rounded-lg">
                      <div className="flex items-center gap-2 text-[var(--aethel-text-tertiary)] mb-1">
                        <Icons.Clock />
                        <span className="text-sm">Cooldown (s)</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        aria-label="Edit cooldown duration in seconds"
                        value={selectedAbility.cooldown?.duration ?? 0}
                        onChange={e => handleUpdateCooldown(Number(e.target.value))}
                        className="w-full bg-transparent text-[var(--aethel-text-primary)] font-medium focus-visible:outline-none"
                        data-testid="ability-cooldown-input"
                      />
                      {liveSelected?.isOnCooldown ? (
                        <p className="mt-1 text-[10px] font-mono text-[var(--aethel-warning-light)]">
                          {liveSelected.cooldownRemaining.toFixed(1)}s remaining
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-[var(--aethel-text-tertiary)] mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAbility.tags.ability.map((tag, i) => (
                        <TagBadge key={i} tag={tag.name} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-[var(--aethel-text-tertiary)] mb-2">Costs</h4>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1 bg-[var(--aethel-surface-secondary)] rounded text-sm">
                        <span className="text-[var(--aethel-text-tertiary)]">Mana:</span>
                        <span className="text-[var(--aethel-error)]">-</span>
                        <input
                          type="number"
                          min={0}
                          aria-label="Edit mana cost"
                          value={selectedAbility.costs.find(c => c.attribute === 'Mana')?.value ?? 0}
                          onChange={e => handleUpdateManaCost(Number(e.target.value))}
                          className="w-16 bg-transparent text-[var(--aethel-error)] focus-visible:outline-none"
                          data-testid="ability-mana-cost-input"
                        />
                      </div>
                      {liveSelected ? (
                        <span className="text-xs text-[var(--aethel-text-tertiary)]" data-testid="ability-mana-available">
                          {(liveSelected.costs.find(c => c.attribute === 'Mana')?.available ?? gas.attributes.get('Mana')?.currentValue ?? 0).toFixed(0)} Mana available
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {testFeedback ? (
                    <p
                      className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]"
                      data-testid="ability-test-feedback"
                    >
                      {testFeedback}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-[var(--aethel-text-secondary)]">
                  Select an ability to view details
                </div>
              )}
            </div>
          )}

          {activeTab === 'attributes' && (
            <div className="max-w-md space-y-4">
              <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)] mb-4">Entity Attributes</h3>
              <p className="text-xs text-[var(--aethel-text-tertiary)] -mt-2">
                Live values from the ASC game loop — Mana/Stamina regen ticks in real time.
              </p>
              <AttributeBar
                name="Health"
                current={gas.attributes.get('Health')?.currentValue ?? 0}
                max={gas.attributes.get('MaxHealth')?.currentValue ?? 1}
                color="red"
              />
              <AttributeBar
                name="Mana"
                current={gas.attributes.get('Mana')?.currentValue ?? 0}
                max={gas.attributes.get('MaxMana')?.currentValue ?? 1}
                color="blue"
              />
              <AttributeBar
                name="Stamina"
                current={gas.attributes.get('Stamina')?.currentValue ?? 0}
                max={gas.attributes.get('MaxStamina')?.currentValue ?? 1}
                color="yellow"
              />
            </div>
          )}

          {activeTab === 'effects' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Effect Presets</h3>
              <div className="grid grid-cols-2 gap-4">
                {effectPresets.map(effect => (
                  <EffectCard key={effect.id} effect={effect} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="w-64 border-l border-[var(--aethel-border-primary)] p-4">
        <h3 className="text-sm font-medium text-[var(--aethel-text-tertiary)] mb-4">Live Preview</h3>

        <div className="space-y-4">
          <div className="aspect-square bg-[var(--aethel-surface-secondary)] rounded-lg flex items-center justify-center border border-[var(--aethel-border-primary)]">
            {selectedAbility ? (
              selectedAbility.icon === 'Flame' ? <Flame className="w-16 h-16 text-orange-400" /> :
              selectedAbility.icon === 'Heart' ? <Heart className="w-16 h-16 text-emerald-400" /> :
              selectedAbility.icon === 'Shield' ? <Shield className="w-16 h-16 text-sky-400" /> :
              <Zap className="w-16 h-16 text-amber-400" />
            ) : (
              <span className="text-[var(--aethel-text-secondary)] text-xs">No ability selected</span>
            )}
          </div>

          {selectedAbility && (
            <button
              type="button"
              aria-label={`Test ${selectedAbility.name} against the live ability system`}
              onClick={handleTestAbility}
              disabled={liveSelected?.isOnCooldown}
              className="w-full py-2 bg-[var(--aethel-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] rounded-lg text-[var(--aethel-text-primary)] text-sm transition disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="ability-test-button"
            >
              {liveSelected?.isOnCooldown
                ? `Cooldown ${liveSelected.cooldownRemaining.toFixed(1)}s`
                : 'Test Ability'}
            </button>
          )}

          <button type="button" aria-label="Save ability changes"
            onClick={handleSave}
            className="w-full py-2 bg-[var(--aethel-success)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded-lg text-[var(--aethel-text-primary)] text-sm transition flex items-center justify-center gap-2"
          >
            <Icons.Save />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default AbilityEditor;
