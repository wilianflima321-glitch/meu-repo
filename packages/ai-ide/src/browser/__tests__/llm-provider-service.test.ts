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

import { LlmProviderService } from '../llm-provider-service';

interface FakeRegistry {
  getAll: () => unknown[];
  getDefaultProviderId: () => string | undefined;
}
interface MockProvider {
  id: string;
  type: string;
  sendRequest: (opts: { input: string }) => Promise<{ status: number; body: { result: string }; warnings: string[] }>;
}
interface ProviderWarningEvent {
  providerId: string;
  warnings: string[];
}

describe('LlmProviderService - provider warning emission', () => {
  it('fires onDidProviderWarning when provider response contains warnings', async () => {
    // minimal fake registry
    const fakeRegistry: FakeRegistry = { getAll: () => [], getDefaultProviderId: () => undefined };
    const svc = new LlmProviderService(fakeRegistry as never);

    // mock provider that returns warnings
    const mockProvider: MockProvider = {
      id: 'mock-1',
      type: 'custom',
      sendRequest: async (opts: { input: string }) => ({ status: 200, body: { result: 'ok' }, warnings: ['v1', 'v2'] })
    };

    // monkeypatch getProvider to return our mock provider
    (svc as unknown as { getProvider: (id?: string) => MockProvider }).getProvider = (_?: string) => mockProvider;

    const captured: ProviderWarningEvent[] = [];
    const disp = svc.onDidProviderWarning((ev: ProviderWarningEvent) => captured.push(ev));

    const resp = await svc.sendRequestToProvider(undefined, { input: 'hello' });

    expect(resp.status).toBe(200);
    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0].providerId).toBe('mock-1');
    expect(Array.isArray(captured[0].warnings)).toBe(true);
    expect(captured[0].warnings).toContain('v1');

    // cleanup if event subscription is disposable function
    if (typeof disp === 'function') {
      disp();
    }
  });
});
