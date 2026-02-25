/** FLIP fluid runtime. */
import * as THREE from 'three';
import type { FluidBoundary, FluidConfig, FluidParticle, GridCell } from './fluid-simulation-system.types';

export class FLIPFluidSimulation {
  private config: FluidConfig;
  private particles: FluidParticle[] = [];
  private boundaries: FluidBoundary[] = [];
  
  private gridResolution: THREE.Vector3;
  private gridOrigin: THREE.Vector3;
  private cellSize: number;
  private grid: Map<string, GridCell>;
  
  private flipRatio: number = 0.95;
  
  constructor(config: Partial<FluidConfig> = {}, gridResolution: THREE.Vector3 = new THREE.Vector3(64, 64, 64)) {
    this.config = {
      particleCount: 10000,
      particleRadius: 0.01,
      smoothingRadius: 0.04,
      restDensity: 1000,
      viscosity: 0.001,
      surfaceTension: 0,
      stiffness: 1,
      gravity: new THREE.Vector3(0, -9.81, 0),
      timeStep: 0.005,
      iterations: 50, // Pressure solver iterations
      boundaryDamping: 0.5,
      ...config,
    };
    
    this.gridResolution = gridResolution;
    this.gridOrigin = new THREE.Vector3(-1, -1, -1);
    this.cellSize = 2 / gridResolution.x;
    this.grid = new Map();
  }
  
  initializeBox(min: THREE.Vector3, max: THREE.Vector3): void {
    const spacing = this.config.particleRadius * 1.5;
    
    for (let x = min.x; x < max.x; x += spacing) {
      for (let y = min.y; y < max.y; y += spacing) {
        for (let z = min.z; z < max.z; z += spacing) {
          if (this.particles.length >= this.config.particleCount) break;
          
          const jitter = spacing * 0.1;
          
          const particle: FluidParticle = {
            id: this.particles.length,
            position: new THREE.Vector3(
              x + (Math.random() - 0.5) * jitter,
              y + (Math.random() - 0.5) * jitter,
              z + (Math.random() - 0.5) * jitter
            ),
            velocity: new THREE.Vector3(),
            acceleration: new THREE.Vector3(),
            density: this.config.restDensity,
            pressure: 0,
            mass: 0.01,
            color: new THREE.Color(0.2, 0.5, 1),
            neighbors: [],
            affineMatrix: new THREE.Matrix3(),
          };
          
          this.particles.push(particle);
        }
      }
    }
  }
  
  addBoundary(boundary: FluidBoundary): void {
    this.boundaries.push(boundary);
  }
  
  simulate(deltaTime: number): void {
    const dt = this.config.timeStep;
    
    this.particleToGrid();
    
    this.applyExternalForces(dt);
    
    this.solvePressure();
    
    this.gridToParticle();
    
    this.advectParticles(dt);
    
    this.handleBoundaries();
  }
  
