import { PreferenceService } from '@theia/core/lib/common';
import { LanguageModel, LanguageModelResponse, UserRequest } from '../common';
import { LanguageModelServiceImpl } from '../common/language-model-service';
import { RequestSetting } from '../common/ai-core-preferences';
export declare class FrontendLanguageModelServiceImpl extends LanguageModelServiceImpl {
    protected preferenceService: PreferenceService;
    sendRequest(languageModel: LanguageModel, languageModelRequest: UserRequest): Promise<LanguageModelResponse>;
}
export declare const mergeRequestSettings: (requestSettings: RequestSetting[], modelId: string, providerId: string, agentId?: string) => RequestSetting;
//# sourceMappingURL=frontend-language-model-service.d.ts.map