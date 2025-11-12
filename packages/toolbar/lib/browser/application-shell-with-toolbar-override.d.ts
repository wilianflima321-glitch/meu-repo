import { ApplicationShell, Layout } from '@theia/core/lib/browser';
import { interfaces } from '@theia/core/shared/inversify';
import { Toolbar } from './toolbar-interfaces';
import { ToolbarPreferences } from '../common/toolbar-preference-contribution';
import { PreferenceService } from '@theia/core';
export declare class ApplicationShellWithToolbarOverride extends ApplicationShell {
    protected toolbarPreferences: ToolbarPreferences;
    protected readonly preferenceService: PreferenceService;
    protected readonly toolbarFactory: () => Toolbar;
    protected toolbar: Toolbar;
    protected init(): void;
    protected doInit(): Promise<void>;
    protected tryShowToolbar(): boolean;
    protected createLayout(): Layout;
}
export declare const bindToolbarApplicationShell: (bind: interfaces.Bind, rebind: interfaces.Rebind, unbind: interfaces.Unbind) => void;
//# sourceMappingURL=application-shell-with-toolbar-override.d.ts.map