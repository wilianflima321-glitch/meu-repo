// ChatComponent.tsx: Interface de chat integrada com backend API
import React, { useState, useRef, useEffect } from 'react';
import { AethelAPIClient, APIError } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import type { ChatMessage, ChatThreadSummary, CopilotWorkflowSummary } from '@/lib/api';
import { openConfirmDialog, openPromptDialog } from '@/lib/ui/non-blocking-dialogs';

const STORAGE_KEYS_BASE = {
  activeThreadId: 'chat::activeThreadId',
  activeWorkflowId: 'copilot::activeWorkflowId',
} as const;

function getScopedStorageKeys(projectId: string | null) {
  const suffix = projectId ? `::${projectId}` : '';
  return {
    activeThreadId: `${STORAGE_KEYS_BASE.activeThreadId}${suffix}`,
    activeWorkflowId: `${STORAGE_KEYS_BASE.activeWorkflowId}${suffix}`,
    legacyActiveThreadId: STORAGE_KEYS_BASE.activeThreadId,
    legacyActiveWorkflowId: STORAGE_KEYS_BASE.activeWorkflowId,
  };
}

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
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<CopilotWorkflowSummary[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [connectFromWorkflowId, setConnectFromWorkflowId] = useState<string>('');
  const [connectBusy, setConnectBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const pushSystem = (content: string) => {
    setMessages((prev) => [...prev, { role: 'system', content, timestamp: new Date() }]);
  };

  const pushError = (content: string) => {
    setMessages((prev) => [...prev, { role: 'error', content, timestamp: new Date() }]);
  };

  const loadThreadMessages = async (threadId: string) => {
    const data = await AethelAPIClient.getChatMessages(threadId);
    const raw = Array.isArray((data as any)?.messages) ? (data as any).messages : [];
    const restored: Message[] = raw
      .filter((m: any) => m && typeof m.content === 'string')
      .map((m: any) => ({
        role: (m.role as any) || 'user',
        content: m.content,
        timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
      }));
    if (restored.length) setMessages(restored);
    else {
      setMessages([
        {
          role: 'system',
          content: 'Bem-vindo ao Aethel Chat! Como posso ajudar você hoje?',
          timestamp: new Date(),
        },
      ]);
    }
  };

  const refreshWorkflows = async (): Promise<CopilotWorkflowSummary[]> => {
    setWorkflowsLoading(true);
    try {
      const res = await AethelAPIClient.listCopilotWorkflows().catch(() => ({ workflows: [] as any[] }));
      const list = Array.isArray((res as any).workflows) ? ((res as any).workflows as CopilotWorkflowSummary[]) : [];
      setWorkflows(list);
      return list;
    } finally {
      setWorkflowsLoading(false);
    }
  };

  // Restore last chat thread from account
  useEffect(() => {
    if (!isAuthenticated()) return;

    let cancelled = false;
    void (async () => {
      try {
        const ctx = await AethelAPIClient.getCopilotContext().catch(() => ({ projectId: null as any }));
        const projectId = typeof (ctx as any)?.projectId === 'string' ? String((ctx as any).projectId) : null;
        setActiveProjectId(projectId);

        const keys = getScopedStorageKeys(projectId);

        const storedWorkflowId = typeof window !== 'undefined'
          ? (window.localStorage.getItem(keys.activeWorkflowId) || window.localStorage.getItem(keys.legacyActiveWorkflowId))
          : null;
        const storedThreadId = typeof window !== 'undefined'
          ? (window.localStorage.getItem(keys.activeThreadId) || window.localStorage.getItem(keys.legacyActiveThreadId))
          : null;

        let wf: any = null;
        if (storedWorkflowId) {
          const got = await AethelAPIClient.getCopilotWorkflow(storedWorkflowId).catch(() => null);
          wf = (got as any)?.workflow ?? null;
        }

        const wfList = await refreshWorkflows();
        if (!wf?.id) {
          wf = wfList[0] ?? null;
        }

        if (wf?.id) {
          setActiveWorkflowId(String(wf.id));
          if (typeof window !== 'undefined') window.localStorage.setItem(keys.activeWorkflowId, String(wf.id));
          if (wf.chatThreadId) {
            setActiveThreadId(String(wf.chatThreadId));
            if (typeof window !== 'undefined') window.localStorage.setItem(keys.activeThreadId, String(wf.chatThreadId));
          }
        }

        const list = await AethelAPIClient.listChatThreads().catch(() => ({ threads: [] as any[] }));
        const threads = (Array.isArray((list as any).threads) ? (list as any).threads : []) as ChatThreadSummary[];

        // Determina a thread ativa: workflow -> localStorage -> primeira -> cria.
        let threadId: string | null = (wf?.chatThreadId as string | null) ?? (storedThreadId || null);
        if (threadId && !threads.find((t) => t?.id === threadId)) {
          threadId = null;
        }
        if (!threadId && threads.length > 0 && typeof threads[0]?.id === 'string') {
          threadId = threads[0].id;
        }
        if (!threadId) {
          const created = await AethelAPIClient.createChatThread({ title: wf?.title ? String(wf.title) : 'Chat' });
          threadId = (created as any)?.thread?.id ?? null;
        }

        if (!threadId || cancelled) return;

        setActiveThreadId(threadId);
        if (typeof window !== 'undefined') window.localStorage.setItem(keys.activeThreadId, threadId);

        // Se temos workflow mas ele ainda não tem thread, tenta ligar.
        if (wf?.id && !wf?.chatThreadId) {
          await AethelAPIClient.updateCopilotWorkflow(String(wf.id), { chatThreadId: threadId }).catch(() => null);
          await refreshWorkflows();
        }

        await loadThreadMessages(threadId);
      } catch (e) {
        console.warn('Failed to restore chat', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const switchWorkflow = async (workflowId: string) => {
    if (connectBusy) return;
    const got = await AethelAPIClient.getCopilotWorkflow(workflowId);
    const wf = (got as any)?.workflow as CopilotWorkflowSummary | undefined;
    if (!wf?.id) return;

    const projectId = wf.projectId ? String(wf.projectId) : null;
    setActiveProjectId(projectId);
    const keys = getScopedStorageKeys(projectId);

    setActiveWorkflowId(String(wf.id));
    if (typeof window !== 'undefined') window.localStorage.setItem(keys.activeWorkflowId, String(wf.id));

    let threadId: string | null = wf.chatThreadId ? String(wf.chatThreadId) : null;
    if (!threadId) {
      const created = await AethelAPIClient.createChatThread({ title: wf.title || 'Chat' });
      threadId = (created as any)?.thread?.id ?? null;
      if (threadId) {
        await AethelAPIClient.updateCopilotWorkflow(String(wf.id), { chatThreadId: threadId }).catch(() => null);
      }
      await refreshWorkflows();
    }

    if (!threadId) return;
    setActiveThreadId(threadId);
    if (typeof window !== 'undefined') window.localStorage.setItem(keys.activeThreadId, threadId);

    await loadThreadMessages(threadId);
  };

  const createWorkflow = async () => {
    if (connectBusy) return;
    const title = `Workflow ${new Date().toLocaleString()}`;
    const projectId = activeProjectId;
    const createdThread = await AethelAPIClient.createChatThread({ title, ...(projectId ? { projectId } : {}) });
    const threadId = (createdThread as any)?.thread?.id as string | undefined;
    const createdWf = await AethelAPIClient.createCopilotWorkflow({
      title,
      ...(projectId ? { projectId } : {}),
      ...(threadId ? { chatThreadId: threadId } : {}),
    });
    const wfId = (createdWf as any)?.workflow?.id as string | undefined;
    await refreshWorkflows();
    if (wfId) await switchWorkflow(String(wfId));
  };

  const copyHistoryFromWorkflow = async () => {
    if (!activeWorkflowId) return;
    if (!connectFromWorkflowId) {
      pushError('Selecione um trabalho para copiar o histórico.');
      return;
    }

    if (connectBusy) return;
    setConnectBusy(true);

    try {
      pushSystem('Copiando histórico (server-side)…');
      const sourceRes = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId).catch(() => null);
      const source = (sourceRes as any)?.workflow as any;
      const sourceThreadId = source?.chatThreadId ? String(source.chatThreadId) : null;
      if (!sourceThreadId) {
        pushError('Esse trabalho não tem histórico (thread) para copiar.');
        return;
      }

      const current = workflows.find((w) => String(w.id) === String(activeWorkflowId));
      const title = `${current?.title || 'Workflow'} (cópia)`;

      const created = await AethelAPIClient.cloneChatThread({ sourceThreadId, title }).catch(() => null);
      const newThreadId = (created as any)?.thread?.id ? String((created as any).thread.id) : null;
      if (!newThreadId) {
        pushError('Falha ao clonar o histórico.');
        return;
      }

      await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { chatThreadId: newThreadId }).catch(() => null);
      await refreshWorkflows().catch(() => null);
      setConnectFromWorkflowId('');
      await switchWorkflow(activeWorkflowId);
      pushSystem('Histórico copiado para este trabalho.');
    } finally {
      setConnectBusy(false);
    }
  };

  const importContextFromWorkflow = async () => {
    if (!activeWorkflowId) return;
    if (!connectFromWorkflowId) {
      pushError('Selecione um trabalho para importar o contexto.');
      return;
    }

    const sourceRes = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId).catch(() => null);
    const source = (sourceRes as any)?.workflow as any;
    const ctx = source?.context;
    if (!ctx || typeof ctx !== 'object') {
      pushError('Esse trabalho não tem contexto salvo para importar.');
      return;
    }

    const patch: any = { workflowId: activeWorkflowId };
    if ((ctx as any).livePreview) patch.livePreview = (ctx as any).livePreview;
    if ((ctx as any).editor) patch.editor = (ctx as any).editor;
    if (Array.isArray((ctx as any).openFiles)) patch.openFiles = (ctx as any).openFiles;

    if (connectBusy) return;
    setConnectBusy(true);
    try {
      pushSystem('Importando contexto…');
      await fetch('/api/copilot/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }).catch(() => null);

      pushSystem('Contexto importado para o trabalho atual.');
      setConnectFromWorkflowId('');
    } finally {
      setConnectBusy(false);
    }
  };

  const mergeFromWorkflow = async () => {
    if (!activeWorkflowId) return;
    if (!connectFromWorkflowId) {
      pushError('Selecione um trabalho para mesclar.' );
      return;
    }

    if (connectBusy) return;
    setConnectBusy(true);

    try {
      pushSystem('Mesclando trabalhos (server-side)…');

      const sourceRes = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId).catch(() => null);
      const source = (sourceRes as any)?.workflow as any;
      const sourceThreadId = source?.chatThreadId ? String(source.chatThreadId) : null;
      if (!sourceThreadId) {
        pushError('Esse trabalho não tem histórico (thread) para mesclar.' );
        return;
      }

      let targetThreadId: string | null = activeThreadId;
      if (!targetThreadId) {
        const current = workflows.find((w) => String(w.id) === String(activeWorkflowId));
        const created = await AethelAPIClient.createChatThread({
          title: current?.title || 'Chat',
          ...(activeProjectId ? { projectId: activeProjectId } : {}),
        });
        targetThreadId = (created as any)?.thread?.id ?? null;
        if (targetThreadId) {
          await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { chatThreadId: targetThreadId }).catch(() => null);
        }
      }

      if (!targetThreadId) {
        pushError('Não foi possível determinar a thread de destino.' );
        return;
      }

      await AethelAPIClient.mergeChatThreads({ sourceThreadId, targetThreadId }).catch(() => null);

      const ctx = source?.context;
      if (ctx && typeof ctx === 'object') {
        const patch: any = { workflowId: activeWorkflowId };
        if ((ctx as any).livePreview) patch.livePreview = (ctx as any).livePreview;
        if ((ctx as any).editor) patch.editor = (ctx as any).editor;
        if (Array.isArray((ctx as any).openFiles)) patch.openFiles = (ctx as any).openFiles;
        await fetch('/api/copilot/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }).catch(() => null);
      }

      await AethelAPIClient.updateCopilotWorkflow(connectFromWorkflowId, { archived: true }).catch(() => null);
      await refreshWorkflows().catch(() => null);
      setConnectFromWorkflowId('');
      setActiveThreadId(targetThreadId);
      await loadThreadMessages(targetThreadId).catch(() => null);
      pushSystem('Trabalhos mesclados. O trabalho de origem foi arquivado.' );
    } finally {
      setConnectBusy(false);
    }
  };

  const renameWorkflow = async () => {
    if (!activeWorkflowId) return;
    const current = workflows.find((w) => String(w.id) === String(activeWorkflowId));
    const nextTitle = await openPromptDialog({
      title: 'Renomear trabalho',
      message: 'Informe o novo nome do workflow.',
      defaultValue: current?.title || 'Workflow',
      placeholder: 'Nome do workflow',
      confirmText: 'Salvar',
      cancelText: 'Cancelar',
    });
    if (!nextTitle || !nextTitle.trim()) return;
    await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { title: nextTitle.trim() });
    await refreshWorkflows();
    pushSystem('Trabalho renomeado.');
  };

  const archiveWorkflow = async () => {
    if (!activeWorkflowId) return;
    const ok = await openConfirmDialog({
      title: 'Arquivar trabalho',
      message: 'Arquivar este trabalho (workflow)?',
      confirmText: 'Arquivar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { archived: true });
    const list = await refreshWorkflows();
    const next = list[0]?.id;
    if (next) await switchWorkflow(String(next));
    else await createWorkflow();
    pushSystem('Trabalho arquivado.');
  };

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
      // Atualiza contexto do Copilot para este workflow (mínimo: arquivo ativo/seleção podem ser enviados depois).
      if (activeWorkflowId) {
        void fetch('/api/copilot/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowId: activeWorkflowId }),
        }).catch(() => null);
      }

      if (activeThreadId) {
        void AethelAPIClient.appendChatMessage(activeThreadId, {
          role: 'user',
          content: userMessage.content,
          model: selectedModel,
        }).catch(() => null);
      }

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

      if (activeThreadId) {
        void AethelAPIClient.appendChatMessage(activeThreadId, {
          role: 'assistant',
          content: assistantContent,
          model: selectedModel,
        }).catch(() => null);
      }
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
      if (activeWorkflowId) {
        void fetch('/api/copilot/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowId: activeWorkflowId }),
        }).catch(() => null);
      }

      if (activeThreadId) {
        void AethelAPIClient.appendChatMessage(activeThreadId, {
          role: 'user',
          content: userMessage.content,
          model: selectedModel,
        }).catch(() => null);
      }

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

      if (activeThreadId) {
        void AethelAPIClient.appendChatMessage(activeThreadId, {
          role: 'assistant',
          content: fullContent || 'Sem resposta do modelo.',
          model: selectedModel,
        }).catch(() => null);
      }
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
        <h1 className="text-xl font-bold">Aethel Chat</h1>
        <div className="flex items-center gap-2">
          <select
            value={activeWorkflowId ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '__new__') {
                void createWorkflow();
                return;
              }
              if (v) void switchWorkflow(v);
            }}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
            disabled={isLoading || isStreaming || workflowsLoading || connectBusy}
            title="Trabalho (workflow)"
          >
            {(workflows?.length ? workflows : []).map((wf) => (
              <option key={String(wf.id)} value={String(wf.id)}>
                {wf.title || 'Workflow'}
              </option>
            ))}
            <option value="__new__">+ Novo trabalho</option>
          </select>

          <button
            onClick={() => void renameWorkflow()}
            disabled={!activeWorkflowId || isLoading || isStreaming}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            Renomear
          </button>
          <button
            onClick={() => void archiveWorkflow()}
            disabled={!activeWorkflowId || isLoading || isStreaming}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            Arquivar
          </button>

          <select
            value={connectFromWorkflowId}
            onChange={(e) => setConnectFromWorkflowId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
            disabled={isLoading || isStreaming || workflowsLoading || connectBusy}
            title="Conectar trabalhos: escolha uma origem"
          >
            <option value="">Conectar…</option>
            {workflows
              .filter((w) => String(w.id) !== String(activeWorkflowId))
              .map((wf) => (
                <option key={String(wf.id)} value={String(wf.id)}>
                  {wf.title || 'Workflow'}
                </option>
              ))}
          </select>

          <button
            onClick={() => void copyHistoryFromWorkflow()}
            disabled={!activeWorkflowId || !connectFromWorkflowId || isLoading || isStreaming || connectBusy}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm hover:bg-gray-700 disabled:opacity-50"
            title="Copia o histórico do trabalho selecionado para o trabalho atual (clona a thread)"
          >
            {connectBusy ? 'Processando…' : 'Copiar histórico'}
          </button>

          <button
            onClick={() => void importContextFromWorkflow()}
            disabled={!activeWorkflowId || !connectFromWorkflowId || isLoading || isStreaming || connectBusy}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm hover:bg-gray-700 disabled:opacity-50"
            title="Importa contexto (livePreview/editor/openFiles) do trabalho selecionado"
          >
            {connectBusy ? 'Processando…' : 'Importar contexto'}
          </button>

          <button
            onClick={() => void mergeFromWorkflow()}
            disabled={!activeWorkflowId || !connectFromWorkflowId || isLoading || isStreaming || connectBusy}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm hover:bg-gray-700 disabled:opacity-50"
            title="Mescla histórico + contexto do trabalho selecionado e arquiva o trabalho de origem"
          >
            {connectBusy ? 'Processando…' : 'Mesclar'}
          </button>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
            disabled={isLoading || isStreaming}
            title="Modelo"
          >
            <option value="openai:gpt-4o-mini">GPT-4o Mini</option>
            <option value="openai:gpt-4">GPT-4</option>
            <option value="anthropic:claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="google:gemini-pro">Gemini Pro</option>
            <option value="ollama:llama3">Llama 3 (Local)</option>
          </select>
        </div>
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
              {isStreaming ? 'Pausar' : 'Transmitir'}
            </button>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || isStreaming || !input.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2 rounded font-semibold transition-colors"
            >
              {isLoading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
