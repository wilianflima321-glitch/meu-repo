# Guia de Integração Completo - AI IDE Platform

**Versão**: 2.0.0  
**Data**: 2024-12-09  
**Objetivo**: Integrar todos os componentes implementados

---

## 📋 Pré-requisitos

### 1. Verificar Implementações Existentes

Antes de integrar, confirme que os seguintes arquivos existem:

```bash
# Core components (já existentes)
cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/node/workspace-executor-service.ts
cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/observability-service.ts
cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/editor/editor-configuration.ts

# Novos components (implementados nesta sessão)
src/common/context/context-store.ts
src/common/llm/llm-router.ts
src/common/toolchains/toolchain-registry.ts
src/common/data/secure-fetch.ts
src/common/compliance/policy-engine.ts
src/common/observability/mission-telemetry.ts
src/browser/missions/mission-control.tsx
src/browser/missions/mission-control.css
```

### 2. Configurar Variáveis de Ambiente

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Feature flags
MISSION_CONTROL_ENABLED=false
LLM_ROUTER_ENABLED=false
POLICY_ENGINE_ENABLED=false
SECURE_FETCH_ENABLED=false
```

---

## 🔧 Passo 1: Registrar Components no InversifyJS

### Arquivo: `src/common/ai-ide-common-module.ts`

```typescript
import { ContainerModule } from 'inversify';
import { ContextStore } from './context/context-store';
import { LLMRouter } from './llm/llm-router';
import { ToolchainRegistry } from './toolchains/toolchain-registry';
import { PolicyEngine } from './compliance/policy-engine';
import { SecureFetch } from './data/secure-fetch';
import { MissionTelemetry } from './observability/mission-telemetry';

export default new ContainerModule(bind => {
  // Existing bindings
  bind(ObservabilityService).toSelf().inSingletonScope();
  
  // New bindings
  bind(ContextStore).toSelf().inSingletonScope();
  bind(LLMRouter).toSelf().inSingletonScope();
  bind(ToolchainRegistry).toSelf().inSingletonScope();
  bind(PolicyEngine).toSelf().inSingletonScope();
  bind(SecureFetch).toSelf().inSingletonScope();
  bind(MissionTelemetry).toSelf().inSingletonScope();
});
```

---

## 🎨 Passo 2: Registrar Mission Control Widget

### Arquivo: `src/browser/ai-ide-frontend-module.ts`

```typescript
import { ContainerModule } from 'inversify';
import { WidgetFactory } from '@theia/core/lib/browser';
import { MissionControlWidget } from './missions/mission-control';

// Import CSS
import '../../src/browser/missions/mission-control.css';

export default new ContainerModule(bind => {
  // Existing bindings
  bind(AIDockWidget).toSelf();
  
  // Mission Control
  bind(MissionControlWidget).toSelf();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: MissionControlWidget.ID,
    createWidget: () => ctx.container.get(MissionControlWidget)
  })).inSingletonScope();
});
```

---

## 🔌 Passo 3: Conectar LLM Router aos Agents

### Arquivo: `src/common/agents/base-agent.ts`

```typescript
import { inject, injectable } from 'inversify';
import { LLMRouter, RoutingRequest } from '../llm/llm-router';
import { PolicyEngine, PolicyContext } from '../compliance/policy-engine';
import { MissionTelemetry } from '../observability/mission-telemetry';

@injectable()
export abstract class BaseAgent {
  @inject(LLMRouter)
  protected llmRouter: LLMRouter;

  @inject(PolicyEngine)
  protected policyEngine: PolicyEngine;

  @inject(MissionTelemetry)
  protected telemetry: MissionTelemetry;

  protected async executeWithPolicy(
    domain: 'code' | 'trading' | 'research' | 'creative',
    action: string,
    tool: string,
    parameters: any,
    userId: string,
    workspaceId: string
  ): Promise<any> {
    // 1. Check policy
    const policyContext: PolicyContext = {
      domain,
      action,
      tool,
      parameters,
      user: {
        id: userId,
        plan: 'pro', // TODO: Get from user service
        permissions: [],
      },
      workspace: {
        id: workspaceId,
        budget: this.llmRouter.getBudget(workspaceId),
      },
    };

    const evaluation = await this.policyEngine.evaluate(policyContext);

    if (!evaluation.allowed) {
      throw new Error(`Policy violation: ${evaluation.violations.map(v => v.message).join(', ')}`);
    }

    if (evaluation.requiresApproval) {
      const approval = await this.policyEngine.requestApproval(
        policyContext,
        evaluation.violations
      );
      // TODO: Wait for approval in UI
      throw new Error('Approval required');
    }

    // 2. Route to LLM
    const routingRequest: RoutingRequest = {
      domain,
      task: action,
      priority: 'normal',
      constraints: {
        maxCost: evaluation.estimatedCost,
      },
      context: {
        workspaceId,
        userId,
        budget: this.llmRouter.getBudget(workspaceId),
      },
    };

    const decision = await this.llmRouter.route(routingRequest);

    // 3. Execute with fallback
    const startTime = Date.now();
    try {
      const result = await this.llmRouter.execute(
        decision,
        async (model, provider) => {
          // Execute actual LLM call
          return await this.callLLM(model, provider, parameters);
        },
        routingRequest
      );

      // 4. Record metrics
      const duration = Date.now() - startTime;
      this.telemetry.recordMetric({
        name: `${domain}.request_duration`,
        value: duration,
        unit: 'ms',
        domain,
        labels: { action, tool },
      });

      return result;
    } catch (error) {
      // Record error
      this.telemetry.recordMetric({
        name: `${domain}.request_error`,
        value: 1,
        unit: 'count',
        domain,
        labels: { action, tool, error: (error as Error).message },
      });
      throw error;
    }
  }

