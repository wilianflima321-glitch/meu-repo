import StudioLayout from '@/components/studio/StudioLayout'
import { DeleteAccountDialog } from './profile-delete-dialog'
import { ProfileHeader, ProfileTabs } from './profile-shell'
import { PreferencesTab, ProfileDetailsTab, SecurityTab } from './profile-tabs'
import type { ProfileViewProps } from './page.types'

export type { ProfileTab, UserProfile } from './page.types'

function planLabel(planLabels: Record<string, string>, plan: string) {
  return planLabels[plan] ?? plan.charAt(0).toUpperCase() + plan.slice(1)
}

export function ProfileLoadingView() {
  return (
    <StudioLayout title="Profile" subtitle="Account, security, and workspace preferences.">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[var(--aethel-primary)]" />
      </div>
    </StudioLayout>
  )
}

export function ProfileUnavailableView({ message }: { message: string }) {
  return (
    <StudioLayout title="Profile" subtitle="Account, security, and workspace preferences.">
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
  const currentPlanLabel = planLabel(planLabels, profile.plan)

  return (
    <StudioLayout title="Profile" subtitle="Account, security, and workspace preferences.">
      <ProfileHeader
        profile={profile}
        editingName={editingName}
        tempName={tempName}
        planLabel={currentPlanLabel}
        setEditingName={setEditingName}
        setTempName={setTempName}
        saveName={saveName}
        onGoToDashboard={onGoToDashboard}
      />
      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        {activeTab === 'profile' ? (
          <ProfileDetailsTab
            profile={profile}
            planLabel={currentPlanLabel}
            setEditingName={setEditingName}
            setTempName={setTempName}
            onGoToBilling={onGoToBilling}
          />
        ) : null}
        {activeTab === 'security' ? (
          <SecurityTab
            setShowDeleteConfirm={setShowDeleteConfirm}
            onTwoFactorStatusChange={onTwoFactorStatusChange}
          />
        ) : null}
        {activeTab === 'preferences' ? <PreferencesTab profile={profile} updateProfile={updateProfile} /> : null}
      </main>

      {showDeleteConfirm ? (
        <DeleteAccountDialog onCancel={() => setShowDeleteConfirm(false)} onConfirm={deleteAccount} />
      ) : null}
    </StudioLayout>
  )
}
