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
        ? `I can see you're working on **${activeFile.path}**. How can I help you with this file?`
        : 'Hello! I\'m your AI coding assistant. Open a file or ask me anything about your project.',
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
          label: 'Explain this code', 
          prompt: 'Can you explain what this code does?' 
        },
        { 
          icon: <Sparkles size={14} />, 
          label: 'Refactor', 
          prompt: 'Can you refactor this code to make it cleaner?' 
        },
        { 
          icon: <FileText size={14} />, 
          label: 'Add docs', 
          prompt: 'Can you add documentation to this code?' 
        },
        { 
          icon: <Check size={14} />, 
          label: 'Find bugs', 
          prompt: 'Can you find any bugs or issues in this code?' 
        },
      ]
    : [
        { 
          icon: <Sparkles size={14} />, 
          label: 'New feature', 
          prompt: 'Help me create a new feature' 
        },
        { 
          icon: <Code2 size={14} />, 
          label: 'Code review', 
          prompt: 'Can you review my project structure?' 
        },
      ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: tokens.colors.bg.surface,
        color: tokens.colors.text.primary,
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
          borderBottom: `1px solid ${tokens.colors.border.light}`,
          background: 'rgba(255, 255, 255, 0.02)',
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
              background: `linear-gradient(135deg, ${tokens.colors.accent.cyan}, ${tokens.colors.accent.indigo})`,
            }}
          >
            <Bot size={16} color={tokens.colors.text.inverse} />
          </div>
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm,
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
              }}
            >
              AI Assistant
            </div>
            {activeFile && (
              <div
                style={{
                  fontSize: tokens.typography.fontSize.xs,
                  color: tokens.colors.text.muted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing['1'],
                  marginTop: tokens.spacing['0.5'],
                }}
              >
                <FileText size={10} />
                Context: {activeFile.path}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'] }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowContext(!showContext);
            }}
            style={{
              padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
              background: showContext ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: `1px solid ${tokens.colors.border.light}`,
              borderRadius: tokens.radius.md,
              color: tokens.colors.text.muted,
              fontSize: tokens.typography.fontSize.xs,
              cursor: 'pointer',
            }}
          >
            Context
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: tokens.colors.text.muted,
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
            background: 'rgba(6, 182, 212, 0.05)',
            borderBottom: `1px solid ${tokens.colors.border.light}`,
            fontSize: tokens.typography.fontSize.xs,
          }}
        >
          <div style={{ marginBottom: tokens.spacing['2'], color: tokens.colors.accent.cyan, fontWeight: tokens.typography.fontWeight.medium }}>
            Active Context
          </div>
          {activeFile ? (
            <>
              <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing['1'] }}>
                <strong>File:</strong> {activeFile.path}
              </div>
              <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing['1'] }}>
                <strong>Language:</strong> {activeFile.language}
              </div>
              <div style={{ color: tokens.colors.text.secondary }}>
                <strong>Size:</strong> {activeFile.content.length} characters
              </div>
            </>
          ) : (
            <div style={{ color: tokens.colors.text.muted }}>
              No file open. Open a file to enable context-aware assistance.
            </div>
          )}
          {projectContext && (
            <div style={{ marginTop: tokens.spacing['2'], color: tokens.colors.text.secondary }}>
              <strong>Project:</strong> {projectContext.name} ({projectContext.files.length} files)
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
                  color: tokens.colors.text.muted,
                  fontSize: tokens.typography.fontSize.sm,
                }}
              >
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                AI is thinking...
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
              borderTop: `1px solid ${tokens.colors.border.light}`,
            }}
          >
            {suggestionChips.map((chip, index) => (
              <button
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
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${tokens.colors.border.light}`,
                  borderRadius: tokens.radius.full,
                  color: tokens.colors.text.secondary,
                  fontSize: tokens.typography.fontSize.xs,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: `all ${tokens.animation.duration.fast}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = tokens.colors.border.medium;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = tokens.colors.border.light;
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
              borderTop: `1px solid ${tokens.colors.border.light}`,
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: tokens.spacing['2'],
                padding: tokens.spacing['3'],
                background: tokens.colors.bg.primary,
                border: `1px solid ${tokens.colors.border.light}`,
                borderRadius: tokens.radius.xl,
                transition: `border-color ${tokens.animation.duration.fast}`,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.accent.cyan;
                e.currentTarget.style.boxShadow = `0 0 0 3px rgba(6, 182, 212, 0.1)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.border.light;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your code..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: tokens.colors.text.primary,
                  fontSize: tokens.typography.fontSize.sm,
                  fontFamily: tokens.typography.fontFamily.sans,
                  resize: 'none',
                  minHeight: '24px',
                  maxHeight: '120px',
                  lineHeight: '1.5',
                }}
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                style={{
                  padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
                  background: input.trim() && !isLoading
                    ? `linear-gradient(135deg, ${tokens.colors.accent.cyan}, ${tokens.colors.accent.indigo})`
                    : tokens.colors.bg.elevated,
                  border: 'none',
                  borderRadius: tokens.radius.lg,
                  color: tokens.colors.text.primary,
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
                color: tokens.colors.text.muted,
                textAlign: 'center',
              }}
            >
              Press Enter to send, Shift+Enter for new line
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
            ? tokens.colors.bg.elevated
            : `linear-gradient(135deg, ${tokens.colors.accent.cyan}, ${tokens.colors.accent.indigo})`,
        }}
      >
        {isUser ? (
          <User size={14} color={tokens.colors.text.secondary} />
        ) : (
          <Bot size={14} color={tokens.colors.text.inverse} />
        )}
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: '85%',
          padding: isSystem ? 0 : tokens.spacing['3'],
          background: isUser
            ? `linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(99, 102, 241, 0.1))`
            : isSystem
            ? 'transparent'
            : 'rgba(255, 255, 255, 0.05)',
          border: isSystem ? 'none' : `1px solid ${isUser ? 'rgba(6, 182, 212, 0.2)' : tokens.colors.border.light}`,
          borderRadius: tokens.radius.lg,
        }}
      >
        <div
          style={{
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.text.primary,
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
        border: `1px solid ${tokens.colors.border.light}`,
        borderRadius: tokens.radius.lg,
        overflow: 'hidden',
        background: tokens.colors.bg.primary,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: `1px solid ${tokens.colors.border.light}`,
        }}
      >
        <span
          style={{
            fontSize: tokens.typography.fontSize.xs,
            color: tokens.colors.text.muted,
            textTransform: 'uppercase',
          }}
        >
          {language}
        </span>
        <div style={{ display: 'flex', gap: tokens.spacing['2'] }}>
          <button
            onClick={copyToClipboard}
            style={{
              padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.light}`,
              borderRadius: tokens.radius.md,
              color: tokens.colors.text.muted,
              fontSize: tokens.typography.fontSize.xs,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing['1'],
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {onApply && (
            <button
              onClick={() => onApply(code)}
              style={{
                padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
                background: `linear-gradient(135deg, ${tokens.colors.accent.cyan}, ${tokens.colors.accent.indigo})`,
                border: 'none',
                borderRadius: tokens.radius.md,
                color: tokens.colors.text.primary,
                fontSize: tokens.typography.fontSize.xs,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing['1'],
              }}
            >
              <Sparkles size={12} />
              Apply
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
          color: tokens.colors.text.secondary,
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
    return `This code defines a **React component** that manages state using the \`useState\` hook. Here's what's happening:

1. The component initializes with a default state
2. It provides handlers for user interactions  
3. The UI updates reactively based on state changes

Would you like me to refactor it or add error handling?`;
  }

  if (input.toLowerCase().includes('refactor')) {
    return `Here's a refactored version with better separation of concerns:

\`\`\`typescript
// Extract logic into custom hook
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

This approach makes the code more testable and reusable.`;
  }

  return `I understand you're asking about "${input}". ${activeFile ? `I can see you're working in **${activeFile.path}**.` : ''}

How can I help you with this? I can:
- Explain code concepts
- Suggest improvements
- Generate new code
- Debug issues`;
}

export default InlineAIChat;
