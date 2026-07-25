/**
 * In-Game Overlay Chat & Hidden Interactive Pro Menu (Fullscreen Playtest HUD)
 *
 * Provides a professional, floating overlay menu and AI Assistant Chat overlay
 * that slides in over the expanded game viewport without pausing playtest execution.
 *
 * Hotkeys:
 * - `Ctrl + Space` or `~` (Tilde): Toggle In-Game AI Chat Overlay.
 * - `Ctrl + K` or `F12`: Toggle Professional Hidden Command Palette & Quick Inspector.
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, Command, Sliders, Sparkles, X, Send, Eye, ShieldCheck, Play, Pause } from 'lucide-react';

export interface InGameOverlayProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export const InGameOverlayChatAndMenu: React.FC<InGameOverlayProps> = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Aethel AI Companion ativo. Diga "Aumentar iluminação", "Criar tempestade" ou altere atributos do jogo em tempo real.',
      time: new Date().toLocaleTimeString(),
    },
  ]);

  // Global hotkey listener for ~ (Tilde) and Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.code === 'Space') || e.key === '`' || e.key === '~') {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      }
      if ((e.ctrlKey && e.code === 'KeyK') || e.key === 'F12') {
        e.preventDefault();
        setIsMenuOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const now = new Date().toLocaleTimeString();

    setMessages((prev) => [...prev, { sender: 'user', text: userText, time: now }]);
    setChatInput('');

    // Simulated AI Orchestrator Response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Orquestrador executou: "${userText}". Parâmetros do mundo 3D ajustados com sucesso via Rust Kernel!`,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    }, 600);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-between p-4">
      {/* Top Floating Mini-Bar (Always Visible in Fullscreen) */}
      <div className="pointer-events-auto flex items-center justify-between bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-4 py-2 rounded-xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-200 tracking-wider">AETHEL 2.0 FULLSCREEN OVERLAY</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
            Press <kbd className="text-cyan-400">Ctrl+Space</kbd> for AI Chat | <kbd className="text-indigo-400">Ctrl+K</kbd> for Menu
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsChatOpen((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 hover:bg-cyan-900/80 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            AI Chat ({messages.length})
          </button>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 hover:bg-indigo-900/80 transition-all"
          >
            <Command className="w-3.5 h-3.5 text-indigo-400" />
            Command Palette
          </button>
        </div>
      </div>

      {/* Main Overlay Body */}
      <div className="flex-1 flex justify-between gap-4 my-4 overflow-hidden">
        {/* Left: AI Chat Overlay Drawer */}
        {isChatOpen && (
          <div className="pointer-events-auto w-96 flex flex-col bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold font-mono tracking-wider text-slate-100">AI ASSISTANT IN-GAME CHAT</h3>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 font-mono text-xs">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl border ${
                    msg.sender === 'ai'
                      ? 'bg-slate-900/90 border-slate-800 text-slate-200'
                      : 'bg-cyan-950/80 border-cyan-800/50 text-cyan-100 self-end ml-6'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 mb-1 flex justify-between">
                    <span>{msg.sender === 'ai' ? '🤖 Aethel AI' : '👤 You'}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Input Box */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Fale com a IA em tempo real..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Right: Hidden Interactive Command Palette & Quick Inspector Menu */}
        {isMenuOpen && (
          <div className="pointer-events-auto w-96 flex flex-col bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold font-mono tracking-wider text-slate-100">PRO COMMAND PALETTE & HUD</h3>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-3 font-mono text-xs">
              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Time of Day / Atmosphere</span>
                <input type="range" min="0" max="24" defaultValue="14" className="w-full accent-indigo-500 cursor-pointer" />
              </div>

              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Quick Physics & World Controls</span>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-[11px] text-slate-200">
                    ⚡ Toggle Gravity
                  </button>
                  <button className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-[11px] text-slate-200">
                    🌊 Ocean Waves FFT
                  </button>
                  <button className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-[11px] text-slate-200">
                    ✨ Gaussian Splats
                  </button>
                  <button className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-[11px] text-slate-200">
                    💥 Voronoi Fracture
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
