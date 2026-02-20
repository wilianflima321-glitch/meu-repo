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

import { DEFAULT_SETTINGS, SETTING_ITEMS } from './settings-page-config'
import type { SettingItem } from './settings-page-config'

// ============= Types =============

interface SettingsCategory {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  subcategories?: { id: string; label: string }[]
}

// ============= Default Settings =============

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
