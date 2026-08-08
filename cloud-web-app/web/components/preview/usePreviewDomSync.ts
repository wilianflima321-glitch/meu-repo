import { useEffect, useState, useCallback, RefObject } from 'react'

export interface SerializedDOMNode {
  id: string
  tagName: string
  attributes: Record<string, string>
  children: SerializedDOMNode[]
  textContent?: string
  isComponent?: boolean // If it looks like a React component boundary
}

interface DomSyncMessage {
  type: 'aethel.preview.dom.sync'
  tree: SerializedDOMNode
}

export function usePreviewDomSync(frameRef: RefObject<HTMLIFrameElement | null>) {
  const [domTree, setDomTree] = useState<SerializedDOMNode | null>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null)

  // Listen for DOM tree updates via postMessage (Cross-Origin support)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate source if needed
      if (event.source !== frameRef.current?.contentWindow && event.source !== window) return
      
      const data = event.data as DomSyncMessage
      if (data?.type === 'aethel.preview.dom.sync' && data.tree) {
        setDomTree(data.tree)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [frameRef])

  // Fallback for same-origin inline iframes (scrapes DOM directly if possible)
  useEffect(() => {
    const iframe = frameRef.current
    if (!iframe) return

    const tryScrape = () => {
      try {
        const doc = iframe.contentDocument
        if (!doc || !doc.body) return

        const serializeNode = (node: Element, idPath: string): SerializedDOMNode => {
          const attributes: Record<string, string> = {}
          for (let i = 0; i < node.attributes.length; i++) {
            const attr = node.attributes[i]
            attributes[attr.name] = attr.value
          }
          
          const children: SerializedDOMNode[] = []
          let childIndex = 0
          for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i]
            if (child.nodeType === Node.ELEMENT_NODE) {
              children.push(serializeNode(child as Element, `${idPath}-${childIndex++}`))
            }
          }

          let textContent = undefined
          if (children.length === 0 && node.textContent?.trim()) {
            textContent = node.textContent.trim().slice(0, 50) + (node.textContent.trim().length > 50 ? '...' : '')
          }

          return {
            id: node.id || idPath,
            tagName: node.tagName.toLowerCase(),
            attributes,
            children,
            textContent
          }
        }

        setDomTree(serializeNode(doc.body, 'root'))
      } catch (e) {
        // Cross-origin error, ignore. We rely on postMessage in this case.
      }
    }

    // Try scraping periodically as fallback
    const interval = setInterval(tryScrape, 2000)
    iframe.addEventListener('load', tryScrape)
    
    return () => {
      clearInterval(interval)
      iframe.removeEventListener('load', tryScrape)
    }
  }, [frameRef])

  const highlightElement = useCallback((id: string | null) => {
    setHoveredElementId(id)
    if (frameRef.current?.contentWindow) {
      frameRef.current.contentWindow.postMessage({ type: 'aethel.preview.inspect.highlight', id }, '*')
    }
  }, [frameRef])

  const selectElement = useCallback((id: string | null) => {
    setSelectedElementId(id)
    if (frameRef.current?.contentWindow) {
      frameRef.current.contentWindow.postMessage({ type: 'aethel.preview.inspect.select', id }, '*')
    }
  }, [frameRef])

  return {
    domTree,
    selectedElementId,
    hoveredElementId,
    highlightElement,
    selectElement
  }
}
