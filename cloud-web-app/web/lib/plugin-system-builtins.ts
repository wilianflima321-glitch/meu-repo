import type { Plugin } from './plugin-system-types';

// ============================================================================
// BUILT-IN PLUGINS
// ============================================================================

export const BUILTIN_PLUGINS: Plugin[] = [
  {
    id: 'aethel.typescript',
    name: 'TypeScript Support',
    version: '1.0.0',
    description: 'Full TypeScript language support',
    author: 'Aethel Team',
    categories: ['language'],
    activationEvents: ['onLanguage:typescript', 'onLanguage:javascript'],
    contributes: {
      languages: [
        {
          id: 'typescript',
          extensions: ['.ts', '.tsx'],
          aliases: ['TypeScript', 'ts'],
        },
        {
          id: 'javascript',
          extensions: ['.js', '.jsx'],
          aliases: ['JavaScript', 'js'],
        },
      ],
    },
  },
  {
    id: 'aethel.ai-assistant',
    name: 'AI Assistant',
    version: '1.0.0',
    description: 'AI-powered coding assistant',
    author: 'Aethel Team',
    categories: ['ai'],
    activationEvents: ['*'],
    contributes: {
      commands: [
        {
          command: 'aethel.ai.generate',
          title: 'Generate with AI',
          category: 'AI',
        },
        {
          command: 'aethel.ai.explain',
          title: 'Explain Code',
          category: 'AI',
        },
        {
          command: 'aethel.ai.refactor',
          title: 'Refactor with AI',
          category: 'AI',
        },
      ],
      keybindings: [
        {
          command: 'aethel.ai.generate',
          key: 'ctrl+shift+g',
          mac: 'cmd+shift+g',
        },
      ],
    },
  },
  {
    id: 'aethel.game-tools',
    name: 'Game Development Tools',
    version: '1.0.0',
    description: 'Essential tools for game development',
    author: 'Aethel Team',
    categories: ['game', 'tool'],
    activationEvents: ['onView:sceneEditor', 'onCommand:aethel.game.*'],
    contributes: {
      commands: [
        {
          command: 'aethel.game.play',
          title: 'Play Game',
          category: 'Game',
          icon: '▶️',
        },
        {
          command: 'aethel.game.pause',
          title: 'Pause Game',
          category: 'Game',
          icon: '⏸️',
        },
        {
          command: 'aethel.game.stop',
          title: 'Stop Game',
          category: 'Game',
          icon: '⏹️',
        },
      ],
      views: [
        {
          id: 'sceneEditor',
          name: 'Scene Editor',
          icon: '🎬',
          location: 'sidebar',
        },
        {
          id: 'hierarchy',
          name: 'Hierarchy',
          icon: '📁',
          location: 'sidebar',
        },
        {
          id: 'inspector',
          name: 'Inspector',
          icon: '🔍',
          location: 'sidebar',
        },
      ],
      gameComponents: [
        {
          name: 'Sprite Renderer',
          description: 'Renders 2D sprites',
          icon: '🖼️',
          properties: {
            sprite: { type: 'asset:sprite', default: null, description: 'Sprite asset' },
            color: { type: 'color', default: '#ffffff', description: 'Tint color' },
            flipX: { type: 'boolean', default: false, description: 'Flip horizontally' },
            flipY: { type: 'boolean', default: false, description: 'Flip vertically' },
          },
        },
        {
          name: 'Rigidbody 2D',
          description: 'Physics body for 2D',
          icon: '⚡',
          properties: {
            mass: { type: 'number', default: 1, description: 'Mass of the body' },
            gravityScale: { type: 'number', default: 1, description: 'Gravity multiplier' },
            drag: { type: 'number', default: 0, description: 'Linear drag' },
          },
        },
        {
          name: 'Collider 2D',
          description: 'Collision detection for 2D',
          icon: '📦',
          properties: {
            shape: { type: 'enum:box,circle,polygon', default: 'box', description: 'Collision shape' },
            isTrigger: { type: 'boolean', default: false, description: 'Is trigger only' },
          },
        },
      ],
    },
  },
  {
    id: 'aethel.theme-dark',
    name: 'Aethel Dark Theme',
    version: '1.0.0',
    description: 'Official dark theme for Aethel Engine',
    author: 'Aethel Team',
    categories: ['theme'],
    activationEvents: ['*'],
    contributes: {
      themes: [
        {
          id: 'aethel-dark',
          label: 'Aethel Dark',
          uiTheme: 'dark',
          path: './themes/dark.json',
        },
        {
          id: 'aethel-dark-high-contrast',
          label: 'Aethel Dark (High Contrast)',
          uiTheme: 'highContrast',
          path: './themes/dark-hc.json',
        },
      ],
    },
  },
];

