/**
 * Dialogue/Cutscene UI runtime renderers.
 */

import type { DialogueChoice, SubtitleEntry } from './dialogue-cutscene-types';

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


export const createDialogueUI = (containerId: string): DialogueUIRenderer => {
  return new DialogueUIRenderer(containerId);
};

export const createSubtitleRenderer = (containerId?: string): SubtitleRenderer => {
  return new SubtitleRenderer(containerId);
};

export const createCinematicBars = (): CinematicBarsRenderer => {
  return new CinematicBarsRenderer();
};
