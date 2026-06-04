'use client';

/**
 * NewProjectWizard - fast project creation flow.
 *
 * Keeps the first-run experience focused: choose a genre, choose a visual
 * direction, then open the editor with clear progress and no public jargon.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Cpu,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  Loader2,
  Check,
  Rocket,
} from 'lucide-react';
import {
  GENRES,
  LOADING_STEPS,
  STYLES,
  createSuggestedProjectName,
  type GameGenre,
  type NewProjectWizardProps,
  type VisualStyle,
} from './NewProjectWizard.model';

// ============================================================================
// MAIN COMPONENT
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
      setProjectName(createSuggestedProjectName(genre?.name));
    }
  }, [selectedGenre, projectName]);

  // Run loading steps with cleanup so the modal never leaks timers.
  useEffect(() => {
    if (step !== 'loading') return;

    let currentStep = 0;
    let currentProgress = 0;
    const intervalIds: ReturnType<typeof setInterval>[] = [];
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

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
      intervalIds.push(progressInterval);

      const timeoutId = setTimeout(() => {
        clearInterval(progressInterval);
        currentStep++;
        runStep();
      }, stepData.duration);
      timeoutIds.push(timeoutId);
    };

    runStep();

    return () => {
      intervalIds.forEach(clearInterval);
      timeoutIds.forEach(clearTimeout);
    };
  }, [step]);

  // Create project on complete
  useEffect(() => {
    if (step !== 'complete') return;
    let redirectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

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
        if (isCancelled) return;

        redirectTimeout = setTimeout(() => {
          if (onComplete) {
            onComplete(projectId);
          } else {
            router.push(`/editor/${projectId}`);
          }
        }, 1000);
      } catch (err) {
        setError('Failed to create project. Try again.');
        setStep('style');
      }
    };

    createProject();

    return () => {
      isCancelled = true;
      if (redirectTimeout) clearTimeout(redirectTimeout);
    };
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
          What should we build?
        </h1>
        <p className="text-[var(--aethel-text-tertiary)]">
          Choose a genre to start with a playable template
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
          <button type="button" aria-label={`Select genre ${genre.name}`}
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
        <button type="button" aria-label="Cancel new project creation"
          onClick={onCancel}
          className="px-4 py-2 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {/* Mute toggle */}
          <button type="button" aria-label={isMuted ? 'Enable preview audio' : 'Mute preview audio'}
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button type="button" aria-label="Continue to visual style"
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
            Next
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
          Choose a visual direction
        </h1>
        <p className="text-[var(--aethel-text-tertiary)]">
          Define the aesthetic of your game. You can change it later.
        </p>
      </div>

      {/* Style Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 flex-1">
        {STYLES.map((style) => (
          <button type="button" aria-label={`Select style ${style.name}`}
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
        <label className="text-[var(--aethel-text-tertiary)] whitespace-nowrap">Project name:</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="flex-1 px-4 py-2 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)] rounded-lg text-[var(--aethel-text-primary)] focus:outline-none focus:border-[var(--aethel-accent)]"
          placeholder="Epic Starter"
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
        <button type="button" aria-label="Back to genre selection"
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <button type="button" aria-label="Materialize project universe"
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
          Create project
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
        {LOADING_STEPS[loadingStep]?.message || 'Finalizing...'}
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
        <p>Creating: <span className="text-[var(--aethel-text-secondary)]">{projectName}</span></p>
        <p>
          Template: <span className="text-[var(--aethel-text-secondary)]">{GENRES.find(g => g.id === selectedGenre)?.name}</span>
          {' | '}
          Style: <span className="text-[var(--aethel-text-secondary)]">{STYLES.find(s => s.id === selectedStyle)?.name}</span>
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
      <h2 className="text-2xl font-bold text-[var(--aethel-text-primary)] mb-2">Project ready</h2>
      <p className="text-[var(--aethel-text-tertiary)] mb-6">Opening the editor...</p>
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
              <span className="hidden sm:inline">Genre</span>
            </div>
            <div className="w-12 h-0.5 bg-[var(--aethel-surface-quaternary)]" />
            <div className={`flex items-center gap-2 ${step === 'style' ? 'text-[var(--aethel-primary-light)]' : 'text-[var(--aethel-text-quaternary)]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'style' ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-quaternary)]'}`}>
                2
              </div>
              <span className="hidden sm:inline">Style</span>
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
