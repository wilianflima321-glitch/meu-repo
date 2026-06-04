'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AethelAPIClient } from '@/lib/api'
import { isAuthenticated, logout } from '@/lib/auth'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  ProfileLoadingView,
  ProfileUnavailableView,
  ProfileView,
  type ProfileTab,
  type UserProfile,
} from './page.parts'

type ProfileApiPayload = Partial<UserProfile> & {
  mfaEnabled?: boolean
  notifications?: Partial<UserProfile['notifications']>
}

const logger = createComponentLogger('ProfilePage')

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  basic: 'Basic',
  pro: 'Pro',
  studio: 'Studio',
  enterprise: 'Enterprise',
  free: 'Free',
}

function unwrapProfileResponse(response: unknown): ProfileApiPayload {
  const wrapped = response as { profile?: ProfileApiPayload }
  return wrapped.profile ?? (response as ProfileApiPayload)
}

function normalizeProfile(data: ProfileApiPayload): UserProfile {
  return {
    id: data.id ?? '',
    email: data.email ?? '',
    name: data.name || data.email?.split('@')[0] || 'User',
    avatar: data.avatar || undefined,
    createdAt: data.createdAt || new Date().toISOString(),
    lastLogin: data.lastLogin || undefined,
    plan: data.plan || 'free',
    timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: data.language || 'en-US',
    theme: data.theme || 'dark',
    emailVerified: Boolean(data.emailVerified),
    twoFactorEnabled: Boolean(data.twoFactorEnabled || data.mfaEnabled),
    notifications: {
      email: data.notifications?.email ?? true,
      push: data.notifications?.push ?? false,
      marketing: data.notifications?.marketing ?? false,
    },
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)
      const response = await AethelAPIClient.getProfile()
      setProfile(normalizeProfile(unwrapProfileResponse(response)))
      setProfileError(null)
    } catch (error) {
      logger.error('Failed to load profile', error)
      setProfileError('Unable to load the profile. Try again.')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    void loadProfile()
  }, [loadProfile, router])

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!profile) return

      try {
        const response = await AethelAPIClient.updateProfile(updates)
        const data = unwrapProfileResponse(response)
        setProfile((current) => {
          if (!current) return current
          return {
            ...current,
            ...updates,
            ...data,
            notifications: {
              ...current.notifications,
              ...updates.notifications,
              ...(data.notifications || {}),
            },
          }
        })
      } catch (error) {
        logger.error('Failed to update profile', error)
      }
    },
    [profile]
  )

  const saveName = useCallback(async () => {
    if (!tempName.trim()) return
    await updateProfile({ name: tempName })
    setEditingName(false)
  }, [tempName, updateProfile])

  const deleteAccount = useCallback(async () => {
    try {
      await AethelAPIClient.deleteAccount()
      logout()
      router.push('/')
    } catch (error) {
      logger.error('Failed to delete account', error)
    }
  }, [router])

  if (loading) return <ProfileLoadingView />
  if (!profile) return <ProfileUnavailableView message={profileError || 'Profile unavailable.'} />

  return (
    <ProfileView
      profile={profile}
      activeTab={activeTab}
      editingName={editingName}
      tempName={tempName}
      showDeleteConfirm={showDeleteConfirm}
      planLabels={PLAN_LABELS}
      setActiveTab={setActiveTab}
      setEditingName={setEditingName}
      setTempName={setTempName}
      setShowDeleteConfirm={setShowDeleteConfirm}
      saveName={saveName}
      updateProfile={updateProfile}
      deleteAccount={deleteAccount}
      onTwoFactorStatusChange={(enabled) =>
        setProfile((current) => (current ? { ...current, twoFactorEnabled: enabled } : current))
      }
      onGoToDashboard={() => router.push('/dashboard')}
      onGoToBilling={() => router.push('/billing')}
    />
  )
}
