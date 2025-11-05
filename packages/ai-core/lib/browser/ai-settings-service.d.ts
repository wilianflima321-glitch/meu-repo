import { DisposableCollection, Emitter, Event, ILogger } from '@theia/core';
import { PreferenceService } from '@theia/core/lib/common';
import { AISettings, AISettingsService, AgentSettings } from '../common';
export declare class AISettingsServiceImpl implements AISettingsService {
    protected readonly logger: ILogger;
    protected preferenceService: PreferenceService;
    static readonly PREFERENCE_NAME = "ai-features.agentSettings";
    protected toDispose: DisposableCollection;
    protected readonly onDidChangeEmitter: Emitter<void>;
    onDidChange: Event<void>;
    protected init(): void;
    updateAgentSettings(agent: string, agentSettings: Partial<AgentSettings>): Promise<void>;
    getAgentSettings(agent: string): Promise<AgentSettings | undefined>;
    getSettings(): Promise<AISettings>;
}
//# sourceMappingURL=ai-settings-service.d.ts.map