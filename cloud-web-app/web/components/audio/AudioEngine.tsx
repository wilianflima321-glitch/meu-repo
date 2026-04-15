/**
 * Waveform Renderer - Renderizacao REAL de Audio Waveform
 *
 * Usa Canvas 2D para renderizar waveform de audio.
 * Funciona com Web Audio API.
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface WaveformProps {
  audioBuffer?: AudioBuffer;
  audioUrl?: string;
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  progress?: number; // 0-1
  onSeek?: (position: number) => void;
}

export function WaveformRenderer({
  audioBuffer,
  audioUrl,
  width = 800,
  height = 128,
  color = 'var(--aethel-primary)',
  backgroundColor = 'var(--aethel-surface-tertiary)',
  progress = 0,
  onSeek,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(audioBuffer || null);
  const [isLoading, setIsLoading] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);

  // Carregar audio de URL
  useEffect(() => {
    if (audioUrl && !audioBuffer) {
      setIsLoading(true);
      const audioContext = new AudioContext();

      fetch(audioUrl)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(decodedBuffer => {
          setBuffer(decodedBuffer);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Erro ao carregar audio:', err);
          setIsLoading(false);
        });
    }
  }, [audioUrl, audioBuffer]);

  // Calcular peaks
  useEffect(() => {
    if (!buffer) return;

    const channelData = buffer.getChannelData(0);
    const samplesPerPixel = Math.floor(channelData.length / width);
    const newPeaks: number[] = [];

    for (let i = 0; i < width; i++) {
      const start = i * samplesPerPixel;
      const end = start + samplesPerPixel;

      let min = 0;
      let max = 0;

      for (let j = start; j < end && j < channelData.length; j++) {
        const sample = channelData[j];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }

      // Normalizar para 0-1
      newPeaks.push(Math.max(Math.abs(min), Math.abs(max)));
    }

    setPeaks(newPeaks);
  }, [buffer, width]);

  // Renderizar waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const centerY = height / 2;
    const barWidth = 2;
    const gap = 1;
    const maxBarHeight = height * 0.9;

    peaks.forEach((peak, i) => {
      const x = i * (barWidth + gap);
      const barHeight = peak * maxBarHeight;

      // Cor baseada no progresso
      const progressX = progress * width;
      ctx.fillStyle = x < progressX ? 'var(--aethel-primary-light)' : color;

      // Desenhar barra simetrica
      ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
    });

    // Linha central
    ctx.strokeStyle = 'var(--aethel-text-quaternary)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Playhead
    if (progress > 0) {
      const playheadX = progress * width;
      ctx.strokeStyle = 'var(--aethel-text-primary)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [peaks, progress, width, height, color, backgroundColor]);

  // Handle click para seek
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = x / width;

    onSeek(Math.max(0, Math.min(1, position)));
  }, [onSeek, width]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-[var(--aethel-surface-tertiary)] rounded"
        style={{ width, height }}
      >
        <span className="text-[var(--aethel-text-tertiary)] text-sm">Carregando audio...</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      className="rounded cursor-pointer"
      style={{ width, height }}
    />
  );
}

/**
 * Audio Mixer Channel - Canal individual do mixer
 */
