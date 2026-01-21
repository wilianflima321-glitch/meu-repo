/**
 * AETHEL ENGINE - Pixel Streaming React Component
 * 
 * Full-featured React component for cloud GPU streaming.
 * Provides UI for connection status, quality controls, and stats overlay.
 * 
 * @version 2.0.0
 */

'use client';

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { 
    usePixelStreaming, 
    PixelStreamingConfig, 
    StreamingStats 
} from '@/lib/pixel-streaming';
import { cn } from '@/lib/utils';
import { 
    Play, 
    Pause, 
    Settings, 
    Maximize2, 
    Minimize2,
    Volume2,
    VolumeX,
    Wifi,
    WifiOff,
    BarChart3,
    Gamepad2,
    Monitor,
    Zap,
    AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/ui/Tooltip';
import { Badge } from '@/components/ui/Badge';

// ============================================================================
// TYPES
// ============================================================================

export interface PixelStreamViewProps {
    /** Streaming server URL */
    serverUrl?: string;
    
    /** Initial configuration */
    config?: Partial<PixelStreamingConfig>;
    
    /** Auto-connect on mount */
    autoConnect?: boolean;
    
    /** Show stats overlay */
    showStats?: boolean;
    
    /** Show quality controls */
    showControls?: boolean;
    
    /** Show fullscreen button */
    allowFullscreen?: boolean;
    
    /** Custom CSS class */
    className?: string;
    
    /** Callback when connected */
    onConnected?: () => void;
    
    /** Callback when disconnected */
    onDisconnected?: () => void;
    
    /** Callback on error */
    onError?: (error: string) => void;
    
    /** Callback on stats update */
    onStatsUpdate?: (stats: StreamingStats) => void;
}

// ============================================================================
// QUALITY PRESETS
// ============================================================================

const QUALITY_PRESETS = {
    'ultra': { width: 3840, height: 2160, fps: 60, bitrate: 50000, label: 'Ultra 4K' },
    'high': { width: 2560, height: 1440, fps: 60, bitrate: 25000, label: 'High 1440p' },
    'medium': { width: 1920, height: 1080, fps: 60, bitrate: 15000, label: 'Medium 1080p' },
    'low': { width: 1280, height: 720, fps: 30, bitrate: 5000, label: 'Low 720p' },
    'auto': { width: 1920, height: 1080, fps: 60, bitrate: 15000, label: 'Auto' }
} as const;

type QualityPreset = keyof typeof QUALITY_PRESETS;

// ============================================================================
// STATS OVERLAY COMPONENT
// ============================================================================

const StatsOverlay = memo(function StatsOverlay({ 
    stats, 
    visible 
}: { 
    stats: StreamingStats | null;
    visible: boolean;
}) {
    if (!visible || !stats) return null;
    
    const getQualityColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };
    
    const getLatencyColor = (rtt: number) => {
        if (rtt < 30) return 'text-green-400';
        if (rtt < 60) return 'text-yellow-400';
        return 'text-red-400';
    };
    
    return (
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-xs font-mono text-white z-20 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20">
                <BarChart3 className="w-4 h-4" />
                <span className="font-semibold">Stream Stats</span>
            </div>
            
            <div className="space-y-1">
                <div className="flex justify-between">
                    <span className="text-gray-400">Resolution:</span>
                    <span>{stats.resolution.width}x{stats.resolution.height}</span>
                </div>
                
                <div className="flex justify-between">
                    <span className="text-gray-400">FPS:</span>
                    <span>{stats.fps}</span>
                </div>
                
                <div className="flex justify-between">
                    <span className="text-gray-400">Bitrate:</span>
                    <span>{(stats.bitrate / 1000).toFixed(1)} Mbps</span>
                </div>
                
                <div className="flex justify-between">
                    <span className="text-gray-400">Latency:</span>
                    <span className={getLatencyColor(stats.rtt)}>
                        {stats.rtt.toFixed(0)} ms
                    </span>
                </div>
                
                <div className="flex justify-between">
                    <span className="text-gray-400">Codec:</span>
                    <span className="uppercase">{stats.codec}</span>
                </div>
                
                <div className="flex justify-between">
                    <span className="text-gray-400">Frames:</span>
                    <span>
                        {stats.framesDecoded.toLocaleString()}
                        {stats.framesDropped > 0 && (
                            <span className="text-red-400 ml-1">
                                (-{stats.framesDropped})
                            </span>
                        )}
                    </span>
                </div>
                
                <div className="flex justify-between items-center pt-1 border-t border-white/20 mt-1">
                    <span className="text-gray-400">Quality:</span>
                    <span className={cn('font-bold', getQualityColor(stats.qualityScore))}>
                        {stats.qualityScore}%
                    </span>
                </div>
            </div>
        </div>
    );
});

