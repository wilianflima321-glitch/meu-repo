import {
  Bell,
  Bot,
  Cloud,
  Code,
  Cpu,
  GitBranch,
  Keyboard,
  Palette,
  Puzzle,
  Shield,
  Terminal,
  User,
} from 'lucide-react'

import type { SettingsCategory } from './SettingsPage.types'

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
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
