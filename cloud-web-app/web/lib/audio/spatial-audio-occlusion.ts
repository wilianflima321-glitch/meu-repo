import * as THREE from 'three';
import { SpatialAudioManagerCore } from './spatial-audio-manager-core';
import type { ActiveSound } from './spatial-audio-contracts';

export class SpatialAudioAdvancedSystem {
  private raycaster: THREE.Raycaster;
  
  // Lista de objetos estáticos do cenário que bloqueiam som (paredes, rochas, etc)
  private occlusionMeshes: THREE.Mesh[] = [];

  constructor(private audioManager: SpatialAudioManagerCore, private scene: THREE.Scene) {
    this.raycaster = new THREE.Raycaster();
  }

  public registerOcclusionMesh(mesh: THREE.Mesh): void {
    this.occlusionMeshes.push(mesh);
  }

  /**
   * Deve ser chamado no Main Loop da engine (idealmente a cada 100ms, não precisa ser 60fps).
   */
  public updateOcclusion(listenerPosition: THREE.Vector3): void {
    // Acessa protected member activeSounds do audio manager
    const activeSounds = (this.audioManager as any).activeSounds as Map<string, ActiveSound>;
    const context = (this.audioManager as any).context as AudioContext;

    if (!context) return;

    for (const [id, sound] of activeSounds) {
      if (!sound.settings.spatial || !sound.position) continue;

      // 1. Raycast da câmera até a fonte do som
      const direction = new THREE.Vector3().subVectors(sound.position, listenerPosition);
      const distance = direction.length();
      
      // Se estiver fora do maxDistance, ignora
      if (distance > sound.settings.maxDistance!) continue;
      
      direction.normalize();
      this.raycaster.set(listenerPosition, direction);
      this.raycaster.far = distance; // Só checa até a fonte do som

      const hits = this.raycaster.intersectObjects(this.occlusionMeshes, false);
      
      // 2. Calcula fator de Oclusão (0.0 a 1.0)
      // Se bateu em algo, o som está obstruído
      let occlusionFactor = 0.0;
      if (hits.length > 0) {
        // Exemplo: cada hit reduz a frequência. Um hit = abafado. Vários = quase mudo.
        occlusionFactor = Math.min(1.0, hits.length * 0.4);
      }

      // 3. Aplica BiquadFilterNode dinâmico (Low-Pass Filter)
      if (!sound.filterNode && occlusionFactor > 0) {
        // Cria o filtro sob demanda
        sound.filterNode = context.createBiquadFilter();
        sound.filterNode.type = 'lowpass';
        
        // Re-roteia: Source -> Biquad -> Panner
        sound.source.disconnect(sound.pannerNode!);
        sound.source.connect(sound.filterNode);
        sound.filterNode.connect(sound.pannerNode!);
      }

      if (sound.filterNode) {
        // Frequência base 22000Hz (aberto), Frequência obstruída 800Hz (atrás de parede)
        const targetFreq = 22000 - (occlusionFactor * 21200);
        // Interpola suavemente para não dar 'estalo' no som
        sound.filterNode.frequency.setTargetAtTime(targetFreq, context.currentTime, 0.1);
      }
    }
  }

  /**
   * Calcula Dinamicamente a Acústica da Sala
   */
  public updateRoomAcoustics(listenerPosition: THREE.Vector3): void {
    // Simplificação AAA: Lança 6 raios (frente, trás, cima, baixo, esq, dir) 
    // para medir a distância média das paredes. Se a distância média for alta = Hall. Baixa = Room.
    const directions = [
      new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0),
      new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1,0),
      new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1)
    ];

    let totalDistance = 0;
    let hitCount = 0;

    for (const dir of directions) {
      this.raycaster.set(listenerPosition, dir);
      this.raycaster.far = 100; // Raio máximo da sala
      const hits = this.raycaster.intersectObjects(this.occlusionMeshes, false);
      if (hits.length > 0) {
        totalDistance += hits[0].distance;
        hitCount++;
      } else {
        totalDistance += 100; // Ambiente aberto
      }
    }

    const averageDistance = totalDistance / 6;

    // TODO: Com base na averageDistance, trocar o Impulse Response (IR) do ConvolverNode
    // Ex: < 5m = Small Room
    // Ex: < 20m = Large Room
    // Ex: > 50m = Outdoors (No Reverb)
  }
}
