// @aethel-heavy-async-boundary Motion-heavy surface; lazy-load outside its owning product region.
'use client';

/**
 * Advanced Settings Panel - RBAC, Webhooks, API Keys
 *
 * Governed settings surface for RBAC, webhooks and API keys.
 */
import React, { useState } from 'react'
import { motion, AnimatePresence, StaggerContainer } from '@/lib/ui/motion'
import {
  Key,
  Webhook,
  Users,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useStudioState } from '@/lib/studio-state'
import { advancedConfig, Role } from '@/lib/advanced-config'
import { CreateAPIKeyDialog, CreateWebhookDialog, InviteTeamMemberDialog } from './AdvancedSettingsPanel.dialogs'

const fadeInUpMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.24, ease: 'easeOut' },
} as const

type AdvancedSettingsTab = 'api-keys' | 'webhooks' | 'team'

type APIKeyRecord = ReturnType<typeof advancedConfig.generateAPIKey>

type WebhookRecord = {
  id: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
  failureCount: number
  secret: string
}

type TeamMemberRecord = {
  id: string
  name: string
  email: string
  role: string
}

/**
 * Main component
 */
export function AdvancedSettingsPanel() {
  const [activeTab, setActiveTab] = useState<AdvancedSettingsTab>('api-keys')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--aethel-text-primary)]">Advanced Settings</h1>
        <p className="text-sm text-[var(--aethel-text-secondary)] mt-1">
          Manage API keys, webhooks, and team permissions
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--aethel-border-primary)]">
        {([
          { id: 'api-keys', label: 'API Keys', icon: Key },
          { id: 'webhooks', label: 'Webhooks', icon: Webhook },
          { id: 'team', label: 'Team', icon: Users },
        ] satisfies Array<{ id: AdvancedSettingsTab; label: string; icon: typeof Key }>).map(({ id, label, icon: Icon }) => (
          <button type="button"
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-3 font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === id
                ? 'text-[var(--aethel-info-light)] border-b-2 border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]'
                : 'text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'api-keys' && <APIKeysTab key="api-keys" />}
        {activeTab === 'webhooks' && <WebhooksTab key="webhooks" />}
        {activeTab === 'team' && <TeamTab key="team" />}
      </AnimatePresence>
    </div>
  )
}

/**
 * API keys tab
 */
function APIKeysTab() {
  const [keys, setKeys] = useState<APIKeyRecord[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const { addNotification } = useStudioState()

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      addNotification({
        type: 'error',
        message: 'API key name is required',
        duration: 3000,
      })
      return
    }

    const newKey = advancedConfig.generateAPIKey(newKeyName, selectedPermissions)
    setKeys([...keys, newKey])

    addNotification({
      type: 'success',
      message: 'API key created successfully',
      duration: 3000,
    })

    setNewKeyName('')
    setSelectedPermissions([])
    setShowCreateDialog(false)
  }

  const handleRevokeKey = (keyId: string) => {
    setKeys(
      keys.map((k) =>
        k.id === keyId ? { ...k, status: 'revoked' as const } : k
      )
    )

    addNotification({
      type: 'success',
      message: 'API key revoked',
      duration: 2000,
    })
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    addNotification({
      type: 'success',
      message: 'Copied to clipboard',
      duration: 2000,
    })
  }

  return (
    <motion.div {...fadeInUpMotion} className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">API Keys</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus size={16} />
          New API Key
        </Button>
      </div>

      {keys.length === 0 ? (
        <Card padding="none" className="p-8 text-center">
          <Key size={48} className="mx-auto mb-4 text-[var(--aethel-text-secondary)]" />
          <p className="text-[var(--aethel-text-secondary)]">No API keys created</p>
          <p className="text-sm text-[var(--aethel-text-secondary)] mt-1">
            Create your first API key to integrate with the API
          </p>
        </Card>
      ) : (
        <StaggerContainer className="space-y-3">
          {keys.map((key) => (
            <APIKeyCard
              key={key.id}
              apiKey={key}
              onRevoke={handleRevokeKey}
              onCopy={handleCopyKey}
            />
          ))}
        </StaggerContainer>
      )}

      {/* Create Dialog */}
      <CreateAPIKeyDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateKey={handleCreateKey}
        name={newKeyName}
        onNameChange={setNewKeyName}
        permissions={selectedPermissions}
        onPermissionsChange={setSelectedPermissions}
      />
    </motion.div>
  )
}

/**
 * API key card
 */
