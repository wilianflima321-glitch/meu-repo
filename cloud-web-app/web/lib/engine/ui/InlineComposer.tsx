import React, { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/observability/logger';

interface ComposerState {
  isOpen: boolean;
  x: number;
  y: number;
  nodeId: string | null;
}

/**
 * InlineComposer
 * 
 * The Spatial Ghost Composer interface. Mounts directly over the 3D canvas
 * exactly where the user pointed. Allows the user to type AI instructions
 * which will be sent to the AI and rendered as a Ghost Material on the node.
 */
export const InlineComposer: React.FC = () => {
  const [state, setState] = useState<ComposerState>({ isOpen: false, x: 0, y: 0, nodeId: null });
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      setState({
        isOpen: true,
        x: customEvent.detail.x,
        y: customEvent.detail.y,
        nodeId: customEvent.detail.nodeId
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    window.addEventListener('open-spatial-composer', handleOpen);
    return () => window.removeEventListener('open-spatial-composer', handleOpen);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !state.nodeId) return;

    // Send to backend generative route
    logger.info(`[Ghost Composer] Sending prompt: "${prompt}" for Node: ${state.nodeId}`);
    
    // Simulating sending to the generative AI API
    // await fetch('/api/ai/generate-shader', { body: JSON.stringify({ prompt, nodeId }) });

    setState(prev => ({ ...prev, isOpen: false }));
    setPrompt('');
  };

  if (!state.isOpen) return null;

  return (
    <div 
      style={{
        position: 'absolute',
        left: state.x,
        top: state.y,
        transform: 'translate(-50%, -100%)',
        background: 'rgba(20, 20, 25, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '12px',
        width: '300px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 9999
      }}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '8px', fontFamily: 'monospace' }}>
          Targeting: {state.nodeId}
        </div>
        <input 
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Make it glow with blue fire..."
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'white',
            outline: 'none',
            fontSize: '14px'
          }}
        />
      </form>
    </div>
  );
};
