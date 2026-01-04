# Correções Críticas - AI IDE Platform

**Data**: 2024-12-09  
**Objetivo**: Corrigir problemas críticos identificados na validação  
**Status**: Em execução

---

## 🚨 PROBLEMA 1: Mission Control Desconectado (CRÍTICO)

### Situação Atual
```typescript
// mission-control.tsx - Linha ~200
private executeMission(missionId: string): void {
    const mission = this.missions.find(m => m.id === missionId);
    if (!mission) return;

    mission.status = 'running';
    this.update();

    // ❌ PROBLEMA: Simulação com setTimeout
    const interval = setInterval(() => {
        if (mission.status !== 'running') {
            clearInterval(interval);
            return;
        }

        mission.progress += 0.1;
        mission.actualCost += mission.estimatedCost * 0.1;

        if (mission.progress >= 1.0) {
            mission.progress = 1.0;
            mission.status = 'completed';
            clearInterval(interval);
        }

        this.update();
    }, 1000);
}
```

### Correção Necessária

```typescript
// mission-control.tsx - CORRIGIDO
@injectable()
export class MissionControlWidget extends ReactWidget {
    @inject(AgentScheduler)
    protected scheduler: AgentScheduler;

    @inject(MissionWebSocketClient)
    protected wsClient: MissionWebSocketClient;

    private wsSubscriptions: Array<() => void> = [];

    @postConstruct()
    protected init(): void {
        // ... existing code ...
        this.setupWebSocket();
    }

    dispose(): void {
        // Cleanup WebSocket subscriptions
        this.wsSubscriptions.forEach(unsub => unsub());
        this.wsSubscriptions = [];
        super.dispose();
    }

    private setupWebSocket(): void {
        // Subscribe to all mission updates
        const unsubUpdates = this.wsClient.subscribeAllMissions((update) => {
            const mission = this.missions.find(m => m.id === update.missionId);
            if (mission) {
                mission.status = update.status;
                mission.progress = update.progress;
                mission.currentStage = update.currentStage;
                mission.actualCost = update.actualCost;
                mission.estimatedCompletion = update.estimatedCompletion;
                if (update.errors) mission.errors = update.errors;
                if (update.warnings) mission.warnings = update.warnings;
                this.update();
            }
        });

        // Subscribe to mission completion
        const unsubComplete = this.wsClient.subscribeMissionComplete((payload) => {
            const mission = this.missions.find(m => m.id === payload.missionId);
            if (mission) {
                mission.status = 'completed';
                mission.progress = 1.0;
                this.update();
            }
        });

        // Subscribe to mission errors
        const unsubError = this.wsClient.subscribeMissionError((payload) => {
            const mission = this.missions.find(m => m.id === payload.missionId);
            if (mission) {
                mission.status = 'failed';
                mission.errors.push(payload.error);
                this.update();
            }
        });

        this.wsSubscriptions.push(unsubUpdates, unsubComplete, unsubError);
    }

    private async startMission(preset: MissionPreset): Promise<void> {
        const mission: MissionStatus = {
            id: `mission_${Date.now()}`,
            preset: preset.name,
            status: 'queued',
            progress: 0,
            currentStage: 'Initializing',
            startedAt: Date.now(),
            estimatedCompletion: Date.now() + preset.estimatedTime.typical * 1000,
            actualCost: 0,
            estimatedCost: preset.estimatedCost.typical,
            errors: [],
            warnings: [],
        };

        this.missions.push(mission);
        this.update();

        // ✅ CORREÇÃO: Usar AgentScheduler real
        try {
            const task = await this.scheduler.scheduleTask({
                id: mission.id,
                agentId: this.getAgentForDomain(preset.domain),
                priority: preset.riskLevel === 'high' ? 'high' : 'normal',
                payload: {
                    type: preset.id,
                    domain: preset.domain,
                    description: preset.description,
                },
                deadline: mission.estimatedCompletion,
                idempotencyKey: mission.id,
            });

            mission.status = 'running';
            this.update();

            // WebSocket will handle updates automatically
        } catch (error) {
            mission.status = 'failed';
            mission.errors.push((error as Error).message);
            this.update();
        }
    }

    private getAgentForDomain(domain: string): string {
        const agentMap: Record<string, string> = {
            'code': 'coder',
            'trading': 'trading',
            'research': 'research',
            'creative': 'creative',
        };
        return agentMap[domain] || 'universal';
    }

    private pauseMission(missionId: string): void {
        this.wsClient.pauseMission(missionId);
        // WebSocket will update status
    }

    private resumeMission(missionId: string): void {
        this.wsClient.resumeMission(missionId);
        // WebSocket will update status
    }

    private cancelMission(missionId: string): void {
        this.wsClient.cancelMission(missionId);
        // WebSocket will update status
    }
}
```

