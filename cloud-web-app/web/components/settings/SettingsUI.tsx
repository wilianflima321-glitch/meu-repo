'use client';

/**
 * Aethel Engine - Visual Settings UI
 * 
 * VS Code-style settings with:
 * - Search settings
 * - Categories navigation
 * - Workspace/User scope toggle
 * - JSON view toggle
 * - Modified indicator
 * - Reset to default
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import {
  Settings,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  FileJson,
  User,
  Folder,
  Check,
  Plus,
  Minus,
  Edit2,
  Copy,
  Eye,
  EyeOff,
  Info,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type SettingType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'array' 
  | 'object' 
  | 'enum'
  | 'color';

export interface SettingDefinition {
  key: string;
  type: SettingType;
  default: unknown;
  description: string;
  category: string[];
  enum?: string[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
  items?: { type: string };
  markdownDescription?: string;
  deprecationMessage?: string;
  scope?: 'application' | 'machine' | 'window' | 'resource' | 'language';
  tags?: string[];
}

export interface SettingValue {
  userValue?: unknown;
  workspaceValue?: unknown;
  defaultValue: unknown;
}

export type SettingsScope = 'user' | 'workspace';

export interface SettingsCategory {
  id: string;
  label: string;
  icon?: LucideIcon;
  children?: SettingsCategory[];
}

// ============================================================================
// Settings Context
// ============================================================================

interface SettingsContextValue {
  settings: Map<string, SettingDefinition>;
  values: Map<string, SettingValue>;
  scope: SettingsScope;
  setScope: (scope: SettingsScope) => void;
  getValue: (key: string) => unknown;
  setValue: (key: string, value: unknown) => void;
  resetValue: (key: string) => void;
  isModified: (key: string) => boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

// ============================================================================
// Sample Settings Definition (VS Code-like)
// ============================================================================

const DEFAULT_SETTINGS: SettingDefinition[] = [
  // Editor
  {
    key: 'editor.fontSize',
    type: 'number',
    default: 14,
    description: 'Controls the font size in pixels.',
    category: ['Text Editor', 'Font'],
    minimum: 6,
    maximum: 100,
  },
  {
    key: 'editor.fontFamily',
    type: 'string',
    default: "'Fira Code', 'Cascadia Code', Consolas, monospace",
    description: 'Controls the font family.',
    category: ['Text Editor', 'Font'],
  },
  {
    key: 'editor.fontWeight',
    type: 'enum',
    default: '400',
    description: 'Controls the font weight.',
    category: ['Text Editor', 'Font'],
    enum: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  },
  {
    key: 'editor.fontLigatures',
    type: 'boolean',
    default: true,
    description: 'Enables/Disables font ligatures.',
    category: ['Text Editor', 'Font'],
  },
  {
    key: 'editor.lineHeight',
    type: 'number',
    default: 0,
    description: 'Controls the line height. 0 uses the font size.',
    category: ['Text Editor', 'Font'],
    minimum: 0,
    maximum: 150,
  },
  {
    key: 'editor.tabSize',
    type: 'number',
    default: 4,
    description: 'The number of spaces a tab is equal to.',
    category: ['Text Editor'],
    minimum: 1,
    maximum: 8,
  },
  {
    key: 'editor.insertSpaces',
    type: 'boolean',
    default: true,
    description: 'Insert spaces when pressing Tab.',
    category: ['Text Editor'],
  },
  {
    key: 'editor.wordWrap',
    type: 'enum',
    default: 'off',
    description: 'Controls how lines should wrap.',
    category: ['Text Editor'],
    enum: ['off', 'on', 'wordWrapColumn', 'bounded'],
    enumDescriptions: [
      'Lines will never wrap.',
      'Lines will wrap at the viewport width.',
      'Lines will wrap at wordWrapColumn.',
      'Lines will wrap at the minimum of viewport and wordWrapColumn.',
    ],
  },
  {
    key: 'editor.minimap.enabled',
    type: 'boolean',
    default: true,
    description: 'Controls whether the minimap is shown.',
    category: ['Text Editor', 'Minimap'],
  },
  {
    key: 'editor.minimap.side',
    type: 'enum',
    default: 'right',
    description: 'Controls the side where to render the minimap.',
    category: ['Text Editor', 'Minimap'],
    enum: ['left', 'right'],
  },
  {
    key: 'editor.minimap.scale',
    type: 'number',
    default: 1,
    description: 'Scale of content drawn in the minimap.',
    category: ['Text Editor', 'Minimap'],
    minimum: 1,
    maximum: 3,
  },
  {
    key: 'editor.cursorStyle',
    type: 'enum',
    default: 'line',
    description: 'Controls the cursor style.',
    category: ['Text Editor', 'Cursor'],
    enum: ['block', 'block-outline', 'line', 'line-thin', 'underline', 'underline-thin'],
  },
  {
    key: 'editor.cursorBlinking',
    type: 'enum',
    default: 'blink',
    description: 'Controls the cursor animation style.',
    category: ['Text Editor', 'Cursor'],
    enum: ['blink', 'smooth', 'phase', 'expand', 'solid'],
  },
  {
    key: 'editor.renderWhitespace',
    type: 'enum',
    default: 'selection',
    description: 'Controls how whitespace characters are rendered.',
    category: ['Text Editor'],
    enum: ['none', 'boundary', 'selection', 'trailing', 'all'],
  },
  {
    key: 'editor.bracketPairColorization.enabled',
    type: 'boolean',
    default: true,
    description: 'Controls whether bracket pair colorization is enabled.',
    category: ['Text Editor'],
  },
  {
    key: 'editor.autoIndent',
    type: 'enum',
    default: 'full',
    description: 'Controls whether the editor should automatically adjust the indentation.',
    category: ['Text Editor'],
    enum: ['none', 'keep', 'brackets', 'advanced', 'full'],
  },

  // Workbench
  {
    key: 'workbench.colorTheme',
    type: 'enum',
    default: 'Aethel Dark',
    description: 'Specifies the color theme used in the workbench.',
    category: ['Workbench', 'Appearance'],
    enum: ['Aethel Dark', 'Aethel Light', 'Unreal Dark', 'VS Code Dark+', 'One Dark Pro'],
  },
  {
    key: 'workbench.iconTheme',
    type: 'enum',
    default: 'aethel-icons',
    description: 'Specifies the icon theme used in the workbench.',
    category: ['Workbench', 'Appearance'],
    enum: ['aethel-icons', 'material-icons', 'seti', 'none'],
  },
  {
    key: 'workbench.sideBar.location',
    type: 'enum',
    default: 'left',
    description: 'Controls the location of the sidebar.',
    category: ['Workbench', 'Appearance'],
    enum: ['left', 'right'],
  },
  {
    key: 'workbench.activityBar.visible',
    type: 'boolean',
    default: true,
    description: 'Controls whether the activity bar is visible.',
    category: ['Workbench', 'Appearance'],
  },
  {
    key: 'workbench.statusBar.visible',
    type: 'boolean',
    default: true,
    description: 'Controls whether the status bar is visible.',
    category: ['Workbench', 'Appearance'],
  },
  {
    key: 'workbench.editor.tabCloseButton',
    type: 'enum',
    default: 'right',
    description: 'Controls the position of the editor tab close buttons.',
    category: ['Workbench', 'Editor Management'],
    enum: ['off', 'left', 'right'],
  },
  {
    key: 'workbench.editor.showTabs',
    type: 'boolean',
    default: true,
    description: 'Controls whether tabs are shown in the editor.',
    category: ['Workbench', 'Editor Management'],
  },
  {
    key: 'workbench.startupEditor',
    type: 'enum',
    default: 'welcomePage',
    description: 'Controls which editor is shown at startup.',
    category: ['Workbench'],
    enum: ['none', 'welcomePage', 'readme', 'newUntitledFile', 'welcomePageInEmptyWorkbench'],
  },

  // Terminal
  {
    key: 'terminal.integrated.fontSize',
    type: 'number',
    default: 14,
    description: 'Controls the font size in pixels of the terminal.',
    category: ['Features', 'Terminal'],
    minimum: 6,
    maximum: 100,
  },
  {
    key: 'terminal.integrated.fontFamily',
    type: 'string',
    default: '',
    description: 'Controls the font family of the terminal. Defaults to editor.fontFamily.',
    category: ['Features', 'Terminal'],
  },
  {
    key: 'terminal.integrated.cursorStyle',
    type: 'enum',
    default: 'block',
    description: 'Controls the style of terminal cursor.',
    category: ['Features', 'Terminal'],
    enum: ['block', 'underline', 'line'],
  },
  {
    key: 'terminal.integrated.scrollback',
    type: 'number',
    default: 1000,
    description: 'Controls the maximum amount of lines the terminal keeps.',
    category: ['Features', 'Terminal'],
    minimum: 0,
    maximum: 100000,
  },

  // Files
  {
    key: 'files.autoSave',
    type: 'enum',
    default: 'off',
    description: 'Controls auto save of dirty editors.',
    category: ['Text Editor', 'Files'],
    enum: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'],
  },
  {
    key: 'files.autoSaveDelay',
    type: 'number',
    default: 1000,
    description: 'Controls the delay in milliseconds after which an editor is auto saved.',
    category: ['Text Editor', 'Files'],
    minimum: 0,
  },
  {
    key: 'files.encoding',
    type: 'enum',
    default: 'utf8',
    description: 'The default character set encoding to use.',
    category: ['Text Editor', 'Files'],
    enum: ['utf8', 'utf16le', 'utf16be', 'windows1252', 'iso88591'],
  },
  {
    key: 'files.eol',
    type: 'enum',
    default: 'auto',
    description: 'The default end of line character.',
    category: ['Text Editor', 'Files'],
    enum: ['\\n', '\\r\\n', 'auto'],
    enumDescriptions: ['LF', 'CRLF', 'OS specific'],
  },
  {
    key: 'files.trimTrailingWhitespace',
    type: 'boolean',
    default: false,
    description: 'Trim trailing whitespace when saving a file.',
    category: ['Text Editor', 'Files'],
  },
  {
    key: 'files.insertFinalNewline',
    type: 'boolean',
    default: false,
    description: 'Insert a final newline at the end of the file when saving.',
    category: ['Text Editor', 'Files'],
  },

  // AI Features
  {
    key: 'aethel.ai.enabled',
    type: 'boolean',
    default: true,
    description: 'Enable AI-powered features.',
    category: ['Aethel Engine', 'AI'],
  },
  {
    key: 'aethel.ai.inlineCompletion',
    type: 'boolean',
    default: true,
    description: 'Enable inline AI code completion (ghost text).',
    category: ['Aethel Engine', 'AI'],
  },
  {
    key: 'aethel.ai.chatPanel',
    type: 'boolean',
    default: true,
    description: 'Show AI chat panel in the sidebar.',
    category: ['Aethel Engine', 'AI'],
  },
  {
    key: 'aethel.ai.model',
    type: 'enum',
    default: 'gpt-4o',
    description: 'The AI model to use for code completion.',
    category: ['Aethel Engine', 'AI'],
    enum: ['gpt-4o', 'gpt-4-turbo', 'claude-3-opus', 'claude-3-sonnet', 'local-llm'],
  },
  {
    key: 'aethel.ai.temperature',
    type: 'number',
    default: 0.7,
    description: 'Controls randomness in AI responses (0-1).',
    category: ['Aethel Engine', 'AI'],
    minimum: 0,
    maximum: 1,
  },

  // Blueprint Editor
  {
    key: 'aethel.blueprint.gridSize',
    type: 'number',
    default: 20,
    description: 'Grid size for blueprint node alignment.',
    category: ['Aethel Engine', 'Blueprint'],
    minimum: 5,
    maximum: 50,
  },
  {
    key: 'aethel.blueprint.snapToGrid',
    type: 'boolean',
    default: true,
    description: 'Snap nodes to grid when moving.',
    category: ['Aethel Engine', 'Blueprint'],
  },
  {
    key: 'aethel.blueprint.showMinimap',
    type: 'boolean',
    default: true,
    description: 'Show minimap in blueprint editor.',
    category: ['Aethel Engine', 'Blueprint'],
  },
  {
    key: 'aethel.blueprint.curveStyle',
    type: 'enum',
    default: 'bezier',
    description: 'Connection wire curve style.',
    category: ['Aethel Engine', 'Blueprint'],
    enum: ['bezier', 'linear', 'step'],
  },

  // Material Editor
  {
    key: 'aethel.material.previewSize',
    type: 'number',
    default: 256,
    description: 'Preview sphere size in pixels.',
    category: ['Aethel Engine', 'Material Editor'],
    minimum: 64,
    maximum: 512,
  },
  {
    key: 'aethel.material.realTimePreview',
    type: 'boolean',
    default: true,
    description: 'Update preview in real-time while editing.',
    category: ['Aethel Engine', 'Material Editor'],
  },
];

// ============================================================================
// Settings Provider
// ============================================================================

export function SettingsProvider({
  children,
  initialSettings,
  initialValues,
  onSave,
}: {
  children: ReactNode;
  initialSettings?: SettingDefinition[];
  initialValues?: Map<string, SettingValue>;
  onSave?: (key: string, value: unknown, scope: SettingsScope) => void;
}) {
  const [scope, setScope] = useState<SettingsScope>('user');
  const [values, setValues] = useState<Map<string, SettingValue>>(
    initialValues || new Map()
  );

  const settings = useMemo(() => {
    const map = new Map<string, SettingDefinition>();
    (initialSettings || DEFAULT_SETTINGS).forEach(s => map.set(s.key, s));
    return map;
  }, [initialSettings]);

  const getValue = useCallback((key: string): unknown => {
    const settingValue = values.get(key);
    const definition = settings.get(key);
    
    if (scope === 'workspace' && settingValue?.workspaceValue !== undefined) {
      return settingValue.workspaceValue;
    }
    if (settingValue?.userValue !== undefined) {
      return settingValue.userValue;
    }
    return definition?.default;
  }, [values, settings, scope]);

  const setValue = useCallback((key: string, value: unknown) => {
    setValues(prev => {
      const next = new Map(prev);
      const existing = next.get(key) || { defaultValue: settings.get(key)?.default };
      
      if (scope === 'workspace') {
        next.set(key, { ...existing, workspaceValue: value });
      } else {
        next.set(key, { ...existing, userValue: value });
      }
      
      return next;
    });
    
    onSave?.(key, value, scope);
  }, [scope, settings, onSave]);

  const resetValue = useCallback((key: string) => {
    setValues(prev => {
      const next = new Map(prev);
      const existing = next.get(key);
      
      if (existing) {
        if (scope === 'workspace') {
          const { workspaceValue, ...rest } = existing;
          next.set(key, rest);
        } else {
          const { userValue, ...rest } = existing;
          next.set(key, rest);
        }
      }
      
      return next;
    });
    
    onSave?.(key, settings.get(key)?.default, scope);
  }, [scope, settings, onSave]);

  const isModified = useCallback((key: string): boolean => {
    const settingValue = values.get(key);
    if (!settingValue) return false;
    
    if (scope === 'workspace') {
      return settingValue.workspaceValue !== undefined;
    }
    return settingValue.userValue !== undefined;
  }, [values, scope]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        values,
        scope,
        setScope,
        getValue,
        setValue,
        resetValue,
        isModified,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

// ============================================================================
// Setting Input Components
// ============================================================================

function BooleanSetting({
  definition,
  value,
  onChange,
  modified,
  onReset,
}: {
  definition: SettingDefinition;
  value: boolean;
  onChange: (value: boolean) => void;
  modified: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        className="mt-1 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
      />
      <div className="flex-1 min-w-0">
        <SettingLabel definition={definition} modified={modified} onReset={onReset} />
      </div>
    </div>
  );
}

function StringSetting({
  definition,
  value,
  onChange,
  modified,
  onReset,
}: {
  definition: SettingDefinition;
  value: string;
  onChange: (value: string) => void;
  modified: boolean;
  onReset: () => void;
}) {
  return (
    <div>
      <SettingLabel definition={definition} modified={modified} onReset={onReset} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 mt-2 text-sm bg-slate-800 text-white rounded border border-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}

function NumberSetting({
  definition,
  value,
  onChange,
  modified,
  onReset,
}: {
  definition: SettingDefinition;
  value: number;
  onChange: (value: number) => void;
  modified: boolean;
  onReset: () => void;
}) {
  return (
    <div>
      <SettingLabel definition={definition} modified={modified} onReset={onReset} />
      <div className="flex items-center gap-3 mt-2">
        <input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min={definition.minimum}
          max={definition.maximum}
          step={definition.maximum && definition.maximum <= 1 ? 0.1 : 1}
          className="w-32 px-3 py-1.5 text-sm bg-slate-800 text-white rounded border border-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {definition.minimum !== undefined && definition.maximum !== undefined && (
          <input
            type="range"
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            min={definition.minimum}
            max={definition.maximum}
            step={definition.maximum <= 1 ? 0.01 : 1}
            className="flex-1 accent-indigo-500"
          />
        )}
      </div>
    </div>
  );
}

function EnumSetting({
  definition,
  value,
  onChange,
  modified,
  onReset,
}: {
  definition: SettingDefinition;
  value: string;
  onChange: (value: string) => void;
  modified: boolean;
  onReset: () => void;
}) {
  return (
    <div>
      <SettingLabel definition={definition} modified={modified} onReset={onReset} />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 mt-2 text-sm bg-slate-800 text-white rounded border border-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {definition.enum?.map((opt, index) => (
          <option key={opt} value={opt}>
            {opt}
            {definition.enumDescriptions?.[index] && ` - ${definition.enumDescriptions[index]}`}
          </option>
        ))}
      </select>
    </div>
  );
}

function ArraySetting({
  definition,
  value,
  onChange,
  modified,
  onReset,
}: {
  definition: SettingDefinition;
  value: string[];
  onChange: (value: string[]) => void;
  modified: boolean;
  onReset: () => void;
}) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...value, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      <SettingLabel definition={definition} modified={modified} onReset={onReset} />
      <div className="mt-2 space-y-2">
        {value.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={e => {
                const next = [...value];
                next[index] = e.target.value;
                onChange(next);
              }}
              className="flex-1 px-3 py-1.5 text-sm bg-slate-800 text-white rounded border border-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={() => removeItem(index)}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Add item..."
            className="flex-1 px-3 py-1.5 text-sm bg-slate-800 text-white placeholder-slate-500 rounded border border-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={addItem}
            disabled={!newItem.trim()}
            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorSetting({
  definition,
  value,
  onChange,
  modified,
  onReset,
}: {
  definition: SettingDefinition;
  value: string;
  onChange: (value: string) => void;
  modified: boolean;
  onReset: () => void;
}) {
  return (
    <div>
      <SettingLabel definition={definition} modified={modified} onReset={onReset} />
      <div className="flex items-center gap-3 mt-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          className="w-32 px-3 py-1.5 text-sm bg-slate-800 text-white rounded border border-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
        />
      </div>
    </div>
  );
}

function SettingLabel({
  definition,
  modified,
  onReset,
}: {
  definition: SettingDefinition;
  modified: boolean;
  onReset: () => void;
}) {
  const keyParts = definition.key.split('.');
  const displayName = keyParts[keyParts.length - 1]
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {displayName}
          </span>
          {modified && (
            <span className="w-2 h-2 bg-indigo-500 rounded-full" title="Modified" />
          )}
          {definition.deprecationMessage && (
            <span title={definition.deprecationMessage}>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {definition.description}
        </p>
        <p className="text-xs text-slate-600 font-mono mt-0.5">
          {definition.key}
        </p>
      </div>
      {modified && (
        <button
          onClick={onReset}
          className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded"
          title="Reset to default"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Settings UI
// ============================================================================

export function SettingsUI({
  className,
}: {
  className?: string;
}) {
  const {
    settings,
    scope,
    setScope,
    getValue,
    setValue,
    resetValue,
    isModified,
  } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Text Editor', 'Workbench', 'Aethel Engine'])
  );
  const [showJSON, setShowJSON] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search on mount and Ctrl+F
  useEffect(() => {
    searchInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Build category tree
  const categories = useMemo(() => {
    const tree = new Map<string, Set<string>>();
    
    Array.from(settings.values()).forEach(setting => {
      const root = setting.category[0];
      if (!tree.has(root)) {
        tree.set(root, new Set());
      }
      if (setting.category.length > 1) {
        tree.get(root)?.add(setting.category[1]);
      }
    });

    return Array.from(tree.entries()).map(([label, children]) => ({
      id: label,
      label,
      children: Array.from(children).map(c => ({ id: c, label: c })),
    }));
  }, [settings]);

  // Filter settings by search
  const filteredSettings = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return Array.from(settings.values());

    return Array.from(settings.values()).filter(setting =>
      setting.key.toLowerCase().includes(query) ||
      setting.description.toLowerCase().includes(query) ||
      setting.category.some(c => c.toLowerCase().includes(query))
    );
  }, [settings, searchQuery]);

  // Group settings by category
  const groupedSettings = useMemo(() => {
    const groups = new Map<string, SettingDefinition[]>();

    filteredSettings.forEach(setting => {
      const category = setting.category.join(' > ');
      const existing = groups.get(category) || [];
      existing.push(setting);
      groups.set(category, existing);
    });

    return groups;
  }, [filteredSettings]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const renderSetting = (definition: SettingDefinition) => {
    const value = getValue(definition.key);
    const modified = isModified(definition.key);

    const props = {
      definition,
      modified,
      onReset: () => resetValue(definition.key),
    };

    switch (definition.type) {
      case 'boolean':
        return (
          <BooleanSetting
            {...props}
            value={value as boolean}
            onChange={v => setValue(definition.key, v)}
          />
        );
      case 'number':
        return (
          <NumberSetting
            {...props}
            value={value as number}
            onChange={v => setValue(definition.key, v)}
          />
        );
      case 'enum':
        return (
          <EnumSetting
            {...props}
            value={value as string}
            onChange={v => setValue(definition.key, v)}
          />
        );
      case 'array':
        return (
          <ArraySetting
            {...props}
            value={(value as string[]) || []}
            onChange={v => setValue(definition.key, v)}
          />
        );
      case 'color':
        return (
          <ColorSetting
            {...props}
            value={value as string}
            onChange={v => setValue(definition.key, v)}
          />
        );
      default:
        return (
          <StringSetting
            {...props}
            value={String(value ?? '')}
            onChange={v => setValue(definition.key, v)}
          />
        );
    }
  };

  return (
    <div className={`h-full flex flex-col bg-slate-900 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-slate-400" />
          <span className="text-lg font-medium text-white">Settings</span>
        </div>

        {/* Scope toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScope('user')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
              scope === 'user'
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            User
          </button>
          <button
            onClick={() => setScope('workspace')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
              scope === 'workspace'
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Folder className="w-4 h-4" />
            Workspace
          </button>
          <div className="w-px h-6 bg-slate-700 mx-1" />
          <button
            onClick={() => setShowJSON(!showJSON)}
            className={`p-1.5 rounded transition-colors ${
              showJSON
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Open Settings (JSON)"
          >
            <FileJson className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search settings..."
            className="w-full pl-10 pr-8 py-2 text-sm bg-slate-800 text-white placeholder-slate-500 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-slate-500 hover:text-white" />
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-xs text-slate-500">
            {filteredSettings.length} settings found
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories sidebar */}
        <div className="w-56 border-r border-slate-800 overflow-y-auto">
          {categories.map(category => (
            <div key={category.id}>
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50"
              >
                {expandedCategories.has(category.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                {category.label}
              </button>

              {expandedCategories.has(category.id) && category.children && (
                <div className="pl-6 pb-1">
                  {category.children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => {
                        // Scroll to category
                        const el = document.getElementById(`setting-category-${category.id}-${child.id}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-500 hover:text-white hover:bg-slate-800/50 rounded"
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Settings list */}
        <div className="flex-1 overflow-y-auto p-6">
          {showJSON ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                {scope === 'user' ? 'User Settings (JSON)' : 'Workspace Settings (JSON)'}
              </p>
              <pre className="p-4 bg-slate-800 rounded-lg text-sm text-slate-300 font-mono overflow-x-auto">
                {JSON.stringify(
                  Object.fromEntries(
                    Array.from(settings.keys())
                      .filter(k => isModified(k))
                      .map(k => [k, getValue(k)])
                  ),
                  null,
                  2
                ) || '{}'}
              </pre>
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(groupedSettings.entries()).map(([category, categorySettings]) => {
                const [root, sub] = category.split(' > ');
                return (
                  <div key={category} id={`setting-category-${root}-${sub || ''}`}>
                    <h2 className="text-sm font-medium text-slate-400 mb-4">
                      {category}
                    </h2>
                    <div className="space-y-6">
                      {categorySettings.map(setting => (
                        <div
                          key={setting.key}
                          className="pb-4 border-b border-slate-800/50 last:border-0"
                        >
                          {renderSetting(setting)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {filteredSettings.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No settings found matching {`"${searchQuery}"`}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Quick Settings Popup (for status bar)
// ============================================================================

export function QuickSettingsPopup({
  settings: settingsToShow,
  onClose,
}: {
  settings: string[];
  onClose: () => void;
}) {
  const { settings, getValue, setValue } = useSettings();

  return (
    <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <span className="text-sm font-medium text-white">Quick Settings</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      <div className="p-2 space-y-2">
        {settingsToShow.map(key => {
          const setting = settings.get(key);
          if (!setting) return null;

          const value = getValue(key);
          const displayName = key.split('.').pop()?.replace(/([A-Z])/g, ' $1');

          if (setting.type === 'boolean') {
            return (
              <label
                key={key}
                className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-800/50 rounded cursor-pointer"
              >
                <span className="text-sm text-slate-300">{displayName}</span>
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={e => setValue(key, e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-indigo-500"
                />
              </label>
            );
          }

          if (setting.type === 'enum' && setting.enum) {
            return (
              <div key={key} className="px-2 py-1.5">
                <span className="text-xs text-slate-400">{displayName}</span>
                <select
                  value={value as string}
                  onChange={e => setValue(key, e.target.value)}
                  className="w-full mt-1 px-2 py-1 text-sm bg-slate-800 text-white rounded border border-slate-700"
                >
                  {setting.enum.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

export default SettingsUI;
