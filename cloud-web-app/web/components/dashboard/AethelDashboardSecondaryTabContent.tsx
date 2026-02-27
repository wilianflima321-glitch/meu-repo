'use client'

export function AethelDashboardSecondaryTabContent(props: any) {
  const { AIThinkingPanel, APIError, AdminPanel, Background, BillingTab, Controls, DirectorNotePanel, Link, LivePreview, MiniMap, ReactFlow, RenderQueue, TimeMachineSlider, activeTab, activeWorkflowId, aiActivity, applyEdgeChanges, applyNodeChanges, archiveCopilotWorkflow, authReady, billingData, billingError, billingPlansForUI, cancelDownload, cancelRender, chatHistory, chatMessage, chatMode, connectBusy, connectFromWorkflowId, connectivityData, connectivityError, connectivityLoading, connectivityServices, copilotWorkflows, copilotWorkflowsLoading, copyHistoryFromWorkflow, createCopilotWorkflow, createProject, creditEntries, creditsError, creditsInfo, currentPlan, currentPlanError, deleteProject, downloads, edges, exportJobs, formatBytes, formatConnectivityStatus, formatCurrency, formatCurrencyLabel, formatStatusLabel, handleDownload, handleMagicWandSelect, handleManageSubscription, handlePurchaseIntentSubmit, handleSendSuggestion, handleSubscribe, handleTransferSubmit, hasToken, importContextFromWorkflow, isGenerating, isStreaming, lastPurchaseIntent, lastTransferReceipt, lastWalletUpdate, livePreviewSuggestions, mergeFromWorkflow, miniPreviewExpanded, newProjectName, newProjectType, nodes, projects, purchaseForm, receivableSummary, refreshConnectivity, refreshWallet, renameCopilotWorkflow, renderJobs, sendChatMessage, setChatMessage, setChatMode, setConnectFromWorkflowId, setEdges, setMiniPreviewExpanded, setNewProjectName, setNewProjectType, setNodes, setPurchaseForm, setShowToast, setTransferForm, showToast, showToastMessage, subscribeError, subscribeMessage, switchCopilotWorkflow, transferForm, useCases, walletActionError, walletActionMessage, walletData, walletError, walletLoading, walletSubmitting, walletTransactions, workflowTemplates } = props
  return (
    <>
          {activeTab === 'download' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-text-center">
                <h2 className="aethel-text-3xl aethel-font-bold aethel-mb-4">Baixar Aethel IDE</h2>
                <p className="aethel-text-lg aethel-text-slate-400 aethel-max-w-2xl aethel-mx-auto">
                  Experimente todo o poder do Aethel com a nossa IDE local. Inclui integração com IA,
                  ferramentas avançadas de código e conectividade total com o backend.
                  <br /><br />
                  <strong>Gratuito para uso pessoal • Recursos profissionais disponíveis</strong>
                </p>
              </div>

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-8 aethel-max-w-6xl aethel-mx-auto">
                <div className="aethel-card aethel-p-6">
                  <div className="aethel-text-center aethel-mb-6">
                    <div className="aethel-w-16 aethel-h-16 aethel-bg-gradient-to-r aethel-from-blue-500 aethel-to-cyan-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-4">
                    <svg className="w-8 h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    </div>
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">Instalador Windows</h3>
                    <p className="aethel-text-slate-400">Instalação completa para Windows 10/11</p>
                  </div>
                  <div className="aethel-space-y-3">
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Tamanho:</span>
                    <span>~250 MB</span>
                    </div>
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Versão:</span>
                    <span>v2.1.0</span>
                    </div>
                    <button
                      onClick={() => handleDownload('windows')}
                      className="aethel-button aethel-button-primary aethel-w-full aethel-mt-4"
                    >
                    Baixar para Windows
                    </button>
                  </div>
                </div>

                <div className="aethel-card aethel-p-6">
                  <div className="aethel-text-center aethel-mb-6">
                    <div className="aethel-w-16 aethel-h-16 aethel-bg-gradient-to-r aethel-from-blue-500 aethel-to-cyan-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-4">
                    <svg className="w-8 h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    </div>
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">Instalador macOS</h3>
                    <p className="aethel-text-slate-400">App nativo para macOS 11+</p>
                  </div>
                  <div className="aethel-space-y-3">
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Tamanho:</span>
                    <span>~220 MB</span>
                    </div>
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Versão:</span>
                    <span>v2.1.0</span>
                    </div>
                    <button
                      onClick={() => handleDownload('mac')}
                      className="aethel-button aethel-button-primary aethel-w-full aethel-mt-4"
                    >
                    🍎 Baixar para macOS
                    </button>
                  </div>
                </div>

                <div className="aethel-card aethel-p-6">
                  <div className="aethel-text-center aethel-mb-6">
                    <div className="aethel-w-16 aethel-h-16 aethel-bg-gradient-to-r aethel-from-orange-500 aethel-to-red-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-4">
                    <svg className="w-8 h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    </div>
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">Instalador Linux</h3>
                    <p className="aethel-text-slate-400">Pacote Linux universal</p>
                  </div>
                  <div className="aethel-space-y-3">
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Tamanho:</span>
                    <span>~200 MB</span>
                    </div>
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Versão:</span>
                    <span>v2.1.0</span>
                    </div>
                    <button
                      onClick={() => handleDownload('linux')}
                      className="aethel-button aethel-button-primary aethel-w-full aethel-mt-4"
                    >
                    🐧 Baixar para Linux
                    </button>
                  </div>
                </div>

                <div className="aethel-card aethel-p-6">
                  <div className="aethel-text-center aethel-mb-6">
                    <div className="aethel-w-16 aethel-h-16 aethel-bg-gradient-to-r aethel-from-green-500 aethel-to-teal-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-4">
                    <svg className="w-8 h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    </div>
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">Requisitos do sistema</h3>
                    <p className="aethel-text-slate-400">Compatibilidade multiplataforma</p>
                  </div>
                  <div className="aethel-space-y-4">
                    <div className="aethel-border-b aethel-border-slate-700 aethel-pb-3">
                      <h4 className="aethel-text-sm aethel-font-medium aethel-text-slate-300 aethel-mb-2">Todas as plataformas</h4>
                      <ul className="aethel-space-y-1 aethel-text-sm">
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <svg className="w-4 h-4 aethel-text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Mínimo de 8GB RAM
                        </li>
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <svg className="w-4 h-4 aethel-text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        2GB de espaço livre
                        </li>
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <svg className="w-4 h-4 aethel-text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Conexão com a internet para recursos de IA
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="aethel-text-sm aethel-font-medium aethel-text-slate-300 aethel-mb-2">Específico por plataforma</h4>
                      <ul className="aethel-space-y-1 aethel-text-sm">
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <span className="aethel-text-slate-400">Windows:</span>
                        <span>10/11 (64-bit)</span>
                        </li>
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <span className="aethel-text-slate-400">macOS:</span>
                        <span>11.0+ (Intel/Apple Silicon)</span>
                        </li>
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <span className="aethel-text-slate-400">Linux:</span>
                        <span>Ubuntu 18.04+ / CentOS 7+</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="aethel-space-y-6">
                <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
                  <div className="aethel-card aethel-p-6">
                    <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-4">
                      <h3 className="aethel-text-lg aethel-font-semibold">Downloads em andamento</h3>
                      <span className="aethel-text-xs aethel-text-slate-400">{downloads.length} ativos</span>
                    </div>
                    {downloads.length === 0 ? (
                      <p className="aethel-text-sm aethel-text-slate-500">Nenhum download ativo no momento.</p>
                    ) : (
                      <div className="aethel-space-y-4">
                        {downloads.map(download => (
                          <div key={download.id} className="aethel-rounded-lg aethel-bg-slate-900/60 aethel-p-4">
                            <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-2">
                              <div className="aethel-flex aethel-flex-col">
                                <span className="aethel-text-sm aethel-font-medium aethel-text-white">
                                  {download.filename || download.url}
                                </span>
                                <span className="aethel-text-xs aethel-text-slate-400">
                                  {formatBytes(download.downloaded)} / {formatBytes(download.total)}
                                </span>
                              </div>
                              <div className="aethel-flex aethel-items-center aethel-gap-3">
                                <span className="aethel-text-xs aethel-text-slate-400">{download.status}</span>
                                {download.status === 'downloading' && (
                                  <button
                                    onClick={() => cancelDownload(download.id)}
                                    className="aethel-button aethel-button-ghost aethel-text-xs"
                                  >
                                    Cancelar
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="aethel-h-2 aethel-bg-slate-800 aethel-rounded-full">
                              <div
                                className="aethel-h-2 aethel-rounded-full aethel-bg-blue-500"
                                style={{ width: `${Math.min(100, Math.max(0, download.progress))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="aethel-card aethel-p-6">
                    <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-4">
                      <h3 className="aethel-text-lg aethel-font-semibold">Exportações</h3>
                      <span className="aethel-text-xs aethel-text-slate-400">{exportJobs.length} jobs</span>
                    </div>
                    {exportJobs.length === 0 ? (
                      <p className="aethel-text-sm aethel-text-slate-500">Nenhum job de exportação ativo.</p>
                    ) : (
                      <div className="aethel-space-y-4">
                        {exportJobs.map(job => (
                          <div key={job.id} className="aethel-rounded-lg aethel-bg-slate-900/60 aethel-p-4">
                            <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-2">
                              <div>
                                <div className="aethel-text-sm aethel-font-medium aethel-text-white">{job.type}</div>
                                <div className="aethel-text-xs aethel-text-slate-400">
                                  {new Date(job.createdAt).toLocaleTimeString()}
                                </div>
                              </div>
                              <span className="aethel-text-xs aethel-text-slate-400">{job.status}</span>
                            </div>
                            <div className="aethel-h-2 aethel-bg-slate-800 aethel-rounded-full">
                              <div
                                className="aethel-h-2 aethel-rounded-full aethel-bg-emerald-500"
                                style={{ width: `${Math.min(100, Math.max(0, job.progress ?? 0))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-3">Fila de renderização</h3>
                  <RenderQueue jobs={renderJobs} onCancel={cancelRender} />
                </div>
              </div>

              <div className="aethel-text-center aethel-mt-8">
                <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-6 aethel-max-w-2xl aethel-mx-auto">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-3">Início rápido</h3>
                  <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 aethel-gap-4 aethel-text-sm">
                    <div className="aethel-text-center">
                    <div className="aethel-w-8 aethel-h-8 aethel-bg-blue-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-2 aethel-text-white aethel-font-bold">1</div>
                    Baixar e instalar
                    </div>
                    <div className="aethel-text-center">
                    <div className="aethel-w-8 aethel-h-8 aethel-bg-blue-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-2 aethel-text-white aethel-font-bold">2</div>
                    Conectar ao backend
                    </div>
                    <div className="aethel-text-center">
                    <div className="aethel-w-8 aethel-h-8 aethel-bg-blue-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-2 aethel-text-white aethel-font-bold">3</div>
                    Começar a criar
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-text-center">
                <h2 className="aethel-text-3xl aethel-font-bold aethel-mb-4">Modelos de workflow</h2>
                <p className="aethel-text-lg aethel-text-slate-400 aethel-max-w-2xl aethel-mx-auto">
                  Acelere seus projetos com modelos de workflow prontos. Arraste e solte para personalizar seus pipelines com IA.
                </p>
              </div>

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-6">
                {workflowTemplates.map(template => {
                  const category = String(template.category || '').toLowerCase()
                  const categoryClass =
                    category.includes('desenvolvimento') || category.includes('development')
                      ? 'aethel-bg-blue-500/20 aethel-text-blue-400'
                      : category.includes('ciência') || category.includes('data')
                      ? 'aethel-bg-green-500/20 aethel-text-green-400'
                      : category.includes('criativo') || category.includes('creative')
                      ? 'aethel-bg-cyan-500/20 aethel-text-cyan-400'
                      : 'aethel-bg-orange-500/20 aethel-text-orange-400'

                  return (
                  <div key={template.id} className="aethel-card aethel-p-6 hover:aethel-shadow-xl aethel-transition aethel-cursor-pointer group">
                    <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-4">
                      <div className={`aethel-w-12 aethel-h-12 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center ${categoryClass}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="aethel-text-xs aethel-px-2 aethel-py-1 aethel-rounded-full aethel-bg-slate-700 aethel-text-slate-300">
                        {template.category}
                      </span>
                    </div>
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2 group-hover:aethel-text-blue-400 aethel-transition">
                      {template.name}
                    </h3>
                    <p className="aethel-text-slate-400 aethel-text-sm aethel-mb-4">
                      {template.description}
                    </p>
                    <button className="aethel-button aethel-button-primary aethel-w-full group-hover:aethel-bg-blue-600 aethel-transition">
                      Usar template
                    </button>
                  </div>
                )})}
              </div>
            </div>
          )}

          {activeTab === 'use-cases' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-text-center">
                <h2 className="aethel-text-3xl aethel-font-bold aethel-mb-4">Casos de uso da comunidade</h2>
                <p className="aethel-text-lg aethel-text-slate-400 aethel-max-w-2xl aethel-mx-auto">
                  Veja como a comunidade Aethel está criando coisas incríveis. Inspire-se e compartilhe suas criações.
                </p>
              </div>

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-6">
                {useCases.map(useCase => (
                  <div key={useCase.id} className="aethel-card aethel-p-6 hover:aethel-shadow-xl aethel-transition aethel-cursor-pointer group">
                    {useCase.preview && (
                      <div className="aethel-w-full aethel-h-32 aethel-bg-slate-700 aethel-rounded-lg aethel-mb-4 aethel-flex aethel-items-center aethel-justify-center">
                        <svg className="w-8 h-8 aethel-text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-2">
                      <span className="aethel-text-xs aethel-px-2 aethel-py-1 aethel-rounded-full aethel-bg-blue-500/20 aethel-text-blue-400">
                        {useCase.category}
                      </span>
                      <div className="aethel-flex aethel-items-center aethel-gap-3 aethel-text-xs aethel-text-slate-400">
                        <span className="aethel-flex aethel-items-center aethel-gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {useCase.views}
                        </span>
                        <span className="aethel-flex aethel-items-center aethel-gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                          </svg>
                          {useCase.likes}
                        </span>
                      </div>
                    </div>
                    <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2 group-hover:aethel-text-blue-400 aethel-transition">
                      {useCase.title}
                    </h3>
                    <p className="aethel-text-slate-400 aethel-text-sm aethel-mb-3">
                      {useCase.description}
                    </p>
                    <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-3">
                      <span className="aethel-text-xs aethel-text-slate-500">por {useCase.sharedBy}</span>
                      <div className="aethel-flex aethel-gap-1">
                        {useCase.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="aethel-text-xs aethel-px-2 aethel-py-1 aethel-rounded aethel-bg-slate-700 aethel-text-slate-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="aethel-button aethel-button-secondary aethel-w-full group-hover:aethel-bg-slate-600 aethel-transition">
                      Ver estudo de caso
                    </button>
                  </div>
                ))}
              </div>

              <div className="aethel-text-center aethel-mt-8">
                <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-6 aethel-max-w-2xl aethel-mx-auto">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Compartilhe seu sucesso</h3>
                  <p className="aethel-text-slate-400 aethel-mb-4">
                    Criou algo incrível com Aethel? Compartilhe seu caso de uso com a comunidade e inspire outras pessoas!
                  </p>
                  <button className="aethel-button aethel-button-primary">Compartilhar caso de uso</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <AdminPanel />
          )}

          {/* Toast Notifications */}
          {showToast && (
            <div className={`fixed bottom-4 right-4 z-50 aethel-flex aethel-items-center aethel-gap-3 aethel-px-4 aethel-py-3 aethel-rounded-lg aethel-shadow-lg aethel-transition aethel-max-w-sm ${
              showToast.type === 'success' ? 'aethel-bg-green-500/20 aethel-border aethel-border-green-500/30 aethel-text-green-400' :
              showToast.type === 'error' ? 'aethel-bg-red-500/20 aethel-border aethel-border-red-500/30 aethel-text-red-400' :
              'aethel-bg-blue-500/20 aethel-border aethel-border-blue-500/30 aethel-text-blue-400'
            }`}>
              <div className={`aethel-w-5 aethel-h-5 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center ${
                showToast.type === 'success' ? 'aethel-bg-green-500' :
                showToast.type === 'error' ? 'aethel-bg-red-500' :
                'aethel-bg-blue-500'
              }`}>
                {showToast.type === 'success' ? (
                  <svg className="w-3 h-3 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : showToast.type === 'error' ? (
                  <svg className="w-3 h-3 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <span className="aethel-text-sm aethel-font-medium">{showToast.message}</span>
              <button
                onClick={() => setShowToast(null)}
                className="aethel-ml-auto aethel-hover:opacity-70 aethel-transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
    </>
  )
}
