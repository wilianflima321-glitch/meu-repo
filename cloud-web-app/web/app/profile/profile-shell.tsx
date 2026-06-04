import Image from 'next/image'
import { Camera, Check, Edit2, Palette, Shield, User, X } from 'lucide-react'
import type { ElementType } from 'react'
import type { ProfileTab, UserProfile } from './page.types'

export const PROFILE_TABS: Array<{ id: ProfileTab; label: string; icon: ElementType }> = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'preferences', label: 'Preferences', icon: Palette },
]

export function ProfileHeader({
  profile,
  editingName,
  tempName,
  planLabel,
  setEditingName,
  setTempName,
  saveName,
  onGoToDashboard,
}: {
  profile: UserProfile
  editingName: boolean
  tempName: string
  planLabel: string
  setEditingName: (value: boolean) => void
  setTempName: (value: string) => void
  saveName: () => void
  onGoToDashboard: () => void
}) {
  return (
    <header className="border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center gap-4">
          <div className="group relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)] text-3xl font-bold">
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt={profile.name}
                  width={80}
                  height={80}
                  unoptimized
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                profile.name.charAt(0).toUpperCase()
              )}
            </div>
            <button
              type="button"
              aria-label="Change profile photo"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Camera className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(event) => setTempName(event.target.value)}
                    className="rounded border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] bg-[var(--aethel-surface-tertiary)] px-2 py-1 text-xl font-bold"
                    autoFocus
                  />
                  <button type="button" onClick={saveName} className="text-[var(--aethel-success)] hover:text-[var(--aethel-success-light)]" aria-label="Save name">
                    <Check className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => setEditingName(false)} className="text-[var(--aethel-error)] hover:text-[var(--aethel-error-light)]" aria-label="Cancel name edit">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  <button
                    type="button"
                    onClick={() => {
                      setTempName(profile.name)
                      setEditingName(true)
                    }}
                    className="text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
                    aria-label="Edit profile name"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
            <p className="text-[var(--aethel-text-secondary)]">{profile.email}</p>
            <div className="mt-2 flex items-center gap-4">
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[var(--aethel-primary)]/20 px-2 py-1 text-xs text-[var(--aethel-primary-light)]">
                {planLabel}
              </span>
              {profile.emailVerified ? (
                <span className="flex items-center gap-1 text-xs text-[var(--aethel-success)]">
                  <Check className="h-3 w-3" /> Email verified
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToDashboard}
            className="rounded-lg bg-[var(--aethel-surface-quaternary)] px-4 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </header>
  )
}

export function ProfileTabs({ activeTab, setActiveTab }: { activeTab: ProfileTab; setActiveTab: (tab: ProfileTab) => void }) {
  return (
    <div className="border-b border-[var(--aethel-border-primary)]">
      <div className="mx-auto max-w-5xl px-4">
        <nav className="flex gap-8" aria-label="Profile sections">
          {PROFILE_TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 py-4 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
                  : 'border-transparent text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
