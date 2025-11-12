'use client';

import { useState } from 'react';

export default function Payments() {
  const [gateway, setGateway] = useState('Stripe');
  const [invoices, setInvoices] = useState([
    { id: 1, user: 'user1@example.com', amount: 19.99, status: 'Paid' },
    { id: 2, user: 'user2@example.com', amount: 49.99, status: 'Pending' },
  ]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Gateway de Pagamentos e Faturamento</h1>
      <p className='mb-4 text-gray-600'>Gerencie integrações de pagamento, faturas e relatórios financeiros.</p>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Configuração do Gateway</h2>
        <select value={gateway} onChange={(e) => setGateway(e.target.value)} className='p-2 border rounded'>
          <option>Stripe</option>
          <option>PayPal</option>
          <option>Mercado Pago</option>
        </select>
        <button className='ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>Salvar</button>
      </div>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Faturas Recentes</h2>
        <table className='w-full table-auto'>
          <thead>
            <tr className='bg-gray-100'>
              <th className='p-2'>ID</th>
              <th className='p-2'>Usuário</th>
              <th className='p-2'>Valor</th>
              <th className='p-2'>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className='p-2'>{inv.id}</td>
                <td className='p-2'>{inv.user}</td>
                <td className='p-2'></td>
                <td className='p-2'>{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className='text-xl font-semibold mb-4'>Relatórios Financeiros</h2>
        <p>Total Receita: </p>
        <button className='mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'>Exportar Relatório</button>
      </div>
    </div>
  );
}
