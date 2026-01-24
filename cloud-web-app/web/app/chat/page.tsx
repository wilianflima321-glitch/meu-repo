'use client'
import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'

const ChatPageContent = dynamicImport(() => import('./ChatPageContent'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
})

export default function ChatPage() {
  return <ChatPageContent />
}
