import { ITheme } from 'xterm';
import { ColorRegistry } from '@theia/core/lib/browser/color-registry';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { ThemeChangeEvent } from '@theia/core/lib/common/theme';
import { Event } from '@theia/core';
export declare class TerminalThemeService {
    protected readonly colorRegistry: ColorRegistry;
    protected readonly themeService: ThemeService;
    get onDidChange(): Event<ThemeChangeEvent>;
    get theme(): ITheme;
}
//# sourceMappingURL=terminal-theme-service.d.ts.map