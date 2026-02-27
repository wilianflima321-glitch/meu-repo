import type { EmotionalContext, SceneContext } from './ai-audio-engine.types';

export class EmotionAnalyzer {
  private emotionKeywords: Record<string, string[]> = {
    joy: ['happy', 'joy', 'excited', 'wonderful', 'amazing', 'love', 'celebrate', 'triumph'],
    sadness: ['sad', 'cry', 'tears', 'loss', 'grief', 'mourn', 'lonely', 'heartbreak'],
    anger: ['angry', 'rage', 'fury', 'hate', 'violent', 'attack', 'destroy', 'revenge'],
    fear: ['scared', 'afraid', 'terror', 'horror', 'panic', 'dread', 'danger', 'threat'],
    surprise: ['surprise', 'shock', 'unexpected', 'sudden', 'reveal', 'discover', 'twist'],
    anticipation: ['wait', 'expect', 'building', 'tension', 'suspense', 'approaching', 'imminent'],
  };

  analyzeText(text: string): EmotionalContext {
    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      anticipation: 0,
    };

    for (const word of words) {
      for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
        if (keywords.some(keyword => word.includes(keyword))) {
          scores[emotion]++;
        }
      }
    }

    const maxScore = Math.max(...Object.values(scores), 1);
    for (const emotion of Object.keys(scores)) {
      scores[emotion] /= maxScore;
    }

    const valence = (scores.joy - scores.sadness - scores.anger - scores.fear) / 2;
    const arousal = (scores.anger + scores.fear + scores.surprise + scores.anticipation) / 4;
    const intensity = Math.max(...Object.values(scores));

    return {
      joy: scores.joy,
      sadness: scores.sadness,
      anger: scores.anger,
      fear: scores.fear,
      surprise: scores.surprise,
      disgust: 0,
      trust: 1 - scores.fear,
      anticipation: scores.anticipation,
      intensity,
      valence: Math.max(-1, Math.min(1, valence)),
      arousal: Math.max(0, Math.min(1, arousal)),
    };
  }

  async analyzeVisual(_imageData: ImageData | HTMLCanvasElement): Promise<EmotionalContext> {
    return {
      joy: 0.3,
      sadness: 0.1,
      anger: 0,
      fear: 0,
      surprise: 0.1,
      disgust: 0,
      trust: 0.5,
      anticipation: 0.2,
      intensity: 0.3,
      valence: 0.2,
      arousal: 0.3,
    };
  }
}

export class ContextTracker {
  private history: SceneContext[] = [];
  private listeners: ((context: SceneContext) => void)[] = [];

  track(context: SceneContext): void {
    this.history.push(context);
    if (this.history.length > 60) {
      this.history.shift();
    }

    for (const listener of this.listeners) {
      listener(context);
    }
  }

  onContextChange(callback: (context: SceneContext) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  getAverageEmotion(): EmotionalContext {
    if (this.history.length === 0) {
      return {
        joy: 0,
        sadness: 0,
        anger: 0,
        fear: 0,
        surprise: 0,
        disgust: 0,
        trust: 0,
        anticipation: 0,
        intensity: 0,
        valence: 0,
        arousal: 0,
      };
    }

    const sum: EmotionalContext = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      disgust: 0,
      trust: 0,
      anticipation: 0,
      intensity: 0,
      valence: 0,
      arousal: 0,
    };

    for (const context of this.history) {
      for (const key of Object.keys(sum) as (keyof EmotionalContext)[]) {
        sum[key] += context.emotion[key];
      }
    }

    for (const key of Object.keys(sum) as (keyof EmotionalContext)[]) {
      sum[key] /= this.history.length;
    }

    return sum;
  }
}
