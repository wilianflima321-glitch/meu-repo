'use client'
import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'

const LivePreviewContent = dynamicImport(() => import('./LivePreviewContent'), { 
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
})

export default function LivePreviewPage() {
  return <LivePreviewContent />
}
