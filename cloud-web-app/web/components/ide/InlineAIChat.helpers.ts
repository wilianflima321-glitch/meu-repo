import { Check, Code2, FileText, Sparkles, type LucideIcon } from 'lucide-react'

export interface InlineAIFileContext {
  path: string
  content: string
  language: string
}

export interface InlineAIProjectContext {
  name: string
  files: string[]
}

export interface InlineAIChatProps {
  activeFile?: InlineAIFileContext
  projectContext?: InlineAIProjectContext
  onApplyCode?: (code: string) => void
  onClose?: () => void
}

export interface InlineAIMessageCodeBlock {
  language: string
  code: string
}

export interface InlineAIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  codeBlocks?: InlineAIMessageCodeBlock[]
  isStreaming?: boolean
}

export interface SuggestionChip {
  id: string
  icon: LucideIcon
  label: string
  prompt: string
  operatorHint: string
}

export interface InlineAIContextSummary {
  statusLabel: string
  scopeLabel: string
  operatorLabel: string
  detailLabel: string
  canApplyDirectly: boolean
}

const FILE_SUGGESTIONS: SuggestionChip[] = [
  {
    id: 'explain-file',
    icon: Code2,
    label: 'Explicar arquivo',
    prompt: 'Pode explicar o que este codigo faz e quais partes exigem mais atencao?',
    operatorHint: 'Leitura guiada do arquivo atual',
  },
  {
    id: 'refactor-file',
    icon: Sparkles,
    label: 'Refatorar',
    prompt: 'Pode propor uma refatoracao segura para este arquivo, destacando o que mudaria primeiro?',
    operatorHint: 'Foco em clareza e separacao de responsabilidades',
  },
  {
    id: 'document-file',
    icon: FileText,
    label: 'Adicionar docs',
    prompt: 'Pode sugerir documentacao ou comentarios objetivos para este arquivo?',
    operatorHint: 'Prepara docs enxutas no contexto atual',
  },
  {
    id: 'review-file',
    icon: Check,
    label: 'Revisar riscos',
    prompt: 'Pode revisar este arquivo em busca de bugs, riscos de UX ou pontos de manutencao?',
    operatorHint: 'Checklist de riscos e regressao',
  },
]

const PROJECT_SUGGESTIONS: SuggestionChip[] = [
  {
    id: 'new-feature',
    icon: Sparkles,
    label: 'Planejar feature',
    prompt: 'Ajude-me a desenhar uma nova feature sem perder de vista os contratos atuais do projeto.',
    operatorHint: 'Planejamento guiado e incremental',
  },
  {
    id: 'review-project',
    icon: Code2,
    label: 'Ler arquitetura',
    prompt: 'Pode resumir a estrutura atual do projeto e sugerir por onde comecar esta tarefa?',
    operatorHint: 'Panorama do repositorio antes de editar',
  },
]

export function createInlineAIMessage(
  role: InlineAIMessage['role'],
  content: string,
  extras: Partial<Omit<InlineAIMessage, 'id' | 'role' | 'content' | 'timestamp'>> = {},
): InlineAIMessage {
  return {
    id: createMessageId(role),
    role,
    content,
    timestamp: new Date(),
    ...extras,
  }
}

export function buildWelcomeMessage(activeFile?: InlineAIFileContext): InlineAIMessage {
  return createInlineAIMessage(
    'system',
    activeFile
      ? `Estou acompanhando **${activeFile.path}**. Posso explicar, revisar riscos, montar um patch inicial ou preparar codigo para voce aplicar.`
      : 'Ola! Este espaco inline serve para operacoes rapidas: explicar, revisar, planejar mudancas e gerar blocos de codigo aplicaveis sem sair do fluxo.',
  )
}

export function buildContextShiftMessage(
  activeFile?: InlineAIFileContext,
  previousPath?: string,
): InlineAIMessage {
  if (activeFile && previousPath) {
    return createInlineAIMessage(
      'system',
      `Troquei o contexto ativo de **${previousPath}** para **${activeFile.path}**. Posso continuar a conversa no novo arquivo sem perder o foco operacional.`,
    )
  }

  if (activeFile) {
    return createInlineAIMessage(
      'system',
      `Novo contexto ativo: **${activeFile.path}** (${activeFile.language}). Posso operar neste arquivo e gerar codigo pronto para aplicar manualmente.`,
    )
  }

  return createInlineAIMessage(
    'system',
    previousPath
      ? `O arquivo **${previousPath}** saiu do foco. Agora sigo no nivel do projeto e das instrucoes gerais.`
      : 'Nenhum arquivo esta anexado no momento. Posso seguir em modo consulta de projeto.',
  )
}

