import React, { useState, useEffect } from 'react';
import { localInferenceManager } from '@/lib/ai/local-inference-manager';

export const LocalAIModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hardwareCheck, setHardwareCheck] = useState<{ supported: boolean; reason?: string } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // Escuta eventos de progresso do downloader
    const handleProgress = (data: { text: string; progress: number }) => {
      setDownloadStatus(data.text);
      setDownloadProgress(data.progress);
    };

    const handleReady = () => {
      setIsDownloading(false);
      setIsCompleted(true);
      // Aqui dispararíamos uma action global (ex: Zustand) para ajustar a IDE inteira
      // setGlobalState({ isLocalAIEnabled: true });
      setTimeout(() => setIsOpen(false), 3000);
    };

    localInferenceManager.on('progress', handleProgress);
    localInferenceManager.on('ready', handleReady);

    return () => {
      localInferenceManager.off('progress', handleProgress);
      localInferenceManager.off('ready', handleReady);
    };
  }, []);

  // Simula a tentativa do usuário de usar o recurso de NPC Inteligente
  const triggerNPCFeature = async () => {
    // Se já estiver baixado ou se o usuário recusou antes, não mostra de novo (na vida real usaríamos localStorage)
    if (isCompleted) return;

    const check = await localInferenceManager.checkHardwareCapability();
    setHardwareCheck(check);
    
    // Se a máquina não aguenta, apenas loga e fallback pra nuvem, nem incomoda o usuário
    if (!check.supported) {
      console.warn('Fallback para Nuvem (Cloud API) ativado:', check.reason);
      return;
    }

    setIsOpen(true);
  };

  const handleDownloadAccept = async () => {
    setIsDownloading(true);
    // Simula inicialização do worker
    const worker = new Worker(new URL('@/lib/ai/mlc-worker.js', import.meta.url));
    try {
      await localInferenceManager.loadModel(worker);
    } catch (err) {
      console.error(err);
      setIsDownloading(false);
    }
  };

  const handleDecline = () => {
    setIsOpen(false);
    // O sistema registra a escolha e passa a usar o AI Provider Interceptor (Redis/Nuvem)
  };

  if (!isOpen) {
    // Botão apenas para debug/demonstração na UI
    return (
      <button 
        onClick={triggerNPCFeature}
        className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded shadow-lg hover:bg-purple-700 transition"
      >
        Adicionar NPC Inteligente
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl max-w-lg w-full text-white shadow-2xl">
        
        {!isDownloading && !isCompleted ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-purple-400">Ativar Motor Cognitivo Local?</h2>
            
            <p className="text-slate-300 mb-4">
              Notamos que o seu PC possui uma placa de vídeo potente! 🚀
            </p>
            <p className="text-slate-300 mb-6">
              Você pode baixar o nosso <strong>Cérebro de IA Local (4.5 GB)</strong> uma única vez. Isso vai 
              <strong className="text-emerald-400"> zerar os seus custos de API</strong> com a OpenAI/Anthropic e remover completamente a latência, 
              melhorando absurdamente o seu fluxo de trabalho para criar mapas, NPCs e cenários interativos.
            </p>

            <div className="bg-slate-800 p-4 rounded text-sm text-slate-400 mb-6 border border-slate-700">
              <p>✔ Custo R$ 0.00 para NPCs em tempo real</p>
              <p>✔ Funciona totalmente Offline</p>
              <p>✔ A Interface do Aethel será ajustada automaticamente</p>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={handleDecline}
                className="px-4 py-2 text-slate-400 hover:text-white transition"
              >
                Continuar na Nuvem (API)
              </button>
              <button 
                onClick={handleDownloadAccept}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded font-semibold transition"
              >
                Baixar IA Local (4.5 GB)
              </button>
            </div>
          </>
        ) : isDownloading ? (
          <div className="text-center py-6">
            <h2 className="text-xl font-bold mb-4 text-slate-200">Aprimorando sua Engine...</h2>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-4 mb-4 overflow-hidden border border-slate-700">
              <div 
                className="bg-purple-500 h-4 rounded-full transition-all duration-300"
                style={{ width: \`\${downloadProgress}%\` }}
              ></div>
            </div>
            
            <p className="text-slate-400 text-sm">{downloadStatus}</p>
            <p className="text-purple-400 mt-2 font-mono">{downloadProgress}% concluído</p>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-full mx-auto mb-4 text-3xl">
              ✓
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white">IA Local Ativada!</h2>
            <p className="text-slate-400">
              Sua IDE foi ajustada. Os painéis de custos foram ocultados e você agora tem inteligência infinita a custo zero.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
