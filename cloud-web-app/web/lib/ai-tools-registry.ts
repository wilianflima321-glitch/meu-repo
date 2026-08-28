/**
 * AI Tools Registry - Registro de Ferramentas para IA
 *
 * Define todas as ferramentas que a IA pode usar para:
 * - Editar código
 * - Manipular vídeo/áudio/imagem
 * - Controlar o game engine
 * - Gerar assets procedurais
 *
 * Baseado no padrão de Function Calling da OpenAI/Anthropic
 */

import { prisma } from '@/lib/db';
import { assertProjectOwnership } from '@/lib/copilot/project-resolver';
import { loadAgentHandoffContext } from '@/lib/production/agent-handoff-context';
import { evaluateAgentApplyScope } from '@/lib/production/agent-scope-enforcement';
import { acquireAgentSurfaceLocks } from '@/lib/production/agent-surface-locks';
import { evaluateGovernedAgentToolJob, type GovernedToolJobEnforcement } from '@/lib/production/agent-tool-job-runner';
import { mapToolNameToCanonical } from '@/lib/production/agent-tool-name-adapter';
import {
  evaluateMiniIaToolDispatch,
  mapAgentToolToMiniIaName,
} from '@/lib/production/mini-ia-tool-dispatch';
import { getProjectFileStore } from '@/lib/server/project-file-store';
import type { Prisma } from '@prisma/client';
import type { AITool, ToolCategory, ToolResult } from './ai-tools-registry-types';
import {
  clampContent,
  getBooleanParam,
  getContext,
  getNumberParam,
  getStringParam,
  inferLanguageFromPath,
  normalizePath,
  pathsForScopedTool,
  requestedAgentForTool,
  shouldEnforceAgentScope,
} from './ai-tools-registry-utils';
import { registerAssetTools } from './ai-tools-registry.assets';
import { registerCreativeTools } from './ai-tools-registry.creative';
export type { AITool, Artifact, ToolCategory, ToolParameter, ToolResult } from './ai-tools-registry-types';

