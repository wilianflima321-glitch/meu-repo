"use strict";
/********************************************************************************
 * Copyright (C) 2021 Ericsson and others.
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
exports.RegisterWidget = void 0;
const core_1 = require("@theia/core");
const memory_widget_1 = require("../memory-widget/memory-widget");
const memory_widget_utils_1 = require("../utils/memory-widget-utils");
const register_filter_service_1 = require("./register-filter-service");
const register_options_widget_1 = require("./register-options-widget");
var RegisterWidget;
(function (RegisterWidget) {
    RegisterWidget.ID = 'register-view-options-widget';
    RegisterWidget.LABEL = core_1.nls.localize('theia/memory-inspector/register', 'Register');
    RegisterWidget.is = (widget) => widget.optionsWidget instanceof register_options_widget_1.RegisterOptionsWidget;
    RegisterWidget.createContainer = (parent, optionsWidget, tableWidget, optionSymbol = memory_widget_utils_1.MemoryWidgetOptions, options) => {
        const child = memory_widget_1.MemoryWidget.createContainer(parent, optionsWidget, tableWidget, optionSymbol, options);
        child.bind(register_filter_service_1.RegisterFilterService).to(register_filter_service_1.RegisterFilterServiceImpl).inSingletonScope();
        child.bind(register_filter_service_1.RegisterFilterServiceOptions).toConstantValue({});
        return child;
    };
})(RegisterWidget || (exports.RegisterWidget = RegisterWidget = {}));
//# sourceMappingURL=register-widget-types.js.map