**Status**: ✅ Solução definida, precisa aplicar

---

## 🚨 PROBLEMA 2: ConfigService não carrega (ALTA)

### Situação Atual
```typescript
// config-service.ts
async load(): Promise<void> {
    // Método existe mas nunca é chamado
}
```

### Correção Necessária

```typescript
// frontend-module.ts
bind(ConfigService).toSelf().inSingletonScope().onActivation(async (ctx, service) => {
    await service.load();
    return service;
});
```

**Status**: ✅ Solução definida, precisa aplicar

---

## 🚨 PROBLEMA 3: Error Boundaries faltando (ALTA)

### Correção Necessária

```typescript
// error-boundary.tsx - NOVO ARQUIVO
import * as React from 'react';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('Error caught by boundary:', error, errorInfo);
        
        // Send to error reporting service
        if (typeof window !== 'undefined' && (window as any).errorReporter) {
            (window as any).errorReporter.report(error, errorInfo);
        }
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="error-boundary">
                    <h2>Something went wrong</h2>
                    <p>{this.state.error?.message}</p>
                    <button onClick={() => this.setState({ hasError: false })}>
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Uso em mission-control.tsx
protected render(): React.ReactNode {
    return (
        <ErrorBoundary>
            <div className="mission-control">
                {/* ... existing code ... */}
            </div>
        </ErrorBoundary>
    );
}
```

**Status**: ✅ Solução definida, precisa criar arquivo

---

## 🚨 PROBLEMA 4: Notification System faltando (MÉDIA)

### Correção Necessária

```typescript
// notification-service.ts - NOVO ARQUIVO
import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

@injectable()
export class NotificationService {
    private notifications: Notification[] = [];

    private readonly onNotificationEmitter = new Emitter<Notification>();
    readonly onNotification: Event<Notification> = this.onNotificationEmitter.event;

    success(title: string, message: string, duration: number = 3000): string {
        return this.show('success', title, message, duration);
    }

    error(title: string, message: string, duration: number = 5000): string {
        return this.show('error', title, message, duration);
    }

    warning(title: string, message: string, duration: number = 4000): string {
        return this.show('warning', title, message, duration);
    }

    info(title: string, message: string, duration: number = 3000): string {
        return this.show('info', title, message, duration);
    }

    private show(
        type: NotificationType,
        title: string,
        message: string,
        duration?: number
    ): string {
        const notification: Notification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            title,
            message,
            duration,
        };

        this.notifications.push(notification);
        this.onNotificationEmitter.fire(notification);

        if (duration) {
            setTimeout(() => {
                this.dismiss(notification.id);
            }, duration);
        }

        return notification.id;
    }

    dismiss(id: string): void {
        this.notifications = this.notifications.filter(n => n.id !== id);
    }

    getAll(): Notification[] {
        return this.notifications;
    }
}

// notification-widget.tsx - NOVO ARQUIVO
import * as React from 'react';
import { injectable, inject, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { NotificationService, Notification } from './notification-service';

@injectable()
export class NotificationWidget extends ReactWidget {
    @inject(NotificationService)
    protected notificationService: NotificationService;

    private notifications: Notification[] = [];

    @postConstruct()
    protected init(): void {
        this.id = 'notification-widget';
        this.addClass('notification-widget');

        this.notificationService.onNotification(notification => {
            this.notifications.push(notification);
            this.update();
        });
    }

    protected render(): React.ReactNode {
        return (
            <div className="notifications-container">
                {this.notifications.map(notification => (
                    <div
                        key={notification.id}
                        className={`notification notification-${notification.type}`}
                    >
                        <div className="notification-content">
                            <strong>{notification.title}</strong>
                            <p>{notification.message}</p>
                        </div>
                        {notification.action && (
                            <button onClick={notification.action.onClick}>
                                {notification.action.label}
                            </button>
                        )}
                        <button
                            className="notification-close"
                            onClick={() => {
                                this.notificationService.dismiss(notification.id);
                                this.notifications = this.notifications.filter(
                                    n => n.id !== notification.id
                                );
                                this.update();
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        );
    }
}

// Uso em agents
@injectable()
export class CoderAgent {
    @inject(NotificationService)
    private notifications: NotificationService;

    async processRequest(request: CodeRequest): Promise<CodeResponse> {
        try {
            // ... processing ...
            this.notifications.success(
                'Code Generated',
                'Your code has been generated successfully'
            );
            return response;
        } catch (error) {
            this.notifications.error(
                'Generation Failed',
                (error as Error).message
            );
            throw error;
        }
    }
}
```