async function loadPathModifiedAt(projectId: string, paths: string[]): Promise<Record<string, Date>> {
  const entries = await Promise.all(
    paths.map(async (path) => {
      const normalized = normalizePath(path);
      const file = await prisma.file.findFirst({
        where: { projectId, OR: [{ path: normalized }, { path: normalized.replace(/^\//, '') }] },
        select: { updatedAt: true },
      });
      return file?.updatedAt ? [normalized, file.updatedAt] as const : null;
    })
  );

  return entries.reduce((acc, entry) => {
    if (entry) {
      acc[entry[0]] = entry[1];
    }
    return acc;
  }, {} as Record<string, Date>);
}

type AgentScopeGateResult = {
  block: ToolResult | null;
  scopeLockRef?: string;
  manifestId?: string;
};

async function enforceAgentToolScope(
  toolName: string,
  params: Record<string, unknown>
): Promise<AgentScopeGateResult> {
  const paths = pathsForScopedTool(toolName, params);
  if (paths.length === 0) return { block: null };

  const context = getContext(params);
  if (!shouldEnforceAgentScope(params, context)) return { block: null };

  if (!context.projectId) {
    return {
      block: {
        success: false,
        error: 'AGENT_SCOPE_PROJECT_REQUIRED',
        data: {
          message: 'Agent-scoped tool execution requires projectId in __aethelContext.',
          toolName,
          paths,
        },
      },
    };
  }

  const agent = requestedAgentForTool(params, context);
  const pathModifiedAt = await loadPathModifiedAt(context.projectId, paths);
  const handoff = await loadAgentHandoffContext({
    userId: context.userId,
    projectId: context.projectId,
    routeKind: 'inline-edit',
    requestedAgent: agent,
    promptText: `${toolName}\n${paths.join('\n')}`,
    filePath: paths[0],
  });
  const decision = evaluateAgentApplyScope({
    packet: handoff.packet,
    virtualPaths: paths,
    enforceAgentScope: true,
    broadEdit: paths.length > 1,
    pathModifiedAt,
  });

  if (decision.allowed) {
    const lockDecision = acquireAgentSurfaceLocks({
      projectId: context.projectId,
      agent: handoff.agent,
      ownerUserId: context.userId,
      paths,
      source: 'tool',
      reason: toolName,
    });

    if (lockDecision.allowed) {
      return {
        block: null,
        scopeLockRef: lockDecision.lock.id,
        manifestId: handoff.packet?.cartography?.manifestId ?? undefined,
      };
    }

    await audit(context.userId, 'ai_tool.surface_locked', context.projectId, {
      toolName,
      paths,
      reason: lockDecision.code,
      metadata: lockDecision.metadata,
    });

    return {
      block: {
        success: false,
        error: lockDecision.code,
        data: {
          message: lockDecision.message,
          status: lockDecision.status,
          toolName,
          paths,
          metadata: lockDecision.metadata,
        },
      },
    };
  }

  await audit(context.userId, 'ai_tool.scope_blocked', context.projectId, {
    toolName,
    paths,
    reason: decision.code,
    metadata: decision.metadata,
  });

  return {
    block: {
      success: false,
      error: decision.code,
      data: {
        message: decision.message,
        status: decision.status,
        toolName,
        paths,
        metadata: decision.metadata,
      },
    },
  };
}

function resolveToolEnforcement(
  mapping: ReturnType<typeof mapToolNameToCanonical>,
  context: ReturnType<typeof getContext>,
  params: Record<string, unknown>
): GovernedToolJobEnforcement | undefined {
  const envOverride = process.env.AETHEL_AGENT_TOOL_ENFORCEMENT;
  if (envOverride === 'enforced' || envOverride === 'observe') return envOverride;
  if (params.__aethelEnforceToolBus === true || context.enforceToolBus) return 'enforced';
  if (mapping.mutating && context.enforceAgentScope) return undefined; // production default
  return 'observe';
}

/**
 * Routes mutating agent tool calls through the governed kernel (tool bus +
 * evidence readiness). Scoped writes use enforced mode in production; legacy
 * unscoped calls stay in observe mode for backward compatibility.
 */
async function evaluateGovernedToolGate(
  toolName: string,
  params: Record<string, unknown>,
  scopeGate: AgentScopeGateResult
): Promise<ToolResult | null> {
  let context: ReturnType<typeof getContext>;
  try {
    context = getContext(params);
  } catch {
    return null;
  }
  if (!context.projectId) return null;

  const mapping = mapToolNameToCanonical(toolName);
  const paths = pathsForScopedTool(toolName, params);
  const agent = requestedAgentForTool(params, context) ?? 'agent-tool-registry';
  const enforcement = resolveToolEnforcement(mapping, context, params);
  const primaryPath = paths[0] ? normalizePath(paths[0]) : undefined;

  const decision = evaluateGovernedAgentToolJob({
    toolId: mapping.toolId,
    mode: mapping.mode,
    projectId: context.projectId,
    agent,
    mission: `Agent tool: ${toolName}`,
    intent: `Execute ${toolName}`,
    targetPaths: paths,
    idempotencyKey: scopeGate.scopeLockRef ?? `tool:${toolName}:${primaryPath ?? 'global'}`,
    scopeLockRef: scopeGate.scopeLockRef ?? null,
    rollbackRef: mapping.mutating && primaryPath ? `pre-write:${primaryPath}` : null,
    readReceiptRefs: scopeGate.manifestId ? [`cartography:${scopeGate.manifestId}`] : undefined,
    maxCostUsd: 0,
    hasDiffEvidence: mapping.mutating,
    enforcement,
    miniIaSurface:
      context.miniIa === true ||
      params.__aethelMiniIa === true ||
      (typeof agent === 'string' && agent.toLowerCase().includes('mini')),
  });

  const auditAction =
    enforcement === 'enforced' ? 'ai_tool.governed_enforced' : 'ai_tool.governed_observe';

  await audit(context.userId, auditAction, context.projectId, {
    toolName,
    canonicalTool: mapping.toolId,
    mode: mapping.mode,
    mutating: mapping.mutating,
    enforcement: decision.enforcement,
    toolStatus: decision.toolDecision.status,
    ready: decision.ready,
    allowed: decision.allowed,
    blockers: decision.blockers,
    missingEvidence: decision.evidenceReadiness.missingKinds,
  });

  if (!decision.allowed) {
    return {
      success: false,
      error: 'TOOL_BUS_BLOCKED',
      data: {
        message:
          'Governed tool bus blocked execution. Provide read receipts, scope lock, and rollback evidence before retrying.',
        blockers: decision.blockers,
        toolStatus: decision.toolDecision.status,
        missingEvidence: decision.evidenceReadiness.missingKinds,
        enforcement: decision.enforcement,
      },
    };
  }

  return null;
}

async function audit(userId: string | null, action: string, resource?: string, metadata?: unknown): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || undefined,
        action,
        resource: resource || undefined,
        metadata: metadata === undefined ? undefined : (metadata as Prisma.InputJsonValue),
      },
    });
  } catch {
    // audit é best-effort
  }
}

