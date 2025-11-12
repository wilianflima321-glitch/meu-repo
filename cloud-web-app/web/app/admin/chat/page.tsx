'use client';

import { useState } from 'react';

export default function Chat() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Olá, IA! Como está o uso hoje?', sender: 'admin', priority: 'normal' },
    { id: 2, text: 'Uso está alto, sugerindo otimização.', sender: 'ai', priority: 'normal' },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [priority, setPriority] = useState('normal');

  const sendMessage = () => {
    setMessages([...messages, { id: messages.length + 1, text: newMessage, sender: 'admin', priority }]);
    setNewMessage('');
    // Simular resposta IA
    setTimeout(() => setMessages(prev => [...prev, { id: prev.length + 1, text: 'Resposta simulada da IA.', sender: 'ai', priority: 'normal' }]), 1000);
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Chat Prioritário com IA</h1>
      <p className='mb-4 text-gray-600'>Comunique-se com a IA Aethel, com histórico persistente, prioritização e suporte multi-modal.</p>

      <div className='mb-6'>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className='p-2 border rounded mr-4'>
          <option value='normal'>Normal</option>
          <option value='urgent'>Urgente</option>
        </select>
        <input
          type='text'
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder='Digite sua mensagem...'
          className='p-2 border rounded flex-1 mr-4'
        />
        <button onClick={sendMessage} className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>Enviar</button>
      </div>

      <div className='border rounded p-4 h-96 overflow-y-auto'>
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2 p-2 rounded">
            <strong>{msg.sender.toUpperCase()} ({msg.priority}):</strong> {msg.text}
          </div>
        ))}
      </div>

      <div className='mt-4'>
        <button className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'>Exportar Histórico</button>
      </div>
    </div>
  );
}
