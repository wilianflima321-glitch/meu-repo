import * as React from 'react';
import { injectable, inject, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { Message } from '@theia/core/lib/browser';

/**
 * Mission preset
 */
export interface MissionPreset {
  id: string;
  name: string;
  domain: 'code' | 'trading' | 'research' | 'creative';
  description: string;
  icon: string;
  toolchain: string;
  estimatedCost: {
    min: number;
    max: number;
    typical: number;
  };
  estimatedTime: {
    min: number;
    max: number;
    typical: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  requiredPlan: 'free' | 'pro' | 'enterprise';
  examples: string[];
}

/**
 * Mission status
 */
export interface MissionStatus {
  id: string;
  preset: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  currentStage: string;
  startedAt: number;
  estimatedCompletion?: number;
  actualCost: number;
  estimatedCost: number;
  errors: string[];
  warnings: string[];
}

/**
 * Mission Control widget
 */
@injectable()
export class MissionControlWidget extends ReactWidget {
  static readonly ID = 'mission-control-widget';
  static readonly LABEL = 'Mission Control';

  private missions: MissionStatus[] = [];
  private presets: MissionPreset[] = [];

  @postConstruct()
  protected init(): void {
    this.id = MissionControlWidget.ID;
    this.title.label = MissionControlWidget.LABEL;
    this.title.caption = MissionControlWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'fa fa-rocket';

    this.initializePresets();
    this.update();
  }

  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    this.update();
  }

  protected render(): React.ReactNode {
    return (
      <div className="mission-control">
        <div className="mission-header">
          <h2>Mission Control</h2>
          <p>Select a mission type to begin</p>
        </div>

        <div className="mission-presets">
          {this.presets.map(preset => this.renderPreset(preset))}
        </div>

        {this.missions.length > 0 && (
          <div className="mission-status">
            <h3>Active Missions</h3>
            {this.missions.map(mission => this.renderMission(mission))}
          </div>
        )}
      </div>
    );
  }

  private renderPreset(preset: MissionPreset): React.ReactNode {
    return (
      <div key={preset.id} className={`mission-preset ${preset.domain}`}>
        <div className="preset-header">
          <span className={`preset-icon ${preset.icon}`}></span>
          <h3>{preset.name}</h3>
          <span className={`risk-badge ${preset.riskLevel}`}>{preset.riskLevel}</span>
        </div>

        <p className="preset-description">{preset.description}</p>

        <div className="preset-estimates">
          <div className="estimate-item">
            <span className="estimate-label">Cost:</span>
            <span className="estimate-value">
              ${preset.estimatedCost.min.toFixed(2)} - ${preset.estimatedCost.max.toFixed(2)}
              <span className="estimate-typical"> (typically ${preset.estimatedCost.typical.toFixed(2)})</span>
            </span>
          </div>

          <div className="estimate-item">
            <span className="estimate-label">Time:</span>
            <span className="estimate-value">
              {this.formatDuration(preset.estimatedTime.min)} - {this.formatDuration(preset.estimatedTime.max)}
              <span className="estimate-typical"> (typically {this.formatDuration(preset.estimatedTime.typical)})</span>
            </span>
          </div>
        </div>

        <div className="preset-requirements">
          <span className={`plan-badge ${preset.requiredPlan}`}>{preset.requiredPlan}</span>
          {preset.requiresApproval && <span className="approval-badge">Requires Approval</span>}
        </div>

        <div className="preset-examples">
          <p className="examples-label">Examples:</p>
          <ul>
            {preset.examples.map((example, idx) => (
              <li key={idx}>{example}</li>
            ))}
          </ul>
        </div>

        <button
          className="preset-start-button"
          onClick={() => this.startMission(preset)}
        >
          Start Mission
        </button>
      </div>
    );
  }

  private renderMission(mission: MissionStatus): React.ReactNode {
    const progressPercent = mission.progress * 100;
    const costPercent = (mission.actualCost / mission.estimatedCost) * 100;

    return (
      <div key={mission.id} className={`mission-status-card ${mission.status}`}>
        <div className="mission-status-header">
          <h4>{mission.preset}</h4>
          <span className={`status-badge ${mission.status}`}>{mission.status}</span>
        </div>

        <div className="mission-progress">
          <div className="progress-label">
            <span>Progress: {progressPercent.toFixed(0)}%</span>
            <span className="current-stage">{mission.currentStage}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <div className="mission-cost">
          <div className="cost-label">
            <span>Cost: ${mission.actualCost.toFixed(4)} / ${mission.estimatedCost.toFixed(4)}</span>
            <span className={`cost-percent ${costPercent > 100 ? 'over-budget' : ''}`}>
              {costPercent.toFixed(0)}%
            </span>
          </div>
          <div className="cost-bar">
            <div
              className={`cost-fill ${costPercent > 100 ? 'over-budget' : ''}`}
              style={{ width: `${Math.min(costPercent, 100)}%` }}
            ></div>
          </div>
        </div>

        {mission.estimatedCompletion && (
          <div className="mission-eta">
            <span>ETA: {this.formatETA(mission.estimatedCompletion)}</span>
          </div>
        )}

        {mission.errors.length > 0 && (
          <div className="mission-errors">
            <p className="errors-label">Errors:</p>
            <ul>
              {mission.errors.map((error, idx) => (
                <li key={idx} className="error-item">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {mission.warnings.length > 0 && (
          <div className="mission-warnings">
            <p className="warnings-label">Warnings:</p>
            <ul>
              {mission.warnings.map((warning, idx) => (
                <li key={idx} className="warning-item">{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mission-actions">
          {mission.status === 'running' && (
            <>
              <button onClick={() => this.pauseMission(mission.id)}>Pause</button>
              <button onClick={() => this.cancelMission(mission.id)}>Cancel</button>
            </>
          )}
          {mission.status === 'paused' && (
            <>
              <button onClick={() => this.resumeMission(mission.id)}>Resume</button>
              <button onClick={() => this.cancelMission(mission.id)}>Cancel</button>
            </>
          )}
          {(mission.status === 'completed' || mission.status === 'failed') && (
            <button onClick={() => this.removeMission(mission.id)}>Remove</button>
          )}
        </div>
      </div>
    );
  }

  private initializePresets(): void {
    this.presets = [
      {
        id: 'code-feature',
        name: 'Code Feature',
        domain: 'code',
        description: 'Implement a new feature with tests and documentation',
        icon: 'fa-code',
        toolchain: 'code',
        estimatedCost: { min: 0.05, max: 0.50, typical: 0.15 },
        estimatedTime: { min: 300, max: 1800, typical: 600 },
        riskLevel: 'low',
        requiresApproval: false,
        requiredPlan: 'free',
        examples: [
          'Add user authentication',
          'Implement REST API endpoint',
          'Create data validation',
        ],
      },
      {
        id: 'code-refactor',
        name: 'Code Refactor',
        domain: 'code',
        description: 'Refactor existing code for better maintainability',
        icon: 'fa-wrench',
        toolchain: 'code',
        estimatedCost: { min: 0.10, max: 1.00, typical: 0.30 },
        estimatedTime: { min: 600, max: 3600, typical: 1200 },
        riskLevel: 'medium',
        requiresApproval: false,
        requiredPlan: 'free',
        examples: [
          'Extract common utilities',
          'Improve error handling',
          'Optimize database queries',
        ],
      },
      {
        id: 'code-deploy',
        name: 'Production Deploy',
        domain: 'code',
        description: 'Deploy code to production with smoke tests',
        icon: 'fa-rocket',
        toolchain: 'code',
        estimatedCost: { min: 0.10, max: 0.50, typical: 0.20 },
        estimatedTime: { min: 300, max: 900, typical: 450 },
        riskLevel: 'high',
        requiresApproval: true,
        requiredPlan: 'pro',
        examples: [
          'Deploy API changes',
          'Update frontend',
          'Database migration',
        ],
      },
      {
        id: 'trading-backtest',
        name: 'Strategy Backtest',
        domain: 'trading',
        description: 'Backtest trading strategy on historical data',
        icon: 'fa-chart-line',
        toolchain: 'trading',
        estimatedCost: { min: 0.05, max: 0.20, typical: 0.10 },
        estimatedTime: { min: 120, max: 600, typical: 300 },
        riskLevel: 'low',
        requiresApproval: false,
        requiredPlan: 'pro',
        examples: [
          'Test momentum strategy',
          'Validate mean reversion',
          'Optimize parameters',
        ],
      },
      {
        id: 'trading-paper',
        name: 'Paper Trading',
        domain: 'trading',
        description: 'Run strategy in paper trading mode',
        icon: 'fa-file-invoice-dollar',
        toolchain: 'trading',
        estimatedCost: { min: 0.10, max: 0.50, typical: 0.20 },
        estimatedTime: { min: 86400, max: 604800, typical: 259200 },
        riskLevel: 'low',
        requiresApproval: false,
        requiredPlan: 'pro',
        examples: [
          'Test strategy live',
          'Validate execution',
          'Monitor performance',
        ],
      },
      {
        id: 'trading-live',
        name: 'Live Trading',
        domain: 'trading',
        description: 'Execute real trades with risk controls',
        icon: 'fa-dollar-sign',
        toolchain: 'trading',
        estimatedCost: { min: 0.50, max: 5.00, typical: 1.00 },
        estimatedTime: { min: 86400, max: 2592000, typical: 604800 },
        riskLevel: 'high',
        requiresApproval: true,
        requiredPlan: 'enterprise',
        examples: [
          'Deploy validated strategy',
          'Automated trading',
          'Portfolio management',
        ],
      },
      {
        id: 'research-analysis',
        name: 'Research Analysis',
        domain: 'research',
        description: 'Gather and analyze data from multiple sources',
        icon: 'fa-search',
        toolchain: 'research',
        estimatedCost: { min: 0.10, max: 1.00, typical: 0.30 },
        estimatedTime: { min: 300, max: 1800, typical: 600 },
        riskLevel: 'low',
        requiresApproval: false,
        requiredPlan: 'pro',
        examples: [
          'Market research',
          'Competitor analysis',
          'Literature review',
        ],
      },
      {
        id: 'creative-storyboard',
        name: 'Storyboard Creation',
        domain: 'creative',
        description: 'Generate visual storyboard from script',
        icon: 'fa-film',
        toolchain: 'creative',
        estimatedCost: { min: 0.20, max: 2.00, typical: 0.50 },
        estimatedTime: { min: 600, max: 3600, typical: 1200 },
        riskLevel: 'low',
        requiresApproval: false,
        requiredPlan: 'pro',
        examples: [
          'Film scene planning',
          'Game cutscene',
          'Animation sequence',
        ],
      },
      {
        id: 'creative-render',
        name: 'Scene Rendering',
        domain: 'creative',
        description: 'Render final scene with lighting and effects',
        icon: 'fa-image',
        toolchain: 'creative',
        estimatedCost: { min: 1.00, max: 10.00, typical: 3.00 },
        estimatedTime: { min: 1800, max: 7200, typical: 3600 },
        riskLevel: 'medium',
        requiresApproval: false,
        requiredPlan: 'pro',
        examples: [
          'Final render',
          'Preview generation',
          'Asset creation',
        ],
      },
      {
        id: 'creative-publish',
        name: 'Asset Publishing',
        domain: 'creative',
        description: 'Publish asset to marketplace',
        icon: 'fa-upload',
        toolchain: 'creative',
        estimatedCost: { min: 0.05, max: 0.20, typical: 0.10 },
        estimatedTime: { min: 60, max: 300, typical: 120 },
        riskLevel: 'high',
        requiresApproval: true,
        requiredPlan: 'pro',
        examples: [
          'Publish 3D model',
          'Share animation',
          'Release game asset',
        ],
      },
    ];
  }

  private startMission(preset: MissionPreset): void {
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

    // Simulate mission execution
    setTimeout(() => this.executeMission(mission.id), 1000);
  }

  private executeMission(missionId: string): void {
    const mission = this.missions.find(m => m.id === missionId);
    if (!mission) return;

    mission.status = 'running';
    this.update();

    // Simulate progress
    const interval = setInterval(() => {
      if (mission.status !== 'running') {
        clearInterval(interval);
        return;
      }

      mission.progress += 0.1;
      mission.actualCost += mission.estimatedCost * 0.1;

      if (mission.progress >= 0.3 && mission.currentStage === 'Initializing') {
        mission.currentStage = 'Processing';
      } else if (mission.progress >= 0.7 && mission.currentStage === 'Processing') {
        mission.currentStage = 'Finalizing';
      }

      if (mission.progress >= 1.0) {
        mission.progress = 1.0;
        mission.status = 'completed';
        mission.currentStage = 'Completed';
        clearInterval(interval);
      }

      this.update();
    }, 1000);
  }

  private pauseMission(missionId: string): void {
    const mission = this.missions.find(m => m.id === missionId);
    if (mission) {
      mission.status = 'paused';
      this.update();
    }
  }

  private resumeMission(missionId: string): void {
    const mission = this.missions.find(m => m.id === missionId);
    if (mission) {
      mission.status = 'running';
      this.executeMission(missionId);
      this.update();
    }
  }

  private cancelMission(missionId: string): void {
    const mission = this.missions.find(m => m.id === missionId);
    if (mission) {
      mission.status = 'failed';
      mission.errors.push('Mission cancelled by user');
      this.update();
    }
  }

  private removeMission(missionId: string): void {
    this.missions = this.missions.filter(m => m.id !== missionId);
    this.update();
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }

  private formatETA(timestamp: number): string {
    const remaining = timestamp - Date.now();
    if (remaining < 0) return 'Overdue';
    return this.formatDuration(Math.floor(remaining / 1000));
  }
}
