'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  FolderOpen, 
  Check, 
  X, 
  AlertTriangle,
  RefreshCw,
  Save,
  Trash2
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface PathConfig {
  id: string;
  name: string;
  description: string;
  path: string;
  isValid: boolean;
  isRequired: boolean;
  defaultPaths: string[];
  icon: string;
}

interface SettingsState {
  blenderPath: string;
  ffmpegPath: string;
  pythonPath: string;
  projectsPath: string;
  cachePath: string;
  autoDetect: boolean;
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'aethel_path_settings';

function loadSettings(): SettingsState {
  if (typeof window === 'undefined') {
    return getDefaultSettings();
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn('Failed to load settings from localStorage');
  }
  
  return getDefaultSettings();
}

function saveSettings(settings: SettingsState): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    console.error('Failed to save settings to localStorage');
  }
}

function getDefaultSettings(): SettingsState {
  return {
    blenderPath: '',
    ffmpegPath: '',
    pythonPath: '',
    projectsPath: '',
    cachePath: '',
    autoDetect: true,
  };
}

// ============================================================================
// PATH CONFIGS
// ============================================================================

const PATH_CONFIGS: Omit<PathConfig, 'path' | 'isValid'>[] = [
  {
    id: 'blenderPath',
    name: 'Blender',
    description: 'Caminho para o executável do Blender (renderização 3D)',
    isRequired: true,
    defaultPaths: [
      'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
      '/Applications/Blender.app/Contents/MacOS/Blender',
      '/usr/bin/blender',
    ],
    icon: '🎨',
  },
  {
    id: 'ffmpegPath',
    name: 'FFmpeg',
    description: 'Caminho para o FFmpeg (processamento de vídeo)',
    isRequired: false,
    defaultPaths: [
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      '/usr/local/bin/ffmpeg',
      '/usr/bin/ffmpeg',
    ],
    icon: '🎬',
  },
  {
    id: 'pythonPath',
    name: 'Python',
    description: 'Caminho para o interpretador Python',
    isRequired: false,
    defaultPaths: [
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      '/usr/bin/python3',
      '/usr/local/bin/python3',
    ],
    icon: '🐍',
  },
  {
    id: 'projectsPath',
    name: 'Pasta de Projetos',
    description: 'Onde seus projetos Aethel serão salvos',
    isRequired: true,
    defaultPaths: [
      '%USERPROFILE%\\Documents\\Aethel Projects',
      '~/Documents/Aethel Projects',
    ],
    icon: '📁',
  },
  {
    id: 'cachePath',
    name: 'Pasta de Cache',
    description: 'Onde arquivos temporários serão armazenados',
    isRequired: false,
    defaultPaths: [
      '%LOCALAPPDATA%\\Aethel\\Cache',
      '~/.cache/aethel',
    ],
    icon: '💾',
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

const PathInput: React.FC<{
  config: PathConfig;
  value: string;
  onChange: (value: string) => void;
  onValidate: () => void;
  isValidating: boolean;
}> = ({ config, value, onChange, onValidate, isValidating }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h4 className="font-medium text-white flex items-center gap-2">
              {config.name}
              {config.isRequired && (
                <span className="text-xs text-red-400">*Obrigatório</span>
              )}
            </h4>
            <p className="text-sm text-gray-400">{config.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {isValidating ? (
            <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
          ) : config.isValid ? (
            <Check className="w-5 h-5 text-green-500" />
          ) : value ? (
            <X className="w-5 h-5 text-red-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={config.defaultPaths[0] || 'Caminho não configurado'}
            className={`
              w-full px-3 py-2 rounded-lg bg-gray-900 border text-white text-sm font-mono
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${config.isValid 
                ? 'border-green-500/50' 
                : value 
                  ? 'border-red-500/50' 
                  : 'border-gray-600'
              }
            `}
          />
        </div>
        
        <button
          onClick={onValidate}
          disabled={isValidating || !value}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
        >
          Verificar
        </button>
        
        <button
          onClick={() => onChange('')}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
          title="Limpar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {/* Suggested Paths */}
      {!config.isValid && config.defaultPaths.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">Caminhos comuns:</p>
          <div className="flex flex-wrap gap-1">
            {config.defaultPaths.slice(0, 2).map((path, idx) => (
              <button
                key={idx}
                onClick={() => onChange(path)}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 font-mono truncate max-w-xs transition-colors"
              >
                {path}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SettingsPathConfig: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: SettingsState) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState<SettingsState>(getDefaultSettings);
  const [validationStatus, setValidationStatus] = useState<Record<string, boolean>>({});
  const [validatingIds, setValidatingIds] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
  }, []);

  const updatePath = (id: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [id]: value,
    }));
    setValidationStatus(prev => ({
      ...prev,
      [id]: false,
    }));
    setIsDirty(true);
  };

  const validatePath = async (id: string) => {
    const path = settings[id as keyof SettingsState];
    if (!path || typeof path !== 'string') return;
    
    setValidatingIds(prev => new Set(prev).add(id));
    
    // Simulate validation (in real app, this calls backend)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // For demo, consider valid if path contains expected keywords
    const isValid = 
      (id === 'blenderPath' && path.toLowerCase().includes('blender')) ||
      (id === 'ffmpegPath' && path.toLowerCase().includes('ffmpeg')) ||
      (id === 'pythonPath' && path.toLowerCase().includes('python')) ||
      (id === 'projectsPath' && path.length > 3) ||
      (id === 'cachePath' && path.length > 3);
    
    setValidationStatus(prev => ({
      ...prev,
      [id]: isValid,
    }));
    
    setValidatingIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSave = () => {
    saveSettings(settings);
    setIsDirty(false);
    onSave?.(settings);
  };

  const handleAutoDetect = async () => {
    // In real app, this calls backend to auto-detect paths
    setValidatingIds(new Set(PATH_CONFIGS.map(c => c.id)));
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate auto-detection
    setSettings(prev => ({
      ...prev,
      blenderPath: 'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
      ffmpegPath: 'C:\\ffmpeg\\bin\\ffmpeg.exe',
      pythonPath: 'C:\\Python311\\python.exe',
    }));
    
    setValidationStatus({
      blenderPath: true,
      ffmpegPath: true,
      pythonPath: true,
    });
    
    setValidatingIds(new Set());
    setIsDirty(true);
  };

  if (!isOpen) return null;

  const pathConfigs: PathConfig[] = PATH_CONFIGS.map(config => ({
    ...config,
    path: settings[config.id as keyof SettingsState] as string || '',
    isValid: validationStatus[config.id] || false,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Configuração de Caminhos</h2>
              <p className="text-sm text-gray-400">Configure onde encontrar os programas externos</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          {/* Auto-detect Button */}
          <div className="flex items-center justify-between p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
            <div>
              <p className="text-sm text-white">Detecção Automática</p>
              <p className="text-xs text-gray-400">Deixe o Aethel encontrar os programas para você</p>
            </div>
            <button
              onClick={handleAutoDetect}
              disabled={validatingIds.size > 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg text-white text-sm transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              {validatingIds.size > 0 ? 'Detectando...' : 'Auto-Detectar'}
            </button>
          </div>

          {/* Path Inputs */}
          {pathConfigs.map(config => (
            <PathInput
              key={config.id}
              config={config}
              value={config.path}
              onChange={(value) => updatePath(config.id, value)}
              onValidate={() => validatePath(config.id)}
              isValidating={validatingIds.has(config.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800 bg-gray-800/50">
          <div className="text-sm text-gray-400">
            {isDirty && (
              <span className="text-yellow-400">Alterações não salvas</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPathConfig;
