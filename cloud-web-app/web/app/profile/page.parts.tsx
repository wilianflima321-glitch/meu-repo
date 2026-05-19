'use client'

import Image from 'next/image'
import type { Dispatch, ElementType, ReactNode, SetStateAction } from 'react'
import {
  User,
  Mail,
  Shield,
  Key,
  Bell,
  Palette,
  Globe,
  CreditCard,
  Clock,
  Trash2,
  Check,
  X,
  Camera,
  Edit2,
  AlertTriangle,
  Calendar,
} from 'lucide-react'

import StudioLayout from '@/components/studio/StudioLayout'
import TwoFactorSecurityPanel from '@/components/settings/TwoFactorSecurityPanel'

export interface UserProfile {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  lastLogin?: string
  plan: string
  timezone: string
  language: string
  theme: 'light' | 'dark' | 'system'
  emailVerified: boolean
  twoFactorEnabled: boolean
  notifications: {
    email: boolean
    push: boolean
    marketing: boolean
  }
}

// ============================================================================
// Components
// ============================================================================

function ProfileSection({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] rounded-xl border border-[var(--aethel-border-secondary)]/50 p-6 mb-6">
      <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--aethel-text-secondary)] mb-4">{description}</p>
      )}
      {children}
    </div>
  )
}

function SettingRow({
  icon: Icon,
  label,
  value,
  action,
  danger = false
}: {
  icon: ElementType
  label: string
  value?: string | ReactNode
  action?: ReactNode
  danger?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-3 border-b border-[var(--aethel-border-secondary)]/50 last:border-0 ${danger ? 'text-[var(--aethel-error)]' : ''}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-[var(--aethel-text-secondary)]" />
        <div>
          <div className={`text-sm font-medium ${danger ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-text-primary)]'}`}>{label}</div>
          {value && <div className="text-xs text-[var(--aethel-text-tertiary)]">{value}</div>}
        </div>
      </div>
      {action}
    </div>
  )
}

export type ProfileTab = 'profile' | 'security' | 'preferences'

const PROFILE_TABS: Array<{ id: ProfileTab; label: string; icon: ElementType }> = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'security', label: 'Seguranca', icon: Shield },
  { id: 'preferences', label: 'Preferencias', icon: Palette },
]

type ProfileViewProps = {
  profile: UserProfile
  activeTab: ProfileTab
  editingName: boolean
  tempName: string
  showDeleteConfirm: boolean
  planLabels: Record<string, string>
  setActiveTab: Dispatch<SetStateAction<ProfileTab>>
  setEditingName: Dispatch<SetStateAction<boolean>>
  setTempName: Dispatch<SetStateAction<string>>
  setShowDeleteConfirm: Dispatch<SetStateAction<boolean>>
  saveName: () => void
  updateProfile: (updates: Partial<UserProfile>) => void
  deleteAccount: () => void
  onTwoFactorStatusChange: (enabled: boolean) => void
  onGoToDashboard: () => void
  onGoToBilling: () => void
}

export function ProfileLoadingView() {
  return (
    <StudioLayout title="Perfil" subtitle="Conta, seguranca e preferencias do workspace.">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[var(--aethel-primary)]" />
      </div>
    </StudioLayout>
  )
}

export function ProfileUnavailableView({ message }: { message: string }) {
  return (
    <StudioLayout title="Perfil" subtitle="Conta, seguranca e preferencias do workspace.">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="text-[var(--aethel-text-secondary)]">{message}</div>
      </div>
    </StudioLayout>
  )
}

