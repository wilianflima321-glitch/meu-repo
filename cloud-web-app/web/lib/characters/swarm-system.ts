/**
 * swarm-system.ts
 *
 * Flocking and swarm behavior simulation for creature groups.
 * Implements the classic Reynolds rules (separation, alignment, cohesion)
 * with Aethel extensions: formation locking, target pursuit, and fear scatter.
 *
 * Designed for: insect swarms, fish schools, bird flocks, undead hordes.
 */

export interface SwarmAgent {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  health: number;
  active: boolean;
}

export interface SwarmConfig {
  maxAgents: number;
  separationRadius: number;
  alignmentRadius: number;
  cohesionRadius: number;
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
  maxSpeed: number;
  maxForce: number;
  /** Optional target for pursuit mode */
  targetPosition?: [number, number, number];
  pursuitWeight: number;
  /** Scatter: if true agents flee target instead of pursuing */
  fearMode: boolean;
}

type V3 = [number, number, number];

function v3add(a: V3, b: V3): V3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function v3sub(a: V3, b: V3): V3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function v3scale(a: V3, s: number): V3 { return [a[0] * s, a[1] * s, a[2] * s]; }
function v3len(a: V3): number { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
function v3norm(a: V3): V3 {
  const l = v3len(a);
  return l < 1e-6 ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l];
}
function v3dist(a: V3, b: V3): number { return v3len(v3sub(a, b)); }
function v3limit(v: V3, maxLen: number): V3 {
  const l = v3len(v);
  return l > maxLen ? v3scale(v3norm(v), maxLen) : v;
}

export class SwarmSystem {
  private agents: SwarmAgent[] = [];
  private config: SwarmConfig;

  constructor(config: SwarmConfig) {
    this.config = config;
  }

  spawn(id: string, position: V3): void {
    if (this.agents.filter(a => a.active).length >= this.config.maxAgents) return;
    this.agents.push({
      id,
      position: [...position] as V3,
      velocity: [
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2,
      ],
      health: 100,
      active: true,
    });
  }

  kill(id: string): void {
    const agent = this.agents.find(a => a.id === id);
    if (agent) agent.active = false;
  }

  setTarget(position: V3 | undefined): void {
    this.config.targetPosition = position;
  }

  setFearMode(fear: boolean): void {
    this.config.fearMode = fear;
  }

  tick(dt: number): SwarmAgent[] {
    const active = this.agents.filter(a => a.active);

    for (const agent of active) {
      const sep = this.separation(agent, active);
      const aln = this.alignment(agent, active);
      const coh = this.cohesion(agent, active);

      let steering: V3 = [
        sep[0] * this.config.separationWeight +
        aln[0] * this.config.alignmentWeight +
        coh[0] * this.config.cohesionWeight,
        sep[1] * this.config.separationWeight +
        aln[1] * this.config.alignmentWeight +
        coh[1] * this.config.cohesionWeight,
        sep[2] * this.config.separationWeight +
        aln[2] * this.config.alignmentWeight +
        coh[2] * this.config.cohesionWeight,
      ];

      // Target pursuit / fear scatter
      if (this.config.targetPosition) {
        const toTarget = v3sub(this.config.targetPosition, agent.position);
        const dir = this.config.fearMode ? v3scale(v3norm(toTarget), -1) : v3norm(toTarget);
        const pursuit = v3scale(dir, this.config.pursuitWeight);
        steering = v3add(steering, pursuit);
      }

      steering = v3limit(steering, this.config.maxForce);

      // Integrate velocity
      agent.velocity = v3limit(
        v3add(agent.velocity, v3scale(steering, dt)),
        this.config.maxSpeed
      );

      // Update position
      agent.position = v3add(agent.position, v3scale(agent.velocity, dt));
    }

    return active;
  }

  getAgents(): SwarmAgent[] {
    return this.agents.filter(a => a.active);
  }

  private separation(agent: SwarmAgent, all: SwarmAgent[]): V3 {
    let steer: V3 = [0, 0, 0];
    let count = 0;

    for (const other of all) {
      if (other.id === agent.id) continue;
      const d = v3dist(agent.position, other.position);
      if (d < this.config.separationRadius && d > 0) {
        const diff = v3scale(v3norm(v3sub(agent.position, other.position)), 1 / d);
        steer = v3add(steer, diff);
        count++;
      }
    }

    return count > 0 ? v3scale(steer, 1 / count) : steer;
  }

  private alignment(agent: SwarmAgent, all: SwarmAgent[]): V3 {
    let sum: V3 = [0, 0, 0];
    let count = 0;

    for (const other of all) {
      if (other.id === agent.id) continue;
      if (v3dist(agent.position, other.position) < this.config.alignmentRadius) {
        sum = v3add(sum, other.velocity);
        count++;
      }
    }

    if (count === 0) return [0, 0, 0];
    const avg = v3scale(sum, 1 / count);
    const desired = v3scale(v3norm(avg), this.config.maxSpeed);
    return v3limit(v3sub(desired, agent.velocity), this.config.maxForce);
  }

  private cohesion(agent: SwarmAgent, all: SwarmAgent[]): V3 {
    let center: V3 = [0, 0, 0];
    let count = 0;

    for (const other of all) {
      if (other.id === agent.id) continue;
      if (v3dist(agent.position, other.position) < this.config.cohesionRadius) {
        center = v3add(center, other.position);
        count++;
      }
    }

    if (count === 0) return [0, 0, 0];
    const target = v3scale(center, 1 / count);
    const desired = v3scale(v3norm(v3sub(target, agent.position)), this.config.maxSpeed);
    return v3limit(v3sub(desired, agent.velocity), this.config.maxForce);
  }
}

export function createInsectSwarm(maxAgents = 50): SwarmSystem {
  return new SwarmSystem({
    maxAgents,
    separationRadius: 0.5, alignmentRadius: 3, cohesionRadius: 5,
    separationWeight: 1.5, alignmentWeight: 1.0, cohesionWeight: 0.8,
    maxSpeed: 8, maxForce: 2,
    pursuitWeight: 1.2, fearMode: false,
  });
}

export function createFishSchool(maxAgents = 200): SwarmSystem {
  return new SwarmSystem({
    maxAgents,
    separationRadius: 0.4, alignmentRadius: 4, cohesionRadius: 6,
    separationWeight: 2.0, alignmentWeight: 1.5, cohesionWeight: 1.0,
    maxSpeed: 5, maxForce: 1.5,
    pursuitWeight: 0.5, fearMode: false,
  });
}

export function createUndeadHorde(maxAgents = 100): SwarmSystem {
  return new SwarmSystem({
    maxAgents,
    separationRadius: 0.8, alignmentRadius: 8, cohesionRadius: 15,
    separationWeight: 1.0, alignmentWeight: 0.5, cohesionWeight: 0.3,
    maxSpeed: 2, maxForce: 0.8,
    pursuitWeight: 2.0, fearMode: false,
  });
}
