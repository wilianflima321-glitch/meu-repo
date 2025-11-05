"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
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
exports.ToolConfirmation = void 0;
const React = require("@theia/core/shared/react");
const nls_1 = require("@theia/core/lib/common/nls");
const browser_1 = require("@theia/core/lib/browser");
/**
 * Component that displays approval/denial buttons for tool execution
 */
const ToolConfirmation = ({ response, onAllow, onDeny }) => {
    const [state, setState] = React.useState('waiting');
    // Track selected mode for each action
    const [allowMode, setAllowMode] = React.useState('once');
    const [denyMode, setDenyMode] = React.useState('once');
    const [dropdownOpen, setDropdownOpen] = React.useState(undefined);
    const handleAllow = React.useCallback(() => {
        setState('allowed');
        onAllow(allowMode);
    }, [onAllow, allowMode]);
    const handleDeny = React.useCallback(() => {
        setState('denied');
        onDeny(denyMode);
    }, [onDeny, denyMode]);
    if (state === 'allowed') {
        return (React.createElement("div", { className: "theia-tool-confirmation-status allowed" },
            React.createElement("span", { className: (0, browser_1.codicon)('check') }),
            " ",
            nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/allowed', 'Tool execution allowed')));
    }
    if (state === 'denied') {
        return (React.createElement("div", { className: "theia-tool-confirmation-status denied" },
            React.createElement("span", { className: (0, browser_1.codicon)('close') }),
            " ",
            nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/denied', 'Tool execution denied')));
    }
    // Helper for dropdown options
    const MODES = ['once', 'session', 'forever'];
    // Unified labels for both main button and dropdown, as requested
    const modeLabel = (type, mode) => {
        if (type === 'allow') {
            switch (mode) {
                case 'once': return nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/allow', 'Allow');
                case 'session': return nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/allow-session', 'Allow for this Chat');
                case 'forever': return nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/allow-forever', 'Always Allow');
            }
        }
        else {
            switch (mode) {
                case 'once': return nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/deny', 'Deny');
                case 'session': return nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/deny-session', 'Deny for this Chat');
                case 'forever': return nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/deny-forever', 'Always Deny');
            }
        }
    };
    // Main button label is always the same as the dropdown label for the selected mode
    const mainButtonLabel = modeLabel; // Use the same function for both
    // Tooltips for dropdown options
    const modeTooltip = (type, mode) => {
        if (type === 'allow') {
            switch (mode) {
                case 'once': return nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/allow-tooltip', 'Allow this tool call once');
                case 'session': return nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/allow-session-tooltip', 'Allow all calls of this tool for this chat session');
                case 'forever': return nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/allow-forever-tooltip', 'Always allow this tool');
            }
        }
        else {
            switch (mode) {
                case 'once': return nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/deny-tooltip', 'Deny this tool call once');
                case 'session': return nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/deny-session-tooltip', 'Deny all calls of this tool for this chat session');
                case 'forever': return nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/deny-forever-tooltip', 'Always deny this tool');
            }
        }
    };
    // Split button for approve/deny
    const renderSplitButton = (type) => {
        const selectedMode = type === 'allow' ? allowMode : denyMode;
        const setMode = type === 'allow' ? setAllowMode : setDenyMode;
        const handleMain = type === 'allow' ? handleAllow : handleDeny;
        const otherModes = MODES.filter(m => m !== selectedMode);
        return (React.createElement("div", { className: `theia-tool-confirmation-split-button ${type}`, style: { display: 'inline-flex', position: 'relative' } },
            React.createElement("button", { className: `theia-button ${type === 'allow' ? 'primary' : 'secondary'} theia-tool-confirmation-main-btn`, onClick: handleMain }, mainButtonLabel(type, selectedMode)),
            React.createElement("button", { className: `theia-button ${type === 'allow' ? 'primary' : 'secondary'} theia-tool-confirmation-chevron-btn`, onClick: () => setDropdownOpen(dropdownOpen === type ? undefined : type), "aria-haspopup": "true", "aria-expanded": dropdownOpen === type, tabIndex: 0, title: type === 'allow' ? 'More Allow Options' : 'More Deny Options' },
                React.createElement("span", { className: (0, browser_1.codicon)('chevron-down') })),
            dropdownOpen === type && (React.createElement("ul", { className: "theia-tool-confirmation-dropdown-menu", onMouseLeave: () => setDropdownOpen(undefined) }, otherModes.map(mode => (React.createElement("li", { key: mode, className: "theia-tool-confirmation-dropdown-item", onClick: () => {
                    setMode(mode);
                    setDropdownOpen(undefined);
                }, title: modeTooltip(type, mode) }, modeLabel(type, mode))))))));
    };
    return (React.createElement("div", { className: "theia-tool-confirmation" },
        React.createElement("div", { className: "theia-tool-confirmation-header" },
            React.createElement("span", { className: (0, browser_1.codicon)('shield') }),
            " ",
            nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/header', 'Confirm Tool Execution')),
        React.createElement("div", { className: "theia-tool-confirmation-info" },
            React.createElement("div", { className: "theia-tool-confirmation-name" },
                React.createElement("span", { className: "label" },
                    nls_1.nls.localize('theia/ai/chat-ui/toolconfirmation/tool', 'Tool'),
                    ":"),
                React.createElement("span", { className: "value" }, response.name))),
        React.createElement("div", { className: "theia-tool-confirmation-actions" },
            renderSplitButton('deny'),
            renderSplitButton('allow'))));
};
exports.ToolConfirmation = ToolConfirmation;
//# sourceMappingURL=tool-confirmation.js.map