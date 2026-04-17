/**
 * Inline AI Chat - Context-aware chat integration for the editor
 * Addresses UX analysis finding: AI Chat not context-aware, isolated in sidebar
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Code2,
  FileText,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  Check,
  Copy
} from 'lucide-react';

const SURFACE_PRIMARY = 'var(--aethel-surface-primary)';
const SURFACE_SECONDARY = 'var(--aethel-surface-secondary)';
const SURFACE_TERTIARY = 'var(--aethel-surface-tertiary)';
const SURFACE_QUATERNARY = 'var(--aethel-surface-quaternary)';
const TEXT_PRIMARY = 'var(--aethel-text-primary)';
const TEXT_SECONDARY = 'var(--aethel-text-secondary)';
const TEXT_TERTIARY = 'var(--aethel-text-tertiary)';
const TEXT_INVERSE = 'var(--aethel-text-primary)';
const BORDER_PRIMARY = 'var(--aethel-border-primary)';
const BORDER_SECONDARY = 'var(--aethel-border-secondary)';
const BORDER_FOCUS = 'var(--aethel-border-focus)';
const ACCENT_CYAN = 'var(--aethel-info)';

// ============================================================================
// TYPES
// ============================================================================

interface InlineAIChatProps {
  activeFile?: {
    path: string;
    content: string;
    language: string;
  };
  projectContext?: {
    name: string;
    files: string[];
  };
  onApplyCode?: (code: string) => void;
  onClose?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  codeBlocks?: Array<{
    language: string;
    code: string;
  }>;
  isStreaming?: boolean;
}

interface SuggestionChip {
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

// ============================================================================
// INLINE AI CHAT COMPONENT
// ============================================================================

export function InlineAIChat({
  activeFile,
  projectContext,
  onApplyCode,
  onClose,
}: InlineAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: activeFile
        ? `Estou vendo que voce esta trabalhando em **${activeFile.path}**. Como posso ajudar com este arquivo?`
        : 'Ola! Sou seu assistente de IA para codigo. Abra um arquivo ou me pergunte qualquer coisa sobre o projeto.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: generateMockResponse(input, activeFile),
        timestamp: new Date(),
        codeBlocks: extractCodeBlocks(generateMockResponse(input, activeFile)),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  }, [input, isLoading, activeFile]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestionChips: SuggestionChip[] = activeFile
    ? [
        {
          icon: <Code2 size={14} />,
          label: 'Explicar este codigo',
          prompt: 'Pode explicar o que este codigo faz?'
        },
        {
          icon: <Sparkles size={14} />,
          label: 'Refatorar',
          prompt: 'Pode refatorar este codigo para ficar mais limpo?'
        },
        {
          icon: <FileText size={14} />,
          label: 'Adicionar docs',
          prompt: 'Pode adicionar documentacao a este codigo?'
        },
        {
          icon: <Check size={14} />,
          label: 'Encontrar bugs',
          prompt: 'Pode encontrar bugs ou problemas neste codigo?'
        },
      ]
    : [
        {
          icon: <Sparkles size={14} />,
          label: 'Nova feature',
          prompt: 'Ajude-me a criar uma nova feature'
        },
        {
          icon: <Code2 size={14} />,
          label: 'Revisar codigo',
          prompt: 'Pode revisar a estrutura do meu projeto?'
        },
      ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: SURFACE_SECONDARY,
        color: TEXT_PRIMARY,
        fontFamily: tokens.typography.fontFamily.sans,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${tokens.spacing['3']} ${tokens.spacing['4']}`,
          borderBottom: `1px solid ${BORDER_SECONDARY}`,
          background: 'color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['3'] }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: tokens.radius.md,
              background: 'linear-gradient(135deg, var(--aethel-primary), var(--aethel-info))',
            }}
          >
            <Bot size={16} color={TEXT_INVERSE} />
          </div>
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm,
                fontWeight: tokens.typography.fontWeight.semibold,
                color: TEXT_PRIMARY,
              }}
            >
              Assistente de IA
            </div>
            {activeFile && (
              <div
                style={{
                  fontSize: tokens.typography.fontSize.xs,
                  color: TEXT_TERTIARY,
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing['1'],
                  marginTop: tokens.spacing['0.5'],
                }}
              >
                <FileText size={10} />
                Contexto: {activeFile.path}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'] }}>
          <button type="button" aria-label={showContext ? 'Ocultar contexto ativo' : 'Mostrar contexto ativo'}
            onClick={(e) => {
              e.stopPropagation();
              setShowContext(!showContext);
            }}
            style={{
              padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
              background: showContext ? 'color-mix(in_srgb,var(--aethel-surface-quaternary)_78%,transparent)' : 'transparent',
              border: `1px solid ${BORDER_SECONDARY}`,
              borderRadius: tokens.radius.md,
              color: TEXT_TERTIARY,
              fontSize: tokens.typography.fontSize.xs,
              cursor: 'pointer',
            }}
          >
            Contexto
          </button>
          <button type="button" aria-label="Fechar chat inline"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: TEXT_TERTIARY,
              cursor: 'pointer',
              padding: tokens.spacing['1'],
            }}
          >
            <X size={18} />
          </button>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>

      {/* Context Panel */}
      {showContext && isExpanded && (
        <div
          style={{
            padding: tokens.spacing['3'],
            background: 'color-mix(in_srgb,var(--aethel-info)_8%,transparent)',
            borderBottom: `1px solid ${BORDER_SECONDARY}`,
            fontSize: tokens.typography.fontSize.xs,
          }}
        >
          <div style={{ marginBottom: tokens.spacing['2'], color: ACCENT_CYAN, fontWeight: tokens.typography.fontWeight.medium }}>
            Contexto ativo
          </div>
          {activeFile ? (
            <>
              <div style={{ color: TEXT_SECONDARY, marginBottom: tokens.spacing['1'] }}>
                <strong>Arquivo:</strong> {activeFile.path}
              </div>
              <div style={{ color: TEXT_SECONDARY, marginBottom: tokens.spacing['1'] }}>
                <strong>Linguagem:</strong> {activeFile.language}
              </div>
              <div style={{ color: TEXT_SECONDARY }}>
                <strong>Tamanho:</strong> {activeFile.content.length} caracteres
              </div>
            </>
          ) : (
            <div style={{ color: TEXT_TERTIARY }}>
              Nenhum arquivo aberto. Abra um arquivo para habilitar a assistencia contextual.
            </div>
          )}
          {projectContext && (
            <div style={{ marginTop: tokens.spacing['2'], color: TEXT_SECONDARY }}>
              <strong>Projeto:</strong> {projectContext.name} ({projectContext.files.length} arquivos)
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {isExpanded && (
        <>
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: tokens.spacing['4'],
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing['4'],
            }}
          >
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onApplyCode={onApplyCode}
              />
            ))}
            {isLoading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing['2'],
                  color: TEXT_TERTIARY,
                  fontSize: tokens.typography.fontSize.sm,
                }}
              >
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                A IA esta pensando...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          <div
            style={{
              display: 'flex',
              gap: tokens.spacing['2'],
              padding: `${tokens.spacing['2']} ${tokens.spacing['4']}`,
              overflowX: 'auto',
              borderTop: `1px solid ${BORDER_SECONDARY}`,
            }}
          >
            {suggestionChips.map((chip, index) => (
              <button type="button" aria-label={`Usar sugestão rápida ${chip.label}`}
                key={index}
                onClick={() => {
                  setInput(chip.prompt);
                  inputRef.current?.focus();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing['2'],
                  padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
                  background: 'color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)',
                  border: `1px solid ${BORDER_SECONDARY}`,
                  borderRadius: tokens.radius.full,
                  color: TEXT_SECONDARY,
                  fontSize: tokens.typography.fontSize.xs,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: `all ${tokens.animation.duration.fast}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)';
                  e.currentTarget.style.borderColor = BORDER_PRIMARY;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)';
                  e.currentTarget.style.borderColor = BORDER_SECONDARY;
                }}
              >
                {chip.icon}
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: tokens.spacing['4'],
              borderTop: `1px solid ${BORDER_SECONDARY}`,
              background: 'color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: tokens.spacing['2'],
                padding: tokens.spacing['3'],
                background: SURFACE_PRIMARY,
                border: `1px solid ${BORDER_SECONDARY}`,
                borderRadius: tokens.radius.xl,
                transition: `border-color ${tokens.animation.duration.fast}`,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = BORDER_FOCUS;
                e.currentTarget.style.boxShadow = `0 0 0 3px rgba(6, 182, 212, 0.1)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = BORDER_SECONDARY;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte qualquer coisa sobre o seu codigo..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: TEXT_PRIMARY,
                  fontSize: tokens.typography.fontSize.sm,
                  fontFamily: tokens.typography.fontFamily.sans,
                  resize: 'none',
                  minHeight: '24px',
                  maxHeight: '120px',
                  lineHeight: '1.5',
                }}
                rows={1}
              />
              <button type="button" aria-label="Enviar mensagem no chat inline"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                style={{
                  padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
                  background: input.trim() && !isLoading
                    ? 'linear-gradient(135deg, var(--aethel-primary), var(--aethel-info))'
                    : SURFACE_TERTIARY,
                  border: 'none',
                  borderRadius: tokens.radius.lg,
                  color: TEXT_PRIMARY,
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  opacity: input.trim() && !isLoading ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: `all ${tokens.animation.duration.fast}`,
                }}
              >
                <Send size={16} />
              </button>
            </div>
            <div
              style={{
                marginTop: tokens.spacing['2'],
                fontSize: tokens.typography.fontSize.xs,
                color: TEXT_TERTIARY,
                textAlign: 'center',
              }}
            >
              Enter para enviar, Shift+Enter para nova linha
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

interface MessageBubbleProps {
  message: Message;
  onApplyCode?: (code: string) => void;
}

function MessageBubble({ message, onApplyCode }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      style={{
        display: 'flex',
        gap: tokens.spacing['3'],
        alignItems: 'flex-start',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: tokens.radius.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: isUser
            ? SURFACE_TERTIARY
            : 'linear-gradient(135deg, var(--aethel-primary), var(--aethel-info))',
        }}
      >
        {isUser ? (
          <User size={14} color={TEXT_SECONDARY} />
        ) : (
          <Bot size={14} color={TEXT_INVERSE} />
        )}
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: '85%',
          padding: isSystem ? 0 : tokens.spacing['3'],
          background: isUser
            ? 'linear-gradient(135deg, color-mix(in_srgb,var(--aethel-info)_16%,transparent), color-mix(in_srgb,var(--aethel-primary)_10%,transparent))'
            : isSystem
            ? 'transparent'
            : 'color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)',
          border: isSystem ? 'none' : `1px solid ${isUser ? 'color-mix(in_srgb,var(--aethel-info)_24%,transparent)' : BORDER_SECONDARY}`,
          borderRadius: tokens.radius.lg,
        }}
      >
        <div
          style={{
            fontSize: tokens.typography.fontSize.sm,
            color: TEXT_PRIMARY,
            lineHeight: tokens.typography.lineHeight.relaxed,
            whiteSpace: 'pre-wrap',
          }}
          dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
        />

        {/* Code Blocks */}
        {message.codeBlocks?.map((block, index) => (
          <CodeBlock
            key={index}
            language={block.language}
            code={block.code}
            onApply={onApplyCode}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CODE BLOCK
// ============================================================================

interface CodeBlockProps {
  language: string;
  code: string;
  onApply?: (code: string) => void;
}

function CodeBlock({ language, code, onApply }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        marginTop: tokens.spacing['3'],
        border: `1px solid ${BORDER_SECONDARY}`,
        borderRadius: tokens.radius.lg,
        overflow: 'hidden',
        background: SURFACE_PRIMARY,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
          background: 'color-mix(in_srgb,var(--aethel-surface-secondary)_76%,transparent)',
          borderBottom: `1px solid ${BORDER_SECONDARY}`,
        }}
      >
        <span
          style={{
            fontSize: tokens.typography.fontSize.xs,
            color: TEXT_TERTIARY,
            textTransform: 'uppercase',
          }}
        >
          {language}
        </span>
        <div style={{ display: 'flex', gap: tokens.spacing['2'] }}>
          <button type="button" aria-label="Copiar bloco de código"
            onClick={copyToClipboard}
            style={{
              padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
              background: 'transparent',
              border: `1px solid ${BORDER_SECONDARY}`,
              borderRadius: tokens.radius.md,
              color: TEXT_TERTIARY,
              fontSize: tokens.typography.fontSize.xs,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing['1'],
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          {onApply && (
            <button type="button" aria-label="Aplicar bloco de código ao editor"
              onClick={() => onApply(code)}
              style={{
                padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
                background: 'linear-gradient(135deg, var(--aethel-primary), var(--aethel-info))',
                border: 'none',
                borderRadius: tokens.radius.md,
                color: TEXT_PRIMARY,
                fontSize: tokens.typography.fontSize.xs,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing['1'],
              }}
            >
              <Sparkles size={12} />
              Aplicar
            </button>
          )}
        </div>
      </div>

      {/* Code */}
      <pre
        style={{
          margin: 0,
          padding: tokens.spacing['3'],
          overflow: 'auto',
          fontSize: tokens.typography.fontSize.xs,
          fontFamily: tokens.typography.fontFamily.mono,
          lineHeight: tokens.typography.lineHeight.normal,
          color: TEXT_SECONDARY,
          maxHeight: '300px',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatMessage(content: string): string {
  // Simple markdown formatting
  return content
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>');
}

function extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
  const blocks: Array<{ language: string; code: string }> = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    });
  }
  return blocks;
}

function generateMockResponse(input: string, activeFile?: { path: string; language: string }): string {
  // Mock responses for demo purposes
  if (input.toLowerCase().includes('explain')) {
    return `Este codigo define um **componente React** que gerencia estado com o hook \`useState\`. O fluxo principal e este:

1. O componente inicia com um estado padrao
2. Ele expoe handlers para interacoes do usuario
3. A interface reage automaticamente as mudancas de estado

Quer que eu refatore isso ou adicione tratamento de erro?`;
  }

  if (input.toLowerCase().includes('refactor')) {
    return `Aqui esta uma versao refatorada com melhor separacao de responsabilidades:

\`\`\`typescript
// Extrai a logica para um hook customizado
export function useProjectState() {
  const [state, setState] = useState(initialState);

  const handlers = useMemo(() => ({
    update: (key: string, value: any) =>
      setState(prev => ({ ...prev, [key]: value })),
    reset: () => setState(initialState)
  }), []);

  return [state, handlers] as const;
}
\`\`\`

Essa abordagem deixa o codigo mais testavel e reutilizavel.`;
  }

  return `Entendi que voce esta perguntando sobre "${input}". ${activeFile ? `Estou vendo que voce esta trabalhando em **${activeFile.path}**.` : ''}

Como posso ajudar com isso? Eu posso:
- Explicar conceitos de codigo
- Sugerir melhorias
- Gerar novo codigo
- Depurar problemas`;
}

export default InlineAIChat;
