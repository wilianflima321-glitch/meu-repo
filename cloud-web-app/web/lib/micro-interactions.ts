/**
 * Micro-interactions Library - Elite Visual Polish
 * 
 * Animações, transições e feedback tátil para experiência de elite
 * Padrão: Vercel, Linear, Cursor
 */

/**
 * Easing functions para animações suaves
 */
export const easing = {
  // Padrão
  linear: 'linear',
  
  // Ease-in (aceleração)
  easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
  easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
  easeInQuint: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
  
  // Ease-out (desaceleração)
  easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
  easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  easeOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
  
  // Ease-in-out (suave em ambas as direções)
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)',
  easeInOutQuint: 'cubic-bezier(0.86, 0, 0.07, 1)',
  
  // Bounce (elástico)
  easeOutBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  easeOutElastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  
  // Back (recuo)
  easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
}

/**
 * Durações padrão para animações
 */
export const duration = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 750,
  slowest: 1000,
}

/**
 * Classes Tailwind para transições comuns
 */
export const transitionClasses = {
  // Fade
  fadeIn: 'animate-in fade-in duration-300',
  fadeOut: 'animate-out fade-out duration-300',
  
  // Slide
  slideInFromLeft: 'animate-in slide-in-from-left-4 duration-300',
  slideInFromRight: 'animate-in slide-in-from-right-4 duration-300',
  slideInFromTop: 'animate-in slide-in-from-top-4 duration-300',
  slideInFromBottom: 'animate-in slide-in-from-bottom-4 duration-300',
  
  slideOutToLeft: 'animate-out slide-out-to-left-4 duration-300',
  slideOutToRight: 'animate-out slide-out-to-right-4 duration-300',
  slideOutToTop: 'animate-out slide-out-to-top-4 duration-300',
  slideOutToBottom: 'animate-out slide-out-to-bottom-4 duration-300',
  
  // Scale
  scaleIn: 'animate-in zoom-in-50 duration-300',
  scaleOut: 'animate-out zoom-out-50 duration-300',
  
  // Spin
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
}

/**
 * Padrões de micro-interações
 */
export const microInteractions = {
  /**
   * Feedback de clique (pressão visual)
   */
  clickFeedback: {
    className: 'active:scale-95 transition-transform duration-100',
    style: {
      transform: 'scale(0.95)',
    },
  },

  /**
   * Feedback de hover (elevação)
   */
  hoverElevation: {
    className: 'hover:shadow-lg hover:shadow-black/20 transition-shadow duration-200',
  },

  /**
   * Feedback de hover com glow
   */
  hoverGlow: {
    className: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-shadow duration-200',
  },

  /**
   * Feedback de foco (ring)
   */
  focusRing: {
    className: 'focus:outline-none focus:ring-2 focus:ring-[var(--aethel-primary)] focus:ring-offset-2 focus:ring-offset-[var(--aethel-surface-primary)]',
  },

  /**
   * Transição suave de estado
   */
  stateTransition: {
    className: 'transition-all duration-200 ease-out',
  },

  /**
   * Animação de carregamento (pulse)
   */
  loadingPulse: {
    className: 'animate-pulse',
  },

  /**
   * Animação de sucesso (bounce)
   */
  successBounce: {
    className: 'animate-bounce',
  },

  /**
   * Animação de erro (shake)
   */
  errorShake: {
    keyframes: `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
      }
    `,
    className: 'animate-[shake_0.5s]',
  },
}

/**
 * Função para criar animação customizada
 */
export function createCustomAnimation(
  name: string,
  keyframes: string,
  duration: number = 300,
  easing: string = 'ease-out'
): string {
  return `
    @keyframes ${name} {
      ${keyframes}
    }
    .animate-${name} {
      animation: ${name} ${duration}ms ${easing};
    }
  `
}

/**
 * Padrões de animação para transições de estado
 */
export const stateAnimations = {
  /**
   * Transição de loading para sucesso
   */
  loadingToSuccess: {
    from: 'animate-spin',
    to: 'animate-bounce',
    duration: 300,
  },

  /**
   * Transição de loading para erro
   */
  loadingToError: {
    from: 'animate-spin',
    to: 'animate-[shake_0.5s]',
    duration: 300,
  },

  /**
   * Transição de entrada
   */
  enter: {
    className: 'animate-in fade-in slide-in-from-bottom-4 duration-300',
  },

  /**
   * Transição de saída
   */
  exit: {
    className: 'animate-out fade-out slide-out-to-bottom-4 duration-200',
  },
}

/**
 * Feedback tátil (haptic) - para dispositivos que suportam
 */
export const hapticFeedback = {
  /**
   * Vibração leve (sucesso)
   */
  light: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
  },

  /**
   * Vibração média (aviso)
   */
  medium: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20)
    }
  },

  /**
   * Vibração forte (erro)
   */
  heavy: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([30, 10, 30])
    }
  },

  /**
   * Vibração de sucesso (padrão)
   */
  success: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 20, 10])
    }
  },

  /**
   * Vibração de erro (padrão)
   */
  error: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([30, 10, 30, 10, 30])
    }
  },

  /**
   * Vibração de clique
   */
  click: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(5)
    }
  },
}

/**
 * Som de feedback (opcional)
 */
export const soundFeedback = {
  /**
   * Reproduzir som de sucesso
   */
  success: async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (e) {
      // Audio context não disponível
    }
  },

  /**
   * Reproduzir som de erro
   */
  error: async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 300
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (e) {
      // Audio context não disponível
    }
  },

  /**
   * Reproduzir som de clique
   */
  click: async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 600
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.05)
    } catch (e) {
      // Audio context não disponível
    }
  },
}

/**
 * Padrão de animação de entrada de página
 */
export const pageEnterAnimation = {
  container: 'animate-in fade-in duration-500',
  staggerChildren: 'stagger-in',
}

/**
 * Padrão de animação de saída de página
 */
export const pageExitAnimation = {
  container: 'animate-out fade-out duration-300',
}

/**
 * Delay para efeito stagger
 */
export function getStaggerDelay(index: number, baseDelay: number = 50): number {
  return index * baseDelay
}
