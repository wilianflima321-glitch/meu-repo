'use client';

import React, { useState } from 'react';

export default function BankingPage() {
  const [integrations, setIntegrations] = useState([
    { id: 1, bank: 'Stripe', status: 'Connected', payouts: ',500', fees: '2.9%' },
    { id: 2, bank: 'PayPal', status: 'Disconnected', payouts: '', fees: '3.4%' },
    { id: 3, bank: 'Bank of America', status: 'Pending', payouts: ',200', fees: '1.5%' }
  ]);

  const [newIntegration, setNewIntegration] = useState({ bank: '', apiKey: '', secret: '' });

  const handleConnect = () => {
    if (newIntegration.bank && newIntegration.apiKey) {
      setIntegrations([...integrations, {
        id: integrations.length + 1,
        bank: newIntegration.bank,
        status: 'Connected',
        payouts: '',
        fees: '2.5%'
      }]);
      setNewIntegration({ bank: '', apiKey: '', secret: '' });
    }
  };

  const toggleStatus = (id) => {
    setIntegrations(integrations.map(int => 
      int.id === id ? { ...int, status: int.status === 'Connected' ? 'Disconnected' : 'Connected' } : int
    ));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Integrações Bancárias</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Conectar Novo Banco</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nome do Banco"
            value={newIntegration.bank}
            onChange={(e) => setNewIntegration({ ...newIntegration, bank: e.target.value })}
            className="border p-2"
          />
          <input
            type="text"
            placeholder="API Key"
            value={newIntegration.apiKey}
            onChange={(e) => setNewIntegration({ ...newIntegration, apiKey: e.target.value })}
            className="border p-2"
          />
          <input
            type="password"
            placeholder="Secret Key"
            value={newIntegration.secret}
            onChange={(e) => setNewIntegration({ ...newIntegration, secret: e.target.value })}
            className="border p-2"
          />
          <button onClick={handleConnect} className="bg-blue-500 text-white px-4 py-2 rounded">Conectar</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Integrações Ativas</h2>
        <ul>
          {integrations.map(int => (
            <li key={int.id} className="flex justify-between items-center p-4 border-b">
              <div>
                <h3 className="font-semibold">{int.bank}</h3>
                <p className="text-sm">Payouts: {int.payouts} | Fees: {int.fees}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded">{int.status}</span>
                <button onClick={() => toggleStatus(int.id)} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm">Toggle</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
