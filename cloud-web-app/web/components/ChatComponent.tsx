import { logger } from '@/lib/observability/logger';
// ChatComponent.tsx: Interface de chat integrada com backend API
import React, { useState, useRef, useEffect } from 'react';
import { AethelAPIClient, APIError } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import type { ChatMessage, ChatThreadSummary, CopilotContextResponse, CopilotWorkflowDetail, CopilotWorkflowSummary } from '@/lib/api';
import { openConfirmDialog, openPromptDialog } from '@/lib/ui/non-blocking-dialogs';
import { DEFAULT_OPENROUTER_MODEL_ID } from '@/lib/ai/openrouter-models';
import { buildContextPatch, createWelcomeMessages, getScopedStorageKeys, toMessageRole, type Message } from './ChatComponent.helpers';
import { ChatComponentSurface } from './ChatComponentSurface';

const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => createWelcomeMessages());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedModel, setSelectedModel] = useState(`openrouter:${DEFAULT_OPENROUTER_MODEL_ID}`);
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
    const raw = Array.isArray(data.messages) ? data.messages : [];
    const restored: Message[] = raw
      .filter((m) => m && typeof m.content === 'string')
      .map((m) => ({
        role: toMessageRole(m.role),
        content: m.content,
        timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
      }));
    if (restored.length) setMessages(restored);
    else {
      setMessages(createWelcomeMessages());
    }
  };

  const refreshWorkflows = async (): Promise<CopilotWorkflowSummary[]> => {
    setWorkflowsLoading(true);
    try {
      const res = await AethelAPIClient.listCopilotWorkflows().catch(() => ({ workflows: [] as CopilotWorkflowSummary[] }));
      const list = Array.isArray(res.workflows) ? res.workflows : [];
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
        const ctx = await AethelAPIClient.getCopilotContext().catch((): CopilotContextResponse => ({ projectId: null, workflowId: null }));
        const projectId = typeof ctx.projectId === 'string' ? ctx.projectId : null;
        setActiveProjectId(projectId);

        const keys = getScopedStorageKeys(projectId);

        const storedWorkflowId = typeof window !== 'undefined'
          ? (window.localStorage.getItem(keys.activeWorkflowId) || window.localStorage.getItem(keys.legacyActiveWorkflowId))
          : null;
        const storedThreadId = typeof window !== 'undefined'
          ? (window.localStorage.getItem(keys.activeThreadId) || window.localStorage.getItem(keys.legacyActiveThreadId))
          : null;

        let wf: CopilotWorkflowDetail | CopilotWorkflowSummary | null = null;
        if (storedWorkflowId) {
          const got = await AethelAPIClient.getCopilotWorkflow(storedWorkflowId).catch(() => null);
          wf = got?.workflow ?? null;
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

        const list = await AethelAPIClient.listChatThreads().catch(() => ({ threads: [] as ChatThreadSummary[] }));
        const threads = Array.isArray(list.threads) ? list.threads : [];

        // Determina a thread active: workflow -> localStorage -> primeira -> cria.
        let threadId: string | null = (wf?.chatThreadId as string | null) ?? (storedThreadId || null);
        if (threadId && !threads.find((t) => t?.id === threadId)) {
          threadId = null;
        }
        if (!threadId && threads.length > 0 && typeof threads[0]?.id === 'string') {
          threadId = threads[0].id;
        }
        if (!threadId) {
          const created = await AethelAPIClient.createChatThread({ title: wf?.title ? String(wf.title) : 'Chat' });
          threadId = created.thread?.id ?? null;
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
        logger.warn('Failed to restore chat', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const switchWorkflow = async (workflowId: string) => {
    if (connectBusy) return;
    const got = await AethelAPIClient.getCopilotWorkflow(workflowId);
    const wf = got.workflow;
    if (!wf?.id) return;

    const projectId = wf.projectId ? String(wf.projectId) : null;
    setActiveProjectId(projectId);
    const keys = getScopedStorageKeys(projectId);

    setActiveWorkflowId(String(wf.id));
    if (typeof window !== 'undefined') window.localStorage.setItem(keys.activeWorkflowId, String(wf.id));

    let threadId: string | null = wf.chatThreadId ? String(wf.chatThreadId) : null;
    if (!threadId) {
      const created = await AethelAPIClient.createChatThread({ title: wf.title || 'Chat' });
      threadId = created.thread?.id ?? null;
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
    const threadId = createdThread.thread?.id;
    const createdWf = await AethelAPIClient.createCopilotWorkflow({
      title,
      ...(projectId ? { projectId } : {}),
      ...(threadId ? { chatThreadId: threadId } : {}),
    });
    const wfId = createdWf.workflow?.id;
    await refreshWorkflows();
    if (wfId) await switchWorkflow(String(wfId));
  };

  const copyHistoryFromWorkflow = async () => {
    if (!activeWorkflowId) return;
    if (!connectFromWorkflowId) {
      pushError('Select a job to copy its history.');
      return;
    }

    if (connectBusy) return;
    setConnectBusy(true);

    try {
      pushSystem('Copiando history (server-side)…');
      const sourceRes = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId).catch(() => null);
      const source = sourceRes?.workflow ?? null;
      const sourceThreadId = source?.chatThreadId ? String(source.chatThreadId) : null;
      if (!sourceThreadId) {
        pushError('This job has no history thread to copy.');
        return;
      }

      const current = workflows.find((w) => String(w.id) === String(activeWorkflowId));
      const title = `${current?.title || 'Workflow'} (copy)`;

      const created = await AethelAPIClient.cloneChatThread({ sourceThreadId, title }).catch(() => null);
      const newThreadId = created?.thread?.id ? String(created.thread.id) : null;
      if (!newThreadId) {
        pushError('Failed to clone the history.');
        return;
      }

      await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { chatThreadId: newThreadId }).catch(() => null);
      await refreshWorkflows().catch(() => null);
      setConnectFromWorkflowId('');
      await switchWorkflow(activeWorkflowId);
      pushSystem('History copiado para este trabalho.');
    } finally {
      setConnectBusy(false);
    }
  };

  const importContextFromWorkflow = async () => {
    if (!activeWorkflowId) return;
    if (!connectFromWorkflowId) {
      pushError('Select a job to import its context.');
      return;
    }

    const sourceRes = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId).catch(() => null);
    const source = sourceRes?.workflow ?? null;
    const ctx = source?.context;
    if (!ctx || typeof ctx !== 'object') {
      pushError('This job has no saved context to import.');
      return;
    }

    const patch = buildContextPatch(activeWorkflowId, ctx);
    if (!patch) {
      pushError('This job has no saved context to import.');
      return;
    }

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
      pushError('Select a job to merge.' );
      return;
    }

    if (connectBusy) return;
    setConnectBusy(true);

    try {
      pushSystem('Mesclando trabalhos (server-side)…');

      const sourceRes = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId).catch(() => null);
      const source = sourceRes?.workflow ?? null;
      const sourceThreadId = source?.chatThreadId ? String(source.chatThreadId) : null;
      if (!sourceThreadId) {
        pushError('This job has no history thread to merge.' );
        return;
      }

      let targetThreadId: string | null = activeThreadId;
      if (!targetThreadId) {
        const current = workflows.find((w) => String(w.id) === String(activeWorkflowId));
        const created = await AethelAPIClient.createChatThread({
          title: current?.title || 'Chat',
          ...(activeProjectId ? { projectId: activeProjectId } : {}),
        });
        targetThreadId = created.thread?.id ?? null;
        if (targetThreadId) {
          await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { chatThreadId: targetThreadId }).catch(() => null);
        }
      }

      if (!targetThreadId) {
        pushError('Could not determine the destination thread.' );
        return;
      }

      await AethelAPIClient.mergeChatThreads({ sourceThreadId, targetThreadId }).catch(() => null);

      const ctx = source?.context;
      if (ctx && typeof ctx === 'object') {
        const patch = buildContextPatch(activeWorkflowId, ctx);
        if (!patch) return;
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
      placeholder: 'Workflow name',
      confirmText: 'Save',
      cancelText: 'Cancel',
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
      cancelText: 'Cancel',
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
      // Atualiza contexto do Copilot para este workflow (mínimo: file active/seleção podem ser enviados depois).
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
      logger.error('Chat error:', error);

      let errorMessage = 'Failed to send message.';
      if (error instanceof APIError) {
        if (error.status === 401) {
          errorMessage = 'Session expired. Please sign in again.';
        } else if (error.status === 402) {
          errorMessage = 'Insufficient credits. Please top up your account.';
        } else if (error.status === 429) {
          errorMessage = 'Too many requests. Wait a moment and try again.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
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
      logger.error('Stream error:', error);

      let errorMessage = 'Failed to stream message.';
      if (error instanceof APIError) {
        errorMessage = `Error ${error.status}: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
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
    <ChatComponentSurface
      messages={messages}
      input={input}
      setInput={setInput}
      isLoading={isLoading}
      isStreaming={isStreaming}
      streamingContent={streamingContent}
      selectedModel={selectedModel}
      setSelectedModel={setSelectedModel}
      activeWorkflowId={activeWorkflowId}
      workflows={workflows}
      workflowsLoading={workflowsLoading}
      connectBusy={connectBusy}
      connectFromWorkflowId={connectFromWorkflowId}
      setConnectFromWorkflowId={setConnectFromWorkflowId}
      messagesEndRef={messagesEndRef}
      createWorkflow={createWorkflow}
      switchWorkflow={switchWorkflow}
      renameWorkflow={renameWorkflow}
      archiveWorkflow={archiveWorkflow}
      copyHistoryFromWorkflow={copyHistoryFromWorkflow}
      importContextFromWorkflow={importContextFromWorkflow}
      mergeFromWorkflow={mergeFromWorkflow}
      handleKeyPress={handleKeyPress}
      handleStreamMessage={handleStreamMessage}
      handleSendMessage={handleSendMessage}
    />
  );
};

export default ChatComponent;
