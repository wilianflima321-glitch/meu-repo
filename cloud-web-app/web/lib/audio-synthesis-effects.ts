import type { DistortionType } from './audio-synthesis-types';

export class ReverbEffect {
  private context: AudioContext;
  private convolver: ConvolverNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private inputNode: GainNode;
  private outputNode: GainNode;

  constructor(context: AudioContext, impulseResponse?: AudioBuffer) {
    this.context = context;

    this.inputNode = context.createGain();
    this.outputNode = context.createGain();
    this.convolver = context.createConvolver();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();

    this.wetGain.gain.value = 0.5;
    this.dryGain.gain.value = 0.5;

    // Routing
    this.inputNode.connect(this.convolver);
    this.inputNode.connect(this.dryGain);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
    this.dryGain.connect(this.outputNode);

    if (impulseResponse) {
      this.convolver.buffer = impulseResponse;
    } else {
      this.generateImpulseResponse(2, 2);
    }
  }

  async generateImpulseResponse(duration: number, decay: number): Promise<void> {
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * decay / 3));
      }
    }

    this.convolver.buffer = impulse;
  }

  setWet(value: number): void {
    this.wetGain.gain.value = value;
    this.dryGain.gain.value = 1 - value;
  }

  getInput(): AudioNode {
    return this.inputNode;
  }

  getOutput(): AudioNode {
    return this.outputNode;
  }

  disconnect(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.convolver.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
  }
}

export class DelayEffect {
  private delay: DelayNode;
  private feedback: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private filter: BiquadFilterNode;

  constructor(context: AudioContext, time: number = 0.3, feedbackAmount: number = 0.5) {
    this.inputNode = context.createGain();
    this.outputNode = context.createGain();
    this.delay = context.createDelay(5);
    this.feedback = context.createGain();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();
    this.filter = context.createBiquadFilter();

    this.delay.delayTime.value = time;
    this.feedback.gain.value = feedbackAmount;
    this.wetGain.gain.value = 0.5;
    this.dryGain.gain.value = 0.5;
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 5000;

    // Routing
    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.delay);
    this.delay.connect(this.filter);
    this.filter.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.filter.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
    this.dryGain.connect(this.outputNode);
  }

  setTime(time: number): void {
    this.delay.delayTime.value = time;
  }

  setFeedback(amount: number): void {
    this.feedback.gain.value = Math.min(amount, 0.95);
  }

  setWet(value: number): void {
    this.wetGain.gain.value = value;
    this.dryGain.gain.value = 1 - value;
  }

  getInput(): AudioNode {
    return this.inputNode;
  }

  getOutput(): AudioNode {
    return this.outputNode;
  }

  disconnect(): void {
    this.inputNode.disconnect();
    this.delay.disconnect();
    this.feedback.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.outputNode.disconnect();
    this.filter.disconnect();
  }
}

export class DistortionEffect {
  private waveshaper: WaveShaperNode;
  private inputGain: GainNode;
  private outputGain: GainNode;

  constructor(context: AudioContext, type: DistortionType = 'soft', amount: number = 50) {
    this.inputGain = context.createGain();
    this.outputGain = context.createGain();
    this.waveshaper = context.createWaveShaper();

    this.setDistortion(type, amount);

    this.inputGain.connect(this.waveshaper);
    this.waveshaper.connect(this.outputGain);
  }

  setDistortion(type: DistortionType, amount: number): void {
    const samples = 44100;
    const curve = new Float32Array(samples);

    switch (type) {
      case 'soft':
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = Math.tanh((x * amount) / 10);
        }
        break;

      case 'hard':
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = Math.max(-1, Math.min(1, (x * amount) / 10));
        }
        break;

      case 'fuzz':
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 1 / (amount / 10 + 1));
        }
        break;

      case 'bitcrush':
        {
          const bits = Math.max(1, 16 - Math.floor(amount / 10));
          const levels = Math.pow(2, bits);
          for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = Math.round(x * levels) / levels;
          }
        }
        break;
    }

    this.waveshaper.curve = curve;
    this.waveshaper.oversample = '4x';
  }

  getInput(): AudioNode {
    return this.inputGain;
  }

  getOutput(): AudioNode {
    return this.outputGain;
  }

  disconnect(): void {
    this.inputGain.disconnect();
    this.waveshaper.disconnect();
    this.outputGain.disconnect();
  }
}

export class ChorusEffect {
  private inputNode: GainNode;
  private outputNode: GainNode;
  private delays: DelayNode[] = [];
  private lfos: OscillatorNode[] = [];
  private lfoGains: GainNode[] = [];

  constructor(context: AudioContext, rate: number = 1.5, depth: number = 0.002, voices: number = 3) {
    this.inputNode = context.createGain();
    this.outputNode = context.createGain();

    // Create delay lines with LFO modulation
    for (let i = 0; i < voices; i++) {
      const delay = context.createDelay(0.1);
      delay.delayTime.value = 0.02 + i * 0.01;

      const lfo = context.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = rate * (1 + i * 0.1);

      const lfoGain = context.createGain();
      lfoGain.gain.value = depth;

      lfo.connect(lfoGain);
      lfoGain.connect(delay.delayTime);
      lfo.start();

      this.inputNode.connect(delay);
      delay.connect(this.outputNode);

      this.delays.push(delay);
      this.lfos.push(lfo);
      this.lfoGains.push(lfoGain);
    }

    // Mix dry signal
    this.inputNode.connect(this.outputNode);
  }

  setRate(rate: number): void {
    this.lfos.forEach((lfo, i) => {
      lfo.frequency.value = rate * (1 + i * 0.1);
    });
  }

  setDepth(depth: number): void {
    this.lfoGains.forEach((gain) => {
      gain.gain.value = depth;
    });
  }

  getInput(): AudioNode {
    return this.inputNode;
  }

  getOutput(): AudioNode {
    return this.outputNode;
  }

  disconnect(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.delays.forEach((d) => d.disconnect());
    this.lfos.forEach((l) => {
      l.stop();
      l.disconnect();
    });
    this.lfoGains.forEach((g) => g.disconnect());
  }
}
