/**
 * Global Context Manager for AI
 * Prevents hallucinations, ensures consistency, maintains coherence
 */

class GlobalContextManager {
  constructor() {
    this.projectContext = this.initializeContext();
    this.sessionMemory = [];
    this.validationRules = [];
    this.maxMemorySize = 1000;
  }
  
  initializeContext() {
    return {
      // Project metadata
      metadata: {
        id: `project_${Date.now()}`,
        name: 'Untitled Project',
        type: 'game', // game, movie, app
        created: Date.now(),
        modified: Date.now(),
      },
      
      // Project settings
      settings: {
        genre: 'action',
        style: 'realistic',
        targetAudience: 'adults',
        language: 'en',
      },
      
      // World physics and rules
      world: {
        gravity: 9.81,
        scale: 'realistic',
        physics: 'enabled',
        environment: 'urban',
        timeOfDay: 'day',
        weather: 'clear',
        rules: [],
      },
      
      // Narrative structure
      story: {
        theme: null,
        tone: 'neutral',
        pacing: 'medium',
        currentAct: 1,
        totalActs: 3,
        plotPoints: [],
        conflicts: [],
        resolutions: [],
      },
      
      // Characters
      characters: [],
      
      // Scenes
      scenes: [],
      
      // Assets
      assets: {
        models: [],
        textures: [],
        audio: [],
        scripts: [],
      },
      
      // Relationships between entities
      relationships: [],
      
      // Facts established in the world
      facts: [],
      
      // Active constraints
      constraints: this.getDefaultConstraints(),
    };
  }
  
  getDefaultConstraints() {
    return {
      physics: {
        gravity: { min: 0, max: 20, default: 9.81 },
        mass: { min: 0.01, max: 100000 },
        friction: { min: 0, max: 2, default: 0.5 },
        restitution: { min: 0, max: 1, default: 0.5 },
      },
      narrative: {
        sceneLength: { min: 10, max: 300 },
        actLength: { min: 3, max: 20 },
        characterLimit: { max: 10 },
      },
      audio: {
        volume: { min: 0, max: 1, default: 0.7 },
        duration: { min: 1, max: 600 },
      },
    };
  }
  
  /**
   * Add information to context
   */
  addToContext(category, data) {
    if (!this.projectContext[category]) {
      console.warn(`Category "${category}" does not exist in context`);
      return false;
    }
    
    // Validate data before adding
    const validation = this.validateContextData(category, data);
    if (!validation.valid) {
      console.error('Context validation failed:', validation.errors);
      return false;
    }
    
    // Add to context
    if (Array.isArray(this.projectContext[category])) {
      this.projectContext[category].push(data);
    } else {
      this.projectContext[category] = {
        ...this.projectContext[category],
        ...data
      };
    }
    
    // Add to memory
    this.addToMemory({
      action: 'context_update',
      category,
      data,
      timestamp: Date.now(),
    });
    
    // Update modified time
    this.projectContext.metadata.modified = Date.now();
    
    return true;
  }
  
  /**
   * Get context for AI
   */
  getContextForAI(options = {}) {
    const {
      includeMemory = true,
      memoryLimit = 20,
      includeConstraints = true,
    } = options;
    
    const context = {
      project: this.projectContext,
    };
    
    if (includeMemory) {
      context.recentActions = this.sessionMemory.slice(-memoryLimit);
    }
    
    if (includeConstraints) {
      context.constraints = this.projectContext.constraints;
    }
    
    // Add relevant facts
    context.facts = this.projectContext.facts;
    
    // Add current state summary
    context.summary = this.generateContextSummary();
    
    return context;
  }
  
  /**
   * Generate context summary
   */
  generateContextSummary() {
    return {
      totalScenes: this.projectContext.scenes.length,
      totalCharacters: this.projectContext.characters.length,
      totalAssets: Object.values(this.projectContext.assets).reduce((sum, arr) => sum + arr.length, 0),
      currentAct: this.projectContext.story.currentAct,
      worldState: {
        environment: this.projectContext.world.environment,
        timeOfDay: this.projectContext.world.timeOfDay,
        weather: this.projectContext.world.weather,
      },
    };
  }
  
  /**
   * Add to session memory
   */
  addToMemory(entry) {
    this.sessionMemory.push({
      id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...entry,
    });
    
    // Limit memory size
    if (this.sessionMemory.length > this.maxMemorySize) {
      this.sessionMemory = this.sessionMemory.slice(-this.maxMemorySize);
    }
  }
  
  /**
   * Search memory
   */
  searchMemory(query) {
    // Simple search (in production, use semantic search)
    return this.sessionMemory.filter(entry => {
      const entryStr = JSON.stringify(entry).toLowerCase();
      return entryStr.includes(query.toLowerCase());
    });
  }
  
