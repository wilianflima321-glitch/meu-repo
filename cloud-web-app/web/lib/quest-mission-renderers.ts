/**
 * Quest system renderers (UI + world markers)
 */

import * as THREE from 'three';
import type {
  Quest,
  QuestManager,
  QuestMarker,
} from './quest-mission-system';

export class QuestUIRenderer {
  private container: HTMLDivElement;
  private trackerContainer: HTMLDivElement;
  private journalContainer: HTMLDivElement;
  
  private questManager: QuestManager;
  private isJournalOpen: boolean = false;
  
  constructor(questManager: QuestManager) {
    this.questManager = questManager;
    
    this.container = this.createContainer();
    this.trackerContainer = this.createTrackerContainer();
    this.journalContainer = this.createJournalContainer();
    
    this.container.appendChild(this.trackerContainer);
    this.container.appendChild(this.journalContainer);
    document.body.appendChild(this.container);
    
    this.setupCallbacks();
  }
  
  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'quest-ui';
    container.style.cssText = `
      position: fixed;
      z-index: 900;
      font-family: 'Arial', sans-serif;
      pointer-events: none;
    `;
    return container;
  }
  
  private createTrackerContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'quest-tracker';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      pointer-events: auto;
    `;
    return container;
  }
  
  private createJournalContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'quest-journal';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      height: 500px;
      background: rgba(20, 20, 40, 0.95);
      border: 2px solid rgba(100, 150, 255, 0.5);
      border-radius: 10px;
      display: none;
      pointer-events: auto;
    `;
    return container;
  }
  
  private setupCallbacks(): void {
    this.questManager.setOnQuestStateChange(() => this.updateTracker());
    this.questManager.setOnObjectiveProgress(() => this.updateTracker());
    this.questManager.setOnObjectiveComplete(() => this.updateTracker());
  }
  
  updateTracker(): void {
    this.trackerContainer.innerHTML = '';
    
    const tracked = this.questManager.getTrackedQuests();
    
    for (const quest of tracked) {
      const questElement = document.createElement('div');
      questElement.style.cssText = `
        background: rgba(0, 0, 0, 0.7);
        border-left: 3px solid ${quest.markerColor || '#ffcc00'};
        padding: 10px 15px;
        margin-bottom: 10px;
        border-radius: 5px;
      `;
      
      // Quest name
      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'color: #ffcc00; font-weight: bold; margin-bottom: 5px;';
      nameEl.textContent = this.questManager.getQuestName(quest);
      questElement.appendChild(nameEl);
      
      // Time remaining
      const remainingTime = this.questManager.getRemainingTime(quest.id);
      if (remainingTime !== null) {
        const timeEl = document.createElement('div');
        timeEl.style.cssText = 'color: #ff6666; font-size: 12px; margin-bottom: 5px;';
        timeEl.textContent = `Time: ${this.formatTime(remainingTime)}`;
        questElement.appendChild(timeEl);
      }
      
      // Objectives
      for (const [_, obj] of quest.objectives) {
        if (obj.hidden || obj.state === 'inactive') continue;
        
        const objEl = document.createElement('div');
        objEl.style.cssText = `
          color: ${obj.state === 'completed' ? '#66ff66' : '#ffffff'};
          font-size: 14px;
          padding-left: 10px;
          margin-top: 3px;
        `;
        
        const checkbox = obj.state === 'completed' ? '☑' : '☐';
        const progress = obj.requiredCount > 1 ? ` (${obj.currentCount}/${obj.requiredCount})` : '';
        objEl.textContent = `${checkbox} ${this.questManager.getObjectiveDescription(obj)}${progress}`;
        
        questElement.appendChild(objEl);
      }
      
      this.trackerContainer.appendChild(questElement);
    }
  }
  
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }
  
  openJournal(): void {
    this.isJournalOpen = true;
    this.journalContainer.style.display = 'block';
    this.renderJournal();
  }
  
  closeJournal(): void {
    this.isJournalOpen = false;
    this.journalContainer.style.display = 'none';
  }
  
  toggleJournal(): void {
    if (this.isJournalOpen) {
      this.closeJournal();
    } else {
      this.openJournal();
    }
  }
  
  private renderJournal(): void {
    this.journalContainer.innerHTML = '';
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      border-bottom: 1px solid rgba(100, 150, 255, 0.3);
    `;
    
    const title = document.createElement('h2');
    title.style.cssText = 'color: #ffcc00; margin: 0;';
    title.textContent = 'Quest Journal';
    header.appendChild(title);
    
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
    `;
    closeBtn.textContent = '×';
    closeBtn.onclick = () => this.closeJournal();
    header.appendChild(closeBtn);
    
    this.journalContainer.appendChild(header);
    
    // Tabs
    const tabs = document.createElement('div');
    tabs.style.cssText = `
      display: flex;
      padding: 10px 20px;
      gap: 10px;
    `;
    
    const categories = ['Active', 'Available', 'Completed'];
    for (const cat of categories) {
      const tab = document.createElement('button');
      tab.style.cssText = `
        background: rgba(50, 80, 150, 0.5);
        border: 1px solid rgba(100, 150, 255, 0.3);
        color: white;
        padding: 8px 20px;
        border-radius: 5px;
        cursor: pointer;
      `;
      tab.textContent = cat;
      tab.onclick = () => this.renderQuestList(cat.toLowerCase());
      tabs.appendChild(tab);
    }
    
    this.journalContainer.appendChild(tabs);
    
    // Quest list
    const listContainer = document.createElement('div');
    listContainer.id = 'quest-list';
    listContainer.style.cssText = `
      padding: 20px;
      height: calc(100% - 120px);
      overflow-y: auto;
    `;
    this.journalContainer.appendChild(listContainer);
    
    // Default to active quests
    this.renderQuestList('active');
  }
  
  private renderQuestList(category: string): void {
    const listContainer = document.getElementById('quest-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    let quests: Quest[];
    switch (category) {
      case 'active':
        quests = this.questManager.getActiveQuests();
        break;
      case 'available':
        quests = this.questManager.getAvailableQuests();
        break;
      case 'completed':
        quests = this.questManager.getCompletedQuests();
        break;
      default:
        quests = [];
    }
    
    if (quests.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color: #888; text-align: center; padding: 40px;';
      empty.textContent = 'No quests in this category';
      listContainer.appendChild(empty);
      return;
    }
    
    for (const quest of quests) {
      const questEl = document.createElement('div');
      questEl.style.cssText = `
        background: rgba(30, 30, 60, 0.8);
        border: 1px solid rgba(100, 150, 255, 0.3);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        cursor: pointer;
      `;
      
      questEl.onmouseenter = () => {
        questEl.style.borderColor = 'rgba(150, 200, 255, 0.6)';
      };
      
      questEl.onmouseleave = () => {
        questEl.style.borderColor = 'rgba(100, 150, 255, 0.3)';
      };
      
      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'color: #ffcc00; font-weight: bold; font-size: 16px;';
      nameEl.textContent = this.questManager.getQuestName(quest);
      questEl.appendChild(nameEl);
      
      const descEl = document.createElement('div');
      descEl.style.cssText = 'color: #ccc; font-size: 14px; margin-top: 5px;';
      descEl.textContent = this.questManager.getQuestDescription(quest);
      questEl.appendChild(descEl);
      
      // Track button for active quests
      if (category === 'active') {
        const trackBtn = document.createElement('button');
        trackBtn.style.cssText = `
          background: ${quest.isTracked ? 'rgba(100, 200, 100, 0.5)' : 'rgba(100, 100, 100, 0.5)'};
          border: none;
          color: white;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          margin-top: 10px;
        `;
        trackBtn.textContent = quest.isTracked ? 'Tracked' : 'Track';
        trackBtn.onclick = (e) => {
          e.stopPropagation();
          if (quest.isTracked) {
            this.questManager.untrackQuest(quest.id);
          } else {
            this.questManager.trackQuest(quest.id);
          }
          this.renderQuestList(category);
          this.updateTracker();
        };
        questEl.appendChild(trackBtn);
      }
      
      listContainer.appendChild(questEl);
    }
  }
}

