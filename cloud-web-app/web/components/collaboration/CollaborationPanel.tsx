'use client';

// @aethel-heavy-async-boundary
/**
 * Collaboration Panel Component
 *
 * Interface para colaboracao em tempo real com
 * lista de usuarios, cursores e chat integrado.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from '@/lib/ui/motion';
import {
  Users,
  MessageCircle,
  Link,
  Copy,
  Check,
  X,
  Send,
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  UserPlus,
  LogOut,
  Share2,
} from 'lucide-react';
import {
  CollaborationClient,
  CollaborationUser,
  ChatMessage,
  SessionSettings,
} from '@/lib/collaboration/collaboration-client';

import { ChatMessageItem, UserListItem, colors } from './CollaborationPanel.parts';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CollaborationPanelProps {
  client: CollaborationClient;
  currentUserId: string;
  hostId: string;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  client,
  currentUserId,
  hostId,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'chat'>('users');
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(client.isConnected());
  const [sessionLink, setSessionLink] = useState('');
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate session link
    const sessionId = client.getSessionId();
    if (sessionId) {
      setSessionLink(`${window.location.origin}/collaborate/${sessionId}`);
    }

    // Event listeners
    const handleUserJoined = (user: CollaborationUser) => {
      setUsers(client.getUsers());
    };

    const handleUserLeft = () => {
      setUsers(client.getUsers());
    };

    const handleMessage = (message: ChatMessage) => {
      setMessages(client.getChatMessages());
    };

    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);

    client.on('user:joined', handleUserJoined);
    client.on('user:left', handleUserLeft);
    client.on('chat:message', handleMessage);
    client.on('connected', handleConnected);
    client.on('disconnected', handleDisconnected);

    // Initial load
    setUsers(client.getUsers());
    setMessages(client.getChatMessages());

    return () => {
      client.off('user:joined', handleUserJoined);
      client.off('user:left', handleUserLeft);
      client.off('chat:message', handleMessage);
      client.off('connected', handleConnected);
      client.off('disconnected', handleDisconnected);
    };
  }, [client]);

  useEffect(() => {
    // Scroll chat to bottom
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) return;

    client.sendMessage(inputMessage.trim());
    setInputMessage('');
  }, [client, inputMessage]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(sessionLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sessionLink]);

  const handleLeaveSession = useCallback(() => {
    client.leaveSession();
  }, [client]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.base,
        color: colors.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.surface0}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color={colors.blue} />
            <span style={{ fontWeight: 600 }}>Collaboration</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.green }}>
                <Wifi size={14} />
                <span style={{ fontSize: '12px' }}>Connected</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.red }}>
                <WifiOff size={14} />
                <span style={{ fontSize: '12px' }}>Disconnected</span>
              </div>
            )}
          </div>
        </div>

        {/* Session Link */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: colors.surface0,
            borderRadius: '8px',
          }}
        >
          <Link size={14} color={colors.subtext0} />
          <input
            type="text"
            value={sessionLink}
            readOnly
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: colors.subtext1,
              fontSize: '12px',
            }}
          />
          <button type="button" aria-label={copied ? 'Link da sessao copiado' : 'Copiar link da sessao'}
            onClick={handleCopyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: copied ? colors.green + '30' : colors.blue + '30',
              border: 'none',
              borderRadius: '4px',
              color: copied ? colors.green : colors.blue,
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button type="button" aria-label="Abrir aba de colaboradores"
            onClick={() => setActiveTab('users')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              background: activeTab === 'users' ? colors.surface0 : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: activeTab === 'users' ? colors.text : colors.subtext0,
              cursor: 'pointer',
            }}
          >
            <Users size={16} />
            Users ({users.length})
          </button>
          <button type="button" aria-label="Abrir aba de chat colaboractive"
            onClick={() => setActiveTab('chat')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              background: activeTab === 'chat' ? colors.surface0 : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: activeTab === 'chat' ? colors.text : colors.subtext0,
              cursor: 'pointer',
            }}
          >
            <MessageCircle size={16} />
            Chat
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '8px' }}
            >
              {users.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: colors.subtext0 }}>
                  <Users size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p>No users in this session</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {users.map((user) => (
                    <UserListItem
                      key={user.id}
                      user={user}
                      isHost={user.id === hostId}
                      isCurrentUser={user.id === currentUserId}
                      onFollow={() => {
                        // Follow user implementation
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Invite button */}
              <button type="button" aria-label="Invite colaboradores copiando o link da sessao"
                onClick={handleCopyLink}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px',
                  marginTop: '16px',
                  background: colors.blue,
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.base,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <UserPlus size={18} />
                Invite Collaborators
              </button>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              {/* Messages */}
              <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: colors.subtext0 }}>
                    <MessageCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <p>No messages yet</p>
                    <p style={{ fontSize: '13px' }}>Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <ChatMessageItem
                      key={message.id}
                      message={message}
                      user={users.find(u => u.id === message.userId)}
                      isCurrentUser={message.userId === currentUserId}
                      onReply={() => {}}
                      onReaction={(emoji) => client.addReaction(message.id, emoji)}
                    />
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div
                style={{
                  padding: '12px',
                  borderTop: `1px solid ${colors.surface0}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: colors.surface0,
                    borderRadius: '8px',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    aria-label="Digite uma mensagem para a sessao colaboractive"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: colors.text,
                      fontSize: '14px',
                    }}
                  />
                  <button type="button" aria-label="Send mensagem para a sessao colaboractive"
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    style={{
                      padding: '6px',
                      background: inputMessage.trim() ? colors.blue : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: inputMessage.trim() ? colors.base : colors.overlay0,
                      cursor: inputMessage.trim() ? 'pointer' : 'default',
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px',
          borderTop: `1px solid ${colors.surface0}`,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <button type="button" aria-label="Sign out da sessao colaboractive"
          onClick={handleLeaveSession}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'transparent',
            border: `1px solid ${colors.red}`,
            borderRadius: '6px',
            color: colors.red,
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          <LogOut size={14} />
          Leave Session
        </button>

        <button aria-label="Abrir configuracoes da sessao colaboractive"
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: colors.surface0,
            border: 'none',
            borderRadius: '6px',
            color: colors.text,
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
    </div>
  );
};

export default CollaborationPanel;