interface MixerChannelProps {
  name: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  onVolumeChange: (volume: number) => void;
  onPanChange: (pan: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  peakLevel: number;
}

export function MixerChannel({
  name,
  volume,
  pan,
  muted,
  solo,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  peakLevel,
}: MixerChannelProps) {
  return (
    <div className="flex flex-col items-center p-2 bg-[var(--aethel-surface-tertiary)] rounded w-20 gap-2">
      {/* Nome */}
      <span className="text-xs text-[var(--aethel-text-secondary)] truncate w-full text-center">{name}</span>

      {/* Meter */}
      <div className="w-4 h-32 bg-[var(--aethel-surface-secondary)] rounded relative">
        <div
          className={`absolute bottom-0 w-full rounded transition-all ${
            peakLevel > 0.9 ? 'bg-[var(--aethel-error)]' : peakLevel > 0.7 ? 'bg-[var(--aethel-warning)]' : 'bg-[var(--aethel-success)]'
          }`}
          style={{ height: `${peakLevel * 100}%` }}
        />
      </div>

      {/* Volume Slider */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        className="w-full h-2"
        style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '80px' }}
      />

      {/* dB Label */}
      <span className="text-xs text-[var(--aethel-text-tertiary)]">
        {volume === 0 ? '-' : `${(20 * Math.log10(volume)).toFixed(1)}`}dB
      </span>

      {/* Pan */}
      <input
        type="range"
        min="-1"
        max="1"
        step="0.01"
        value={pan}
        onChange={(e) => onPanChange(parseFloat(e.target.value))}
        className="w-full"
      />
      <span className="text-xs text-[var(--aethel-text-quaternary)]">
        {pan === 0 ? 'C' : pan < 0 ? `L${Math.abs(Math.round(pan * 100))}` : `R${Math.round(pan * 100)}`}
      </span>

      {/* Buttons */}
        <div className="flex gap-1">
          <button type="button" aria-label={muted ? `Desativar mute de ${name}` : `Ativar mute de ${name}`}
            onClick={onMuteToggle}
            className={`px-2 py-1 text-xs rounded ${muted ? 'bg-[var(--aethel-error-dark)]' : 'bg-[var(--aethel-surface-quaternary)]'}`}
          >
            M
          </button>
          <button type="button" aria-label={solo ? `Desativar solo de ${name}` : `Ativar solo de ${name}`}
            onClick={onSoloToggle}
            className={`px-2 py-1 text-xs rounded ${solo ? 'bg-[var(--aethel-warning-dark)]' : 'bg-[var(--aethel-surface-quaternary)]'}`}
          >
            S
        </button>
      </div>
    </div>
  );
}

/**
 * Audio Engine - Engine de audio REAL usando Web Audio API
 */
export class AudioEngine {
  private context: AudioContext;
  private masterGain: GainNode;
  private tracks: Map<string, AudioTrack> = new Map();
  private analyser: AnalyserNode;

  constructor() {
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.analyser = this.context.createAnalyser();

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    this.analyser.fftSize = 2048;
  }

  async loadTrack(id: string, url: string): Promise<void> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

    const track = new AudioTrack(this.context, audioBuffer, this.masterGain);
    this.tracks.set(id, track);
  }

  playTrack(id: string, startTime: number = 0): void {
    const track = this.tracks.get(id);
    if (track) {
      track.play(startTime);
    }
  }

  stopTrack(id: string): void {
    const track = this.tracks.get(id);
    if (track) {
      track.stop();
    }
  }

  setTrackVolume(id: string, volume: number): void {
    const track = this.tracks.get(id);
    if (track) {
      track.setVolume(volume);
    }
  }

  setTrackPan(id: string, pan: number): void {
    const track = this.tracks.get(id);
    if (track) {
      track.setPan(pan);
    }
  }

  setMasterVolume(volume: number): void {
    this.masterGain.gain.value = volume;
  }

  getPeakLevel(): number {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(dataArray);

    let max = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const value = Math.abs(dataArray[i] - 128) / 128;
      if (value > max) max = value;
    }

    return max;
  }

  getFrequencyData(): Uint8Array {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  dispose(): void {
    this.tracks.forEach(track => track.dispose());
    this.context.close();
  }
}

class AudioTrack {
  private context: AudioContext;
  private buffer: AudioBuffer;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private panNode: StereoPannerNode;
  private output: GainNode;

  constructor(context: AudioContext, buffer: AudioBuffer, output: GainNode) {
    this.context = context;
    this.buffer = buffer;
    this.output = output;

    this.gainNode = context.createGain();
    this.panNode = context.createStereoPanner();

    this.gainNode.connect(this.panNode);
    this.panNode.connect(output);
  }

  play(startTime: number = 0): void {
    this.stop();

    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.gainNode);
    this.source.start(0, startTime);
  }

  stop(): void {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
  }

  setVolume(volume: number): void {
    this.gainNode.gain.value = volume;
  }

  setPan(pan: number): void {
    this.panNode.pan.value = pan;
  }

  dispose(): void {
    this.stop();
    this.gainNode.disconnect();
    this.panNode.disconnect();
  }
}

export default WaveformRenderer;
