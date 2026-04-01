/**
 * NewProjectWizard - Experiencia de Onboarding "Time-to-Fun"
 *
 * Wizard visual imersivo para criacao de projetos.
 * Meta: Usuario com jogo rodando em < 30 segundos.
 *
 * Fluxo:
 * 1. Escolha de Genero (Cards com video preview)
 * 2. Escolha de Estilo Visual (Vibe)
 * 3. Loading cinematografico
 * 4. Redirect para editor com projeto pronto
 *
 * @see DETALHAMENTO_UX_STRATEGY_2026.md - Secao 1
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Crosshair,
  Sword,
  Gamepad2,
  Car,
  Box,
  Sparkles,
  Palette,
  Cpu,
  Zap,
  ChevronRight,
  ChevronLeft,
  Play,
  Volume2,
  VolumeX,
  Loader2,
  Check,
  Rocket,
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

export type GameGenre = 'fps' | 'rpg' | 'platformer' | 'racing' | 'blank';
export type VisualStyle = 'pixel' | 'lowpoly' | 'realistic' | 'scifi' | 'stylized';

interface GenreOption {
  id: GameGenre;
  name: string;
  description: string;
  icon: React.ReactNode;
  previewVideo?: string;
  previewImage: string;
  features: string[];
  expertOnly?: boolean;
}

interface StyleOption {
  id: VisualStyle;
  name: string;
  description: string;
  previewImage: string;
  requiresGPU?: boolean;
  colors: string[];
}

interface LoadingStep {
  id: string;
  message: string;
  duration: number;
}

interface NewProjectWizardProps {
  onComplete?: (projectId: string) => void;
  onCancel?: () => void;
}

// ============================================================================
// DADOS DOS GENEROS
// ============================================================================

const GENRES: GenreOption[] = [
  {
    id: 'fps',
    name: 'FPS Shooter',
    description: 'Acao em primeira pessoa com tiroteio e combate',
    icon: <Crosshair className="w-8 h-8" />,
    previewImage: '/templates/fps-preview.webp',
    previewVideo: '/templates/fps-preview.webm',
    features: ['Sistema de armas', 'IA de inimigos', 'HUD completo', 'Fisica de projeteis'],
  },
  {
    id: 'rpg',
    name: 'RPG Top-Down',
    description: 'Aventura com exploracao, inventario e batalhas',
    icon: <Sword className="w-8 h-8" />,
    previewImage: '/templates/rpg-preview.webp',
    previewVideo: '/templates/rpg-preview.webm',
    features: ['Sistema de inventario', 'Dialogos', 'Quests', 'Combate por turnos'],
  },
  {
    id: 'platformer',
    name: 'Platformer 2D',
    description: 'Plataforma side-scrolling com pulos e obstaculos',
    icon: <Gamepad2 className="w-8 h-8" />,
    previewImage: '/templates/platformer-preview.webp',
    previewVideo: '/templates/platformer-preview.webm',
    features: ['Fisica 2D', 'Parallax scrolling', 'Coletaveis', 'Checkpoints'],
  },
  {
    id: 'racing',
    name: 'Racing',
    description: 'Corrida arcade com veiculos e pistas',
    icon: <Car className="w-8 h-8" />,
    previewImage: '/templates/racing-preview.webp',
    previewVideo: '/templates/racing-preview.webm',
    features: ['Fisica de veiculos', 'Waypoints de pista', 'Volta cronometrada', 'Power-ups'],
  },
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Projeto vazio para experts. Voce constroi tudo.',
    icon: <Box className="w-8 h-8" />,
    previewImage: '/templates/blank-preview.webp',
    features: ['Cena vazia', 'Liberdade total'],
    expertOnly: true,
  },
];

// ============================================================================
// DADOS DOS ESTILOS VISUAIS
// ============================================================================

const STYLES: StyleOption[] = [
  {
    id: 'pixel',
    name: 'Pixel Art',
    description: 'Estetica retro com pixels visiveis',
    previewImage: '/templates/style-pixel.webp',
    colors: ['var(--aethel-accent)', 'var(--aethel-secondary)', 'var(--aethel-warning)'],
  },
  {
    id: 'lowpoly',
    name: 'Low Poly 3D',
    description: 'Geometria simplificada, visual moderno',
    previewImage: '/templates/style-lowpoly.webp',
    colors: ['var(--aethel-success)', 'var(--aethel-primary)', 'var(--aethel-warning-light)'],
  },
  {
    id: 'realistic',
    name: 'Realistic PBR',
    description: 'Graficos realistas com materiais avancados',
    previewImage: '/templates/style-realistic.webp',
    requiresGPU: true,
    colors: ['var(--aethel-text-quaternary)', 'var(--aethel-surface-quaternary)', 'var(--aethel-surface-tertiary)'],
  },
  {
    id: 'scifi',
    name: 'Sci-Fi Neon',
    description: 'Futurista com cores vibrantes e bloom',
    previewImage: '/templates/style-scifi.webp',
    colors: ['var(--aethel-info)', 'var(--aethel-accent)', 'var(--aethel-secondary)'],
  },
  {
    id: 'stylized',
    name: 'Stylized Toon',
    description: 'Cel-shading e outlines estilizados',
    previewImage: '/templates/style-stylized.webp',
    colors: ['var(--aethel-secondary-light)', 'var(--aethel-accent-light)', 'var(--aethel-success-light)'],
  },
];

// ============================================================================
// STEPS DE LOADING (fake mas util)
// ============================================================================

const LOADING_STEPS: LoadingStep[] = [
  { id: 'init', message: 'Inicializando universo...', duration: 800 },
  { id: 'terrain', message: 'Gerando terreno procedural...', duration: 1200 },
  { id: 'shaders', message: 'Compilando shaders...', duration: 1000 },
  { id: 'assets', message: 'Carregando assets base...', duration: 1500 },
  { id: 'ai', message: 'Acordando agentes de IA...', duration: 800 },
  { id: 'physics', message: 'Calibrando motor de fisica...', duration: 600 },
  { id: 'audio', message: 'Sincronizando audio espacial...', duration: 400 },
  { id: 'final', message: 'Materializando seu universo...', duration: 700 },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function NewProjectWizard({ onComplete, onCancel }: NewProjectWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<'genre' | 'style' | 'loading' | 'complete'>('genre');
  const [selectedGenre, setSelectedGenre] = useState<GameGenre | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle | null>(null);
  const [hoveredGenre, setHoveredGenre] = useState<GameGenre | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-generate project name
  useEffect(() => {
    if (selectedGenre && !projectName) {
      const genre = GENRES.find(g => g.id === selectedGenre);
      const adjectives = ['Epic', 'Cosmic', 'Neon', 'Shadow', 'Crystal', 'Quantum'];
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      setProjectName(`${adj} ${genre?.name || 'Project'}`);
    }
  }, [selectedGenre, projectName]);

  // Simulate loading steps
  useEffect(() => {
    if (step !== 'loading') return;

    let currentStep = 0;
    let currentProgress = 0;

    const runStep = () => {
      if (currentStep >= LOADING_STEPS.length) {
        setStep('complete');
        return;
      }

      setLoadingStep(currentStep);
      const stepData = LOADING_STEPS[currentStep];
      const progressIncrement = 100 / LOADING_STEPS.length;

      // Animate progress within step
      const progressInterval = setInterval(() => {
        currentProgress += progressIncrement / 10;
        setLoadingProgress(Math.min(currentProgress, 100));
      }, stepData.duration / 10);

      setTimeout(() => {
        clearInterval(progressInterval);
        currentStep++;
        runStep();
      }, stepData.duration);
    };

    runStep();
  }, [step]);

  // Create project on complete
  useEffect(() => {
    if (step !== 'complete') return;

    const createProject = async () => {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            template: selectedGenre,
            style: selectedStyle,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create project');
        }

        const { projectId } = await response.json();

        // Small delay for dramatic effect
        setTimeout(() => {
          if (onComplete) {
            onComplete(projectId);
          } else {
            router.push(`/editor/${projectId}`);
          }
        }, 1000);
      } catch (err) {
        setError('Falha ao criar projeto. Tente novamente.');
        setStep('style');
      }
    };

    createProject();
  }, [step, projectName, selectedGenre, selectedStyle, onComplete, router]);

  // Handle video hover preview
  const handleGenreHover = useCallback((genre: GameGenre | null) => {
    setHoveredGenre(genre);
    if (videoRef.current && genre) {
      const genreData = GENRES.find(g => g.id === genre);
      if (genreData?.previewVideo) {
        videoRef.current.src = genreData.previewVideo;
        videoRef.current.play().catch(() => {});
      }
    }
  }, []);

  const handleGenreSelect = useCallback((genre: GameGenre) => {
    setSelectedGenre(genre);
    // If blank, skip style selection
    if (genre === 'blank') {
      setSelectedStyle('stylized');
      setStep('loading');
    }
  }, []);

  const handleStyleSelect = useCallback((style: VisualStyle) => {
    setSelectedStyle(style);
  }, []);

  const handleNext = useCallback(() => {
    if (step === 'genre' && selectedGenre) {
      setStep('style');
    } else if (step === 'style' && selectedStyle) {
      setStep('loading');
    }
  }, [step, selectedGenre, selectedStyle]);

  const handleBack = useCallback(() => {
    if (step === 'style') {
      setStep('genre');
      setSelectedStyle(null);
    }
  }, [step]);

  // ============================================================================
  // RENDER: STEP GENRE
  // ============================================================================

  const renderGenreStep = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[var(--aethel-text-primary)] mb-2">
          O que vamos criar hoje?
        </h1>
        <p className="text-[var(--aethel-text-tertiary)]">
          Escolha um genero para comecar com um template pronto para jogar
        </p>
      </div>

      {/* Video Preview Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover opacity-20"
          muted={isMuted}
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--aethel-surface-primary)] via-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] to-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)]" />
      </div>

      {/* Genre Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 flex-1">
        {GENRES.map((genre) => (
          <button
            key={genre.id}
            onClick={() => handleGenreSelect(genre.id)}
            onMouseEnter={() => handleGenreHover(genre.id)}
            onMouseLeave={() => handleGenreHover(null)}
            className={`
              relative group p-4 rounded-xl border-2 transition-all duration-300
              ${selectedGenre === genre.id
                ? 'border-[var(--aethel-accent)] bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] scale-105'
                : 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-quaternary)]'
              }
              ${genre.expertOnly ? 'opacity-60' : ''}
            `}
          >
            {/* Expert Badge */}
            {genre.expertOnly && (
              <span className="absolute top-2 right-2 text-[10px] bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning-light)] px-1.5 py-0.5 rounded">
                Expert
              </span>
            )}

            {/* Icon */}
            <div className={`
              w-16 h-16 mx-auto mb-3 rounded-xl flex items-center justify-center
              ${selectedGenre === genre.id
                ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
                : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] group-hover:bg-[var(--aethel-surface-quaternary)]'
              }
            `}>
              {genre.icon}
            </div>

            {/* Name & Description */}
            <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)] mb-1">{genre.name}</h3>
            <p className="text-xs text-[var(--aethel-text-tertiary)] mb-3 line-clamp-2">{genre.description}</p>

            {/* Features */}
            <div className="space-y-1">
              {genre.features.slice(0, 2).map((feature) => (
                <div key={feature} className="flex items-center gap-1 text-[10px] text-[var(--aethel-text-quaternary)]">
                  <Check className="w-3 h-3 text-[var(--aethel-success)]" />
                  {feature}
                </div>
              ))}
            </div>

            {/* Selection indicator */}
            {selectedGenre === genre.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--aethel-primary)] rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-[var(--aethel-text-primary)]" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--aethel-border-primary)]">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
        >
          Cancelar
        </button>

        <div className="flex items-center gap-3">
          {/* Mute toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            onClick={handleNext}
            disabled={!selectedGenre}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all
              ${selectedGenre
                ? 'bg-[var(--aethel-primary-dark)] hover:bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
                : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-quaternary)] cursor-not-allowed'
              }
            `}
          >
            Proximo
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: STEP STYLE
  // ============================================================================

  const renderStyleStep = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[var(--aethel-text-primary)] mb-2">
          Escolha a vibe visual
        </h1>
        <p className="text-[var(--aethel-text-tertiary)]">
          Define a estetica do seu jogo. Voce pode mudar depois.
        </p>
      </div>

      {/* Style Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 flex-1">
        {STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => handleStyleSelect(style.id)}
            className={`
              relative group p-4 rounded-xl border-2 transition-all duration-300
              ${selectedStyle === style.id
                ? 'border-[var(--aethel-accent)] bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] scale-105'
                : 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] hover:border-[var(--aethel-border-secondary)]'
              }
            `}
          >
            {/* GPU Badge */}
            {style.requiresGPU && (
              <span className="absolute top-2 right-2 text-[10px] bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning-light)] px-1.5 py-0.5 rounded flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                GPU
              </span>
            )}

            {/* Preview Image */}
            <div className="relative w-full aspect-video rounded-lg bg-[var(--aethel-surface-quaternary)] mb-3 overflow-hidden">
              <Image
                src={style.previewImage}
                alt={style.name}
                fill
                unoptimized
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* Color palette fallback */}
              <div
                className="w-full h-full flex"
                style={{ display: 'flex' }}
              >
                {style.colors.map((color, i) => (
                  <div
                    key={i}
                    className="flex-1 h-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Name & Description */}
            <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)] mb-1">{style.name}</h3>
            <p className="text-xs text-[var(--aethel-text-tertiary)] line-clamp-2">{style.description}</p>

            {/* Selection indicator */}
            {selectedStyle === style.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--aethel-primary)] rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-[var(--aethel-text-primary)]" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Project Name Input */}
      <div className="mt-6 flex items-center gap-4">
        <label className="text-[var(--aethel-text-tertiary)] whitespace-nowrap">Nome do Projeto:</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="flex-1 px-4 py-2 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)] rounded-lg text-[var(--aethel-text-primary)] focus:outline-none focus:border-[var(--aethel-accent)]"
          placeholder="Meu Jogo Epico"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_50%,transparent)] rounded-lg text-[var(--aethel-error-light)] text-sm">
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--aethel-border-primary)]">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Voltar
        </button>

        <button
          onClick={handleNext}
          disabled={!selectedStyle || !projectName.trim()}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all
            ${selectedStyle && projectName.trim()
              ? 'bg-gradient-to-r from-[var(--aethel-primary-dark)] to-[var(--aethel-info-dark)] hover:from-[var(--aethel-primary)] hover:to-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
              : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-quaternary)] cursor-not-allowed'
            }
          `}
        >
          <Rocket className="w-5 h-5" />
          Materializar Universo
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: LOADING STEP
  // ============================================================================

  const renderLoadingStep = () => (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Animated Icon */}
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-[var(--aethel-accent)]/30 animate-ping" />
        <div className="absolute inset-2 rounded-full border-4 border-[var(--aethel-accent)]/50 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-[var(--aethel-primary-light)] animate-bounce" />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-80 h-2 bg-[var(--aethel-surface-tertiary)] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)] transition-all duration-300"
          style={{ width: `${loadingProgress}%` }}
        />
      </div>

      {/* Current Step Message */}
      <p className="text-lg text-[var(--aethel-text-primary)] mb-2 font-medium">
        {LOADING_STEPS[loadingStep]?.message || 'Finalizando...'}
      </p>

      {/* Steps Progress */}
      <div className="flex items-center gap-2 mt-4">
        {LOADING_STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`w-2 h-2 rounded-full transition-all ${
              i < loadingStep
                ? 'bg-[var(--aethel-primary)]'
                : i === loadingStep
                ? 'bg-[var(--aethel-primary-light)] animate-pulse'
                : 'bg-[var(--aethel-surface-quaternary)]'
            }`}
          />
        ))}
      </div>

      {/* Project Info */}
      <div className="mt-8 text-center text-[var(--aethel-text-quaternary)] text-sm">
        <p>Criando: <span className="text-[var(--aethel-text-secondary)]">{projectName}</span></p>
        <p>
          Template: <span className="text-[var(--aethel-text-secondary)]">{GENRES.find(g => g.id === selectedGenre)?.name}</span>
          {' | '}
          Estilo: <span className="text-[var(--aethel-text-secondary)]">{STYLES.find(s => s.id === selectedStyle)?.name}</span>
        </p>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: COMPLETE STEP
  // ============================================================================

  const renderCompleteStep = () => (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-20 h-20 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] flex items-center justify-center mb-6">
        <Check className="w-10 h-10 text-[var(--aethel-success-light)]" />
      </div>
      <h2 className="text-2xl font-bold text-[var(--aethel-text-primary)] mb-2">Universo Criado!</h2>
      <p className="text-[var(--aethel-text-tertiary)] mb-6">Abrindo o editor...</p>
      <Loader2 className="w-6 h-6 text-[var(--aethel-primary-light)] animate-spin" />
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-[var(--aethel-surface-primary)] z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl h-[80vh] bg-[var(--aethel-surface-secondary)] rounded-2xl border border-[var(--aethel-border-primary)] p-8 overflow-hidden">
        {/* Step Indicator */}
        {step !== 'loading' && step !== 'complete' && (
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step === 'genre' ? 'text-[var(--aethel-primary-light)]' : 'text-[var(--aethel-text-quaternary)]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'genre' ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-quaternary)]'}`}>
                1
              </div>
              <span className="hidden sm:inline">Genero</span>
            </div>
            <div className="w-12 h-0.5 bg-[var(--aethel-surface-quaternary)]" />
            <div className={`flex items-center gap-2 ${step === 'style' ? 'text-[var(--aethel-primary-light)]' : 'text-[var(--aethel-text-quaternary)]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'style' ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-quaternary)]'}`}>
                2
              </div>
              <span className="hidden sm:inline">Estilo</span>
            </div>
          </div>
        )}

        {/* Step Content */}
        {step === 'genre' && renderGenreStep()}
        {step === 'style' && renderStyleStep()}
        {step === 'loading' && renderLoadingStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  );
}

export default NewProjectWizard;
