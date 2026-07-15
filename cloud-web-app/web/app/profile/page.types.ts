import type { Dispatch, SetStateAction } from 'react'

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

export type ProfileTab = 'profile' | 'security' | 'preferences'

export interface ProfileViewProps {
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
