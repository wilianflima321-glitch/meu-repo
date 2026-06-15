/**
 * ============================================
 * AETHEL ENGINE - Workflow LivePreview
 * ============================================
 * 
 * Componente de visualização de workflows
 * para integração com o LivePreview.
 * 
 * Exibe:
 * - Status do workflow atual
 * - Progresso das etapas
 * - Solicitações de credenciais
 * - Ações do usuário necessárias
 * - Resultados e erros
 */

import { EventEmitter } from 'events';
import { 
  WorkflowManager, 
  WorkflowInstance, 
  WorkflowDefinition,
  WorkflowEvent,
  WORKFLOW_DEFINITIONS 
} from './workflow-manager';
import { CredentialUIController, ChatCredentialMessage } from '../credentials/credential-ui-controller';

// ============================================
// LIVE PREVIEW STATE
// ============================================

export interface WorkflowLivePreviewState {
  // Visibility
  visible: boolean;
  minimized: boolean;
  position: { x: number; y: number };
  
  // Current workflow
  activeWorkflow: WorkflowDisplayData | null;
  
  // Queue
  pendingWorkflows: WorkflowSummary[];
  
  // History (recent)
  recentWorkflows: WorkflowSummary[];
  
  // Notifications
  notifications: WorkflowNotification[];
  
  // User actions
  pendingActions: UserActionRequired[];
}

export interface WorkflowDisplayData {
  instanceId: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  status: string;
  statusColor: string;
  progress: number;
  currentStep: StepDisplayData | null;
  steps: StepDisplayData[];
  startedAt: Date;
  estimatedCompletion?: Date;
  metadata: Record<string, unknown>;
}

export interface StepDisplayData {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  statusIcon: string;
  duration?: number;
  error?: string;
}

