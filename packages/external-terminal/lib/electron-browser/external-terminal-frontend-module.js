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
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/core/lib/common");
const browser_1 = require("@theia/core/lib/browser");
const external_terminal_preference_1 = require("./external-terminal-preference");
const external_terminal_contribution_1 = require("./external-terminal-contribution");
const external_terminal_1 = require("../common/external-terminal");
exports.default = new inversify_1.ContainerModule((bind) => {
    bind(external_terminal_contribution_1.ExternalTerminalFrontendContribution).toSelf().inSingletonScope();
    (0, external_terminal_preference_1.bindExternalTerminalPreferences)(bind);
    [common_1.CommandContribution, browser_1.KeybindingContribution].forEach(serviceIdentifier => bind(serviceIdentifier).toService(external_terminal_contribution_1.ExternalTerminalFrontendContribution));
    bind(external_terminal_1.ExternalTerminalService).toDynamicValue(ctx => browser_1.WebSocketConnectionProvider.createProxy(ctx.container, external_terminal_1.externalTerminalServicePath)).inSingletonScope();
});
//# sourceMappingURL=external-terminal-frontend-module.js.map