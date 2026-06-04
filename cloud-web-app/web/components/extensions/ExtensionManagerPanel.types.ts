export type ViewMode = 'installed' | 'marketplace' | 'updates'
export type SortBy = 'name' | 'rating' | 'downloads' | 'updated'
export type DisplayMode = 'grid' | 'list'

export interface ExtensionPanelProps {
  onExtensionSelect?: (extensionId: string) => void
  onExtensionInstall?: (extensionId: string) => void
  onExtensionUninstall?: (extensionId: string) => void
}
