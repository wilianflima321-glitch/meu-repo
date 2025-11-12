import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import type { Widget } from '@theia/core/lib/browser/widgets/widget';
import { AiIdeBrandingWidget } from './ai-ide-branding-widget';

@injectable()
export class AiIdeBrandingContribution implements FrontendApplicationContribution {
    constructor(
        @inject(AiIdeBrandingWidget) private readonly widget: AiIdeBrandingWidget,
    ) {}

    async onStart(app: FrontendApplication): Promise<void> {
        // Ensure the branding bar is attached once the shell is ready.
        if (!this.widget.isAttached) {
            app.shell.addWidget(this.widget as unknown as Widget, { area: 'top' });
        }
    }
}
