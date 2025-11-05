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

import React from '@theia/core/shared/react';
import { render } from '@testing-library/react';
// Import compiled widget (CommonJS)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BillingAdminWidget } = require('../../lib/browser/admin/billing-admin-widget');

describe('BillingAdminWidget smoke', () => {
  beforeAll(() => {
    // mock global fetch to avoid network calls
    (global as unknown as { fetch?: unknown }).fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
  });
  afterAll(() => {
    (global as unknown as { fetch?: unknown }).fetch = undefined;
  });

  it('renders without crashing and shows toolbar buttons', () => {
    const widget = new BillingAdminWidget();
    const node = widget.render() as React.ReactNode;
    const { container } = render(<div>{node}</div>);
  expect(container.querySelector('.billing-admin-toolbar')).toBeTruthy();
  expect(container.querySelector('button[aria-label="Refresh billing"]')).toBeTruthy();
  });
});
