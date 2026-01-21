/**
 * AETHEL ENGINE - Audio Preview System
 * 
 * Complete audio preview component with:
 * - Waveform visualization (Web Audio API)
 * - Play/Pause/Seek controls
 * - Volume control
 * - Loop toggle
 * - Keyboard shortcuts
 * - Mini player for asset cards
 */

'use client';

import React, { 
    useState, 
    useRef, 
    useEffect, 
    useCallback, 
    forwardRef,
    useImperativeHandle 
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
    Volume1, Repeat, Download, Music, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/slider';
import { Tooltip } from '@/components/ui/Tooltip';

// ============================================================================
// Types
// ============================================================================

interface AudioPreviewProps {
    src: string;
    title?: string;
    artist?: string;
    duration?: number;
    waveformData?: number[];
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onTimeUpdate?: (currentTime: number) => void;
    autoPlay?: boolean;
    loop?: boolean;
    showDownload?: boolean;
    variant?: 'full' | 'compact' | 'mini';
    className?: string;
}

export interface AudioPreviewRef {
    play: () => void;
    pause: () => void;
    toggle: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
}

// ============================================================================
// Waveform Component
// ============================================================================

interface WaveformProps {
    audioBuffer: AudioBuffer | null;
    currentTime: number;
    duration: number;
    isLoading: boolean;
    onSeek: (time: number) => void;
    className?: string;
}

function Waveform({ 
    audioBuffer, 
    currentTime, 
    duration, 
    isLoading,
    onSeek,
    className 
}: WaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const [hoveredTime, setHoveredTime] = useState<number | null>(null);

    // Generate waveform data from audio buffer
    useEffect(() => {
        if (!audioBuffer) return;

        const rawData = audioBuffer.getChannelData(0);
        const samples = 200; // Number of bars
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];

        for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(rawData[i * blockSize + j]);
            }
            filteredData.push(sum / blockSize);
        }

        // Normalize
        const maxVal = Math.max(...filteredData);
        const normalized = filteredData.map(d => d / maxVal);
        setWaveformData(normalized);
    }, [audioBuffer]);

    // Draw waveform
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || waveformData.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const barWidth = width / waveformData.length;
        const progressPercent = duration > 0 ? currentTime / duration : 0;

        ctx.clearRect(0, 0, width, height);

        waveformData.forEach((value, index) => {
            const barHeight = value * (height * 0.8);
            const x = index * barWidth;
            const y = (height - barHeight) / 2;
            
            // Determine color based on playback position
            const isPlayed = (index / waveformData.length) <= progressPercent;
            const isHovered = hoveredTime !== null && 
                (index / waveformData.length) <= (hoveredTime / duration);

            if (isPlayed) {
                ctx.fillStyle = 'hsl(var(--primary))';
            } else if (isHovered) {
                ctx.fillStyle = 'hsl(var(--primary) / 0.5)';
            } else {
                ctx.fillStyle = 'hsl(var(--muted-foreground) / 0.3)';
            }

            // Draw bar with rounded corners
            const radius = Math.min(barWidth * 0.3, 2);
            ctx.beginPath();
            ctx.roundRect(x + 1, y, barWidth - 2, barHeight, radius);
            ctx.fill();
        });
    }, [waveformData, currentTime, duration, hoveredTime]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const container = containerRef.current;
        if (!container || duration === 0) return;

        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = clickX / rect.width;
        onSeek(percent * duration);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const container = containerRef.current;
        if (!container || duration === 0) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        setHoveredTime(percent * duration);
    };

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative w-full h-16 cursor-pointer group",
                className
            )}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredTime(null)}
        >
            {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : waveformData.length === 0 ? (
                <div className="absolute inset-0 flex items-center">
                    {/* Fallback progress bar */}
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                    </div>
                </div>
            ) : (
                <canvas 
                    ref={canvasRef} 
                    className="w-full h-full"
                />
            )}

            {/* Hover time indicator */}
            {hoveredTime !== null && (
                <div 
                    className="absolute bottom-full mb-2 px-2 py-1 text-xs bg-popover text-popover-foreground rounded shadow-lg pointer-events-none"
                    style={{ 
                        left: `${(hoveredTime / duration) * 100}%`,
                        transform: 'translateX(-50%)'
                    }}
                >
                    {formatTime(hoveredTime)}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Helpers
// ============================================================================

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function VolumeIcon({ volume, muted }: { volume: number; muted: boolean }) {
    if (muted || volume === 0) return <VolumeX className="w-4 h-4" />;
    if (volume < 0.5) return <Volume1 className="w-4 h-4" />;
    return <Volume2 className="w-4 h-4" />;
}

// ============================================================================
// Main Component
// ============================================================================

const AudioPreview = forwardRef<AudioPreviewRef, AudioPreviewProps>(({
    src,
    title,
    artist,
    duration: initialDuration,
    waveformData,
    onPlay,
    onPause,
    onEnded,
    onTimeUpdate,
    autoPlay = false,
    loop = false,
    showDownload = true,
    variant = 'full',
    className,
}, ref) => {
    // Refs
    const audioRef = useRef<HTMLAudioElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    
    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(initialDuration || 0);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [isLooped, setIsLooped] = useState(loop);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);

    // Load audio and analyze for waveform
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        setIsLoading(true);
        setError(null);

        // Load audio for waveform analysis
        const loadAudioBuffer = async () => {
            try {
                if (!audioContextRef.current) {
                    audioContextRef.current = new AudioContext();
                }
                
                const response = await fetch(src);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                setAudioBuffer(buffer);
            } catch (err) {
                console.warn('Failed to load waveform:', err);
            }
        };

        loadAudioBuffer();

        // Event listeners
        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
            setIsLoading(false);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            onTimeUpdate?.(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            onEnded?.();
        };

        const handleError = () => {
            setError('Failed to load audio');
            setIsLoading(false);
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
        };
    }, [src, onTimeUpdate, onEnded]);

    // Auto play
    useEffect(() => {
        if (autoPlay && audioRef.current && !isLoading) {
            play();
        }
    }, [autoPlay, isLoading]);

    // Update audio properties
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
            audioRef.current.loop = isLooped;
        }
    }, [volume, isMuted, isLooped]);

    // Controls
    const play = useCallback(() => {
        audioRef.current?.play();
        setIsPlaying(true);
        onPlay?.();
    }, [onPlay]);

    const pause = useCallback(() => {
        audioRef.current?.pause();
        setIsPlaying(false);
        onPause?.();
    }, [onPause]);

    const toggle = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }, [isPlaying, play, pause]);

    const seek = useCallback((time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    }, []);

    const skipBack = useCallback(() => {
        seek(Math.max(0, currentTime - 10));
    }, [currentTime, seek]);

    const skipForward = useCallback(() => {
        seek(Math.min(duration, currentTime + 10));
    }, [currentTime, duration, seek]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        play,
        pause,
        toggle,
        seek,
        setVolume: (v: number) => setVolume(v),
    }), [play, pause, toggle, seek]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    toggle();
                    break;
                case 'ArrowLeft':
                    skipBack();
                    break;
                case 'ArrowRight':
                    skipForward();
                    break;
                case 'm':
                    setIsMuted(m => !m);
                    break;
                case 'l':
                    setIsLooped(l => !l);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggle, skipBack, skipForward]);

    // =========================================================================
    // Render Variants
    // =========================================================================

    // Mini player (for asset cards)
    if (variant === 'mini') {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <audio ref={audioRef} src={src} preload="metadata" />
                
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggle();
                    }}
                    disabled={isLoading || !!error}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : error ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : isPlaying ? (
                        <Pause className="w-4 h-4" />
                    ) : (
                        <Play className="w-4 h-4" />
                    )}
                </Button>
                
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                </div>
                
                <span className="text-xs text-muted-foreground tabular-nums">
                    {formatTime(currentTime)}
                </span>
            </div>
        );
    }

    // Compact player
    if (variant === 'compact') {
        return (
            <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted/50", className)}>
                <audio ref={audioRef} src={src} preload="metadata" />
                
                {/* Album art placeholder */}
                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Music className="w-6 h-6 text-muted-foreground" />
                </div>
                
                {/* Info and controls */}
                <div className="flex-1 min-w-0">
                    {title && (
                        <p className="font-medium text-sm truncate">{title}</p>
                    )}
                    {artist && (
                        <p className="text-xs text-muted-foreground truncate">{artist}</p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={toggle}
                            disabled={isLoading || !!error}
                        >
                            {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isPlaying ? (
                                <Pause className="w-3 h-3" />
                            ) : (
                                <Play className="w-3 h-3" />
                            )}
                        </Button>
                        
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden cursor-pointer">
                            <div 
                                className="h-full bg-primary transition-all"
                                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                            />
                        </div>
                        
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // Full player
    return (
        <div className={cn("p-4 rounded-lg bg-card border", className)}>
            <audio ref={audioRef} src={src} preload="metadata" />
            
            {/* Header */}
            {(title || artist) && (
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <Music className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        {title && (
                            <h3 className="font-semibold truncate">{title}</h3>
                        )}
                        {artist && (
                            <p className="text-sm text-muted-foreground truncate">{artist}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="flex items-center justify-center gap-2 py-8 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Waveform */}
            {!error && (
                <Waveform
                    audioBuffer={audioBuffer}
                    currentTime={currentTime}
                    duration={duration}
                    isLoading={isLoading}
                    onSeek={seek}
                    className="mb-4"
                />
            )}

            {/* Time display */}
            <div className="flex justify-between text-sm text-muted-foreground mb-4">
                <span className="tabular-nums">{formatTime(currentTime)}</span>
                <span className="tabular-nums">{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
                {/* Loop button */}
                <Tooltip content={isLooped ? 'Disable loop (L)' : 'Enable loop (L)'}>
                    <Button
                        size="icon"
                        variant={isLooped ? "secondary" : "ghost"}
                        onClick={() => setIsLooped(!isLooped)}
                    >
                        <Repeat className={cn(
                            "w-4 h-4",
                            isLooped && "text-primary"
                        )} />
                    </Button>
                </Tooltip>

                {/* Skip back */}
                <Tooltip content="Back 10s (←)">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={skipBack}
                        disabled={isLoading}
                    >
                        <SkipBack className="w-4 h-4" />
                    </Button>
                </Tooltip>

                {/* Play/Pause */}
                <Button
                    size="icon"
                    className="h-12 w-12"
                    onClick={toggle}
                    disabled={isLoading || !!error}
                >
                    {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="w-6 h-6" />
                    ) : (
                        <Play className="w-6 h-6 ml-1" />
                    )}
                </Button>

                {/* Skip forward */}
                <Tooltip content="Forward 10s (→)">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={skipForward}
                        disabled={isLoading}
                    >
                        <SkipForward className="w-4 h-4" />
                    </Button>
                </Tooltip>

                {/* Volume */}
                <div 
                    className="relative"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                >
                    <Tooltip content="Mute (M)">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setIsMuted(!isMuted)}
                        >
                            <VolumeIcon volume={volume} muted={isMuted} />
                        </Button>
                    </Tooltip>

                    <AnimatePresence>
                        {showVolumeSlider && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-popover border rounded-lg shadow-lg"
                            >
                                <Slider
                                    value={[isMuted ? 0 : volume * 100]}
                                    max={100}
                                    step={1}
                                    orientation="vertical"
                                    className="h-24"
                                    onValueChange={([v]) => {
                                        setVolume(v / 100);
                                        if (v > 0) setIsMuted(false);
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Download button */}
            {showDownload && (
                <div className="flex justify-center mt-4">
                    <Button variant="outline" size="sm" asChild>
                        <a href={src} download>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </a>
                    </Button>
                </div>
            )}
        </div>
    );
});

AudioPreview.displayName = 'AudioPreview';

export default AudioPreview;

// ============================================================================
// Audio Preview Hook
// ============================================================================

export function useAudioPreview(src: string) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio(src);
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => {
            setDuration(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
            setCurrentTime(audio.currentTime);
        });

        audio.addEventListener('ended', () => {
            setIsPlaying(false);
        });

        return () => {
            audio.pause();
            audio.src = '';
        };
    }, [src]);

    const play = useCallback(() => {
        audioRef.current?.play();
        setIsPlaying(true);
    }, []);

    const pause = useCallback(() => {
        audioRef.current?.pause();
        setIsPlaying(false);
    }, []);

    const toggle = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }, [isPlaying, play, pause]);

    const seek = useCallback((time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    }, []);

    return {
        isPlaying,
        currentTime,
        duration,
        play,
        pause,
        toggle,
        seek,
        progress: duration > 0 ? (currentTime / duration) * 100 : 0,
    };
}