  protected abstract callLLM(model: any, provider: any, parameters: any): Promise<any>;
}
```

---

## 🛠️ Passo 4: Implementar Coder Agent

### Arquivo: `src/common/agents/coder-agent.ts`

```typescript
import { injectable, inject } from 'inversify';
import { BaseAgent } from './base-agent';
import { ToolchainRegistry } from '../toolchains/toolchain-registry';
import { ContextStore } from '../context/context-store';

@injectable()
export class CoderAgent extends BaseAgent {
  @inject(ToolchainRegistry)
  private toolchainRegistry: ToolchainRegistry;

  @inject(ContextStore)
  private contextStore: ContextStore;

  async implementFeature(
    description: string,
    userId: string,
    workspaceId: string
  ): Promise<any> {
    // Get code toolchain
    const toolchain = this.toolchainRegistry.getToolchain('code');
    if (!toolchain) {
      throw new Error('Code toolchain not found');
    }

    // Execute workflow stages
    const results: any[] = [];

    for (const stage of toolchain.workflow) {
      console.log(`Executing stage: ${stage.name}`);

      // Execute tools in stage
      for (const toolId of stage.tools) {
        const tool = this.toolchainRegistry.getTool(toolId);
        if (!tool) continue;

        // Validate tool execution
        const validation = await this.toolchainRegistry.validateExecution(
          toolId,
          { description }
        );

        if (!validation.valid) {
          throw new Error(`Tool validation failed: ${validation.errors.join(', ')}`);
        }

        // Execute with policy check
        const result = await this.executeWithPolicy(
          'code',
          stage.name,
          toolId,
          { description },
          userId,
          workspaceId
        );

        results.push(result);

        // Store in context
        await this.contextStore.store({
          workspaceId,
          domain: 'code',
          type: 'execution',
          content: {
            stage: stage.name,
            tool: toolId,
            result,
          },
        });
      }

      // Run critics if required
      if (stage.critics.length > 0) {
        // TODO: Integrate with critic service
        console.log(`Running critics: ${stage.critics.join(', ')}`);
      }

      // Check if approval required
      if (stage.requiresApproval) {
        // TODO: Request approval
        console.log('Approval required for stage:', stage.name);
      }
    }

    return results;
  }