  /**
   * Add fact to world
   */
  addFact(fact) {
    // Check for contradictions
    const contradictions = this.findContradictingFacts(fact);
    
    if (contradictions.length > 0) {
      return {
        success: false,
        error: 'Fact contradicts existing facts',
        contradictions: contradictions,
      };
    }
    
    this.projectContext.facts.push({
      id: `fact_${Date.now()}`,
      ...fact,
      timestamp: Date.now(),
      confidence: 1.0,
    });
    
    return { success: true };
  }
  
  /**
   * Find contradicting facts
   */
  findContradictingFacts(newFact) {
    const contradictions = [];
    
    for (const existingFact of this.projectContext.facts) {
      if (this.areFactsContradictory(existingFact, newFact)) {
        contradictions.push(existingFact);
      }
    }
    
    return contradictions;
  }
  
  /**
   * Check if facts are contradictory
   */
  areFactsContradictory(fact1, fact2) {
    // Check if facts are about the same entity
    if (fact1.entity !== fact2.entity) {
      return false;
    }
    
    // Check if properties conflict
    if (fact1.property === fact2.property && fact1.value !== fact2.value) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Validate context data
   */
  validateContextData(category, data) {
    const errors = [];
    
    // Category-specific validation
    switch (category) {
      case 'characters':
        if (!data.name) errors.push('Character must have a name');
        if (!data.personality) errors.push('Character must have a personality');
        break;
      
      case 'scenes':
        if (!data.name) errors.push('Scene must have a name');
        if (!data.duration) errors.push('Scene must have a duration');
        break;
      
      case 'world':
        if (data.gravity !== undefined) {
          const constraint = this.projectContext.constraints.physics.gravity;
          if (data.gravity < constraint.min || data.gravity > constraint.max) {
            errors.push(`Gravity must be between ${constraint.min} and ${constraint.max}`);
          }
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }
  
  /**
   * Validate action against context
   */
  validateAction(action) {
    const errors = [];
    const warnings = [];
    
    // Check if action references existing entities
    if (action.characterId) {
      const character = this.projectContext.characters.find(c => c.id === action.characterId);
      if (!character) {
        errors.push(`Character ${action.characterId} does not exist`);
      }
    }
    
    // Check if action is consistent with world rules
    for (const rule of this.projectContext.world.rules) {
      if (!rule.validate(action)) {
        warnings.push(`Action may violate world rule: ${rule.name}`);
      }
    }
    
    // Check if action is consistent with narrative
    if (action.type === 'scene') {
      const narrativeCheck = this.validateNarrativeAction(action);
      if (!narrativeCheck.valid) {
        warnings.push(...narrativeCheck.warnings);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  }
  
  /**
   * Validate narrative action
   */
  validateNarrativeAction(action) {
    const warnings = [];
    const { story, scenes } = this.projectContext;
    
    // Check if scene fits current act
    const expectedTone = this.getExpectedTone(story.currentAct);
    if (action.tone && action.tone !== expectedTone) {
      warnings.push(`Scene tone "${action.tone}" differs from expected "${expectedTone}" for Act ${story.currentAct}`);
    }
    
    // Check continuity with previous scene
    if (scenes.length > 0) {
      const lastScene = scenes[scenes.length - 1];
      if (!this.checkContinuity(lastScene, action)) {
        warnings.push('Scene may break narrative continuity');
      }
    }
    
    return {
      valid: true,
      warnings: warnings,
    };
  }
  
  /**
   * Get expected tone for act
   */
  getExpectedTone(act) {
    const tones = {
      1: 'exposition',
      2: 'rising_tension',
      3: 'climax',
    };
    return tones[act] || 'neutral';
  }
  
  /**
   * Check continuity between scenes
   */
  checkContinuity(scene1, scene2) {
    // Check if time progression makes sense
    if (scene2.timestamp < scene1.timestamp) {
      return false;
    }
    
    // Check if location change makes sense
    if (scene1.location !== scene2.location) {
      // Need transition or time gap
      const timeDiff = scene2.timestamp - scene1.timestamp;
      if (timeDiff < 60) { // Less than 1 minute
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Export context
   */
  export() {
    return {
      context: this.projectContext,
      memory: this.sessionMemory,
      timestamp: Date.now(),
    };
  }
  
  /**
   * Import context
   */
  import(data) {
    this.projectContext = data.context;
    this.sessionMemory = data.memory || [];
  }
  
  /**
   * Reset context
   */
  reset() {
    this.projectContext = this.initializeContext();
    this.sessionMemory = [];
  }
}

// Create global instance
const globalContext = new GlobalContextManager();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GlobalContextManager, globalContext };
}
