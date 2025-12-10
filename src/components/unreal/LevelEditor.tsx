import React, { useState, useEffect, useRef } from 'react';
import { UnrealLevelService, Actor, Level, Transform } from '../../services/UnrealLevelService';
import { EventBus } from '../../services/EventBus';

type Tool = 'select' | 'move' | 'rotate' | 'scale';
type ViewMode = 'perspective' | 'top' | 'front' | 'side';

export const LevelEditor: React.FC = () => {
  const [level, setLevel] = useState<Level | null>(null);
  const [actors, setActors] = useState<Actor[]>([]);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [viewMode, setViewMode] = useState<ViewMode>('perspective');
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(100);
  const viewportRef = useRef<HTMLDivElement>(null);
  const levelService = UnrealLevelService.getInstance();

  useEffect(() => {
    const unsubscribe = EventBus.getInstance().subscribe('unreal:levelOpen', (data: { level: Level }) => {
      loadLevel(data.level);
    });

    return () => unsubscribe();
  }, []);

  const loadLevel = async (lvl: Level) => {
    setLevel(lvl);
    const levelActors = await levelService.getActors(lvl.id);
    setActors(levelActors);
  };

  const handleAddActor = async (type: string) => {
    if (!level) return;

    const newActor: Actor = {
      id: `actor_${Date.now()}`,
      name: `${type}_${actors.length + 1}`,
      type,
      transform: {
        location: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      properties: {}
    };

    await levelService.addActor(level.id, newActor);
    setActors([...actors, newActor]);
    setSelectedActor(newActor);
  };

  const handleDeleteActor = async () => {
    if (!selectedActor || !level) return;

    await levelService.deleteActor(level.id, selectedActor.id);
    setActors(actors.filter(a => a.id !== selectedActor.id));
    setSelectedActor(null);
  };

  const handleDuplicateActor = async () => {
    if (!selectedActor || !level) return;

    const duplicate: Actor = {
      ...selectedActor,
      id: `actor_${Date.now()}`,
      name: `${selectedActor.name}_Copy`,
      transform: {
        ...selectedActor.transform,
        location: {
          x: selectedActor.transform.location.x + 100,
          y: selectedActor.transform.location.y,
          z: selectedActor.transform.location.z
        }
      }
    };

    await levelService.addActor(level.id, duplicate);
    setActors([...actors, duplicate]);
    setSelectedActor(duplicate);
  };

  const handleTransformChange = (property: 'location' | 'rotation' | 'scale', axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedActor) return;

    const updated = {
      ...selectedActor,
      transform: {
        ...selectedActor.transform,
        [property]: {
          ...selectedActor.transform[property],
          [axis]: value
        }
      }
    };

    setSelectedActor(updated);
    setActors(actors.map(a => a.id === updated.id ? updated : a));

    if (level) {
      levelService.updateActor(level.id, updated.id, updated);
    }
  };

  const handleBuild = async () => {
    if (!level) return;

    try {
      const result = await levelService.buildLighting(level.id);
      if (result.success) {
        EventBus.getInstance().emit('notification:show', {
          message: 'Lighting built successfully',
          type: 'success'
        });
      } else {
        EventBus.getInstance().emit('notification:show', {
          message: `Build failed: ${result.errors.join(', ')}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Build error:', error);
    }
  };

  const handlePlay = () => {
    if (!level) return;
    levelService.playInEditor(level.id);
    EventBus.getInstance().emit('notification:show', {
      message: 'Playing in editor',
      type: 'info'
    });
  };

  const getActorIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'StaticMesh': '🗿',
      'Light': '💡',
      'Camera': '📷',
      'PlayerStart': '🎮',
      'Trigger': '⚡',
      'Sound': '🔊',
      'Particle': '✨'
    };
    return icons[type] || '📦';
  };

  return (
    <div className="level-editor">
      <div className="editor-toolbar">
        <div className="toolbar-section">
          <span className="level-name">{level?.name || 'No Level'}</span>
        </div>

        <div className="toolbar-section">
          <button 
            className={activeTool === 'select' ? 'active' : ''}
            onClick={() => setActiveTool('select')}
            title="Select (Q)"
          >
            Select
          </button>
          <button 
            className={activeTool === 'move' ? 'active' : ''}
            onClick={() => setActiveTool('move')}
            title="Move (W)"
          >
            Move
          </button>
          <button 
            className={activeTool === 'rotate' ? 'active' : ''}
            onClick={() => setActiveTool('rotate')}
            title="Rotate (E)"
          >
            Rotate
          </button>
          <button 
            className={activeTool === 'scale' ? 'active' : ''}
            onClick={() => setActiveTool('scale')}
            title="Scale (R)"
          >
            Scale
          </button>
        </div>

        <div className="toolbar-section">
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
            <option value="perspective">Perspective</option>
            <option value="top">Top</option>
            <option value="front">Front</option>
            <option value="side">Side</option>
          </select>
        </div>

        <div className="toolbar-section">
          <label>
            <input 
              type="checkbox" 
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            Grid
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
            />
            Snap
          </label>
          <input 
            type="number" 
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
            style={{ width: '60px' }}
          />
        </div>

        <div className="toolbar-section">
          <button onClick={handleBuild}>Build</button>
          <button onClick={handlePlay} className="play-button">Play</button>
        </div>
      </div>

      <div className="editor-content">
        <div className="actors-panel">
          <div className="panel-header">
            <h3>Actors</h3>
            <div className="panel-actions">
              <button onClick={() => handleAddActor('StaticMesh')} title="Add Static Mesh">+</button>
            </div>
          </div>

          <div className="add-actor-menu">
            <button onClick={() => handleAddActor('StaticMesh')}>Static Mesh</button>
            <button onClick={() => handleAddActor('Light')}>Light</button>
            <button onClick={() => handleAddActor('Camera')}>Camera</button>
            <button onClick={() => handleAddActor('PlayerStart')}>Player Start</button>
            <button onClick={() => handleAddActor('Trigger')}>Trigger</button>
            <button onClick={() => handleAddActor('Sound')}>Sound</button>
            <button onClick={() => handleAddActor('Particle')}>Particle</button>
          </div>

          <div className="actors-list">
            {actors.map(actor => (
              <div
                key={actor.id}
                className={`actor-item ${selectedActor?.id === actor.id ? 'selected' : ''}`}
                onClick={() => setSelectedActor(actor)}
              >
                <span className="actor-icon">{getActorIcon(actor.type)}</span>
                <span className="actor-name">{actor.name}</span>
                <span className="actor-type">{actor.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="viewport" ref={viewportRef}>
          <div className="viewport-overlay">
            <div className="viewport-info">
              <div>{viewMode.toUpperCase()}</div>
              <div>Tool: {activeTool.toUpperCase()}</div>
              {selectedActor && <div>Selected: {selectedActor.name}</div>}
            </div>
          </div>

          {showGrid && (
            <div className="grid-overlay">
              <svg width="100%" height="100%">
                {Array.from({ length: 20 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <line
                      x1={`${i * 5}%`}
                      y1="0"
                      x2={`${i * 5}%`}
                      y2="100%"
                      stroke="#333333"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1={`${i * 5}%`}
                      x2="100%"
                      y2={`${i * 5}%`}
                      stroke="#333333"
                      strokeWidth="1"
                    />
                  </React.Fragment>
                ))}
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#ff0000" strokeWidth="2" />
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#00ff00" strokeWidth="2" />
              </svg>
            </div>
          )}

          <div className="actors-viewport">
            {actors.map(actor => (
              <div
                key={actor.id}
                className={`viewport-actor ${selectedActor?.id === actor.id ? 'selected' : ''}`}
                style={{
                  left: `${50 + actor.transform.location.x / 10}%`,
                  top: `${50 - actor.transform.location.y / 10}%`
                }}
                onClick={() => setSelectedActor(actor)}
              >
                <div className="actor-gizmo">{getActorIcon(actor.type)}</div>
              </div>
            ))}
          </div>
        </div>

        {selectedActor && (
          <div className="details-panel">
            <div className="panel-header">
              <h3>Details</h3>
              <div className="panel-actions">
                <button onClick={handleDuplicateActor} title="Duplicate">Duplicate</button>
                <button onClick={handleDeleteActor} title="Delete">Delete</button>
              </div>
            </div>

            <div className="details-content">
              <div className="detail-section">
                <h4>Transform</h4>
                
                <div className="transform-group">
                  <label>Location</label>
                  <div className="vector-input">
                    <input
                      type="number"
                      value={selectedActor.transform.location.x}
                      onChange={(e) => handleTransformChange('location', 'x', Number(e.target.value))}
                      placeholder="X"
                    />
                    <input
                      type="number"
                      value={selectedActor.transform.location.y}
                      onChange={(e) => handleTransformChange('location', 'y', Number(e.target.value))}
                      placeholder="Y"
                    />
                    <input
                      type="number"
                      value={selectedActor.transform.location.z}
                      onChange={(e) => handleTransformChange('location', 'z', Number(e.target.value))}
                      placeholder="Z"
                    />
                  </div>
                </div>

                <div className="transform-group">
                  <label>Rotation</label>
                  <div className="vector-input">
                    <input
                      type="number"
                      value={selectedActor.transform.rotation.x}
                      onChange={(e) => handleTransformChange('rotation', 'x', Number(e.target.value))}
                      placeholder="X"
                    />
                    <input
                      type="number"
                      value={selectedActor.transform.rotation.y}
                      onChange={(e) => handleTransformChange('rotation', 'y', Number(e.target.value))}
                      placeholder="Y"
                    />
                    <input
                      type="number"
                      value={selectedActor.transform.rotation.z}
                      onChange={(e) => handleTransformChange('rotation', 'z', Number(e.target.value))}
                      placeholder="Z"
                    />
                  </div>
                </div>

                <div className="transform-group">
                  <label>Scale</label>
                  <div className="vector-input">
                    <input
                      type="number"
                      value={selectedActor.transform.scale.x}
                      onChange={(e) => handleTransformChange('scale', 'x', Number(e.target.value))}
                      placeholder="X"
                      step="0.1"
                    />
                    <input
                      type="number"
                      value={selectedActor.transform.scale.y}
                      onChange={(e) => handleTransformChange('scale', 'y', Number(e.target.value))}
                      placeholder="Y"
                      step="0.1"
                    />
                    <input
                      type="number"
                      value={selectedActor.transform.scale.z}
                      onChange={(e) => handleTransformChange('scale', 'z', Number(e.target.value))}
                      placeholder="Z"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Properties</h4>
                <div className="property-row">
                  <span className="label">Name:</span>
                  <input
                    type="text"
                    value={selectedActor.name}
                    onChange={(e) => {
                      const updated = { ...selectedActor, name: e.target.value };
                      setSelectedActor(updated);
                      setActors(actors.map(a => a.id === updated.id ? updated : a));
                    }}
                  />
                </div>
                <div className="property-row">
                  <span className="label">Type:</span>
                  <span className="value">{selectedActor.type}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .level-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1a1a1a;
          color: #ffffff;
        }

        .editor-toolbar {
          display: flex;
          gap: 16px;
          padding: 8px 12px;
          background: #2a2a2a;
          border-bottom: 1px solid #3a3a3a;
        }

        .toolbar-section {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .level-name {
          font-size: 14px;
          font-weight: 600;
        }

        .editor-toolbar button,
        .editor-toolbar select {
          padding: 6px 12px;
          background: #3a3a3a;
          color: #ffffff;
          border: none;
          cursor: pointer;
          font-size: 12px;
          border-radius: 2px;
        }

        .editor-toolbar button:hover {
          background: #4a4a4a;
        }

        .editor-toolbar button.active {
          background: #0e639c;
        }

        .play-button {
          background: #0e639c !important;
        }

        .play-button:hover {
          background: #1177bb !important;
        }

        .editor-toolbar label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
        }

        .editor-toolbar input[type="number"] {
          padding: 4px 8px;
          background: #3a3a3a;
          color: #ffffff;
          border: 1px solid #4a4a4a;
          font-size: 12px;
        }

        .editor-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .actors-panel {
          width: 250px;
          background: #2a2a2a;
          border-right: 1px solid #3a3a3a;
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #3a3a3a;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .panel-actions {
          display: flex;
          gap: 4px;
        }

        .panel-actions button {
          padding: 4px 8px;
          background: #3a3a3a;
          color: #ffffff;
          border: none;
          cursor: pointer;
          font-size: 12px;
          border-radius: 2px;
        }

        .add-actor-menu {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px;
          border-bottom: 1px solid #3a3a3a;
        }

        .add-actor-menu button {
          padding: 6px 12px;
          background: #3a3a3a;
          color: #ffffff;
          border: none;
          cursor: pointer;
          font-size: 12px;
          text-align: left;
          border-radius: 2px;
        }

        .add-actor-menu button:hover {
          background: #4a4a4a;
        }

        .actors-list {
          flex: 1;
          overflow-y: auto;
          padding: 4px;
        }

        .actor-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          cursor: pointer;
          border-radius: 2px;
          margin-bottom: 2px;
        }

        .actor-item:hover {
          background: #3a3a3a;
        }

        .actor-item.selected {
          background: #0e639c;
        }

        .actor-icon {
          font-size: 16px;
        }

        .actor-name {
          flex: 1;
          font-size: 12px;
        }

        .actor-type {
          font-size: 10px;
          color: #aaaaaa;
        }

        .viewport {
          flex: 1;
          position: relative;
          background: #1a1a1a;
          overflow: hidden;
        }

        .viewport-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 12px;
          z-index: 10;
          pointer-events: none;
        }

        .viewport-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 11px;
          color: #ffffff;
          background: rgba(0, 0, 0, 0.5);
          padding: 8px;
          border-radius: 2px;
          width: fit-content;
        }

        .grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .actors-viewport {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }

        .viewport-actor {
          position: absolute;
          transform: translate(-50%, -50%);
          cursor: pointer;
        }

        .viewport-actor.selected .actor-gizmo {
          border-color: #0e639c;
          box-shadow: 0 0 10px rgba(14, 99, 156, 0.8);
        }

        .actor-gizmo {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(42, 42, 42, 0.8);
          border: 2px solid #4a4a4a;
          border-radius: 4px;
          font-size: 20px;
        }

        .details-panel {
          width: 300px;
          background: #2a2a2a;
          border-left: 1px solid #3a3a3a;
          display: flex;
          flex-direction: column;
        }

        .details-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .detail-section {
          margin-bottom: 20px;
        }

        .detail-section h4 {
          margin: 0 0 12px 0;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #aaaaaa;
        }

        .transform-group {
          margin-bottom: 12px;
        }

        .transform-group label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 4px;
          color: #cccccc;
        }

        .vector-input {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }

        .vector-input input {
          padding: 6px 8px;
          background: #1a1a1a;
          color: #ffffff;
          border: 1px solid #3a3a3a;
          outline: none;
          font-size: 12px;
        }

        .vector-input input:focus {
          border-color: #0e639c;
        }

        .property-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
        }

        .property-row .label {
          font-size: 11px;
          font-weight: 600;
          color: #aaaaaa;
        }

        .property-row .value {
          font-size: 12px;
          color: #ffffff;
        }

        .property-row input {
          padding: 6px 8px;
          background: #1a1a1a;
          color: #ffffff;
          border: 1px solid #3a3a3a;
          outline: none;
          font-size: 12px;
        }

        .property-row input:focus {
          border-color: #0e639c;
        }
      `}</style>
    </div>
  );
};