  protected async callLLM(model: any, provider: any, parameters: any): Promise<any> {
    // TODO: Implement actual LLM call
    const response = await fetch(`${provider.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          {
            role: 'system',
            content: 'You are a code generation assistant.',
          },
          {
            role: 'user',
            content: parameters.description,
          },
        ],
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

---

## 🔍 Passo 5: Integrar Secure Fetch com Research

### Arquivo: `src/common/agents/research-agent.ts`

```typescript
import { injectable, inject } from 'inversify';
import { BaseAgent } from './base-agent';
import { SecureFetch, FetchRequest } from '../data/secure-fetch';

@injectable()
export class ResearchAgent extends BaseAgent {
  @inject(SecureFetch)
  private secureFetch: SecureFetch;

  async fetchAndAnalyze(
    url: string,
    userId: string,
    workspaceId: string
  ): Promise<any> {
    // Fetch with all safety checks
    const fetchRequest: FetchRequest = {
      url,
      userId,
      workspaceId,
      purpose: 'research',
    };

    const result = await this.secureFetch.fetch(fetchRequest);

    // Analyze with LLM
    const analysis = await this.executeWithPolicy(
      'research',
      'analyze',
      'research.analyze',
      {
        content: result.content,
        sources: result.sources,
      },
      userId,
      workspaceId
    );

    return {
      url: result.url,
      content: result.content,
      masked: result.masked,
      analysis,
      auditId: result.auditId,
    };
  }

  protected async callLLM(model: any, provider: any, parameters: any): Promise<any> {
    // Similar to CoderAgent
    const response = await fetch(`${provider.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          {
            role: 'system',
            content: 'You are a research analysis assistant.',
          },
          {
            role: 'user',
            content: `Analyze this content: ${parameters.content}`,
          },
        ],
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

---

## 📊 Passo 6: Conectar Telemetry ao Prometheus

### Arquivo: `src/node/metrics-endpoint.ts`

```typescript
import { injectable, inject } from 'inversify';
import { MissionTelemetry } from '../common/observability/mission-telemetry';
import { ObservabilityService } from '../common/observability-service';

@injectable()
export class MetricsEndpoint {
  @inject(MissionTelemetry)
  private missionTelemetry: MissionTelemetry;

  @inject(ObservabilityService)
  private observability: ObservabilityService;

  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // Existing metrics
    const existingMetrics = this.observability.getMetrics();
    lines.push('# Existing metrics');
    lines.push(JSON.stringify(existingMetrics));

    // Mission metrics
    const domains: Array<'code' | 'trading' | 'research' | 'creative'> = [
      'code',
      'trading',
      'research',
      'creative',
    ];

    for (const domain of domains) {
      const dashboard = this.missionTelemetry.getDashboard(domain);

      // SLO metrics
      for (const slo of dashboard.slos) {
        lines.push(
          `ai_ide_slo_current{domain="${domain}",name="${slo.name}"} ${slo.current}`
        );
        lines.push(
          `ai_ide_slo_target{domain="${domain}",name="${slo.name}"} ${slo.target}`
        );
        lines.push(
          `ai_ide_slo_compliance{domain="${domain}",name="${slo.name}"} ${slo.compliance}`
        );
        lines.push(
          `ai_ide_slo_breached{domain="${domain}",name="${slo.name}"} ${slo.breached ? 1 : 0}`
        );
      }

      // Alert count
      lines.push(`ai_ide_alerts_active{domain="${domain}"} ${dashboard.alerts}`);
    }

    return lines.join('\n');
  }
}
```

---

## 🎯 Passo 7: Adicionar Command para Mission Control

### Arquivo: `src/browser/ai-ide-contribution.ts`

```typescript
import { injectable, inject } from 'inversify';
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser';
import { MissionControlWidget } from './missions/mission-control';
import { ApplicationShell } from '@theia/core/lib/browser';

export namespace MissionControlCommands {
  export const OPEN = {
    id: 'mission-control.open',
    label: 'Open Mission Control',
  };
}

@injectable()
export class MissionControlContribution implements CommandContribution, MenuContribution {
  @inject(ApplicationShell)
  protected readonly shell: ApplicationShell;

  registerCommands(commands: CommandRegistry): void {
    commands.registerCommand(MissionControlCommands.OPEN, {
      execute: () => this.openMissionControl(),
    });
  }

  registerMenus(menus: MenuModelRegistry): void {
    menus.registerMenuAction(CommonMenus.VIEW, {
      commandId: MissionControlCommands.OPEN.id,
      label: 'Mission Control',
      order: '1',
    });
  }

  protected async openMissionControl(): Promise<void> {
    const widget = await this.shell.revealWidget(MissionControlWidget.ID);
    if (widget) {
      this.shell.activateWidget(widget.id);
    }
  }
}
```

---

## ✅ Passo 8: Validação

### 1. Compilar
```bash
cd cloud-ide-desktop/aethel_theia_fork
yarn build
```

### 2. Executar Testes
```bash
# Unit tests
yarn test

# Integration tests
yarn test:integration

# E2E tests
yarn test:e2e
```

### 3. Verificar Métricas
```bash
# Start server
yarn start

# Check metrics endpoint
curl http://localhost:3000/metrics
```

### 4. Testar UI
```bash
# Open browser
open http://localhost:3000

# Open Mission Control
# View > Mission Control
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"
**Solução**: Verificar imports e paths no tsconfig.json

### Erro: "Provider not registered"
**Solução**: Verificar bindings no InversifyJS

### Erro: "API key not configured"
**Solução**: Configurar .env com API keys

### Erro: "Policy violation"
**Solução**: Verificar PolicyEngine rules e plan limits

---

## 📚 Próximos Passos

1. **Implementar Trading Agent** (Sprint 4)
2. **Implementar Creative Agent** (Sprint 5)
3. **Adicionar Testes E2E** (Sprint 6)
4. **Deploy para Staging** (Sprint 7)
5. **Release para Produção** (Sprint 8)

---

**Última Atualização**: 2024-12-09  
**Autor**: AI IDE Team  
**Revisão**: Pendente
