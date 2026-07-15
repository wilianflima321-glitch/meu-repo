import React, { useState, useEffect } from 'react';
import { localInferenceManager } from '@/lib/ai/local-inference-manager';
import { setLocalAIActivated } from '@/lib/ai/local-chat-bridge';
import { logger } from '@/lib/observability/logger';

export const LocalAIModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hardwareCheck, setHardwareCheck] = useState<{ supported: boolean; reason?: string } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // Subscribes to the downloader's progress events.
    const handleProgress = (data: { text: string; progress: number }) => {
      setDownloadStatus(data.text);
      setDownloadProgress(data.progress);
    };

    const handleReady = () => {
      setIsDownloading(false);
      setIsCompleted(true);
      // Persists the activation flag so `useAIChatController` (IDE AI Chat
      // panel) routes future messages through WebLLM instead of the cloud
      // API — see `lib/ai/local-chat-bridge.ts`.
      setLocalAIActivated(true, localInferenceManager.getStatus().activeModelId ?? undefined);
      setTimeout(() => setIsOpen(false), 3000);
    };

    localInferenceManager.on('progress', handleProgress);
    localInferenceManager.on('ready', handleReady);

    return () => {
      localInferenceManager.off('progress', handleProgress);
      localInferenceManager.off('ready', handleReady);
    };
  }, []);

  // Simulates the user attempting to use the Intelligent NPC feature.
  const triggerNPCFeature = async () => {
    // If already downloaded or previously declined, don't show again (would use localStorage in production).
    if (isCompleted) return;

    const check = await localInferenceManager.checkHardwareCapability();
    setHardwareCheck(check);

    // If the machine can't handle it, just log and silently fall back to the cloud.
    if (!check.supported) {
      logger.warn('Falling back to cloud API:', check.reason);
      return;
    }

    setIsOpen(true);
  };

  const handleDownloadAccept = async () => {
    setIsDownloading(true);
    // Relative path (not the `@/` alias) so webpack's static `new URL(...)` analysis can bundle the worker.
    const worker = new Worker(new URL('../../lib/ai/mlc-worker.ts', import.meta.url), { type: 'module' });
    try {
      await localInferenceManager.loadModel(worker, 'Llama-3-8B-Instruct-q4f32_1-MLC');
    } catch (err) {
      logger.error('Failed to load local AI model', err);
      setIsDownloading(false);
    }
  };

  const handleDecline = () => {
    setIsOpen(false);
    // Records the choice; the app continues routing through the cloud AI provider interceptor.
  };

  if (!isOpen) {
    // Button only for debug/demonstration in the UI
    return (
      <button 
        onClick={triggerNPCFeature}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-700 transition"
      >
        Add Intelligent NPC
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl max-w-lg w-full text-white shadow-2xl">
        
        {!isDownloading && !isCompleted ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-blue-400">Activate Local Cognitive Engine?</h2>
            
            <p className="text-slate-300 mb-4">
              We noticed that your PC has a powerful GPU! 🚀
            </p>
            <p className="text-slate-300 mb-6">
              You can download our <strong>Local AI Brain (4.5 GB)</strong> once. This will 
              <strong className="text-emerald-400"> zero your API costs</strong> with OpenAI/Anthropic and completely remove latency, 
              greatly improving your workflow for creating maps, NPCs, and interactive scenes.
            </p>

            <div className="bg-slate-800 p-4 rounded text-sm text-slate-400 mb-6 border border-slate-700">
              <p>✔ $0.00 cost for real-time NPCs</p>
              <p>✔ Works fully offline</p>
              <p>✔ Aethel&apos;s interface will be automatically adjusted</p>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={handleDecline}
                className="px-4 py-2 text-slate-400 hover:text-white transition"
              >
                Continue in the Cloud (API)
              </button>
              <button 
                onClick={handleDownloadAccept}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-semibold transition"
              >
                Download Local AI (4.5 GB)
              </button>
            </div>
          </>
        ) : isDownloading ? (
          <div className="text-center py-6">
            <h2 className="text-xl font-bold mb-4 text-slate-200">Enhancing your Engine...</h2>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-4 mb-4 overflow-hidden border border-slate-700">
              <div 
                className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
            
            <p className="text-slate-400 text-sm">{downloadStatus}</p>
            <p className="text-blue-400 mt-2 font-mono">{downloadProgress}% completed</p>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-full mx-auto mb-4 text-3xl">
              ✓
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white">Local AI Activated!</h2>
            <p className="text-slate-400">
              Your IDE has been adjusted. Cost panels have been hidden, and you now have infinite intelligence at zero cost.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
