/********************************************************************************
 * Copyright (C) 2019 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/
import { AbstractViewContribution, FrontendApplicationContribution, Widget } from '@theia/core/lib/browser';
import { ColorContribution } from '@theia/core/lib/browser/color-application-contribution';
import { ColorRegistry } from '@theia/core/lib/browser/color-registry';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { CommandRegistry, MenuModelRegistry } from '@theia/core/lib/common';
import { DebugFrontendApplicationContribution } from '@theia/debug/lib/browser/debug-frontend-application-contribution';
import { MemoryProviderService } from './memory-provider/memory-provider-service';
import { MemoryWidget } from './memory-widget/memory-widget';
import { MemoryWidgetManager } from './utils/memory-widget-manager';
import { MemoryLayoutWidget } from './wrapper-widgets/memory-layout-widget';
export declare class DebugFrontendContribution extends AbstractViewContribution<MemoryLayoutWidget> implements FrontendApplicationContribution, TabBarToolbarContribution, ColorContribution {
    protected readonly debugContribution: DebugFrontendApplicationContribution;
    protected readonly memoryWidgetManager: MemoryWidgetManager;
    protected readonly stateService: FrontendApplicationStateService;
    protected readonly memoryProvider: MemoryProviderService;
    constructor();
    init(): void;
    initializeLayout(): Promise<void>;
    registerCommands(registry: CommandRegistry): void;
    protected isPointer(type?: string): boolean;
    /**
     * @param {string} addressReference Should be the exact string to be used in the address bar. I.e. it must resolve to an address value.
     */
    protected openMemoryWidgetAt(addressReference: string): Promise<MemoryWidget>;
    protected openRegisterWidgetWithReg(name: string): Promise<MemoryWidget>;
    protected withWidget(fn: (widget: MemoryLayoutWidget) => boolean, widget?: Widget | undefined): boolean;
    registerMenus(registry: MenuModelRegistry): void;
    registerToolbarItems(toolbarRegistry: TabBarToolbarRegistry): void;
    registerColors(colorRegistry: ColorRegistry): void;
}
//# sourceMappingURL=memory-inspector-frontend-contribution.d.ts.map