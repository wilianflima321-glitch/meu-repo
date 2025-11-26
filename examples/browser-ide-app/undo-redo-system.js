/**
 * Professional Undo/Redo System
 * Command Pattern implementation for all actions
 */

class UndoRedoSystem {
  constructor() {
    this.history = [];
    this.currentIndex = -1;
    this.maxHistorySize = 100;
    this.listeners = [];
    this.setupKeyboardShortcuts();
  }
  
  /**
   * Execute command and add to history
   */
  execute(command) {
    // Validate command
    if (!this.isValidCommand(command)) {
      console.error('Invalid command:', command);
      return false;
    }
    
    // Execute command
    try {
      command.execute();
    } catch (error) {
      console.error('Command execution failed:', error);
      return false;
    }
    
    // Remove any commands after current index (branching)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    
    // Add to history
    this.history.push(command);
    this.currentIndex++;
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }
    
    // Notify listeners
    this.notifyListeners();
    
    return true;
  }
  
  /**
   * Undo last command
   */
  undo() {
    if (!this.canUndo()) {
      console.warn('Nothing to undo');
      return false;
    }
    
    const command = this.history[this.currentIndex];
    
    try {
      command.undo();
      this.currentIndex--;
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Undo failed:', error);
      return false;
    }
  }
  
  /**
   * Redo next command
   */
  redo() {
    if (!this.canRedo()) {
      console.warn('Nothing to redo');
      return false;
    }
    
    this.currentIndex++;
    const command = this.history[this.currentIndex];
    
    try {
      command.execute();
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Redo failed:', error);
      this.currentIndex--;
      return false;
    }
  }
  
  /**
   * Check if can undo
   */
  canUndo() {
    return this.currentIndex >= 0;
  }
  
  /**
   * Check if can redo
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }
  
  /**
   * Get current state
   */
  getState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      historySize: this.history.length,
      currentIndex: this.currentIndex,
      undoDescription: this.canUndo() ? this.history[this.currentIndex].description : null,
      redoDescription: this.canRedo() ? this.history[this.currentIndex + 1].description : null,
    };
  }
  
  /**
   * Clear history
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
    this.notifyListeners();
  }
  
  /**
   * Validate command
   */
  isValidCommand(command) {
    return command &&
           typeof command.execute === 'function' &&
           typeof command.undo === 'function' &&
           typeof command.description === 'string';
  }
  
  /**
   * Add state change listener
   */
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  /**
   * Remove listener
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * Notify all listeners
   */
  notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(callback => callback(state));
  }
  
  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      
      // Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y for redo
      if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
          (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        this.redo();
      }
    });
  }
  
  /**
   * Get history for debugging
   */
  getHistory() {
    return this.history.map((cmd, index) => ({
      index,
      description: cmd.description,
      isCurrent: index === this.currentIndex,
    }));
  }
}

// Command classes for common operations

class CreateObjectCommand {
  constructor(object, scene) {
    this.object = object;
    this.scene = scene;
    this.description = `Create ${object.name}`;
  }
  
  execute() {
    this.scene.add(this.object);
  }
  
  undo() {
    this.scene.remove(this.object);
  }
}

class DeleteObjectCommand {
  constructor(object, scene) {
    this.object = object;
    this.scene = scene;
    this.description = `Delete ${object.name}`;
  }
  
  execute() {
    this.scene.remove(this.object);
  }
  
  undo() {
    this.scene.add(this.object);
  }
}

class MoveObjectCommand {
  constructor(object, oldPosition, newPosition) {
    this.object = object;
    this.oldPosition = { ...oldPosition };
    this.newPosition = { ...newPosition };
    this.description = `Move ${object.name}`;
  }
  
  execute() {
    this.object.position.set(
      this.newPosition.x,
      this.newPosition.y,
      this.newPosition.z
    );
  }
  
  undo() {
    this.object.position.set(
      this.oldPosition.x,
      this.oldPosition.y,
      this.oldPosition.z
    );
  }
}

class RotateObjectCommand {
  constructor(object, oldRotation, newRotation) {
    this.object = object;
    this.oldRotation = { ...oldRotation };
    this.newRotation = { ...newRotation };
    this.description = `Rotate ${object.name}`;
  }
  
  execute() {
    this.object.rotation.set(
      this.newRotation.x,
      this.newRotation.y,
      this.newRotation.z
    );
  }
  
  undo() {
    this.object.rotation.set(
      this.oldRotation.x,
      this.oldRotation.y,
      this.oldRotation.z
    );
  }
}

class ScaleObjectCommand {
  constructor(object, oldScale, newScale) {
    this.object = object;
    this.oldScale = { ...oldScale };
    this.newScale = { ...newScale };
    this.description = `Scale ${object.name}`;
  }
  
  execute() {
    this.object.scaling.set(
      this.newScale.x,
      this.newScale.y,
      this.newScale.z
    );
  }
  
  undo() {
    this.object.scaling.set(
      this.oldScale.x,
      this.oldScale.y,
      this.oldScale.z
    );
  }
}

class ChangePropertyCommand {
  constructor(object, property, oldValue, newValue) {
    this.object = object;
    this.property = property;
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.description = `Change ${property} of ${object.name}`;
  }
  
  execute() {
    this.object[this.property] = this.newValue;
  }
  
  undo() {
    this.object[this.property] = this.oldValue;
  }
}

class BatchCommand {
  constructor(commands, description) {
    this.commands = commands;
    this.description = description || 'Batch operation';
  }
  
  execute() {
    this.commands.forEach(cmd => cmd.execute());
  }
  
  undo() {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}

// Create global instance
const undoRedoSystem = new UndoRedoSystem();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UndoRedoSystem,
    undoRedoSystem,
    CreateObjectCommand,
    DeleteObjectCommand,
    MoveObjectCommand,
    RotateObjectCommand,
    ScaleObjectCommand,
    ChangePropertyCommand,
    BatchCommand,
  };
}
