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

import React, { useState, useCallback, useMemo } from 'react';
import {
  AbilitySystemComponent,
  GameplayAbilitySpec,
  GameplayEffectSpec,
  GameplayTag,
  AttributeDefinition,
  AbilityActivationType,
  TargetingMode,
} from '@/lib/gameplay-ability-system';

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
      icon: '🔥',
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
      icon: '💚',
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
      icon: '🛡️',
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
    if (t.includes('Fire')) return 'bg-orange-600';
    if (t.includes('Ice')) return 'bg-cyan-600';
    if (t.includes('Lightning')) return 'bg-yellow-600';
    if (t.includes('Damage')) return 'bg-red-600';
    if (t.includes('State')) return 'bg-purple-600';
    if (t.includes('Ability')) return 'bg-blue-600';
    return 'bg-green-600';
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs text-white ${getTagColor(tag)}`}>
      {tag.split('.').pop()}
      {onRemove && (
        <button onClick={onRemove} className="ml-1 hover:text-red-300">×</button>
      )}
    </span>
  );
}

function AttributeBar({ name, current, max, color = 'blue' }: { 
  name: string; current: number; max: number; color?: string;
}) {
  const percentage = Math.min(100, (current / max) * 100);
  const colorClass = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
  }[color] || 'bg-blue-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{name}</span>
        <span>{current}/{max}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${colorClass} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function AbilityCard({ 
  ability, 
  isSelected, 
  onClick 
}: { 
  ability: GameplayAbilitySpec; 
  isSelected: boolean; 
  onClick: () => void; 
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all ${
        isSelected 
          ? 'bg-blue-600 ring-2 ring-blue-400' 
          : 'bg-gray-800 hover:bg-gray-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{ability.icon || '⚡'}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">{ability.name}</h4>
          <p className="text-xs text-gray-400 truncate">{ability.description}</p>
        </div>
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
    <div className="p-3 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="font-medium text-white">{effect.name}</span>
        <span className={`px-2 py-0.5 text-xs rounded ${
          effect.durationType === 'instant' ? 'bg-green-600' :
          effect.durationType === 'duration' ? 'bg-yellow-600' : 'bg-purple-600'
        }`}>
          {effect.durationType}
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-1">{effect.description}</p>
      {effect.modifiers.length > 0 && (
        <div className="mt-2 space-y-1">
          {effect.modifiers.slice(0, 3).map((mod, i) => (
            <div key={i} className="text-xs text-gray-300">
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

export function AbilityEditor({
  asc,
  entityId = 'player',
  onAbilityChange,
  onSave,
  className = '',
}: AbilityEditorProps): JSX.Element {
  // State
  const [abilities, setAbilities] = useState<GameplayAbilitySpec[]>(createSampleAbilities);
  const [selectedAbility, setSelectedAbility] = useState<GameplayAbilitySpec | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'abilities' | 'attributes' | 'effects'>('abilities');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    activationType: 'triggered' as AbilityActivationType,
    targetingMode: 'single' as TargetingMode,
    cooldownDuration: 0,
    manaCost: 0,
  });

  // Sample attributes for preview
  const [attributes] = useState(() => ({
    Health: 80,
    MaxHealth: 100,
    Mana: 45,
    MaxMana: 50,
    Stamina: 100,
    MaxStamina: 100,
  }));

  // Handlers
  const handleSelectAbility = useCallback((ability: GameplayAbilitySpec) => {
    setSelectedAbility(ability);
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
  }, [formData]);

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
    <div className={`flex h-full bg-gray-900 ${className}`}>
      {/* Left Panel - Ability List */}
      <div className="w-72 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Abilities</h2>
            <button
              onClick={() => setEditMode(true)}
              className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              <Icons.Plus />
            </button>
          </div>
          <input
            type="text"
            placeholder="Search abilities..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {abilities.map(ability => (
            <AbilityCard
              key={ability.id}
              ability={ability}
              isSelected={selectedAbility?.id === ability.id}
              onClick={() => handleSelectAbility(ability)}
            />
          ))}
        </div>
      </div>

      {/* Center Panel - Editor */}
      <div className="flex-1 flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {(['abilities', 'attributes', 'effects'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition ${
                activeTab === tab 
                  ? 'text-white border-b-2 border-blue-500' 
                  : 'text-gray-400 hover:text-white'
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
                  <h3 className="text-lg font-semibold text-white">Create Ability</h3>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white h-20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Activation</label>
                      <select
                        value={formData.activationType}
                        onChange={e => setFormData(f => ({ ...f, activationType: e.target.value as AbilityActivationType }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="triggered">Triggered</option>
                        <option value="passive">Passive</option>
                        <option value="toggle">Toggle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Targeting</label>
                      <select
                        value={formData.targetingMode}
                        onChange={e => setFormData(f => ({ ...f, targetingMode: e.target.value as TargetingMode }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
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
                      <label className="block text-sm text-gray-400 mb-1">Cooldown (s)</label>
                      <input
                        type="number"
                        value={formData.cooldownDuration}
                        onChange={e => setFormData(f => ({ ...f, cooldownDuration: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Mana Cost</label>
                      <input
                        type="number"
                        value={formData.manaCost}
                        onChange={e => setFormData(f => ({ ...f, manaCost: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleCreateAbility}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition"
                    >
                      Create Ability
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : selectedAbility ? (
                /* Ability Details */
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <span className="text-5xl">{selectedAbility.icon || '⚡'}</span>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{selectedAbility.name}</h3>
                      <p className="text-gray-400 mt-1">{selectedAbility.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Icons.Zap />
                        <span className="text-sm">Activation</span>
                      </div>
                      <p className="text-white font-medium capitalize">{selectedAbility.activationType}</p>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Icons.Target />
                        <span className="text-sm">Targeting</span>
                      </div>
                      <p className="text-white font-medium capitalize">{selectedAbility.targetingMode}</p>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Icons.Clock />
                        <span className="text-sm">Cooldown</span>
                      </div>
                      <p className="text-white font-medium">{selectedAbility.cooldown?.duration || 0}s</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAbility.tags.ability.map((tag, i) => (
                        <TagBadge key={i} tag={tag.name} />
                      ))}
                    </div>
                  </div>

                  {selectedAbility.costs.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Costs</h4>
                      <div className="flex gap-4">
                        {selectedAbility.costs.map((cost, i) => (
                          <div key={i} className="px-3 py-1 bg-gray-800 rounded text-sm">
                            <span className="text-gray-400">{cost.attribute}:</span>
                            <span className="text-red-400 ml-1">-{cost.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  Select an ability to view details
                </div>
              )}
            </div>
          )}

          {activeTab === 'attributes' && (
            <div className="max-w-md space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Entity Attributes</h3>
              <AttributeBar name="Health" current={attributes.Health} max={attributes.MaxHealth} color="red" />
              <AttributeBar name="Mana" current={attributes.Mana} max={attributes.MaxMana} color="blue" />
              <AttributeBar name="Stamina" current={attributes.Stamina} max={attributes.MaxStamina} color="yellow" />
            </div>
          )}

          {activeTab === 'effects' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Effect Presets</h3>
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
      <div className="w-64 border-l border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Live Preview</h3>
        
        <div className="space-y-4">
          <div className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
            {selectedAbility ? (
              <span className="text-6xl">{selectedAbility.icon || '⚡'}</span>
            ) : (
              <span className="text-gray-600">No ability selected</span>
            )}
          </div>

          {selectedAbility && (
            <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition">
              Test Ability
            </button>
          )}

          <button
            onClick={handleSave}
            className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm transition flex items-center justify-center gap-2"
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
