// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { DefaultPromptFragmentCustomizationService, PromptFragmentCustomizationProperties } from '@theia/ai-core/lib/browser/frontend-prompt-customization-service';
import {
    PROMPT_TEMPLATE_WORKSPACE_DIRECTORIES_PREF,
    PROMPT_TEMPLATE_ADDITIONAL_EXTENSIONS_PREF,
    PROMPT_TEMPLATE_WORKSPACE_FILES_PREF
} from '../common/workspace-preferences';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { Path, PreferenceService } from '@theia/core';

@injectable()
export class TemplatePreferenceContribution implements FrontendApplicationContribution {

    @inject(PreferenceService)
    private _preferenceService?: PreferenceService;
    @inject(PreferenceService)
    protected set preferenceService(v: PreferenceService) { this._preferenceService = v; }
    protected get preferenceService(): PreferenceService { if (!this._preferenceService) { throw new Error('TemplatePreferenceContribution: preferenceService not injected'); } return this._preferenceService; }

    @inject(DefaultPromptFragmentCustomizationService)
    private _customizationService?: DefaultPromptFragmentCustomizationService;
    @inject(DefaultPromptFragmentCustomizationService)
    protected set customizationService(v: DefaultPromptFragmentCustomizationService) { this._customizationService = v; }
    protected get customizationService(): DefaultPromptFragmentCustomizationService { if (!this._customizationService) { throw new Error('TemplatePreferenceContribution: customizationService not injected'); } return this._customizationService; }

    @inject(WorkspaceService)
    private _workspaceService?: WorkspaceService;
    @inject(WorkspaceService)
    protected set workspaceService(v: WorkspaceService) { this._workspaceService = v; }
    protected get workspaceService(): WorkspaceService { if (!this._workspaceService) { throw new Error('TemplatePreferenceContribution: workspaceService not injected'); } return this._workspaceService; }

    onStart(): void {
        Promise.all([this.preferenceService.ready, this.workspaceService.ready]).then(() => {
            // Set initial template configuration from preferences
            this.updateConfiguration();

            // Listen for preference changes
            this.preferenceService.onPreferenceChanged((event: any) => {
                if (event.preferenceName === PROMPT_TEMPLATE_WORKSPACE_DIRECTORIES_PREF ||
                    event.preferenceName === PROMPT_TEMPLATE_ADDITIONAL_EXTENSIONS_PREF ||
                    event.preferenceName === PROMPT_TEMPLATE_WORKSPACE_FILES_PREF) {
                    this.updateConfiguration(event.preferenceName);
                }
            });

            // Listen for workspace root changes
            this.workspaceService.onWorkspaceLocationChanged(() => {
                this.updateConfiguration();
            });
        });
    }

    /**
     * Updates the template configuration in the customization service.
     * If a specific preference name is provided, only that configuration aspect is updated.
     * @param changedPreference Optional name of the preference that changed
     */
    protected async updateConfiguration(changedPreference?: string): Promise<void> {
        const workspaceRoot = this.workspaceService.tryGetRoots()[0];
        if (!workspaceRoot) {
            return;
        }

        const workspaceRootUri = workspaceRoot.resource;
        const configProperties: PromptFragmentCustomizationProperties = {};

        const getPref = <T = unknown>(key: string, d: T): T => {
            const pref = this.preferenceService as unknown as { get?: (k: string, def: T) => T | undefined };
            const getter = pref?.get;
            if (typeof getter === 'function') {
                const v = getter.call(this.preferenceService, key, d) as T | undefined;
                return v === undefined ? d : v;
            }
            return d;
        };

        const formatUriPath = (uriRaw: unknown): string => {
            if (!uriRaw) {
                return '';
            }
            if (typeof uriRaw === 'object') {
                const p = (uriRaw as { path?: unknown }).path;
                if (p) {
                    if (typeof (p as { toString?: () => string }).toString === 'function') {
                        return (p as { toString?: () => string }).toString!();
                    }
                    return String(p);
                }
            }
            return '';
        };

        if (!changedPreference || changedPreference === PROMPT_TEMPLATE_WORKSPACE_DIRECTORIES_PREF) {
            const relativeDirectories = getPref<string[]>(PROMPT_TEMPLATE_WORKSPACE_DIRECTORIES_PREF, []);
            configProperties.directoryPaths = relativeDirectories.map(dir => {
                const path = new Path(dir);
                const resolveFn = (workspaceRootUri as unknown as { resolve?: (p: string) => unknown })?.resolve;
                const uri = typeof resolveFn === 'function' ? resolveFn.call(workspaceRootUri, path.toString()) : workspaceRootUri;
                return formatUriPath(uri);
            });
        }

        if (!changedPreference || changedPreference === PROMPT_TEMPLATE_ADDITIONAL_EXTENSIONS_PREF) {
            configProperties.extensions = getPref<string[]>(PROMPT_TEMPLATE_ADDITIONAL_EXTENSIONS_PREF, []);
        }

        if (!changedPreference || changedPreference === PROMPT_TEMPLATE_WORKSPACE_FILES_PREF) {
            const relativeFilePaths = getPref<string[]>(PROMPT_TEMPLATE_WORKSPACE_FILES_PREF, []);
            configProperties.filePaths = relativeFilePaths.map(filePath => {
                const path = new Path(filePath);
                const resolveFn = (workspaceRootUri as unknown as { resolve?: (p: string) => unknown })?.resolve;
                const uri = typeof resolveFn === 'function' ? resolveFn.call(workspaceRootUri, path.toString()) : workspaceRootUri;
                return formatUriPath(uri);
            });
        }

        await this.customizationService.updateConfiguration(configProperties);
    }
}
