/**
 * DIALOGUE & CUTSCENE SYSTEM - Aethel Engine
 * 
 * Sistema profissional de diálogos e cutscenes para jogos AAA.
 * 
 * FEATURES:
 * - Dialogue tree system
 * - Branching narratives
 * - Condition-based choices
 * - Character portraits
 * - Voice line integration
 * - Lip sync triggering
 * - Camera control for cutscenes
 * - Timeline-based sequencing
 * - Cinematic bars
 * - Subtitle system
 * - Localization support
 * - Save/load dialogue state
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

import type {
  CameraKeyframe,
  Cutscene,
  CutsceneTrack,
  DialogueAction,
  DialogueCharacter,
  DialogueChoice,
  DialogueCondition,
  DialogueNode,
  DialogueState,
  DialogueTree,
  SubtitleEntry,
} from './dialogue-cutscene-types';

export type {
  CameraKeyframe,
  Cutscene,
  CutsceneTrack,
  DialogueAction,
  DialogueCharacter,
  DialogueChoice,
  DialogueCondition,
  DialogueNode,
  DialogueState,
  DialogueTree,
  SubtitleEntry,
} from './dialogue-cutscene-types';

// ============================================================================
// DIALOGUE SYSTEM
// ============================================================================

export class DialogueSystem {
  private trees: Map<string, DialogueTree> = new Map();
  private state: DialogueState;
  private currentLanguage: string = 'en';
  
  // Callbacks
  private onDialogueStart?: (tree: DialogueTree, node: DialogueNode) => void;
  private onDialogueEnd?: (tree: DialogueTree) => void;
  private onNodeChange?: (node: DialogueNode) => void;
  private onChoicesAvailable?: (choices: DialogueChoice[]) => void;
  private onAction?: (action: DialogueAction) => void;
  
  // External systems
  private variableProvider?: (key: string) => any;
  private conditionEvaluator?: (condition: DialogueCondition) => boolean;
  private actionHandler?: (action: DialogueAction) => void;
  
  constructor() {
    this.state = {
      currentTreeId: null,
      currentNodeId: null,
      history: [],
      variables: new Map(),
      flags: new Set(),
      relationships: new Map(),
    };
  }
  
  // Load dialogue tree
  loadTree(tree: DialogueTree): void {
    this.trees.set(tree.id, tree);
  }
  
  // Load from JSON
  loadFromJSON(json: any): DialogueTree {
    const tree: DialogueTree = {
      id: json.id,
      name: json.name,
      startNode: json.startNode,
      nodes: new Map(),
      characters: new Map(),
      variables: new Map(Object.entries(json.variables || {})),
    };
    
    // Parse nodes
    for (const nodeData of json.nodes) {
      tree.nodes.set(nodeData.id, nodeData);
    }
    
    // Parse characters
    for (const charData of json.characters || []) {
      tree.characters.set(charData.id, {
        ...charData,
        portraits: new Map(Object.entries(charData.portraits || {})),
      });
    }
    
    this.loadTree(tree);
    return tree;
  }
  
  // Start dialogue
  startDialogue(treeId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;
    
    this.state.currentTreeId = treeId;
    this.state.currentNodeId = tree.startNode;
    this.state.history = [];
    
    const startNode = tree.nodes.get(tree.startNode);
    if (startNode) {
      this.onDialogueStart?.(tree, startNode);
      this.processNode(startNode);
    }
    
    return true;
  }
  
  // Process current node
  private processNode(node: DialogueNode): void {
    this.state.history.push(node.id);
    this.onNodeChange?.(node);
    
    switch (node.type) {
      case 'dialogue':
        // Display dialogue and wait for advance
        break;
        
      case 'choice':
        // Filter choices by conditions
        const availableChoices = (node.choices || []).filter(
          choice => this.evaluateConditions(choice.conditions)
        );
        this.onChoicesAvailable?.(availableChoices);
        break;
        
      case 'action':
        // Execute actions and advance
        this.executeActions(node.actions || []);
        if (node.nextNode) {
          this.advanceToNode(node.nextNode);
        }
        break;
        
      case 'condition':
        // Evaluate branches
        for (const branch of node.branches || []) {
          if (this.evaluateCondition(branch.condition)) {
            this.advanceToNode(branch.nodeId);
            return;
          }
        }
        // Default branch
        if (node.nextNode) {
          this.advanceToNode(node.nextNode);
        }
        break;
        
      case 'random':
        // Select random branch
        const totalWeight = (node.randomBranches || []).reduce((sum, b) => sum + b.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const branch of node.randomBranches || []) {
          random -= branch.weight;
          if (random <= 0) {
            this.advanceToNode(branch.nodeId);
            return;
          }
        }
        break;
    }
  }
  
  // Advance to next node
  advance(): void {
    const tree = this.getCurrentTree();
    const node = this.getCurrentNode();
    
    if (!tree || !node) return;
    
    if (node.nextNode) {
      this.advanceToNode(node.nextNode);
    } else {
      this.endDialogue();
    }
  }
  
  // Select choice
  selectChoice(choiceId: string): void {
    const node = this.getCurrentNode();
    if (!node || node.type !== 'choice') return;
    
    const choice = node.choices?.find(c => c.id === choiceId);
    if (!choice) return;
    
    // Execute consequences
    this.executeActions(choice.consequences || []);
    
    // Advance to next node
    this.advanceToNode(choice.nextNode);
  }
  
  private advanceToNode(nodeId: string): void {
    const tree = this.getCurrentTree();
    if (!tree) return;
    
    const node = tree.nodes.get(nodeId);
    if (node) {
      this.state.currentNodeId = nodeId;
      this.processNode(node);
    } else {
      this.endDialogue();
    }
  }
  
  // End dialogue
  endDialogue(): void {
    const tree = this.getCurrentTree();
    
    this.state.currentTreeId = null;
    this.state.currentNodeId = null;
    
    if (tree) {
      this.onDialogueEnd?.(tree);
    }
  }
  
  // Evaluate conditions
  private evaluateConditions(conditions?: DialogueCondition[]): boolean {
    if (!conditions || conditions.length === 0) return true;
    return conditions.every(c => this.evaluateCondition(c));
  }
  
  private evaluateCondition(condition: DialogueCondition): boolean {
    // Use custom evaluator if provided
    if (this.conditionEvaluator) {
      return this.conditionEvaluator(condition);
    }
    
    let value: any;
    
    switch (condition.type) {
      case 'variable':
        value = this.state.variables.get(condition.key) ?? 
                this.variableProvider?.(condition.key);
        break;
      case 'flag':
        value = this.state.flags.has(condition.key);
        break;
      case 'relationship':
        value = this.state.relationships.get(condition.key) ?? 0;
        break;
      default:
        value = this.variableProvider?.(condition.key);
    }
    
    switch (condition.operator) {
      case '==': return value === condition.value;
      case '!=': return value !== condition.value;
      case '>': return value > condition.value;
      case '<': return value < condition.value;
      case '>=': return value >= condition.value;
      case '<=': return value <= condition.value;
      case 'has': return value === true || value !== undefined;
      case 'not_has': return value === false || value === undefined;
      default: return false;
    }
  }
  
  // Execute actions
  private executeActions(actions: DialogueAction[]): void {
    for (const action of actions) {
      this.onAction?.(action);
      
      // Use custom handler if provided
      if (this.actionHandler) {
        this.actionHandler(action);
        continue;
      }
      
      // Default handling
      switch (action.type) {
        case 'set_variable':
          this.state.variables.set(action.key!, action.value);
          break;
        case 'set_flag':
          if (action.value) {
            this.state.flags.add(action.key!);
          } else {
            this.state.flags.delete(action.key!);
          }
          break;
        case 'change_relationship':
          const current = this.state.relationships.get(action.target!) ?? 0;
          this.state.relationships.set(action.target!, current + (action.amount ?? 0));
          break;
      }
    }
  }
  
  // Getters
  getCurrentTree(): DialogueTree | undefined {
    return this.state.currentTreeId ? this.trees.get(this.state.currentTreeId) : undefined;
  }
  
  getCurrentNode(): DialogueNode | undefined {
    const tree = this.getCurrentTree();
    return tree && this.state.currentNodeId ? tree.nodes.get(this.state.currentNodeId) : undefined;
  }
  
  getCurrentCharacter(): DialogueCharacter | undefined {
    const tree = this.getCurrentTree();
    const node = this.getCurrentNode();
    return tree && node?.speaker ? tree.characters.get(node.speaker) : undefined;
  }
  
  getText(node?: DialogueNode): string {
    const n = node || this.getCurrentNode();
    if (!n?.text) return '';
    
    if (n.localizedText && n.localizedText[this.currentLanguage]) {
      return n.localizedText[this.currentLanguage];
    }
    
    return n.text;
  }
  
  getChoiceText(choice: DialogueChoice): string {
    if (choice.localizedText && choice.localizedText[this.currentLanguage]) {
      return choice.localizedText[this.currentLanguage];
    }
    return choice.text;
  }
  
  isActive(): boolean {
    return this.state.currentTreeId !== null;
  }
  
  // State management
  getState(): DialogueState {
    return {
      ...this.state,
      variables: new Map(this.state.variables),
      flags: new Set(this.state.flags),
      relationships: new Map(this.state.relationships),
    };
  }
  
  setState(state: Partial<DialogueState>): void {
    if (state.variables) this.state.variables = new Map(state.variables);
    if (state.flags) this.state.flags = new Set(state.flags);
    if (state.relationships) this.state.relationships = new Map(state.relationships);
  }
  
  // Configuration
  setLanguage(language: string): void {
    this.currentLanguage = language;
  }
  
  setVariableProvider(provider: (key: string) => any): void {
    this.variableProvider = provider;
  }
  
  setConditionEvaluator(evaluator: (condition: DialogueCondition) => boolean): void {
    this.conditionEvaluator = evaluator;
  }
  
  setActionHandler(handler: (action: DialogueAction) => void): void {
    this.actionHandler = handler;
  }
  
  // Callbacks
  setOnDialogueStart(callback: (tree: DialogueTree, node: DialogueNode) => void): void {
    this.onDialogueStart = callback;
  }
  
  setOnDialogueEnd(callback: (tree: DialogueTree) => void): void {
    this.onDialogueEnd = callback;
  }
  
  setOnNodeChange(callback: (node: DialogueNode) => void): void {
    this.onNodeChange = callback;
  }
  
  setOnChoicesAvailable(callback: (choices: DialogueChoice[]) => void): void {
    this.onChoicesAvailable = callback;
  }
  
  setOnAction(callback: (action: DialogueAction) => void): void {
    this.onAction = callback;
  }
}

// ============================================================================
// CUTSCENE SYSTEM
// ============================================================================

export class CutsceneSystem {
  private cutscenes: Map<string, Cutscene> = new Map();
  private currentCutscene: Cutscene | null = null;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  
  private camera: THREE.PerspectiveCamera | null = null;
  private scene: THREE.Scene | null = null;
  
  // Track states
  private activeSubtitles: SubtitleEntry[] = [];
  private activeTracks: Map<CutsceneTrack, any> = new Map();
  
  // Callbacks
  private onCutsceneStart?: (cutscene: Cutscene) => void;
  private onCutsceneEnd?: (cutscene: Cutscene) => void;
  private onSubtitleChange?: (subtitles: SubtitleEntry[]) => void;
  private onEvent?: (eventName: string, data: any) => void;
  
  // Cinema bars
  private cinematicBarsEnabled: boolean = false;
  private cinematicBarsProgress: number = 0;
  
  constructor() {}
  
  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }
  
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }
  
  // Load cutscene
  loadCutscene(cutscene: Cutscene): void {
    this.cutscenes.set(cutscene.id, cutscene);
  }
  
  // Load from JSON
  loadFromJSON(json: any): Cutscene {
    const cutscene: Cutscene = {
      id: json.id,
      name: json.name,
      duration: json.duration,
      tracks: json.tracks.map((track: any) => ({
        ...track,
        data: this.parseTrackData(track.type, track.data),
      })),
      skippable: json.skippable ?? true,
    };
    
    this.loadCutscene(cutscene);
    return cutscene;
  }
  
  private parseTrackData(type: string, data: any): any {
    if (type === 'camera') {
      return data.keyframes.map((kf: any) => ({
        ...kf,
        position: new THREE.Vector3(kf.position.x, kf.position.y, kf.position.z),
        lookAt: new THREE.Vector3(kf.lookAt.x, kf.lookAt.y, kf.lookAt.z),
      }));
    }
    return data;
  }
  
  // Play cutscene
  play(cutsceneId: string): boolean {
    const cutscene = this.cutscenes.get(cutsceneId);
    if (!cutscene) return false;
    
    this.currentCutscene = cutscene;
    this.currentTime = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.activeTracks.clear();
    
    // Enable cinematic bars
    this.enableCinematicBars();
    
    this.onCutsceneStart?.(cutscene);
    
    return true;
  }
  
  // Update
  update(deltaTime: number): void {
    if (!this.isPlaying || this.isPaused || !this.currentCutscene) return;
    
    this.currentTime += deltaTime;
    
    // Update cinematic bars
    if (this.cinematicBarsEnabled && this.cinematicBarsProgress < 1) {
      this.cinematicBarsProgress = Math.min(1, this.cinematicBarsProgress + deltaTime * 2);
    }
    
    // Process tracks
    for (const track of this.currentCutscene.tracks) {
      const trackStarted = this.currentTime >= track.startTime;
      const trackEnded = this.currentTime >= track.startTime + track.duration;
      
      if (trackStarted && !trackEnded) {
        this.processTrack(track, this.currentTime - track.startTime, track.duration);
      } else if (trackEnded && this.activeTracks.has(track)) {
        this.endTrack(track);
      }
    }
    
    // Check if cutscene ended
    if (this.currentTime >= this.currentCutscene.duration) {
      this.stop();
    }
  }
  
  private processTrack(track: CutsceneTrack, localTime: number, duration: number): void {
    const t = localTime / duration;
    
    switch (track.type) {
      case 'camera':
        this.processCameraTrack(track.data as CameraKeyframe[], localTime);
        break;
        
      case 'animation':
        // Trigger animation on target
        if (!this.activeTracks.has(track)) {
          this.activeTracks.set(track, true);
          this.onEvent?.('play_animation', track.data);
        }
        break;
        
      case 'audio':
        if (!this.activeTracks.has(track)) {
          this.activeTracks.set(track, true);
          this.onEvent?.('play_audio', track.data);
        }
        break;
        
      case 'dialogue':
        if (!this.activeTracks.has(track)) {
          this.activeTracks.set(track, true);
          this.onEvent?.('show_dialogue', track.data);
        }
        break;
        
      case 'event':
        if (!this.activeTracks.has(track)) {
          this.activeTracks.set(track, true);
          this.onEvent?.(track.data.name, track.data);
        }
        break;
        
      case 'subtitle':
        this.processSubtitleTrack(track.data as SubtitleEntry[], localTime);
        break;
    }
  }
  
  private processCameraTrack(keyframes: CameraKeyframe[], time: number): void {
    if (!this.camera || keyframes.length === 0) return;
    
    // Find surrounding keyframes
    let prevKf = keyframes[0];
    let nextKf = keyframes[0];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i].time <= time && keyframes[i + 1].time > time) {
        prevKf = keyframes[i];
        nextKf = keyframes[i + 1];
        break;
      }
      if (keyframes[i].time > time) break;
      prevKf = keyframes[i];
      nextKf = keyframes[i];
    }
    
    // Last keyframe
    if (time >= keyframes[keyframes.length - 1].time) {
      prevKf = keyframes[keyframes.length - 1];
      nextKf = prevKf;
    }
    
    // Interpolate
    if (prevKf === nextKf) {
      this.camera.position.copy(prevKf.position);
      this.camera.lookAt(prevKf.lookAt);
      if (prevKf.fov) this.camera.fov = prevKf.fov;
    } else {
      const t = (time - prevKf.time) / (nextKf.time - prevKf.time);
      const easedT = this.applyEasing(t, nextKf.easing || 'linear');
      
      this.camera.position.lerpVectors(prevKf.position, nextKf.position, easedT);
      
      const lookAt = prevKf.lookAt.clone().lerp(nextKf.lookAt, easedT);
      this.camera.lookAt(lookAt);
      
      if (prevKf.fov && nextKf.fov) {
        this.camera.fov = prevKf.fov + (nextKf.fov - prevKf.fov) * easedT;
      }
    }
    
    this.camera.updateProjectionMatrix();
  }
  
  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'easeIn': return t * t;
      case 'easeOut': return 1 - (1 - t) * (1 - t);
      case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default: return t;
    }
  }
  
  private processSubtitleTrack(subtitles: SubtitleEntry[], time: number): void {
    const active: SubtitleEntry[] = [];
    
    for (const sub of subtitles) {
      if (time >= sub.startTime && time < sub.endTime) {
        active.push(sub);
      }
    }
    
    if (JSON.stringify(active) !== JSON.stringify(this.activeSubtitles)) {
      this.activeSubtitles = active;
      this.onSubtitleChange?.(active);
    }
  }
  
  private endTrack(track: CutsceneTrack): void {
    this.activeTracks.delete(track);
    
    switch (track.type) {
      case 'audio':
        this.onEvent?.('stop_audio', track.data);
        break;
      case 'dialogue':
        this.onEvent?.('hide_dialogue', track.data);
        break;
    }
  }
  
  // Stop cutscene
  stop(): void {
    if (!this.currentCutscene) return;
    
    const cutscene = this.currentCutscene;
    
    // End all active tracks
    for (const track of this.activeTracks.keys()) {
      this.endTrack(track);
    }
    
    this.isPlaying = false;
    this.currentCutscene = null;
    this.activeSubtitles = [];
    
    // Disable cinematic bars
    this.disableCinematicBars();
    
    this.onCutsceneEnd?.(cutscene);
    cutscene.onComplete?.();
  }
  
  // Skip cutscene
  skip(): void {
    if (!this.currentCutscene?.skippable) return;
    this.stop();
  }
  
  // Pause/Resume
  pause(): void {
    this.isPaused = true;
  }
  
  resume(): void {
    this.isPaused = false;
  }
  
  // Cinematic bars
  private enableCinematicBars(): void {
    this.cinematicBarsEnabled = true;
    this.cinematicBarsProgress = 0;
  }
  
  private disableCinematicBars(): void {
    this.cinematicBarsEnabled = false;
    this.cinematicBarsProgress = 0;
  }
  
  getCinematicBarsProgress(): number {
    return this.cinematicBarsProgress;
  }
  
  areCinematicBarsEnabled(): boolean {
    return this.cinematicBarsEnabled;
  }
  
  // Getters
  isPlaying_(): boolean {
    return this.isPlaying;
  }
  
  isPaused_(): boolean {
    return this.isPaused;
  }
  
  getCurrentTime(): number {
    return this.currentTime;
  }
  
  getDuration(): number {
    return this.currentCutscene?.duration ?? 0;
  }
  
  getProgress(): number {
    if (!this.currentCutscene) return 0;
    return this.currentTime / this.currentCutscene.duration;
  }
  
  getActiveSubtitles(): SubtitleEntry[] {
    return this.activeSubtitles;
  }
  
  // Callbacks
  setOnCutsceneStart(callback: (cutscene: Cutscene) => void): void {
    this.onCutsceneStart = callback;
  }
  
  setOnCutsceneEnd(callback: (cutscene: Cutscene) => void): void {
    this.onCutsceneEnd = callback;
  }
  
  setOnSubtitleChange(callback: (subtitles: SubtitleEntry[]) => void): void {
    this.onSubtitleChange = callback;
  }
  
  setOnEvent(callback: (eventName: string, data: any) => void): void {
    this.onEvent = callback;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const createDialogueSystem = (): DialogueSystem => {
  return new DialogueSystem();
};

export const createCutsceneSystem = (): CutsceneSystem => {
  return new CutsceneSystem();
};

export {
  CinematicBarsRenderer,
  DialogueUIRenderer,
  SubtitleRenderer,
  createCinematicBars,
  createDialogueUI,
  createSubtitleRenderer,
} from './dialogue-cutscene-ui';
