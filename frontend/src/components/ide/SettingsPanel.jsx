import React, { useState } from 'react';
import { useIDEStore } from '@/store/ideStore';
import {
  Settings, Palette, Keyboard, User, Monitor, Code, Terminal,
  ChevronRight, Search, Check, Moon, Sun, Laptop
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const SettingsPanel = () => {
  const { settings, updateSettings, theme, setTheme, themes } = useIDEStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('editor');

  const categories = [
    { id: 'editor', label: 'Editor', icon: Code },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'keybindings', label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'workbench', label: 'Workbench', icon: Monitor },
    { id: 'account', label: 'Account', icon: User },
  ];

  const editorSettings = [
    { id: 'fontSize', label: 'Font Size', type: 'number', min: 10, max: 24 },
    { id: 'fontFamily', label: 'Font Family', type: 'select', options: [
      'JetBrains Mono, monospace',
      'Fira Code, monospace',
      'Source Code Pro, monospace',
      'Consolas, monospace',
      'Monaco, monospace'
    ]},
    { id: 'tabSize', label: 'Tab Size', type: 'number', min: 1, max: 8 },
    { id: 'wordWrap', label: 'Word Wrap', type: 'switch' },
    { id: 'lineNumbers', label: 'Line Numbers', type: 'switch' },
    { id: 'minimap', label: 'Minimap', type: 'switch' },
    { id: 'autoSave', label: 'Auto Save', type: 'switch' },
    { id: 'bracketPairColorization', label: 'Bracket Pair Colorization', type: 'switch', default: true },
    { id: 'formatOnSave', label: 'Format On Save', type: 'switch', default: true },
    { id: 'formatOnPaste', label: 'Format On Paste', type: 'switch', default: false },
  ];

  const renderSetting = (setting) => {
    const value = settings[setting.id] ?? setting.default;

    return (
      <div key={setting.id} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
        <div>
          <label className="text-sm text-white">{setting.label}</label>
          {setting.description && (
            <p className="text-xs text-zinc-500 mt-0.5">{setting.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {setting.type === 'switch' && (
            <Switch
              checked={value}
              onCheckedChange={(checked) => updateSettings({ [setting.id]: checked })}
              data-testid={`setting-${setting.id}`}
            />
          )}
          {setting.type === 'number' && (
            <div className="flex items-center gap-2">
              <Slider
                value={[value]}
                min={setting.min}
                max={setting.max}
                step={1}
                onValueChange={([v]) => updateSettings({ [setting.id]: v })}
                className="w-24"
              />
              <span className="text-sm text-zinc-400 w-8 text-right">{value}</span>
            </div>
          )}
          {setting.type === 'select' && (
            <Select
              value={value}
              onValueChange={(v) => updateSettings({ [setting.id]: v })}
            >
              <SelectTrigger className="w-48 h-8 text-xs bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {setting.options.map(opt => (
                  <SelectItem key={opt} value={opt} className="text-xs">
                    {opt.split(',')[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-white">Settings</span>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings"
            className="pl-9 bg-zinc-800 border-zinc-700 text-white text-sm h-8"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Categories */}
        <div className="w-48 border-r border-zinc-800">
          <ScrollArea className="h-full">
            <div className="p-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors",
                    activeCategory === cat.id
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
                  )}
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Settings Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {activeCategory === 'editor' && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Editor Settings</h2>
                <div className="space-y-0">
                  {editorSettings.map(renderSetting)}
                </div>
              </div>
            )}

            {activeCategory === 'appearance' && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Appearance</h2>

                {/* Theme Selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Color Theme</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {themes.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          theme === t.id
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                        )}
                      >
                        <div
                          className="w-8 h-8 rounded-lg"
                          style={{ backgroundColor: t.colors?.background }}
                        />
                        <div className="text-left">
                          <div className="text-sm text-white">{t.name}</div>
                          <div className="text-xs text-zinc-500 capitalize">{t.type}</div>
                        </div>
                        {theme === t.id && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Mode */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Preferred Color Mode</h3>
                  <div className="flex gap-2">
                    {[{ id: 'dark', icon: Moon }, { id: 'light', icon: Sun }, { id: 'system', icon: Laptop }].map(mode => (
                      <button
                        key={mode.id}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors",
                          "border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white"
                        )}
                      >
                        <mode.icon className="w-4 h-4" />
                        <span className="text-sm capitalize">{mode.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Theme */}
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">File Icon Theme</h3>
                  <Select defaultValue="material">
                    <SelectTrigger className="w-full h-9 bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="material">Material Icon Theme</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="seti">Seti</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {activeCategory === 'keybindings' && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h2>
                <div className="space-y-2">
                  {[
                    { action: 'Save File', keys: '⌘ S' },
                    { action: 'Quick Open', keys: '⌘ P' },
                    { action: 'Command Palette', keys: '⌘ ⇧ P' },
                    { action: 'Toggle Sidebar', keys: '⌘ B' },
                    { action: 'Toggle Terminal', keys: '⌘ `' },
                    { action: 'Find in Files', keys: '⌘ ⇧ F' },
                    { action: 'Go to Line', keys: '⌘ G' },
                    { action: 'Start Debugging', keys: 'F5' },
                    { action: 'Toggle Breakpoint', keys: 'F9' },
                  ].map(kb => (
                    <div key={kb.action} className="flex items-center justify-between py-2 px-3 bg-zinc-800/50 rounded-lg">
                      <span className="text-sm text-white">{kb.action}</span>
                      <kbd className="px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-400 font-mono">{kb.keys}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeCategory === 'terminal' && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Terminal Settings</h2>
                <div className="space-y-0">
                  {[
                    { id: 'terminalFontSize', label: 'Font Size', type: 'number', min: 10, max: 20 },
                    { id: 'terminalCursorStyle', label: 'Cursor Style', type: 'select', options: ['block', 'line', 'underline'] },
                    { id: 'terminalScrollback', label: 'Scrollback Lines', type: 'number', min: 100, max: 10000 },
                  ].map(renderSetting)}
                </div>
              </div>
            )}

            {activeCategory === 'workbench' && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Workbench</h2>
                <div className="space-y-0">
                  {[
                    { id: 'sidebarPosition', label: 'Sidebar Position', type: 'select', options: ['left', 'right'] },
                    { id: 'activityBarVisible', label: 'Activity Bar Visible', type: 'switch', default: true },
                    { id: 'statusBarVisible', label: 'Status Bar Visible', type: 'switch', default: true },
                    { id: 'breadcrumbs', label: 'Breadcrumbs', type: 'switch', default: true },
                  ].map(renderSetting)}
                </div>
              </div>
            )}

            {activeCategory === 'account' && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                      U
                    </div>
                    <div>
                      <div className="text-lg text-white font-medium">User</div>
                      <div className="text-sm text-zinc-500">user@example.com</div>
                      <div className="text-xs text-green-400 mt-1">Pro Plan</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default SettingsPanel;