// ============================================================================
// CONNECTION OVERLAY
// ============================================================================

const ConnectionOverlay = memo(function ConnectionOverlay({
    isConnected,
    isStreaming,
    error,
    onConnect,
    onRetry
}: {
    isConnected: boolean;
    isStreaming: boolean;
    error: string | null;
    onConnect: () => void;
    onRetry: () => void;
}) {
    if (isStreaming) return null;
    
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30">
            <div className="text-center space-y-4">
                {error ? (
                    <>
                        <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>
                        <div className="text-red-400 font-medium">Connection Failed</div>
                        <div className="text-gray-400 text-sm max-w-xs">{error}</div>
                        <Button 
                            onClick={onRetry}
                            variant="outline"
                            className="mt-4"
                        >
                            Try Again
                        </Button>
                    </>
                ) : isConnected ? (
                    <>
                        <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
                            <Monitor className="w-8 h-8 text-blue-400" />
                        </div>
                        <div className="text-white font-medium">Initializing Stream...</div>
                        <div className="text-gray-400 text-sm">Connecting to render server</div>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <Play className="w-10 h-10 text-white ml-1" />
                        </div>
                        <div className="text-white font-medium text-lg">Cloud Rendering</div>
                        <div className="text-gray-400 text-sm max-w-xs">
                            Stream AAA graphics from cloud GPU directly to your browser
                        </div>
                        <Button 
                            onClick={onConnect}
                            className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            size="lg"
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            Start Streaming
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
});

// ============================================================================
// CONTROLS BAR
// ============================================================================

const ControlsBar = memo(function ControlsBar({
    stats,
    isStreaming,
    isMuted,
    isFullscreen,
    showStats,
    quality,
    onToggleMute,
    onToggleFullscreen,
    onToggleStats,
    onQualityChange,
    onDisconnect
}: {
    stats: StreamingStats | null;
    isStreaming: boolean;
    isMuted: boolean;
    isFullscreen: boolean;
    showStats: boolean;
    quality: QualityPreset;
    onToggleMute: () => void;
    onToggleFullscreen: () => void;
    onToggleStats: () => void;
    onQualityChange: (preset: QualityPreset) => void;
    onDisconnect: () => void;
}) {
    if (!isStreaming) return null;
    
    const getConnectionBadge = () => {
        if (!stats) return null;
        
        if (stats.qualityScore >= 80) {
            return <Badge variant="default" className="bg-green-600">Excellent</Badge>;
        } else if (stats.qualityScore >= 50) {
            return <Badge variant="default" className="bg-yellow-600">Good</Badge>;
        } else {
            return <Badge variant="default" className="bg-red-600">Poor</Badge>;
        }
    };
    
    return (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity z-20">
            <div className="flex items-center justify-between">
                {/* Left controls */}
                <div className="flex items-center gap-2">
                    <Tooltip content="Stop Stream">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={onDisconnect}
                        >
                            <Pause className="w-5 h-5" />
                        </Button>
                    </Tooltip>
                    
                    <Tooltip content={isMuted ? 'Unmute' : 'Mute'}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={onToggleMute}
                        >
                            {isMuted ? (
                                <VolumeX className="w-5 h-5" />
                            ) : (
                                <Volume2 className="w-5 h-5" />
                            )}
                        </Button>
                    </Tooltip>
                    
                    {getConnectionBadge()}
                </div>
                
                {/* Center - Stats */}
                <div className="flex items-center gap-4 text-sm text-white/80">
                    {stats && (
                        <>
                            <span>{stats.resolution.width}x{stats.resolution.height}</span>
                            <span>{stats.fps} FPS</span>
                            <span>{stats.rtt.toFixed(0)}ms</span>
                        </>
                    )}
                </div>
                
                {/* Right controls */}
                <div className="flex items-center gap-2">
                    <Tooltip content="Toggle Stats">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "text-white hover:bg-white/20",
                                showStats && "bg-white/20"
                            )}
                            onClick={onToggleStats}
                        >
                            <BarChart3 className="w-5 h-5" />
                        </Button>
                    </Tooltip>
                    
                    {/* Quality selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/20"
                            >
                                <Settings className="w-5 h-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <div className="px-2 py-1.5 text-sm font-semibold">Quality Preset</div>
                            <DropdownMenuSeparator />
                            {Object.entries(QUALITY_PRESETS).map(([key, preset]) => (
                                <DropdownMenuItem
                                    key={key}
                                    onClick={() => onQualityChange(key as QualityPreset)}
                                    className={cn(quality === key && "bg-accent")}
                                >
                                    {preset.label}
                                    {key === 'auto' && (
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                            Recommended
                                        </Badge>
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Tooltip content={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={onToggleFullscreen}
                        >
                            {isFullscreen ? (
                                <Minimize2 className="w-5 h-5" />
                            ) : (
                                <Maximize2 className="w-5 h-5" />
                            )}
                        </Button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PixelStreamView({
    serverUrl,
    config,
    autoConnect = false,
    showStats: initialShowStats = false,
    showControls = true,
    allowFullscreen = true,
    className,
    onConnected,
    onDisconnected,
    onError,
    onStatsUpdate
}: PixelStreamViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [showStatsOverlay, setShowStatsOverlay] = useState(initialShowStats);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [quality, setQuality] = useState<QualityPreset>('auto');
    
    // Initialize streaming client
    const streamConfig: Partial<PixelStreamingConfig> = {
        ...config,
        ...(serverUrl && { serverUrl })
    };
    
    const {
        client,
        stats,
        isConnected,
        isStreaming,
        connect,
        disconnect,
        error
    } = usePixelStreaming({
        config: streamConfig,
        autoConnect
    });
    
    // Callbacks
    useEffect(() => {
        if (isConnected && onConnected) {
            onConnected();
        }
    }, [isConnected, onConnected]);
    
    useEffect(() => {
        if (!isConnected && onDisconnected) {
            onDisconnected();
        }
    }, [isConnected, onDisconnected]);
    
    useEffect(() => {
        if (error && onError) {
            onError(error);
        }
    }, [error, onError]);
    
    useEffect(() => {
        if (stats && onStatsUpdate) {
            onStatsUpdate(stats);
        }
    }, [stats, onStatsUpdate]);
    
    // Fullscreen handling
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);
    
    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;
        
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else {
            await containerRef.current.requestFullscreen();
        }
    }, []);
    
    // Quality change
    const handleQualityChange = useCallback((preset: QualityPreset) => {
        setQuality(preset);
        
        if (client && preset !== 'auto') {
            const settings = QUALITY_PRESETS[preset];
            client.requestQualityChange({
                width: settings.width,
                height: settings.height,
                fps: settings.fps,
                bitrate: settings.bitrate
            });
        }
    }, [client]);
    
    // Mute toggle
    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
        
        const videoElement = client?.getVideoElement();
        if (videoElement) {
            videoElement.muted = !isMuted;
        }
    }, [client, isMuted]);
    
    // Handle reconnect
    const handleRetry = useCallback(() => {
        connect();
    }, [connect]);
    
    // Attach video when streaming starts
    useEffect(() => {
        if (containerRef.current && client && isStreaming) {
            client.attachTo(containerRef.current);
        }
    }, [client, isStreaming]);
    
    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative w-full h-full bg-black overflow-hidden",
                "focus:outline-none",
                className
            )}
            tabIndex={0}
        >
            {/* Video will be appended here by client.attachTo() */}
            
            {/* Stats Overlay */}
            <StatsOverlay 
                stats={stats} 
                visible={showStatsOverlay && isStreaming} 
            />
            
            {/* Connection Overlay */}
            <ConnectionOverlay
                isConnected={isConnected}
                isStreaming={isStreaming}
                error={error}
                onConnect={connect}
                onRetry={handleRetry}
            />
            
            {/* Controls Bar */}
            {showControls && (
                <ControlsBar
                    stats={stats}
                    isStreaming={isStreaming}
                    isMuted={isMuted}
                    isFullscreen={isFullscreen}
                    showStats={showStatsOverlay}
                    quality={quality}
                    onToggleMute={toggleMute}
                    onToggleFullscreen={toggleFullscreen}
                    onToggleStats={() => setShowStatsOverlay(prev => !prev)}
                    onQualityChange={handleQualityChange}
                    onDisconnect={disconnect}
                />
            )}
            
            {/* Latency Warning */}
            {stats && stats.rtt > 100 && isStreaming && (
                <div className="absolute top-4 right-4 bg-yellow-500/90 text-black px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 z-20">
                    <AlertTriangle className="w-4 h-4" />
                    High Latency: {stats.rtt.toFixed(0)}ms
                </div>
            )}
        </div>
    );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PixelStreamView;
