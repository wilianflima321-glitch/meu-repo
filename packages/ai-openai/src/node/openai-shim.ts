// *****************************************************************************
// Copyright (C) 2025 Aethel Project.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0
// *****************************************************************************

// *****************************************************************************
// Copyright (C) 2017 Ericsson and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0/.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Shim para substituir chamadas diretas de SDK por chamadas ao backend
import { AethelAIBackendClient, ChatCompletionRequest, ChatCompletionResponse, AethelBackendClientConfig } from '@theia/ai-backend-client';

// Use the global Fetch API available in Node >= 18 instead of a package dependency.
const fetchFn: typeof fetch | undefined = (globalThis as unknown as { fetch?: typeof fetch }).fetch;
if (!fetchFn) {
  throw new Error('Fetch API is not available in this Node.js runtime');
}

export class OpenAIShim {
  private client?: AethelAIBackendClient;
  private model: string;
  private proxyBase?: string;

  constructor(baseUrl: string, token?: string, model: string = 'gpt-4') {
    // If the environment requests using the Theia backend proxy, record it and
    // avoid creating a direct backend client. Use AETHEL_USE_THEIA_PROXY=true
    // or set AETHEL_DEV_MOCK_BACKEND to the proxy base URL if needed.
    this.proxyBase = process.env.AETHEL_USE_THEIA_PROXY ? (process.env.AETHEL_DEV_MOCK_BACKEND || '') : undefined;

    if (!this.proxyBase) {
      const cfg: AethelBackendClientConfig = { baseUrl, token };
      this.client = new AethelAIBackendClient(cfg);
    }

    this.model = model;
  }

  async chat(prompt: string, options?: Partial<ChatCompletionRequest>): Promise<ChatCompletionResponse> {
    const request: ChatCompletionRequest = {
      provider: 'openai',
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      ...options
    } as ChatCompletionRequest;

    if (this.proxyBase) {
      // Route via Theia backend proxy: POST to /ai-proxy/ai-runtime/chat?provider=openai
      const proxyBase = this.proxyBase.replace(/\/$/, '');
      const url = `${proxyBase}/ai-proxy/ai-runtime/chat?provider=openai`;
      const res = await (fetchFn as typeof fetch)(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Proxy request failed: ${res.status} ${err}`);
      }
      return res.json() as Promise<ChatCompletionResponse>;
    }

    if (!this.client) {
      throw new Error('No backend client configured for OpenAIShim');
    }

    return await this.client.chat(request);
  }
}

// Similar shims podem ser criados para Anthropic, Ollama, Hugging Face, Google
