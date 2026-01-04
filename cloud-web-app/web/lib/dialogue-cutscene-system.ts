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

export interface DialogueNode {
  id: string;
  type: 'dialogue' | 'choice' | 'action' | 'condition' | 'random';
  speaker?: string;
  text?: string;
  localizedText?: Record<string, string>;
  voiceLine?: string;
  portrait?: string;
  emotion?: string;
  duration?: number;
  choices?: DialogueChoice[];
  nextNode?: string;
  conditions?: DialogueCondition[];
  actions?: DialogueAction[];
  branches?: { condition: DialogueCondition; nodeId: string }[];
  randomBranches?: { weight: number; nodeId: string }[];
}

export interface DialogueChoice {
  id: string;
  text: string;
  localizedText?: Record<string, string>;
  nextNode: string;
  conditions?: DialogueCondition[];
  consequences?: DialogueAction[];
  tooltip?: string;
  isDefault?: boolean;
}

export interface DialogueCondition {
  type: 'variable' | 'item' | 'quest' | 'flag' | 'relationship' | 'custom';
  key: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'has' | 'not_has';
  value: any;
}

export interface DialogueAction {
  type: 'set_variable' | 'add_item' | 'remove_item' | 'set_flag' | 'start_quest' | 'complete_quest' | 'change_relationship' | 'play_animation' | 'play_sound' | 'trigger_event' | 'custom';
  target?: string;
  key?: string;
  value?: any;
  amount?: number;
}

export interface DialogueTree {
  id: string;
  name: string;
  startNode: string;
  nodes: Map<string, DialogueNode>;
  characters: Map<string, DialogueCharacter>;
  variables: Map<string, any>;
}

export interface DialogueCharacter {
  id: string;
  name: string;
  localizedName?: Record<string, string>;
  portraits: Map<string, string>; // emotion -> image URL
  voiceActor?: string;
  defaultEmotion: string;
  textColor?: string;
  nameColor?: string;
}

export interface DialogueState {
  currentTreeId: string | null;
  currentNodeId: string | null;
  history: string[];
  variables: Map<string, any>;
  flags: Set<string>;
  relationships: Map<string, number>;
}

// Cutscene types
export interface CutsceneTrack {
  type: 'camera' | 'animation' | 'audio' | 'dialogue' | 'event' | 'subtitle';
  startTime: number;
  duration: number;
  data: any;
}

export interface CameraKeyframe {
  time: number;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov?: number;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface Cutscene {
  id: string;
  name: string;
  duration: number;
  tracks: CutsceneTrack[];
  onComplete?: () => void;
  skippable: boolean;
}

export interface SubtitleEntry {
  startTime: number;
  endTime: number;
  text: string;
  localizedText?: Record<string, string>;
  speaker?: string;
  position?: 'bottom' | 'top' | 'middle';
}

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
// DIALOGUE UI RENDERER
// ============================================================================

export class DialogueUIRenderer {
  private container: HTMLDivElement;
  private dialogueBox: HTMLDivElement;
  private speakerName: HTMLDivElement;
  private dialogueText: HTMLDivElement;
  private portrait: HTMLImageElement;
  private choicesContainer: HTMLDivElement;
  
  private typewriterSpeed: number = 30; // chars per second
  private typewriterIndex: number = 0;
  private typewriterInterval: NodeJS.Timeout | null = null;
  private currentText: string = '';
  private isTyping: boolean = false;
  
  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement || 
                     this.createContainer();
    this.dialogueBox = this.createDialogueBox();
    this.speakerName = this.createSpeakerName();
    this.dialogueText = this.createDialogueText();
    this.portrait = this.createPortrait();
    this.choicesContainer = this.createChoicesContainer();
    
