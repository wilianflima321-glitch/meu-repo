import type { ReverbPreset } from './audio-manager.types';

export class ReverbEffect {
  private audioContext: AudioContext;
  private convolverNode: ConvolverNode;
  private wetGainNode: GainNode;
  private dryGainNode: GainNode;
  private inputNode: GainNode;
  private outputNode: GainNode;

  constructor(audioContext: AudioContext, preset?: ReverbPreset) {
    this.audioContext = audioContext;

    this.inputNode = audioContext.createGain();
    this.outputNode = audioContext.createGain();
    this.convolverNode = audioContext.createConvolver();
    this.wetGainNode = audioContext.createGain();
    this.dryGainNode = audioContext.createGain();

    this.inputNode.connect(this.dryGainNode);
    this.inputNode.connect(this.convolverNode);
    this.convolverNode.connect(this.wetGainNode);
    this.dryGainNode.connect(this.outputNode);
    this.wetGainNode.connect(this.outputNode);

    this.wetGainNode.gain.value = preset?.wetMix ?? 0.3;
    this.dryGainNode.gain.value = 1 - (preset?.wetMix ?? 0.3);

    this.generateImpulseResponse(preset?.decay ?? 2, preset?.preDelay ?? 0.01);
  }

  private generateImpulseResponse(decay: number, preDelay: number): void {
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * decay;
    const preDelaySamples = sampleRate * preDelay;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);

      for (let i = 0; i < length; i++) {
        if (i < preDelaySamples) {
          channelData[i] = 0;
        } else {
          const t = (i - preDelaySamples) / length;
          channelData[i] = (Math.random() * 2 - 1) * Math.exp(-3 * t);
        }
      }
    }

    this.convolverNode.buffer = buffer;
  }

  setWetMix(value: number): void {
    this.wetGainNode.gain.value = value;
    this.dryGainNode.gain.value = 1 - value;
  }

  getInputNode(): AudioNode {
    return this.inputNode;
  }

  getOutputNode(): AudioNode {
    return this.outputNode;
  }

  dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.convolverNode.disconnect();
    this.wetGainNode.disconnect();
    this.dryGainNode.disconnect();
  }
}
