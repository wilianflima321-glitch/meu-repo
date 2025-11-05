// *****************************************************************************
// Copyright (C) 2025 Aethel Project.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { AethelAIBackendClient, setDefaultClient } from '../index';
import express = require('@theia/core/shared/express');
import axios from 'axios';

@injectable()
export class AethelBackendService implements BackendApplicationContribution {
    
    async initialize(): Promise<void> {
        // Initialize default backend client on startup
        const baseUrl = process.env.AETHEL_BACKEND_URL || 'http://localhost:8000';
        const token = process.env.AETHEL_BACKEND_TOKEN;
        const enableLogging = process.env.NODE_ENV === 'development';

        const client = new AethelAIBackendClient({
            baseUrl,
            token,
            enableLogging,
            timeoutMs: 60000,
            retries: 3
        });

        setDefaultClient(client);

        console.log(`[AethelBackend] Initialized with base URL: ${baseUrl}`);
        
        // Health check
        try {
            const health = await client.health();
            console.log(`[AethelBackend] Health check passed: ${health.status} (v${health.version})`);
        } catch (error) {
            console.warn(`[AethelBackend] Health check failed (backend may not be running):`, error);
        }
    }

    /**
     * Configure additional Express routes on the Theia backend.
     * This registers a lightweight proxy at /ai-proxy which forwards
     * requests to the local developer mock backend (http://localhost:8010).
     * It's a small POC to allow Theia frontend packages to call the mock
     * backend via the Theia node process.
     */
    async configure(app: express.Application): Promise<void> {
        const target = process.env.AETHEL_DEV_MOCK_BACKEND || 'http://localhost:8010';

        app.use('/ai-proxy', async (req: express.Request, res: express.Response) => {
            try {
                // Build target URL by stripping the prefix
                const proxiedPath = req.originalUrl.replace(/^\/ai-proxy/, '') || '/';
                const url = `${target}${proxiedPath}`;

                const headers = { ...req.headers } as any;
                // Avoid sending host header of the Theia server
                delete headers.host;

                const axiosRes = await axios.request({
                    method: req.method as any,
                    url,
                    headers,
                    data: req.body,
                    responseType: 'stream',
                    validateStatus: () => true
                });

                // Forward status and headers
                res.status(axiosRes.status);
                for (const [k, v] of Object.entries(axiosRes.headers || {})) {
                    try { res.setHeader(k, v as any); } catch (e) { /* ignore */ }
                }

                // Pipe the response stream
                if (axiosRes.data && typeof axiosRes.data.pipe === 'function') {
                    axiosRes.data.pipe(res);
                } else {
                    // Fallback for non-stream bodies
                    res.send(axiosRes.data);
                }
            } catch (error: any) {
                console.warn('[AethelBackend] Proxy error:', error && error.message ? error.message : error);
                res.status(502).json({ error: 'Bad Gateway', details: String(error && error.message ? error.message : error) });
            }
        });

        console.log(`[AethelBackend] Registered /ai-proxy → ${target}`);
    }
}
