'use client';

import React, { useState } from 'react';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([
    { id: 1, name: 'Black Friday 50%', code: 'BF50', discount: 50, type: 'percentage', active: true },
    { id: 2, name: 'Free Trial', code: 'TRIAL', discount: 7, type: 'days', active: false }
  ]);

  const [newPromotion, setNewPromotion] = useState({ name: '', code: '', discount: '', type: 'percentage' });

  const handleCreate = () => {
    if (newPromotion.name && newPromotion.code && newPromotion.discount) {
      setPromotions([...promotions, {
        id: promotions.length + 1,
        name: newPromotion.name,
        code: newPromotion.code,
        discount: parseInt(newPromotion.discount),
        type: newPromotion.type,
        active: true
      }]);
      setNewPromotion({ name: '', code: '', discount: '', type: 'percentage' });
    }
  };

  const toggleActive = (id) => {
    setPromotions(promotions.map(promo => 
      promo.id === id ? { ...promo, active: !promo.active } : promo
    ));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Promoções e Coupons</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Criar Nova Promoção</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nome da Promoção"
            value={newPromotion.name}
            onChange={(e) => setNewPromotion({ ...newPromotion, name: e.target.value })}
            className="border p-2"
          />
          <input
            type="text"
            placeholder="Código do Coupon"
            value={newPromotion.code}
            onChange={(e) => setNewPromotion({ ...newPromotion, code: e.target.value })}
            className="border p-2"
          />
          <input
            type="number"
            placeholder="Valor do Desconto"
            value={newPromotion.discount}
            onChange={(e) => setNewPromotion({ ...newPromotion, discount: e.target.value })}
            className="border p-2"
          />
          <select
            value={newPromotion.type}
            onChange={(e) => setNewPromotion({ ...newPromotion, type: e.target.value })}
            className="border p-2"
          >
            <option value="percentage">Percentual (%)</option>
            <option value="fixed">Valor Fixo ($)</option>
            <option value="days">Dias Gratuitos</option>
          </select>
        </div>
        <button onClick={handleCreate} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">Criar Promoção</button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Promoções Ativas</h2>
        <ul>
          {promotions.map(promo => (
            <li key={promo.id} className="flex justify-between items-center p-4 border-b">
              <div>
                <h3 className="font-semibold">{promo.name}</h3>
                <p className="text-sm">Código: {promo.code} | Desconto: {promo.discount}{promo.type === 'percentage' ? '%' : promo.type === 'fixed' ? '$' : ' dias'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded">{promo.active ? 'Ativa' : 'Inativa'}</span>
                <button onClick={() => toggleActive(promo.id)} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm">Toggle</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
