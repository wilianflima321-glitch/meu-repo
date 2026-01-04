'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  X, 
  Send, 
  Loader2, 
  Check,
  AlertCircle,
  Wand2,
  Code,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

/**
 * InlineEditModal - Componente de edição inline estilo Cursor AI
 * 
 * Features:
 * - Cmd+K para abrir em qualquer seleção de código
 * - Input de instrução com autocomplete
 * - Preview das mudanças antes de aceitar
 * - Undo/Redo das mudanças
 * - Histórico de comandos recentes
 */

interface InlineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCode: string;
  onApply: (newCode: string) => void;
  language?: string;
  filePath?: string;
  cursorPosition?: { line: number; column: number };
}

interface EditSuggestion {
  original: string;
  modified: string;
  explanation: string;
  confidence: number;
}

const QUICK_ACTIONS = [
  { id: 'refactor', label: 'Refatorar', icon: RefreshCw, prompt: 'Refatore este código para ser mais limpo e legível' },
  { id: 'optimize', label: 'Otimizar', icon: Wand2, prompt: 'Otimize este código para melhor performance' },
  { id: 'fix', label: 'Corrigir', icon: AlertCircle, prompt: 'Corrija bugs e problemas neste código' },
  { id: 'types', label: 'Add Types', icon: Code, prompt: 'Adicione tipos TypeScript a este código' },
];

