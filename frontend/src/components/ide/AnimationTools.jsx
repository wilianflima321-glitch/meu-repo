import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useIDEStore } from '@/store/ideStore';
import { createAnimation, addAnimationTrack, addKeyframe, deleteAnimation, getAnimations } from '@/services/api';
import { 
  Play, Pause, Square, SkipBack, SkipForward, Plus, Trash2, 
  Circle, ChevronRight, ChevronDown, Layers, Maximize2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const AnimationTools = () => {
  const {
    currentProject, animations, setAnimations, currentAnimation, setCurrentAnimation,
    animationPlaying, setAnimationPlaying, animationTime, setAnimationTime
  } = useIDEStore();
  
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [zoom, setZoom] = useState(1);
  const timelineRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(0);
  
  // Load animations
  useEffect(() => {
    if (currentProject?.id) {
      loadAnimations();
    }
  }, [currentProject?.id]);
  
  const loadAnimations = async () => {
    try {
      const response = await getAnimations(currentProject.id);
      setAnimations(response.data);
      if (response.data.length > 0 && !currentAnimation) {
        setCurrentAnimation(response.data[0]);
      }
    } catch (err) {
      console.error('Failed to load animations:', err);
    }
  };
  
  // Animation loop
  useEffect(() => {
    if (animationPlaying && currentAnimation) {
      const animate = (timestamp) => {
        if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
        const delta = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;
        
        let newTime = animationTime + delta;
        if (newTime >= currentAnimation.duration) {
          newTime = 0; // Loop
        }
        setAnimationTime(newTime);
        
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      lastTimeRef.current = 0;
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animationPlaying, currentAnimation, animationTime]);
  
  const handleCreateAnimation = async () => {
    if (!currentProject?.id) return;
    try {
      const response = await createAnimation(currentProject.id, {
        name: `Animation ${animations.length + 1}`,
        duration: 5.0,
        fps: 60
      });
      setAnimations([...animations, response.data]);
      setCurrentAnimation(response.data);
    } catch (err) {
      console.error('Failed to create animation:', err);
    }
  };
  
  const handleAddTrack = async () => {
    if (!currentAnimation) return;
    try {
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
      const response = await addAnimationTrack(
        currentAnimation.id,
        `Track ${(currentAnimation.tracks?.length || 0) + 1}`,
        'transform',
        colors[(currentAnimation.tracks?.length || 0) % colors.length]
      );
      
      const updatedAnimation = {
        ...currentAnimation,
        tracks: [...(currentAnimation.tracks || []), response.data]
      };
      setCurrentAnimation(updatedAnimation);
    } catch (err) {
      console.error('Failed to add track:', err);
    }
  };
  
  const handleAddKeyframe = async (trackId, time, value) => {
    if (!currentAnimation) return;
    try {
      await addKeyframe(currentAnimation.id, {
        track_id: trackId,
        time,
        value,
        easing: 'ease-in-out'
      });
      await loadAnimations();
    } catch (err) {
      console.error('Failed to add keyframe:', err);
    }
  };
  
  const handleTimelineClick = (e) => {
    if (!timelineRef.current || !currentAnimation) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * currentAnimation.duration;
    setAnimationTime(Math.max(0, Math.min(time, currentAnimation.duration)));
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * (currentAnimation?.fps || 60));
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-white">Animation Timeline</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreateAnimation} data-testid="new-animation">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Animation Selector */}
      {animations.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
          <select
            value={currentAnimation?.id || ''}
            onChange={(e) => setCurrentAnimation(animations.find(a => a.id === e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
            data-testid="animation-selector"
          >
            {animations.map(anim => (
              <option key={anim.id} value={anim.id}>{anim.name}</option>
            ))}
          </select>
          <span className="text-xs text-zinc-500">
            {currentAnimation?.duration}s @ {currentAnimation?.fps}fps
          </span>
        </div>
      )}
      
      {/* Transport Controls */}
      <div className="flex items-center justify-center gap-2 px-3 py-2 border-b border-zinc-800">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setAnimationTime(0)}
          data-testid="anim-skip-start"
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setAnimationPlaying(!animationPlaying)}
          data-testid="anim-play-pause"
        >
          {animationPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => { setAnimationPlaying(false); setAnimationTime(0); }}
          data-testid="anim-stop"
        >
          <Square className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setAnimationTime(currentAnimation?.duration || 0)}
          data-testid="anim-skip-end"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
        <div className="text-xs font-mono text-zinc-400 ml-2">
          {formatTime(animationTime)} / {formatTime(currentAnimation?.duration || 0)}
        </div>
      </div>
      
      {/* Timeline */}
      {currentAnimation ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Track Headers + Timeline Grid */}
          <div className="flex flex-1 overflow-hidden">
            {/* Track List */}
            <div className="w-40 border-r border-zinc-800 flex flex-col">
              <div className="h-8 border-b border-zinc-800 flex items-center px-2">
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAddTrack} data-testid="add-track">
                  <Plus className="w-3 h-3 mr-1" /> Track
                </Button>
              </div>
              <ScrollArea className="flex-1">
                {currentAnimation.tracks?.map((track, i) => (
                  <div
                    key={track.id}
                    className={cn(
                      "h-10 flex items-center gap-2 px-2 border-b border-zinc-800 cursor-pointer",
                      selectedTrack === track.id && "bg-zinc-800"
                    )}
                    onClick={() => setSelectedTrack(track.id)}
                    data-testid={`track-${i}`}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: track.color }} />
                    <span className="text-xs text-zinc-300 truncate">{track.name}</span>
                  </div>
                ))}
              </ScrollArea>
            </div>
            
            {/* Timeline Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Time Ruler */}
              <div
                ref={timelineRef}
                className="h-8 border-b border-zinc-800 relative cursor-pointer bg-zinc-800/30"
                onClick={handleTimelineClick}
              >
                {/* Time markers */}
                {Array.from({ length: Math.ceil(currentAnimation.duration) + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full border-l border-zinc-700 text-xs text-zinc-500 px-1"
                    style={{ left: `${(i / currentAnimation.duration) * 100}%` }}
                  >
                    {i}s
                  </div>
                ))}
                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: `${(animationTime / currentAnimation.duration) * 100}%` }}
                >
                  <div className="w-3 h-3 bg-red-500 -ml-1 -mt-1 rotate-45" />
                </div>
              </div>
              
              {/* Keyframe Grid */}
              <ScrollArea className="flex-1">
                {currentAnimation.tracks?.map((track, i) => (
                  <div
                    key={track.id}
                    className="h-10 border-b border-zinc-800 relative"
                    onDoubleClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const time = (x / rect.width) * currentAnimation.duration;
                      handleAddKeyframe(track.id, time, 0);
                    }}
                  >
                    {/* Keyframes */}
                    {track.keyframes?.map((kf, j) => (
                      <div
                        key={kf.id}
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 cursor-pointer hover:scale-125 transition-transform"
                        style={{
                          left: `calc(${(kf.time / currentAnimation.duration) * 100}% - 6px)`,
                          backgroundColor: track.color,
                          borderColor: 'white'
                        }}
                        title={`${kf.time.toFixed(2)}s: ${kf.value}`}
                        data-testid={`keyframe-${i}-${j}`}
                      />
                    ))}
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
          
          {/* Zoom Control */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">Zoom:</span>
            <Slider
              value={[zoom]}
              min={0.5}
              max={4}
              step={0.1}
              onValueChange={([v]) => setZoom(v)}
              className="w-24"
              data-testid="timeline-zoom"
            />
            <span className="text-xs text-zinc-400">{zoom.toFixed(1)}x</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
          <div className="text-center">
            <Layers className="w-12 h-12 mx-auto mb-2 text-zinc-600" />
            <p>No animation selected</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleCreateAnimation}>
              Create Animation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimationTools;
