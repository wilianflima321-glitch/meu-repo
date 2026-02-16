'use client';

/**
 * Collaboration Panel Component
 * 
 * Interface para colaboração em tempo real com
 * lista de usuários, cursores e chat integrado.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageCircle,
  Link,
  Copy,
  Check,
  X,
  Send,
  Settings,
  Crown,
  Eye,
  Edit,
  Wifi,
  WifiOff,
  RefreshCw,
  UserPlus,
  LogOut,
  Share2,
  Smile,
} from 'lucide-react';
import {
  CollaborationClient,
  CollaborationUser,
  ChatMessage,
  getUserColor,
  SessionSettings,
} from '@/lib/collaboration/collaboration-client';

// ============================================================================
// STYLES
// ============================================================================

const colors = {
  base: '#1e1e2e',
  mantle: '#181825',
  crust: '#11111b',
  surface0: '#313244',
  surface1: '#45475a',
  surface2: '#585b70',
  text: '#cdd6f4',
  subtext0: '#a6adc8',
  subtext1: '#bac2de',
  blue: '#89b4fa',
  green: '#a6e3a1',
  red: '#f38ba8',
  yellow: '#f9e2af',
  mauve: '#cba6f7',
  peach: '#fab387',
  teal: '#94e2d5',
  cyan: '#f5c2e7',
  overlay0: '#6c7086',
};

// ============================================================================
// USER AVATAR
// ============================================================================

interface UserAvatarProps {
  user: CollaborationUser;
  size?: number;
  showStatus?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 32, showStatus = true }) => {
  const isActive = Date.now() - user.lastActivity < 30000;
  
  return (
    <div style={{ position: 'relative' }}>
      {user.avatar ? (
        <Image
          src={user.avatar}
          alt={user.name}
          width={size}
          height={size}
          unoptimized
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: `2px solid ${user.color}`,
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: user.color + '40',
            border: `2px solid ${user.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: user.color,
            fontWeight: 600,
            fontSize: size * 0.4,
          }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      )}
      {showStatus && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: size * 0.35,
            height: size * 0.35,
            borderRadius: '50%',
            background: isActive ? colors.green : colors.overlay0,
            border: `2px solid ${colors.base}`,
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// USER LIST ITEM
// ============================================================================

interface UserListItemProps {
  user: CollaborationUser;
  isHost: boolean;
  isCurrentUser: boolean;
  onFollow?: () => void;
}

const UserListItem: React.FC<UserListItemProps> = ({ user, isHost, isCurrentUser, onFollow }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '8px',
        background: isCurrentUser ? colors.surface0 : 'transparent',
      }}
    >
      <UserAvatar user={user} />
      
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: colors.text, fontWeight: isCurrentUser ? 600 : 400 }}>
            {user.name}
            {isCurrentUser && ' (you)'}
          </span>
          {isHost && (
            <Crown size={14} color={colors.yellow} />
          )}
        </div>
        <div style={{ fontSize: '12px', color: colors.subtext0 }}>
          {user.cursor?.fileUri && (
            <span>
              {user.cursor.fileUri.split('/').pop()}:{user.cursor.line}:{user.cursor.column}
            </span>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {user.permissions.includes('write') ? (
          <span title="Can edit"><Edit size={14} color={colors.blue} /></span>
        ) : (
          <span title="View only"><Eye size={14} color={colors.subtext0} /></span>
        )}
        
        {!isCurrentUser && onFollow && (
          <button
            onClick={onFollow}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: colors.subtext0,
              cursor: 'pointer',
            }}
            title="Follow user"
          >
            <Eye size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================================
// CHAT MESSAGE ITEM
// ============================================================================

interface ChatMessageItemProps {
  message: ChatMessage;
  user?: CollaborationUser;
  isCurrentUser: boolean;
  onReply: () => void;
  onReaction: (emoji: string) => void;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  user,
  isCurrentUser,
  onReply,
  onReaction,
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const reactionEmojis = ['👍', '❤️', '😄', '🎉', '👀', '🤔'];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        {user && <UserAvatar user={user} size={24} showStatus={false} />}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ color: user?.color || colors.text, fontWeight: 500, fontSize: '13px' }}>
              {user?.name || 'Unknown'}
            </span>
            <span style={{ color: colors.overlay0, fontSize: '11px' }}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div style={{ color: colors.text, fontSize: '14px', lineHeight: '1.4' }}>
            {message.text}
          </div>
          
          {/* Reactions */}
          {Object.keys(message.reactions).length > 0 && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
              {Object.entries(message.reactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onReaction(emoji)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    background: colors.surface0,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  <span>{emoji}</span>
                  <span style={{ color: colors.subtext0 }}>{users.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowReactions(!showReactions)}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: colors.subtext0,
              cursor: 'pointer',
              opacity: 0.5,
            }}
          >
            <Smile size={14} />
          </button>
          
          {showReactions && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: colors.surface0,
                borderRadius: '8px',
                padding: '4px',
                display: 'flex',
                gap: '2px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: 10,
              }}
            >
              {reactionEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReaction(emoji);
                    setShowReactions(false);
                  }}
                  style={{
                    padding: '4px 6px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

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
          <button
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
          <button
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
          <button
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
              <button
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
                  <button
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
        <button
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
        
        <button
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
