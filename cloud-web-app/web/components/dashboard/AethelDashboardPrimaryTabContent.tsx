'use client'

export function AethelDashboardPrimaryTabContent(props: any) {
  const { AIThinkingPanel, APIError, AdminPanel, Background, BillingTab, Controls, DirectorNotePanel, Link, LivePreview, MiniMap, ReactFlow, RenderQueue, TimeMachineSlider, activeTab, activeWorkflowId, aiActivity, applyEdgeChanges, applyNodeChanges, archiveCopilotWorkflow, authReady, billingData, billingError, billingPlansForUI, cancelDownload, cancelRender, chatHistory, chatMessage, chatMode, connectBusy, connectFromWorkflowId, connectivityData, connectivityError, connectivityLoading, connectivityServices, copilotWorkflows, copilotWorkflowsLoading, copyHistoryFromWorkflow, createCopilotWorkflow, createProject, creditEntries, creditsError, creditsInfo, currentPlan, currentPlanError, deleteProject, downloads, edges, exportJobs, formatBytes, formatConnectivityStatus, formatCurrency, formatCurrencyLabel, formatStatusLabel, handleDownload, handleMagicWandSelect, handleManageSubscription, handlePurchaseIntentSubmit, handleSendSuggestion, handleSubscribe, handleTransferSubmit, hasToken, importContextFromWorkflow, isGenerating, isStreaming, lastPurchaseIntent, lastTransferReceipt, lastWalletUpdate, livePreviewSuggestions, mergeFromWorkflow, miniPreviewExpanded, newProjectName, newProjectType, nodes, projects, purchaseForm, receivableSummary, refreshConnectivity, refreshWallet, renameCopilotWorkflow, renderJobs, sendChatMessage, setChatMessage, setChatMode, setConnectFromWorkflowId, setEdges, setMiniPreviewExpanded, setNewProjectName, setNewProjectType, setNodes, setPurchaseForm, setShowToast, setTransferForm, showToast, showToastMessage, subscribeError, subscribeMessage, switchCopilotWorkflow, transferForm, useCases, walletActionError, walletActionMessage, walletData, walletError, walletLoading, walletSubmitting, walletTransactions, workflowTemplates } = props
  return (
    <>
          {activeTab === 'overview' && (
            <div className="aethel-p-6 aethel-space-y-6">
              {/* Status Cards */}
              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 aethel-gap-6">
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2">Atividade de IA</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-blue-400">{aiActivity}</p>
                </div>
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2">Projetos ativos</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-green-400">{projects.filter(p => p.status === 'active').length}</p>
                </div>
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2">Prévia ao vivo</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-cyan-400">{livePreviewSuggestions.length} sugestões</p>
                </div>
              </div>

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 aethel-gap-6">
                <div className="aethel-card aethel-p-6">
                  <div className="aethel-flex aethel-items-center aethel-justify-between">
                    <h3 className="aethel-text-lg aethel-font-semibold">Saldo da carteira</h3>
                    {authReady && hasToken && (
                      <button
                        onClick={refreshWallet}
                        className="aethel-text-xs aethel-border aethel-border-slate-700 aethel-rounded aethel-px-2 aethel-py-1 hover:aethel-border-slate-500"
                      >
                        Atualizar
                      </button>
                    )}
                    {lastWalletUpdate && (
                      <span className="aethel-text-xs aethel-text-slate-400">
                        Atualizado • {new Date(lastWalletUpdate).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="aethel-mt-4">
                    {!authReady && <p className="aethel-text-sm aethel-text-slate-400">Verificando sessão...</p>}
                    {authReady && !hasToken && (
                      <p className="aethel-text-sm aethel-text-slate-400">Faça login para visualizar seu saldo.</p>
                    )}
                    {authReady && hasToken && walletLoading && (
                      <p className="aethel-text-sm aethel-text-slate-400">Carregando carteira...</p>
                    )}
                    {authReady && hasToken && walletError && (
                      <p className="aethel-text-sm aethel-text-red-400">
                        {walletError instanceof APIError && walletError.status === 401
                          ? 'Sessão expirada. Entre novamente.'
                          : 'Não foi possível carregar os dados da carteira.'}
                      </p>
                    )}
                    {authReady && hasToken && !walletLoading && !walletError && walletData && (
                      <>
                        <p className="aethel-text-3xl aethel-font-bold aethel-text-slate-100">
                          {walletData.balance.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                        </p>
                        <p className="aethel-text-xs aethel-text-slate-400 aethel-mt-1">
                          {walletTransactions.length} transações registradas
                        </p>
                        <ul className="aethel-mt-4 aethel-space-y-3">
                          {walletTransactions.slice(-3).reverse().map(entry => (
                            <li key={entry.id} className="aethel-border aethel-border-slate-800 aethel-rounded-lg aethel-p-3">
                              <div className="aethel-flex aethel-justify-between aethel-items-center">
                                <span className="aethel-text-sm aethel-font-medium">
                                  {entry.reference || entry.entry_type.toUpperCase()}
                                </span>
                                <span className={`aethel-text-sm aethel-font-semibold ${entry.entry_type === 'credit' ? 'aethel-text-emerald-400' : 'aethel-text-red-400'}`}>
                                  {entry.entry_type === 'credit' ? '+' : '-'}{entry.amount.toLocaleString()} {formatCurrencyLabel(entry.currency)}
                                </span>
                              </div>
                              <div className="aethel-flex aethel-justify-between aethel-items-center aethel-mt-1">
                                <span className="aethel-text-xs aethel-text-slate-400">
                                  Saldo: {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {formatCurrencyLabel(entry.currency)}
                                </span>
                                <span className="aethel-text-xs aethel-text-slate-500">
                                  {new Date(entry.created_at).toLocaleString()}
                                </span>
                              </div>
                            </li>
                          ))}
                          {walletTransactions.length === 0 && (
                            <li className="aethel-text-sm aethel-text-slate-400">Nenhuma transação registrada.</li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                </div>

                <div className="aethel-card aethel-p-6">
                  <div className="aethel-flex aethel-justify-between aethel-items-center">
                    <h3 className="aethel-text-lg aethel-font-semibold">Status de conectividade</h3>
                    {connectivityData && (
                      <span className={`aethel-text-xs aethel-rounded-full aethel-px-2 aethel-py-1 aethel-border ${
                        connectivityData.overall_status === 'healthy'
                          ? 'aethel-border-emerald-500/30 aethel-bg-emerald-500/20 aethel-text-emerald-300'
                          : connectivityData.overall_status === 'degraded'
                          ? 'aethel-border-amber-500/30 aethel-bg-amber-500/20 aethel-text-amber-300'
                          : 'aethel-border-red-500/30 aethel-bg-red-500/20 aethel-text-red-300'
                      }`}>
                        {formatConnectivityStatus(connectivityData.overall_status).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="aethel-mt-4">
                    {connectivityLoading && (
                      <p className="aethel-text-sm aethel-text-slate-400">Monitorando serviços...</p>
                    )}
                    {connectivityError && (
                      <p className="aethel-text-sm aethel-text-red-400">Falha ao consultar conectividade.</p>
                    )}
                    {!connectivityLoading && !connectivityError && connectivityServices.length === 0 && (
                      <p className="aethel-text-sm aethel-text-slate-400">Nenhum serviço configurado.</p>
                    )}
                    {!connectivityLoading && !connectivityError && connectivityServices.length > 0 && (
                      <div className="aethel-space-y-3">
                        {connectivityServices.map(service => (
                          <div key={service.name} className="aethel-border aethel-border-slate-800 aethel-rounded-lg aethel-p-3">
                            <div className="aethel-flex aethel-justify-between aethel-items-center">
                              <span className="aethel-text-sm aethel-font-medium aethel-capitalize">{service.name.replace(/_/g, ' ')}</span>
                              <span className={`aethel-text-xs aethel-rounded-full aethel-px-2 aethel-py-1 ${
                                service.status === 'healthy'
                                  ? 'aethel-bg-emerald-500/20 aethel-text-emerald-300'
                                  : service.status === 'degraded'
                                  ? 'aethel-bg-amber-500/20 aethel-text-amber-300'
                                  : 'aethel-bg-red-500/20 aethel-text-red-300'
                              }`}>
                                {formatConnectivityStatus(service.status).toUpperCase()}
                              </span>
                            </div>
                            <ul className="aethel-mt-2 aethel-space-y-1">
                              {service.endpoints.slice(0, 3).map(endpoint => (
                                <li key={`${service.name}-${endpoint.url}`} className="aethel-flex aethel-justify-between aethel-text-xs">
                                  <span className={`${endpoint.healthy ? 'aethel-text-emerald-300' : 'aethel-text-red-300'}`}>
                                    {endpoint.url}
                                  </span>
                                  <span className="aethel-text-slate-400">
                                    {endpoint.latency_ms !== null ? `${endpoint.latency_ms.toFixed(0)}ms` : '—'}
                                  </span>
                                </li>
                              ))}
                              {service.endpoints.length > 3 && (
                                <li className="aethel-text-xs aethel-text-slate-500">
                                  +{service.endpoints.length - 3} endpoints adicionais
                                </li>
                              )}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="aethel-card aethel-p-6">
                <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-4">
                  <h3 className="aethel-text-xl aethel-font-semibold">Prévia ao vivo</h3>
                  <button
                    onClick={() => setMiniPreviewExpanded(!miniPreviewExpanded)}
                    className="aethel-button aethel-button-ghost aethel-text-sm"
                  >
                    {miniPreviewExpanded ? 'Recolher' : 'Expandir'}
                  </button>
                </div>
                <LivePreview
                  onMagicWandSelect={handleMagicWandSelect}
                  suggestions={livePreviewSuggestions}
                  onSendSuggestion={handleSendSuggestion}
                  isGenerating={isGenerating}
                />
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-6">
                <h2 className="aethel-text-2xl aethel-font-bold">Projetos</h2>
                
                {/* TimeMachine Slider para histórico do projeto */}
                {projects.length > 0 && (
                  <div className="aethel-w-96">
                    <TimeMachineSlider
                      versions={[]}
                      onVersionChange={(versionId) => {
                        showToastMessage(`Navegando para versão: ${versionId}`, 'info');
                      }}
                      variant="compact"
                    />
                  </div>
                )}
              </div>
              
              {/* Director Note Panel - Feedback artístico da IA */}
              {projects.length > 0 && (
                <div className="aethel-mb-6">
                  <DirectorNotePanel
                    projectId={String(projects[0].id)}
                    position="floating"
                    onApplyFix={async (note) => {
                      showToastMessage(`Aplicando sugestão: ${note.title}`, 'success');
                    }}
                  />
                </div>
              )}
              
              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-6 aethel-mb-6">
                {projects.map(project => (
                  <div key={project.id} className="aethel-card aethel-p-4">
                    <h3 className="aethel-font-semibold aethel-mb-2">{project.name}</h3>
                    <p className="aethel-text-sm aethel-text-slate-400 aethel-mb-2">Tipo: {project.type}</p>
                    <p className="aethel-text-sm aethel-mb-4">Status: <span className={`aethel-px-2 aethel-py-1 aethel-rounded aethel-text-xs ${project.status === 'active' ? 'aethel-bg-green-500/20 aethel-text-green-400' : 'aethel-bg-gray-500/20 aethel-text-gray-400'}`}>{project.status}</span></p>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="aethel-button aethel-button-danger aethel-text-xs"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
              <div className="aethel-card aethel-p-6 aethel-max-w-md">
                <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Criar novo projeto</h3>
                <div className="aethel-space-y-4">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Nome do projeto"
                    className="aethel-input aethel-w-full"
                  />
                  <select
                    value={newProjectType}
                    onChange={(e) => setNewProjectType(e.target.value)}
                    className="aethel-input aethel-w-full"
                  >
                    <option value="code">Projeto de código</option>
                    <option value="unreal">Unreal Engine</option>
                    <option value="web">Aplicação web</option>
                  </select>
                  <button
                    onClick={createProject}
                    className="aethel-button aethel-button-primary aethel-w-full"
                  >
                    Criar projeto
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-chat' && (
            <div className="aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-6">
                <h2 className="aethel-text-2xl aethel-font-bold">Chat IA</h2>
                <div className="aethel-flex aethel-gap-2">
                  <button
                    onClick={() => setChatMode('chat')}
                    className={`aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-text-sm aethel-font-medium ${chatMode === 'chat' ? 'aethel-bg-blue-500 aethel-text-white' : 'aethel-bg-slate-700 aethel-text-slate-300 hover:aethel-bg-slate-600'}`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setChatMode('agent')}
                    className={`aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-text-sm aethel-font-medium ${chatMode === 'agent' ? 'aethel-bg-blue-500 aethel-text-white' : 'aethel-bg-slate-700 aethel-text-slate-300 hover:aethel-bg-slate-600'}`}
                  >
                    Modo agente
                  </button>
                  <button
                    onClick={() => setChatMode('canvas')}
                    className={`aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-text-sm aethel-font-medium ${chatMode === 'canvas' ? 'aethel-bg-blue-500 aethel-text-white' : 'aethel-bg-slate-700 aethel-text-slate-300 hover:aethel-bg-slate-600'}`}
                  >
                    Canvas
                  </button>
                </div>
              </div>

              <div className="aethel-flex aethel-items-center aethel-gap-2 aethel-mb-4">
                <span className="aethel-text-sm aethel-text-slate-400">Trabalho</span>
                <select
                  value={activeWorkflowId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '__new__') {
                      void createCopilotWorkflow()
                      return
                    }
                    if (v) void switchCopilotWorkflow(v)
                  }}
                  className="aethel-input"
                  disabled={copilotWorkflowsLoading || connectBusy}
                >
                  {copilotWorkflows.map((wf) => (
                    <option key={String(wf.id)} value={String(wf.id)}>
                      {wf.title || 'Fluxo'}
                    </option>
                  ))}
                  <option value="__new__">+ Novo trabalho</option>
                </select>

                <button
                  onClick={() => void renameCopilotWorkflow()}
                  className="aethel-button aethel-button-secondary"
                  disabled={!activeWorkflowId}
                >
                  Renomear
                </button>
                <button
                  onClick={() => void archiveCopilotWorkflow()}
                  className="aethel-button aethel-button-secondary"
                  disabled={!activeWorkflowId}
                >
                  Arquivar
                </button>

                <select
                  value={connectFromWorkflowId}
                  onChange={(e) => setConnectFromWorkflowId(e.target.value)}
                  className="aethel-input"
                  disabled={copilotWorkflowsLoading || connectBusy}
                >
                  <option value="">Conectar…</option>
                  {copilotWorkflows
                    .filter((w) => String(w.id) !== String(activeWorkflowId))
                    .map((wf) => (
                      <option key={String(wf.id)} value={String(wf.id)}>
                        {wf.title || 'Fluxo'}
                      </option>
                    ))}
                </select>

                <button
                  onClick={() => void copyHistoryFromWorkflow()}
                  className="aethel-button aethel-button-secondary"
                  disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
                  title="Copia o histórico do trabalho selecionado para o trabalho atual (clona a thread)"
                >
                  {connectBusy ? 'Processando…' : 'Copiar histórico'}
                </button>

                <button
                  onClick={() => void importContextFromWorkflow()}
                  className="aethel-button aethel-button-secondary"
                  disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
                  title="Importa contexto (livePreview/editor/openFiles) do trabalho selecionado"
                >
                  {connectBusy ? 'Processando…' : 'Importar contexto'}
                </button>

                <button
                  onClick={() => void mergeFromWorkflow()}
                  className="aethel-button aethel-button-secondary"
                  disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
                  title="Mescla histórico + contexto do trabalho selecionado e arquiva o trabalho de origem"
                >
                  {connectBusy ? 'Processando…' : 'Mesclar'}
                </button>
              </div>

              {chatMode === 'chat' && (
                <div className="aethel-card aethel-p-6 aethel-max-w-4xl aethel-mx-auto">
                  <div className="aethel-mb-4 aethel-text-sm aethel-text-slate-400">
                    Chat conversacional padrão com os agentes avançados do Aethel.
                  </div>
                  <div className="aethel-space-y-4 aethel-mb-4 aethel-max-h-96 aethel-overflow-y-auto">
                    {chatHistory.map((msg, index) => (
                      <div key={index} className={`aethel-p-3 aethel-rounded-lg ${msg.role === 'user' ? 'aethel-bg-blue-500/20 aethel-ml-12' : 'aethel-bg-slate-700/50 aethel-mr-12'}`}>
                        <p className="aethel-text-sm aethel-font-medium aethel-mb-1">{msg.role === 'user' ? 'Você' : 'IA'}</p>
                        <p className="aethel-text-sm">{msg.content}</p>
                      </div>
                    ))}
                    
                    {/* AI Thinking Panel - Mostra quando IA está processando */}
                    {isStreaming && (
                      <AIThinkingPanel 
                        isStreaming={isStreaming}
                        position="floating"
                      />
                    )}
                  </div>
                  <div className="aethel-flex aethel-gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Digite sua mensagem..."
                      className="aethel-input aethel-flex-1"
                    />
                    <button
                      onClick={sendChatMessage}
                      className="aethel-button aethel-button-primary"
                      disabled={isStreaming}
                    >
                      {isStreaming ? 'Processando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}

              {chatMode === 'agent' && (
                <div className="aethel-card aethel-p-6 aethel-max-w-4xl aethel-mx-auto">
                  <div className="aethel-mb-4 aethel-text-sm aethel-text-slate-400">
                    Modo de agente autônomo — inspirado na plataforma Manus. A IA executará tarefas passo a passo e entregará resultados.
                  </div>
                  <div className="aethel-space-y-4 aethel-mb-4">
                    <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-4">
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Pesquisa e análise</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Coletar informações, analisar dados e gerar insights</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Criação de conteúdo</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Gerar artigos, código, documentação e conteúdo criativo</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Automação</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Criar fluxos, scripts e processos automatizados</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Resolução de problemas</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Depurar código, otimizar performance e resolver issues complexas</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Geração de código</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Gerar, depurar e otimizar código em várias linguagens</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Análise de dados</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Analisar datasets, criar visualizações e extrair insights</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Design criativo</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Desenhar UI/UX, gráficos e conceitos criativos</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Estratégia de negócios</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Planejamento estratégico, análise de mercado e desenvolvimento de negócios</p>
                      </button>
                    </div>
                  </div>
                  <div className="aethel-flex aethel-gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Descreva a tarefa para o agente..."
                      className="aethel-input aethel-flex-1"
                    />
                    <button
                      onClick={sendChatMessage}
                      className="aethel-button aethel-button-primary"
                    >
                      Executar
                    </button>
                  </div>
                </div>
              )}

              {chatMode === 'canvas' && (
                <div className="aethel-card aethel-p-6 aethel-max-w-6xl aethel-mx-auto">
                  <div className="aethel-mb-4 aethel-text-sm aethel-text-slate-400">
                    Canvas visual para trabalho colaborativo com IA. Desenhe, esboce ideias e colabore em tempo real.
                  </div>
                  <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-4 aethel-min-h-96 aethel-border aethel-border-slate-700 aethel-relative">
                    <div className="aethel-absolute aethel-top-4 aethel-left-4 aethel-flex aethel-gap-2">
                      <button className="aethel-button aethel-button-ghost aethel-text-xs">Desenhar</button>
                      <button className="aethel-button aethel-button-ghost aethel-text-xs">Formas</button>
                      <button className="aethel-button aethel-button-ghost aethel-text-xs">Texto</button>
                      <button className="aethel-button aethel-button-ghost aethel-text-xs">Melhorar com IA</button>
                    </div>
                    <div className="aethel-text-center aethel-text-slate-500 aethel-py-32">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <p className="text-lg font-medium mb-2">Canvas interativo</p>
                      <p className="text-sm">Em breve com recursos completos de desenho e colaboração</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'content-creation' && (
            <div className="aethel-p-6">
              <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Criação de conteúdo</h2>
              <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Conteúdo com IA</h3>
                  <p className="aethel-text-slate-400 aethel-mb-4">Gere código, documentação e conteúdo criativo com assistência de IA.</p>
                  <button className="aethel-button aethel-button-primary">Começar a criar</button>
                </div>
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Modelos</h3>
                  <p className="aethel-text-slate-400 aethel-mb-4">Use modelos pré-prontos para tarefas comuns de desenvolvimento.</p>
                  <button className="aethel-button aethel-button-secondary">Ver modelos</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'unreal' && (
            <div className="aethel-p-6">
              <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Integração com Unreal Engine</h2>
              <div className="aethel-card aethel-p-6">
                <p className="aethel-text-slate-400 aethel-mb-4">Integre-se ao Unreal Engine para VR e desenvolvimento de jogos.</p>
                <div className="aethel-flex aethel-gap-4">
                  <button className="aethel-button aethel-button-primary">Conectar à Unreal</button>
                  <button className="aethel-button aethel-button-secondary">Prévia VR</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <h2 className="aethel-text-2xl aethel-font-bold">Carteira</h2>
                {authReady && hasToken && (
                  <button onClick={refreshWallet} className="aethel-button aethel-button-secondary aethel-text-xs">
                    Atualizar
                  </button>
                )}
              </div>
              {!authReady && <p className="aethel-text-sm aethel-text-slate-400">Verificando autenticação...</p>}
              {authReady && !hasToken && (
                <div className="aethel-card aethel-p-6 aethel-max-w-2xl">
                  <p className="aethel-text-sm aethel-text-slate-300">
                    Para visualizar o saldo e realizar operações, faça login no portal.
                  </p>
                </div>
              )}
              {authReady && hasToken && (
                <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
                  <div className="aethel-card aethel-p-6 aethel-space-y-4">
                    <div>
                      <h3 className="aethel-text-lg aethel-font-semibold">Saldo Atual</h3>
                      {walletLoading && <p className="aethel-text-sm aethel-text-slate-400">Carregando carteira...</p>}
                      {walletError && (
                        <p className="aethel-text-sm aethel-text-red-400">
                          Falha ao carregar os dados. Tente novamente.
                        </p>
                      )}
                      {!walletLoading && !walletError && walletData && (
                        <>
                          <div className="aethel-text-4xl aethel-font-bold aethel-text-slate-100">
                            {walletData.balance.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                          </div>
                          {creditsInfo && (
                            <p className="aethel-text-xs aethel-text-slate-400">
                              Créditos faturáveis: {creditsInfo.credits.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                            </p>
                          )}
                          <p className="aethel-text-xs aethel-text-slate-500">
                            {walletTransactions.length} transações
                          </p>
                          {lastWalletUpdate && (
                            <p className="aethel-text-xs aethel-text-slate-500">
                              Atualizado em {new Date(lastWalletUpdate).toLocaleString()}
                            </p>
                          )}
                          <div className="aethel-grid aethel-grid-cols-1 sm:aethel-grid-cols-3 aethel-gap-3 aethel-mt-4">
                            <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                              <p className="aethel-text-xs aethel-text-slate-500">Gasto hoje</p>
                              <p className="aethel-text-lg aethel-font-semibold aethel-text-rose-300">
                                {creditsUsedToday.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                              </p>
                            </div>
                            <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                              <p className="aethel-text-xs aethel-text-slate-500">Gasto no mês</p>
                              <p className="aethel-text-lg aethel-font-semibold aethel-text-amber-300">
                                {creditsUsedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                              </p>
                            </div>
                            <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                              <p className="aethel-text-xs aethel-text-slate-500">Recebido no mês</p>
                              <p className="aethel-text-lg aethel-font-semibold aethel-text-emerald-300">
                                {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                              </p>
                            </div>
                          </div>
                          {lastPurchaseIntent && (
                            <p className="aethel-text-xs aethel-text-slate-400 aethel-mt-2">
                              Última intenção #{lastPurchaseIntent.intent_id} • +
                              {lastPurchaseIntent.entry.amount.toLocaleString()} {formatCurrencyLabel(lastPurchaseIntent.entry.currency)}{' '}
                              em {new Date(lastPurchaseIntent.entry.created_at).toLocaleString()}
                            </p>
                          )}
                          {lastTransferReceipt && (
                            <p className="aethel-text-xs aethel-text-slate-400">
                              Última transferência #{lastTransferReceipt.transfer_id} • -
                              {lastTransferReceipt.sender_entry.amount.toLocaleString()} {formatCurrencyLabel(lastTransferReceipt.sender_entry.currency)}{' '}
                              em {new Date(lastTransferReceipt.sender_entry.created_at).toLocaleString()}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {(walletActionMessage || walletActionError) && (
                      <div className={`aethel-text-sm ${walletActionError ? 'aethel-text-red-400' : 'aethel-text-emerald-400'}`}>
                        {walletActionError || walletActionMessage}
                      </div>
                    )}
                    <form className="aethel-space-y-3" onSubmit={handlePurchaseIntentSubmit}>
                      <h4 className="aethel-text-sm aethel-font-semibold">Adicionar Créditos</h4>
                      <div className="aethel-flex aethel-gap-2">
                        <input
                          type="number"
                          min={1}
                          value={purchaseForm.amount}
                          onChange={(e) => setPurchaseForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="aethel-input"
                          placeholder="Quantidade"
                          required
                        />
                        <select
                          value={purchaseForm.currency}
                          onChange={(e) => setPurchaseForm(prev => ({ ...prev, currency: e.target.value }))}
                          className="aethel-input aethel-w-32"
                        >
                          <option value="credits">Créditos</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={purchaseForm.reference}
                        onChange={(e) => setPurchaseForm(prev => ({ ...prev, reference: e.target.value }))}
                        className="aethel-input"
                        placeholder="Referência (opcional)"
                      />
                      <button
                        type="submit"
                        className="aethel-button aethel-button-primary"
                        disabled={walletSubmitting}
                      >
                        {walletSubmitting ? 'Processando...' : 'Confirmar Intenção'}
                      </button>
                    </form>
                  </div>

                  <div className="aethel-card aethel-p-6 aethel-space-y-4">
                    <form className="aethel-space-y-3" onSubmit={handleTransferSubmit}>
                      <h3 className="aethel-text-lg aethel-font-semibold">Transferir Créditos</h3>
                      <input
                        type="text"
                        value={transferForm.targetUserId}
                        onChange={(e) => setTransferForm(prev => ({ ...prev, targetUserId: e.target.value }))}
                        className="aethel-input"
                        placeholder="ID do usuário ou e-mail do destinatário"
                        required
                      />
                      <div className="aethel-flex aethel-gap-2">
                        <input
                          type="number"
                          min={1}
                          value={transferForm.amount}
                          onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="aethel-input"
                          placeholder="Quantidade"
                          required
                        />
                        <select
                          value={transferForm.currency}
                          onChange={(e) => setTransferForm(prev => ({ ...prev, currency: e.target.value }))}
                          className="aethel-input aethel-w-32"
                        >
                          <option value="credits">Créditos</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={transferForm.reference}
                        onChange={(e) => setTransferForm(prev => ({ ...prev, reference: e.target.value }))}
                        className="aethel-input"
                        placeholder="Referência (opcional)"
                      />
                      <button
                        type="submit"
                        className="aethel-button aethel-button-secondary"
                        disabled={walletSubmitting}
                      >
                        {walletSubmitting ? 'Processando...' : 'Transferir'}
                      </button>
                    </form>

                    <div>
                      <h4 className="aethel-text-sm aethel-font-semibold aethel-mb-2">Histórico Recente</h4>
                      <div className="aethel-space-y-2 aethel-max-h-64 aethel-overflow-y-auto">
                        {walletTransactions.length === 0 && (
                          <p className="aethel-text-sm aethel-text-slate-500">Nenhuma transação registrada.</p>
                        )}
                        {walletTransactions.slice().reverse().map(entry => (
                          <div key={entry.id} className="aethel-border aethel-border-slate-800 aethel-rounded-lg aethel-p-3">
                            <div className="aethel-flex aethel-justify-between aethel-items-center">
                              <span className="aethel-text-sm aethel-font-medium">
                                {entry.reference || entry.entry_type.toUpperCase()}
                              </span>
                              <span className={`aethel-text-sm aethel-font-semibold ${entry.entry_type === 'credit' ? 'aethel-text-emerald-400' : entry.entry_type === 'transfer' ? 'aethel-text-amber-300' : 'aethel-text-red-400'}`}>
                                {entry.entry_type === 'credit' ? '+' : '-'}{entry.amount.toLocaleString()} {formatCurrencyLabel(entry.currency)}
                              </span>
                            </div>
                            <div className="aethel-flex aethel-justify-between aethel-items-center aethel-mt-1">
                              <span className="aethel-text-xs aethel-text-slate-400">
                                Saldo: {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {formatCurrencyLabel(entry.currency)}
                              </span>
                              <span className="aethel-text-xs aethel-text-slate-500">
                                {new Date(entry.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="aethel-card aethel-p-6 lg:aethel-col-span-2 aethel-space-y-4">
                    <div className="aethel-flex aethel-items-center aethel-justify-between">
                      <h3 className="aethel-text-lg aethel-font-semibold">Recebíveis</h3>
                      <span className="aethel-text-xs aethel-text-slate-500">
                        {creditEntries.length} lançamentos de entrada
                      </span>
                    </div>
                    <div className="aethel-grid aethel-grid-cols-1 sm:aethel-grid-cols-3 aethel-gap-4">
                      <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                        <p className="aethel-text-xs aethel-text-slate-500">Recebido no mês</p>
                        <p className="aethel-text-lg aethel-font-semibold aethel-text-emerald-300">
                          {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                        </p>
                      </div>
                      <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                        <p className="aethel-text-xs aethel-text-slate-500">Total creditado</p>
                        <p className="aethel-text-lg aethel-font-semibold aethel-text-blue-300">
                          {receivableSummary.total.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                        </p>
                      </div>
                      <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                        <p className="aethel-text-xs aethel-text-slate-500">Pendente de conciliação</p>
                        <p className="aethel-text-lg aethel-font-semibold aethel-text-amber-300">
                          {receivableSummary.pending.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="aethel-overflow-x-auto">
                      <table className="aethel-min-w-full aethel-text-xs aethel-text-left">
                        <thead>
                          <tr className="aethel-text-slate-400">
                            <th className="aethel-py-2 aethel-pr-4">Referência</th>
                            <th className="aethel-py-2 aethel-pr-4">Valor</th>
                            <th className="aethel-py-2 aethel-pr-4">Status</th>
                            <th className="aethel-py-2 aethel-pr-4">Saldo</th>
                            <th className="aethel-py-2">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receivableSummary.recent.length === 0 && (
                            <tr>
                              <td className="aethel-py-3 aethel-text-slate-500" colSpan={5}>
                                Nenhum recebimento registrado.
                              </td>
                            </tr>
                          )}
                          {receivableSummary.recent.map(entry => {
                            const rawStatus = entry.metadata?.['status'] as unknown
                            const statusLabel = formatStatusLabel(rawStatus)
                            const invoice = entry.metadata?.['invoice_id'] as unknown
                            const invoiceLabel = typeof invoice === 'string' ? invoice : entry.reference
                            const amountLabel = `+${entry.amount.toLocaleString()} ${formatCurrencyLabel(entry.currency)}`
                            return (
                              <tr key={entry.id} className="aethel-border-t aethel-border-slate-800">
                                <td className="aethel-py-2 aethel-pr-4 aethel-font-medium aethel-text-slate-200">
                                  {invoiceLabel || 'Recebimento'}
                                </td>
                                <td className="aethel-py-2 aethel-pr-4 aethel-text-emerald-300">
                                  {amountLabel}
                                </td>
                                <td className="aethel-py-2 aethel-pr-4 aethel-uppercase">
                                  {statusLabel}
                                </td>
                                <td className="aethel-py-2 aethel-pr-4 aethel-text-slate-400">
                                  {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {formatCurrencyLabel(entry.currency)}
                                </td>
                                <td className="aethel-py-2 aethel-text-slate-400">
                                  {new Date(entry.created_at).toLocaleString()}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'connectivity' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <h2 className="aethel-text-2xl aethel-font-bold">Monitor de conectividade</h2>
                <button onClick={refreshConnectivity} className="aethel-button aethel-button-secondary aethel-text-xs">
                  Atualizar
                </button>
              </div>
              {connectivityLoading && (
                <p className="aethel-text-sm aethel-text-slate-400">Monitorando serviços...</p>
              )}
              {connectivityError && (
                <p className="aethel-text-sm aethel-text-red-400">Não foi possível consultar os endpoints.</p>
              )}
              {!connectivityLoading && !connectivityError && connectivityData && (
                <div className="aethel-space-y-4">
                  <div className="aethel-card aethel-p-6 aethel-flex aethel-justify-between aethel-items-center">
                    <div>
                      <p className="aethel-text-sm aethel-text-slate-400">Status geral</p>
                      <p className="aethel-text-3xl aethel-font-bold">
                        {formatConnectivityStatus(connectivityData.overall_status).toUpperCase()}
                      </p>
                    </div>
                    <div className="aethel-text-sm aethel-text-slate-400">
                      Atualizado em {connectivityData.timestamp ? new Date(connectivityData.timestamp).toLocaleString() : '—'}
                    </div>
                  </div>

                  <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-4">
                    {connectivityServices.map(service => (
                      <div key={service.name} className="aethel-card aethel-p-5 aethel-space-y-3">
                        <div className="aethel-flex aethel-justify-between aethel-items-center">
                          <h3 className="aethel-text-lg aethel-font-semibold aethel-capitalize">{service.name.replace(/_/g, ' ')}</h3>
                          <span className={`aethel-text-xs aethel-rounded-full aethel-px-2 aethel-py-1 ${
                            service.status === 'healthy'
                              ? 'aethel-bg-emerald-500/20 aethel-text-emerald-300'
                              : service.status === 'degraded'
                              ? 'aethel-bg-amber-500/20 aethel-text-amber-300'
                              : 'aethel-bg-red-500/20 aethel-text-red-300'
                          }`}>
                            {formatConnectivityStatus(service.status).toUpperCase()}
                          </span>
                        </div>
                        <div className="aethel-space-y-2">
                          {service.endpoints.map(endpoint => (
                            <div key={`${service.name}-${endpoint.url}`} className="aethel-border aethel-border-slate-800 aethel-rounded aethel-p-3">
                              <div className="aethel-flex aethel-justify-between aethel-items-center">
                                <span className={`${endpoint.healthy ? 'aethel-text-emerald-300' : 'aethel-text-red-300'} aethel-text-sm`}>{endpoint.url}</span>
                                <span className="aethel-text-xs aethel-text-slate-400">
                                  {endpoint.latency_ms !== null ? `${endpoint.latency_ms.toFixed(0)} ms` : '—'} • {endpoint.status_code ?? '—'}
                                </span>
                              </div>
                              {endpoint.error && (
                                <p className="aethel-text-xs aethel-text-red-300 aethel-mt-1">{endpoint.error}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'agent-canvas' && (
            <div className="aethel-p-6">
              <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Canvas de agentes</h2>
              <div className="aethel-card aethel-p-6">
                <div className="aethel-mb-4">
                  <p className="aethel-text-slate-400 aethel-mb-4">Construa e visualize fluxos de agentes de IA. Inspirado em plataformas avançadas como Manus para execução autônoma.</p>
                  <div className="aethel-flex aethel-gap-4 aethel-mb-4">
                    <button className="aethel-button aethel-button-primary">Novo fluxo</button>
                    <button className="aethel-button aethel-button-secondary">Carregar template</button>
                    <button className="aethel-button aethel-button-ghost">Executar agente</button>
                  </div>
                </div>
               <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-4 aethel-min-h-96 aethel-border aethel-border-slate-700 aethel-overflow-hidden">
                 <ReactFlow
                   nodes={nodes}
                   edges={edges}
                   onNodesChange={(changes) => setNodes((nds) => applyNodeChanges(changes, nds))}
                   onEdgesChange={(changes) => setEdges((eds) => applyEdgeChanges(changes, eds))}
                   fitView
                   style={{ background: '#1e293b' }}
                 >
                   <Background color="#374151" gap={16} />
                   <Controls />
                   <MiniMap
                     nodeColor="#6366f1"
                     maskColor="rgba(30, 41, 59, 0.8)"
                   />
                 </ReactFlow>
               </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-flex aethel-flex-col md:aethel-flex-row md:aethel-items-end md:aethel-justify-between aethel-gap-4">
                <div className="aethel-space-y-2">
                  <h2 className="aethel-text-3xl aethel-font-bold">Faturamento &amp; Créditos</h2>
                  <p className="aethel-text-slate-400 aethel-max-w-2xl">
                    Acompanhe o plano ativo, créditos disponíveis e recebíveis em tempo real. Todas as operações refletem
                    diretamente o que está registrado na carteira e nos endpoints de billing.
                  </p>
                </div>
                <Link href="/terms" className="aethel-button aethel-button-secondary aethel-text-sm">
                  Consultar Termos de Uso
                </Link>
              </div>

              {(billingError || currentPlanError || creditsError) && (
                <div className="aethel-card aethel-border aethel-border-amber-500/40 aethel-bg-amber-500/10 aethel-text-amber-200 aethel-text-sm aethel-p-4">
                  <p>
                    {billingError && 'Falha ao recuperar planos. '}
                    {currentPlanError && 'Não foi possível identificar o plano atual. '}
                    {creditsError && 'Não foi possível obter o saldo de créditos faturáveis.'}
                  </p>
                </div>
              )}

              {(subscribeMessage || subscribeError) && (
                <div className={`aethel-card aethel-text-sm aethel-p-4 ${subscribeError ? 'aethel-text-red-300 aethel-bg-red-500/10 aethel-border aethel-border-red-500/40' : 'aethel-text-emerald-300 aethel-bg-emerald-500/10 aethel-border aethel-border-emerald-500/40'}`}>
                  {subscribeError || subscribeMessage}
                </div>
              )}

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 xl:aethel-grid-cols-4 aethel-gap-4">
                <div className="aethel-card aethel-p-5 aethel-space-y-3">
                  <p className="aethel-text-xs aethel-text-slate-500">Plano atual</p>
                  <h3 className="aethel-text-xl aethel-font-semibold">
                    {currentPlan?.name ?? 'Plano padrão'}
                  </h3>
                  <p className="aethel-text-sm aethel-text-slate-400">
                    {currentPlan?.priceBRL !== undefined
                      ? `${formatCurrency(currentPlan.priceBRL, 'BRL')}/mês`
                      : currentPlan?.price !== undefined
                        ? `${formatCurrency(currentPlan.price, 'USD')}/mês`
                        : 'Valor conforme consumo'}
                  </p>
                  {currentPlan?.features && currentPlan.features.length > 0 && (
                    <ul className="aethel-text-xs aethel-text-slate-400 aethel-space-y-1">
                      {currentPlan.features.slice(0, 3).map(feature => (
                        <li key={feature}>• {feature}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="aethel-card aethel-p-5 aethel-space-y-3">
                  <p className="aethel-text-xs aethel-text-slate-500">Saldo em créditos</p>
                  <h3 className="aethel-text-2xl aethel-font-semibold aethel-text-blue-300">
                    {walletData ? `${walletData.balance.toLocaleString()} ${formatCurrencyLabel(walletData.currency)}` : '—'}
                  </h3>
                  <p className="aethel-text-xs aethel-text-slate-400">
                    {creditsInfo
                      ? `Créditos faturáveis: ${creditsInfo.credits.toLocaleString()} ${formatCurrencyLabel(walletData?.currency)}`
                      : 'Sincronize após login para detalhar faturamento.'}
                  </p>
                </div>

                <div className="aethel-card aethel-p-5 aethel-space-y-3">
                  <p className="aethel-text-xs aethel-text-slate-500">Consumo mensal</p>
                  <h3 className="aethel-text-2xl aethel-font-semibold aethel-text-rose-300">
                    {creditsUsedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                  </h3>
                  <p className="aethel-text-xs aethel-text-slate-400">Inclui débitos e transferências realizadas desde o início do mês.</p>
                </div>

                <div className="aethel-card aethel-p-5 aethel-space-y-3">
                  <p className="aethel-text-xs aethel-text-slate-500">Recebíveis pendentes</p>
                  <h3 className="aethel-text-2xl aethel-font-semibold aethel-text-amber-300">
                    {receivableSummary.pending.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                  </h3>
                  <p className="aethel-text-xs aethel-text-slate-400">Baseado nos lançamentos com status pendente ou não conciliado.</p>
                </div>
              </div>

              <div className="aethel-card aethel-p-6 aethel-space-y-4">
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <h3 className="aethel-text-lg aethel-font-semibold">Saldo &amp; Recebíveis</h3>
                  <span className="aethel-text-xs aethel-text-slate-500">Última atualização: {lastWalletUpdate ? new Date(lastWalletUpdate).toLocaleString() : '—'}</span>
                </div>
                <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 aethel-gap-4">
                  <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                    <p className="aethel-text-xs aethel-text-slate-500">Recebido no mês</p>
                    <p className="aethel-text-lg aethel-font-semibold aethel-text-emerald-300">
                      {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                    </p>
                  </div>
                  <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                    <p className="aethel-text-xs aethel-text-slate-500">Gasto hoje</p>
                    <p className="aethel-text-lg aethel-font-semibold aethel-text-rose-300">
                      {creditsUsedToday.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                    </p>
                  </div>
                  <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                    <p className="aethel-text-xs aethel-text-slate-500">Total creditado</p>
                    <p className="aethel-text-lg aethel-font-semibold aethel-text-blue-300">
                      {receivableSummary.total.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                    </p>
                  </div>
                </div>
                <div className="aethel-overflow-x-auto">
                  <table className="aethel-min-w-full aethel-text-xs aethel-text-left">
                    <thead>
                      <tr className="aethel-text-slate-400">
                        <th className="aethel-py-2 aethel-pr-4">Referência</th>
                        <th className="aethel-py-2 aethel-pr-4">Valor</th>
                        <th className="aethel-py-2 aethel-pr-4">Status</th>
                        <th className="aethel-py-2 aethel-pr-4">Saldo</th>
                        <th className="aethel-py-2">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receivableSummary.recent.length === 0 && (
                        <tr>
                          <td className="aethel-py-3 aethel-text-slate-500" colSpan={5}>
                            Nenhum recebimento cadastrado neste período.
                          </td>
                        </tr>
                      )}
                      {receivableSummary.recent.map(entry => {
                        const rawStatus = entry.metadata?.['status'] as unknown
                        const statusLabel = formatStatusLabel(rawStatus)
                        const invoice = entry.metadata?.['invoice_id'] as unknown
                        const invoiceLabel = typeof invoice === 'string' ? invoice : entry.reference
                        const amountLabel = `+${entry.amount.toLocaleString()} ${formatCurrencyLabel(entry.currency)}`
                        return (
                          <tr key={entry.id} className="aethel-border-t aethel-border-slate-800">
                            <td className="aethel-py-2 aethel-pr-4 aethel-font-medium aethel-text-slate-200">
                              {invoiceLabel || 'Recebimento'}
                            </td>
                            <td className="aethel-py-2 aethel-pr-4 aethel-text-emerald-300">
                              {amountLabel}
                            </td>
                            <td className="aethel-py-2 aethel-pr-4 aethel-uppercase">
                              {statusLabel}
                            </td>
                            <td className="aethel-py-2 aethel-pr-4 aethel-text-slate-400">
                              {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {formatCurrencyLabel(entry.currency)}
                            </td>
                            <td className="aethel-py-2 aethel-text-slate-400">
                              {new Date(entry.created_at).toLocaleString()}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="aethel-card aethel-p-6 aethel-space-y-4">
                <div className="aethel-flex aethel-items-center aethel-justify-between">
                  <h3 className="aethel-text-lg aethel-font-semibold">Planos e assinatura</h3>
                  <button
                    type="button"
                    onClick={handleManageSubscription}
                    className="aethel-button aethel-button-ghost aethel-text-xs"
                  >
                    Gerenciar assinatura
                  </button>
                </div>
                <BillingTab
                  plans={billingPlansForUI}
                  currentPlan={currentPlan?.id ?? ''}
                  loading={!billingData && !billingError}
                  onSelectPlan={handleSubscribe}
                  onManageSubscription={handleManageSubscription}
                  showHeader={false}
                  showHighlights={false}
                  showFaq={false}
                  showCurrentPlanInfo={false}
                />
              </div>

              <div className="aethel-card aethel-p-6 aethel-space-y-3">
                <h3 className="aethel-text-lg aethel-font-semibold">Governança e conformidade</h3>
                <p className="aethel-text-sm aethel-text-slate-400">
                  Todas as operações de compra, transferência e recepção de créditos seguem os Termos de Uso e políticas de
                  cobrança da plataforma Aethel. Certifique-se de compartilhar estes documentos com os times financeiro e
                  jurídico antes de ativar automações de faturamento.
                </p>
                <div className="aethel-flex aethel-flex-wrap aethel-gap-3">
                  <Link href="/terms" className="aethel-button aethel-button-ghost aethel-text-xs">
                    Termos de Uso
                  </Link>
                  <a href="mailto:billing@aethel.ai" className="aethel-button aethel-button-ghost aethel-text-xs">
                    Contato financeiro
                  </a>
                </div>
              </div>
            </div>
          )}

    </>
  )
}
