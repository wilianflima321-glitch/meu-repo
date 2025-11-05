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

import { injectable, inject } from '@theia/core/shared/inversify';
import { WidgetManager } from '@theia/core/lib/browser';
import { BillingAdminWidget } from './billing-admin-widget';

@injectable()
export class BillingAdminContribution {
    private _widgetManager?: WidgetManager;
    @inject(WidgetManager)
    protected set widgetManager(v: WidgetManager) {
        this._widgetManager = v;
    }
    protected get widgetManager(): WidgetManager {
        if (!this._widgetManager) {
            throw new Error('BillingAdminContribution: widgetManager not injected');
        }
        return this._widgetManager;
    }

    async openWidget(): Promise<void> {
        const widget = await this.widgetManager.getOrCreateWidget(BillingAdminWidget.ID);
        widget.activate();
    }
}
