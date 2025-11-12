"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
require("../../src/browser/register-widget/register-widget.css");
require("../../src/browser/style/index.css");
require("../../src/browser/utils/multi-select-bar.css");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const color_application_contribution_1 = require("@theia/core/lib/browser/color-application-contribution");
const tab_bar_toolbar_1 = require("@theia/core/lib/browser/shell/tab-bar-toolbar");
const inversify_1 = require("@theia/core/shared/inversify");
const memory_inspector_frontend_contribution_1 = require("./memory-inspector-frontend-contribution");
const memory_diff_options_widget_1 = require("./diff-widget/memory-diff-options-widget");
const memory_diff_select_widget_1 = require("./diff-widget/memory-diff-select-widget");
const memory_diff_table_widget_1 = require("./diff-widget/memory-diff-table-widget");
const memory_editable_table_widget_1 = require("./editable-widget/memory-editable-table-widget");
const memory_provider_1 = require("./memory-provider/memory-provider");
const memory_provider_service_1 = require("./memory-provider/memory-provider-service");
const memory_options_widget_1 = require("./memory-widget/memory-options-widget");
const memory_table_widget_1 = require("./memory-widget/memory-table-widget");
const memory_widget_1 = require("./memory-widget/memory-widget");
const register_options_widget_1 = require("./register-widget/register-options-widget");
const register_table_widget_1 = require("./register-widget/register-table-widget");
const register_widget_types_1 = require("./register-widget/register-widget-types");
const memory_hover_renderer_1 = require("./utils/memory-hover-renderer");
const memory_widget_manager_1 = require("./utils/memory-widget-manager");
const memory_widget_utils_1 = require("./utils/memory-widget-utils");
const memory_dock_panel_1 = require("./wrapper-widgets/memory-dock-panel");
const memory_dockpanel_placeholder_widget_1 = require("./wrapper-widgets/memory-dockpanel-placeholder-widget");
const memory_layout_widget_1 = require("./wrapper-widgets/memory-layout-widget");
const cdt_gdb_memory_provider_1 = require("./memory-provider/cdt-gdb-memory-provider");
exports.default = new inversify_1.ContainerModule(bind => {
    (0, browser_1.bindViewContribution)(bind, memory_inspector_frontend_contribution_1.DebugFrontendContribution);
    bind(color_application_contribution_1.ColorContribution).toService(memory_inspector_frontend_contribution_1.DebugFrontendContribution);
    bind(tab_bar_toolbar_1.TabBarToolbarContribution).toService(memory_inspector_frontend_contribution_1.DebugFrontendContribution);
    bind(browser_1.FrontendApplicationContribution).toService(memory_inspector_frontend_contribution_1.DebugFrontendContribution);
    bind(memory_provider_service_1.MemoryProviderService).toSelf().inSingletonScope();
    bind(memory_provider_1.DefaultMemoryProvider).toSelf().inSingletonScope();
    (0, core_1.bindContributionProvider)(bind, memory_provider_1.MemoryProvider);
    bind(memory_provider_1.MemoryProvider).to(cdt_gdb_memory_provider_1.CDTGDBMemoryProvider).inSingletonScope();
    bind(memory_layout_widget_1.MemoryLayoutWidget).toSelf().inSingletonScope();
    bind(memory_diff_select_widget_1.MemoryDiffSelectWidget).toSelf().inSingletonScope();
    bind(memory_dockpanel_placeholder_widget_1.MemoryDockpanelPlaceholder).toSelf().inSingletonScope();
    bind(memory_hover_renderer_1.MemoryHoverRendererService).toSelf().inSingletonScope();
    bind(memory_widget_manager_1.MemoryWidgetManager).toSelf().inSingletonScope();
    bind(browser_1.WidgetFactory).toDynamicValue(({ container }) => ({
        id: memory_dock_panel_1.MemoryDockPanel.ID,
        createWidget: () => memory_dock_panel_1.MemoryDockPanel.createWidget(container),
    }));
    bind(browser_1.WidgetFactory).toDynamicValue(({ container }) => ({
        id: memory_layout_widget_1.MemoryLayoutWidget.ID,
        createWidget: () => container.get(memory_layout_widget_1.MemoryLayoutWidget),
    })).inSingletonScope();
    bind(browser_1.WidgetFactory).toDynamicValue(({ container }) => ({
        id: memory_widget_1.MemoryWidget.ID,
        createWidget: (options) => memory_widget_1.MemoryWidget.createWidget(container, memory_options_widget_1.MemoryOptionsWidget, memory_table_widget_1.MemoryTableWidget, memory_widget_utils_1.MemoryWidgetOptions, options),
    }));
    bind(browser_1.WidgetFactory).toDynamicValue(({ container }) => ({
        id: memory_editable_table_widget_1.EditableMemoryWidget.ID,
        createWidget: (options) => memory_widget_1.MemoryWidget
            .createWidget(container, memory_options_widget_1.MemoryOptionsWidget, memory_editable_table_widget_1.MemoryEditableTableWidget, memory_widget_utils_1.MemoryWidgetOptions, options),
    }));
    bind(browser_1.WidgetFactory).toDynamicValue(({ container }) => ({
        id: memory_diff_table_widget_1.MemoryDiffWidget.ID,
        createWidget: (options) => memory_widget_1.MemoryWidget
            .createWidget(container, memory_diff_options_widget_1.MemoryDiffOptionsWidget, memory_diff_table_widget_1.MemoryDiffTableWidget, memory_widget_utils_1.MemoryDiffWidgetData, options),
    }));
    bind(browser_1.WidgetFactory).toDynamicValue(({ container }) => ({
        id: register_widget_types_1.RegisterWidget.ID,
        createWidget: (options) => register_widget_types_1.RegisterWidget
            .createContainer(container, register_options_widget_1.RegisterOptionsWidget, register_table_widget_1.RegisterTableWidget, memory_widget_utils_1.RegisterWidgetOptions, options).get(memory_widget_1.MemoryWidget),
    }));
});
//# sourceMappingURL=memory-inspector-frontend-module.js.map