export function buildSuggestionChips(activeFile?: InlineAIFileContext): SuggestionChip[] {
  return activeFile ? FILE_SUGGESTIONS : PROJECT_SUGGESTIONS
}

export function buildContextSummary(
  activeFile?: InlineAIFileContext,
  projectContext?: InlineAIProjectContext,
): InlineAIContextSummary {
  if (activeFile && projectContext) {
    return {
      statusLabel: 'Contexto pronto',
      scopeLabel: `${getInlineAIFileName(activeFile.path)} + ${projectContext.name}`,
      operatorLabel: `Vou priorizar o arquivo atual (${activeFile.language}) e puxar detalhes do projeto ${projectContext.name} apenas quando isso aumentar a confianca da resposta.`,
      detailLabel: 'Sugestoes rapidas apenas preenchem o composer. Nada entra no editor sem voce usar Aplicar.',
      canApplyDirectly: true,
    }
  }

  if (activeFile) {
    return {
      statusLabel: 'Arquivo anexado',
      scopeLabel: getInlineAIFileName(activeFile.path),
      operatorLabel: `Estou lendo ${activeFile.language} diretamente do arquivo atual, o que ajuda em revisao, explicacao e propostas de patch mais cirurgicas.`,
      detailLabel: 'Quando eu devolver codigo, o envio ao editor continua manual e explicito.',
      canApplyDirectly: true,
    }
  }

  if (projectContext) {
    return {
      statusLabel: 'Projeto anexado',
      scopeLabel: `${projectContext.name} · ${projectContext.files.length} arquivos`,
      operatorLabel: `Sem arquivo ativo, vou responder no nivel da arquitetura e do fluxo do projeto ${projectContext.name}.`,
      detailLabel: 'Abra um arquivo quando quiser trocar de consulta ampla para operacao localizada.',
      canApplyDirectly: false,
    }
  }

  return {
    statusLabel: 'Modo consulta',
    scopeLabel: 'Sem contexto anexado',
    operatorLabel: 'Posso ajudar com perguntas gerais, mas um arquivo aberto deixa as respostas bem mais operacionais.',
    detailLabel: 'Use as sugestoes rapidas para estruturar o pedido antes de enviar.',
    canApplyDirectly: false,
  }
}

export function getLoadingLabel(
  activeFile?: InlineAIFileContext,
  projectContext?: InlineAIProjectContext,
): string {
  if (activeFile) {
    return `Rascunhando uma resposta com contexto de ${getInlineAIFileName(activeFile.path)}.`
  }

  if (projectContext) {
    return `Rascunhando uma resposta com contexto do projeto ${projectContext.name}.`
  }

  return 'Rascunhando uma resposta geral.'
}

export function buildInlineAIRequestMessage(params: {
  prompt: string
  activeFile?: InlineAIFileContext
  projectContext?: InlineAIProjectContext
}): string {
  const sections: string[] = []
  const normalizedPrompt = params.prompt.trim()

  if (params.activeFile) {
    sections.push(
      [
        'INLINE_FILE_CONTEXT',
        `path: ${params.activeFile.path}`,
        `language: ${params.activeFile.language}`,
        'content:',
        params.activeFile.content.slice(0, 6000),
      ].join('\n'),
    )
  }

  if (params.projectContext) {
    sections.push(
      [
        'INLINE_PROJECT_CONTEXT',
        `project: ${params.projectContext.name}`,
        `knownFiles: ${params.projectContext.files.slice(0, 24).join(', ') || 'n/a'}`,
      ].join('\n'),
    )
  }

  sections.push(
    [
      'INLINE_OPERATOR_GOAL',
      normalizedPrompt,
      '',
      'Responda de forma operacional. Quando sugerir codigo, prefira blocos aplicaveis e explique rapidamente o alvo da mudanca.',
    ].join('\n'),
  )

  return sections.join('\n\n')
}

export function getInlineAIFileName(path: string): string {
  const segments = path.split(/[\\/]/)
  return segments[segments.length - 1] || path
}

export function extractCodeBlocks(content: string): InlineAIMessageCodeBlock[] {
  const blocks: InlineAIMessageCodeBlock[] = []
  const regex = /```([\w-]+)?\n([\s\S]*?)```/g
  let match: RegExpExecArray | null = regex.exec(content)

  while (match) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    })

    match = regex.exec(content)
  }

  return blocks
}

