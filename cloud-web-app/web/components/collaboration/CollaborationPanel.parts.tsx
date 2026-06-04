'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from '@/lib/ui/motion';
import { Crown, Edit, Eye, Smile } from 'lucide-react';
import type { ChatMessage, CollaborationUser } from '@/lib/collaboration/collaboration-client';

// ============================================================================
// STYLES
// ============================================================================

export const colors = {
  base: 'var(--aethel-surface-primary)',
  mantle: 'var(--aethel-surface-secondary)',
  crust: 'var(--aethel-surface-primary)',
  surface0: 'var(--aethel-surface-tertiary)',
  surface1: 'var(--aethel-surface-quaternary)',
  surface2: 'var(--aethel-surface-elevated)',
  text: 'var(--aethel-text-primary)',
  subtext0: 'var(--aethel-text-secondary)',
  subtext1: 'var(--aethel-text-tertiary)',
  blue: 'var(--aethel-primary)',
  green: 'var(--aethel-success)',
  red: 'var(--aethel-error)',
  yellow: 'var(--aethel-warning)',
  mauve: 'var(--aethel-accent)',
  peach: 'var(--aethel-warning-light)',
  teal: 'var(--aethel-info)',
  cyan: 'var(--aethel-secondary)',
  overlay0: 'var(--aethel-text-quaternary)',
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

export const UserListItem: React.FC<UserListItemProps> = ({ user, isHost, isCurrentUser, onFollow }) => {
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
          <button type="button" aria-label={`Seguir atividade de ${user.name}`}
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

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  user,
  isCurrentUser,
  onReply,
  onReaction,
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const reactionEmojis = ['', '', '', '', '', ''];

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
                <button type="button" aria-label={`Reagir com ${emoji} na mensagem`}
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
          <button type="button" aria-label={showReactions ? 'Close reaction picker' : 'Open reaction picker'}
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
                <button type="button" aria-label={`Add reacao ${emoji || 'rapida'}`}
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
