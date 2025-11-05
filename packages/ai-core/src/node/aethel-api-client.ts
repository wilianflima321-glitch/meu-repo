// *****************************************************************************
// Copyright (C) 2017 Ericsson and others.
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

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Use the global Fetch API available in Node >= 18 instead of a package dependency.
const _maybeFetch = (globalThis as unknown as { fetch?: typeof fetch }).fetch;
if (!_maybeFetch) {
    throw new Error('Fetch API is not available in this Node.js runtime');
}
const fetchFn: typeof fetch = _maybeFetch;

// Tipos duplicados para evitar dependências complexas entre pacotes por enquanto.
// O ideal seria ter um pacote de tipos compartilhado.
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatRequest {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
}

interface ChatResponse {
    id: string;
    model: string;
    choices: {
        message: ChatMessage;
    }[];
    message: ChatMessage;
}

export class APIError extends Error {
    constructor(message: string, public status?: number, public response?: unknown) {
        super(message);
        this.name = 'APIError';
    }
}

/**
 * Cliente de API para interagir com o backend Aethel a partir do backend do Theia.
 */
class AethelAPIClient {
    private baseURL: string;
    // O token pode ser gerenciado centralmente no futuro, talvez via a extensão principal do Aethel.
    private token: string | undefined = undefined;

    constructor(baseURL: string = process.env.AETHEL_API_URL || 'http://localhost:8000') {
        this.baseURL = baseURL;
    }

    // Método para definir o token, se necessário para chamadas autenticadas
    setToken(token: string | undefined): void {
        this.token = token;
    }

    /**
     * Envia uma requisição de chat para o AI Runtime centralizado.
     * @param request O objeto de requisição de chat.
     * @returns A resposta do chat.
     */
    async chat(request: ChatRequest): Promise<ChatResponse> {
        const headers: { [key: string]: string } = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetchFn(`${this.baseURL}/api/v1/ai-runtime/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e: unknown) {
                errorData = { detail: 'Failed to parse error response from Aethel Backend.' };
            }
            throw new APIError(errorData.detail || `Aethel API request failed with status ${response.status}`, response.status, errorData);
        }

        return response.json() as Promise<ChatResponse>;
    }

    async *chatStream(request: ChatRequest): AsyncIterable<string> {
        const headers: { [key: string]: string } = {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetchFn(`${this.baseURL}/api/v1/ai-runtime/chat/stream`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...request, stream: true }),
        });

        if (!response.ok || !response.body) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e: unknown) {
                errorData = { detail: 'Failed to parse error response from Aethel Backend stream.' };
            }
            throw new APIError(errorData.detail || `Aethel API stream request failed with status ${response.status}`, response.status, errorData);
        }

        for await (const chunk of response.body) {
            yield chunk.toString();
        }
    }
}

// Exporta uma instância singleton do cliente.
export const aethelApiClient = new AethelAPIClient();
