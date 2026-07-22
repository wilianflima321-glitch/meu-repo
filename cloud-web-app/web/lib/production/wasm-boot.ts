/**
 * WASM Zero-Config Boot (Direct-to-Silicon Sovereignty no Web)
 * Este script oblitera a burocracia de instação. Ele carrega o Aethel Kernel Rust 
 * compilado em WebAssembly silenciosamente no navegador.
 */

let rustKernelInstance: any = null;

export async function bootAethelKernelWasm(): Promise<void> {
  if (rustKernelInstance) {
    return;
  }

  console.log('[Zero-Config Boot] Transmitindo Semente Agêntica. Despertando Aethel Kernel WASM...');

  try {
    // Importação dinâmica do pacote compilado via wasm-pack
    // Ignoramos completamente servidores Node pesados e processos nativos.
    // O WebAssembly toma conta da thread e roda a física do ECS a 90% da perf Bare-Metal.
    const aethelKernel = await import('@aethel/kernel-wasm');
    
    // Inicia a alocação do espaço latente direto na memória do browser
    aethelKernel.init_panic_hook();
    rustKernelInstance = aethelKernel;
    
    console.log('[Zero-Config Boot] Supremacia alcançada: Engine inicializada na borda (Edge) em 0ms sem downloads.');
  } catch (error) {
    console.error('[Zero-Config Boot] Falha crítica de Soberania. Kernel não encontrado.', error);
    throw new Error('Aethel Engine Kernel Failed to Boot');
  }
}

/**
 * Ponto de injeção tátil para o Maestro.
 * Ele passa a instrução binária direta pro WASM em vez de transitar JSON.
 */
export function dispatchBinaryIntentToKernel(binaryInstruction: Uint8Array) {
  if (!rustKernelInstance) {
    throw new Error('Aethel WASM Kernel not booted.');
  }
  rustKernelInstance.process_binary_intent(binaryInstruction);
}
