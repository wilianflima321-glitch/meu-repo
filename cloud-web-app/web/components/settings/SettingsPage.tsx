'use client'

/**
 * Settings Page - Professional IDE Settings Interface
 * Like VS Code Settings with all categories
 * 
 * Categories:
 * - Editor
 * - AI/Copilot
 * - Terminal
 * - Git
 * - Engine
 * - Appearance
 * - Keybindings
 * - Extensions
 * - Account
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Settings,
  Code,
  Terminal,
  GitBranch,
  Palette,
  Keyboard,
  Puzzle,
  User,
  Cpu,
  Bot,
  Search,
  ChevronRight,
  Check,
  X,
  RotateCcw,
  Download,
  Upload,
  Info,
  AlertCircle,
  Moon,
  Sun,
  Monitor,
  Type,
  Sliders,
  Eye,
  EyeOff,
  Zap,
  Shield,
  Globe,
  Bell,
  HardDrive,
  Cloud,
  Smartphone,
  Lock,
  CreditCard,
} from 'lucide-react'

// ============= Types =============

interface SettingItem {
  id: string
  label: string
  description: string
  type: 'toggle' | 'select' | 'number' | 'text' | 'color' | 'keybinding' | 'slider'
  value: any
  defaultValue: any
  options?: { label: string; value: any }[]
  min?: number
  max?: number
  step?: number
  category: string
  subcategory?: string
  tags?: string[]
  requiresReload?: boolean
}

interface SettingsCategory {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  subcategories?: { id: string; label: string }[]
}

// ============= Default Settings =============

const DEFAULT_SETTINGS: Record<string, any> = {
  // Editor
  'editor.fontSize': 14,
  'editor.fontFamily': 'JetBrains Mono, Fira Code, monospace',
  'editor.tabSize': 2,
  'editor.wordWrap': 'on',
  'editor.minimap': true,
  'editor.lineNumbers': 'on',
  'editor.renderWhitespace': 'selection',
  'editor.formatOnSave': true,
  'editor.formatOnPaste': false,
  'editor.autoSave': 'afterDelay',
  'editor.autoSaveDelay': 1000,
  'editor.cursorBlinking': 'blink',
  'editor.cursorStyle': 'line',
  'editor.smoothScrolling': true,
  'editor.bracketPairColorization': true,
  'editor.guides.indentation': true,
  'editor.stickyScroll.enabled': true,
  'editor.inlineSuggest.enabled': true,
  
  // AI/Copilot
  'ai.enabled': true,
  'ai.provider': 'openai',
  'ai.model': 'gpt-4o',
  'ai.inlineCompletion': true,
  'ai.completionDelay': 300,
  'ai.maxTokens': 2048,
  'ai.temperature': 0.7,
  'ai.chatPosition': 'right',
  'ai.showTokenCount': true,
  'ai.streamResponses': true,
  'ai.codeContext.enabled': true,
  'ai.codeContext.maxFiles': 10,
  'ai.codeContext.maxLines': 500,
  
  // Terminal
  'terminal.fontSize': 13,
  'terminal.fontFamily': 'JetBrains Mono, monospace',
  'terminal.cursorStyle': 'block',
  'terminal.cursorBlink': true,
  'terminal.scrollback': 10000,
  'terminal.shell.windows': 'powershell',
  'terminal.shell.linux': 'bash',
  'terminal.shell.osx': 'zsh',
  'terminal.copyOnSelect': true,
  'terminal.rightClickBehavior': 'paste',
  
  // Git
  'git.enabled': true,
  'git.autoFetch': true,
  'git.autoFetchPeriod': 180,
  'git.confirmSync': true,
  'git.enableSmartCommit': true,
  'git.autofetch': true,
  'git.pruneOnFetch': true,
  'git.defaultBranchName': 'main',
  'git.showInlineBlame': false,
  
  // Engine
  'engine.physics.enabled': true,
  'engine.physics.gravity': -9.81,
  'engine.physics.timeStep': 0.016,
  'engine.particles.quality': 'high',
  'engine.particles.maxCount': 100000,
  'engine.shadows.enabled': true,
  'engine.shadows.quality': 'high',
  'engine.shadows.cascades': 4,
  'engine.raytracing.enabled': false,
  'engine.antialiasing': 'msaa',
  'engine.antialiasing.samples': 4,
  'engine.vsync': true,
  'engine.targetFPS': 60,
  'engine.lod.enabled': true,
  'engine.lod.bias': 1.0,
  
  // Appearance
  'appearance.theme': 'dark',
  'appearance.colorScheme': 'default',
  'appearance.iconTheme': 'default',
  'appearance.sidebarPosition': 'left',
  'appearance.activityBarPosition': 'side',
  'appearance.menuBarVisibility': 'visible',
  'appearance.statusBarVisible': true,
  'appearance.breadcrumbs': true,
  'appearance.tabsMultipleRows': false,
  'appearance.compactFolders': true,
  
  // Notifications
  'notifications.enabled': true,
  'notifications.sound': false,
  'notifications.showInStatusBar': true,
  'notifications.doNotDisturb': false,
  
  // Privacy & Security
  'privacy.telemetry': 'all',
  'privacy.crashReports': true,
  'security.workspace.trust.enabled': true,
  'security.workspace.trust.untrustedFiles': 'prompt',
  
  // Sync
  'sync.enabled': false,
  'sync.settings': true,
  'sync.keybindings': true,
  'sync.extensions': true,
  'sync.snippets': true,
}

// ============= Categories Configuration =============

const CATEGORIES: SettingsCategory[] = [
  {
    id: 'editor',
    label: 'Editor',
    icon: <Code className="w-4 h-4" />,
    description: 'Configure code editor behavior',
    subcategories: [
      { id: 'font', label: 'Font' },
      { id: 'cursor', label: 'Cursor' },
      { id: 'formatting', label: 'Formatting' },
      { id: 'suggestions', label: 'Suggestions' },
    ],
  },
  {
    id: 'ai',
    label: 'AI & Copilot',
    icon: <Bot className="w-4 h-4" />,
    description: 'Configure AI assistant settings',
    subcategories: [
      { id: 'general', label: 'General' },
      { id: 'completion', label: 'Completion' },
      { id: 'chat', label: 'Chat' },
      { id: 'context', label: 'Context' },
    ],
  },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: <Terminal className="w-4 h-4" />,
    description: 'Configure integrated terminal',
  },
  {
    id: 'git',
    label: 'Git',
    icon: <GitBranch className="w-4 h-4" />,
    description: 'Configure source control',
  },
  {
    id: 'engine',
    label: 'Engine',
    icon: <Cpu className="w-4 h-4" />,
    description: 'Configure game engine settings',
    subcategories: [
      { id: 'physics', label: 'Physics' },
      { id: 'rendering', label: 'Rendering' },
      { id: 'particles', label: 'Particles' },
      { id: 'performance', label: 'Performance' },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: <Palette className="w-4 h-4" />,
    description: 'Customize look and feel',
    subcategories: [
      { id: 'theme', label: 'Theme' },
      { id: 'layout', label: 'Layout' },
      { id: 'icons', label: 'Icons' },
    ],
  },
  {
    id: 'keybindings',
    label: 'Keyboard Shortcuts',
    icon: <Keyboard className="w-4 h-4" />,
    description: 'Configure keyboard shortcuts',
  },
  {
    id: 'extensions',
    label: 'Extensions',
    icon: <Puzzle className="w-4 h-4" />,
    description: 'Manage installed extensions',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Bell className="w-4 h-4" />,
    description: 'Configure notifications',
  },
  {
    id: 'privacy',
    label: 'Privacy & Security',
    icon: <Shield className="w-4 h-4" />,
    description: 'Privacy and security settings',
  },
  {
    id: 'sync',
    label: 'Settings Sync',
    icon: <Cloud className="w-4 h-4" />,
    description: 'Sync settings across devices',
  },
  {
    id: 'account',
    label: 'Account',
    icon: <User className="w-4 h-4" />,
    description: 'Manage your account',
    subcategories: [
      { id: 'profile', label: 'Profile' },
      { id: 'billing', label: 'Billing' },
      { id: 'usage', label: 'Usage' },
    ],
  },
]

// ============= Setting Items Configuration =============

const SETTING_ITEMS: SettingItem[] = [
  // Editor - Font
  {
    id: 'editor.fontSize',
    label: 'Font Size',
    description: 'Controls the font size in pixels',
    type: 'number',
    value: 14,
    defaultValue: 14,
    min: 8,
    max: 32,
    category: 'editor',
    subcategory: 'font',
  },
  {
    id: 'editor.fontFamily',
    label: 'Font Family',
    description: 'Controls the font family',
    type: 'text',
    value: 'JetBrains Mono, Fira Code, monospace',
    defaultValue: 'JetBrains Mono, Fira Code, monospace',
    category: 'editor',
    subcategory: 'font',
  },
  {
    id: 'editor.tabSize',
    label: 'Tab Size',
    description: 'The number of spaces a tab is equal to',
    type: 'select',
    value: 2,
    defaultValue: 2,
    options: [
      { label: '2 spaces', value: 2 },
      { label: '4 spaces', value: 4 },
      { label: '8 spaces', value: 8 },
    ],
    category: 'editor',
    subcategory: 'formatting',
  },
  {
    id: 'editor.wordWrap',
    label: 'Word Wrap',
    description: 'Controls how lines should wrap',
    type: 'select',
    value: 'on',
    defaultValue: 'on',
    options: [
      { label: 'Off', value: 'off' },
      { label: 'On', value: 'on' },
      { label: 'Word Wrap Column', value: 'wordWrapColumn' },
      { label: 'Bounded', value: 'bounded' },
    ],
    category: 'editor',
    subcategory: 'formatting',
  },
  {
    id: 'editor.minimap',
    label: 'Minimap',
    description: 'Controls whether the minimap is shown',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'editor',
  },
  {
    id: 'editor.lineNumbers',
    label: 'Line Numbers',
    description: 'Controls the display of line numbers',
    type: 'select',
    value: 'on',
    defaultValue: 'on',
    options: [
      { label: 'Off', value: 'off' },
      { label: 'On', value: 'on' },
      { label: 'Relative', value: 'relative' },
    ],
    category: 'editor',
  },
  {
    id: 'editor.formatOnSave',
    label: 'Format On Save',
    description: 'Format a file on save',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'editor',
    subcategory: 'formatting',
  },
  {
    id: 'editor.cursorStyle',
    label: 'Cursor Style',
    description: 'Controls the cursor style',
    type: 'select',
    value: 'line',
    defaultValue: 'line',
    options: [
      { label: 'Line', value: 'line' },
      { label: 'Block', value: 'block' },
      { label: 'Underline', value: 'underline' },
      { label: 'Line Thin', value: 'line-thin' },
      { label: 'Block Outline', value: 'block-outline' },
      { label: 'Underline Thin', value: 'underline-thin' },
    ],
    category: 'editor',
    subcategory: 'cursor',
  },
  {
    id: 'editor.smoothScrolling',
    label: 'Smooth Scrolling',
    description: 'Controls whether the editor scrolls using an animation',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'editor',
  },
  {
    id: 'editor.bracketPairColorization',
    label: 'Bracket Pair Colorization',
    description: 'Controls whether bracket pair colorization is enabled',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'editor',
  },
  {
    id: 'editor.stickyScroll.enabled',
    label: 'Sticky Scroll',
    description: 'Shows nested current scopes during scroll',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'editor',
  },
  
  // AI Settings
  {
    id: 'ai.enabled',
    label: 'Enable AI Features',
    description: 'Enable or disable all AI features',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'ai',
    subcategory: 'general',
  },
  {
    id: 'ai.provider',
    label: 'AI Provider',
    description: 'Select the AI provider to use',
    type: 'select',
    value: 'openai',
    defaultValue: 'openai',
    options: [
      { label: 'OpenAI', value: 'openai' },
      { label: 'Anthropic (Claude)', value: 'anthropic' },
      { label: 'Google (Gemini)', value: 'google' },
      { label: 'DeepSeek', value: 'deepseek' },
      { label: 'Groq', value: 'groq' },
      { label: 'Ollama (Local)', value: 'ollama' },
    ],
    category: 'ai',
    subcategory: 'general',
  },
  {
    id: 'ai.model',
    label: 'AI Model',
    description: 'Select the AI model to use',
    type: 'select',
    value: 'gpt-4o',
    defaultValue: 'gpt-4o',
    options: [
      { label: 'GPT-4o', value: 'gpt-4o' },
      { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
      { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
      { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
      { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash-exp' },
      { label: 'DeepSeek V3', value: 'deepseek-chat' },
    ],
    category: 'ai',
    subcategory: 'general',
  },
  {
    id: 'ai.inlineCompletion',
    label: 'Inline Completion',
    description: 'Show AI suggestions inline as you type',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'ai',
    subcategory: 'completion',
  },
  {
    id: 'ai.completionDelay',
    label: 'Completion Delay',
    description: 'Delay in ms before showing completions',
    type: 'slider',
    value: 300,
    defaultValue: 300,
    min: 100,
    max: 1000,
    step: 50,
    category: 'ai',
    subcategory: 'completion',
  },
  {
    id: 'ai.temperature',
    label: 'Temperature',
    description: 'Controls randomness of AI responses (0 = deterministic, 1 = creative)',
    type: 'slider',
    value: 0.7,
    defaultValue: 0.7,
    min: 0,
    max: 1,
    step: 0.1,
    category: 'ai',
    subcategory: 'general',
  },
  {
    id: 'ai.chatPosition',
    label: 'Chat Position',
    description: 'Position of the AI chat panel',
    type: 'select',
    value: 'right',
    defaultValue: 'right',
    options: [
      { label: 'Right', value: 'right' },
      { label: 'Bottom', value: 'bottom' },
      { label: 'Floating', value: 'floating' },
    ],
    category: 'ai',
    subcategory: 'chat',
  },
  {
    id: 'ai.streamResponses',
    label: 'Stream Responses',
    description: 'Stream AI responses in real-time',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'ai',
    subcategory: 'chat',
  },
  
  // Terminal Settings
  {
    id: 'terminal.fontSize',
    label: 'Font Size',
    description: 'Controls the font size in the terminal',
    type: 'number',
    value: 13,
    defaultValue: 13,
    min: 8,
    max: 24,
    category: 'terminal',
  },
  {
    id: 'terminal.cursorStyle',
    label: 'Cursor Style',
    description: 'Controls the cursor style',
    type: 'select',
    value: 'block',
    defaultValue: 'block',
    options: [
      { label: 'Block', value: 'block' },
      { label: 'Line', value: 'line' },
      { label: 'Underline', value: 'underline' },
    ],
    category: 'terminal',
  },
  {
    id: 'terminal.scrollback',
    label: 'Scrollback',
    description: 'Number of lines to keep in scrollback',
    type: 'number',
    value: 10000,
    defaultValue: 10000,
    min: 1000,
    max: 100000,
    category: 'terminal',
  },
  
  // Git Settings
  {
    id: 'git.enabled',
    label: 'Enable Git',
    description: 'Enable Git integration',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'git',
  },
  {
    id: 'git.autoFetch',
    label: 'Auto Fetch',
    description: 'Automatically fetch from remotes',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'git',
  },
  {
    id: 'git.confirmSync',
    label: 'Confirm Sync',
    description: 'Confirm before syncing changes',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'git',
  },
  {
    id: 'git.showInlineBlame',
    label: 'Inline Blame',
    description: 'Show blame info inline',
    type: 'toggle',
    value: false,
    defaultValue: false,
    category: 'git',
  },
  
  // Engine Settings
  {
    id: 'engine.physics.enabled',
    label: 'Enable Physics',
    description: 'Enable physics simulation',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'engine',
    subcategory: 'physics',
  },
  {
    id: 'engine.physics.gravity',
    label: 'Gravity',
    description: 'World gravity value',
    type: 'number',
    value: -9.81,
    defaultValue: -9.81,
    min: -20,
    max: 0,
    step: 0.1,
    category: 'engine',
    subcategory: 'physics',
  },
  {
    id: 'engine.shadows.quality',
    label: 'Shadow Quality',
    description: 'Quality of shadow rendering',
    type: 'select',
    value: 'high',
    defaultValue: 'high',
    options: [
      { label: 'Off', value: 'off' },
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' },
      { label: 'Ultra', value: 'ultra' },
    ],
    category: 'engine',
    subcategory: 'rendering',
  },
  {
    id: 'engine.particles.quality',
    label: 'Particle Quality',
    description: 'Quality of particle effects',
    type: 'select',
    value: 'high',
    defaultValue: 'high',
    options: [
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' },
    ],
    category: 'engine',
    subcategory: 'particles',
  },
  {
    id: 'engine.raytracing.enabled',
    label: 'Ray Tracing',
    description: 'Enable ray tracing (requires compatible hardware)',
    type: 'toggle',
    value: false,
    defaultValue: false,
    category: 'engine',
    subcategory: 'rendering',
    requiresReload: true,
  },
  {
    id: 'engine.vsync',
    label: 'VSync',
    description: 'Enable vertical sync',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'engine',
    subcategory: 'performance',
  },
  {
    id: 'engine.targetFPS',
    label: 'Target FPS',
    description: 'Target frame rate',
    type: 'select',
    value: 60,
    defaultValue: 60,
    options: [
      { label: '30 FPS', value: 30 },
      { label: '60 FPS', value: 60 },
      { label: '120 FPS', value: 120 },
      { label: '144 FPS', value: 144 },
      { label: 'Unlimited', value: 0 },
    ],
    category: 'engine',
    subcategory: 'performance',
  },
  
  // Appearance Settings
  {
    id: 'appearance.theme',
    label: 'Theme',
    description: 'Select the color theme',
    type: 'select',
    value: 'dark',
    defaultValue: 'dark',
    options: [
      { label: 'Dark', value: 'dark' },
      { label: 'Light', value: 'light' },
      { label: 'System', value: 'system' },
    ],
    category: 'appearance',
    subcategory: 'theme',
  },
  {
    id: 'appearance.colorScheme',
    label: 'Color Scheme',
    description: 'Select the color scheme',
    type: 'select',
    value: 'default',
    defaultValue: 'default',
    options: [
      { label: 'Default', value: 'default' },
      { label: 'Dracula', value: 'dracula' },
      { label: 'One Dark Pro', value: 'one-dark-pro' },
      { label: 'GitHub Dark', value: 'github-dark' },
      { label: 'Nord', value: 'nord' },
      { label: 'Solarized Dark', value: 'solarized-dark' },
    ],
    category: 'appearance',
    subcategory: 'theme',
  },
  {
    id: 'appearance.sidebarPosition',
    label: 'Sidebar Position',
    description: 'Position of the sidebar',
    type: 'select',
    value: 'left',
    defaultValue: 'left',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
    ],
    category: 'appearance',
    subcategory: 'layout',
  },
  {
    id: 'appearance.statusBarVisible',
    label: 'Status Bar',
    description: 'Show the status bar',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'appearance',
    subcategory: 'layout',
  },
  {
    id: 'appearance.breadcrumbs',
    label: 'Breadcrumbs',
    description: 'Show breadcrumb navigation',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'appearance',
    subcategory: 'layout',
  },
  
  // Notification Settings
  {
    id: 'notifications.enabled',
    label: 'Enable Notifications',
    description: 'Show notifications',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'notifications',
  },
  {
    id: 'notifications.sound',
    label: 'Sound',
    description: 'Play sound with notifications',
    type: 'toggle',
    value: false,
    defaultValue: false,
    category: 'notifications',
  },
  {
    id: 'notifications.doNotDisturb',
    label: 'Do Not Disturb',
    description: 'Mute all notifications',
    type: 'toggle',
    value: false,
    defaultValue: false,
    category: 'notifications',
  },
  
  // Privacy Settings
  {
    id: 'privacy.telemetry',
    label: 'Telemetry',
    description: 'Send usage data to improve the product',
    type: 'select',
    value: 'all',
    defaultValue: 'all',
    options: [
      { label: 'All', value: 'all' },
      { label: 'Error only', value: 'error' },
      { label: 'Off', value: 'off' },
    ],
    category: 'privacy',
  },
  {
    id: 'privacy.crashReports',
    label: 'Crash Reports',
    description: 'Send crash reports',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'privacy',
  },
  
  // Sync Settings
  {
    id: 'sync.enabled',
    label: 'Settings Sync',
    description: 'Sync settings across devices',
    type: 'toggle',
    value: false,
    defaultValue: false,
    category: 'sync',
  },
  {
    id: 'sync.settings',
    label: 'Sync Settings',
    description: 'Include settings in sync',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'sync',
  },
  {
    id: 'sync.keybindings',
    label: 'Sync Keybindings',
    description: 'Include keybindings in sync',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'sync',
  },
  {
    id: 'sync.extensions',
    label: 'Sync Extensions',
    description: 'Include extensions in sync',
    type: 'toggle',
    value: true,
    defaultValue: true,
    category: 'sync',
  },
]

// ============= Setting Input Components =============

interface SettingInputProps {
  setting: SettingItem
  value: any
  onChange: (value: any) => void
}

function SettingToggle({ setting, value, onChange }: SettingInputProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        value ? 'bg-sky-600' : 'bg-slate-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SettingSelect({ setting, value, onChange }: SettingInputProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white min-w-[200px]"
    >
      {setting.options?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function SettingNumber({ setting, value, onChange }: SettingInputProps) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={setting.min}
      max={setting.max}
      step={setting.step || 1}
      className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white w-24"
    />
  )
}

function SettingText({ setting, value, onChange }: SettingInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white min-w-[300px]"
    />
  )
}

function SettingSlider({ setting, value, onChange }: SettingInputProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={setting.min}
        max={setting.max}
        step={setting.step || 1}
        className="w-32 accent-sky-500"
      />
      <span className="text-sm text-slate-400 w-12">{value}</span>
    </div>
  )
}

// ============= Setting Row Component =============

interface SettingRowProps {
  setting: SettingItem
  value: any
  onChange: (id: string, value: any) => void
  isModified: boolean
  onReset: () => void
}

function SettingRow({ setting, value, onChange, isModified, onReset }: SettingRowProps) {
  const InputComponent = {
    toggle: SettingToggle,
    select: SettingSelect,
    number: SettingNumber,
    text: SettingText,
    slider: SettingSlider,
  }[setting.type] || SettingText
  
  return (
    <div className="flex items-start justify-between py-4 border-b border-slate-800 group">
      <div className="flex-1 pr-8">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{setting.label}</span>
          {isModified && (
            <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">
              Modified
            </span>
          )}
          {setting.requiresReload && (
            <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded">
              Requires Reload
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{setting.description}</p>
        <p className="text-[10px] text-slate-600 font-mono mt-1">{setting.id}</p>
      </div>
      
      <div className="flex items-center gap-2">
        <InputComponent
          setting={setting}
          value={value}
          onChange={(v) => onChange(setting.id, v)}
        />
        {isModified && (
          <button
            onClick={onReset}
            className="p-1 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Reset to default"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ============= Main Settings Page Component =============

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>(DEFAULT_SETTINGS)
  const [selectedCategory, setSelectedCategory] = useState('editor')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('aethel-settings')
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
  }, [])
  
  // Save settings
  const saveSettings = useCallback(() => {
    localStorage.setItem('aethel-settings', JSON.stringify(settings))
  }, [settings])
  
  // Update setting
  const updateSetting = useCallback((id: string, value: any) => {
    setSettings((prev) => {
      const next = { ...prev, [id]: value }
      localStorage.setItem('aethel-settings', JSON.stringify(next))
      return next
    })
  }, [])
  
  // Reset setting to default
  const resetSetting = useCallback((id: string) => {
    setSettings((prev) => {
      const next = { ...prev, [id]: DEFAULT_SETTINGS[id] }
      localStorage.setItem('aethel-settings', JSON.stringify(next))
      return next
    })
  }, [])
  
  // Reset all settings
  const resetAllSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    localStorage.setItem('aethel-settings', JSON.stringify(DEFAULT_SETTINGS))
  }, [])
  
  // Filter settings by category and search
  const filteredSettings = useMemo(() => {
    let items = SETTING_ITEMS.filter((s) => s.category === selectedCategory)
    
    if (selectedSubcategory) {
      items = items.filter((s) => s.subcategory === selectedSubcategory)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      items = SETTING_ITEMS.filter(
        (s) =>
          s.label.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query)
      )
    }
    
    return items
  }, [selectedCategory, selectedSubcategory, searchQuery])
  
  // Get current category
  const currentCategory = CATEGORIES.find((c) => c.id === selectedCategory)
  
  // Count modified settings
  const modifiedCount = useMemo(() => {
    return Object.entries(settings).filter(
      ([key, value]) => DEFAULT_SETTINGS[key] !== value
    ).length
  }, [settings])
  
  return (
    <div className="flex h-full bg-slate-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-700 flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full bg-slate-800 border border-slate-700 rounded pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </div>
        </div>
        
        {/* Categories */}
        <div className="flex-1 overflow-y-auto py-2">
          {CATEGORIES.map((category) => (
            <div key={category.id}>
              <button
                onClick={() => {
                  setSelectedCategory(category.id)
                  setSelectedSubcategory(null)
                  setSearchQuery('')
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                  selectedCategory === category.id && !selectedSubcategory
                    ? 'bg-sky-600/20 text-sky-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {category.icon}
                <span className="text-sm">{category.label}</span>
              </button>
              
              {/* Subcategories */}
              {selectedCategory === category.id && category.subcategories && (
                <div className="ml-6 border-l border-slate-700">
                  {category.subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubcategory(sub.id)}
                      className={`w-full flex items-center gap-2 px-4 py-1.5 text-left text-sm transition-colors ${
                        selectedSubcategory === sub.id
                          ? 'text-sky-400'
                          : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>{modifiedCount} modified</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetAllSettings}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All
            </button>
            <button
              onClick={() => {
                const json = JSON.stringify(settings, null, 2)
                const blob = new Blob([json], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'aethel-settings.json'
                a.click()
              }}
              className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded"
              title="Export settings"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-400" />
            <h1 className="text-lg font-semibold text-white">Settings</h1>
          </div>
          {currentCategory && !searchQuery && (
            <p className="text-sm text-slate-500 mt-1">
              {currentCategory.description}
            </p>
          )}
          {searchQuery && (
            <p className="text-sm text-slate-500 mt-1">
              {filteredSettings.length} results for {`"${searchQuery}"`}
            </p>
          )}
        </div>
        
        {/* Settings List */}
        <div className="flex-1 overflow-y-auto px-6">
          {filteredSettings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p>No settings found</p>
            </div>
          ) : (
            filteredSettings.map((setting) => (
              <SettingRow
                key={setting.id}
                setting={setting}
                value={settings[setting.id] ?? setting.defaultValue}
                onChange={updateSetting}
                isModified={settings[setting.id] !== setting.defaultValue}
                onReset={() => resetSetting(setting.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
