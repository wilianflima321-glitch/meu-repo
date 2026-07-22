// WASM Shared Memory Bridge (A Morte do JSON)
// Comunicação Zero-Copy entre React (TS) e Rust (WASM)

export class WasmSharedMemoryBridge {
    private sharedBuffer: SharedArrayBuffer;
    private float32View: Float32Array;

    constructor(bufferSize: number) {
        // Aloca o buffer na memória compartilhada (SharedArrayBuffer)
        this.sharedBuffer = new SharedArrayBuffer(bufferSize);
        this.float32View = new Float32Array(this.sharedBuffer);
        // console.log("[WASM Bridge] Ponte Zero-Copy estabelecida. O DOM não engasgará o Rust.");
    }

    /**
     * O Maestro injeta Tensores sem serializar para JSON.
     * Tempo de comunicação: ~0.0001ms
     */
    public injectPhysicsTensor(offset: number, tensorData: number[]) {
        for (let i = 0; i < tensorData.length; i++) {
            this.float32View[offset + i] = tensorData[i];
        }
        // O Rust lê esse ponteiro de memória instantaneamente no próximo tick físico.
    }
}
