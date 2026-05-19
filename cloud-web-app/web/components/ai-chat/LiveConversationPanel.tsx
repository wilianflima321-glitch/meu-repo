'use client';

import { useState } from 'react';
import {
  Bug,
  Lightbulb,
  Paperclip,
  Send,
  Sparkles,
  StopCircle,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';

export interface LiveConversationPanelProps {
  isWorking: boolean;
  onInterrupt: () => void;
  onSendMessage: (message: string) => void;
}

/**
 * Gemini-Live-style bottom panel — status + compact composer + quick actions.
 * Extracted from AIChatPanelPro.tsx.
 */
export function LiveConversationPanel({ isWorking, onInterrupt, onSendMessage }: LiveConversationPanelProps) {
  const [liveInput, setLiveInput] = useState('');
  const [isLiveSpeaking] = useState(false);

  const handleLiveSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (liveInput.trim()) {
      onSendMessage(liveInput.trim());
      setLiveInput('');
    }
  };

  return (
    <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]">
      {/* Live Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--aethel-border-secondary)]">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isWorking ? 'bg-[var(--aethel-success)] animate-pulse' : 'bg-[var(--aethel-text-quaternary)]'
            }`}
          />
          <span className="text-xs font-medium text-[var(--aethel-text-secondary)]">
            {isWorking ? 'AI working' : 'Waiting'}
          </span>
        </div>
        {isWorking && (
          <button
            type="button"
            onClick={onInterrupt}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[color-mix(in_srgb,var(--aethel-error)_14%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] text-[11px] font-medium text-[var(--aethel-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-error)_22%,transparent)]"
            aria-label="Interrupt AI work"
          >
            <StopCircle className="w-3 h-3" />
            Interrupt
          </button>
        )}
      </div>

      {/* Live Input */}
      <div className="p-3">
        <form onSubmit={handleLiveSend} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={liveInput}
              onChange={(e) => setLiveInput(e.target.value)}
              placeholder="Chat while AI works..."
              className="w-full min-h-[60px] max-h-[120px] px-3 py-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] resize-none focus:outline-none focus:border-[color-mix(in_srgb,var(--aethel-info)_50%,transparent)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
              rows={2}
              aria-label="Live conversation message"
            />
          </div>
          <div className="flex items-center gap-1 pb-0.5">
            <button
              type="button"
              className={`rounded p-2 transition-colors ${
                isLiveSpeaking
                  ? 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]'
              }`}
              title={isLiveSpeaking ? 'Stop speaking' : 'Speak response'}
              aria-label={isLiveSpeaking ? 'Stop speaking' : 'Speak response'}
            >
              {isLiveSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              className="rounded p-2 text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] transition-colors"
              title="Attach file"
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!liveInput.trim()}
              className="rounded-lg bg-[var(--aethel-primary)] px-3 py-2 text-sm font-medium text-[var(--aethel-text-primary)] transition-colors hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send live message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Quick Actions */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { label: 'Continue', icon: Sparkles },
            { label: 'Fix', icon: Bug },
            { label: 'Explore', icon: Lightbulb },
            { label: 'Refine', icon: Wand2 },
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => setLiveInput((prev) => `${prev} ${action.label.toLowerCase()}: `)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
              aria-label={`Quick action: ${action.label}`}
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LiveConversationPanel;
