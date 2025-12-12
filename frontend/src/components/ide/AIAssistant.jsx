import React, { useState, useRef, useEffect } from 'react';
import { useIDEStore } from '@/store/ideStore';
import { queryAI } from '@/services/api';
import { Bot, Send, Trash2, Code, Bug, Lightbulb, FileCode, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const AIAssistant = () => {
  const { aiConversation, addAIMessage, aiLoading, setAILoading, clearAIConversation, editorContent, activeFileId, openFiles } = useIDEStore();
  const [input, setInput] = useState('');
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
        context: editorContent ? `Current file: ${activeFile?.name}\n\n${editorContent}` : null
      });
      
      addAIMessage({ role: 'assistant', content: response.data.response });
    } catch (err) {
      addAIMessage({ role: 'assistant', content: `Error: ${err.message}. Please try again.` });
    } finally {
      setAILoading(false);
    }
  };
  
  const quickActions = [
    { icon: Code, label: 'Explain Code', query: 'Explain this code in detail' },
    { icon: Bug, label: 'Find Bugs', query: 'Find potential bugs in this code' },
    { icon: Lightbulb, label: 'Improve', query: 'Suggest improvements for this code' },
    { icon: FileCode, label: 'Generate Tests', query: 'Generate unit tests for this code' }
  ];
  
  const handleQuickAction = (query) => {
    setInput(query);
    inputRef.current?.focus();
  };
  
  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">AI Assistant</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={clearAIConversation}
          data-testid="ai-clear"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-zinc-800">
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={() => handleQuickAction(action.query)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors"
            data-testid={`ai-quick-${action.label.toLowerCase().replace(' ', '-')}`}
          >
            <action.icon className="w-3 h-3" />
            {action.label}
          </button>
        ))}
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {aiConversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
            <Bot className="w-12 h-12 mb-3 text-zinc-600" />
            <p className="text-sm">How can I help you today?</p>
            <p className="text-xs mt-1">Ask me to explain, debug, or improve your code</p>
          </div>
        ) : (
          <div className="space-y-4">
            {aiConversation.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "p-3 rounded-lg text-sm",
                  msg.role === 'user'
                    ? "bg-blue-500/20 text-blue-100 ml-8"
                    : "bg-zinc-800 text-zinc-200 mr-8"
                )}
              >
                <div className="flex items-start gap-2">
                  {msg.role === 'assistant' && (
                    <Bot className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="prose prose-invert prose-sm max-w-none">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="bg-zinc-800 text-zinc-200 mr-8 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
            disabled={aiLoading}
            data-testid="ai-input"
          />
          <Button
            type="submit"
            size="icon"
            disabled={aiLoading || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="ai-submit"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AIAssistant;
