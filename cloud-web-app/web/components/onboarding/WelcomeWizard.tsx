/**
 * Welcome Wizard - First Run Experience
 * 
 * Wizard de boas-vindas que guia o usuário na configuração inicial.
 * Detecta dependências (Blender, Ollama, Node) e oferece instalação.
 * 
 * @see O_QUE_FALTA_DETALHADO.md - Seção 2
 * @see ALINHAMENTO_ESTRATEGICO_FINAL_GAPS.md - Seção 1
 * 
 * @module components/onboarding/WelcomeWizard
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Download,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Settings,
  Gamepad2,
  Film,
  Palette,
  Globe,
  Rocket,
  Cpu,
  Box,
  Terminal,
  Zap,
  Play,
  SkipForward,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface DependencyStatus {
  id: string;
  name: string;
  description: string;
  status: 'checking' | 'installed' | 'missing' | 'error' | 'installing';
  version?: string;
  path?: string;
  required: boolean;
  installUrl?: string;
  installCommand?: string;
  checkEndpoint?: string;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'game' | 'film' | 'other';
  features: string[];
}

type WizardStep = 'welcome' | 'language' | 'dependencies' | 'template' | 'tour' | 'complete';

interface WelcomeWizardProps {
  onComplete: (template?: string) => void;
  onSkip?: () => void;
  isOpen: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LANGUAGES = [
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: '中文 (简体)', flag: '🇨🇳' },
  { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
];

const DEPENDENCIES: DependencyStatus[] = [
  {
    id: 'node',
    name: 'Node.js',
    description: 'Runtime JavaScript necessário para o servidor',
    status: 'checking',
    required: true,
    installUrl: 'https://nodejs.org',
    checkEndpoint: '/api/health/node',
  },
  {
    id: 'blender',
    name: 'Blender',
    description: 'Engine de renderização 3D para assets e cenas',
    status: 'checking',
    required: true,
    installUrl: 'https://www.blender.org/download/',
    checkEndpoint: '/api/health/blender',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'IA local para geração de código e assets',
    status: 'checking',
    required: false,
    installUrl: 'https://ollama.ai',
    checkEndpoint: '/api/health/ollama',
  },
  {
    id: 'ffmpeg',
    name: 'FFmpeg',
    description: 'Processamento de vídeo e áudio',
    status: 'checking',
    required: false,
    installUrl: 'https://ffmpeg.org/download.html',
    checkEndpoint: '/api/health/ffmpeg',
  },
  {
    id: 'gpu',
    name: 'GPU Acceleration',
    description: 'Aceleração por GPU para renderização',
    status: 'checking',
    required: false,
    checkEndpoint: '/api/health/gpu',
  },
];

const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'rpg-3d',
    name: 'RPG 3D',
    description: 'Jogo de RPG com mundo aberto, combate e progressão',
    icon: <Gamepad2 className="w-8 h-8" />,
    category: 'game',
    features: ['Sistema de combate', 'Inventário', 'NPCs com diálogos', 'Quests'],
  },
  {
    id: 'platformer',
    name: 'Platformer 2.5D',
    description: 'Jogo de plataforma com física e puzzles',
    icon: <Zap className="w-8 h-8" />,
    category: 'game',
    features: ['Física precisa', 'Level design', 'Power-ups', 'Checkpoints'],
  },
  {
    id: 'fps',
    name: 'FPS Arena',
    description: 'Shooter em primeira pessoa com multiplayer',
    icon: <Cpu className="w-8 h-8" />,
    category: 'game',
    features: ['Armas e munição', 'Multiplayer', 'Mapas', 'Ranking'],
  },
  {
    id: 'short-film',
    name: 'Curta-metragem',
    description: 'Projeto cinematográfico com timeline e renderização',
    icon: <Film className="w-8 h-8" />,
    category: 'film',
    features: ['Timeline', 'Câmeras', 'Iluminação', 'Renderização'],
  },
  {
    id: 'archviz',
    name: 'Visualização Arquitetônica',
    description: 'Renderização de interiores e exteriores',
    icon: <Box className="w-8 h-8" />,
    category: 'film',
    features: ['Materiais PBR', 'HDRI', 'Passeio virtual', 'Export 360°'],
  },
  {
    id: 'blank',
    name: 'Projeto em Branco',
    description: 'Comece do zero com total liberdade',
    icon: <Palette className="w-8 h-8" />,
    category: 'other',
    features: ['Liberdade total', 'Sem templates', 'Configuração manual'],
  },
];

const TOUR_HIGHLIGHTS = [
  {
    id: 'explorer',
    title: 'Explorador de Arquivos',
    description: 'Navegue pelos arquivos do projeto, assets e cenas.',
    selector: '[data-tour="explorer"]',
  },
  {
    id: 'editor',
    title: 'Editor de Código',
    description: 'Edite scripts com autocompleção inteligente e IA.',
    selector: '[data-tour="editor"]',
  },
  {
    id: 'preview',
    title: 'Preview 3D',
    description: 'Visualize sua cena em tempo real com controles de câmera.',
    selector: '[data-tour="preview"]',
  },
  {
    id: 'ai-chat',
    title: 'Chat de IA',
    description: 'Converse com a IA para gerar código, assets e ideias.',
    selector: '[data-tour="ai-chat"]',
  },
  {
    id: 'terminal',
    title: 'Terminal Integrado',
    description: 'Execute comandos e scripts diretamente na IDE.',
    selector: '[data-tour="terminal"]',
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StepIndicator({ 
  steps, 
  currentStep 
}: { 
  steps: WizardStep[]; 
  currentStep: WizardStep;
}) {
  const currentIndex = steps.indexOf(currentStep);
  
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div
            className={`
              w-3 h-3 rounded-full transition-all duration-300
              ${index <= currentIndex 
                ? 'bg-violet-500 scale-100' 
                : 'bg-zinc-700 scale-75'}
            `}
          />
          {index < steps.length - 1 && (
            <div
              className={`
                w-8 h-0.5 transition-all duration-300
                ${index < currentIndex ? 'bg-violet-500' : 'bg-zinc-700'}
              `}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function DependencyItem({ 
  dep, 
  onInstall, 
  onRetry 
}: { 
  dep: DependencyStatus;
  onInstall: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const statusIcons = {
    checking: <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />,
    installed: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    missing: <XCircle className="w-5 h-5 text-amber-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    installing: <Loader2 className="w-5 h-5 animate-spin text-violet-500" />,
  };

  const statusLabels = {
    checking: 'Verificando...',
    installed: dep.version || 'Instalado',
    missing: 'Não encontrado',
    error: 'Erro na verificação',
    installing: 'Instalando...',
  };

  return (
    <div className={`
      flex items-center justify-between p-4 rounded-lg border transition-all
      ${dep.status === 'installed' 
        ? 'bg-emerald-500/10 border-emerald-500/30' 
        : dep.status === 'missing'
        ? 'bg-amber-500/10 border-amber-500/30'
        : dep.status === 'error'
        ? 'bg-red-500/10 border-red-500/30'
        : 'bg-zinc-800/50 border-zinc-700'}
    `}>
      <div className="flex items-center gap-3">
        {statusIcons[dep.status]}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{dep.name}</span>
            {dep.required && (
              <span className="text-xs px-1.5 py-0.5 bg-violet-500/20 text-violet-300 rounded">
                Obrigatório
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400">{dep.description}</p>
          <p className="text-xs text-zinc-500 mt-1">{statusLabels[dep.status]}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {dep.status === 'missing' && dep.installUrl && (
          <>
            <button
              onClick={() => window.open(dep.installUrl, '_blank')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-700 
                       hover:bg-zinc-600 rounded-md transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Baixar
            </button>
            <button
              onClick={() => onRetry(dep.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-violet-600 
                       hover:bg-violet-500 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Verificar
            </button>
          </>
        )}
        {dep.status === 'error' && (
          <button
            onClick={() => onRetry(dep.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-700 
                     hover:bg-zinc-600 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ 
  template, 
  selected, 
  onSelect 
}: { 
  template: ProjectTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`
        relative p-4 rounded-xl border text-left transition-all
        ${selected 
          ? 'bg-violet-500/20 border-violet-500 ring-2 ring-violet-500/50' 
          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'}
      `}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <Check className="w-5 h-5 text-violet-400" />
        </div>
      )}
      
      <div className={`
        w-12 h-12 rounded-lg flex items-center justify-center mb-3
        ${selected ? 'bg-violet-500/30 text-violet-300' : 'bg-zinc-700 text-zinc-400'}
      `}>
        {template.icon}
      </div>
      
      <h3 className="font-semibold text-white mb-1">{template.name}</h3>
      <p className="text-sm text-zinc-400 mb-3">{template.description}</p>
      
      <div className="flex flex-wrap gap-1">
        {template.features.slice(0, 3).map((feature) => (
          <span 
            key={feature}
            className="text-xs px-2 py-0.5 bg-zinc-700/50 text-zinc-400 rounded"
          >
            {feature}
          </span>
        ))}
      </div>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WelcomeWizard({ onComplete, onSkip, isOpen }: WelcomeWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [selectedLanguage, setSelectedLanguage] = useState('pt-BR');
  const [dependencies, setDependencies] = useState<DependencyStatus[]>(DEPENDENCIES);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [tourStep, setTourStep] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const steps: WizardStep[] = ['welcome', 'language', 'dependencies', 'template', 'tour', 'complete'];

  // Check dependencies
  const checkDependency = useCallback(async (dep: DependencyStatus): Promise<DependencyStatus> => {
    try {
      // Verificação especial para Ollama (local)
      if (dep.id === 'ollama') {
        try {
          const response = await fetch('http://127.0.0.1:11434/api/tags', {
            signal: AbortSignal.timeout(3000),
          });
          if (response.ok) {
            const data = await response.json();
            return {
              ...dep,
              status: 'installed',
              version: `${data.models?.length || 0} modelo(s)`,
            };
          }
        } catch {
          return { ...dep, status: 'missing' };
        }
      }

      // Verificação via API do backend
      if (dep.checkEndpoint) {
        const response = await fetch(dep.checkEndpoint, {
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            ...dep,
            status: data.installed ? 'installed' : 'missing',
            version: data.version,
            path: data.path,
          };
        }
      }

      // GPU check via WebGL
      if (dep.id === 'gpu') {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          const renderer = debugInfo 
            ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            : 'WebGL disponível';
          return {
            ...dep,
            status: 'installed',
            version: renderer,
          };
        }
        return { ...dep, status: 'missing' };
      }

      return { ...dep, status: 'missing' };
    } catch (error) {
      console.error(`Error checking ${dep.id}:`, error);
      return { ...dep, status: 'error' };
    }
  }, []);

  const checkAllDependencies = useCallback(async () => {
    setIsChecking(true);
    setDependencies((prev) => prev.map((d) => ({ ...d, status: 'checking' })));

    const results = await Promise.all(dependencies.map(checkDependency));
    setDependencies(results);
    setIsChecking(false);
  }, [dependencies, checkDependency]);

  const retryDependency = useCallback(async (id: string) => {
    setDependencies((prev) => 
      prev.map((d) => d.id === id ? { ...d, status: 'checking' } : d)
    );
    
    const dep = dependencies.find((d) => d.id === id);
    if (dep) {
      const result = await checkDependency(dep);
      setDependencies((prev) => 
        prev.map((d) => d.id === id ? result : d)
      );
    }
  }, [dependencies, checkDependency]);

  // Check dependencies on step change
  useEffect(() => {
    if (currentStep === 'dependencies') {
      checkAllDependencies();
    }
  }, [currentStep, checkAllDependencies]);

  // Navigation
  const canProceed = () => {
    switch (currentStep) {
      case 'dependencies':
        const requiredDeps = dependencies.filter((d) => d.required);
        return requiredDeps.every((d) => d.status === 'installed');
      case 'template':
        return selectedTemplate !== null;
      default:
        return true;
    }
  };

  const nextStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleComplete = () => {
    // Save preferences
    localStorage.setItem('aethel_language', selectedLanguage);
    localStorage.setItem('aethel_onboarding_complete', 'true');
    localStorage.setItem('aethel_last_template', selectedTemplate || 'blank');
    
    onComplete(selectedTemplate || undefined);
  };

  if (!isOpen) return null;

  // ============================================================================
  // RENDER STEPS
  // ============================================================================

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center max-w-lg mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-violet-500 to-fuchsia-600 
                          rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-500/30">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-3">
              Bem-vindo ao Aethel Engine
            </h1>
            <p className="text-zinc-400 mb-8">
              A plataforma de desenvolvimento de jogos AAA com inteligência artificial.
              Vamos configurar tudo para você começar a criar.
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <Cpu className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-300">IA Local</p>
                <p className="text-xs text-zinc-500">Sem custos de nuvem</p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <Gamepad2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-300">Engines AAA</p>
                <p className="text-xs text-zinc-500">Nanite, Lumen, GAS</p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <Globe className="w-6 h-6 text-sky-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-300">Cross-Platform</p>
                <p className="text-xs text-zinc-500">Web, Desktop, Mobile</p>
              </div>
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              Escolha seu Idioma
            </h2>
            <p className="text-zinc-400 text-center mb-6">
              Você pode alterar isso depois nas configurações
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-all
                    ${selectedLanguage === lang.code
                      ? 'bg-violet-500/20 border-violet-500 ring-2 ring-violet-500/50'
                      : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'}
                  `}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-white">{lang.name}</span>
                  {selectedLanguage === lang.code && (
                    <Check className="w-4 h-4 text-violet-400 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'dependencies':
        const requiredOk = dependencies.filter((d) => d.required).every((d) => d.status === 'installed');
        const allOk = dependencies.every((d) => d.status === 'installed');
        
        return (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              Verificando Dependências
            </h2>
            <p className="text-zinc-400 text-center mb-6">
              Vamos verificar se você tem tudo instalado
            </p>
            
            <div className="space-y-3 mb-6">
              {dependencies.map((dep) => (
                <DependencyItem
                  key={dep.id}
                  dep={dep}
                  onInstall={() => {}}
                  onRetry={retryDependency}
                />
              ))}
            </div>
            
            <div className={`
              p-4 rounded-lg border text-center
              ${allOk 
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : requiredOk
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-red-500/10 border-red-500/30'}
            `}>
              {allOk ? (
                <p className="text-emerald-400">
                  ✅ Tudo pronto! Todas as dependências estão instaladas.
                </p>
              ) : requiredOk ? (
                <p className="text-amber-400">
                  ⚠️ Dependências obrigatórias OK. Algumas opcionais estão faltando.
                </p>
              ) : (
                <p className="text-red-400">
                  ❌ Algumas dependências obrigatórias estão faltando.
                </p>
              )}
            </div>
            
            <button
              onClick={checkAllDependencies}
              disabled={isChecking}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 
                       bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors
                       disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              Verificar Novamente
            </button>
          </div>
        );

      case 'template':
        return (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              Escolha um Template
            </h2>
            <p className="text-zinc-400 text-center mb-6">
              Comece com um projeto base ou do zero
            </p>
            
            <div className="grid grid-cols-3 gap-4">
              {TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={selectedTemplate === template.id}
                  onSelect={() => setSelectedTemplate(template.id)}
                />
              ))}
            </div>
          </div>
        );

      case 'tour':
        const currentHighlight = TOUR_HIGHLIGHTS[tourStep];
        
        return (
          <div className="max-w-lg mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              Tour Rápido da Interface
            </h2>
            <p className="text-zinc-400 mb-8">
              Conheça as principais áreas da IDE
            </p>
            
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-6 mb-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-violet-500/20 rounded-lg 
                            flex items-center justify-center">
                {tourStep === 0 && <Terminal className="w-6 h-6 text-violet-400" />}
                {tourStep === 1 && <Settings className="w-6 h-6 text-violet-400" />}
                {tourStep === 2 && <Box className="w-6 h-6 text-violet-400" />}
                {tourStep === 3 && <Sparkles className="w-6 h-6 text-violet-400" />}
                {tourStep === 4 && <Terminal className="w-6 h-6 text-violet-400" />}
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">
                {currentHighlight?.title}
              </h3>
              <p className="text-zinc-400">
                {currentHighlight?.description}
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-6">
              {TOUR_HIGHLIGHTS.map((_, index) => (
                <div
                  key={index}
                  className={`
                    w-2 h-2 rounded-full transition-all
                    ${index === tourStep ? 'bg-violet-500 w-4' : 'bg-zinc-600'}
                  `}
                />
              ))}
            </div>
            
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setTourStep(Math.max(0, tourStep - 1))}
                disabled={tourStep === 0}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg 
                         disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (tourStep < TOUR_HIGHLIGHTS.length - 1) {
                    setTourStep(tourStep + 1);
                  } else {
                    nextStep();
                  }
                }}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg 
                         transition-colors flex items-center gap-2"
              >
                {tourStep < TOUR_HIGHLIGHTS.length - 1 ? (
                  <>Próximo <ChevronRight className="w-5 h-5" /></>
                ) : (
                  <>Concluir <Check className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center max-w-lg mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-green-600 
                          rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <Check className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-3">
              Tudo Pronto! 🎉
            </h2>
            <p className="text-zinc-400 mb-8">
              Seu ambiente está configurado e você está pronto para criar.
            </p>
            
            <div className="space-y-3 mb-8 text-left">
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-zinc-300">Idioma: {LANGUAGES.find(l => l.code === selectedLanguage)?.name}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-zinc-300">Dependências verificadas</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-zinc-300">Template: {TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'Nenhum'}</span>
              </div>
            </div>
            
            <button
              onClick={handleComplete}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 
                       hover:from-violet-500 hover:to-fuchsia-500 rounded-lg
                       font-semibold text-white flex items-center justify-center gap-2
                       transition-all shadow-lg shadow-violet-500/25"
            >
              <Rocket className="w-5 h-5" />
              Começar a Criar
            </button>
          </div>
        );
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-4">
        {/* Skip button */}
        {onSkip && currentStep !== 'complete' && (
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 flex items-center gap-2 text-sm text-zinc-500 
                     hover:text-zinc-300 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            Pular configuração
          </button>
        )}
        
        {/* Step indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} />
        
        {/* Content */}
        <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-8 shadow-2xl">
          {renderStep()}
        </div>
        
        {/* Navigation */}
        {currentStep !== 'complete' && (
          <div className="flex justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={currentStep === 'welcome'}
              className="flex items-center gap-2 px-4 py-2 text-zinc-400 
                       hover:text-white disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Voltar
            </button>
            
            {currentStep !== 'tour' && (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2 bg-violet-600 
                         hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600
                         rounded-lg transition-colors"
              >
                Continuar
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WelcomeWizard;
