'use client';

import React, { useState, useEffect } from 'react';

export default function RealTimePage() {
  const [metrics, setMetrics] = useState({
    usersOnline: 0,
    apiRequests: 0,
    cpuUsage: 0,
    memoryUsage: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        usersOnline: Math.floor(Math.random() * 1000) + 100,
        apiRequests: Math.floor(Math.random() * 10000) + 5000,
        cpuUsage: Math.floor(Math.random() * 100),
        memoryUsage: Math.floor(Math.random() * 100)
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Real-Time Monitoring</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Usuários Online</h3>
          <p className="text-2xl font-bold text-blue-600">{metrics.usersOnline}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">API Requests</h3>
          <p className="text-2xl font-bold text-green-600">{metrics.apiRequests}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">CPU Usage</h3>
          <p className="text-2xl font-bold text-red-600">{metrics.cpuUsage}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold">Memory Usage</h3>
          <p className="text-2xl font-bold text-purple-600">{metrics.memoryUsage}%</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Logs em Tempo Real</h2>
        <div className="bg-gray-100 p-4 rounded h-64 overflow-y-auto">
          <p className="text-sm">[2023-10-01 10:00:00] User login: user123</p>
          <p className="text-sm">[2023-10-01 10:01:00] API call: /ai/generate</p>
          <p className="text-sm">[2023-10-01 10:02:00] Error: High CPU usage detected</p>
          <p className="text-sm">[2023-10-01 10:03:00] New user registered: user456</p>
          {/* Simulate more logs */}
        </div>
      </div>
    </div>
  );
}
