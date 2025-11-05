"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
require("../../src/browser/style/index.css");
const inversify_1 = require("@theia/core/shared/inversify");
const ai_scanoss_preferences_1 = require("../common/ai-scanoss-preferences");
const ai_scanoss_code_scan_action_1 = require("./ai-scanoss-code-scan-action");
const chat_response_renderer_1 = require("@theia/ai-chat-ui/lib/browser/chat-response-renderer");
const change_set_action_service_1 = require("@theia/ai-chat-ui/lib/browser/change-set-actions/change-set-action-service");
const change_set_scan_action_1 = require("./change-set-scan-action/change-set-scan-action");
const change_set_decorator_service_1 = require("@theia/ai-chat/lib/browser/change-set-decorator-service");
const change_set_scan_decorator_1 = require("./change-set-scan-action/change-set-scan-decorator");
const core_1 = require("@theia/core");
exports.default = new inversify_1.ContainerModule(bind => {
    bind(core_1.PreferenceContribution).toConstantValue({ schema: ai_scanoss_preferences_1.AIScanOSSPreferencesSchema });
    bind(ai_scanoss_code_scan_action_1.ScanOSSScanButtonAction).toSelf().inSingletonScope();
    bind(chat_response_renderer_1.CodePartRendererAction).toService(ai_scanoss_code_scan_action_1.ScanOSSScanButtonAction);
    bind(change_set_scan_action_1.ChangeSetScanActionRenderer).toSelf();
    bind(change_set_action_service_1.ChangeSetActionRenderer).toService(change_set_scan_action_1.ChangeSetScanActionRenderer);
    bind(change_set_scan_decorator_1.ChangeSetScanDecorator).toSelf().inSingletonScope();
    bind(change_set_decorator_service_1.ChangeSetDecorator).toService(change_set_scan_decorator_1.ChangeSetScanDecorator);
});
//# sourceMappingURL=ai-scanoss-frontend-module.js.map