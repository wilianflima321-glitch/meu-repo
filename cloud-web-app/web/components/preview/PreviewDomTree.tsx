import { ChevronRight, ChevronDown, MousePointer2 } from 'lucide-react'
import { useState, useCallback } from 'react'
import type { SerializedDOMNode } from './usePreviewDomSync'

interface PreviewDomTreeProps {
  tree: SerializedDOMNode | null
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string | null) => void
  onHover: (id: string | null) => void
}

function DOMNode({
  node,
  depth = 0,
  selectedId,
  hoveredId,
  onSelect,
  onHover
}: {
  node: SerializedDOMNode
  depth?: number
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string | null) => void
  onHover: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(true)
  
  const isSelected = selectedId === node.id
  const isHovered = hoveredId === node.id
  const hasChildren = node.children.length > 0

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(v => !v)
  }

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(node.id)
  }

  return (
    <div className="flex flex-col font-mono text-[11px] leading-tight select-none">
      <div 
        className={`flex items-center group cursor-default pr-2 py-0.5 whitespace-nowrap transition-colors duration-150 ${
          isSelected 
            ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary)]' 
            : isHovered
              ? 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]'
              : 'text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleSelect}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
      >
        <div className="w-3.5 h-3.5 flex items-center justify-center mr-0.5 opacity-50 group-hover:opacity-100 transition-opacity" onClick={hasChildren ? handleToggle : undefined}>
          {hasChildren && (
            expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          )}
        </div>
        
        <span className="text-[var(--aethel-primary-light)]">&lt;{node.tagName}</span>
        
        {node.id && node.id !== node.tagName && (
          <span className="text-[var(--aethel-warning)] ml-1">id="{node.id}"</span>
        )}
        
        {node.attributes.class && (
          <span className="text-[var(--aethel-success)] ml-1 truncate max-w-[120px]" title={node.attributes.class}>
            class="{node.attributes.class}"
          </span>
        )}
        
        <span className="text-[var(--aethel-primary-light)]">
          {hasChildren || node.textContent ? '&gt;' : ' /&gt;'}
        </span>
        
        {!expanded && hasChildren && (
          <span className="text-[var(--aethel-text-tertiary)] ml-1 opacity-50">...&lt;/{node.tagName}&gt;</span>
        )}
        
        {!hasChildren && node.textContent && (
          <span className="text-[var(--aethel-text-primary)] ml-1 truncate max-w-[150px]">{node.textContent}</span>
        )}
        
        {!hasChildren && node.textContent && (
          <span className="text-[var(--aethel-primary-light)]">&lt;/{node.tagName}&gt;</span>
        )}
      </div>
      
      {hasChildren && expanded && (
        <div className="flex flex-col">
          {node.children.map(child => (
            <DOMNode 
              key={child.id} 
              node={child} 
              depth={depth + 1}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={onSelect}
              onHover={onHover}
            />
          ))}
        </div>
      )}
      
      {hasChildren && expanded && (
        <div 
          className={`flex items-center cursor-default py-0.5 whitespace-nowrap transition-colors duration-150 ${
            isSelected ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] text-[var(--aethel-primary)]' : 'text-[var(--aethel-text-secondary)]'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8 + 16}px` }}
        >
          <span className="text-[var(--aethel-primary-light)]">&lt;/{node.tagName}&gt;</span>
        </div>
      )}
    </div>
  )
}

export function PreviewDomTree({ tree, selectedId, hoveredId, onSelect, onHover }: PreviewDomTreeProps) {
  if (!tree) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--aethel-text-tertiary)] p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-full border border-dashed border-[var(--aethel-border-secondary)] flex items-center justify-center bg-[var(--aethel-surface-secondary)]">
          <MousePointer2 className="w-4 h-4 opacity-50" />
        </div>
        <div>
          <p className="text-xs font-medium">DOM Tree Unavailable</p>
          <p className="text-[11px] mt-1 opacity-70">The preview environment has not sent a structural snapshot.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-[var(--aethel-surface-primary)] border-r border-[var(--aethel-border-primary)] shadow-inner custom-scrollbar relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--aethel-surface-primary)] to-transparent h-4 z-10 pointer-events-none" />
      <div className="py-2 min-w-max pb-16">
        <DOMNode 
          node={tree} 
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={onSelect}
          onHover={onHover}
        />
      </div>
    </div>
  )
}
