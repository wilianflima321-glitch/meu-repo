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
exports.MWMoreMemorySelect = exports.MWInputWithSelect = exports.MWSelectWithName = exports.MWSelect = exports.MWInput = exports.MWLabel = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/core/lib/browser");
const React = tslib_1.__importStar(require("@theia/core/shared/react"));
const MWLabel = ({ id, label, disabled, classNames }) => {
    const additionalClassNames = classNames ? classNames.join(' ') : '';
    return React.createElement("label", { htmlFor: id, className: `t-mv-label theia-header no-select ${additionalClassNames}${disabled ? ' disabled' : ''}` }, label);
};
exports.MWLabel = MWLabel;
const MWInput = ({ id, label, passRef, defaultValue, onChange, title, onKeyDown, disabled }) => (React.createElement(React.Fragment, null,
    React.createElement(exports.MWLabel, { id: id, label: label, disabled: disabled }),
    React.createElement("input", { tabIndex: 0, type: 'text', ref: passRef, id: id, className: 'theia-input t-mv-input', defaultValue: defaultValue, onChange: onChange, onKeyDown: onKeyDown, title: title, spellCheck: false, disabled: disabled })));
exports.MWInput = MWInput;
const MWSelect = ({ id, label, options, passRef, onChange, title, value, disabled }) => (React.createElement(React.Fragment, null,
    React.createElement(exports.MWLabel, { id: id, label: label, disabled: disabled }),
    React.createElement("select", { tabIndex: 0, ref: passRef, id: id, className: 'theia-select t-mv-select', value: value, onChange: onChange, title: title, disabled: disabled }, options.map(option => React.createElement("option", { value: option, key: option }, option)))));
exports.MWSelect = MWSelect;
const MWSelectWithName = ({ id, label, options, passRef, onChange, title, value, disabled }) => (React.createElement(React.Fragment, null,
    React.createElement(exports.MWLabel, { id: id, label: label, disabled: disabled }),
    React.createElement("select", { tabIndex: 0, ref: passRef, id: id, className: 'theia-select', value: value, onChange: onChange, title: title, disabled: disabled }, options.map(option => React.createElement("option", { value: option[0], key: option[0] }, option[1])))));
exports.MWSelectWithName = MWSelectWithName;
const MWInputWithSelect = ({ id, label, passRef, onKeyDown, title, options, onSelectChange, defaultValue, disabled, placeholder }) => (React.createElement(React.Fragment, null,
    React.createElement(exports.MWLabel, { id: id, label: label, disabled: disabled }),
    React.createElement("div", { className: 'mw-input-select' },
        React.createElement("input", { tabIndex: 0, type: 'text', ref: passRef, id: id, className: 'theia-input t-mv-input', defaultValue: defaultValue, onKeyDown: onKeyDown, title: title, spellCheck: false, disabled: disabled, placeholder: placeholder }),
        React.createElement("select", { className: 'theia-select t-mv-select', onChange: onSelectChange, disabled: disabled || (options.length === 0) }, options.reverse().map(option => React.createElement("option", { key: `'mw-input-select'-${id}-${option}`, value: option }, option))))));
exports.MWInputWithSelect = MWInputWithSelect;
const MWMoreMemorySelect = ({ options, handler, direction }) => {
    const [numBytes, setNumBytes] = React.useState(options[0]);
    const containerRef = React.createRef();
    const onSelectChange = (e) => {
        e.stopPropagation();
        const { value } = e.currentTarget;
        setNumBytes(parseInt(value));
    };
    const loadMoreMemory = (e) => {
        var _a, _b;
        (_a = containerRef.current) === null || _a === void 0 ? void 0 : _a.blur();
        const doHandle = !('key' in e) || ((_b = browser_1.KeyCode.createKeyCode(e.nativeEvent).key) === null || _b === void 0 ? void 0 : _b.keyCode) === browser_1.Key.ENTER.keyCode;
        if (doHandle) {
            handler({
                numBytes,
                direction,
            });
        }
    };
    return (React.createElement("div", { className: 'mw-more-memory-select', tabIndex: 0, role: 'button', onClick: loadMoreMemory, onKeyDown: loadMoreMemory, ref: containerRef },
        React.createElement("div", { className: 'mw-more-memory-select-top no-select' },
            "Load",
            React.createElement("select", { className: 'theia-select', onChange: onSelectChange, tabIndex: 0 }, options.map(option => (React.createElement("option", { key: `mw-more-memory-select-${option}`, value: option }, option)))),
            `more bytes ${direction}`)));
};
exports.MWMoreMemorySelect = MWMoreMemorySelect;
//# sourceMappingURL=memory-widget-components.js.map