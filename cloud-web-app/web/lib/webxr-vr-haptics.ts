// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
export class HapticsManager {
  private hapticActuators: Map<string, GamepadHapticActuator> = new Map();
  setActuator(hand: 'left' | 'right', actuator: GamepadHapticActuator): void {
    this.hapticActuators.set(hand, actuator);
  }
  pulse(hand: 'left' | 'right', intensity: number, duration: number): void {
    const actuator = this.hapticActuators.get(hand);
    if (actuator?.pulse) {
      actuator.pulse(Math.max(0, Math.min(1, intensity)), duration);
    }
  }
  click(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.6, 10);
  }
  grab(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.8, 30);
  }
  release(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.4, 20);
  }
  teleport(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.5, 50);
  }
  error(hand: 'left' | 'right'): void {
    this.pulse(hand, 1.0, 20);
    setTimeout(() => this.pulse(hand, 1.0, 20), 50);
  }
  heartbeat(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.3, 40);
    setTimeout(() => this.pulse(hand, 0.5, 60), 100);
  }
}
