'use client'

import { useState } from 'react'

interface MiniPreviewProps {
  isExpanded: boolean
  onToggleExpand: () => void
  aiActivity: string
  suggestions: string[]
  onAcceptSuggestion: (suggestion: string) => void
}

export default function MiniPreview({ isExpanded, onToggleExpand, aiActivity, suggestions, onAcceptSuggestion }: MiniPreviewProps) {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg overflow-hidden transition-all duration-300 ${
      isExpanded ? 'fixed inset-4 z-50' : 'w-64 h-48'
    }`}>
      <div className="flex items-center justify-between p-2 bg-gray-700">
        <h4 className="text-white text-sm font-semibold">AI Live Preview</h4>
        <button
          onClick={onToggleExpand}
          className="text-white hover:text-blue-400"
        >
          {isExpanded ? '⛶' : '⛶'}
        </button>
      </div>

      <div className="p-2 h-full overflow-y-auto">
        <div className="text-gray-300 text-xs mb-2">
          <strong>AI Activity:</strong> {aiActivity}
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-1">
            <div className="text-gray-300 text-xs font-semibold">Suggestions:</div>
            {suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-700 p-1 rounded text-xs">
                <span className="text-white flex-1 mr-2">{suggestion}</span>
                <button
                  onClick={() => onAcceptSuggestion(suggestion)}
                  className="bg-green-600 px-2 py-1 rounded text-white hover:bg-green-700"
                >
                  ✓
                </button>
              </div>
            ))}
          </div>
        )}

        {isExpanded && (
          <div className="mt-4">
            <div className="bg-black rounded h-32 flex items-center justify-center text-gray-400">
              [Expanded 3D Preview Placeholder - Integrate with LivePreview component]
            </div>
          </div>
        )}
      </div>
    </div>
  )
}