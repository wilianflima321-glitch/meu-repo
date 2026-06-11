import type { ImportOptions, ImportProgressCallback, ImportedAsset } from './asset-import-pipeline-contracts';
import {
  createAssetImportId,
  getImportDisplayName,
  getImportExtension,
  getImportFileName,
} from './asset-import-pipeline-runtime';

export class AudioImporter {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  async import(
    file: File | string,
    options: ImportOptions,
    onProgress?: ImportProgressCallback
  ): Promise<ImportedAsset> {
    const filename = getImportFileName(file);
    const ext = getImportExtension(filename);

    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading audio...' });

    let arrayBuffer: ArrayBuffer;

    if (typeof file === 'string') {
      const response = await fetch(file);
      arrayBuffer = await response.arrayBuffer();
    } else {
      arrayBuffer = await file.arrayBuffer();
    }

    onProgress?.({ stage: 'processing', progress: 50, message: 'Decoding audio...' });

    const audioContext = this.getAudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    let processedBuffer = audioBuffer;

    if (options.convertToMono && audioBuffer.numberOfChannels > 1) {
      onProgress?.({ stage: 'processing', progress: 70, message: 'Converting to mono...' });
      processedBuffer = this.convertToMono(audioBuffer);
    }

    if (options.normalize) {
      onProgress?.({ stage: 'processing', progress: 85, message: 'Normalizing audio...' });
      processedBuffer = this.normalize(processedBuffer);
    }

    onProgress?.({ stage: 'completed', progress: 100, message: 'Import complete!' });

    return {
      id: createAssetImportId('audio'),
      name: getImportDisplayName(filename),
      type: 'audio',
      originalPath: filename,
      size: arrayBuffer.byteLength,
      format: ext.substring(1).toUpperCase(),
      importDate: new Date(),
      metadata: {
        duration: processedBuffer.duration,
        channels_audio: processedBuffer.numberOfChannels,
        sampleRate: processedBuffer.sampleRate,
      },
      data: processedBuffer,
    };
  }

  private convertToMono(buffer: AudioBuffer): AudioBuffer {
    const audioContext = this.getAudioContext();
    const monoBuffer = audioContext.createBuffer(1, buffer.length, buffer.sampleRate);
    const monoData = monoBuffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      let sum = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        sum += buffer.getChannelData(channel)[i];
      }
      monoData[i] = sum / buffer.numberOfChannels;
    }

    return monoBuffer;
  }

  private normalize(buffer: AudioBuffer): AudioBuffer {
    const audioContext = this.getAudioContext();
    const normalizedBuffer = audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    let maxAmplitude = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(data[i]));
      }
    }

    const gain = maxAmplitude > 0 ? 1 / maxAmplitude : 1;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const sourceData = buffer.getChannelData(channel);
      const destData = normalizedBuffer.getChannelData(channel);
      for (let i = 0; i < sourceData.length; i++) {
        destData[i] = sourceData[i] * gain;
      }
    }

    return normalizedBuffer;
  }
}