    this.assembleUI();
    this.hide();
  }
  
  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'dialogue-container';
    container.style.cssText = `
      position: fixed;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      max-width: 900px;
      z-index: 1000;
      font-family: 'Arial', sans-serif;
    `;
    document.body.appendChild(container);
    return container;
  }
  
  private createDialogueBox(): HTMLDivElement {
    const box = document.createElement('div');
    box.style.cssText = `
      background: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(20,20,40,0.95) 100%);
      border: 2px solid rgba(100, 150, 255, 0.5);
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      display: flex;
      gap: 20px;
    `;
    return box;
  }
  
  private createSpeakerName(): HTMLDivElement {
    const name = document.createElement('div');
    name.style.cssText = `
      position: absolute;
      top: -15px;
      left: 100px;
      background: linear-gradient(90deg, #4488ff, #66aaff);
      padding: 5px 20px;
      border-radius: 10px;
      font-weight: bold;
      font-size: 16px;
      color: white;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    return name;
  }
  
  private createDialogueText(): HTMLDivElement {
    const text = document.createElement('div');
    text.style.cssText = `
      flex: 1;
      color: white;
      font-size: 18px;
      line-height: 1.6;
      min-height: 80px;
    `;
    return text;
  }
  
  private createPortrait(): HTMLImageElement {
    const img = document.createElement('img');
    img.style.cssText = `
      width: 120px;
      height: 120px;
      border-radius: 10px;
      border: 2px solid rgba(100, 150, 255, 0.5);
      object-fit: cover;
    `;
    return img;
  }
  
  private createChoicesContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 15px;
    `;
    return container;
  }
  
  private assembleUI(): void {
    this.dialogueBox.style.position = 'relative';
    this.dialogueBox.appendChild(this.speakerName);
    this.dialogueBox.appendChild(this.portrait);
    
    const textContainer = document.createElement('div');
    textContainer.style.cssText = 'flex: 1; display: flex; flex-direction: column;';
    textContainer.appendChild(this.dialogueText);
    textContainer.appendChild(this.choicesContainer);
    this.dialogueBox.appendChild(textContainer);
    
    this.container.appendChild(this.dialogueBox);
  }
  
  show(): void {
    this.container.style.display = 'block';
  }
  
  hide(): void {
    this.container.style.display = 'none';
    this.stopTypewriter();
  }
  
  displayDialogue(text: string, speaker?: string, portraitUrl?: string): void {
    this.show();
    
    if (speaker) {
      this.speakerName.textContent = speaker;
      this.speakerName.style.display = 'block';
    } else {
      this.speakerName.style.display = 'none';
    }
    
    if (portraitUrl) {
      this.portrait.src = portraitUrl;
      this.portrait.style.display = 'block';
    } else {
      this.portrait.style.display = 'none';
    }
    
    this.currentText = text;
    this.startTypewriter();
    
    // Hide choices
    this.choicesContainer.innerHTML = '';
  }
  
  displayChoices(choices: DialogueChoice[], onSelect: (id: string) => void): void {
    this.choicesContainer.innerHTML = '';
    
    for (const choice of choices) {
      const button = document.createElement('button');
      button.textContent = choice.text;
      button.style.cssText = `
        background: rgba(50, 80, 150, 0.7);
        border: 1px solid rgba(100, 150, 255, 0.5);
        border-radius: 8px;
        padding: 12px 20px;
        color: white;
        font-size: 16px;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
      `;
      
      button.onmouseenter = () => {
        button.style.background = 'rgba(70, 100, 180, 0.9)';
        button.style.borderColor = 'rgba(150, 200, 255, 0.8)';
      };
      
      button.onmouseleave = () => {
        button.style.background = 'rgba(50, 80, 150, 0.7)';
        button.style.borderColor = 'rgba(100, 150, 255, 0.5)';
      };
      
      button.onclick = () => onSelect(choice.id);
      
      this.choicesContainer.appendChild(button);
    }
  }
  
  private startTypewriter(): void {
    this.stopTypewriter();
    this.typewriterIndex = 0;
    this.dialogueText.textContent = '';
    this.isTyping = true;
    
    const interval = 1000 / this.typewriterSpeed;
    
    this.typewriterInterval = setInterval(() => {
      if (this.typewriterIndex < this.currentText.length) {
        this.dialogueText.textContent += this.currentText[this.typewriterIndex];
        this.typewriterIndex++;
      } else {
        this.stopTypewriter();
      }
    }, interval);
  }
  
  private stopTypewriter(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    this.isTyping = false;
  }
  
  completeTypewriter(): void {
    this.stopTypewriter();
    this.dialogueText.textContent = this.currentText;
  }
  
  isTyping_(): boolean {
    return this.isTyping;
  }
  
  setTypewriterSpeed(charsPerSecond: number): void {
    this.typewriterSpeed = charsPerSecond;
  }
}

