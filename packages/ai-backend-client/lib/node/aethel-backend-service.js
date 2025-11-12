"use strict";
// *****************************************************************************
// Copyright (C) 2025 Aethel Project.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.AethelBackendService = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const index_1 = require("../index");
let AethelBackendService = class AethelBackendService {
    async initialize() {
        // Initialize default backend client on startup
        const baseUrl = process.env.AETHEL_BACKEND_URL || 'http://localhost:8000';
        const token = process.env.AETHEL_BACKEND_TOKEN;
        const enableLogging = process.env.NODE_ENV === 'development';
        const client = new index_1.AethelAIBackendClient({
            baseUrl,
            token,
            enableLogging,
            timeoutMs: 60000,
            retries: 3
        });
        (0, index_1.setDefaultClient)(client);
        console.log(`[AethelBackend] Initialized with base URL: ${baseUrl}`);
        // Health check
        try {
            const health = await client.health();
            console.log(`[AethelBackend] Health check passed: ${health.status} (v${health.version})`);
        }
        catch (error) {
            console.warn(`[AethelBackend] Health check failed (backend may not be running):`, error);
        }
    }
};
exports.AethelBackendService = AethelBackendService;
exports.AethelBackendService = AethelBackendService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AethelBackendService);
//# sourceMappingURL=aethel-backend-service.js.map