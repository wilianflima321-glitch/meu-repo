// @aethel-heavy-async-boundary Studio/Multiplayer runtime
import { EventEmitter } from 'events';
import * as THREE from 'three';
import { logger } from '@/lib/observability/logger';

export interface PhysicsSnapshot {
  tick: number;
  bodies: Map<string, {
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    linearVelocity: THREE.Vector3;
    angularVelocity: THREE.Vector3;
  }>;
}

export interface PlayerInput {
  tick: number;
  playerId: string;
  buttons: number; // bitmask
  axes: [number, number]; // joystick x, y
}

export class RollbackNetcodeManager extends EventEmitter {
  private readonly MAX_ROLLBACK_FRAMES = 60; // 1 segundo a 60hz
  private currentTick = 0;
  private serverTick = 0;
  
  // Ring Buffer de estados físicos do passado
  private stateBuffer: PhysicsSnapshot[] = new Array(this.MAX_ROLLBACK_FRAMES);
  
  // Inputs recebidos da rede que estavam no futuro (ou passado)
  private inputBuffer: Map<number, PlayerInput[]> = new Map();

  constructor(private physicsEngineAdapter: any) {
    super();
  }

  /**
   * Chamado 60 vezes por segundo pelo Main Loop.
   */
  public tick(localInputs: PlayerInput): void {
    // 1. Salvar o estado ANTES da simulação
    this.saveStateSnapshot(this.currentTick);

    // 2. Registrar input local
    this.registerInput(this.currentTick, localInputs);

    // 3. Simular 1 frame na engine física real
    this.physicsEngineAdapter.step(1 / 60);

    this.currentTick++;

    // 4. Purge stale inputs to prevent unbounded memory growth.
    //    Any tick older than (currentTick - MAX_ROLLBACK_FRAMES) will never
    //    be needed for a valid rollback window — safe to discard.
    this.pruneInputBuffer();
  }

  /**
   * Removes all inputBuffer entries that are outside the rollback window.
   * Called every tick to keep memory O(MAX_ROLLBACK_FRAMES) instead of O(∞).
   */
  private pruneInputBuffer(): void {
    const horizon = this.currentTick - this.MAX_ROLLBACK_FRAMES;
    for (const tick of this.inputBuffer.keys()) {
      if (tick < horizon) {
        this.inputBuffer.delete(tick);
      }
    }
  }

  /**
   * Chamado quando recebemos um pacote UDP/WebSocket do Servidor
   * dizendo "no frame 100, o Player 2 atirou".
   */
  public receiveServerState(serverTick: number, inputs: PlayerInput[]): void {
    if (serverTick <= this.serverTick) return; // Pacote velho descartado
    
    // Se recebemos um pacote do passado (Ex: estamos no frame 105, pacote é do 100)
    if (serverTick < this.currentTick) {
      this.rollbackAndResimulate(serverTick, inputs);
    } else {
      // Pacote do futuro, apenas guardamos no buffer
      for (const input of inputs) {
        this.registerInput(serverTick, input);
      }
    }
    
    this.serverTick = serverTick;
  }

  /**
   * Hard Sync: forces the client to teleport to the authoritative server snapshot.
   * Called when the packet is too old for a normal rollback (> MAX_ROLLBACK_FRAMES).
   *
   * Steps:
   *  1. Restore physics to the server-authoritative body state.
   *  2. Align currentTick with the server tick so future ticks re-sync normally.
   *  3. Clear the stale state buffer so no corrupted future rollbacks happen.
   *  4. Emit 'hard-sync' for the viewport to do a snap-correction (no lerp).
   */
  private hardSync(serverTick: number, newInputs: PlayerInput[]): void {
    logger.warn(`[Rollback] Hard Sync — client was ${this.currentTick - serverTick} frames behind. Snapping to tick ${serverTick}.`);

    // Apply the authoritative inputs so they seed the new present
    for (const input of newInputs) {
      this.registerInput(serverTick, input);
    }

    // Restore physics bodies to server's authoritative positions
    const snapshot = this.getSnapshotAt(serverTick);
    if (snapshot) {
      this.physicsEngineAdapter.restoreState(snapshot.bodies);
    } else {
      // If we have no snapshot (e.g. buffer was too old), trust the physics adapter
      // to have received the body positions from the server message directly.
      logger.warn('[Rollback] Hard Sync: no local snapshot available, physics bodies not restored — server should push full state.');
    }

    // Align tick counters — next tick() will continue from serverTick+1
    this.currentTick = serverTick;
    this.serverTick  = serverTick;

    // Reset state buffer so no ghost rollbacks happen from corrupted future offsets
    this.stateBuffer = new Array(this.MAX_ROLLBACK_FRAMES);

    // Prune stale inputs immediately
    this.pruneInputBuffer();

    this.emit('hard-sync', { serverTick });
  }

  private rollbackAndResimulate(targetTick: number, newInputs: PlayerInput[]): void {
    const framesToRollback = this.currentTick - targetTick;
    
    if (framesToRollback >= this.MAX_ROLLBACK_FRAMES) {
      this.hardSync(targetTick, newInputs);
      return;
    }

    // 1. Recuperar Snapshot do passado
    const snapshot = this.getSnapshotAt(targetTick);
    if (!snapshot) return;

    // 2. REWIND: Restaurar a física para como era no frame `targetTick`
    this.physicsEngineAdapter.restoreState(snapshot.bodies);

    // 3. Adicionar o input do servidor que causou o rollback
    for (const input of newInputs) {
      this.registerInput(targetTick, input);
    }

    // 4. FAST-FORWARD: Resimular do targetTick até o currentTick atual (escondido do player)
    for (let simTick = targetTick; simTick < this.currentTick; simTick++) {
      // Re-aplica os inputs guardados para este frame
      const inputsForTick = this.inputBuffer.get(simTick) || [];
      this.physicsEngineAdapter.applyInputs(inputsForTick);
      
      this.physicsEngineAdapter.step(1 / 60);
      
      // Atualiza o histórico para refletir o novo passado reescrito
      this.saveStateSnapshot(simTick + 1);
    }
    
    // A ilusão de Ping Zero está mantida. O jogo está no presente novamente.
  }

  private saveStateSnapshot(tick: number): void {
    const bodies = this.physicsEngineAdapter.captureState();
    const index = tick % this.MAX_ROLLBACK_FRAMES;
    this.stateBuffer[index] = { tick, bodies };
  }

  private getSnapshotAt(tick: number): PhysicsSnapshot | null {
    const index = tick % this.MAX_ROLLBACK_FRAMES;
    const snap = this.stateBuffer[index];
    if (snap && snap.tick === tick) return snap;
    return null;
  }

  private registerInput(tick: number, input: PlayerInput): void {
    let arr = this.inputBuffer.get(tick);
    if (!arr) {
      arr = [];
      this.inputBuffer.set(tick, arr);
    }
    arr.push(input);
  }
}
