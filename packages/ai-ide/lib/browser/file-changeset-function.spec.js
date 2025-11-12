"use strict";
// *****************************************************************************
// Copyright (C) 2025 Lonti.com Pty Ltd.
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
const frontend_application_config_provider_1 = require("@theia/core/lib/browser/frontend-application-config-provider");
const jsdom_1 = require("@theia/core/lib/browser/test/jsdom");
let disableJSDOM = (0, jsdom_1.enableJSDOM)();
frontend_application_config_provider_1.FrontendApplicationConfigProvider.set({});
const inversify_1 = require("@theia/core/shared/inversify");
const chai_1 = require("chai");
const file_changeset_functions_1 = require("./file-changeset-functions");
disableJSDOM();
describe('DefaultFileChangeSetTitleProvider', () => {
    let provider;
    before(() => {
        const container = new inversify_1.Container();
        container.bind(file_changeset_functions_1.DefaultFileChangeSetTitleProvider).toSelf();
        provider = container.get(file_changeset_functions_1.DefaultFileChangeSetTitleProvider);
        disableJSDOM = (0, jsdom_1.enableJSDOM)();
    });
    after(() => {
        disableJSDOM();
    });
    it('should provide the title', () => {
        const ctx = {
            agentId: 'test-agent',
        };
        const title = provider.getChangeSetTitle(ctx);
        (0, chai_1.expect)(title).to.equal('Changes proposed');
    });
});
//# sourceMappingURL=file-changeset-function.spec.js.map