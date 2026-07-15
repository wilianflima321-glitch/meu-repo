import Link from 'next/link'
import { ExternalLink, FileText } from 'lucide-react'
import type { BillingData } from './billing-invoices-types'
import { formatCurrency, formatUnixDate, StatusPill } from './billing-invoices-utils'

export function BillingInvoicesTable({ billingData }: { billingData: BillingData | null }) {
  return (
    <>
      <section className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]">
        <div className="border-b border-[var(--aethel-border-primary)] px-6 py-4">
          <h2 className="text-lg font-semibold">Invoice history</h2>
        </div>
        {billingData?.invoices?.length ? <InvoiceRows billingData={billingData} /> : <EmptyInvoices />}
      </section>
      <div className="mt-6 text-center">
        <Link href="/billing" className="text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]">
          Back to billing workspace
        </Link>
      </div>
    </>
  )
}

function InvoiceRows({ billingData }: { billingData: BillingData }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[var(--aethel-border-primary)]">
        <thead className="bg-[var(--aethel-surface-primary)]/60">
          <tr className="text-left text-xs uppercase tracking-wide text-[var(--aethel-text-secondary)]">
            <th className="px-6 py-3">Invoice</th>
            <th className="px-6 py-3">Date</th>
            <th className="px-6 py-3">Amount</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--aethel-border-primary)]">
          {billingData.invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-[var(--aethel-surface-primary)]/60">
              <td className="px-6 py-4 text-sm text-[var(--aethel-text-primary)]">{invoice.number || invoice.id.slice(-8)}</td>
              <td className="px-6 py-4 text-sm text-[var(--aethel-text-secondary)]">{formatUnixDate(invoice.created)}</td>
              <td className="px-6 py-4 text-sm text-[var(--aethel-text-primary)]">{formatCurrency(invoice.amount, invoice.currency)}</td>
              <td className="px-6 py-4"><StatusPill status={invoice.status} /></td>
              <td className="px-6 py-4"><InvoiceActions hostedUrl={invoice.hostedUrl} pdfUrl={invoice.pdfUrl} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InvoiceActions({ hostedUrl, pdfUrl }: { hostedUrl: string | null; pdfUrl: string | null }) {
  return (
    <div className="flex items-center justify-end gap-3 text-sm">
      {hostedUrl ? <a href={hostedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--aethel-primary-light)] hover:text-[var(--aethel-primary-light)]">View <ExternalLink className="h-3.5 w-3.5" /></a> : null}
      {pdfUrl ? <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]">PDF <FileText className="h-3.5 w-3.5" /></a> : null}
    </div>
  )
}

function EmptyInvoices() {
  return (
    <div className="px-6 py-12 text-center">
      <FileText className="mx-auto h-10 w-10 text-[var(--aethel-text-tertiary)]" />
      <h3 className="mt-4 text-sm font-medium text-[var(--aethel-text-primary)]">No invoices yet</h3>
      <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">Invoices appear here after the first completed billing cycle.</p>
    </div>
  )
}
