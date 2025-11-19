import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { AiIdeBrandingWidget } from './ai-ide-branding-widget';
export declare class AiIdeBrandingContribution implements FrontendApplicationContribution {
    private readonly widget;
    constructor(widget: AiIdeBrandingWidget);
    onStart(app: FrontendApplication): Promise<void>;
}
