/**
 * Página de Faturas/Invoices - Completa
 * 
 * Mostra:
 * - Histórico de faturas
 * - Download de PDF
 * - Status de pagamento
 * - Próxima cobrança
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Invoice {
  id: string;
  number: string | null;
  status: string;
  amount: number;
  currency: string;
  created: number;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface BillingData {
  hasSubscription: boolean;
  plan: string;
  subscription: Subscription | null;
  trial: {
    endsAt: string;
    isActive: boolean;
    daysRemaining: number;
  } | null;
  invoices: Invoice[];
  paymentMethods: PaymentMethod[];
  canAccessPortal: boolean;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  async function fetchBillingData() {
    try {
      const res = await fetch('/api/billing/portal');
      if (!res.ok) throw new Error('Failed to fetch');
      const billingData = await res.json();
      setData(billingData);
    } catch (e) {
      setError('Erro ao carregar dados de faturamento');
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (e) {
      setError('Erro ao abrir portal de pagamento');
    } finally {
      setPortalLoading(false);
    }
  }

  function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      uncollectible: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      void: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    };
    
    const labels: Record<string, string> = {
      paid: 'Pago',
      open: 'Pendente',
      draft: 'Rascunho',
      uncollectible: 'Não cobrável',
      void: 'Cancelado',
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/billing')}
            className="text-blue-600 hover:underline"
          >
            Voltar para Billing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Faturas e Pagamentos
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Gerencie suas faturas e métodos de pagamento
          </p>
        </div>

        {/* Subscription Info Card */}
        {data?.subscription && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Plano {data.plan.charAt(0).toUpperCase() + data.plan.slice(1)}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {data.subscription.cancelAtPeriodEnd ? (
                    <span className="text-yellow-600">
                      Cancela em {formatDate(data.subscription.currentPeriodEnd)}
                    </span>
                  ) : (
                    <>Próxima cobrança: {formatDate(data.subscription.currentPeriodEnd)}</>
                  )}
                </p>
              </div>
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {portalLoading ? 'Abrindo...' : 'Gerenciar Assinatura'}
              </button>
            </div>
          </div>
        )}

        {/* Trial Info */}
        {data?.trial?.isActive && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-blue-800 dark:text-blue-200">
                Período de teste: <strong>{data.trial.daysRemaining} dias restantes</strong>
              </span>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        {data?.paymentMethods && data.paymentMethods.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Métodos de Pagamento
            </h2>
            <div className="space-y-3">
              {data.paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-6 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center mr-3">
                      <span className="text-xs font-bold uppercase">{pm.brand}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        •••• {pm.last4}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Expira {pm.expMonth.toString().padStart(2, '0')}/{pm.expYear}
                      </p>
                    </div>
                  </div>
                  {pm.isDefault && (
                    <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">
                      Padrão
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={openPortal}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Adicionar ou alterar método de pagamento →
            </button>
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Histórico de Faturas
            </h2>
          </div>
          
          {data?.invoices && data.invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fatura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {invoice.number || invoice.id.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(invoice.created)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end space-x-3">
                          {invoice.hostedUrl && (
                            <a
                              href={invoice.hostedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              Ver
                            </a>
                          )}
                          {invoice.pdfUrl && (
                            <a
                              href={invoice.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-gray-700 dark:text-gray-400"
                            >
                              PDF
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                Nenhuma fatura
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Suas faturas aparecerão aqui após a primeira cobrança.
              </p>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/billing')}
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            ← Voltar para Billing
          </button>
        </div>
      </div>
    </div>
  );
}
