// ChatComponent.tsx: Interface de chat integrada com backend API
import React, { useState, useRef, useEffect } from 'react';
import { AethelAPIClient, APIError } from '@/lib/api';
import type { ChatMessage } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: Date;
}

const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'Bem-vindo ao Aethel Chat! Como posso ajudar você hoje?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedModel, setSelectedModel] = useState('openai:gpt-4o-mini');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Convert messages to API format
      const chatMessages: ChatMessage[] = messages
        .filter((m) => m.role !== 'error')
        .map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        }));

      // Add current user message
      chatMessages.push({ role: 'user', content: userMessage.content });

      // Call backend API
      const response = await AethelAPIClient.chat({
        model: selectedModel,
        messages: chatMessages,
      });

      // Extract assistant response
      const assistantContent =
        response.choices?.[0]?.message?.content ||
        response.message?.content ||
        'Sem resposta do modelo.';

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);

      let errorMessage = 'Falha ao enviar mensagem.';
      if (error instanceof APIError) {
        if (error.status === 401) {
          errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
        } else if (error.status === 402) {
          errorMessage = 'Créditos insuficientes. Por favor, recarregue sua conta.';
        } else if (error.status === 429) {
          errorMessage = 'Muitas requisições. Aguarde um momento e tente novamente.';
        } else {
          errorMessage = `Erro: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = `Erro: ${error.message}`;
      }

      const errorMsg: Message = {
        role: 'error',
        content: errorMessage,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStreamMessage = async () => {
    if (!input.trim() || isLoading || isStreaming) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      // Convert messages to API format
      const chatMessages: ChatMessage[] = messages
        .filter((m) => m.role !== 'error')
        .map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        }));

      // Add current user message
      chatMessages.push({ role: 'user', content: userMessage.content });

      // Stream response from backend
      let fullContent = '';
      for await (const chunk of AethelAPIClient.chatStream({
        model: selectedModel,
        messages: chatMessages,
      })) {
        // chunk is already a string from streamChat generator
        fullContent += chunk;
        setStreamingContent(fullContent);
      }

      // Save final message
      const assistantMessage: Message = {
        role: 'assistant',
        content: fullContent || 'Sem resposta do modelo.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent('');
    } catch (error) {
      console.error('Stream error:', error);

      let errorMessage = 'Falha ao transmitir mensagem.';
      if (error instanceof APIError) {
        errorMessage = `Erro ${error.status}: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Erro: ${error.message}`;
      }

      const errorMsg: Message = {
        role: 'error',
        content: errorMessage,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMsg]);
      setStreamingContent('');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStreamMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h1 className="text-xl font-bold">🧠 Aethel Chat</h1>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
          disabled={isLoading || isStreaming}
        >
          <option value="openai:gpt-4o-mini">GPT-4o Mini</option>
          <option value="openai:gpt-4">GPT-4</option>
          <option value="anthropic:claude-3-sonnet">Claude 3 Sonnet</option>
          <option value="google:gemini-pro">Gemini Pro</option>
          <option value="ollama:llama3">Llama 3 (Local)</option>
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.role === 'error'
                  ? 'bg-red-600 text-white'
                  : msg.role === 'system'
                  ? 'bg-gray-700 text-gray-300 italic'
                  : 'bg-gray-800 text-white'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {msg.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-800 text-white">
              <p className="whitespace-pre-wrap">{streamingContent}</p>
              <span className="text-xs opacity-70 mt-1 block animate-pulse">
                Transmitindo...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white resize-none focus:outline-none focus:border-blue-500"
            rows={2}
            disabled={isLoading || isStreaming}
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={handleStreamMessage}
              disabled={isLoading || isStreaming || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2 rounded font-semibold transition-colors"
            >
              {isStreaming ? '⏸️' : '🚀'} Stream
            </button>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || isStreaming || !input.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2 rounded font-semibold transition-colors"
            >
              {isLoading ? '⏳' : '📤'} Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
