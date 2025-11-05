"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH and others.
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
exports.ChangeSetScanActionRenderer = void 0;
const tslib_1 = require("tslib");
const React = require("@theia/core/shared/react");
const inversify_1 = require("@theia/core/shared/inversify");
const preferences_1 = require("@theia/core/lib/common/preferences");
const scanoss_1 = require("@theia/scanoss");
const ai_scanoss_preferences_1 = require("../../common/ai-scanoss-preferences");
const scanoss_preferences_1 = require("@theia/scanoss/lib/common/scanoss-preferences");
const change_set_file_element_1 = require("@theia/ai-chat/lib/browser/change-set-file-element");
const ai_scanoss_code_scan_action_1 = require("../ai-scanoss-code-scan-action");
const standaloneServices_1 = require("@theia/monaco-editor-core/esm/vs/editor/standalone/browser/standaloneServices");
const diffProviderFactoryService_1 = require("@theia/monaco-editor-core/esm/vs/editor/browser/widget/diffEditor/diffProviderFactoryService");
const monaco_text_model_service_1 = require("@theia/monaco/lib/browser/monaco-text-model-service");
const core_1 = require("@theia/core");
const change_set_scan_decorator_1 = require("./change-set-scan-decorator");
const browser_1 = require("@theia/ai-core/lib/browser");
let ChangeSetScanActionRenderer = class ChangeSetScanActionRenderer {
    constructor() {
        this.id = 'change-set-scanoss';
        this.priority = 10;
        this.onDidChangeEmitter = new core_1.Emitter();
        this.onDidChange = this.onDidChangeEmitter.event;
    }
    init() {
        this.differ = standaloneServices_1.StandaloneServices.get(diffProviderFactoryService_1.IDiffProviderFactoryService).createDiffProvider({ diffAlgorithm: 'advanced' });
        this._scan = this.runScan.bind(this);
        this.preferenceService.onPreferenceChanged(e => e.affects(ai_scanoss_preferences_1.SCANOSS_MODE_PREF) && this.onDidChangeEmitter.fire());
    }
    canRender() {
        return this.activationService.isActive;
    }
    render(changeSet) {
        return (React.createElement(ChangeSetScanOSSIntegration, { changeSet: changeSet, decorator: this.scanChangeSetDecorator, scanOssMode: this.getPreferenceValues(), scanChangeSet: this._scan }));
    }
    getPreferenceValues() {
        return this.preferenceService.get(ai_scanoss_preferences_1.SCANOSS_MODE_PREF, 'off');
    }
    async runScan(changeSetElements, cache, userTriggered) {
        const apiKey = this.preferenceService.get(scanoss_preferences_1.SCAN_OSS_API_KEY_PREF, undefined);
        let notifiedError = false;
        const fileResults = await Promise.all(changeSetElements.map(async (fileChange) => {
            if (fileChange.targetState.trim().length === 0) {
                return { type: 'clean' };
            }
            const toScan = await this.getScanContent(fileChange);
            if (!toScan) {
                return { type: 'clean' };
            }
            const cached = cache.get(toScan);
            if (cached) {
                return cached;
            }
            const result = { ...await this.scanService.scanContent(toScan, apiKey), file: fileChange.uri.path.toString() };
            if (result.type !== 'error') {
                cache.set(toScan, result);
            }
            else if (!notifiedError && userTriggered) {
                notifiedError = true;
                this.messageService.warn(core_1.nls.localize('theia/ai/scanoss/changeSet/error-notification', 'ScanOSS error encountered: {0}.', result.message));
            }
            return result;
        }));
        return fileResults;
    }
    async getScanContent(fileChange) {
        if (fileChange.replacements) {
            return fileChange.replacements.map(({ newContent }) => newContent).join('\n\n').trim();
        }
        const textModels = await Promise.all([
            this.textModelService.createModelReference(fileChange.uri),
            this.textModelService.createModelReference(fileChange.changedUri)
        ]);
        const [original, changed] = textModels;
        const diff = await this.differ.computeDiff(original.object.textEditorModel, changed.object.textEditorModel, { maxComputationTimeMs: 5000, computeMoves: false, ignoreTrimWhitespace: true }, core_1.CancellationToken.None);
        if (diff.identical) {
            return '';
        }
        const insertions = diff.changes.filter(candidate => !candidate.modified.isEmpty);
        if (insertions.length === 0) {
            return '';
        }
        const changedLinesInSuggestion = insertions.map(change => {
            const range = change.modified.toInclusiveRange();
            return range ? changed.object.textEditorModel.getValueInRange(range) : ''; // In practice, we've filtered out cases where the range would be null already.
        }).join('\n\n');
        textModels.forEach(ref => ref.dispose());
        return changedLinesInSuggestion.trim();
    }
};
exports.ChangeSetScanActionRenderer = ChangeSetScanActionRenderer;
tslib_1.__decorate([
    (0, inversify_1.inject)(scanoss_1.ScanOSSService),
    tslib_1.__metadata("design:type", Object)
], ChangeSetScanActionRenderer.prototype, "scanService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(preferences_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], ChangeSetScanActionRenderer.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(monaco_text_model_service_1.MonacoTextModelService),
    tslib_1.__metadata("design:type", monaco_text_model_service_1.MonacoTextModelService)
], ChangeSetScanActionRenderer.prototype, "textModelService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", core_1.MessageService)
], ChangeSetScanActionRenderer.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(change_set_scan_decorator_1.ChangeSetScanDecorator),
    tslib_1.__metadata("design:type", change_set_scan_decorator_1.ChangeSetScanDecorator)
], ChangeSetScanActionRenderer.prototype, "scanChangeSetDecorator", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.AIActivationService),
    tslib_1.__metadata("design:type", Object)
], ChangeSetScanActionRenderer.prototype, "activationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ChangeSetScanActionRenderer.prototype, "init", null);
exports.ChangeSetScanActionRenderer = ChangeSetScanActionRenderer = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChangeSetScanActionRenderer);
const ChangeSetScanOSSIntegration = React.memo(({ changeSet, decorator, scanOssMode, scanChangeSet }) => {
    const [scanOSSResult, setScanOSSResult] = React.useState(undefined);
    const cache = React.useRef(new Map());
    const [changeSetElements, setChangeSetElements] = React.useState(() => changeSet.getElements().filter(candidate => candidate instanceof change_set_file_element_1.ChangeSetFileElement));
    React.useEffect(() => {
        if (scanOSSResult === undefined) {
            if (scanOssMode === 'automatic' && scanOSSResult === undefined) {
                setScanOSSResult('pending');
                scanChangeSet(changeSetElements, cache.current, false).then(result => setScanOSSResult(result));
            }
        }
    }, [scanOssMode, scanOSSResult]);
    React.useEffect(() => {
        if (!Array.isArray(scanOSSResult)) {
            decorator.setScanResult([]);
            return;
        }
        decorator.setScanResult(scanOSSResult);
    }, [decorator, scanOSSResult]);
    React.useEffect(() => {
        const disposable = changeSet.onDidChange(() => {
            setChangeSetElements(changeSet.getElements().filter(candidate => candidate instanceof change_set_file_element_1.ChangeSetFileElement));
            setScanOSSResult(undefined);
        });
        return () => disposable.dispose();
    }, [changeSet]);
    const scanOSSClicked = React.useCallback(async () => {
        if (scanOSSResult === 'pending') {
            return;
        }
        else if (!scanOSSResult || scanOSSResult.some(candidate => candidate.type === 'error')) {
            setScanOSSResult('pending');
            scanChangeSet(changeSetElements, cache.current, true).then(result => setScanOSSResult(result));
        }
        else {
            const matches = scanOSSResult.filter((candidate) => candidate.type === 'match');
            if (matches.length === 0) {
                return;
            }
            const dialog = new ai_scanoss_code_scan_action_1.ScanOSSDialog(matches);
            dialog.open();
        }
    }, [scanOSSResult, changeSetElements]);
    const state = getResult(scanOSSResult);
    const title = `ScanOSS: ${getTitle(state)}`;
    const content = getContent(state);
    const icon = getIcon(state);
    if (scanOssMode === 'off' || changeSetElements.length === 0) {
        return undefined;
    }
    else if (state === 'clean' || state === 'pending') {
        return React.createElement("div", { className: 'theia-changeSet-scanOss readonly' },
            React.createElement("div", { className: `scanoss-icon icon-container ${state === 'pending'
                    ? 'pending'
                    : state
                        ? state
                        : ''}`, title: title }, icon));
    }
    else {
        return React.createElement("button", { className: `theia-button secondary theia-changeSet-scanOss ${state}`, title: title, onClick: scanOSSClicked },
            React.createElement("div", { className: `scanoss-icon icon-container ${state}`, title: title }, icon),
            content);
    }
});
function getResult(scanOSSResult) {
    switch (true) {
        case scanOSSResult === undefined: return 'none';
        case scanOSSResult === 'pending': return 'pending';
        case scanOSSResult.some(candidate => candidate.type === 'error'): return 'error';
        case scanOSSResult.some(candidate => candidate.type === 'match'): return 'match';
        default: return 'clean';
    }
}
function getTitle(result) {
    switch (result) {
        case 'none': return core_1.nls.localize('theia/ai/scanoss/changeSet/scan', 'Scan');
        case 'pending': return core_1.nls.localize('theia/ai/scanoss/changeSet/scanning', 'Scanning...');
        case 'error': return core_1.nls.localize('theia/ai/scanoss/changeSet/error', 'Error: Rerun');
        case 'match': return core_1.nls.localize('theia/ai/scanoss/changeSet/match', 'View Matches');
        case 'clean': return core_1.nls.localize('theia/ai/scanoss/changeSet/clean', 'No Matches');
        default: return '';
    }
}
function getContent(result) {
    switch (result) {
        case 'none': return getTitle(result);
        case 'pending': return getTitle(result);
        default: return '';
    }
}
function getIcon(result) {
    switch (result) {
        case 'clean': return (React.createElement("span", { className: "status-icon" },
            React.createElement("span", { className: "codicon codicon-pass-filled" })));
        case 'match': return (React.createElement("span", { className: "status-icon" },
            React.createElement("span", { className: "codicon codicon-warning" })));
        default: return undefined;
    }
}
//# sourceMappingURL=change-set-scan-action.js.map