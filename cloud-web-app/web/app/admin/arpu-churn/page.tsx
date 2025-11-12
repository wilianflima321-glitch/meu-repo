'use client';

import React, { useState, useEffect } from 'react';

export default function ArpuChurnPage() {
  const [predictions, setPredictions] = useState({
    arpu: 0,
    churnRate: 0,
    retentionRate: 0
  });

  const [historicalData, setHistoricalData] = useState([
    { month: 'Jan', arpu: 25, churn: 5 },
    { month: 'Feb', arpu: 28, churn: 4 },
    { month: 'Mar', arpu: 30, churn: 3 }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPredictions({
        arpu: Math.floor(Math.random() * 50) + 20,
        churnRate: Math.floor(Math.random() * 10),
        retentionRate: Math.floor(Math.random() * 20) + 80
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ARPU/Churn Prediction</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">ARPU Previsto</h3>
          <p className="text-2xl font-bold text-green-600"></p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Taxa de Churn</h3>
          <p className="text-2xl font-bold text-red-600">{predictions.churnRate}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Taxa de Retenção</h3>
          <p className="text-2xl font-bold text-blue-600">{predictions.retentionRate}%</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Modelo de Predição</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Algoritmo</label>
            <select className="border p-2 w-full">
              <option>Random Forest</option>
              <option>Neural Network</option>
              <option>Linear Regression</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Precisão do Modelo</label>
            <input type="number" defaultValue={85} className="border p-2 w-full" />%
          </div>
        </div>
        <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded">Retreinar Modelo</button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Dados Históricos</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Mês</th>
              <th className="text-left p-2">ARPU ($)</th>
              <th className="text-left p-2">Churn (%)</th>
            </tr>
          </thead>
          <tbody>
            {historicalData.map((data, index) => (
              <tr key={index} className="border-b">
                <td className="p-2">{data.month}</td>
                <td className="p-2"></td>
                <td className="p-2">{data.churn}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
