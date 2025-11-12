"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/core/lib/browser");
const ai_history_contribution_1 = require("./ai-history-contribution");
const ai_history_widget_1 = require("./ai-history-widget");
require("../../src/browser/style/ai-history.css");
const tab_bar_toolbar_1 = require("@theia/core/lib/browser/shell/tab-bar-toolbar");
exports.default = new inversify_1.ContainerModule(bind => {
    (0, browser_1.bindViewContribution)(bind, ai_history_contribution_1.AIHistoryViewContribution);
    bind(ai_history_widget_1.AIHistoryView).toSelf();
    bind(browser_1.WidgetFactory).toDynamicValue(context => ({
        id: ai_history_widget_1.AIHistoryView.ID,
        createWidget: () => context.container.get(ai_history_widget_1.AIHistoryView)
    })).inSingletonScope();
    bind(tab_bar_toolbar_1.TabBarToolbarContribution).toService(ai_history_contribution_1.AIHistoryViewContribution);
});
//# sourceMappingURL=ai-history-frontend-module.js.map