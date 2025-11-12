import * as React from 'react';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
export declare class BillingAdminWidget extends ReactWidget {
    static readonly ID = "ai-ide.billing.admin.widget";
    static readonly LABEL = "Billing Admin";
    protected records: any[];
    protected paymentsConfig: string | null;
    protected filters: any;
    protected page: number;
    protected pageSize: number;
    protected promos: any[];
    protected newPromo: any;
    protected redeemForm: any;
    protected providers: any[];
    protected payments: any[];
    constructor();
    protected fetchRecords(): Promise<void>;
    protected fetchPromos(): Promise<void>;
    protected fetchProviders(): Promise<void>;
    protected fetchPayments(): Promise<void>;
    protected reconcile(): Promise<void>;
    protected setPaymentBase(url: string): Promise<void>;
    protected createPromo(): Promise<void>;
    protected redeemPromoForUser(): Promise<void>;
    protected exportCsv(): void;
    protected renderRecords(): React.JSX.Element;
    render(): React.ReactNode;
}
//# sourceMappingURL=billing-admin-widget.d.ts.map