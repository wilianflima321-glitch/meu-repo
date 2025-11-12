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
exports.MWMultiSelect = exports.MultiSelectBar = void 0;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("@theia/core/shared/react"));
const memory_widget_components_1 = require("./memory-widget-components");
const MultiSelectBar = ({ items, onSelectionChanged, id }) => {
    const changeHandler = React.useCallback(e => {
        onSelectionChanged(e.target.id, e.target.checked);
    }, [onSelectionChanged]);
    return (React.createElement("div", { className: 'multi-select-bar', id: id }, items.map(({ label, id: itemId, defaultChecked }) => (React.createElement(LabeledCheckbox, { label: label, onChange: changeHandler, defaultChecked: !!defaultChecked, id: itemId, key: `${label}-${id}-checkbox` })))));
};
exports.MultiSelectBar = MultiSelectBar;
const LabeledCheckbox = ({ defaultChecked, label, onChange, id }) => (React.createElement("div", { className: 'multi-select-checkbox-wrapper' },
    React.createElement("input", { tabIndex: 0, type: 'checkbox', id: id, className: 'multi-select-checkbox', defaultChecked: defaultChecked, onChange: onChange }),
    React.createElement(memory_widget_components_1.MWLabel, { id: id, label: label, classNames: ['multi-select-label'] })));
const MWMultiSelect = ({ id, label, disabled, items, onSelectionChanged }) => (React.createElement(React.Fragment, null,
    React.createElement(memory_widget_components_1.MWLabel, { id: id, label: label, disabled: disabled }),
    React.createElement(exports.MultiSelectBar, { id: id, items: items, onSelectionChanged: onSelectionChanged })));
exports.MWMultiSelect = MWMultiSelect;
//# sourceMappingURL=multi-select-bar.js.map