// ============================================================================
// SUBTITLE RENDERER
// ============================================================================

export class SubtitleRenderer {
  private container: HTMLDivElement;
  private currentSubtitles: Map<string, HTMLDivElement> = new Map();
  
  constructor(containerId?: string) {
    this.container = containerId ? 
      document.getElementById(containerId) as HTMLDivElement :
      this.createContainer();
  }
  
  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'subtitle-container';
    container.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      max-width: 800px;
      text-align: center;
      z-index: 999;
      pointer-events: none;
    `;
    document.body.appendChild(container);
    return container;
  }
  
  updateSubtitles(subtitles: SubtitleEntry[]): void {
    // Remove old subtitles
    const currentIds = new Set(subtitles.map(s => `${s.startTime}-${s.text}`));
    
    for (const [id, element] of this.currentSubtitles) {
      if (!currentIds.has(id)) {
        element.remove();
        this.currentSubtitles.delete(id);
      }
    }
    
    // Add/update subtitles
    for (const sub of subtitles) {
      const id = `${sub.startTime}-${sub.text}`;
      
      if (!this.currentSubtitles.has(id)) {
        const element = this.createSubtitleElement(sub);
        this.container.appendChild(element);
        this.currentSubtitles.set(id, element);
      }
    }
  }
  
  private createSubtitleElement(subtitle: SubtitleEntry): HTMLDivElement {
    const element = document.createElement('div');
    element.style.cssText = `
      background: rgba(0, 0, 0, 0.75);
      padding: 10px 20px;
      border-radius: 5px;
      margin: 5px 0;
      display: inline-block;
    `;
    
    if (subtitle.speaker) {
      const speaker = document.createElement('span');
      speaker.style.cssText = 'color: #66aaff; font-weight: bold; margin-right: 10px;';
      speaker.textContent = `${subtitle.speaker}:`;
      element.appendChild(speaker);
    }
    
    const text = document.createElement('span');
    text.style.cssText = 'color: white; font-size: 18px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);';
    text.textContent = subtitle.text;
    element.appendChild(text);
    
    // Position
    if (subtitle.position === 'top') {
      this.container.style.bottom = 'auto';
      this.container.style.top = '80px';
    } else if (subtitle.position === 'middle') {
      this.container.style.bottom = '50%';
      this.container.style.transform = 'translate(-50%, 50%)';
    }
    
    return element;
  }
  
  clear(): void {
    this.container.innerHTML = '';
    this.currentSubtitles.clear();
  }
}

// ============================================================================
// CINEMATIC BARS RENDERER
// ============================================================================

export class CinematicBarsRenderer {
  private topBar: HTMLDivElement;
  private bottomBar: HTMLDivElement;
  private maxHeight: number = 80;
  
  constructor() {
    this.topBar = this.createBar('top');
    this.bottomBar = this.createBar('bottom');
    document.body.appendChild(this.topBar);
    document.body.appendChild(this.bottomBar);
  }
  
  private createBar(position: 'top' | 'bottom'): HTMLDivElement {
    const bar = document.createElement('div');
    bar.style.cssText = `
      position: fixed;
      ${position}: 0;
      left: 0;
      width: 100%;
      height: 0;
      background: black;
      z-index: 998;
      pointer-events: none;
      transition: height 0.3s ease-out;
    `;
    return bar;
  }
  
  update(progress: number): void {
    const height = this.maxHeight * progress;
    this.topBar.style.height = `${height}px`;
    this.bottomBar.style.height = `${height}px`;
  }
  
  setMaxHeight(height: number): void {
    this.maxHeight = height;
  }
  
  dispose(): void {
    this.topBar.remove();
    this.bottomBar.remove();
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

export const createDialogueUI = (containerId: string): DialogueUIRenderer => {
  return new DialogueUIRenderer(containerId);
};

export const createSubtitleRenderer = (containerId?: string): SubtitleRenderer => {
  return new SubtitleRenderer(containerId);
};

export const createCinematicBars = (): CinematicBarsRenderer => {
  return new CinematicBarsRenderer();
};
