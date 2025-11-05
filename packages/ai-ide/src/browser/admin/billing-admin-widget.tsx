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

import * as React from '@theia/core/shared/react';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';

/* eslint-disable @typescript-eslint/no-explicit-any, no-null/no-null, @typescript-eslint/tslint/config, curly */
// Experimental admin widget, typings to be improved later

export class BillingAdminWidget extends ReactWidget {
    static readonly ID = 'ai-ide.billing.admin.widget';
    static readonly LABEL = 'Billing Admin';

    protected records: any[] = [];
    protected paymentsConfig: string | null = null;
    protected filters: any = { userId: '', providerId: '', from: '', to: '' };
    protected page: number = 0;
    protected pageSize: number = 20;
    protected promos: any[] = [];
    protected newPromo: any = { code: '', freeTokens: 0, discountPercent: 0 };
    protected redeemForm: any = { userId: '', code: '' };
    protected providers: any[] = [];
    protected payments: any[] = [];

    constructor() {
        super();
        this.id = BillingAdminWidget.ID;
        this.title.label = BillingAdminWidget.LABEL;
        this.title.closable = true;
        // fetch initial data
        this.fetchRecords();
        this.fetchPromos();
        this.update();
    }

    protected async fetchRecords() {
        try {
            const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
            const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']).replace(/\/$/, '') : '/api';
            const qs = new URLSearchParams();
            if (this.filters.userId) qs.set('userId', this.filters.userId);
            if (this.filters.providerId) qs.set('providerId', this.filters.providerId);
            if (this.filters.from) qs.set('from', this.filters.from);
            if (this.filters.to) qs.set('to', this.filters.to);
            qs.set('limit', String(this.pageSize));
            qs.set('offset', String(this.page * this.pageSize));
            const res = await fetch(base + '/llm/billing/records' + (qs.toString() ? ('?' + qs.toString()) : ''));
            if (res.ok) this.records = await res.json();
        } catch (e) {
            console.error('fetchRecords', e);
        }
        this.update();
    }

    protected async fetchPromos() {
        try {
            const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
            const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']).replace(/\/$/, '') : '/api';
            const res = await fetch(base + '/llm/promos');
            if (res.ok) this.promos = await res.json();
        } catch (e) { console.error('fetchPromos', e); }
        this.update();
        this.fetchProviders();
        this.fetchPayments();
    }

        protected async fetchProviders() {
                try {
                const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
                const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']).replace(/\/$/, '') : '/api';
                const res = await fetch(base + '/llm/providers');
                if (res.ok) this.providers = await res.json();
            } catch (e) { console.error('fetchProviders', e); }
            this.update();
        }

        protected async fetchPayments() {
                try {
                const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
                const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']).replace(/\/$/, '') : '/api';
                const res = await fetch(base + '/llm/payments');
                if (res.ok) this.payments = await res.json();
            } catch (e) { console.error('fetchPayments', e); }
            this.update();
        }

