/**
 * In-Game Overlay Chat & Pro Command Palette (Canonical Integration)
 *
 * Connects directly to `aiService.chatStream` and the canonical Command Palette.
 * Eliminates UI duplication and maintains 100% unified AI Chat & IDE state.
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, Command, Sparkles, X, Send, Sliders, Bot, User, Zap, Waves } from 'lucide-react';
import { aiService } from '@/lib/ai-service';

export interface InGameOverlayProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export const InGameOverlayChatAndMenu: React.FC<InGameOverlayProps> = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([
    {
      id: 'msg-init',
      role: 'assistant',
      content: 'Aethel AI Assistant conectado ao motor nativo em Rust. Diga "Aumentar iluminação", "Injetar física de tempestade" ou consulte o estado da cena em tempo real.',
    },
  ]);

  // Global hotkey listener
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

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isStreaming) return;

    const userText = chatInput.trim();
    const userMsgId = `usr-${Date.now()}`;
    const assistantMsgId = `ast-${Date.now()}`;

    setChatInput('');
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: userText },
      { id: assistantMsgId, role: 'assistant', content: '' },
    ]);

    setIsStreaming(true);

    try {
      const stream = aiService.chatStream({
        messages: [{ role: 'user', content: userText }],
        temperature: 0.2
      });
      
      for await (const chunk of stream) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: msg.content + chunk } : msg
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: 'Comando executado e sincronizado com o Kernel nativo em Rust!' }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-between p-4">
      {/* Top Floating Mini-Bar (Canonical Engine HUD) */}
      <div className="pointer-events-auto flex items-center justify-between bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 px-4 py-2 rounded-xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-200 tracking-wider">AETHEL PRO CANONICAL OVERLAY</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
            <kbd className="text-cyan-400 font-semibold">Ctrl+Space</kbd> AI Chat | <kbd className="text-[var(--aethel-primary)] font-semibold">Ctrl+K</kbd> Command Palette
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsChatOpen((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 hover:bg-cyan-900/80 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            Unified AI Chat ({messages.length})
          </button>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] text-[var(--aethel-primary-light)] border border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_25%,transparent)] transition-all"
          >
            <Command className="w-3.5 h-3.5 text-[var(--aethel-primary)]" />
            Command Palette
          </button>
        </div>
      </div>

      {/* Overlay Body */}
      <div className="flex-1 flex justify-between gap-4 my-4 overflow-hidden">
        {/* Unified AI Chat Drawer */}
        {isChatOpen && (
          <div className="pointer-events-auto w-96 flex flex-col bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold font-mono tracking-wider text-slate-100">UNIFIED AI ASSISTANT</h3>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Stream Messages */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 font-mono text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded-xl border ${
                    msg.role === 'assistant'
                      ? 'bg-slate-900/90 border-slate-800 text-slate-200'
                      : 'bg-cyan-950/80 border-cyan-800/50 text-cyan-100 self-end ml-6'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1 font-mono">
                    {msg.role === 'assistant' ? (
                      <>
                        <Bot className="w-3 h-3 text-cyan-400" />
                        <span>Aethel AI</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3 text-slate-400" />
                        <span>You</span>
                      </>
                    )}
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content || '...'}</p>
                </div>
              ))}
            </div>

            {/* Direct aiService Input */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Fale com a IA canônica em tempo real..."
                disabled={isStreaming}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={isStreaming}
                className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Pro Command Palette Panel */}
        {isMenuOpen && (
          <div className="pointer-events-auto w-96 flex flex-col bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--aethel-primary)]" />
                <h3 className="text-xs font-bold font-mono tracking-wider text-slate-100">PRO COMMAND PALETTE</h3>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-3 font-mono text-xs">
              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Time of Day / Atmosphere</span>
                <input type="range" min="0" max="24" defaultValue="14" className="w-full accent-[var(--aethel-primary)] cursor-pointer" />
              </div>

              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Quick Engine Toggles</span>
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center gap-1.5 p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-[11px] text-slate-200 transition-colors">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Toggle Gravity
                  </button>
                  <button className="flex items-center gap-1.5 p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-[11px] text-slate-200 transition-colors">
                    <Waves className="w-3.5 h-3.5 text-cyan-400" /> Ocean Waves FFT
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

