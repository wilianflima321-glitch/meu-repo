import type { SerializedLevel } from './types';
import { LevelCompression } from './compression';

export class LevelFileFormat {
  private static MAGIC = new Uint8Array([0x41, 0x45, 0x4C, 0x56]); // "AELV"
  private static VERSION = 1;

  static async save(level: SerializedLevel): Promise<Blob> {
    // Compress level data
    const compressed = LevelCompression.compressLevel(level);

    // Create file header
    const headerSize = 16;
    const totalSize = headerSize + compressed.length;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);

    // Write magic number
    uint8.set(this.MAGIC, 0);

    // Write version
    view.setUint32(4, this.VERSION, true);

    // Write compressed data size
    view.setUint32(8, compressed.length, true);

    // Write uncompressed data size (for validation)
    const json = JSON.stringify(level);
    view.setUint32(12, json.length, true);

    // Write compressed data
    uint8.set(compressed, headerSize);

    return new Blob([buffer], { type: 'application/x-aethel-level' });
  }

  static async load(blob: Blob): Promise<SerializedLevel> {
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);

    // Verify magic number
    const magic = uint8.slice(0, 4);
    if (!this.arrayEquals(magic, this.MAGIC)) {
      throw new Error('Invalid level file format');
    }

    // Read version
    const version = view.getUint32(4, true);
    if (version > this.VERSION) {
      throw new Error(`Level file version ${version} is not supported`);
    }

    // Read sizes
    const compressedSize = view.getUint32(8, true);
    // const uncompressedSize = view.getUint32(12, true);

    // Read compressed data
    const compressed = uint8.slice(16, 16 + compressedSize);

    // Decompress and parse
    return LevelCompression.decompressLevel(compressed);
  }

  private static arrayEquals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}
