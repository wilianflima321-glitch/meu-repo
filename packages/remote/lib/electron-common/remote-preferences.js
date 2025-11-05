"use strict";
// *****************************************************************************
// Copyright (C) 2023 TypeFox and others.
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
exports.bindRemotePreferences = exports.RemotePreferences = exports.RemotePreferenceContribution = exports.RemotePreferenceSchema = void 0;
const core_1 = require("@theia/core");
const nls_1 = require("@theia/core/lib/common/nls");
const injectable_preference_proxy_1 = require("@theia/core/lib/common/preferences/injectable-preference-proxy");
const preference_schema_1 = require("@theia/core/lib/common/preferences/preference-schema");
const nodeDownloadTemplateParts = [
    nls_1.nls.localize('theia/remote/nodeDownloadTemplateVersion', '`{version}` for the used node version'),
    nls_1.nls.localize('theia/remote/nodeDownloadTemplateOS', '`{os}` for the remote operating system. Either `win`, `linux` or `darwin`.'),
    nls_1.nls.localize('theia/remote/nodeDownloadTemplateArch', '`{arch}` for the remote system architecture.'),
    nls_1.nls.localize('theia/remote/nodeDownloadTemplateExt', '`{ext}` for the file extension. Either `zip`, `tar.xz` or `tar.xz`, depending on the operating system.')
];
exports.RemotePreferenceSchema = {
    properties: {
        'remote.nodeDownloadTemplate': {
            type: 'string',
            default: '',
            markdownDescription: nls_1.nls.localize('theia/remote/nodeDownloadTemplate', 'Controls the template used to download the node.js binaries for the remote backend. Points to the official node.js website by default. Uses multiple placeholders:') + '\n- ' + nodeDownloadTemplateParts.join('\n- ')
        },
        'remote.ssh.configFile': {
            type: 'string',
            default: core_1.OS.backend.isWindows ? '${env:USERPROFILE}\\.ssh\\config' : '${env:HOME}/.ssh/config',
            markdownDescription: nls_1.nls.localize('theia/remote/ssh/configFile', 'Remote SSH Config file')
        },
    }
};
exports.RemotePreferenceContribution = Symbol('RemotePreferenceContribution');
exports.RemotePreferences = Symbol('GettingStartedPreferences');
function bindRemotePreferences(bind) {
    bind(exports.RemotePreferences).toDynamicValue(ctx => {
        const factory = ctx.container.get(injectable_preference_proxy_1.PreferenceProxyFactory);
        return factory(exports.RemotePreferenceSchema);
    }).inSingletonScope();
    bind(exports.RemotePreferenceContribution).toConstantValue({ schema: exports.RemotePreferenceSchema });
    bind(preference_schema_1.PreferenceContribution).toService(exports.RemotePreferenceContribution);
}
exports.bindRemotePreferences = bindRemotePreferences;
//# sourceMappingURL=remote-preferences.js.map