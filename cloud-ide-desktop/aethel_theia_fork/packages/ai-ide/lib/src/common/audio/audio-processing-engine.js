"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioProcessingEngine = void 0;
const inversify_1 = require("inversify");
// ============================================================================
// AUDIO PROCESSING ENGINE
// ============================================================================
let AudioProcessingEngine = class AudioProcessingEngine {
    constructor() {
        this.currentProject = null;
        this.audioContext = null;
        this.sampleRate = 48000;
    }
    // ========================================================================
    // GERENCIAMENTO DE PROJETO
    // ========================================================================
    /**
     * Cria novo projeto de áudio
     */
    createProject(name, settings = {}) {
        const defaultSettings = {
            sampleRate: 48000,
            bitDepth: 24,
            channels: 2,
            tempo: 120,
            timeSignature: { numerator: 4, denominator: 4 },
            snapToGrid: true,
            gridSize: 'beat',
        };
        const project = {
            id: this.generateId(),
            name,
            created: Date.now(),
            modified: Date.now(),
            settings: { ...defaultSettings, ...settings },
            tracks: [],
            masterBus: {
                id: 'master',
                volume: 1,
                inserts: [],
                metering: {
                    type: 'lufs',
                    integration: 400,
                    peakHold: 2000,
                },
            },
            sends: [],
            markers: [],
            metadata: { tags: [] },
        };
        this.currentProject = project;
        this.sampleRate = project.settings.sampleRate;
        // Criar tracks padrão
        this.createTrack('Audio 1', 'audio');
        this.createTrack('Audio 2', 'audio');
        return project;
    }
    /**
     * Cria track
     */
    createTrack(name, type) {
        if (!this.currentProject) {
            throw new Error('No project open');
        }
        const track = {
            id: this.generateId(),
            name,
            type,
            index: this.currentProject.tracks.length,
            clips: [],
            input: { type: 'none' },
            output: { type: 'master', destination: 'master' },
            sends: [],
            inserts: [],
            volume: 1,
            pan: 0,
            mute: false,
            solo: false,
            arm: false,
            automation: [],
            frozen: false,
            locked: false,
            height: 80,
        };
        this.currentProject.tracks.push(track);
        return track;
    }
    // ========================================================================
    // OPERAÇÕES DE CLIP
    // ========================================================================
    /**
     * Adiciona clip à track
     */
    addClip(trackId, buffer, startSample, name) {
        const track = this.findTrack(trackId);
        if (!track) {
            throw new Error('Track not found');
        }
        const clip = {
            id: this.generateId(),
            trackId,
            name: name || 'Audio Clip',
            sourceBuffer: buffer,
            startSample,
            endSample: startSample + buffer.length,
            sourceIn: 0,
            sourceOut: buffer.length,
            gain: 1,
            fadeIn: { duration: 0, curve: 'linear' },
            fadeOut: { duration: 0, curve: 'linear' },
            pitch: 0,
            timeStretch: 1,
            stretchMode: 'elastic',
            effects: [],
            muted: false,
            locked: false,
        };
        track.clips.push(clip);
        return clip;
    }
    /**
     * Move clip
     */
    moveClip(clipId, newStartSample, newTrackId) {
        const { track, clip } = this.findClip(clipId);
        if (!clip || !track)
            return;
        const duration = clip.endSample - clip.startSample;
        clip.startSample = newStartSample;
        clip.endSample = newStartSample + duration;
        if (newTrackId && newTrackId !== track.id) {
            const newTrack = this.findTrack(newTrackId);
            if (newTrack) {
                track.clips = track.clips.filter(c => c.id !== clipId);
                clip.trackId = newTrackId;
                newTrack.clips.push(clip);
            }
        }
    }
    /**
     * Split clip
     */
    splitClip(clipId, sample) {
        const { track, clip } = this.findClip(clipId);
        if (!clip || !track) {
            throw new Error('Clip not found');
        }
        if (sample <= clip.startSample || sample >= clip.endSample) {
            throw new Error('Split point must be within clip');
        }
        const splitPoint = sample - clip.startSample + clip.sourceIn;
        // Criar segundo clip
        const clip2 = {
            ...JSON.parse(JSON.stringify(clip)),
            id: this.generateId(),
            startSample: sample,
            sourceIn: splitPoint,
        };
        // Ajustar primeiro clip
        clip.endSample = sample;
        clip.sourceOut = splitPoint;
        track.clips.push(clip2);
        return [clip, clip2];
    }
    /**
     * Aplica fade
     */
    setFade(clipId, edge, duration, curve = 'linear') {
        const { clip } = this.findClip(clipId);
        if (!clip)
            return;
        const fade = { duration, curve };
        if (edge === 'in') {
            clip.fadeIn = fade;
        }
        else {
            clip.fadeOut = fade;
        }
    }
    // ========================================================================
    // PROCESSAMENTO DE ÁUDIO
    // ========================================================================
    /**
     * Aplica fade a buffer
     */
    applyFade(buffer, fade, edge) {
        const result = this.cloneBuffer(buffer);
        const fadeSamples = Math.min(fade.duration, buffer.length);
        for (let ch = 0; ch < buffer.channels; ch++) {
            for (let i = 0; i < fadeSamples; i++) {
                const t = edge === 'in' ? i / fadeSamples : (fadeSamples - i) / fadeSamples;
                const gain = this.calculateFadeGain(t, fade.curve);
                const sampleIdx = edge === 'in' ? i : buffer.length - fadeSamples + i;
                result.data[ch][sampleIdx] *= gain;
            }
        }
        return result;
    }
    /**
     * Calcula ganho de fade
     */
    calculateFadeGain(t, curve) {
        switch (curve) {
            case 'linear':
                return t;
            case 'exponential':
                return t * t;
            case 'logarithmic':
                return Math.log10(1 + 9 * t);
            case 's-curve':
                return t * t * (3 - 2 * t);
            case 'equal-power':
                return Math.sqrt(t);
            default:
                return t;
        }
    }
    /**
     * Normaliza buffer
     */
    normalize(buffer, targetLevel = 0) {
        const result = this.cloneBuffer(buffer);
        // Encontrar pico
        let peak = 0;
        for (let ch = 0; ch < buffer.channels; ch++) {
            for (let i = 0; i < buffer.length; i++) {
                peak = Math.max(peak, Math.abs(buffer.data[ch][i]));
            }
        }
        if (peak === 0)
            return result;
        // Calcular ganho
        const targetLinear = Math.pow(10, targetLevel / 20);
        const gain = targetLinear / peak;
        // Aplicar ganho
        for (let ch = 0; ch < buffer.channels; ch++) {
            for (let i = 0; i < buffer.length; i++) {
                result.data[ch][i] *= gain;
            }
        }
        return result;
    }
    /**
     * Aplica ganho
     */
    applyGain(buffer, gainDb) {
        const result = this.cloneBuffer(buffer);
        const gainLinear = Math.pow(10, gainDb / 20);
        for (let ch = 0; ch < buffer.channels; ch++) {
            for (let i = 0; i < buffer.length; i++) {
                result.data[ch][i] *= gainLinear;
            }
        }
        return result;
    }
    /**
     * Reverse buffer
     */
    reverse(buffer) {
        const result = this.createEmptyBuffer(buffer.length, buffer.channels, buffer.sampleRate);
        for (let ch = 0; ch < buffer.channels; ch++) {
            for (let i = 0; i < buffer.length; i++) {
                result.data[ch][i] = buffer.data[ch][buffer.length - 1 - i];
            }
        }
        return result;
    }
    /**
     * Mix buffers
     */
    mixBuffers(buffers) {
        if (buffers.length === 0) {
            throw new Error('No buffers to mix');
        }
        const maxLength = Math.max(...buffers.map(b => b.buffer.length));
        const result = this.createEmptyBuffer(maxLength, 2, this.sampleRate);
        for (const { buffer, gain, pan } of buffers) {
            const gainLinear = Math.pow(10, gain / 20);
            const leftGain = gainLinear * Math.cos((pan + 1) * Math.PI / 4);
            const rightGain = gainLinear * Math.sin((pan + 1) * Math.PI / 4);
            for (let i = 0; i < buffer.length; i++) {
                // Mono ou primeiro canal
                const sample = buffer.data[0][i];
                result.data[0][i] += sample * leftGain;
                result.data[1][i] += sample * rightGain;
                // Segundo canal se existir
                if (buffer.channels > 1) {
                    result.data[0][i] += buffer.data[1][i] * leftGain;
                    result.data[1][i] += buffer.data[1][i] * rightGain;
                }
            }
        }
        return result;
    }
    // ========================================================================
    // EFEITOS
    // ========================================================================
    /**
     * Aplica EQ
     */
    applyEQ(buffer, config) {
        const result = this.cloneBuffer(buffer);
        for (const band of config.bands) {
            if (!band.enabled)
                continue;
            this.applyBiquadFilter(result, band);
        }
        return result;
    }
    /**
     * Aplica filtro biquad
     */
    applyBiquadFilter(buffer, band) {
        // Calcular coeficientes do filtro
        const w0 = 2 * Math.PI * band.frequency / buffer.sampleRate;
        const cosW0 = Math.cos(w0);
        const sinW0 = Math.sin(w0);
        const alpha = sinW0 / (2 * band.q);
        const A = Math.pow(10, band.gain / 40);
        let b0 = 1, b1 = 0, b2 = 0;
        let a0 = 1, a1 = 0, a2 = 0;
        switch (band.type) {
            case 'peaking':
                b0 = 1 + alpha * A;
                b1 = -2 * cosW0;
                b2 = 1 - alpha * A;
                a0 = 1 + alpha / A;
                a1 = -2 * cosW0;
                a2 = 1 - alpha / A;
                break;
            case 'lowshelf':
                b0 = A * ((A + 1) - (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha);
                b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
                b2 = A * ((A + 1) - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha);
                a0 = (A + 1) + (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha;
                a1 = -2 * ((A - 1) + (A + 1) * cosW0);
                a2 = (A + 1) + (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha;
                break;
            case 'highshelf':
                b0 = A * ((A + 1) + (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha);
                b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
                b2 = A * ((A + 1) + (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha);
                a0 = (A + 1) - (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha;
                a1 = 2 * ((A - 1) - (A + 1) * cosW0);
                a2 = (A + 1) - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha;
                break;
            case 'lowpass':
                b0 = (1 - cosW0) / 2;
                b1 = 1 - cosW0;
                b2 = (1 - cosW0) / 2;
                a0 = 1 + alpha;
                a1 = -2 * cosW0;
                a2 = 1 - alpha;
                break;
            case 'highpass':
                b0 = (1 + cosW0) / 2;
                b1 = -(1 + cosW0);
                b2 = (1 + cosW0) / 2;
                a0 = 1 + alpha;
                a1 = -2 * cosW0;
                a2 = 1 - alpha;
                break;
        }
        // Normalizar coeficientes
        b0 /= a0;
        b1 /= a0;
        b2 /= a0;
        a1 /= a0;
        a2 /= a0;
        // Aplicar filtro a cada canal
        for (let ch = 0; ch < buffer.channels; ch++) {
            let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
            for (let i = 0; i < buffer.length; i++) {
                const x = buffer.data[ch][i];
                const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
                x2 = x1;
                x1 = x;
                y2 = y1;
                y1 = y;
                buffer.data[ch][i] = y;
            }
        }
    }
    /**
     * Aplica compressor
     */
    applyCompressor(buffer, config) {
        const result = this.cloneBuffer(buffer);
        const thresholdLinear = Math.pow(10, config.threshold / 20);
        const attackCoef = Math.exp(-1 / (config.attack * buffer.sampleRate / 1000));
        const releaseCoef = Math.exp(-1 / (config.release * buffer.sampleRate / 1000));
        const makeupLinear = Math.pow(10, config.makeupGain / 20);
        let envelope = 0;
        for (let i = 0; i < buffer.length; i++) {
            // Calcular nível de entrada (RMS de todos os canais)
            let sum = 0;
            for (let ch = 0; ch < buffer.channels; ch++) {
                sum += buffer.data[ch][i] * buffer.data[ch][i];
            }
            const inputLevel = Math.sqrt(sum / buffer.channels);
            // Envelope follower
            if (inputLevel > envelope) {
                envelope = attackCoef * envelope + (1 - attackCoef) * inputLevel;
            }
            else {
                envelope = releaseCoef * envelope + (1 - releaseCoef) * inputLevel;
            }
            // Calcular redução de ganho
            let gainReduction = 1;
            if (envelope > thresholdLinear) {
                const overThreshold = envelope / thresholdLinear;
                const compressedLevel = Math.pow(overThreshold, 1 / config.ratio - 1);
                // Soft knee
                if (config.knee > 0) {
                    const kneeStart = thresholdLinear * Math.pow(10, -config.knee / 40);
                    const kneeEnd = thresholdLinear * Math.pow(10, config.knee / 40);
                    if (envelope > kneeStart && envelope < kneeEnd) {
                        const kneeFactor = (envelope - kneeStart) / (kneeEnd - kneeStart);
                        gainReduction = 1 + (compressedLevel - 1) * kneeFactor;
                    }
                    else {
                        gainReduction = compressedLevel;
                    }
                }
                else {
                    gainReduction = compressedLevel;
                }
            }
            // Aplicar ganho
            const totalGain = gainReduction * makeupLinear;
            for (let ch = 0; ch < buffer.channels; ch++) {
                result.data[ch][i] *= totalGain;
            }
        }
        return result;
    }
    /**
     * Aplica limiter
     */
    applyLimiter(buffer, config) {
        const result = this.cloneBuffer(buffer);
        const ceilingLinear = Math.pow(10, config.ceiling / 20);
        const lookaheadSamples = Math.floor(config.lookahead * buffer.sampleRate / 1000);
        const releaseCoef = Math.exp(-1 / (config.release * buffer.sampleRate / 1000));
        let gainReduction = 1;
        for (let i = 0; i < buffer.length; i++) {
            // Look ahead para pico
            let peakLevel = 0;
            for (let j = 0; j < lookaheadSamples && i + j < buffer.length; j++) {
                for (let ch = 0; ch < buffer.channels; ch++) {
                    peakLevel = Math.max(peakLevel, Math.abs(buffer.data[ch][i + j]));
                }
            }
            // Calcular redução necessária
            const targetGain = peakLevel > ceilingLinear ? ceilingLinear / peakLevel : 1;
            // Suavizar redução de ganho
            if (targetGain < gainReduction) {
                gainReduction = targetGain; // Attack instantâneo
            }
            else {
                gainReduction = releaseCoef * gainReduction + (1 - releaseCoef) * targetGain;
            }
            // Aplicar
            for (let ch = 0; ch < buffer.channels; ch++) {
                result.data[ch][i] *= gainReduction;
            }
        }
        return result;
    }
    /**
     * Aplica reverb simples
     */
    applyReverb(buffer, config) {
        const result = this.cloneBuffer(buffer);
        const preDelaySamples = Math.floor(config.preDelay * buffer.sampleRate / 1000);
        const decaySamples = Math.floor(config.decay * buffer.sampleRate);
        // Criar linhas de delay para reverb
        const numDelays = 8;
        const delayLines = [];
        const delayTimes = [];
        const feedbacks = [];
        for (let i = 0; i < numDelays; i++) {
            const baseDelay = Math.floor((20 + config.size * 80) * buffer.sampleRate / 1000);
            const delay = baseDelay + Math.floor(Math.random() * baseDelay * 0.5);
            delayTimes.push(delay);
            delayLines.push(new Float32Array(delay));
            feedbacks.push(Math.pow(0.001, delay / decaySamples));
        }
        // Processar
        const writeIndices = new Array(numDelays).fill(0);
        for (let i = 0; i < buffer.length; i++) {
            for (let ch = 0; ch < buffer.channels; ch++) {
                let wetSample = 0;
                const drySample = buffer.data[ch][i];
                // Somar outputs de todas as linhas de delay
                for (let d = 0; d < numDelays; d++) {
                    const readIdx = (writeIndices[d] - delayTimes[d] + delayLines[d].length) % delayLines[d].length;
                    wetSample += delayLines[d][readIdx] * feedbacks[d];
                }
                // Damping (filtro passa-baixa simples)
                wetSample *= (1 - config.damping);
                // Escrever nas linhas de delay
                for (let d = 0; d < numDelays; d++) {
                    delayLines[d][writeIndices[d]] = drySample + wetSample * config.diffusion;
                    writeIndices[d] = (writeIndices[d] + 1) % delayLines[d].length;
                }
                // Mixar com sinal original
                result.data[ch][i] = drySample * (1 - config.earlyReflections) + wetSample * config.earlyReflections;
            }
        }
        return result;
    }
    /**
     * Aplica delay
     */
    applyDelay(buffer, config) {
        const result = this.cloneBuffer(buffer);
        // Calcular tempo em samples
        let delaySamples;
        if (config.sync && this.currentProject) {
            const beatsPerSample = this.currentProject.settings.tempo / 60 / buffer.sampleRate;
            delaySamples = Math.floor(config.time / beatsPerSample);
        }
        else {
            delaySamples = Math.floor(config.time * buffer.sampleRate / 1000);
        }
        const delayBuffer = new Float32Array(delaySamples);
        let writeIndex = 0;
        for (let ch = 0; ch < buffer.channels; ch++) {
            delayBuffer.fill(0);
            writeIndex = 0;
            for (let i = 0; i < buffer.length; i++) {
                const readIndex = (writeIndex - delaySamples + delayBuffer.length) % delayBuffer.length;
                const delayed = delayBuffer[readIndex];
                // Ping-pong: alternar canais
                const targetChannel = config.pingPong ? (ch + 1) % buffer.channels : ch;
                // Escrever no buffer de delay
                delayBuffer[writeIndex] = buffer.data[ch][i] + delayed * config.feedback;
                writeIndex = (writeIndex + 1) % delayBuffer.length;
                // Somar ao output
                result.data[targetChannel][i] += delayed;
            }
        }
        return result;
    }
    // ========================================================================
    // ANÁLISE
    // ========================================================================
    /**
     * Analisa buffer de áudio
     */
    analyzeAudio(buffer) {
        const analysis = {
            duration: buffer.duration,
            sampleRate: buffer.sampleRate,
            channels: buffer.channels,
            peakLevel: [],
            rmsLevel: [],
            dynamicRange: 0,
            crestFactor: 0,
        };
        // Calcular níveis por canal
        for (let ch = 0; ch < buffer.channels; ch++) {
            let peak = 0;
            let sumSquares = 0;
            for (let i = 0; i < buffer.length; i++) {
                const sample = Math.abs(buffer.data[ch][i]);
                peak = Math.max(peak, sample);
                sumSquares += sample * sample;
            }
            const rms = Math.sqrt(sumSquares / buffer.length);
            analysis.peakLevel.push(this.linearToDb(peak));
            analysis.rmsLevel.push(this.linearToDb(rms));
        }
        // Dynamic range e crest factor
        const avgPeak = analysis.peakLevel.reduce((a, b) => a + b, 0) / buffer.channels;
        const avgRms = analysis.rmsLevel.reduce((a, b) => a + b, 0) / buffer.channels;
        analysis.dynamicRange = avgPeak - avgRms;
        analysis.crestFactor = avgPeak - avgRms;
        // Detectar silêncio
        analysis.silence = this.detectSilence(buffer);
        // Detectar clipping
        analysis.clipping = this.detectClipping(buffer);
        // Detecção de tempo
        analysis.tempo = this.detectTempo(buffer);
        if (analysis.tempo) {
            analysis.beatPositions = this.detectBeats(buffer, analysis.tempo);
        }
        return analysis;
    }
    /**
     * Detecta silêncio
     */
    detectSilence(buffer, thresholdDb = -60) {
        const regions = [];
        const threshold = Math.pow(10, thresholdDb / 20);
        const minSilence = buffer.sampleRate * 0.1; // Min 100ms
        let silenceStart = null;
        for (let i = 0; i < buffer.length; i++) {
            let maxLevel = 0;
            for (let ch = 0; ch < buffer.channels; ch++) {
                maxLevel = Math.max(maxLevel, Math.abs(buffer.data[ch][i]));
            }
            if (maxLevel < threshold) {
                if (silenceStart === null) {
                    silenceStart = i;
                }
            }
            else if (silenceStart !== null) {
                if (i - silenceStart >= minSilence) {
                    regions.push({ start: silenceStart, end: i });
                }
                silenceStart = null;
            }
        }
        return regions;
    }
    /**
     * Detecta clipping
     */
    detectClipping(buffer, threshold = 0.99) {
        const clips = [];
        for (let i = 0; i < buffer.length; i++) {
            for (let ch = 0; ch < buffer.channels; ch++) {
                if (Math.abs(buffer.data[ch][i]) >= threshold) {
                    clips.push(i);
                    break;
                }
            }
        }
        return clips;
    }
    /**
     * Detecta tempo (BPM)
     */
    detectTempo(buffer) {
        // Simplificado - detecção por autocorrelação
        const mono = this.mixToMono(buffer);
        const windowSize = buffer.sampleRate; // 1 segundo
        const data = mono.data[0].slice(0, windowSize);
        // Calcular autocorrelação
        const minLag = Math.floor(buffer.sampleRate / 240); // Max 240 BPM
        const maxLag = Math.floor(buffer.sampleRate / 60); // Min 60 BPM
        let maxCorrelation = 0;
        let bestLag = minLag;
        for (let lag = minLag; lag < maxLag; lag++) {
            let correlation = 0;
            for (let i = 0; i < windowSize - lag; i++) {
                correlation += data[i] * data[i + lag];
            }
            if (correlation > maxCorrelation) {
                maxCorrelation = correlation;
                bestLag = lag;
            }
        }
        const bpm = 60 * buffer.sampleRate / bestLag;
        return Math.round(bpm);
    }
    /**
     * Detecta posições de beats
     */
    detectBeats(buffer, tempo) {
        const beats = [];
        const samplesPerBeat = Math.round(60 * buffer.sampleRate / tempo);
        // Encontrar primeiro beat por onset detection
        const mono = this.mixToMono(buffer);
        let maxOnset = 0;
        let firstBeatSample = 0;
        // Procurar nos primeiros 2 segundos
        const searchWindow = Math.min(buffer.sampleRate * 2, buffer.length);
        for (let i = 1; i < searchWindow; i++) {
            const onset = Math.abs(mono.data[0][i]) - Math.abs(mono.data[0][i - 1]);
            if (onset > maxOnset) {
                maxOnset = onset;
                firstBeatSample = i;
            }
        }
        // Gerar posições de beats
        for (let sample = firstBeatSample; sample < buffer.length; sample += samplesPerBeat) {
            beats.push(Math.round(sample));
        }
        return beats;
    }
    /**
     * Calcula espectro (FFT simples)
     */
    calculateSpectrum(buffer, windowSize = 2048) {
        const spectrums = [];
        const mono = this.mixToMono(buffer);
        const hopSize = windowSize / 2;
        for (let start = 0; start + windowSize < buffer.length; start += hopSize) {
            const window = mono.data[0].slice(start, start + windowSize);
            const spectrum = this.fft(window);
            spectrums.push(spectrum);
        }
        return spectrums;
    }
    /**
     * FFT simples (Cooley-Tukey)
     */
    fft(data) {
        const n = data.length;
        if (n <= 1)
            return new Float32Array([Math.abs(data[0])]);
        // Dividir em pares e ímpares
        const even = new Float32Array(n / 2);
        const odd = new Float32Array(n / 2);
        for (let i = 0; i < n / 2; i++) {
            even[i] = data[2 * i];
            odd[i] = data[2 * i + 1];
        }
        const evenFFT = this.fft(even);
        const oddFFT = this.fft(odd);
        const result = new Float32Array(n / 2);
        for (let k = 0; k < n / 2; k++) {
            const angle = -2 * Math.PI * k / n;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const re = cos * oddFFT[k];
            const im = sin * oddFFT[k];
            result[k] = Math.sqrt(Math.pow(evenFFT[k] + re, 2) +
                Math.pow(im, 2));
        }
        return result;
    }
    // ========================================================================
    // UTILITÁRIOS
    // ========================================================================
    /**
     * Cria buffer vazio
     */
    createEmptyBuffer(length, channels, sampleRate) {
        const data = [];
        for (let i = 0; i < channels; i++) {
            data.push(new Float32Array(length));
        }
        return {
            sampleRate,
            channels,
            length,
            duration: length / sampleRate,
            data,
        };
    }
    /**
     * Clona buffer
     */
    cloneBuffer(buffer) {
        const data = [];
        for (let ch = 0; ch < buffer.channels; ch++) {
            data.push(new Float32Array(buffer.data[ch]));
        }
        return {
            ...buffer,
            data,
        };
    }
    /**
     * Mix para mono
     */
    mixToMono(buffer) {
        const mono = this.createEmptyBuffer(buffer.length, 1, buffer.sampleRate);
        for (let i = 0; i < buffer.length; i++) {
            let sum = 0;
            for (let ch = 0; ch < buffer.channels; ch++) {
                sum += buffer.data[ch][i];
            }
            mono.data[0][i] = sum / buffer.channels;
        }
        return mono;
    }
    /**
     * Encontra track por ID
     */
    findTrack(trackId) {
        return this.currentProject?.tracks.find(t => t.id === trackId);
    }
    /**
     * Encontra clip por ID
     */
    findClip(clipId) {
        if (!this.currentProject)
            return {};
        for (const track of this.currentProject.tracks) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip) {
                return { track, clip };
            }
        }
        return {};
    }
    /**
     * Converte linear para dB
     */
    linearToDb(linear) {
        return 20 * Math.log10(Math.max(linear, 1e-10));
    }
    /**
     * Converte dB para linear
     */
    dbToLinear(db) {
        return Math.pow(10, db / 20);
    }
    /**
     * Gera ID único
     */
    generateId() {
        return `aud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.AudioProcessingEngine = AudioProcessingEngine;
exports.AudioProcessingEngine = AudioProcessingEngine = __decorate([
    (0, inversify_1.injectable)()
], AudioProcessingEngine);
