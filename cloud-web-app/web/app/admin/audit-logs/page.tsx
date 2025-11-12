'use client';

import React, { useState } from 'react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([
    { id: 1, user: 'admin@aethel.com', action: 'User created', timestamp: '2023-10-01 10:00:00', ip: '192.168.1.1' },
    { id: 2, user: 'user123@aethel.com', action: 'Payment processed', timestamp: '2023-10-01 10:05:00', ip: '192.168.1.2' },
    { id: 3, user: 'admin@aethel.com', action: 'Settings updated', timestamp: '2023-10-01 10:10:00', ip: '192.168.1.1' }
  ]);

  const [filter, setFilter] = useState({ user: '', action: '', dateFrom: '', dateTo: '' });

  const filteredLogs = logs.filter(log => 
    (filter.user === '' || log.user.includes(filter.user)) &&
    (filter.action === '' || log.action.includes(filter.action)) &&
    (filter.dateFrom === '' || log.timestamp >= filter.dateFrom) &&
    (filter.dateTo === '' || log.timestamp <= filter.dateTo)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Audit Logs Avançados</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Usuário"
            value={filter.user}
            onChange={(e) => setFilter({ ...filter, user: e.target.value })}
            className="border p-2"
          />
          <input
            type="text"
            placeholder="Ação"
            value={filter.action}
            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            className="border p-2"
          />
          <input
            type="date"
            value={filter.dateFrom}
            onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
            className="border p-2"
          />
          <input
            type="date"
            value={filter.dateTo}
            onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
            className="border p-2"
          />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Logs de Auditoria</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Usuário</th>
              <th className="text-left p-2">Ação</th>
              <th className="text-left p-2">Timestamp</th>
              <th className="text-left p-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{log.user}</td>
                <td className="p-2">{log.action}</td>
                <td className="p-2">{log.timestamp}</td>
                <td className="p-2">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