  private particleToGrid(): void {
    this.grid.clear();
    
    for (const particle of this.particles) {
      const cellI = this.worldToGrid(particle.position);
      
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          for (let dk = -1; dk <= 1; dk++) {
            const i = cellI.x + di;
            const j = cellI.y + dj;
            const k = cellI.z + dk;
            
            if (!this.isValidCell(i, j, k)) continue;
            
            const cellPos = this.gridToWorld(new THREE.Vector3(i, j, k));
            const weight = this.trilinearWeight(particle.position, cellPos);
            
            if (weight < 0.0001) continue;
            
            const key = this.cellKey(i, j, k);
            let cell = this.grid.get(key);
            
            if (!cell) {
              cell = {
                particles: [],
                velocity: new THREE.Vector3(),
                pressure: 0,
                marker: 'air',
              };
              this.grid.set(key, cell);
            }
            
            cell.particles.push(particle.id);
            
            cell.velocity.add(particle.velocity.clone().multiplyScalar(weight));
            cell.marker = 'fluid';
          }
        }
      }
    }
    
    for (const [, cell] of this.grid) {
      if (cell.particles.length > 0) {
        cell.velocity.divideScalar(cell.particles.length);
      }
    }
  }
  
  private applyExternalForces(dt: number): void {
    for (const [, cell] of this.grid) {
      if (cell.marker === 'fluid') {
        cell.velocity.add(this.config.gravity.clone().multiplyScalar(dt));
      }
    }
  }
  
  private solvePressure(): void {
    const invDx2 = 1 / (this.cellSize * this.cellSize);
    
    for (let iter = 0; iter < this.config.iterations; iter++) {
      for (const [key, cell] of this.grid) {
        if (cell.marker !== 'fluid') continue;
        
        const [i, j, k] = key.split(',').map(Number);
        
        const velRight = this.getGridVelocity(i + 1, j, k).x;
        const velLeft = this.getGridVelocity(i - 1, j, k).x;
        const velTop = this.getGridVelocity(i, j + 1, k).y;
        const velBottom = this.getGridVelocity(i, j - 1, k).y;
        const velFront = this.getGridVelocity(i, j, k + 1).z;
        const velBack = this.getGridVelocity(i, j, k - 1).z;
        
        const divergence = (velRight - velLeft + velTop - velBottom + velFront - velBack) / (2 * this.cellSize);
        
        const neighbors = this.countFluidNeighbors(i, j, k);
        if (neighbors > 0) {
          cell.pressure = -divergence * this.config.restDensity * this.cellSize / neighbors;
        }
      }
      
      for (const [key, cell] of this.grid) {
        if (cell.marker !== 'fluid') continue;
        
        const [i, j, k] = key.split(',').map(Number);
        
        const pRight = this.getGridPressure(i + 1, j, k);
        const pLeft = this.getGridPressure(i - 1, j, k);
        const pTop = this.getGridPressure(i, j + 1, k);
        const pBottom = this.getGridPressure(i, j - 1, k);
        const pFront = this.getGridPressure(i, j, k + 1);
        const pBack = this.getGridPressure(i, j, k - 1);
        
        const gradP = new THREE.Vector3(
          (pRight - pLeft) / (2 * this.cellSize),
          (pTop - pBottom) / (2 * this.cellSize),
          (pFront - pBack) / (2 * this.cellSize)
        );
        
        cell.velocity.sub(gradP.multiplyScalar(this.config.timeStep / this.config.restDensity));
      }
    }
  }
  
  private gridToParticle(): void {
    for (const particle of this.particles) {
      const cellI = this.worldToGrid(particle.position);
      
      const picVelocity = new THREE.Vector3();
      const flipVelocity = particle.velocity.clone();
      
      let totalWeight = 0;
      
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          for (let dk = -1; dk <= 1; dk++) {
            const i = cellI.x + di;
            const j = cellI.y + dj;
            const k = cellI.z + dk;
            
            const key = this.cellKey(i, j, k);
            const cell = this.grid.get(key);
            
            if (!cell || cell.marker !== 'fluid') continue;
            
            const cellPos = this.gridToWorld(new THREE.Vector3(i, j, k));
            const weight = this.trilinearWeight(particle.position, cellPos);
            
            picVelocity.add(cell.velocity.clone().multiplyScalar(weight));
            totalWeight += weight;
          }
        }
      }
      
      if (totalWeight > 0) {
        picVelocity.divideScalar(totalWeight);
        
        particle.velocity.lerp(picVelocity, 1 - this.flipRatio);
      }
    }
  }
  
  private advectParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.position.add(particle.velocity.clone().multiplyScalar(dt));
    }
  }
  
  private handleBoundaries(): void {
    for (const particle of this.particles) {
      for (const boundary of this.boundaries) {
        if (boundary.type === 'box' && boundary.size) {
          const min = boundary.position.clone().sub(boundary.size.clone().multiplyScalar(0.5));
          const max = boundary.position.clone().add(boundary.size.clone().multiplyScalar(0.5));
          
          if (particle.position.x < min.x) {
            particle.position.x = min.x;
            particle.velocity.x *= -this.config.boundaryDamping;
          } else if (particle.position.x > max.x) {
            particle.position.x = max.x;
            particle.velocity.x *= -this.config.boundaryDamping;
          }
          
          if (particle.position.y < min.y) {
            particle.position.y = min.y;
            particle.velocity.y *= -this.config.boundaryDamping;
          } else if (particle.position.y > max.y) {
            particle.position.y = max.y;
            particle.velocity.y *= -this.config.boundaryDamping;
          }
          
          if (particle.position.z < min.z) {
            particle.position.z = min.z;
            particle.velocity.z *= -this.config.boundaryDamping;
          } else if (particle.position.z > max.z) {
            particle.position.z = max.z;
            particle.velocity.z *= -this.config.boundaryDamping;
          }
        }
      }
    }
  }
  
  private worldToGrid(pos: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      Math.floor((pos.x - this.gridOrigin.x) / this.cellSize),
      Math.floor((pos.y - this.gridOrigin.y) / this.cellSize),
      Math.floor((pos.z - this.gridOrigin.z) / this.cellSize)
    );
  }
  
  private gridToWorld(cell: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      this.gridOrigin.x + (cell.x + 0.5) * this.cellSize,
      this.gridOrigin.y + (cell.y + 0.5) * this.cellSize,
      this.gridOrigin.z + (cell.z + 0.5) * this.cellSize
    );
  }
  
  private isValidCell(i: number, j: number, k: number): boolean {
    return i >= 0 && i < this.gridResolution.x &&
           j >= 0 && j < this.gridResolution.y &&
           k >= 0 && k < this.gridResolution.z;
  }
  
  private cellKey(i: number, j: number, k: number): string {
    return `${i},${j},${k}`;
  }
  
  private trilinearWeight(pos: THREE.Vector3, cellPos: THREE.Vector3): number {
    const dx = Math.abs(pos.x - cellPos.x) / this.cellSize;
    const dy = Math.abs(pos.y - cellPos.y) / this.cellSize;
    const dz = Math.abs(pos.z - cellPos.z) / this.cellSize;
    
    if (dx > 1 || dy > 1 || dz > 1) return 0;
    
    return (1 - dx) * (1 - dy) * (1 - dz);
  }
  
  private getGridVelocity(i: number, j: number, k: number): THREE.Vector3 {
    const cell = this.grid.get(this.cellKey(i, j, k));
    return cell ? cell.velocity.clone() : new THREE.Vector3();
  }
  
  private getGridPressure(i: number, j: number, k: number): number {
    const cell = this.grid.get(this.cellKey(i, j, k));
    return cell ? cell.pressure : 0;
  }
  
  private countFluidNeighbors(i: number, j: number, k: number): number {
    let count = 0;
    const neighbors = [
      [i + 1, j, k], [i - 1, j, k],
      [i, j + 1, k], [i, j - 1, k],
      [i, j, k + 1], [i, j, k - 1],
    ];
    
    for (const [ni, nj, nk] of neighbors) {
      const cell = this.grid.get(this.cellKey(ni, nj, nk));
      if (cell && cell.marker === 'fluid') count++;
    }
    
    return count;
  }
  
  getParticles(): FluidParticle[] {
    return this.particles;
  }
  
  setFLIPRatio(ratio: number): void {
    this.flipRatio = Math.max(0, Math.min(1, ratio));
  }
}

export { FluidSurfaceReconstructor } from './fluid-surface-reconstructor';

