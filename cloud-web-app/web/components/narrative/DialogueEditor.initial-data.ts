import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { Character, DialogueNodeData, DialogueVariable } from './DialogueEditor.types';

export const DEFAULT_CHARACTERS: Character[] = [
  { id: 'player', name: 'Player', portrait: '/portraits/player.png', color: '#3b82f6', emotions: ['neutral', 'happy', 'angry', 'sad', 'surprised'] },
  { id: 'npc1', name: 'Merchant', portrait: '/portraits/merchant.png', color: '#22c55e', emotions: ['neutral', 'happy', 'suspicious', 'friendly'] },
  { id: 'npc2', name: 'Guard', portrait: '/portraits/guard.png', color: '#ef4444', emotions: ['neutral', 'stern', 'alert', 'relaxed'] },
];

export const DEFAULT_VARIABLES: DialogueVariable[] = [
  { name: 'player_gold', type: 'number', defaultValue: 100 },
  { name: 'has_key', type: 'boolean', defaultValue: false },
  { name: 'reputation', type: 'number', defaultValue: 50 },
  { name: 'quest_stage', type: 'string', defaultValue: 'not_started' },
];

export const initialDialogueNodes: Node<DialogueNodeData>[] = [
  {
    id: 'entry',
    type: 'entry',
    position: { x: 400, y: 50 },
    data: { label: 'Start', nodeType: 'entry' },
  },
  {
    id: 'dialogue1',
    type: 'dialogue',
    position: { x: 350, y: 150 },
    data: {
      label: 'Greeting',
      nodeType: 'dialogue',
      lines: [
        {
          id: 'l1',
          characterId: 'npc1',
          emotion: 'friendly',
          text: 'Welcome, traveler! Looking for something special today?',
          localization: { 'pt-BR': 'Bem-vindo, viajante! Procurando algo especial hoje?' },
        },
      ],
    },
  },
  {
    id: 'choice1',
    type: 'choice',
    position: { x: 350, y: 350 },
    data: {
      label: 'Player Response',
      nodeType: 'choice',
      choices: [
        { id: 'c1', text: 'Show me your wares.', localization: {} },
        { id: 'c2', text: "I'm just looking around.", localization: {} },
        { id: 'c3', text: 'Any rumors to share?', localization: {} },
      ],
    },
  },
  {
    id: 'exit1',
    type: 'exit',
    position: { x: 600, y: 500 },
    data: { label: 'End', nodeType: 'exit' },
  },
];

export const initialDialogueEdges: Edge[] = [
  { id: 'e1', source: 'entry', target: 'dialogue1', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2', source: 'dialogue1', target: 'choice1', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3', source: 'choice1', sourceHandle: 'c2', target: 'exit1', markerEnd: { type: MarkerType.ArrowClosed } },
];