**Status**: ✅ Solução definida, precisa criar arquivos

---

## 📋 CHECKLIST DE CORREÇÕES

### P0 - Crítico (Hoje)
- [ ] Aplicar correção Mission Control
- [ ] Aplicar correção ConfigService load
- [ ] Criar Error Boundary
- [ ] Criar Notification System

### P1 - Alta (Amanhã)
- [ ] Criar testes para ArchitectAgent
- [ ] Criar testes para TradingAgent
- [ ] Criar testes para ResearchAgent
- [ ] Criar testes para CreativeAgent
- [ ] Criar testes E2E

### P2 - Média (Esta Semana)
- [ ] Mover LLM providers para ConfigService
- [ ] Mover Policy rules para ConfigService
- [ ] Criar testes para ContextStore
- [ ] Criar testes para SecureFetch
- [ ] Criar testes para MissionTelemetry

---

## 🎯 IMPACTO DAS CORREÇÕES

### Antes das Correções
- **Integração**: 67%
- **Funcionalidade**: Mission Control não funciona
- **UX**: Sem feedback visual
- **Confiabilidade**: Erros podem crashar app

### Após P0
- **Integração**: 80%
- **Funcionalidade**: Mission Control funcional
- **UX**: Feedback visual consistente
- **Confiabilidade**: Erros capturados gracefully

### Após P1
- **Integração**: 85%
- **Funcionalidade**: Todos os agents testados
- **UX**: Fluxos E2E validados
- **Confiabilidade**: Alta confiança

### Após P2
- **Integração**: 95%
- **Funcionalidade**: Configs dinâmicos
- **UX**: Excelente
- **Confiabilidade**: Production-ready

---

## ⏱️ ESTIMATIVA DE TEMPO

### P0 (Crítico)
- Mission Control: 2 horas
- ConfigService load: 30 minutos
- Error Boundary: 1 hora
- Notification System: 1 hora

**Total P0**: 4.5 horas

### P1 (Alta)
- Testes agents: 4 horas
- Testes E2E: 4 horas

**Total P1**: 8 horas

### P2 (Média)
- Mover configs: 3 horas
- Testes infrastructure: 3 horas

**Total P2**: 6 horas

**TOTAL GERAL**: 18.5 horas (~2.5 dias)

---

## 🚀 PLANO DE EXECUÇÃO

### Hoje (4.5 horas)
1. **09:00-11:00**: Mission Control integration
2. **11:00-11:30**: ConfigService load
3. **11:30-12:30**: Error Boundary
4. **14:00-15:00**: Notification System
5. **15:00-15:30**: Testing e validação

### Amanhã (8 horas)
1. **09:00-13:00**: Testes para agents
2. **14:00-18:00**: Testes E2E

### Depois de Amanhã (6 horas)
1. **09:00-12:00**: Mover configs
2. **13:00-16:00**: Testes infrastructure

---

## ✅ CRITÉRIOS DE SUCESSO

### P0 Completo
- [ ] Mission Control cria missões reais via AgentScheduler
- [ ] WebSocket atualiza UI em tempo real
- [ ] ConfigService carrega do localStorage
- [ ] Error Boundary captura erros
- [ ] Notifications aparecem para usuário

### P1 Completo
- [ ] Todos os 9 agents têm testes
- [ ] Test coverage ≥ 70%
- [ ] Testes E2E passam
- [ ] Fluxos críticos validados

### P2 Completo
- [ ] Configs são dinâmicos
- [ ] Test coverage ≥ 85%
- [ ] Todos os componentes testados
- [ ] Production-ready

---

**Status**: Correções definidas, pronto para executar  
**Confiança**: ALTA - Soluções claras e testáveis  
**Próximo Passo**: Aplicar correções P0