function APIKeyCard({
  apiKey,
  onRevoke,
  onCopy,
}: {
  apiKey: APIKeyRecord
  onRevoke: (id: string) => void
  onCopy: (key: string) => void
}) {
  const [showSecret, setShowSecret] = useState(false)

  return (
    <Card padding="none" className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-[var(--aethel-text-primary)]">{apiKey.name}</h3>
          <p className="text-xs text-[var(--aethel-text-secondary)] mt-1">
            Created on {new Date(apiKey.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge
          variant={
            apiKey.status === 'active'
              ? 'success'
              : apiKey.status === 'expired'
                ? 'warning'
                : 'error'
          }
        >
          {apiKey.status}
        </Badge>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--aethel-text-secondary)]">Key</label>
        <div className="flex gap-2">
          <input
            type={showSecret ? 'text' : 'password'}
            value={apiKey.key}
            readOnly
            className="flex-1 px-3 py-2 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-primary)] text-[var(--aethel-text-primary)] text-sm font-mono"
          />
          <button type="button"
            onClick={() => onCopy(apiKey.key)}
            aria-label="Copy API key"
            className="px-3 py-2 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-primary)] transition-colors"
          >
            <Copy size={16} />
          </button>
          <button type="button"
            onClick={() => setShowSecret(!showSecret)}
            aria-label={showSecret ? 'Hide API secret' : 'Show API secret'}
            aria-pressed={showSecret}
            className="px-3 py-2 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-primary)] transition-colors"
          >
            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {apiKey.expiresAt && (
        <div className="flex items-center gap-2 text-xs text-[var(--aethel-text-secondary)]">
          <Clock size={14} />
          Expires on {new Date(apiKey.expiresAt).toLocaleDateString()}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-[var(--aethel-border-primary)]">
        <button type="button"
          onClick={() => onRevoke(apiKey.id)}
          disabled={apiKey.status === 'revoked'}
          className="flex-1 px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)] text-xs font-medium hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
        >
          <Trash2 size={14} />
          Revoke
        </button>
      </div>
    </Card>
  )
}

/**
 * Webhooks tab
 */
function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { addNotification } = useStudioState()

  const handleCreateWebhook = (url: string, events: string[]) => {
    const newWebhook = {
      id: `wh_${Date.now()}`,
      url,
      events,
      active: true,
      createdAt: new Date().toISOString(),
      failureCount: 0,
      secret: advancedConfig.generateAPIKey('webhook', []).secret || '',
    }

    setWebhooks([...webhooks, newWebhook])
    addNotification({
      type: 'success',
      message: 'Webhook created successfully',
      duration: 3000,
    })
    setShowCreateDialog(false)
  }

  return (
    <motion.div {...fadeInUpMotion} className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Webhooks</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus size={16} />
          New Webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <Card padding="none" className="p-8 text-center">
          <Webhook size={48} className="mx-auto mb-4 text-[var(--aethel-text-secondary)]" />
          <p className="text-[var(--aethel-text-secondary)]">No webhooks configured</p>
          <p className="text-sm text-[var(--aethel-text-secondary)] mt-1">
            Configure webhooks to receive real-time events
          </p>
        </Card>
      ) : (
        <StaggerContainer className="space-y-3">
          {webhooks.map((webhook) => (
            <WebhookCard key={webhook.id} webhook={webhook} />
          ))}
        </StaggerContainer>
      )}

      <CreateWebhookDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateWebhook={handleCreateWebhook}
      />
    </motion.div>
  )
}

/**
 * Card de Webhook
 */
function WebhookCard({ webhook }: { webhook: WebhookRecord }) {
  return (
    <Card padding="none" className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-[var(--aethel-text-primary)] font-mono text-sm break-all">
            {webhook.url}
          </h3>
          <p className="text-xs text-[var(--aethel-text-secondary)] mt-1">
            {webhook.events.length} event(s)
          </p>
        </div>
        <Badge variant={webhook.active ? 'success' : 'warning'}>
          {webhook.active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1">
        {webhook.events.slice(0, 3).map((event: string) => (
          <span
            key={event}
            className="text-xs px-2 py-1 rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-secondary)]"
          >
            {event}
          </span>
        ))}
        {webhook.events.length > 3 && (
          <span className="text-xs px-2 py-1 rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-secondary)]">
            +{webhook.events.length - 3}
          </span>
        )}
      </div>

      {webhook.failureCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--aethel-warning-light)]">
          <AlertCircle size={14} />
          {webhook.failureCount} recent failure(s)
        </div>
      )}
    </Card>
  )
}

/**
 * Team tab
 */
function TeamTab() {
  const [members, setMembers] = useState<TeamMemberRecord[]>([])
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const { addNotification } = useStudioState()

  return (
    <motion.div {...fadeInUpMotion} className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Team members</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowInviteDialog(true)}
        >
          <Plus size={16} />
          Invite member
        </Button>
      </div>

      {members.length === 0 ? (
        <Card padding="none" className="p-8 text-center">
          <Users size={48} className="mx-auto mb-4 text-[var(--aethel-text-secondary)]" />
          <p className="text-[var(--aethel-text-secondary)]">No team members</p>
          <p className="text-sm text-[var(--aethel-text-secondary)] mt-1">
            Invite members to collaborate on your project
          </p>
        </Card>
      ) : (
        <StaggerContainer className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]">
              <div>
                <p className="font-medium text-[var(--aethel-text-primary)]">{member.name}</p>
                <p className="text-xs text-[var(--aethel-text-secondary)]">{member.email}</p>
              </div>
              <Badge variant="info">{member.role}</Badge>
            </div>
          ))}
        </StaggerContainer>
      )}

      <InviteTeamMemberDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
      />
    </motion.div>
  )
}
