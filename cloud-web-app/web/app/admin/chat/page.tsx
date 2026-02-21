'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

type ChatMessage = {
  id: string;
  text: string;
  sender: string;
  priority: string;
  createdAt: string;
};

type ChatPayload = {
  messages?: ChatMessage[];
};

const priorityLabels: Record<string, string> = {
  normal: 'Normal',
  urgent: 'Urgent',
};

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await adminJsonFetch<ChatPayload>('/api/admin/chat');
      setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;
    try {
      setSending(true);
      await adminJsonFetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMessage.trim(), priority }),
      });
      setNewMessage('');
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send chat message');
    } finally {
      setSending(false);
    }
  }, [fetchMessages, newMessage, priority]);

  const exportHistory = useCallback(() => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-chat-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  const summary = useMemo(
    () => ({
      total: messages.length,
      urgent: messages.filter((message) => message.priority === 'urgent').length,
      admins: new Set(messages.map((message) => message.sender)).size,
    }),
    [messages],
  );

  return (
    <AdminPageShell
      title='Admin Chat'
      description='Operational messaging channel with persisted history and message priority.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchMessages}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Messages' value={summary.total} tone='sky' />
          <AdminStatCard label='Urgent' value={summary.urgent} tone='amber' />
          <AdminStatCard label='Senders' value={summary.admins} tone='neutral' />
          <AdminStatCard label='Draft size' value={newMessage.length} tone='emerald' />
        </AdminStatGrid>
      </div>

      <AdminSection className='mb-6'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center'>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          >
            <option value='normal'>Normal</option>
            <option value='urgent'>Urgent</option>
          </select>
          <input
            type='text'
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            placeholder='Type your message...'
            className='flex-1 rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <AdminPrimaryButton
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className='bg-blue-600 text-white hover:bg-blue-500'
          >
            {sending ? 'Sending...' : 'Send'}
          </AdminPrimaryButton>
        </div>
      </AdminSection>

      <AdminSection className='mb-4'>
        {loading ? (
          <p className='text-sm text-zinc-500'>Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className='text-sm text-zinc-500'>No messages recorded.</p>
        ) : (
          <div className='max-h-96 space-y-2 overflow-y-auto'>
            {messages.map((message) => (
              <div key={message.id} className='rounded border border-zinc-800/70 p-3 text-sm'>
                <div>
                  <strong>{message.sender.toUpperCase()}</strong> ({priorityLabels[message.priority] ?? message.priority})
                </div>
                <div className='mt-1 text-zinc-200'>{message.text}</div>
                <div className='mt-1 text-xs text-zinc-500'>{new Date(message.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminPrimaryButton onClick={exportHistory} className='bg-emerald-600 text-white hover:bg-emerald-500'>
        Export history
      </AdminPrimaryButton>
    </AdminPageShell>
  );
}
