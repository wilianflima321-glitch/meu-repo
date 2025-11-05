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
exports.SessionSettingsDialog = void 0;
const core_1 = require("@theia/core");
const dialogs_1 = require("@theia/core/lib/browser/dialogs");
class SessionSettingsDialog extends dialogs_1.AbstractDialog {
    constructor(editorProvider, resources, uri, options) {
        super({
            title: core_1.nls.localize('theia/ai/session-settings-dialog/title', 'Set Session Settings')
        });
        this.editorProvider = editorProvider;
        this.resources = resources;
        this.uri = uri;
        this.options = options;
        this.settings = {};
        const initialSettings = options.initialSettings;
        this.initialSettingsString = JSON.stringify(initialSettings, undefined, 2) || '{}';
        this.contentNode.classList.add('monaco-session-settings-dialog');
        this.dialogContent = document.createElement('div');
        this.dialogContent.className = 'session-settings-container';
        this.contentNode.appendChild(this.dialogContent);
        this.errorMessageDiv = document.createElement('div');
        this.errorMessageDiv.className = 'session-settings-error';
        this.contentNode.appendChild(this.errorMessageDiv);
        this.appendCloseButton(core_1.nls.localizeByDefault('Cancel'));
        this.appendAcceptButton(core_1.nls.localizeByDefault('Apply'));
        this.createJsonEditor();
        this.validateJson();
    }
    onAfterAttach(msg) {
        super.onAfterAttach(msg);
        this.update();
    }
    onActivateRequest(msg) {
        super.onActivateRequest(msg);
        if (this.jsonEditor) {
            this.jsonEditor.focus();
        }
    }
    async createJsonEditor() {
        this.resources.update(this.uri, this.initialSettingsString);
        try {
            const editor = await this.editorProvider.createInline(this.uri, this.dialogContent, {
                language: 'json',
                automaticLayout: true,
                minimap: {
                    enabled: false
                },
                scrollBeyondLastLine: false,
                folding: true,
                lineNumbers: 'on',
                fontSize: 13,
                wordWrap: 'on',
                renderValidationDecorations: 'on',
                scrollbar: {
                    vertical: 'auto',
                    horizontal: 'auto'
                }
            });
            editor.getControl().onDidChangeModelContent(() => {
                this.validateJson();
            });
            editor.document.textEditorModel.setValue(this.initialSettingsString);
            this.jsonEditor = editor;
            this.validateJson();
        }
        catch (error) {
            console.error('Failed to create JSON editor:', error);
        }
    }
    validateJson() {
        if (!this.jsonEditor) {
            return;
        }
        const jsonContent = this.jsonEditor.getControl().getValue();
        try {
            this.settings = JSON.parse(jsonContent);
            this.errorMessageDiv.textContent = '';
            this.setErrorButtonState(false);
        }
        catch (error) {
            this.errorMessageDiv.textContent = `${error}`;
            this.setErrorButtonState(true);
        }
    }
    setErrorButtonState(isError) {
        const acceptButton = this.acceptButton;
        if (acceptButton) {
            acceptButton.disabled = isError;
            if (isError) {
                acceptButton.classList.add('disabled');
            }
            else {
                acceptButton.classList.remove('disabled');
            }
        }
    }
    get value() {
        return this.settings;
    }
}
exports.SessionSettingsDialog = SessionSettingsDialog;
//# sourceMappingURL=session-settings-dialog.js.map