// ============================================================================
// QUEST MARKER RENDERER (3D)
// ============================================================================

export class QuestMarkerRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private markers: Map<string, THREE.Group> = new Map();
  
  private questManager: QuestManager;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, questManager: QuestManager) {
    this.scene = scene;
    this.camera = camera;
    this.questManager = questManager;
  }
  
  update(): void {
    const activeMarkers = this.questManager.getTrackedMarkers();
    const activeIds = new Set(activeMarkers.map(m => `${m.questId}-${m.objectiveId || 'main'}`));
    
    // Remove old markers
    for (const [id, group] of this.markers) {
      if (!activeIds.has(id)) {
        this.scene.remove(group);
        this.markers.delete(id);
      }
    }
    
    // Add/update markers
    for (const marker of activeMarkers) {
      const id = `${marker.questId}-${marker.objectiveId || 'main'}`;
      
      if (!this.markers.has(id)) {
        const group = this.createMarkerMesh(marker);
        this.scene.add(group);
        this.markers.set(id, group);
      }
      
      // Update position
      const group = this.markers.get(id)!;
      group.position.copy(marker.position);
      group.position.y += 2; // Float above ground
      
      // Billboard - face camera
      group.lookAt(this.camera.position);
    }
    
    // Animate markers
    const time = Date.now() * 0.001;
    for (const group of this.markers.values()) {
      group.position.y += Math.sin(time * 2) * 0.002; // Gentle bob
    }
  }
  
  private createMarkerMesh(marker: QuestMarker): THREE.Group {
    const group = new THREE.Group();
    
    // Create sprite
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Background circle
    ctx.fillStyle = marker.color;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Icon
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(marker.icon, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.5, 0.5, 1);
    
    group.add(sprite);
    
    return group;
  }
  
  dispose(): void {
    for (const group of this.markers.values()) {
      this.scene.remove(group);
    }
    this.markers.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