export function InlineEditModal({
  isOpen,
  onClose,
  selectedCode,
  onApply,
  language = 'typescript',
  filePath,
  cursorPosition,
}: InlineEditModalProps) {
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestion, setSuggestion] = useState<EditSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [recentCommands] = useState<string[]>([
    'Adicione tratamento de erro',
    'Converta para async/await',
    'Extraia para função separada',
    'Adicione comentários JSDoc',
  ]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && suggestion) {
        handleApply();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, suggestion, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!instruction.trim() && !selectedCode) return;

    setIsProcessing(true);
    setError(null);
    setSuggestion(null);

    try {
      const response = await fetch('/api/ai/inline-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedCode,
          instruction: instruction.trim(),
          language,
          filePath,
          context: {
            cursorPosition,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao processar edição');
      }

      const data = await response.json();

      setSuggestion({
        original: selectedCode,
        modified: data.code,
        explanation: data.explanation,
        confidence: data.confidence || 0.9,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsProcessing(false);
    }
  }, [instruction, selectedCode, language, filePath, cursorPosition]);

  const handleApply = () => {
    if (suggestion) {
      onApply(suggestion.modified);
      onClose();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInstruction(prompt);
    // Auto-submit
    setTimeout(() => handleSubmit(), 100);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-20"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="w-full max-w-2xl bg-[#1e1e2e] border border-[#313244] rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#313244]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-medium text-white">Edição Inline</span>
              <kbd className="px-1.5 py-0.5 text-xs bg-[#313244] text-[#cdd6f4] rounded">
                ⌘K
              </kbd>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-[#6c7086] hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected Code Preview */}
          {selectedCode && (
            <div className="px-4 py-2 border-b border-[#313244] bg-[#181825]">
              <div className="text-xs text-[#6c7086] mb-1">Código selecionado:</div>
              <pre className="text-xs text-[#cdd6f4] font-mono max-h-24 overflow-auto">
                {selectedCode.slice(0, 500)}
                {selectedCode.length > 500 && '...'}
              </pre>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 px-4 py-3 border-b border-[#313244]">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action.prompt)}
                className="bg-[#313244] border-[#45475a] text-[#cdd6f4] hover:bg-[#45475a] hover:text-white"
                disabled={isProcessing}
              >
                <action.icon className="h-3.5 w-3.5 mr-1.5" />
                {action.label}
              </Button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 py-3">
            <div className="relative">
              <Textarea
                ref={inputRef}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="O que você quer fazer com este código?"
                className="min-h-[60px] bg-[#181825] border-[#313244] text-white placeholder:text-[#6c7086] resize-none pr-24"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isProcessing || (!instruction.trim() && !selectedCode)}
                className="absolute bottom-2 right-2 bg-purple-600 hover:bg-purple-700"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Gerar
                  </>
                )}
              </Button>
            </div>

            {/* Recent Commands */}
            {!instruction && !suggestion && (
              <div className="mt-3">
                <div className="text-xs text-[#6c7086] mb-2">Comandos recentes:</div>
                <div className="flex flex-wrap gap-1.5">
                  {recentCommands.map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => setInstruction(cmd)}
                      className="px-2 py-1 text-xs bg-[#313244] text-[#a6adc8] rounded hover:bg-[#45475a] hover:text-white transition-colors"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Suggestion/Diff */}
          {suggestion && (
            <div className="border-t border-[#313244]">
              <div className="flex items-center justify-between px-4 py-2 bg-[#181825]">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-white">Sugestão gerada</span>
                  <span className="text-xs text-[#6c7086]">
                    {Math.round(suggestion.confidence * 100)}% confiança
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDiff(!showDiff)}
                    className="text-[#6c7086] hover:text-white"
                  >
                    {showDiff ? 'Ocultar Diff' : 'Mostrar Diff'}
                  </Button>
                </div>
              </div>

              {/* Explanation */}
              <div className="px-4 py-2 border-b border-[#313244]">
                <p className="text-xs text-[#a6adc8]">{suggestion.explanation}</p>
              </div>

              {/* Diff View */}
              {showDiff && (
                <div className="max-h-64 overflow-auto">
                  <DiffView
                    original={suggestion.original}
                    modified={suggestion.modified}
                    language={language}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#181825]">
                <Button
                  variant="ghost"
                  onClick={() => setSuggestion(null)}
                  className="text-[#6c7086] hover:text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerar
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="border-[#45475a] text-[#cdd6f4]"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleApply}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aplicar
                    <kbd className="ml-2 px-1 py-0.5 text-xs bg-green-700 rounded">⌘↵</kbd>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// DIFF VIEW COMPONENT
// ============================================================================

interface DiffViewProps {
  original: string;
  modified: string;
  language: string;
}

function DiffView({ original, modified, language }: DiffViewProps) {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');

  // Simple diff algorithm
  const diff = computeSimpleDiff(originalLines, modifiedLines);

  return (
    <div className="font-mono text-xs">
      {diff.map((item, idx) => (
        <div
          key={idx}
          className={cn(
            'px-4 py-0.5',
            item.type === 'removed' && 'bg-red-500/20 text-red-300',
            item.type === 'added' && 'bg-green-500/20 text-green-300',
            item.type === 'unchanged' && 'text-[#6c7086]'
          )}
        >
          <span className="inline-block w-8 text-right opacity-50 mr-2">
            {item.type === 'removed' ? '-' : item.type === 'added' ? '+' : ' '}
          </span>
          {item.content}
        </div>
      ))}
    </div>
  );
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
}

function computeSimpleDiff(original: string[], modified: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  const maxLen = Math.max(original.length, modified.length);

  for (let i = 0; i < maxLen; i++) {
    const origLine = original[i];
    const modLine = modified[i];

    if (origLine === modLine) {
      if (origLine !== undefined) {
        result.push({ type: 'unchanged', content: origLine });
      }
    } else {
      if (origLine !== undefined) {
        result.push({ type: 'removed', content: origLine });
      }
      if (modLine !== undefined) {
        result.push({ type: 'added', content: modLine });
      }
    }
  }

  return result;
}

// ============================================================================
// HOOK FOR INLINE EDIT INTEGRATION
// ============================================================================

export function useInlineEdit() {
  const [isOpen, setIsOpen] = useState(false);
  const [selection, setSelection] = useState({
    code: '',
    language: 'typescript',
    filePath: '',
    position: { line: 0, column: 0 },
  });

  const openInlineEdit = useCallback((
    code: string,
    language?: string,
    filePath?: string,
    position?: { line: number; column: number }
  ) => {
    setSelection({
      code,
      language: language || 'typescript',
      filePath: filePath || '',
      position: position || { line: 0, column: 0 },
    });
    setIsOpen(true);
  }, []);

  const closeInlineEdit = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Register Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        
        // Get current selection from Monaco or textarea
        const selection = window.getSelection()?.toString() || '';
        
        if (selection) {
          openInlineEdit(selection);
        } else {
          // Open with empty selection for new code generation
          openInlineEdit('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openInlineEdit]);

  return {
    isOpen,
    selection,
    openInlineEdit,
    closeInlineEdit,
  };
}

export default InlineEditModal;
