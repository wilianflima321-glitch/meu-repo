'use client'

import { useCallback, useMemo, useState } from 'react'
import LivePreview from '@/components/LivePreview'
import * as THREE from 'three'

export default function LivePreviewContent() {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<THREE.Vector3 | null>(null)

  const handleMagicWandSelect = useCallback((position: THREE.Vector3) => {
    setSelectedPoint(position)
  }, [])

  const handleSendSuggestion = useCallback((suggestion: string) => {
    if (!suggestion.trim()) return
    setSuggestions(prev => [suggestion, ...prev].slice(0, 5))
    setIsGenerating(true)
    window.setTimeout(() => setIsGenerating(false), 900)
  }, [])

  const hints = useMemo(() => {
    if (!selectedPoint) return []
    return [
      `Ponto selecionado: ${selectedPoint.x.toFixed(2)}, ${selectedPoint.y.toFixed(2)}, ${selectedPoint.z.toFixed(2)}`,
      'Use a varinha para destacar áreas com problemas.'
    ]
  }, [selectedPoint])

  return (
    <div className="h-screen w-screen bg-black">
      <LivePreview
        onMagicWandSelect={handleMagicWandSelect}
        suggestions={hints.concat(suggestions)}
        onSendSuggestion={handleSendSuggestion}
        isGenerating={isGenerating}
      />
    </div>
  )
}
