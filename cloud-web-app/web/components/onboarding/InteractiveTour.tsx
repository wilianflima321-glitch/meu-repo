/**
 * Interactive Tour System - Tour Interativo Guiado
 * 
 * Sistema profissional de tour guiado com spotlight, tooltips e navegação.
 * Similar ao Intercom Product Tours ou Appcues.
 * 
 * @module components/onboarding/InteractiveTour
 */

'use client';

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  createContext, 
  useContext,
  ReactNode,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, X, Check, Sparkles } from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

export interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string | ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightPadding?: number;
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
  beforeStep?: () => void | Promise<void>;
  afterStep?: () => void | Promise<void>;
  disableOverlay?: boolean;
  highlightClicks?: boolean;
}

export interface Tour {
  id: string;
  name: string;
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

interface TourContextType {
  activeTour: Tour | null;
  currentStepIndex: number;
  isActive: boolean;
  startTour: (tour: Tour) => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const TourContext = createContext<TourContextType>({
  activeTour: null,
  currentStepIndex: 0,
  isActive: false,
  startTour: () => {},
  endTour: () => {},
  nextStep: () => {},
  prevStep: () => {},
  goToStep: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

// ============================================================================
// PROVIDER
// ============================================================================

export function TourProvider({ children }: { children: ReactNode }) {
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const isActive = activeTour !== null;

  const startTour = useCallback((tour: Tour) => {
    setActiveTour(tour);
    setCurrentStepIndex(0);
    
    // Execute beforeStep if exists
    if (tour.steps[0]?.beforeStep) {
      tour.steps[0].beforeStep();
    }
  }, []);

  const endTour = useCallback(() => {
    if (activeTour?.onComplete && currentStepIndex === (activeTour.steps.length - 1)) {
      activeTour.onComplete();
    } else if (activeTour?.onSkip) {
      activeTour.onSkip();
    }
    setActiveTour(null);
    setCurrentStepIndex(0);
  }, [activeTour, currentStepIndex]);

  const nextStep = useCallback(async () => {
    if (!activeTour) return;
    
    const currentStep = activeTour.steps[currentStepIndex];
    
    // Execute afterStep
    if (currentStep?.afterStep) {
      await currentStep.afterStep();
    }
    
    if (currentStepIndex < activeTour.steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      
      // Execute beforeStep of next step
      if (activeTour.steps[nextIndex]?.beforeStep) {
        await activeTour.steps[nextIndex].beforeStep();
      }
      
      setCurrentStepIndex(nextIndex);
    } else {
      // Último passo - finaliza tour
      if (activeTour.onComplete) {
        activeTour.onComplete();
      }
      setActiveTour(null);
      setCurrentStepIndex(0);
    }
  }, [activeTour, currentStepIndex]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback((index: number) => {
    if (activeTour && index >= 0 && index < activeTour.steps.length) {
      setCurrentStepIndex(index);
    }
  }, [activeTour]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          endTour();
          break;
        case 'ArrowRight':
        case 'Enter':
          nextStep();
          break;
        case 'ArrowLeft':
          prevStep();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, endTour, nextStep, prevStep]);

  return (
    <TourContext.Provider value={{
      activeTour,
      currentStepIndex,
      isActive,
      startTour,
      endTour,
      nextStep,
      prevStep,
      goToStep,
    }}>
      {children}
      {isActive && <TourOverlay />}
    </TourContext.Provider>
  );
}

// ============================================================================
// OVERLAY & SPOTLIGHT
// ============================================================================

function TourOverlay() {
  const { activeTour, currentStepIndex, nextStep, prevStep, endTour, goToStep } = useTour();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = activeTour?.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = activeTour ? currentStepIndex === activeTour.steps.length - 1 : false;
  const totalSteps = activeTour?.steps.length || 0;

  // Find target element and calculate positions
  useEffect(() => {
    if (!currentStep) return;

    const findTarget = () => {
      // Center mode - no target
      if (currentStep.placement === 'center' || !currentStep.target) {
        setTargetRect(null);
        return;
      }

      const target = document.querySelector(currentStep.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
        
        // Scroll into view if needed
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        console.warn(`Tour target not found: ${currentStep.target}`);
        setTargetRect(null);
      }
    };

    findTarget();
    
    // Re-calculate on resize
    window.addEventListener('resize', findTarget);
    window.addEventListener('scroll', findTarget, true);
    
    return () => {
      window.removeEventListener('resize', findTarget);
      window.removeEventListener('scroll', findTarget, true);
    };
  }, [currentStep]);

  // Calculate tooltip position
  useEffect(() => {
    if (!tooltipRef.current || !currentStep) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = currentStep.spotlightPadding || 8;
    
    let top = 0;
    let left = 0;

    if (currentStep.placement === 'center' || !targetRect) {
      // Center in viewport
      top = (window.innerHeight - tooltipRect.height) / 2;
      left = (window.innerWidth - tooltipRect.width) / 2;
    } else {
      const placement = currentStep.placement || 'bottom';
      
      switch (placement) {
        case 'top':
          top = targetRect.top - tooltipRect.height - padding - 12;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = targetRect.bottom + padding + 12;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - padding - 12;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + padding + 12;
          break;
      }

      // Keep within viewport
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipRect.width - 16));
      top = Math.max(16, Math.min(top, window.innerHeight - tooltipRect.height - 16));
    }

    setTooltipPosition({ top, left });
  }, [targetRect, currentStep]);

  if (!currentStep) return null;

  const spotlightPadding = currentStep.spotlightPadding || 8;

  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {/* Dark overlay with spotlight cutout */}
      {!currentStep.disableOverlay && (
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - spotlightPadding}
                  y={targetRect.top - spotlightPadding}
                  width={targetRect.width + spotlightPadding * 2}
                  height={targetRect.height + spotlightPadding * 2}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect 
            x="0" 
            y="0" 
            width="100%" 
            height="100%" 
            fill="rgba(0, 0, 0, 0.75)" 
            mask="url(#spotlight-mask)"
          />
        </svg>
      )}