export function ProfileView({
  profile,
  activeTab,
  editingName,
  tempName,
  showDeleteConfirm,
  planLabels,
  setActiveTab,
  setEditingName,
  setTempName,
  setShowDeleteConfirm,
  saveName,
  updateProfile,
  deleteAccount,
  onTwoFactorStatusChange,
  onGoToDashboard,
  onGoToBilling,
}: ProfileViewProps) {
  return (
    <StudioLayout title="Perfil" subtitle="Conta, seguranca e preferencias do workspace.">
      {/* Header */}
      <header className="border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)] flex items-center justify-center text-3xl font-bold">
                {profile.avatar ? (
                  <Image
                    src={profile.avatar}
                    alt={profile.name}
                    width={80}
                    height={80}
                    unoptimized
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  profile.name.charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                aria-label="Change foto de perfil"
                className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="bg-[var(--aethel-surface-tertiary)] border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] rounded px-2 py-1 text-xl font-bold"
                      autoFocus
                    />
                    <button type="button" onClick={saveName} className="text-[var(--aethel-success)] hover:text-[var(--aethel-success-light)]">
                      <Check className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => setEditingName(false)} className="text-[var(--aethel-error)] hover:text-[var(--aethel-error-light)]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">{profile.name}</h1>
                    <button type="button"
                      onClick={() => { setTempName(profile.name); setEditingName(true); }}
                      className="text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-[var(--aethel-text-secondary)]">{profile.email}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="px-2 py-1 text-xs rounded-full bg-[var(--aethel-primary)]/20 text-[var(--aethel-primary-light)] border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]">
                  {planLabels[profile.plan] ?? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
                </span>
                {profile.emailVerified && (
                  <span className="flex items-center gap-1 text-xs text-[var(--aethel-success)]">
                    <Check className="w-3 h-3" /> Email verified
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <button type="button"
              onClick={onGoToDashboard}
              className="px-4 py-2 bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded-lg transition-colors"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-[var(--aethel-border-primary)]">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-8">
            {PROFILE_TABS.map((tab) => (
              <button type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
                    : 'border-transparent text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <>
            <ProfileSection title="Basic information" description="Manage your personal information">
              <SettingRow
                icon={User}
                label="Name"
                value={profile.name}
                action={
                  <button type="button"
                    onClick={() => { setTempName(profile.name); setEditingName(true); }}
                    className="text-sm text-[var(--aethel-primary-light)] hover:text-[var(--aethel-text-primary)]"
                  >
                    Edit
                  </button>
                }
              />
              <SettingRow
                icon={Mail}
                label="E-mail"
                value={profile.email}
                action={
                  <button type="button" className="text-sm text-[var(--aethel-primary-light)] hover:text-[var(--aethel-text-primary)]">
                    Change
                  </button>
                }
              />
              <SettingRow
                icon={Calendar}
                label="Member since"
                value={new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              />
            </ProfileSection>

            <ProfileSection title="Plan and billing">
              <SettingRow
                icon={CreditCard}
                label="Current plan"
                value={planLabels[profile.plan] ?? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
                action={
                  <button type="button"
                    onClick={onGoToBilling}
                    className="px-3 py-1 text-sm bg-[var(--aethel-primary-dark)] hover:bg-[var(--aethel-primary)] rounded-lg transition-colors"
                  >
                    Upgrade plan
                  </button>
                }
              />
            </ProfileSection>
          </>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <>
            <ProfileSection title="Authentication" description="Protect your account with additional security layers">
              <SettingRow
                icon={Key}
                label="Password"
                value="Last changed 30 days ago"
                action={
                  <button type="button" className="text-sm text-[var(--aethel-primary-light)] hover:text-[var(--aethel-text-primary)]">
                    Change senha
                  </button>
                }
              />
            </ProfileSection>

            <TwoFactorSecurityPanel
              variant="profile"
              onStatusChange={(enabled) =>
                onTwoFactorStatusChange(enabled)
              }
            />

            <ProfileSection title="Danger zone" description="Irreversible actions">
              <SettingRow
                icon={Trash2}
                label="Delete account"
                value="This action cannot be undone"
                danger
                action={
                  <button type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1 text-sm bg-[var(--aethel-error-dark)] hover:bg-[var(--aethel-error)] rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                }
              />
            </ProfileSection>
          </>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <>
            <ProfileSection title="Appearance">
              <SettingRow
                icon={Palette}
                label="Theme"
                value={profile.theme === 'dark' ? 'Dark' : profile.theme === 'light' ? 'Light' : 'System'}
                action={
                  <select
                    value={profile.theme}
                    onChange={(e) => updateProfile({ theme: e.target.value as UserProfile['theme'] })}
                    className="bg-[var(--aethel-surface-quaternary)] border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] rounded px-2 py-1 text-sm"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="system">System</option>
                  </select>
                }
              />
            </ProfileSection>

            <ProfileSection title="Localization">
              <SettingRow
                icon={Globe}
                label="Language"
                value={profile.language === 'pt-BR' ? 'Portuguese (Brazil)' : 'English'}
                action={
                  <select
                    value={profile.language}
                    onChange={(e) => updateProfile({ language: e.target.value })}
                    className="bg-[var(--aethel-surface-quaternary)] border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] rounded px-2 py-1 text-sm"
                  >
                    <option value="pt-BR">Portuguese (Brazil)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                }
              />
              <SettingRow
                icon={Clock}
                label="Timezone"
                value={profile.timezone}
              />
            </ProfileSection>

            <ProfileSection title="Notifications">
              <SettingRow
                icon={Bell}
                label="Notifications por e-mail"
                action={
                  <button type="button"
                    onClick={() => updateProfile({
                      notifications: { ...profile.notifications, email: !profile.notifications.email }
                    })}
                    aria-label="Toggle email notifications"
                    aria-pressed={profile.notifications.email}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile.notifications.email ? 'bg-[var(--aethel-primary-dark)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-[var(--aethel-text-primary)] transform transition-transform ${
                      profile.notifications.email ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                }
              />
              <SettingRow
                icon={Bell}
                label="Notifications push"
                action={
                  <button type="button"
                    onClick={() => updateProfile({
                      notifications: { ...profile.notifications, push: !profile.notifications.push }
                    })}
                    aria-label="Toggle push notifications"
                    aria-pressed={profile.notifications.push}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile.notifications.push ? 'bg-[var(--aethel-primary-dark)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-[var(--aethel-text-primary)] transform transition-transform ${
                      profile.notifications.push ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                }
              />
              <SettingRow
                icon={Mail}
                label="Marketing emails"
                action={
                  <button type="button"
                    onClick={() => updateProfile({
                      notifications: { ...profile.notifications, marketing: !profile.notifications.marketing }
                    })}
                    aria-label="Toggle marketing emails"
                    aria-pressed={profile.notifications.marketing}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile.notifications.marketing ? 'bg-[var(--aethel-primary-dark)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-[var(--aethel-text-primary)] transform transition-transform ${
                      profile.notifications.marketing ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                }
              />
            </ProfileSection>
          </>
        )}

      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] flex items-center justify-center z-50">
          <div className="bg-[var(--aethel-surface-tertiary)] rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--aethel-error)]/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[var(--aethel-error)]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--aethel-text-primary)]">Delete account</h3>
            </div>

            <p className="text-[var(--aethel-text-secondary)] mb-6">
              This action is <strong className="text-[var(--aethel-text-primary)]">permanent and irreversible</strong>.
              All your data, projects, and settings will be deleted.
            </p>

            <div className="flex gap-3">
              <button type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button type="button"
                onClick={deleteAccount}
                className="flex-1 px-4 py-2 bg-[var(--aethel-error-dark)] hover:bg-[var(--aethel-error)] rounded-lg transition-colors"
              >
                Delete my account
              </button>
            </div>
          </div>
        </div>
      )}
    </StudioLayout>
  )
}


