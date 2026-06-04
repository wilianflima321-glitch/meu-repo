'use client';

import { useState } from 'react'
import { motion, AnimatePresence } from '@/lib/ui/motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useStudioState } from '@/lib/studio-state'
import { ROLE_PERMISSIONS, WebhookEvent } from '@/lib/advanced-config'

/**
 * Create API key dialog
 */
export function CreateAPIKeyDialog({
  open,
  onClose,
  onCreateKey,
  name,
  onNameChange,
  permissions,
  onPermissionsChange,
}: {
  open: boolean
  onClose: () => void
  onCreateKey: () => void
  name: string
  onNameChange: (name: string) => void
  permissions: string[]
  onPermissionsChange: (permissions: string[]) => void
}) {
  const allPermissions = Object.values(ROLE_PERMISSIONS)
    .flat()
    .filter((v, i, a) => a.indexOf(v) === i)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <Card padding="none" className="w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-[var(--aethel-text-primary)]">New API Key</h2>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--aethel-text-secondary)]">Name</label>
                <Input
                  placeholder="Example: Production API"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--aethel-text-secondary)]">Permissions</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {allPermissions.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.includes(perm)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onPermissionsChange([...permissions, perm])
                          } else {
                            onPermissionsChange(permissions.filter((p) => p !== perm))
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-[var(--aethel-text-secondary)]">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[var(--aethel-border-primary)]">
                <Button
                  variant="primary"
                  onClick={onCreateKey}
                  className="flex-1"
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Dialog de Create Webhook
 */
export function CreateWebhookDialog({
  open,
  onClose,
  onCreateWebhook,
}: {
  open: boolean
  onClose: () => void
  onCreateWebhook: (url: string, events: string[]) => void
}) {
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  const handleCreate = () => {
    if (url.trim() && selectedEvents.length > 0) {
      onCreateWebhook(url, selectedEvents)
      setUrl('')
      setSelectedEvents([])
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <Card padding="none" className="w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-[var(--aethel-text-primary)]">New Webhook</h2>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--aethel-text-secondary)]">URL</label>
                <Input
                  placeholder="https://your-server.com/webhook"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--aethel-text-secondary)]">Events</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {Object.values(WebhookEvent).map((event) => (
                    <label key={event} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvents([...selectedEvents, event])
                          } else {
                            setSelectedEvents(selectedEvents.filter((e) => e !== event))
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-[var(--aethel-text-secondary)]">{event}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[var(--aethel-border-primary)]">
                <Button
                  variant="primary"
                  onClick={handleCreate}
                  className="flex-1"
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Dialog de Invite member
 */
export function InviteTeamMemberDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('developer')
  const { addNotification } = useStudioState()

  const handleInvite = () => {
    if (email.trim()) {
      addNotification({
        type: 'success',
        message: `Invite sent to ${email}`,
        duration: 3000,
      })
      setEmail('')
      setRole('developer')
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <Card padding="none" className="w-full max-w-md p-6 space-y-4">
              <h2 className="text-xl font-bold text-[var(--aethel-text-primary)]">Invite member</h2>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--aethel-text-secondary)]">Email</label>
                <Input
                  placeholder="member@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--aethel-text-secondary)]">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-primary)] text-[var(--aethel-text-primary)]"
                >
                  <option value="developer">Developer</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[var(--aethel-border-primary)]">
                <Button
                  variant="primary"
                  onClick={handleInvite}
                  className="flex-1"
                >
                  Invite
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
