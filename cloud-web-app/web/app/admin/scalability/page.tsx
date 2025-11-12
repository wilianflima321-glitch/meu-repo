'use client';

import React, { useState, useEffect } from 'react';

export default function ScalabilityPage() {
  const [metrics, setMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    networkTraffic: 0,
    activeConnections: 0,
    errorRate: 0,
    responseTime: 0
  });

  const [costs, setCosts] = useState({
    serverCosts: 1200,
    cloudStorage: 300,
    bandwidth: 150,
    total: 1650
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        cpuUsage: Math.floor(Math.random() * 100),
        memoryUsage: Math.floor(Math.random() * 100),
        networkTraffic: Math.floor(Math.random() * 1000) + 500,
        activeConnections: Math.floor(Math.random() * 10000) + 5000,
        errorRate: Math.floor(Math.random() * 5),
        responseTime: Math.floor(Math.random() * 500) + 100
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Scalability Metrics</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">CPU Usage</h3>
          <p className="text-2xl font-bold text-blue-600">{metrics.cpuUsage}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Memory Usage</h3>
          <p className="text-2xl font-bold text-green-600">{metrics.memoryUsage}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Network Traffic</h3>
          <p className="text-2xl font-bold text-purple-600">{metrics.networkTraffic} Mbps</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Active Connections</h3>
          <p className="text-2xl font-bold text-red-600">{metrics.activeConnections}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Error Rate</h3>
          <p className="text-2xl font-bold text-yellow-600">{metrics.errorRate}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Response Time</h3>
          <p className="text-2xl font-bold text-indigo-600">{metrics.responseTime}ms</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Custos Mensais</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Servidores</h3>
            <p className="text-2xl font-bold text-blue-600"></p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Storage</h3>
            <p className="text-2xl font-bold text-green-600"></p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Bandwidth</h3>
            <p className="text-2xl font-bold text-purple-600"></p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Total</h3>
            <p className="text-2xl font-bold text-red-600"></p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Recomendações de Escalabilidade</h2>
        <ul className="list-disc list-inside">
          <li>Considerar auto-scaling quando CPU &gt; 80%</li>
          <li>Otimizar queries para reduzir response time</li>
          <li>Implementar CDN para reduzir bandwidth costs</li>
          <li>Monitorar error rate para identificar bottlenecks</li>
        </ul>
      </div>
    </div>
  );
}
