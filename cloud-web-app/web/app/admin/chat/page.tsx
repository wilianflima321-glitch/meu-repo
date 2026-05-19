'use client';

import { useCallback, useEffect, useState } from 'react';

type ChatMessage = {
  id: string;
  text: string;
  sender: string;
  priority: string;
  createdAt: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priorityLabels: Record<string, string> = {
    normal: 'Normal',
    urgent: 'Urgente',
  };

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/chat');
      if (!res.ok) throw new Error('Failed to load chat');
      const json = await res.json();
      setMessages(json.messages || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading chat');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      setSending(true);
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMessage, priority }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      setNewMessage('');
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sending message');
    } finally {
      setSending(false);
    }
  };

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-chat-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Priority AI Chat</h1>
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Persistent history and operational priority.</p>
        </div>
        <button type="button" onClick={fetchMessages} className='px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm'>
          Atualizar
        </button>
      </div>

      {error && (
        <div className='bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)] p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='mb-6 flex flex-col md:flex-row md:items-center gap-3'>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className='p-2 border rounded'>
          <option value='normal'>Normal</option>
          <option value='urgent'>Urgente</option>
        </select>
        <input
          type='text'
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder='Digite sua mensagem...'
          className='p-2 border rounded flex-1'
        />
        <button type="button"
          onClick={sendMessage}
          disabled={sending}
          className='px-4 py-2 bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)] rounded disabled:opacity-50'
        >
          {sending ? 'Sending...' : 'Enviar'}
        </button>
      </div>

      <div className='border rounded p-4 h-96 overflow-y-auto bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]'>
        {loading ? (
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Nenhuma mensagem registrada.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="mb-2 p-2 rounded border">
              <strong>{msg.sender.toUpperCase()} ({priorityLabels[msg.priority] ?? msg.priority}):</strong> {msg.text}
              <div className='text-xs text-[var(--aethel-text-tertiary)] mt-1'>{new Date(msg.createdAt).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      <div className='mt-4'>
        <button type="button" onClick={exportHistory} className='px-4 py-2 bg-[var(--aethel-success)] text-[var(--aethel-text-primary)] rounded'>Export History</button>
      </div>
    </div>
  );
}
