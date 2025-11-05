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
exports.ScanOSSServiceImpl = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const scanoss_1 = require("scanoss");
// Helper class to perform scans sequentially
class SequentialProcessor {
    constructor() {
        this.queue = Promise.resolve();
    }
    async processTask(task) {
        this.queue = this.queue.then(() => task());
        return this.queue;
    }
}
let ScanOSSServiceImpl = class ScanOSSServiceImpl {
    constructor() {
        this.processor = new SequentialProcessor();
    }
    async scanContent(content, apiKey) {
        return this.processor.processTask(async () => this.doScanContent(content, apiKey));
    }
    async doScanContent(content, apiKey) {
        var _a, _b, _c;
        const config = new scanoss_1.ScannerCfg();
        const apiKeyToUse = apiKey || process.env.SCANOSS_API_KEY || undefined;
        if (apiKeyToUse) {
            config.API_KEY = apiKeyToUse;
        }
        const scanner = new scanoss_1.Scanner(config);
        let results = undefined;
        try {
            results = await scanner.scanContents({
                content,
                key: 'content_scanning',
            });
        }
        catch (e) {
            console.debug('SCANOSS error', e);
            // map known errors to a more user-friendly message
            // Invalid API key message
            if ((_a = e.message) === null || _a === void 0 ? void 0 : _a.includes('Forbidden')) {
                return {
                    type: 'error',
                    message: 'Forbidden: Please check your API key'
                };
            }
            // Rate limit message
            // HTTP:
            // HTTP Status code: 503
            // Server Response:
            // 503 Unavailable. Check https://osskb.org/limit
            if ((_b = e.message) === null || _b === void 0 ? void 0 : _b.includes('https://osskb.org/limit')) {
                return {
                    type: 'error',
                    message: 'You have reached the limit of the free data subscription, for a commercial subscription please contact support@scanoss.com'
                };
            }
            return {
                type: 'error',
                message: e.message
            };
        }
        if (!results) {
            return {
                type: 'error',
                message: 'Scan request unsuccessful'
            };
        }
        console.debug('SCANOSS results', JSON.stringify(results, undefined, 2));
        let contentScanning = results['/content_scanning'];
        if (!contentScanning) {
            // #14648: The scanoss library prefixes the property with the path of a temporary file on Windows, so we need to search for it
            contentScanning = (_c = Object.entries(results).find(([key]) => key.endsWith('content_scanning'))) === null || _c === void 0 ? void 0 : _c[1];
        }
        if (!contentScanning || contentScanning.length === 0) {
            return {
                type: 'error',
                message: 'Scan request unsuccessful'
            };
        }
        // first result is the best result
        const firstEntry = contentScanning[0];
        if (firstEntry.id === 'none') {
            return {
                type: 'clean'
            };
        }
        return {
            type: 'match',
            matched: firstEntry.matched,
            url: firstEntry.url,
            raw: firstEntry
        };
    }
};
exports.ScanOSSServiceImpl = ScanOSSServiceImpl;
exports.ScanOSSServiceImpl = ScanOSSServiceImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ScanOSSServiceImpl);
//# sourceMappingURL=scanoss-service-impl.js.map