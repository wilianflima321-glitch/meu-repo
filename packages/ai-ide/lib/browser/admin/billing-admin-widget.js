"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingAdminWidget = void 0;
const React = require("react");
const react_widget_1 = require("@theia/core/lib/browser/widgets/react-widget");
class BillingAdminWidget extends react_widget_1.ReactWidget {
    static ID = 'ai-ide.billing.admin.widget';
    static LABEL = 'Billing Admin';
    records = [];
    paymentsConfig = null;
    filters = { userId: '', providerId: '', from: '', to: '' };
    page = 0;
    pageSize = 20;
    promos = [];
    newPromo = { code: '', freeTokens: 0, discountPercent: 0 };
    redeemForm = { userId: '', code: '' };
    providers = [];
    payments = [];
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
    async fetchRecords() {
        try {
            const base = window.__LLM_MOCK_URL ? window.__LLM_MOCK_URL.replace(/\/$/, '') : '/api';
            const qs = new URLSearchParams();
            if (this.filters.userId)
                qs.set('userId', this.filters.userId);
            if (this.filters.providerId)
                qs.set('providerId', this.filters.providerId);
            if (this.filters.from)
                qs.set('from', this.filters.from);
            if (this.filters.to)
                qs.set('to', this.filters.to);
            qs.set('limit', String(this.pageSize));
            qs.set('offset', String(this.page * this.pageSize));
            const res = await fetch(base + '/llm/billing/records' + (qs.toString() ? ('?' + qs.toString()) : ''));
            if (res.ok)
                this.records = await res.json();
        }
        catch (e) {
            console.error('fetchRecords', e);
        }
        this.update();
    }
    async fetchPromos() {
        try {
            const base = window.__LLM_MOCK_URL ? window.__LLM_MOCK_URL.replace(/\/$/, '') : '/api';
            const res = await fetch(base + '/llm/promos');
            if (res.ok)
                this.promos = await res.json();
        }
        catch (e) {
            console.error('fetchPromos', e);
        }
        this.update();
        this.fetchProviders();
        this.fetchPayments();
    }
    async fetchProviders() {
        try {
            const base = window.__LLM_MOCK_URL ? window.__LLM_MOCK_URL.replace(/\/$/, '') : '/api';
            const res = await fetch(base + '/llm/providers');
            if (res.ok)
                this.providers = await res.json();
        }
        catch (e) {
            console.error('fetchProviders', e);
        }
        this.update();
    }
    async fetchPayments() {
        try {
            const base = window.__LLM_MOCK_URL ? window.__LLM_MOCK_URL.replace(/\/$/, '') : '/api';
            const res = await fetch(base + '/llm/payments');
            if (res.ok)
                this.payments = await res.json();
        }
        catch (e) {
            console.error('fetchPayments', e);
        }
        this.update();
    }
    async reconcile() {
        try {
            const base = window.__LLM_MOCK_URL ? window.__LLM_MOCK_URL.replace(/\/$/, '') : '/api';
            await fetch(base + '/llm/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            // telemetry
            try {
                fetch(base + '/llm/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'reconcile_triggered' }) });
            }
            catch (e) {
                console.warn('telemetry failed', e);
            }
            await this.fetchRecords();
        }
        catch (e) {
            console.error('reconcile', e);
        }
    }
    async setPaymentBase(url) {
        try {
            const base = window.__LLM_MOCK_URL ? window.__LLM_MOCK_URL.replace(/\/$/, '') : '/api';
            await fetch(base + '/llm/payments/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ basePaymentUrl: url }) });
            this.paymentsConfig = url;
            try {
                fetch(base + '/llm/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'payment_base_set', payload: { url } }) });
            }
            catch (e) {
                console.warn('telemetry failed', e);
            }
            await this.fetchRecords();
        }
        catch (e) {
            console.error('setPaymentBase', e);
        }
    }
    async createPromo() {
        try {
            const base = window.__LLM_MOCK_URL ? window.__LLM_MOCK_URL.replace(/\/$/, '') : '/api';
            await fetch(base + '/llm/promos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.newPromo) });
            this.newPromo = { code: '', freeTokens: 0, discountPercent: 0 };
            try {
                fetch(base + '/llm/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'promo_created', payload: this.newPromo }) });
            }
            catch (e) {
                console.warn('telemetry failed', e);
            }
            await this.fetchPromos();
        }
        catch (e) {
            console.error('createPromo', e);
        }
    }
    async redeemPromoForUser() {
        try {
            const base = window.__LLM_MOCK_URL ? window.__LLM_MOCK_URL.replace(/\/$/, '') : '/api';
            await fetch(base + '/llm/promos/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.redeemForm) });
            this.redeemForm = { userId: '', code: '' };
            try {
                fetch(base + '/llm/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'promo_redeemed', payload: this.redeemForm }) });
            }
            catch (e) {
                console.warn('telemetry failed', e);
            }
            await this.fetchPromos();
            await this.fetchRecords();
        }
        catch (e) {
            console.error('redeemPromoForUser', e);
        }
    }
    exportCsv() {
        const base = window.__LLM_MOCK_URL ? window.__LLM_MOCK_URL.replace(/\/$/, '') : '/api';
        const qs = new URLSearchParams();
        if (this.filters.userId)
            qs.set('userId', this.filters.userId);
        if (this.filters.providerId)
            qs.set('providerId', this.filters.providerId);
        if (this.filters.from)
            qs.set('from', this.filters.from);
        if (this.filters.to)
            qs.set('to', this.filters.to);
        const url = base + '/llm/billing/export' + (qs.toString() ? ('?' + qs.toString()) : '');
        // trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'billing_export.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        try {
            fetch(base + '/llm/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'billing_export', payload: { filters: this.filters } }) });
        }
        catch (e) {
            console.warn('telemetry failed', e);
        }
    }
    renderRecords() {
        if (!this.records || !this.records.length)
            return React.createElement("div", null, "No billing records");
        return React.createElement("table", { className: 'billing-records-table' },
            React.createElement("thead", null,
                React.createElement("tr", null,
                    React.createElement("th", null, "id"),
                    React.createElement("th", null, "user"),
                    React.createElement("th", null, "tokens"),
                    React.createElement("th", null, "free"),
                    React.createElement("th", null, "billed"),
                    React.createElement("th", null, "amount"),
                    React.createElement("th", null, "payment"))),
            React.createElement("tbody", null, this.records.map(r => React.createElement("tr", { key: r.id },
                React.createElement("td", null, r.id),
                React.createElement("td", null, r.userId),
                React.createElement("td", null, r.tokens),
                React.createElement("td", null, r.freeTokensUsed || 0),
                React.createElement("td", null, r.billedTokens),
                React.createElement("td", null, r.amount),
                React.createElement("td", null, r.paymentLinkId || '')))));
    }
    render() {
        return React.createElement("div", { className: 'billing-admin-root' },
            React.createElement("div", { className: 'billing-admin-toolbar' },
                React.createElement("button", { className: 'theia-button', "aria-label": 'Refresh billing', onClick: () => { this.page = 0; this.fetchRecords(); } }, "Refresh"),
                React.createElement("button", { className: 'theia-button ml-8', "aria-label": 'Force reconcile', onClick: () => this.reconcile() }, "Force Reconcile"),
                React.createElement("button", { className: 'theia-button ml-8', "aria-label": 'Export CSV', onClick: () => this.exportCsv() }, "Export CSV")),
            React.createElement("div", { className: 'billing-admin-filters' },
                React.createElement("input", { placeholder: "userId", id: "filterUser", className: 'billing-input', value: this.filters.userId, onChange: (e) => { this.filters.userId = e.target.value; this.update(); }, "aria-label": 'Filter by user id' }),
                React.createElement("input", { placeholder: "providerId", id: "filterProv", className: 'billing-input', value: this.filters.providerId, onChange: (e) => { this.filters.providerId = e.target.value; this.update(); }, "aria-label": 'Filter by provider id' }),
                React.createElement("input", { placeholder: "from (ISO)", id: "filterFrom", className: 'billing-input', value: this.filters.from, onChange: (e) => { this.filters.from = e.target.value; this.update(); }, "aria-label": 'Filter from date' }),
                React.createElement("input", { placeholder: "to (ISO)", id: "filterTo", className: 'billing-input', value: this.filters.to, onChange: (e) => { this.filters.to = e.target.value; this.update(); }, "aria-label": 'Filter to date' }),
                React.createElement("button", { className: 'theia-button', onClick: () => { this.page = 0; this.fetchRecords(); } }, "Apply Filters"),
                React.createElement("div", { className: 'billing-payment-base' },
                    React.createElement("input", { placeholder: "payment base (https://pay.example)", id: "paymentBaseInput", className: 'billing-input', value: this.paymentsConfig || '', onChange: (e) => { this.paymentsConfig = e.target.value; this.update(); }, "aria-label": 'Payment base URL' }),
                    React.createElement("button", { className: 'theia-button', onClick: () => { this.setPaymentBase(this.paymentsConfig || ''); } }, "Set Payment Base"))),
            React.createElement("div", { className: 'billing-create-section' },
                React.createElement("h4", null, "Create Promo"),
                React.createElement("input", { placeholder: "code", value: this.newPromo.code, onChange: (e) => { this.newPromo.code = e.target.value; this.update(); } }),
                React.createElement("input", { placeholder: "freeTokens", type: "number", value: this.newPromo.freeTokens, onChange: (e) => { this.newPromo.freeTokens = Number(e.target.value); this.update(); } }),
                React.createElement("input", { placeholder: "discountPercent", type: "number", value: this.newPromo.discountPercent, onChange: (e) => { this.newPromo.discountPercent = Number(e.target.value); this.update(); } }),
                React.createElement("button", { onClick: () => this.createPromo() }, "Create Promo"),
                React.createElement("h4", { className: 'billing-section-title' }, "Redeem Promo for User"),
                React.createElement("input", { placeholder: "userId", className: 'billing-input', value: this.redeemForm.userId, onChange: (e) => { this.redeemForm.userId = e.target.value; this.update(); }, "aria-label": 'Redeem user id' }),
                React.createElement("input", { placeholder: "code", className: 'billing-input', value: this.redeemForm.code, onChange: (e) => { this.redeemForm.code = e.target.value; this.update(); }, "aria-label": 'Redeem code' }),
                React.createElement("button", { className: 'theia-button', onClick: () => this.redeemPromoForUser() }, "Redeem"),
                React.createElement("div", { className: 'billing-section' },
                    React.createElement("h5", null, "Existing Promos"),
                    React.createElement("ul", null, this.promos.map(p => React.createElement("li", { key: p.id || p.code },
                        p.code,
                        " \u2014 freeTokens: ",
                        p.freeTokens,
                        " \u2014 discount: ",
                        p.discountPercent,
                        "%")))),
                React.createElement("div", { className: 'billing-section' },
                    React.createElement("h5", null, "Providers"),
                    React.createElement("ul", null, this.providers.map(p => React.createElement("li", { key: p.id },
                        p.id,
                        " \u2014 ",
                        p.name,
                        " \u2014 pricePerToken: ",
                        (p.rateCard && p.rateCard.pricePerToken) || 0)))),
                React.createElement("div", { className: 'billing-section' },
                    React.createElement("h5", null, "Payments"),
                    React.createElement("ul", null, this.payments.map(p => React.createElement("li", { key: p.id },
                        p.id,
                        " \u2014 ",
                        p.userId,
                        " \u2014 ",
                        p.amount,
                        " ",
                        p.currency,
                        " \u2014 ",
                        p.status))))),
            React.createElement("div", null, this.renderRecords()),
            React.createElement("div", { className: 'billing-pagination' },
                React.createElement("button", { className: 'theia-button', disabled: this.page === 0, onClick: () => { this.page = Math.max(0, this.page - 1); this.fetchRecords(); } }, "Prev"),
                React.createElement("span", { className: 'billing-page-label' },
                    "Page ",
                    this.page + 1),
                React.createElement("button", { className: 'theia-button', onClick: () => { this.page++; this.fetchRecords(); } }, "Next")));
    }
}
exports.BillingAdminWidget = BillingAdminWidget;
//# sourceMappingURL=billing-admin-widget.js.map