'use client';

import { useState } from 'react';

export default function AdminSecurity() {
  const [logs, setLogs] = useState([
    { id: 1, action: 'Login', user: 'João', timestamp: '2025-09-19 10:00', ip: '192.168.1.1' },
    { id: 2, action: 'Mudança de Perfil', user: 'Maria', timestamp: '2025-09-19 11:00', ip: '192.168.1.2' }
  ]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Segurança e Logs</h1>
      <div className='mb-6 aethel-card aethel-p-4'>
        <h2 className='text-xl font-semibold mb-4'>Configurações de Segurança</h2>
        <label className='block mb-2 aethel-flex aethel-items-center aethel-gap-2'>
          <input type='checkbox' className='aethel-checkbox' />
          <span>Habilitar 2FA</span>
        </label>
        <label className='block mb-4 aethel-flex aethel-items-center aethel-gap-2'>
          <input type='checkbox' className='aethel-checkbox' />
          <span>Bloquear IPs suspeitos</span>
        </label>
        <button className='aethel-button aethel-button-primary'>Salvar</button>
      </div>
      <h2 className='text-xl font-semibold mb-4'>Logs de Auditoria</h2>
      <table className='w-full bg-white rounded-lg shadow'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-3'>Ação</th>
            <th className='p-3'>Usuário</th>
            <th className='p-3'>Timestamp</th>
            <th className='p-3'>IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className='border-t'>
              <td className='p-3'>{log.action}</td>
              <td className='p-3'>{log.user}</td>
              <td className='p-3'>{log.timestamp}</td>
              <td className='p-3'>{log.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
