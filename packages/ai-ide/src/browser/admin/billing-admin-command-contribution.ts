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
import { CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { BillingAdminContribution } from './billing-admin-contribution';

export const BillingAdminCommands = {
    OPEN: {
        id: 'ai-ide.billing.open',
        label: 'Open Billing Admin'
    }
};

@injectable()
export class BillingAdminCommandContribution implements CommandContribution {
    private _contribution?: BillingAdminContribution;
    @inject(BillingAdminContribution)
    protected set contribution(v: BillingAdminContribution) {
        this._contribution = v;
    }
    protected get contribution(): BillingAdminContribution {
        if (!this._contribution) {
            throw new Error('BillingAdminCommandContribution: contribution not injected');
        }
        return this._contribution;
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(BillingAdminCommands.OPEN, {
            execute: () => this.contribution.openWidget()
        });
    }
}