    protected async reconcile() {
        try {
            const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
            const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']).replace(/\/$/, '') : '/api';
            await fetch(base + '/llm/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            // telemetry
            try { fetch(base + '/llm/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'reconcile_triggered' }) }); } catch (e) { console.warn('telemetry failed', e); }
            await this.fetchRecords();
        } catch (e) { console.error('reconcile', e); }
    }

    protected async setPaymentBase(url: string) {
        try {
            const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
            const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']).replace(/\/$/, '') : '/api';
            await fetch(base + '/llm/payments/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ basePaymentUrl: url }) });
            this.paymentsConfig = url;
            try { fetch(base + '/llm/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'payment_base_set', payload: { url } }) }); } catch (e) { console.warn('telemetry failed', e); }
            await this.fetchRecords();
        } catch (e) { console.error('setPaymentBase', e); }
    }

    protected async createPromo() {
        try {
            const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
            const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']).replace(/\/$/, '') : '/api';
            await fetch(base + '/llm/promos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.newPromo) });
            this.newPromo = { code: '', freeTokens: 0, discountPercent: 0 };
            try { fetch(base + '/llm/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'promo_created', payload: this.newPromo }) }); } catch (e) { console.warn('telemetry failed', e); }
            await this.fetchPromos();
        } catch (e) { console.error('createPromo', e); }
    }

    protected async redeemPromoForUser() {
        try {
            const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
            const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']).replace(/\/$/, '') : '/api';
            await fetch(base + '/llm/promos/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.redeemForm) });
            this.redeemForm = { userId: '', code: '' };
            try { fetch(base + '/llm/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'promo_redeemed', payload: this.redeemForm }) }); } catch (e) { console.warn('telemetry failed', e); }
            await this.fetchPromos();
            await this.fetchRecords();
        } catch (e) { console.error('redeemPromoForUser', e); }
    }

    protected exportCsv() {
    const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
    const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']).replace(/\/$/, '') : '/api';
        const qs = new URLSearchParams();
        if (this.filters.userId) qs.set('userId', this.filters.userId);
        if (this.filters.providerId) qs.set('providerId', this.filters.providerId);
        if (this.filters.from) qs.set('from', this.filters.from);
        if (this.filters.to) qs.set('to', this.filters.to);
        const url = base + '/llm/billing/export' + (qs.toString() ? ('?' + qs.toString()) : '');
        // trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'billing_export.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        try { fetch(base + '/llm/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'billing_export', payload: { filters: this.filters } }) }); } catch (e) { console.warn('telemetry failed', e); }
    }

    protected renderRecords() {
        if (!this.records || !this.records.length) return <div>No billing records</div>;
    return <table className='billing-records-table'>
            <thead><tr><th>id</th><th>user</th><th>tokens</th><th>free</th><th>billed</th><th>amount</th><th>payment</th></tr></thead>
            <tbody>
                {this.records.map(r => <tr key={r.id}><td>{r.id}</td><td>{r.userId}</td><td>{r.tokens}</td><td>{r.freeTokensUsed || 0}</td><td>{r.billedTokens}</td><td>{r.amount}</td><td>{r.paymentLinkId || ''}</td></tr>)}
            </tbody>
        </table>;
    }

    render(): React.ReactNode {
        return <div className='billing-admin-root'>
            <div className='billing-admin-toolbar'>
                <button className='theia-button' aria-label='Refresh billing' onClick={() => { this.page = 0; this.fetchRecords(); }}>Refresh</button>
                <button className='theia-button ml-8' aria-label='Force reconcile' onClick={() => this.reconcile()}>Force Reconcile</button>
                <button className='theia-button ml-8' aria-label='Export CSV' onClick={() => this.exportCsv()}>Export CSV</button>
            </div>
            <div className='billing-admin-filters'>
                <input placeholder="userId" id="filterUser" className='billing-input' value={this.filters.userId} onChange={e => { this.filters.userId = (e.target as HTMLInputElement).value; this.update(); }} aria-label='Filter by user id' />
                <input placeholder="providerId" id="filterProv" className='billing-input' value={this.filters.providerId} onChange={e => { this.filters.providerId = (e.target as HTMLInputElement).value; this.update(); }} aria-label='Filter by provider id' />
                <input placeholder="from (ISO)" id="filterFrom" className='billing-input' value={this.filters.from} onChange={e => { this.filters.from = (e.target as HTMLInputElement).value; this.update(); }} aria-label='Filter from date' />
                <input placeholder="to (ISO)" id="filterTo" className='billing-input' value={this.filters.to} onChange={e => { this.filters.to = (e.target as HTMLInputElement).value; this.update(); }} aria-label='Filter to date' />
                <button className='theia-button' onClick={() => { this.page = 0; this.fetchRecords(); }}>Apply Filters</button>
                <div className='billing-payment-base'>
                    <input placeholder="payment base (https://pay.example)" id="paymentBaseInput" className='billing-input' value={this.paymentsConfig || ''} onChange={e => { this.paymentsConfig = (e.target as HTMLInputElement).value; this.update(); }} aria-label='Payment base URL' />
                    <button className='theia-button' onClick={() => { this.setPaymentBase(this.paymentsConfig || ''); }}>Set Payment Base</button>
                </div>
            </div>

            <div className='billing-create-section'>
                <h4>Create Promo</h4>
                <input placeholder="code" value={this.newPromo.code} onChange={e => { this.newPromo.code = (e.target as HTMLInputElement).value; this.update(); }} />
                <input placeholder="freeTokens" type="number" value={this.newPromo.freeTokens} onChange={e => { this.newPromo.freeTokens = Number((e.target as HTMLInputElement).value); this.update(); }} />
                <input placeholder="discountPercent" type="number" value={this.newPromo.discountPercent} onChange={e => { this.newPromo.discountPercent = Number((e.target as HTMLInputElement).value); this.update(); }} />
                <button onClick={() => this.createPromo()}>Create Promo</button>

                <h4 className='billing-section-title'>Redeem Promo for User</h4>
                <input placeholder="userId" className='billing-input' value={this.redeemForm.userId} onChange={e => { this.redeemForm.userId = (e.target as HTMLInputElement).value; this.update(); }} aria-label='Redeem user id' />
                <input placeholder="code" className='billing-input' value={this.redeemForm.code} onChange={e => { this.redeemForm.code = (e.target as HTMLInputElement).value; this.update(); }} aria-label='Redeem code' />
                <button className='theia-button' onClick={() => this.redeemPromoForUser()}>Redeem</button>

                <div className='billing-section'>
                    <h5>Existing Promos</h5>
                    <ul>
                        {this.promos.map(p => <li key={p.id || p.code}>{p.code} — freeTokens: {p.freeTokens} — discount: {p.discountPercent}%</li>)}
                    </ul>
                </div>
                <div className='billing-section'>
                    <h5>Providers</h5>
                    <ul>
                        {this.providers.map(p => <li key={p.id}>{p.id} — {p.name} — pricePerToken: {(p.rateCard && p.rateCard.pricePerToken) || 0}</li>)}
                    </ul>
                </div>
                <div className='billing-section'>
                    <h5>Payments</h5>
                    <ul>
                        {this.payments.map(p => <li key={p.id}>{p.id} — {p.userId} — {p.amount} {p.currency} — {p.status}</li>)}
                    </ul>
                </div>
            </div>
            <div>
                {this.renderRecords()}
            </div>
            <div className='billing-pagination'>
                <button className='theia-button' disabled={this.page === 0} onClick={() => { this.page = Math.max(0, this.page - 1); this.fetchRecords(); }}>Prev</button>
                <span className='billing-page-label'>Page {this.page + 1}</span>
                <button className='theia-button' onClick={() => { this.page++; this.fetchRecords(); }}>Next</button>
            </div>
        </div>;
    }
}
