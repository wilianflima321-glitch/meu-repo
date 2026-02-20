import { useCallback, useEffect, useMemo } from 'react'
import type { ChatMessage, CopilotWorkflowSummary } from '@/lib/api'

export function useAethelDashboardDerived(params: any) {
  const { APIError, AethelAPIClient, DEFAULT_SETTINGS, activeChatThreadId, activeWorkflowId, chatHistory, chatMessage, clearStoredDashboardState, connectBusy, connectFromWorkflowId, connectivityData, copilotProjectId, copilotWorkflows, creditsKey, currentPlanKey, formatCurrencyLabel, getScopedKeys, hasToken, isAuthenticated, livePreviewSuggestions, mutate, newProjectName, newProjectType, openConfirmDialog, openPromptDialog, projects, purchaseForm, sessionFilter, sessionHistory, setActiveChatThreadId, setActiveTab, setActiveWorkflowId, setAiActivity, setAuthError, setChatHistory, setChatMessage, setConnectBusy, setConnectFromWorkflowId, setCopilotProjectId, setCopilotWorkflows, setCopilotWorkflowsLoading, setHasToken, setIsGenerating, setLastPurchaseIntent, setLastTransferReceipt, setLivePreviewSuggestions, setNewProjectName, setNewProjectType, setProjects, setPurchaseForm, setSessionFilter, setSessionHistory, setSettings, setSidebarOpen, setSubscribeError, setSubscribeMessage, setSubscribingPlan, setTransferForm, setWalletActionError, setWalletActionMessage, setWalletSubmitting, settings, showToastMessage, sidebarOpen, startDownload, transferForm, walletData, walletKey } = params

  const loadChatHistoryForThread = useCallback(async (threadId: string) => {
    const data = await AethelAPIClient.getChatMessages(threadId)
    const raw = Array.isArray((data as any)?.messages) ? (data as any).messages : []
    const restored: any[] = raw
      .filter((m: any) => m && typeof m.content === 'string')
      .map((m: any) => ({ role: (m.role as any) || 'user', content: m.content }))
    setChatHistory(restored)
  }, [])

  const refreshCopilotWorkflows = useCallback(async () => {
    setCopilotWorkflowsLoading(true)
    try {
      const res = await AethelAPIClient.listCopilotWorkflows().catch(() => ({ workflows: [] as any[] }))
      const list = Array.isArray((res as any).workflows) ? ((res as any).workflows as any[]) : []
      setCopilotWorkflows(list)
      return list
    } finally {
      setCopilotWorkflowsLoading(false)
    }
  }, [])

  const switchCopilotWorkflow = useCallback(async (workflowId: string) => {
    const got = await AethelAPIClient.getCopilotWorkflow(workflowId)
    const wf = (got as any)?.workflow as CopilotWorkflowSummary | undefined
    if (!wf?.id) return

    const projectId = wf.projectId ? String(wf.projectId) : null
    setCopilotProjectId(projectId)
    const keys = getScopedKeys(projectId)

    setActiveWorkflowId(String(wf.id))
    if (typeof window !== 'undefined') window.localStorage.setItem(keys.workflowKey, String(wf.id))

    let threadId: string | null = wf.chatThreadId ? String(wf.chatThreadId) : null
    if (!threadId) {
      const created = await AethelAPIClient.createChatThread({ title: wf.title || 'Chat' })
      threadId = (created as any)?.thread?.id ?? null
      if (threadId) {
        await AethelAPIClient.updateCopilotWorkflow(String(wf.id), { chatThreadId: threadId }).catch(() => null)
        await refreshCopilotWorkflows().catch(() => null)
      }
    }

    if (!threadId) return
    setActiveChatThreadId(threadId)
    if (typeof window !== 'undefined') window.localStorage.setItem(keys.chatThreadKey, threadId)

    await loadChatHistoryForThread(threadId).catch(() => null)
  }, [loadChatHistoryForThread, refreshCopilotWorkflows])

  const createCopilotWorkflow = useCallback(async () => {
    const title = `Workflow ${new Date().toLocaleString()}`
    const createdThread = await AethelAPIClient.createChatThread({ title, ...(copilotProjectId ? { projectId: copilotProjectId } : {}) })
    const threadId = (createdThread as any)?.thread?.id as string | undefined
    const createdWf = await AethelAPIClient.createCopilotWorkflow({
      title,
      ...(copilotProjectId ? { projectId: copilotProjectId } : {}),
      ...(threadId ? { chatThreadId: threadId } : {}),
    }).catch(() => null)
    const wfId = (createdWf as any)?.workflow?.id as string | undefined
    await refreshCopilotWorkflows().catch(() => null)
    if (wfId) await switchCopilotWorkflow(String(wfId)).catch(() => null)
  }, [copilotProjectId, refreshCopilotWorkflows, switchCopilotWorkflow])

  const renameCopilotWorkflow = useCallback(async () => {
    if (!activeWorkflowId) return
    const current = copilotWorkflows.find((w) => String(w.id) === String(activeWorkflowId))
    const nextTitle = await openPromptDialog({
      title: 'Renomear trabalho',
      message: 'Informe o novo nome do workflow.',
      defaultValue: current?.title || 'Workflow',
      placeholder: 'Nome do workflow',
      confirmText: 'Salvar',
      cancelText: 'Cancelar',
    })
    if (!nextTitle || !nextTitle.trim()) return
    await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { title: nextTitle.trim() }).catch(() => null)
    await refreshCopilotWorkflows().catch(() => null)
    showToastMessage('Trabalho renomeado.', 'success')
  }, [activeWorkflowId, copilotWorkflows, refreshCopilotWorkflows, showToastMessage])

  const archiveCopilotWorkflow = useCallback(async () => {
    if (!activeWorkflowId) return
    const ok = await openConfirmDialog({
      title: 'Arquivar trabalho',
      message: 'Arquivar este trabalho (workflow)?',
      confirmText: 'Arquivar',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { archived: true }).catch(() => null)
    const list = await refreshCopilotWorkflows().catch(() => [])
    const next = Array.isArray(list) ? (list as any[])[0]?.id : (copilotWorkflows[0]?.id ?? null)
    if (next) await switchCopilotWorkflow(String(next)).catch(() => null)
    else await createCopilotWorkflow().catch(() => null)
    showToastMessage('Trabalho arquivado.', 'info')
  }, [activeWorkflowId, copilotWorkflows, createCopilotWorkflow, refreshCopilotWorkflows, switchCopilotWorkflow, showToastMessage])

  const copyHistoryFromWorkflow = useCallback(async () => {
    if (!activeWorkflowId) return
    if (!connectFromWorkflowId) {
      showToastMessage('Selecione um trabalho para copiar o histórico.', 'error')
      return
    }

    if (connectBusy) return
    setConnectBusy(true)

    try {
      showToastMessage('Copiando histórico (server-side)…', 'info')
      const sourceRes = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId).catch(() => null)
      const source = (sourceRes as any)?.workflow as any
      const sourceThreadId = source?.chatThreadId ? String(source.chatThreadId) : null
      if (!sourceThreadId) {
        showToastMessage('Esse trabalho não tem histórico (thread) para copiar.', 'error')
        return
      }

      const current = copilotWorkflows.find((w) => String(w.id) === String(activeWorkflowId))
      const title = `${current?.title || 'Workflow'} (cópia)`

      const created = await AethelAPIClient.cloneChatThread({ sourceThreadId, title }).catch(() => null)
      const newThreadId = (created as any)?.thread?.id ? String((created as any).thread.id) : null
      if (!newThreadId) {
        showToastMessage('Falha ao clonar o histórico.', 'error')
        return
      }

      await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { chatThreadId: newThreadId }).catch(() => null)
      await refreshCopilotWorkflows().catch(() => null)
      setConnectFromWorkflowId('')
      await switchCopilotWorkflow(activeWorkflowId).catch(() => null)
      showToastMessage('Histórico copiado para este trabalho.', 'success')
    } finally {
      setConnectBusy(false)
    }
  }, [activeWorkflowId, connectBusy, connectFromWorkflowId, copilotWorkflows, refreshCopilotWorkflows, switchCopilotWorkflow, showToastMessage])

  const mergeFromWorkflow = useCallback(async () => {
    if (!activeWorkflowId) return
    if (!connectFromWorkflowId) {
      showToastMessage('Selecione um trabalho para mesclar.', 'error')
      return
    }

    if (connectBusy) return
    setConnectBusy(true)

    try {
      showToastMessage('Mesclando trabalhos (server-side)…', 'info')

      const sourceRes = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId).catch(() => null)
      const source = (sourceRes as any)?.workflow as any
      const sourceThreadId = source?.chatThreadId ? String(source.chatThreadId) : null
      if (!sourceThreadId) {
        showToastMessage('Esse trabalho não tem histórico (thread) para mesclar.', 'error')
        return
      }

      let targetThreadId: string | null = activeChatThreadId
      if (!targetThreadId) {
        const current = copilotWorkflows.find((w) => String(w.id) === String(activeWorkflowId))
        const created = await AethelAPIClient.createChatThread({
          title: current?.title || 'Chat',
          ...(copilotProjectId ? { projectId: copilotProjectId } : {}),
        })
        targetThreadId = (created as any)?.thread?.id ?? null
        if (targetThreadId) {
          await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { chatThreadId: targetThreadId }).catch(() => null)
        }
      }

      if (!targetThreadId) {
        showToastMessage('Não foi possível determinar a thread de destino.', 'error')
        return
      }

      await AethelAPIClient.mergeChatThreads({ sourceThreadId, targetThreadId }).catch(() => null)

      const ctx = source?.context
      if (ctx && typeof ctx === 'object') {
        const patch: any = { workflowId: activeWorkflowId }
        if ((ctx as any).livePreview) patch.livePreview = (ctx as any).livePreview
        if ((ctx as any).editor) patch.editor = (ctx as any).editor
        if (Array.isArray((ctx as any).openFiles)) patch.openFiles = (ctx as any).openFiles
        await fetch('/api/copilot/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }).catch(() => null)
      }

      await AethelAPIClient.updateCopilotWorkflow(connectFromWorkflowId, { archived: true }).catch(() => null)
      await refreshCopilotWorkflows().catch(() => null)
      setConnectFromWorkflowId('')
      setActiveChatThreadId(targetThreadId)
      await loadChatHistoryForThread(targetThreadId).catch(() => null)
      showToastMessage('Trabalhos mesclados. O trabalho de origem foi arquivado.', 'success')
    } finally {
      setConnectBusy(false)
    }
  }, [activeChatThreadId, activeWorkflowId, connectBusy, connectFromWorkflowId, copilotProjectId, copilotWorkflows, loadChatHistoryForThread, refreshCopilotWorkflows, showToastMessage])

  const importContextFromWorkflow = useCallback(async () => {
    if (!activeWorkflowId) return
    if (!connectFromWorkflowId) {
      showToastMessage('Selecione um trabalho para importar o contexto.', 'error')
      return
    }

    const sourceRes = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId).catch(() => null)
    const source = (sourceRes as any)?.workflow as any
    const ctx = source?.context
    if (!ctx || typeof ctx !== 'object') {
      showToastMessage('Esse trabalho não tem contexto salvo para importar.', 'error')
      return
    }

    const patch: any = { workflowId: activeWorkflowId }
    if ((ctx as any).livePreview) patch.livePreview = (ctx as any).livePreview
    if ((ctx as any).editor) patch.editor = (ctx as any).editor
    if (Array.isArray((ctx as any).openFiles)) patch.openFiles = (ctx as any).openFiles

    if (connectBusy) return
    setConnectBusy(true)
    try {
      showToastMessage('Importando contexto…', 'info')
      await fetch('/api/copilot/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }).catch(() => null)

      showToastMessage('Contexto importado para o trabalho atual.', 'success')
      setConnectFromWorkflowId('')
    } finally {
      setConnectBusy(false)
    }
  }, [activeWorkflowId, connectBusy, connectFromWorkflowId, showToastMessage])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorage = () => {
      try {
        setHasToken(isAuthenticated())
      } catch (error) {
        setAuthError(error instanceof Error ? error : new Error('Falha ao verificar estado de autenticação'))
        setHasToken(false)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggleTheme = useCallback(() => {
    setSettings(prev => {
      const nextTheme = prev.theme === 'dark' ? 'light' : 'dark'
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', nextTheme === 'dark')
      }
      return { ...prev, theme: nextTheme }
    })
  }, [])

  // Create new session
  const createNewSession = useCallback(() => {
    setSessionHistory(prev => {
      const newSession: any = {
        id: Date.now().toString(),
        name: `Sessão ${prev.length + 1}`,
        timestamp: Date.now(),
        chatHistory: [],
        livePreviewSuggestions: [],
        favorite: false,
        scheduled: false,
        settings: { ...settings },
      }
      return [newSession, ...prev]
    })
    setChatHistory([])
    setLivePreviewSuggestions([])
    setActiveTab('ai-chat')
    showToastMessage('Sessão criada!', 'success')

    // Também cria uma nova thread persistida para a conta.
    if (typeof window !== 'undefined' && isAuthenticated()) {
      void (async () => {
        try {
          const created = await AethelAPIClient.createChatThread({ title: `Sessão ${new Date().toLocaleString()}` })
          const threadId = (created as any)?.thread?.id
          if (typeof threadId === 'string' && threadId) {
            const keys = getScopedKeys(copilotProjectId)
            window.localStorage.setItem(keys.chatThreadKey, threadId)
            setActiveChatThreadId(threadId)

            const createdWf = await AethelAPIClient.createCopilotWorkflow({
              title: `Fluxo ${new Date().toLocaleString()}`,
              chatThreadId: threadId,
            }).catch(() => null)
            const wfId = (createdWf as any)?.workflow?.id
            if (wfId) {
              window.localStorage.setItem(keys.workflowKey, String(wfId))
              setActiveWorkflowId(String(wfId))
            }
          }
        } catch (e) {
          console.warn('Failed to create chat thread', e)
        }
      })()
    }
  }, [copilotProjectId, settings, showToastMessage])

  // Toggle favorite on session
  const toggleFavorite = (sessionId: string) => {
    setSessionHistory(prev =>
      prev.map(session =>
        session.id === sessionId
          ? { ...session, favorite: !Boolean(session.favorite) }
          : session
      )
    );
  };

  // Toggle scheduled on session
  const toggleScheduled = (sessionId: string) => {
    setSessionHistory(prev =>
      prev.map(session =>
        session.id === sessionId
          ? { ...session, scheduled: !Boolean(session.scheduled) }
          : session
      )
    );
  };

  // Filtered sessions
  const filteredSessions = sessionHistory.filter(session => {
    switch (sessionFilter) {
      case 'favorites': return Boolean(session.favorite);
      case 'scheduled': return Boolean(session.scheduled);
      default: return true;
    }
  });

  // Function to save current session
  const saveCurrentSession = useCallback(() => {
    setSessionHistory(prev => {
      const currentSession: any = {
        id: Date.now().toString(),
        name: `Session ${prev.length + 1}`,
        timestamp: Date.now(),
        chatHistory: [...chatHistory],
        livePreviewSuggestions: [...livePreviewSuggestions],
        favorite: false,
        scheduled: false,
        settings: { ...settings },
      }
      return [currentSession, ...prev.slice(0, 9)]
    })
  }, [chatHistory, livePreviewSuggestions, settings])

  const clearDashboardState = useCallback(() => {
    clearStoredDashboardState()
    setSessionHistory([])
    setSessionFilter('all')
    setChatHistory([])
    setChatMessage('')
    setLivePreviewSuggestions([])
    setActiveTab('overview')
    setSettings({ ...DEFAULT_SETTINGS })
    showToastMessage('Preferências do painel redefinidas.', 'success')
  }, [showToastMessage])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K for new task
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        createNewSession();
      }

      // Ctrl+S for save current session
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveCurrentSession();
        showToastMessage('Session saved!', 'success');
      }

      // Escape to close sidebar on mobile
      if (event.key === 'Escape' && sidebarOpen && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [createNewSession, saveCurrentSession, showToastMessage, sidebarOpen]);

  const downloadUrls = useMemo(() => ({
    windows: process.env.NEXT_PUBLIC_IDE_DOWNLOAD_URL_WINDOWS,
    mac: process.env.NEXT_PUBLIC_IDE_DOWNLOAD_URL_MAC,
    linux: process.env.NEXT_PUBLIC_IDE_DOWNLOAD_URL_LINUX,
  }), [])

  const handleDownload = useCallback(async (platform: 'windows' | 'mac' | 'linux') => {
    const url = downloadUrls[platform]
    if (!url) {
      showToastMessage(`URL de download para ${platform} não configurada.`, 'error')
      return
    }

    showToastMessage(`Iniciando download para ${platform}...`, 'info')
    try {
      await startDownload(url, {
        filename: `aethel-ide-${platform}-v2.1.0${platform === 'windows' ? '.exe' : platform === 'mac' ? '.dmg' : '.tar.gz'}`,
      })
    } catch (error) {
      showToastMessage(`Falha ao iniciar download para ${platform}.`, 'error')
    }
  }, [downloadUrls, showToastMessage, startDownload])

  // Mobile responsiveness improvements
  useEffect(() => {
    const handleResize = () => {
      // Auto-close sidebar on mobile when switching to small screens
      if (window.innerWidth < 768 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Function to load a session
  const loadSession = (sessionId: string) => {
    const session = sessionHistory.find(s => s.id === sessionId)
    if (session) {
      setChatHistory(session.chatHistory)
      if (session.settings) setSettings(session.settings)
      // Load other states as needed
    }
  }

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return

    setAiActivity('Enviando mensagem para a IA...')
    const userMessage: ChatMessage = { role: 'user', content: chatMessage }
    setChatHistory(prev => [...prev, userMessage])
    const currentMessage = chatMessage
    setChatMessage('')

    // Persistência: salva mensagem do usuário na thread ativa.
    const threadId = activeChatThreadId
    if (threadId) {
      void AethelAPIClient.appendChatMessage(threadId, { role: 'user', content: userMessage.content, model: 'openai:gpt-4' })
        .then(async () => {
          // Se for o primeiro input da thread, tenta melhorar o título.
          if (chatHistory.length === 0) {
            const title = `Chat: ${String(userMessage.content).slice(0, 60)}`
            await AethelAPIClient.updateChatThread(threadId, { title }).catch(() => null)
          }
        })
        .catch(() => null)
    }

    // Add streaming AI response placeholder
    const aiMessageId = Date.now().toString()
    const aiMessage: ChatMessage = { role: 'assistant', content: '' }
    setChatHistory(prev => [...prev, aiMessage])

    try {
      setAiActivity('A IA está pensando...')
      const messages: any[] = [...chatHistory, userMessage].map(m => ({
        role: (m.role as ChatMessage['role']) || 'user',
        content: m.content
      }))

      let accumulatedContent = ''
      for await (const chunk of AethelAPIClient.chatStream({ model: 'openai:gpt-4', messages })) {
        accumulatedContent += chunk
        setChatHistory(prev =>
          prev.map(msg => (msg === aiMessage ? { ...msg, content: accumulatedContent } : msg))
        )
      }

      // Persistência: salva mensagem final do assistente.
      if (threadId) {
        void AethelAPIClient.appendChatMessage(threadId, { role: 'assistant', content: accumulatedContent, model: 'openai:gpt-4' }).catch(() => null)
      }

      setAiActivity('IA respondeu')
      showToastMessage('Resposta da IA recebida!', 'success');

      // Add to session history with enhanced metadata
      setSessionHistory(prev => [{
        id: aiMessageId,
        name: `Chat: ${currentMessage.slice(0, 30)}...`,
        timestamp: Date.now(),
        chatHistory: [...chatHistory, userMessage, { ...aiMessage, content: accumulatedContent }],
        livePreviewSuggestions: livePreviewSuggestions,
        favorite: false,
        scheduled: false
      }, ...prev.slice(0, 9)])

    } catch (error) {
      console.error('Error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Falha ao conectar ao backend. Verifique se o servidor está em execução.'
      }
      setChatHistory(prev =>
        prev.map(msg =>
          msg === aiMessage ? errorMessage : msg
        )
      )
      setAiActivity('Falha de conexão')
      showToastMessage('Falha ao conectar ao backend de IA', 'error');
    }
  }

  const createProject = () => {
    if (!newProjectName.trim()) return
    const newProject = {
      id: projects.length + 1,
      name: newProjectName,
      type: newProjectType,
      status: 'active'
    }
    setProjects(prev => [...prev, newProject])
    setNewProjectName('')
    setNewProjectType('code')
  }

  const deleteProject = (id: number) => {
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  const handleMagicWandSelect = async (position: any) => {
    setAiActivity('Analisando área selecionada...')
    setIsGenerating(true)

    try {
      // Atualiza contexto do Copilot (snapshot mínimo do Live Preview).
      // MVP: em memória no server; sem isso a IA perde precisão.
      await fetch('/api/copilot/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: activeWorkflowId,
          livePreview: {
            selectedPoint: { x: position.x, y: position.y, z: position.z },
          },
        }),
      })
    } catch (e) {
      // Não bloqueia o fluxo de sugestão; apenas mantém real-or-fail.
      console.warn('Failed to update copilot context', e)
    }

    const prompt =
      `Contexto da Prévia ao Vivo:\n` +
      `Ponto selecionado: x=${position.x.toFixed(3)}, y=${position.y.toFixed(3)}, z=${position.z.toFixed(3)}\n\n` +
      `Tarefa: sugira UMA melhoria concreta para a cena naquele ponto. ` +
      `Retorne uma única frase curta. Sem markdown. Sem listas.`

    try {
      const messages: any[] = [
        {
          role: 'system',
          content:
            'Você é o Copilot Aethel para Prévia ao Vivo. Seja preciso, minimalista e evite suposições. Se faltar informação, faça uma pergunta.',
        },
        { role: 'user', content: prompt },
      ]

      const data = await AethelAPIClient.chat({ model: 'openai:gpt-4', messages })
      const content =
        data?.choices?.[0]?.message?.content ||
        data?.message?.content ||
        ''

      const suggestion = String(content).trim()
      if (!suggestion) {
        setAiActivity('Nenhuma sugestão retornada')
        showToastMessage('AI não retornou sugestão para a área selecionada.', 'info')
        return
      }

      setLivePreviewSuggestions(prev => [...prev, suggestion])
      setAiActivity('Sugestão gerada para a área selecionada')
    } catch (error) {
      console.error('Error generating live preview suggestion:', error)
      setAiActivity('Sugestão indisponível')
      showToastMessage('Sugestão indisponível (IA não configurada ou sem créditos).', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendSuggestion = async (suggestion: string) => {
    setAiActivity('Processando sugestão do usuário...')
    setIsGenerating(true)
    // Add to chat history and send to AI
    const userMessage: ChatMessage = { role: 'user', content: `Sugestão de prévia ao vivo: ${suggestion}` }
    setChatHistory(prev => [...prev, userMessage])

    try {
      const messages: any[] = [...chatHistory, userMessage].map(m => ({
        role: (m.role as ChatMessage['role']) || 'user',
        content: m.content
      }))
      const data = await AethelAPIClient.chat({ model: 'openai:gpt-4', messages })
      if (data?.choices?.[0]?.message) {
        const aiMessage = { role: data.choices[0].message.role, content: data.choices[0].message.content }
        setChatHistory(prev => [...prev, aiMessage])
        setAiActivity('Sugestão aplicada na prévia ao vivo')
      }
    } catch (error) {
      console.error('Error sending suggestion:', error)
      setAiActivity('Erro ao processar sugestão')
    }
    setIsGenerating(false)
  }

  const handleAcceptSuggestion = (suggestion: string) => {
    handleSendSuggestion(`Aceite e aplique: ${suggestion}`)
  }

  const walletTransactions = useMemo(() => walletData?.transactions ?? [], [walletData?.transactions])
  const connectivityServices = useMemo(() => connectivityData?.services ?? [], [connectivityData?.services])
  const lastWalletUpdate = walletTransactions.length > 0 ? walletTransactions[walletTransactions.length - 1].created_at : null

  const creditEntries = useMemo(() => walletTransactions.filter(entry => entry.entry_type === 'credit'), [walletTransactions])

  const {
    creditsUsedToday,
    creditsUsedThisMonth,
    creditsReceivedThisMonth,
  } = useMemo(() => {
    if (walletTransactions.length === 0) {
      return {
        creditsUsedToday: 0,
        creditsUsedThisMonth: 0,
        creditsReceivedThisMonth: 0,
      }
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let usedToday = 0
    let usedMonth = 0
    let receivedMonth = 0

    for (const entry of walletTransactions) {
      const createdAt = new Date(entry.created_at)

      if (entry.entry_type === 'credit') {
        if (createdAt >= startOfMonth) {
          receivedMonth += entry.amount
        }
        continue
      }

      if (createdAt >= startOfToday) {
        usedToday += entry.amount
      }

      if (createdAt >= startOfMonth) {
        usedMonth += entry.amount
      }
    }

    return {
      creditsUsedToday: usedToday,
      creditsUsedThisMonth: usedMonth,
      creditsReceivedThisMonth: receivedMonth,
    }
  }, [walletTransactions])

  const receivableSummary = useMemo(() => {
    if (creditEntries.length === 0) {
      return {
        total: 0,
        pending: 0,
        recent: [] as typeof creditEntries,
      }
    }

    let pending = 0
    for (const entry of creditEntries) {
      const rawStatus = entry.metadata?.['status'] as unknown
      const status = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : ''
      const rawSettled = entry.metadata?.['settled'] as unknown
      const settledFlag = typeof rawSettled === 'boolean' ? rawSettled : undefined
      if (status === 'pending' || status === 'awaiting_settlement' || settledFlag === false) {
        pending += entry.amount
      }
    }

    const recent = creditEntries
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

    const total = creditEntries.reduce((sum, entry) => sum + entry.amount, 0)

    return {
      total,
      pending,
      recent,
    }
  }, [creditEntries])

  const refreshWallet = async () => {
    if (walletKey) {
      await mutate(walletKey)
    }
  }

  const refreshConnectivity = async () => {
    await mutate('connectivity::status')
  }

  const handlePurchaseIntentSubmit = async (event: any) => {
    event.preventDefault()
    if (!hasToken) {
      setWalletActionError('Faça login para criar intents.')
      return
    }
    const amountInt = Number.parseInt(purchaseForm.amount, 10)
    if (!Number.isFinite(amountInt) || amountInt <= 0) {
      setWalletActionError('Informe um valor de créditos válido.')
      return
    }
    setWalletSubmitting(true)
    setWalletActionMessage(null)
    setWalletActionError(null)
    try {
      const intent = await AethelAPIClient.createPurchaseIntent({
        amount: amountInt,
        currency: purchaseForm.currency || 'credits',
        reference: purchaseForm.reference || undefined,
      })
      setLastPurchaseIntent(intent)
      setWalletActionMessage(
        `Intenção ${intent.intent_id} confirmada: +${intent.entry.amount.toLocaleString()} ${formatCurrencyLabel(intent.entry.currency)}.`,
      )
      setPurchaseForm(prev => ({ ...prev, amount: '', reference: '' }))
      await refreshWallet()
      if (creditsKey) {
        await mutate(creditsKey)
      }
    } catch (error) {
      if (error instanceof APIError) {
        setWalletActionError(`Falha ao criar intenção (${error.status}): ${error.statusText}`)
      } else {
        setWalletActionError('Não foi possível registrar a intenção de compra.')
      }
    } finally {
      setWalletSubmitting(false)
    }
  }

  const handleTransferSubmit = async (event: any) => {
    event.preventDefault()
    if (!hasToken) {
      setWalletActionError('Faça login para transferir créditos.')
      return
    }
    const amountInt = Number.parseInt(transferForm.amount, 10)
    const target = transferForm.targetUserId.trim()
    if (!Number.isFinite(amountInt) || amountInt <= 0 || !target) {
      setWalletActionError('Informe destinatário (userId/email) e valor válidos.')
      return
    }
    setWalletSubmitting(true)
    setWalletActionMessage(null)
    setWalletActionError(null)
    try {
      const receipt = await AethelAPIClient.transferCredits({
        target_user_id: target,
        amount: amountInt,
        currency: transferForm.currency || 'credits',
        reference: transferForm.reference || undefined,
      })
      setLastTransferReceipt(receipt)
      setWalletActionMessage(
        `Transferência ${receipt.transfer_id} concluída: -${receipt.sender_entry.amount.toLocaleString()} ${formatCurrencyLabel(receipt.sender_entry.currency)}.`,
      )
      setTransferForm(prev => ({ ...prev, amount: '', reference: '' }))
      await refreshWallet()
      if (creditsKey) {
        await mutate(creditsKey)
      }
    } catch (error) {
      if (error instanceof APIError) {
        setWalletActionError(
          error.status === 400
            ? 'Saldo insuficiente ou dados inválidos.'
            : `Falha ao transferir (${error.status}): ${error.statusText}`,
        )
      } else {
        setWalletActionError('Não foi possível concluir a transferência.')
      }
    } finally {
      setWalletSubmitting(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    if (!hasToken) {
      setSubscribeError('Faça login para alterar o plano.')
      return
    }

    setSubscribeMessage(null)
    setSubscribeError(null)
    setSubscribingPlan(planId)
    try {
      const response = await AethelAPIClient.subscribe(planId)
      setSubscribeMessage(`Plano atualizado: ${response.status}.`)

      if (response.checkoutUrl) {
        window.location.assign(response.checkoutUrl)
        return
      }
      if (currentPlanKey) {
        await mutate(currentPlanKey)
      }
      if (creditsKey) {
        await mutate(creditsKey)
      }
      await refreshWallet()
    } catch (error) {
      if (error instanceof APIError) {
        setSubscribeError(`Não foi possível alterar o plano (${error.status}).`)
      } else {
        setSubscribeError('Falha ao comunicar com o serviço de billing.')
      }
    } finally {
      setSubscribingPlan(null)
    }
  }

  const handleManageSubscription = useCallback(async () => {
    if (!hasToken) {
      setSubscribeError('Faça login para gerenciar sua assinatura.')
      return
    }

    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'Falha ao abrir portal')
      }
      window.location.assign(data.url)
    } catch (error) {
      setSubscribeError('Não foi possível abrir o portal de cobrança.')
    }
  }, [hasToken])

  return { loadChatHistoryForThread, refreshCopilotWorkflows, switchCopilotWorkflow, createCopilotWorkflow, renameCopilotWorkflow, archiveCopilotWorkflow, copyHistoryFromWorkflow, mergeFromWorkflow, importContextFromWorkflow, toggleTheme, createNewSession, toggleFavorite, toggleScheduled, filteredSessions, saveCurrentSession, clearDashboardState, downloadUrls, handleDownload, loadSession, sendChatMessage, createProject, deleteProject, handleMagicWandSelect, handleSendSuggestion, handleAcceptSuggestion, walletTransactions, connectivityServices, lastWalletUpdate, creditEntries, receivableSummary, refreshWallet, refreshConnectivity, handlePurchaseIntentSubmit, handleTransferSubmit, handleSubscribe, handleManageSubscription }
}
