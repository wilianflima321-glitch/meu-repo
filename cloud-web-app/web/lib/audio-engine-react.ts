'use client';

import type { AudioChannel, AudioInstance, AudioTrack, PlayOptions } from './audio-engine'
import { getAudioEngine } from './audio-engine'
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useAudio() {
    const engine = useMemo(() => getAudioEngine(), []);
    const [activeInstances, setActiveInstances] = useState<AudioInstance[]>([]);
    const [channelVolumes, setChannelVolumes] = useState<Record<AudioChannel, number>>({
        master: 1,
        bgm: 0.8,
        sfx: 0.8,
        ambient: 0.8,
        voice: 0.8,
        ui: 0.8
    });

    useEffect(() => {
        const updateInstances = () => {
            setActiveInstances(engine.getActiveInstances());
        };

        const updateVolume = (data: { channel: AudioChannel; volume: number }) => {
            setChannelVolumes(prev => ({ ...prev, [data.channel]: data.volume }));
        };

        const unsub1 = engine.on('play', updateInstances);
        const unsub2 = engine.on('stop', updateInstances);
        const unsub3 = engine.on('end', updateInstances);
        const unsub4 = engine.on('channel-volume', updateVolume);

        return () => {
            unsub1();
            unsub2();
            unsub3();
            unsub4();
        };
    }, [engine]);

    const play = useCallback((trackId: string, options?: PlayOptions) => {
        return engine.play(trackId, options);
    }, [engine]);

    const stop = useCallback((instanceId: string, fade?: number) => {
        engine.stop(instanceId, fade);
    }, [engine]);

    const pause = useCallback((instanceId: string) => {
        engine.pause(instanceId);
    }, [engine]);

    const resume = useCallback((instanceId: string) => {
        engine.resume(instanceId);
    }, [engine]);

    const setVolume = useCallback((channel: AudioChannel, volume: number) => {
        engine.setChannelVolume(channel, volume);
    }, [engine]);

    const register = useCallback((track: AudioTrack) => {
        engine.register(track);
    }, [engine]);

    return {
        engine,
        activeInstances,
        channelVolumes,
        play,
        stop,
        pause,
        resume,
        setVolume,
        register,
        setPlaylist: engine.setPlaylist.bind(engine),
        startPlaylist: engine.startPlaylist.bind(engine),
        nextTrack: engine.playNextInPlaylist.bind(engine),
        prevTrack: engine.playPreviousInPlaylist.bind(engine)
    };
}
