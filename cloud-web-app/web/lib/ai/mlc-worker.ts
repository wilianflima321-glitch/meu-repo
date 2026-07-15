// @aethel-heavy-async-boundary
/**
 * WebWorker entry point for `@mlc-ai/web-llm` (local-inference-manager.ts).
 *
 * `CreateWebWorkerMLCEngine` (main thread) expects a companion worker script
 * that forwards postMessage traffic into a `WebWorkerMLCEngineHandler`. This
 * file was referenced by `components/engine/LocalAIModal.tsx` but never
 * existed, so every "Download Local AI" click failed at `new Worker(...)`.
 *
 * All model inference (WebGPU tensor ops) runs inside this worker thread, off
 * the main/render thread, per WebLLM's documented worker protocol.
 */
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

let handler: WebWorkerMLCEngineHandler | undefined;

self.onmessage = (msg: MessageEvent) => {
  if (!handler) {
    handler = new WebWorkerMLCEngineHandler();
  }
  handler.onmessage(msg);
};
