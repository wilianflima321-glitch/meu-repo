import React, { useState, useRef, useEffect } from 'react';
import { useIDEStore } from '@/store/ideStore';
import { queryAI } from '@/services/api';
import { Bot, Send, Trash2, Code, Bug, Lightbulb, FileCode, Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AIAssistant = () => {
  const { aiConversation, addAIMessage, aiLoading, setAILoading, clearAIConversation, editorContent, activeFileId, openFiles } = useIDEStore();
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  
  const activeFile = openFiles.find(f => f.id === activeFileId);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiConversation]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || aiLoading) return;
    
    const query = input.trim();
    setInput('');
    
    addAIMessage({ role: 'user', content: query });
    setAILoading(true);
    
    try {
      const response = await queryAI({
        query,
        context: editorContent ? `Current file: ${activeFile?.name}\n\n\`\`\`\n${editorContent.slice(0, 2000)}\n\`\`\`` : null
      });
      
      addAIMessage({ role: 'assistant', content: response.data.response });
    } catch (err) {
      addAIMessage({ role: 'assistant', content: `I apologize, but I encountered an error: ${err.message}. Please try again.` });
    } finally {
      setAILoading(false);
    }
  };
  
  const quickActions = [
    { icon: Code, label: 'Explain', query: 'Explain this code step by step' },
    { icon: Bug, label: 'Debug', query: 'Find and fix bugs in this code' },
    { icon: Lightbulb, label: 'Optimize', query: 'Optimize and improve this code' },
    { icon: FileCode, label: 'Tests', query: 'Generate comprehensive unit tests' }
  ];
  
  const handleQuickAction = (query) => {
    setInput(query);
    inputRef.current?.focus();
  };
  
  const handleCopy = async (content, index) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };
  
  const CodeBlock = ({ children, className }) => {
    const code = String(children).replace(/\n$/, '');
    const language = className?.replace('language-', '') || '';
    
    return (
      <div className="relative group my-2">
        <div className="flex items-center justify-between px-3 py-1 bg-zinc-800 rounded-t border-b border-zinc-700">
          <span className="text-xs text-zinc-500">{language || 'code'}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleCopy(code, -1)}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
        <pre className="p-3 bg-zinc-900 rounded-b overflow-x-auto">
          <code className="text-sm text-zinc-300 font-mono">{code}</code>
        </pre>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-medium text-white">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={clearAIConversation}
            title="Clear conversation"
            data-testid="ai-clear"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex gap-1 p-2 border-b border-zinc-800 flex-wrap">
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={() => handleQuickAction(action.query)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors border border-zinc-700 hover:border-zinc-600"
            data-testid={`ai-quick-${action.label.toLowerCase()}`}
          >
            <action.icon className="w-3.5 h-3.5 text-purple-400" />
            {action.label}
          </button>
        ))}
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {aiConversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">AI Assistant</h3>
            <p className="text-sm text-zinc-500 max-w-[200px]">
              Ask me to explain, debug, optimize, or generate code
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 w-full max-w-[240px]">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickAction(action.query)}
                  className="flex flex-col items-center gap-1 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <action.icon className="w-5 h-5 text-purple-400" />
                  <span className="text-xs text-zinc-400">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {aiConversation.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl text-sm",
                  msg.role === 'user'
                    ? "bg-blue-500/10 border border-blue-500/20 text-blue-100 ml-6 p-3"
                    : "bg-zinc-800/50 text-zinc-200 mr-2 p-4"
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-700">
                    <Bot className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-zinc-500">AI Assistant</span>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleCopy(msg.content, i)}
                      >
                        {copiedIndex === i ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: ({ node, inline, className, children, ...props }) => {
                        if (inline) {
                          return <code className="px-1 py-0.5 bg-zinc-800 rounded text-purple-300" {...props}>{children}</code>;
                        }
                        return <CodeBlock className={className}>{children}</CodeBlock>;
                      },
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                      h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="bg-zinc-800/50 text-zinc-200 mr-2 p-4 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <RefreshCw className="w-3 h-3 text-white animate-spin" />
                  </div>
                  <span className="text-sm text-zinc-400">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
      
      {/* Context Indicator */}
      {activeFile && (
        <div className="px-3 py-1 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <FileCode className="w-3 h-3" />
            <span>Context: {activeFile.name}</span>
          </div>
        </div>
      )}
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask AI anything..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 resize-none min-h-[44px] max-h-[120px]"
              disabled={aiLoading}
              rows={1}
              data-testid="ai-input"
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={aiLoading || !input.trim()}
            className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
            data-testid="ai-submit"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
};

export default AIAssistant;