export interface WorkflowSummary {
  instanceId: string;
  name: string;
  icon: string;
  status: string;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface WorkflowNotification {
  id: string;
  workflowId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface UserActionRequired {
  id: string;
  workflowId: string;
  stepId?: string;
  type: 'credential' | 'confirmation' | 'input' | 'choice';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actions: ActionButton[];
  expiresAt?: Date;
}

export interface ActionButton {
  id: string;
  label: string;
  style: 'primary' | 'secondary' | 'success' | 'danger';
  callback: string;
}

// ============================================
// WORKFLOW LIVE PREVIEW CONTROLLER
// ============================================

export class WorkflowLivePreview extends EventEmitter {
  private workflowManager: WorkflowManager;
  private credentialUI: CredentialUIController;
  private state: WorkflowLivePreviewState;

  constructor(
    workflowManager: WorkflowManager,
    credentialUI: CredentialUIController
  ) {
    super();
    this.workflowManager = workflowManager;
    this.credentialUI = credentialUI;
    this.state = this.getInitialState();
    
    this.setupEventListeners();
  }

  private getInitialState(): WorkflowLivePreviewState {
    return {
      visible: false,
      minimized: false,
      position: { x: 0, y: 0 },
      activeWorkflow: null,
      pendingWorkflows: [],
      recentWorkflows: [],
      notifications: [],
      pendingActions: [],
    };
  }

  private setupEventListeners(): void {
    // Workflow events
    this.workflowManager.on('workflowEvent', (event: WorkflowEvent) => {
      this.handleWorkflowEvent(event);
    });

    // Credential events from credentialUI
    this.credentialUI.on('chatMessage', (message: ChatCredentialMessage) => {
      if (message.type === 'credential_request') {
        this.handleCredentialRequest(message);
      }
    });
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  private handleWorkflowEvent(event: WorkflowEvent): void {
    const instance = this.workflowManager.getWorkflow(event.instanceId);
    
    switch (event.type) {
      case 'workflow_started':
        this.onWorkflowStarted(event, instance);
        break;
      
      case 'workflow_completed':
        this.onWorkflowCompleted(event, instance);
        break;
      
      case 'workflow_failed':
        this.onWorkflowFailed(event, instance);
        break;
      
      case 'step_started':
        this.onStepStarted(event, instance);
        break;
      
      case 'step_completed':
        this.onStepCompleted(event, instance);
        break;
      
      case 'step_failed':
        this.onStepFailed(event, instance);
        break;
      
      case 'credential_needed':
        this.onCredentialNeeded(event, instance);
        break;
      
      case 'progress_update':
        this.onProgressUpdate(event, instance);
        break;
      
      case 'user_action_needed':
        this.onUserActionNeeded(event, instance);
        break;
    }

    this.updateWorkflowDisplay(instance);
    this.emitStateChange();
  }

  private onWorkflowStarted(event: WorkflowEvent, instance?: WorkflowInstance): void {
    if (!instance) return;

    this.state.visible = true;
    this.state.minimized = false;

    this.addNotification({
      workflowId: instance.instanceId,
      type: 'info',
      title: `🚀 ${instance.context.name}`,
      message: 'Workflow iniciado',
    });

    // Send chat message
    this.emitChatMessage({
      type: 'workflow_start',
      content: `🚀 **${instance.context.name}** iniciado\n\n${instance.context.description}`,
      workflowId: instance.instanceId,
    });
  }

  private onWorkflowCompleted(event: WorkflowEvent, instance?: WorkflowInstance): void {
    if (!instance) return;

    this.addNotification({
      workflowId: instance.instanceId,
      type: 'success',
      title: `✅ ${instance.context.name}`,
      message: `Concluído em ${this.formatDuration(event.data.duration as number)}`,
    });

    // Move to recent
    this.state.recentWorkflows.unshift(this.createWorkflowSummary(instance));
    if (this.state.recentWorkflows.length > 10) {
      this.state.recentWorkflows = this.state.recentWorkflows.slice(0, 10);
    }

    // Clear active if this was it
    if (this.state.activeWorkflow?.instanceId === instance.instanceId) {
      this.state.activeWorkflow = null;
    }

    // Chat message
    this.emitChatMessage({
      type: 'workflow_complete',
      content: `✅ **${instance.context.name}** concluído com sucesso!`,
      workflowId: instance.instanceId,
    });
  }

  private onWorkflowFailed(event: WorkflowEvent, instance?: WorkflowInstance): void {
    if (!instance) return;

    this.addNotification({
      workflowId: instance.instanceId,
      type: 'error',
      title: `❌ ${instance.context.name}`,
      message: event.data.error as string || 'Erro desconhecido',
    });

    // Chat message
    this.emitChatMessage({
      type: 'workflow_error',
      content: `❌ **${instance.context.name}** falhou: ${event.data.error}`,
      workflowId: instance.instanceId,
    });
  }

  private onStepStarted(event: WorkflowEvent, instance?: WorkflowInstance): void {
    if (!instance) return;

    const stepId = event.data.stepId as string;
    const definition = WORKFLOW_DEFINITIONS[instance.definitionId];
    const step = definition?.steps.find(s => s.id === stepId);

    if (step) {
      this.emitChatMessage({
        type: 'step_update',
        content: `⏳ **${step.name}**: ${step.description}`,
        workflowId: instance.instanceId,
        stepId,
      });
    }
  }

  private onStepCompleted(event: WorkflowEvent, instance?: WorkflowInstance): void {
    if (!instance) return;
    // Update is handled by updateWorkflowDisplay
  }

  private onStepFailed(event: WorkflowEvent, instance?: WorkflowInstance): void {
    if (!instance) return;

    const stepId = event.data.stepId as string;
    const error = event.data.error as string;

    this.addNotification({
      workflowId: instance.instanceId,
      type: 'warning',
      title: 'Etapa falhou',
      message: `${stepId}: ${error}`,
    });
  }

  private onCredentialNeeded(event: WorkflowEvent, instance?: WorkflowInstance): void {
    if (!instance) return;

    const required = event.data.required as string[];
    
    this.state.pendingActions.push({
      id: `cred-${instance.instanceId}-${Date.now()}`,
      workflowId: instance.instanceId,
      type: 'credential',
      title: 'Credenciais Necessárias',
      description: `${instance.context.name} precisa de acesso a: ${required.join(', ')}`,
      priority: 'high',
      actions: [
        { id: 'configure', label: '🔐 Configurar', style: 'primary', callback: `openCredentials:${instance.instanceId}` },
        { id: 'cancel', label: 'Cancelar Workflow', style: 'danger', callback: `cancelWorkflow:${instance.instanceId}` },
      ],
    });
  }

  private onProgressUpdate(event: WorkflowEvent, instance?: WorkflowInstance): void {
    // Handled by updateWorkflowDisplay
  }

  private onUserActionNeeded(event: WorkflowEvent, instance?: WorkflowInstance): void {
    if (!instance) return;

    const action = event.data as unknown as UserActionRequired;
    this.state.pendingActions.push({
      ...action,
      workflowId: instance.instanceId,
    });
  }

  private handleCredentialRequest(message: ChatCredentialMessage): void {
    // Associate credential request with active workflow
    if (this.state.activeWorkflow) {
      // Already handled via workflowEvent
    }
  }

  // ============================================
  // DISPLAY HELPERS
  // ============================================

  private updateWorkflowDisplay(instance?: WorkflowInstance): void {
    if (!instance) {
      return;
    }

    const definition = WORKFLOW_DEFINITIONS[instance.definitionId];
    if (!definition) return;

    const steps: StepDisplayData[] = definition.steps.map(stepDef => {
      const result = instance.stepResults.get(stepDef.id);
      return {
        id: stepDef.id,
        name: stepDef.name,
        description: stepDef.description,
        status: result?.status || 'pending',
        statusIcon: this.getStatusIcon(result?.status || 'pending'),
        duration: result?.completedAt && result?.startedAt 
          ? result.completedAt.getTime() - result.startedAt.getTime()
          : undefined,
        error: result?.error,
      };
    });

    const currentStep = steps[instance.currentStepIndex];

    this.state.activeWorkflow = {
      instanceId: instance.instanceId,
      name: definition.name,
      description: definition.description,
      icon: definition.icon,
      type: definition.type,
      status: instance.status,
      statusColor: this.getStatusColor(instance.status),
      progress: instance.context.progress,
      currentStep: currentStep || null,
      steps,
      startedAt: instance.startedAt,
      estimatedCompletion: definition.estimatedDuration 
        ? new Date(instance.startedAt.getTime() + definition.estimatedDuration)
        : undefined,
      metadata: instance.metadata,
    };
  }

  private createWorkflowSummary(instance: WorkflowInstance): WorkflowSummary {
    const definition = WORKFLOW_DEFINITIONS[instance.definitionId];
    return {
      instanceId: instance.instanceId,
      name: definition?.name || instance.definitionId,
      icon: definition?.icon || '📋',
      status: instance.status,
      progress: instance.context.progress,
      startedAt: instance.startedAt,
      completedAt: instance.completedAt,
    };
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'pending': '⏳',
      'in_progress': '🔄',
      'completed': '✅',
      'failed': '❌',
      'skipped': '⏭️',
    };
    return icons[status] || '❓';
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'idle': '#6b7280',
      'planning': '#3b82f6',
      'awaiting_credentials': '#f59e0b',
      'in_progress': '#10b981',
      'paused': '#8b5cf6',
      'completed': '#22c55e',
      'failed': '#ef4444',
      'cancelled': '#6b7280',
    };
    return colors[status] || '#6b7280';
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  private addNotification(notification: Omit<WorkflowNotification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: WorkflowNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };

    this.state.notifications.unshift(newNotification);
    
    if (this.state.notifications.length > 50) {
      this.state.notifications = this.state.notifications.slice(0, 50);
    }

    this.emit('notification', newNotification);
  }

  markNotificationRead(notificationId: string): void {
    const notification = this.state.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.emitStateChange();
    }
  }

