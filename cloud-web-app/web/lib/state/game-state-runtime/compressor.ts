/**
 * Game State Manager - split persistence runtime.
 *
 * This keeps save/load, migration, compression, and React bindings isolated so
 * editor shells can load only the state surface they need.
 */

export class Compressor {
  static async compress(data: string): Promise<string> {
    if (typeof CompressionStream !== 'undefined') {
      const blob = new Blob([data]);
      const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
      const compressed = await new Response(stream).arrayBuffer();
      return btoa(String.fromCharCode(...new Uint8Array(compressed)));
    }
    
    // Fallback: simple RLE-like compression
    return this.simpleCompress(data);
  }
  
  static async decompress(data: string): Promise<string> {
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        const blob = new Blob([bytes]);
        const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
        return await new Response(stream).text();
      } catch {
        // Fallback to simple decompression
      }
    }
    
    return this.simpleDecompress(data);
  }
  
  private static simpleCompress(data: string): string {
    // Very simple compression for fallback
    return btoa(encodeURIComponent(data));
  }
  
  private static simpleDecompress(data: string): string {
    try {
      return decodeURIComponent(atob(data));
    } catch {
      return data;
    }
  }
}

// ============================================================================
// CHECKSUM
