"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanOSSDialog = exports.ScanOSSScanButtonAction = void 0;
const tslib_1 = require("tslib");
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
// ***
const inversify_1 = require("@theia/core/shared/inversify");
const scanoss_1 = require("@theia/scanoss");
const browser_1 = require("@theia/core/lib/browser");
const React = require("@theia/core/shared/react");
const react_dialog_1 = require("@theia/core/lib/browser/dialogs/react-dialog");
const scanoss_preferences_1 = require("@theia/scanoss/lib/common/scanoss-preferences");
const ai_scanoss_preferences_1 = require("../common/ai-scanoss-preferences");
const core_1 = require("@theia/core");
function hasScanOSSResults(data) {
    return 'scanOSSResults' in data && data.scanOSSResults instanceof Map;
}
let ScanOSSScanButtonAction = class ScanOSSScanButtonAction {
    constructor() {
        this.priority = 0;
    }
    canRender(response, parentNode) {
        if (!hasScanOSSResults(parentNode.response.data)) {
            parentNode.response.data.scanOSSResults = new Map();
        }
        const results = parentNode.response.data
            .scanOSSResults;
        const scanOSSMode = this.preferenceService.get(ai_scanoss_preferences_1.SCANOSS_MODE_PREF, 'off');
        // we mark the code for manual scanning in case it was not handled yet and the mode is manual or off.
        // this prevents a possibly unexpected automatic scan of "old" snippets if automatic scan is later turned on.
        if (results.get(response.code) === undefined && (scanOSSMode === 'off' || scanOSSMode === 'manual')) {
            results.set(response.code, false);
        }
        return scanOSSMode !== 'off';
    }
    render(response, parentNode) {
        const scanOSSResults = parentNode.response.data
            .scanOSSResults;
        return (React.createElement(ScanOSSIntegration, { key: 'scanoss', code: response.code, scanService: this.scanService, scanOSSResults: scanOSSResults, preferenceService: this.preferenceService }));
    }
};
exports.ScanOSSScanButtonAction = ScanOSSScanButtonAction;
tslib_1.__decorate([
    (0, inversify_1.inject)(scanoss_1.ScanOSSService),
    tslib_1.__metadata("design:type", Object)
], ScanOSSScanButtonAction.prototype, "scanService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], ScanOSSScanButtonAction.prototype, "preferenceService", void 0);
exports.ScanOSSScanButtonAction = ScanOSSScanButtonAction = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ScanOSSScanButtonAction);
const ScanOSSIntegration = React.memo((props) => {
    const [automaticCheck] = React.useState(() => props.preferenceService.get(ai_scanoss_preferences_1.SCANOSS_MODE_PREF, 'off') === 'automatic');
    const [scanOSSResult, setScanOSSResult] = React.useState(props.scanOSSResults.get(props.code));
    const scanCode = React.useCallback(async () => {
        setScanOSSResult('pending');
        const result = await props.scanService.scanContent(props.code, props.preferenceService.get(scanoss_preferences_1.SCAN_OSS_API_KEY_PREF, undefined));
        setScanOSSResult(result);
        props.scanOSSResults.set(props.code, result);
        return result;
    }, [props.code, props.scanService]);
    React.useEffect(() => {
        if (scanOSSResult === undefined) {
            if (automaticCheck) {
                scanCode();
            }
            else {
                // sanity fallback. This codepath should already be handled via "canRender"
                props.scanOSSResults.set(props.code, false);
            }
        }
    }, []);
    const scanOSSClicked = React.useCallback(async () => {
        let scanResult = scanOSSResult;
        if (scanResult === 'pending') {
            return;
        }
        if (!scanResult || scanResult.type === 'error') {
            scanResult = await scanCode();
        }
        if (scanResult && scanResult.type === 'match') {
            const dialog = new ScanOSSDialog([scanResult]);
            dialog.open();
        }
    }, [scanOSSResult]);
    let title = 'SCANOSS - Perform scan';
    if (scanOSSResult) {
        if (scanOSSResult === 'pending') {
            title = core_1.nls.localize('theia/ai/scanoss/snippet/in-progress', 'SCANOSS - Performing scan...');
        }
        else if (scanOSSResult.type === 'error') {
            title = core_1.nls.localize('theia/ai/scanoss/snippet/errored', 'SCANOSS - Error - {0}', scanOSSResult.message);
        }
        else if (scanOSSResult.type === 'match') {
            title = core_1.nls.localize('theia/ai/scanoss/snippet/matched', 'SCANOSS - Found {0} match', scanOSSResult.matched);
        }
        else if (scanOSSResult.type === 'clean') {
            title = core_1.nls.localize('theia/ai/scanoss/snippet/no-match', 'SCANOSS - No match');
        }
    }
    return (React.createElement("div", { className: `button scanoss-icon icon-container ${scanOSSResult === 'pending'
            ? 'pending'
            : scanOSSResult
                ? scanOSSResult.type
                : ''}`, title: title, role: "button", onClick: scanOSSClicked }, scanOSSResult && scanOSSResult !== 'pending' && (React.createElement("span", { className: "status-icon" },
        scanOSSResult.type === 'clean' && React.createElement("span", { className: "codicon codicon-pass-filled" }),
        scanOSSResult.type === 'match' && React.createElement("span", { className: "codicon codicon-warning" }),
        scanOSSResult.type === 'error' && React.createElement("span", { className: "codicon codicon-error" })))));
});
class ScanOSSDialog extends react_dialog_1.ReactDialog {
    constructor(results) {
        super({
            title: core_1.nls.localize('theia/ai/scanoss/snippet/dialog-header', 'ScanOSS Results'),
        });
        this.results = results;
        this.appendAcceptButton(browser_1.Dialog.OK);
        this.update();
    }
    render() {
        return (React.createElement("div", { className: "scanoss-dialog-container" },
            this.renderHeader(),
            this.renderSummary(),
            this.renderContent()));
    }
    renderHeader() {
        return (React.createElement("div", { className: "scanoss-header" },
            React.createElement("div", { className: "scanoss-icon-container" },
                React.createElement("div", { className: "scanoss-icon" }),
                React.createElement("h2", null, "SCANOSS"))));
    }
    renderSummary() {
        return (React.createElement("div", { className: "scanoss-summary" },
            React.createElement("h3", null, core_1.nls.localize('theia/ai/scanoss/snippet/summary', 'Summary')),
            React.createElement("div", null, core_1.nls.localize('theia/ai/scanoss/snippet/match-count', 'Found {0} match(es)', this.results.length))));
    }
    renderContent() {
        return (React.createElement("div", { className: "scanoss-details" },
            React.createElement("h4", null, core_1.nls.localizeByDefault('Details')),
            this.results.map(result => React.createElement("div", { key: result.matched },
                result.file && React.createElement("h4", null, core_1.nls.localize('theia/ai/scanoss/snippet/file-name-heading', 'Match found in {0}', result.file)),
                React.createElement("a", { href: result.url, target: "_blank", rel: "noopener noreferrer" }, result.url),
                React.createElement("pre", null, JSON.stringify(result.raw, undefined, 2))))));
    }
    get value() {
        return undefined;
    }
}
exports.ScanOSSDialog = ScanOSSDialog;
//# sourceMappingURL=ai-scanoss-code-scan-action.js.map