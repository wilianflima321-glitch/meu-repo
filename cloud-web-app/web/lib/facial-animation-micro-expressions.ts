// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import { ActionUnit } from './facial-animation-contracts';

export class MicroExpressionGenerator {
  private expressions: { au: ActionUnit; intensity: number; duration: number; startTime: number }[] = [];
  private currentTime: number = 0;
  private meanInterval: number = 5; // Seconds between micro expressions
  private nextExpressionTime: number;

  private possibleExpressions: { aus: ActionUnit[]; maxIntensity: number }[] = [
    { aus: [ActionUnit.AU1], maxIntensity: 0.2 }, // Subtle brow raise
    { aus: [ActionUnit.AU4], maxIntensity: 0.15 }, // Slight frown
    { aus: [ActionUnit.AU12], maxIntensity: 0.1 }, // Micro smile
    { aus: [ActionUnit.AU14], maxIntensity: 0.2 }, // Dimple
    { aus: [ActionUnit.AU17], maxIntensity: 0.15 }, // Chin raise
    { aus: [ActionUnit.AU6], maxIntensity: 0.1 }, // Cheek raise
  ];

  constructor() {
    this.nextExpressionTime = this.getNextTime();
  }

  private getNextTime(): number {
    return this.meanInterval + (Math.random() - 0.5) * this.meanInterval;
  }

  update(deltaTime: number): Map<ActionUnit, number> {
    this.currentTime += deltaTime;

    // Check if we should trigger new micro expression
    if (this.currentTime >= this.nextExpressionTime) {
      this.triggerRandomExpression();
      this.nextExpressionTime = this.currentTime + this.getNextTime();
    }

    // Update active expressions
    const result = new Map<ActionUnit, number>();

    this.expressions = this.expressions.filter(expr => {
      const elapsed = this.currentTime - expr.startTime;
      if (elapsed >= expr.duration) return false;

      // Bell curve intensity
      const t = elapsed / expr.duration;
      const intensity = expr.intensity * Math.sin(t * Math.PI);

      const current = result.get(expr.au) || 0;
      result.set(expr.au, Math.min(1, current + intensity));

      return true;
    });

    return result;
  }

  triggerRandomExpression(): void {
    const template = this.possibleExpressions[
      Math.floor(Math.random() * this.possibleExpressions.length)
    ];

    const intensity = Math.random() * template.maxIntensity;
    const duration = 0.2 + Math.random() * 0.3; // 0.2-0.5 seconds

    for (const au of template.aus) {
      this.expressions.push({
        au,
        intensity,
        duration,
        startTime: this.currentTime,
      });
    }
  }

  setFrequency(expressionsPerMinute: number): void {
    this.meanInterval = 60 / expressionsPerMinute;
  }
}

// ============================================================================
// WRINKLE MAP CONTROLLER
// ============================================================================

