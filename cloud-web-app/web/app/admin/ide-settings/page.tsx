'use client';

import { useState } from 'react';

export default function IDESettings() {
  const [theme, setTheme] = useState('dark');
  const [shortcuts, setShortcuts] = useState(['Ctrl+S: Salvar', 'Ctrl+Z: Desfazer']);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Configurações Globais do IDE</h1>
      <p className='mb-4 text-gray-600'>Ajuste temas, atalhos, plugins e configurações para todos os usuários.</p>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Tema Global</h2>
        <select value={theme} onChange={(e) => setTheme(e.target.value)} className='p-2 border rounded'>
          <option value='light'>Claro</option>
          <option value='dark'>Escuro</option>
        </select>
        <button className='ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>Aplicar</button>
      </div>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Atalhos Padrão</h2>
        <ul className='list-disc pl-5'>
          {shortcuts.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
        <button className='mt-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600'>Editar Atalhos</button>
      </div>

      <div>
        <h2 className='text-xl font-semibold mb-4'>Plugins e Extensões</h2>
        <p>Configurações avançadas de plugins...</p>
        <button className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'>Gerenciar Plugins</button>
      </div>
    </div>
  );
}
