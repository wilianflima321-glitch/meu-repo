import pako from 'pako';
import type { SerializedLevel } from './types';

export class LevelCompression {
  static compress(data: string): Uint8Array {
    const textEncoder = new TextEncoder();
    const inputData = textEncoder.encode(data);
    return pako.deflate(inputData, { level: 9 });
  }

  static decompress(data: Uint8Array): string {
    const decompressed = pako.inflate(data);
    const textDecoder = new TextDecoder();
    return textDecoder.decode(decompressed);
  }

  static compressLevel(level: SerializedLevel): Uint8Array {
    const json = JSON.stringify(level);
    return this.compress(json);
  }

  static decompressLevel(data: Uint8Array): SerializedLevel {
    const json = this.decompress(data);
    return JSON.parse(json);
  }
}