      {/* Spotlight border/highlight */}
      {targetRect && (
        <div
          className="absolute border-2 border-sky-500 rounded-lg pointer-events-none animate-pulse"
          style={{
            left: targetRect.left - spotlightPadding,
            top: targetRect.top - spotlightPadding,
            width: targetRect.width + spotlightPadding * 2,
            height: targetRect.height + spotlightPadding * 2,
            boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.3), 0 0 20px rgba(99, 102, 241, 0.5)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute w-96 max-w-[calc(100vw-32px)] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-sky-600/20 to-purple-600/20 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              <span className="text-xs text-slate-400 font-medium">
                Passo {currentStepIndex + 1} de {totalSteps}
              </span>
            </div>
            <button
              onClick={endTour}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              aria-label="Fechar tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-white">
            {currentStep.title}
          </h3>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <div className="text-sm text-slate-300 leading-relaxed">
            {currentStep.content}
          </div>

          {/* Custom action button */}
          {currentStep.action && (
            <button
              onClick={currentStep.action.onClick}
              className="mt-4 w-full px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {currentStep.action.label}
            </button>
          )}
        </div>

        {/* Footer with navigation */}
        <div className="px-5 py-3 bg-slate-900/50 border-t border-slate-700 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                onClick={() => goToStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStepIndex 
                    ? 'bg-sky-500 w-4' 
                    : i < currentStepIndex 
                    ? 'bg-sky-400/50' 
                    : 'bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
            >
              {isLastStep ? (
                <>
                  <Check className="w-4 h-4" />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// PRE-DEFINED TOURS
// ============================================================================

export const TOURS = {
  // Tour de primeiro acesso ao IDE
  ideIntro: {
    id: 'ide-intro',
    name: 'Tour do IDE',
    steps: [
      {
        id: 'welcome',
        target: '',
        placement: 'center' as const,
        title: 'Bem-vindo ao Aethel Engine! 🎮',
        content: 'Vamos fazer um tour rápido pelas principais funcionalidades. Você pode pular a qualquer momento pressionando ESC.',
      },
      {
        id: 'file-explorer',
        target: '[data-tour="file-explorer"]',
        placement: 'right' as const,
        title: 'Explorador de Arquivos',
        content: 'Aqui você gerencia todos os arquivos do seu projeto. Clique com botão direito para criar pastas, arquivos e assets.',
      },
      {
        id: 'code-editor',
        target: '[data-tour="code-editor"]',
        placement: 'left' as const,
        title: 'Editor de Código',
        content: (
          <div>
            <p>Editor poderoso com autocomplete e IA integrada.</p>
            <ul className="mt-2 text-xs space-y-1 text-slate-400">
              <li>• <kbd className="px-1 bg-slate-700 rounded">Cmd+K</kbd> - Edição com IA</li>
              <li>• <kbd className="px-1 bg-slate-700 rounded">Cmd+P</kbd> - Busca rápida</li>
              <li>• <kbd className="px-1 bg-slate-700 rounded">Cmd+Shift+P</kbd> - Comandos</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'terminal',
        target: '[data-tour="terminal"]',
        placement: 'top' as const,
        title: 'Terminal Integrado',
        content: 'Terminal completo com acesso ao sistema. Execute comandos, gerencie dependências e faça builds.',
      },
      {
        id: 'viewport',
        target: '[data-tour="viewport"]',
        placement: 'left' as const,
        title: 'Viewport 3D',
        content: 'Visualize e edite sua cena em tempo real. Use WASD para navegar e scroll para zoom.',
      },
      {
        id: 'ai-assistant',
        target: '[data-tour="ai-assistant"]',
        placement: 'left' as const,
        title: 'Assistente de IA',
        content: 'Seu parceiro de desenvolvimento. Peça para criar código, assets, ou explicar conceitos. A IA pode até executar ações automaticamente!',
      },
      {
        id: 'play-button',
        target: '[data-tour="play-button"]',
        placement: 'bottom' as const,
        title: 'Testar seu Jogo',
        content: 'Clique em Play para testar seu jogo instantaneamente no navegador. Hot reload mantém suas alterações em tempo real.',
      },
      {
        id: 'tour-complete',
        target: '',
        placement: 'center' as const,
        title: 'Pronto para criar! 🚀',
        content: 'Você conhece o básico. Explore, experimente e divirta-se criando! Se precisar de ajuda, a IA está sempre disponível.',
      },
    ],
  },

  // Tour do Visual Scripting
  visualScripting: {
    id: 'visual-scripting',
    name: 'Tour do Visual Scripting',
    steps: [
      {
        id: 'intro',
        target: '',
        placement: 'center' as const,
        title: 'Visual Scripting (Blueprints) 🔧',
        content: 'Crie lógica de jogo sem escrever código! Conecte nós visualmente para programar comportamentos.',
      },
      {
        id: 'node-palette',
        target: '[data-tour="node-palette"]',
        placement: 'right' as const,
        title: 'Paleta de Nós',
        content: 'Arraste nós daqui para o canvas. Temos eventos, condições, ações, matemática e muito mais.',
      },
      {
        id: 'canvas',
        target: '[data-tour="vs-canvas"]',
        placement: 'left' as const,
        title: 'Canvas de Edição',
        content: 'Conecte os nós arrastando das portas. Linhas brancas são fluxo de execução, coloridas são dados.',
      },
      {
        id: 'variables',
        target: '[data-tour="vs-variables"]',
        placement: 'right' as const,
        title: 'Variáveis',
        content: 'Crie variáveis para armazenar valores. Arraste-as para o canvas para usar.',
      },
    ],
  },
};

// ============================================================================
// HOOK PARA INICIAR TOUR
// ============================================================================

export function useStartTour() {
  const { startTour } = useTour();
  
  return {
    startIDETour: () => startTour(TOURS.ideIntro as Tour),
    startVisualScriptingTour: () => startTour(TOURS.visualScripting as Tour),
    startCustomTour: (tour: Tour) => startTour(tour),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TourProvider;