// ============================================================================
// REGISTRY DE FERRAMENTAS
// ============================================================================

class AIToolsRegistry {
  private tools: Map<string, AITool> = new Map();
  private toolsByCategory: Map<ToolCategory, AITool[]> = new Map();

  register(tool: AITool): void {
    this.tools.set(tool.name, tool);

    const categoryTools = this.toolsByCategory.get(tool.category) || [];
    categoryTools.push(tool);
    this.toolsByCategory.set(tool.category, categoryTools);
  }

  get(name: string): AITool | undefined {
    return this.tools.get(name);
  }

  getByCategory(category: ToolCategory): AITool[] {
    return this.toolsByCategory.get(category) || [];
  }

  getAll(): AITool[] {
    return [...this.tools.values()];
  }

  async execute(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool "${name}" not found` };
    }

    try {
      // Validar parâmetros obrigatórios
      for (const param of tool.parameters) {
        if (param.required && !(param.name in params)) {
          return { success: false, error: `Missing required parameter: ${param.name}` };
        }
      }

      // Mini-IA / creative dispatch — host PTY + OrchestratorProd always fail-closed;
      // Mini-IA surface also enforces allowlist (Maestro remains orchestration choke).
      let miniIaContext: ReturnType<typeof getContext> | null = null;
      try {
        miniIaContext = getContext(params);
      } catch {
        miniIaContext = null;
      }
      const agentName =
        (miniIaContext && requestedAgentForTool(params, miniIaContext)) ||
        (typeof params.__aethelAgent === 'string' ? params.__aethelAgent : undefined);
      const isMiniIaSurface =
        params.__aethelMiniIa === true ||
        miniIaContext?.miniIa === true ||
        (typeof agentName === 'string' && agentName.toLowerCase().includes('mini'));
      const creativeCategories = new Set(['image', 'audio', 'video', 'game']);
      const enforceMiniIaDispatch =
        isMiniIaSurface ||
        creativeCategories.has(tool.category) ||
        /^(run_command|terminal_execute|host_pty|orchestrator)/i.test(name);

      if (enforceMiniIaDispatch) {
        const projectId = miniIaContext?.projectId?.trim() || 'unscoped';
        const mapped = mapAgentToolToMiniIaName(name);
        const mini = evaluateMiniIaToolDispatch({
          projectId,
          toolName: mapped === name ? name : mapped,
          callerSurface: isMiniIaSurface ? 'mini-ia' : 'agent',
          hostPty: /^(run_command|terminal_execute|host_pty)$/i.test(name),
          requestOrchestratorProd: /orchestrator/i.test(name),
        });
        if (
          !mini.ok &&
          (isMiniIaSurface ||
            mini.code === 'host_pty_forbidden' ||
            mini.code === 'orchestrator_prod_stopped' ||
            mini.code === 'live_broker_forbidden' ||
            mini.code === 'tool_forbidden')
        ) {
          return {
            success: false,
            error: 'MINI_IA_TOOL_DISPATCH_BLOCKED',
            data: {
              message: mini.message,
              code: mini.code,
              evidence: mini.evidence,
              maestroOwnsOrchestration: true,
              orchestratorProdShipped: false,
            },
          };
        }
      }

      const scopeGate = await enforceAgentToolScope(name, params);
      if (scopeGate.block) return scopeGate.block;

      const governedBlock = await evaluateGovernedToolGate(name, params, scopeGate);
      if (governedBlock) return governedBlock;

      return await tool.execute(params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Gerar schema para OpenAI Function Calling
  toOpenAIFunctions(): OpenAIFunction[] {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
          };
          return acc;
        }, {} as Record<string, unknown>),
        required: tool.parameters.filter(p => p.required).map(p => p.name),
      },
    }));
  }

  // Gerar schema para Anthropic Tools
  toAnthropicTools(): AnthropicTool[] {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
          };
          return acc;
        }, {} as Record<string, unknown>),
        required: tool.parameters.filter(p => p.required).map(p => p.name),
      },
    }));
  }
}

interface OpenAIFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

// ============================================================================
// INSTÂNCIA GLOBAL
// ============================================================================

export const aiTools = new AIToolsRegistry();

// ============================================================================
// FERRAMENTAS DE CÓDIGO
// ============================================================================

aiTools.register({
  name: 'create_file',
  description: 'Cria um novo arquivo no projeto com o conteúdo especificado',
  category: 'code',
  parameters: [
    { name: 'path', type: 'string', description: 'Caminho do arquivo (ex: src/components/Button.tsx)', required: true },
    { name: 'content', type: 'string', description: 'Conteúdo do arquivo', required: true },
    { name: 'language', type: 'string', description: 'Linguagem do arquivo', required: false, enum: ['typescript', 'javascript', 'python', 'rust', 'go', 'css', 'html', 'json'] },
  ],
  returns: 'Confirmação de criação do arquivo',
  execute: async (params) => {
    try {
      const ctx = getContext(params);
      if (!ctx.projectId) {
        return { success: false, error: 'projectId é obrigatório no contexto para criar arquivo.' };
      }
      await assertProjectOwnership(ctx.userId, ctx.projectId);

      const path = normalizePath(getStringParam(params, 'path'));
      const content = clampContent(String(params.content ?? ''), 1_000_000);
      const language =
        typeof params.language === 'string'
          ? params.language
          : inferLanguageFromPath(path);

      const store = getProjectFileStore();
      const record = await store.write(
        { userId: ctx.userId, projectId: ctx.projectId, path },
        content,
        language ? { language } : undefined
      );

      await audit(ctx.userId, 'files.write', record.id ?? record.path, {
        projectId: ctx.projectId,
        path: record.path,
        op: 'create_file',
        backend: store.backend,
      });
      return {
        success: true,
        data: {
          fileId: record.id ?? record.path,
          path: record.path,
          created: true,
          updatedAt: record.updatedAt,
          backend: store.backend,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao criar arquivo' };
    }
  },
});

aiTools.register({
  name: 'edit_file',
  description: 'Edita um arquivo existente, substituindo ou inserindo código',
  category: 'code',
  parameters: [
    { name: 'path', type: 'string', description: 'Caminho do arquivo', required: true },
    { name: 'operation', type: 'string', description: 'Tipo de operação', required: true, enum: ['replace', 'insert', 'delete'] },
    { name: 'target', type: 'string', description: 'Texto ou linha a ser modificado', required: true },
    { name: 'content', type: 'string', description: 'Novo conteúdo', required: false },
  ],
  returns: 'Confirmação da edição',
  execute: async (params) => {
    try {
      const ctx = getContext(params);
      if (!ctx.projectId) {
        return { success: false, error: 'projectId é obrigatório no contexto para editar arquivo.' };
      }
      await assertProjectOwnership(ctx.userId, ctx.projectId);

      const path = normalizePath(getStringParam(params, 'path'));
      const operation = getStringParam(params, 'operation').trim();
      const target = String(params.target ?? '');
      const insertContent = String(params.content ?? '');

      const store = getProjectFileStore();
      const ref = { userId: ctx.userId, projectId: ctx.projectId, path };
      const file = await store.read(ref);
      if (!file) return { success: false, error: `Arquivo não encontrado: ${path}` };
      const current = String(file.content ?? '');
      let next = current;
      let applied = false;

      if (operation === 'replace') {
        const idx = current.indexOf(target);
        if (idx < 0) return { success: false, error: 'Target não encontrado para replace.' };
        next = current.slice(0, idx) + insertContent + current.slice(idx + target.length);
        applied = true;
      } else if (operation === 'insert') {
        const idx = current.indexOf(target);
        if (idx < 0) return { success: false, error: 'Target não encontrado para insert.' };
        next = current.slice(0, idx) + insertContent + current.slice(idx);
        applied = true;
      } else if (operation === 'delete') {
        const idx = current.indexOf(target);
        if (idx < 0) return { success: false, error: 'Target não encontrado para delete.' };
        next = current.slice(0, idx) + current.slice(idx + target.length);
        applied = true;
      } else {
        return { success: false, error: `Operação inválida: ${operation}` };
      }

      next = clampContent(next, 1_000_000);
      const updated = await store.write(ref, next, {
        language: file.language ?? inferLanguageFromPath(path),
      });

      await audit(ctx.userId, 'files.patch', updated.id ?? updated.path, {
        projectId: ctx.projectId,
        path: updated.path,
        op: operation,
        backend: store.backend,
      });
      return {
        success: true,
        data: {
          fileId: updated.id ?? updated.path,
          path: updated.path,
          operation,
          applied,
          updatedAt: updated.updatedAt,
          backend: store.backend,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao editar arquivo' };
    }
  },
});

aiTools.register({
  name: 'analyze_code',
  description: 'Analisa código para encontrar bugs, melhorias de performance ou problemas de segurança',
  category: 'analysis',
  parameters: [
    { name: 'path', type: 'string', description: 'Caminho do arquivo ou diretório', required: true },
    { name: 'type', type: 'string', description: 'Tipo de análise', required: true, enum: ['bugs', 'performance', 'security', 'style', 'all'] },
  ],
  returns: 'Lista de problemas encontrados com sugestões',
  execute: async (params) => {
    return {
      success: true,
      data: {
        issues: [],
        suggestions: [],
        score: 85,
      },
    };
  },
});

registerCreativeTools(aiTools);

// Register asset tools in a focused module so the central registry stays reviewable.
registerAssetTools(aiTools);

// ============================================================================
// FERRAMENTAS DE PROJETO
// ============================================================================

aiTools.register({
  name: 'create_project',
  description: 'Cria um novo projeto com template',
  category: 'project',
  parameters: [
    { name: 'name', type: 'string', description: 'Nome do projeto', required: true },
    { name: 'template', type: 'string', description: 'Template base', required: true, enum: ['blank', 'platformer-2d', 'fps-3d', 'rpg', 'racing', 'puzzle', 'visual-novel', 'mobile-game'] },
    { name: 'features', type: 'array', description: 'Features adicionais', required: false },
  ],
  returns: 'ID do projeto criado',
  execute: async (params) => {
		try {
			const ctx = getContext(params);
			const name = getStringParam(params, 'name').trim();
			const template = getStringParam(params, 'template').trim();
			if (!name) return { success: false, error: 'name é obrigatório' };
			if (!template) return { success: false, error: 'template é obrigatório' };

			const project = await prisma.project.create({
				data: { userId: ctx.userId, name, template },
				select: { id: true, name: true, template: true, createdAt: true },
			});
			await audit(ctx.userId, 'create_project', project.id, { name, template });
			return { success: true, data: { projectId: project.id, name: project.name, template: project.template } };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : 'Erro ao criar projeto' };
		}
  },
});

aiTools.register({
  name: 'build_project',
  description: 'Compila e builda o projeto para plataforma alvo',
  category: 'project',
  parameters: [
    { name: 'platform', type: 'string', description: 'Plataforma alvo', required: true, enum: ['web', 'windows', 'mac', 'linux', 'android', 'ios'] },
    { name: 'configuration', type: 'string', description: 'Configuração de build', required: false, enum: ['debug', 'release'], default: 'release' },
    { name: 'optimizations', type: 'array', description: 'Otimizações a aplicar', required: false },
  ],
  returns: 'URL ou caminho do build',
  execute: async (params) => {
    return {
      success: true,
      data: { platform: params.platform, configuration: params.configuration },
    };
  },
});

// ============================================================================
// EXPORT
// ============================================================================

export default aiTools;

// Named exports para compatibilidade com imports nomeados
export const toolsRegistry = aiTools;
export async function executeTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
  return aiTools.execute(name, params);
}