  // ============================================
  // USER ACTIONS
  // ============================================

  /**
   * Handle user action from UI
   */
  handleAction(actionCallback: string): void {
    const [action, ...args] = actionCallback.split(':');
    
    switch (action) {
      case 'openCredentials':
        this.credentialUI.showPanel('request');
        break;
      
      case 'cancelWorkflow':
        this.workflowManager.cancelWorkflow(args[0]);
        break;
      
      case 'pauseWorkflow':
        this.workflowManager.pauseWorkflow(args[0]);
        break;
      
      case 'resumeWorkflow':
        this.workflowManager.resumeWorkflow(args[0]);
        break;
      
      case 'confirmAction':
        this.confirmAction(args[0]);
        break;
      
      case 'denyAction':
        this.denyAction(args[0]);
        break;
    }

    // Remove pending action
    const actionIndex = this.state.pendingActions.findIndex(a => 
      a.actions.some(btn => btn.callback === actionCallback)
    );
    if (actionIndex !== -1) {
      this.state.pendingActions.splice(actionIndex, 1);
    }

    this.emitStateChange();
  }

  private confirmAction(actionId: string): void {
    this.emit('actionConfirmed', actionId);
  }

  private denyAction(actionId: string): void {
    this.emit('actionDenied', actionId);
  }

  // ============================================
  // PANEL CONTROL
  // ============================================

  show(): void {
    this.state.visible = true;
    this.state.minimized = false;
    this.emitStateChange();
  }

  hide(): void {
    this.state.visible = false;
    this.emitStateChange();
  }

  minimize(): void {
    this.state.minimized = true;
    this.emitStateChange();
  }

  maximize(): void {
    this.state.minimized = false;
    this.emitStateChange();
  }

  toggle(): void {
    if (this.state.visible && !this.state.minimized) {
      this.minimize();
    } else if (this.state.visible && this.state.minimized) {
      this.maximize();
    } else {
      this.show();
    }
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  getState(): WorkflowLivePreviewState {
    return { ...this.state };
  }

  private emitStateChange(): void {
    this.emit('stateChange', this.getState());
  }

  private emitChatMessage(message: { type: string; content: string; workflowId: string; stepId?: string }): void {
    this.emit('chatMessage', message);
  }

  /**
   * Get render data for LivePreview component
   */
  getRenderData(): {
    header: { icon: string; title: string; status: string; color: string };
    progress: { percent: number; label: string };
    steps: StepDisplayData[];
    actions: ActionButton[];
    notifications: WorkflowNotification[];
  } | null {
    if (!this.state.visible || !this.state.activeWorkflow) {
      return null;
    }

    const wf = this.state.activeWorkflow;
    
    return {
      header: {
        icon: wf.icon,
        title: wf.name,
        status: wf.status,
        color: wf.statusColor,
      },
      progress: {
        percent: wf.progress,
        label: wf.currentStep?.name || 'Aguardando...',
      },
      steps: wf.steps,
      actions: this.state.pendingActions
        .filter(a => a.workflowId === wf.instanceId)
        .flatMap(a => a.actions),
      notifications: this.state.notifications
        .filter(n => n.workflowId === wf.instanceId && !n.read)
        .slice(0, 3),
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.removeAllListeners();
  }
}