export function extractAdvancedResponseContent(raw: string): string {
  try {
    const data = JSON.parse(raw)
    return (
      data?.choices?.[0]?.message?.content ||
      data?.message?.content ||
      data?.content ||
      data?.output?.text ||
      raw
    )
  } catch {
    return raw
  }
}

export function stripCodeBlocks(content: string): string {
  return content.replace(/```[\w-]*\n[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

export function generateMockResponse(
  input: string,
  activeFile?: Pick<InlineAIFileContext, 'path' | 'language'>,
): string {
  const normalizedInput = input.toLowerCase()

  if (includesAny(normalizedInput, ['explicar', 'explain', 'entender', 'understand'])) {
    return [
      `Este pedido parece pedir uma leitura guiada de **${activeFile?.path ?? 'um trecho do projeto'}**.`,
      '',
      'O fluxo principal que eu seguiria e este:',
      '1. identificar entradas, estado e efeitos colaterais',
      '2. mapear onde a UI e a logica de operador se misturam',
      '3. destacar o que pode ser separado sem quebrar contratos',
      '',
      'Se voce quiser, o proximo passo pode ser uma refatoracao orientada a componentes ou um review focado em risco.',
    ].join('\n')
  }

  if (includesAny(normalizedInput, ['refator', 'refactor', 'limpar', 'cleanup'])) {
    return [
      'Aqui esta uma proposta de refatoracao inicial, priorizando responsabilidade unica e uma superficie mais clara para o operador:',
      '',
      '```typescript',
      'type InlineAISessionState = {',
      '  messages: InlineAIMessage[]',
      '  input: string',
      '  isLoading: boolean',
      '}',
      '',
      'export function useInlineAISession(activeFile?: InlineAIFileContext) {',
      '  const [state, setState] = useState<InlineAISessionState>({',
      '    messages: [buildWelcomeMessage(activeFile)],',
      "    input: '',",
      '    isLoading: false,',
      '  })',
      '',
      '  const queueResponse = (prompt: string) => {',
      '    // Separa o fluxo de mock/API da camada visual',
      '  }',
      '',
      '  return {',
      '    ...state,',
      '    queueResponse,',
      '  }',
      '}',
      '```',
      '',
      'A ideia e deixar estado, resposta simulada/API e componentes visuais em camadas distintas.',
    ].join('\n')
  }

  if (includesAny(normalizedInput, ['docs', 'documentacao', 'documentation', 'comentario', 'comentarios'])) {
    return [
      'Posso documentar a intencao operacional do fluxo com algo nessa linha:',
      '',
      '```typescript',
      '/**',
      ' * Mantem a conversa inline aderente ao arquivo ativo e devolve respostas',
      ' * que o operador pode revisar antes de aplicar qualquer codigo no editor.',
      ' */',
      'function enqueueInlineAIResponse(prompt: string) {',
      '  // chama a camada de resposta e preserva a UX do operador',
      '}',
      '```',
      '',
      'Se quiser, eu tambem posso sugerir comentarios pontuais em blocos de maior risco.',
    ].join('\n')
  }

  if (includesAny(normalizedInput, ['bug', 'bugs', 'erro', 'erros', 'falha', 'falhas', 'risk', 'risco'])) {
    return [
      'Os riscos mais provaveis aqui sao:',
      '',
      '- acoplamento entre estado do chat, renderer da mensagem e helpers de mock',
      '- affordances pouco explicitas sobre quando o contexto do arquivo esta anexado',
      '- respostas com bloco de codigo aparecendo misturadas ao texto corrido',
      '',
      'Posso transformar esse review em uma lista de correcoes priorizadas ou em um patch inicial.',
    ].join('\n')
  }

  const fileContext = activeFile
    ? `Estou acompanhando **${activeFile.path}** (${activeFile.language}).`
    : 'Estou em modo geral, sem um arquivo anexado.'

  return [
    `Entendi o pedido sobre "${input}". ${fileContext}`,
    '',
    'Posso seguir por tres caminhos:',
    '1. explicar o que ja existe',
    '2. propor uma refatoracao segura',
    '3. montar um bloco inicial de codigo para voce aplicar manualmente',
  ].join('\n')
}

function includesAny(content: string, candidates: string[]): boolean {
  return candidates.some((candidate) => content.includes(candidate))
}

function createMessageId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}
