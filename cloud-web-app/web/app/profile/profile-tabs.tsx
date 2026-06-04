import { Bell, Calendar, Clock, CreditCard, Globe, Key, Mail, Palette, Trash2, User } from 'lucide-react'
import TwoFactorSecurityPanel from '@/components/settings/TwoFactorSecurityPanel'
import { ProfileSection, ProfileToggle, SettingRow } from './profile-primitives'
import type { UserProfile } from './page.types'

export function ProfileDetailsTab({
  profile,
  planLabel,
  setEditingName,
  setTempName,
  onGoToBilling,
}: {
  profile: UserProfile
  planLabel: string
  setEditingName: (value: boolean) => void
  setTempName: (value: string) => void
  onGoToBilling: () => void
}) {
  return (
    <>
      <ProfileSection title="Basic information" description="Manage your personal information">
        <SettingRow
          icon={User}
          label="Name"
          value={profile.name}
          action={
            <button
              type="button"
              onClick={() => {
                setTempName(profile.name)
                setEditingName(true)
              }}
              className="text-sm text-[var(--aethel-primary-light)] hover:text-[var(--aethel-text-primary)]"
            >
              Edit
            </button>
          }
        />
        <SettingRow
          icon={Mail}
          label="Email"
          value={profile.email}
          action={<button type="button" className="text-sm text-[var(--aethel-primary-light)] hover:text-[var(--aethel-text-primary)]">Change</button>}
        />
        <SettingRow
          icon={Calendar}
          label="Member since"
          value={new Date(profile.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        />
      </ProfileSection>

      <ProfileSection title="Plan and billing">
        <SettingRow
          icon={CreditCard}
          label="Current plan"
          value={planLabel}
          action={
            <button
              type="button"
              onClick={onGoToBilling}
              className="rounded-lg bg-[var(--aethel-primary-dark)] px-3 py-1 text-sm transition-colors hover:bg-[var(--aethel-primary)]"
            >
              Upgrade plan
            </button>
          }
        />
      </ProfileSection>
    </>
  )
}

export function SecurityTab({
  setShowDeleteConfirm,
  onTwoFactorStatusChange,
}: {
  setShowDeleteConfirm: (value: boolean) => void
  onTwoFactorStatusChange: (enabled: boolean) => void
}) {
  return (
    <>
      <ProfileSection title="Authentication" description="Protect your account with additional security layers">
        <SettingRow
          icon={Key}
          label="Password"
          value="Last changed 30 days ago"
          action={<button type="button" className="text-sm text-[var(--aethel-primary-light)] hover:text-[var(--aethel-text-primary)]">Change password</button>}
        />
      </ProfileSection>

      <TwoFactorSecurityPanel variant="profile" onStatusChange={onTwoFactorStatusChange} />

      <ProfileSection title="Danger zone" description="Irreversible actions">
        <SettingRow
          icon={Trash2}
          label="Delete account"
          value="This action cannot be undone"
          danger
          action={
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg bg-[var(--aethel-error-dark)] px-3 py-1 text-sm transition-colors hover:bg-[var(--aethel-error)]"
            >
              Delete
            </button>
          }
        />
      </ProfileSection>
    </>
  )
}

export function PreferencesTab({ profile, updateProfile }: { profile: UserProfile; updateProfile: (updates: Partial<UserProfile>) => void }) {
  return (
    <>
      <ProfileSection title="Appearance">
        <SettingRow
          icon={Palette}
          label="Theme"
          value={profile.theme === 'dark' ? 'Dark' : profile.theme === 'light' ? 'Light' : 'System'}
          action={
            <select
              value={profile.theme}
              onChange={(event) => updateProfile({ theme: event.target.value as UserProfile['theme'] })}
              className="rounded border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] bg-[var(--aethel-surface-quaternary)] px-2 py-1 text-sm"
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
              onChange={(event) => updateProfile({ language: event.target.value })}
              className="rounded border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] bg-[var(--aethel-surface-quaternary)] px-2 py-1 text-sm"
            >
              <option value="pt-BR">Portuguese (Brazil)</option>
              <option value="en-US">English (US)</option>
            </select>
          }
        />
        <SettingRow icon={Clock} label="Timezone" value={profile.timezone} />
      </ProfileSection>

      <ProfileSection title="Notifications">
        <SettingRow
          icon={Bell}
          label="Email notifications"
          action={
            <ProfileToggle
              enabled={profile.notifications.email}
              label="Toggle email notifications"
              onToggle={() => updateProfile({ notifications: { ...profile.notifications, email: !profile.notifications.email } })}
            />
          }
        />
        <SettingRow
          icon={Bell}
          label="Push notifications"
          action={
            <ProfileToggle
              enabled={profile.notifications.push}
              label="Toggle push notifications"
              onToggle={() => updateProfile({ notifications: { ...profile.notifications, push: !profile.notifications.push } })}
            />
          }
        />
        <SettingRow
          icon={Mail}
          label="Marketing emails"
          action={
            <ProfileToggle
              enabled={profile.notifications.marketing}
              label="Toggle marketing emails"
              onToggle={() => updateProfile({ notifications: { ...profile.notifications, marketing: !profile.notifications.marketing } })}
            />
          }
        />
      </ProfileSection>
    </>
  )
}
