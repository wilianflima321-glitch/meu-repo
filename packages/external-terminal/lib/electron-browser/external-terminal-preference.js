"use strict";
// *****************************************************************************
// Copyright (C) 2021 Ericsson and others.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExternalTerminalSchema = exports.ExternalTerminalPreferenceService = exports.bindExternalTerminalPreferences = exports.ExternalTerminalSchemaProvider = exports.ExternalTerminalPreferences = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const os_1 = require("@theia/core/lib/common/os");
const external_terminal_1 = require("../common/external-terminal");
const nls_1 = require("@theia/core/lib/common/nls");
const core_1 = require("@theia/core");
exports.ExternalTerminalPreferences = Symbol('ExternalTerminalPreferences');
exports.ExternalTerminalSchemaProvider = Symbol('ExternalTerminalSchemaPromise');
function bindExternalTerminalPreferences(bind) {
    bind(ExternalTerminalPreferenceService).toSelf().inSingletonScope();
    bind(exports.ExternalTerminalSchemaProvider)
        .toProvider(ctx => {
        const schema = getExternalTerminalSchema(ctx.container.get(external_terminal_1.ExternalTerminalService));
        return () => schema;
    });
    bind(exports.ExternalTerminalPreferences)
        .toDynamicValue(ctx => {
        const factory = ctx.container.get(core_1.PreferenceProxyFactory);
        const schemaProvider = ctx.container.get(exports.ExternalTerminalSchemaProvider);
        return factory(schemaProvider());
    })
        .inSingletonScope();
}
exports.bindExternalTerminalPreferences = bindExternalTerminalPreferences;
let ExternalTerminalPreferenceService = class ExternalTerminalPreferenceService {
    init() {
        this.doInit();
    }
    async doInit() {
        this.preferenceSchemaProvider.addSchema(await this.promisedSchema());
    }
    /**
     * Get the external terminal configurations from preferences.
     */
    getExternalTerminalConfiguration() {
        return {
            'terminal.external.linuxExec': this.preferences['terminal.external.linuxExec'],
            'terminal.external.osxExec': this.preferences['terminal.external.osxExec'],
            'terminal.external.windowsExec': this.preferences['terminal.external.windowsExec'],
        };
    }
};
exports.ExternalTerminalPreferenceService = ExternalTerminalPreferenceService;
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.ExternalTerminalPreferences),
    tslib_1.__metadata("design:type", Object)
], ExternalTerminalPreferenceService.prototype, "preferences", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceSchemaService),
    tslib_1.__metadata("design:type", Object)
], ExternalTerminalPreferenceService.prototype, "preferenceSchemaProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.ExternalTerminalSchemaProvider),
    tslib_1.__metadata("design:type", Function)
], ExternalTerminalPreferenceService.prototype, "promisedSchema", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ExternalTerminalPreferenceService.prototype, "init", null);
exports.ExternalTerminalPreferenceService = ExternalTerminalPreferenceService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ExternalTerminalPreferenceService);
/**
 * Use the backend {@link ExternalTerminalService} to establish the schema for the `ExternalTerminalPreferences`.
 *
 * @param externalTerminalService the external terminal backend service.
 * @returns a preference schema with the OS default exec set by the backend service.
 */
async function getExternalTerminalSchema(externalTerminalService) {
    const hostExec = await externalTerminalService.getDefaultExec();
    return {
        properties: {
            'terminal.external.windowsExec': {
                type: 'string',
                typeDetails: { isFilepath: true },
                description: nls_1.nls.localizeByDefault('Customizes which terminal to run on Windows.'),
                default: `${os_1.isWindows ? hostExec : 'C:\\WINDOWS\\System32\\cmd.exe'}`
            },
            'terminal.external.osxExec': {
                type: 'string',
                description: nls_1.nls.localizeByDefault('Customizes which terminal application to run on macOS.'),
                default: `${os_1.isOSX ? hostExec : 'Terminal.app'}`
            },
            'terminal.external.linuxExec': {
                type: 'string',
                description: nls_1.nls.localizeByDefault('Customizes which terminal to run on Linux.'),
                default: `${!(os_1.isWindows || os_1.isOSX) ? hostExec : 'xterm'}`
            }
        }
    };
}
exports.getExternalTerminalSchema = getExternalTerminalSchema;
//# sourceMappingURL=external-terminal-preference.js.map