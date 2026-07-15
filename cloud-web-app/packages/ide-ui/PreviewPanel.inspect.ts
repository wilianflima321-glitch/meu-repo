import { useEffect, type RefObject } from 'react'

import type { InlineElementInspectPayload } from './PreviewPanel.parts'

type InlineInspectMessage = {
  type?: string
  bounds?: { left?: number; bottom?: number }
  elementInfo?: InlineElementInspectPayload['elementInfo']
}

export function useInlinePreviewInspector({
  frameRef,
  inspectArmed,
  canUseDevRuntime,
  showIframeRuntime,
  onInlineElementInspect,
}: {
  frameRef: RefObject<HTMLIFrameElement | null>
  inspectArmed: boolean
  canUseDevRuntime: boolean
  showIframeRuntime: boolean
  onInlineElementInspect?: (payload: InlineElementInspectPayload) => void
}) {
  useEffect(() => {
    if (canUseDevRuntime || !showIframeRuntime) return
    frameRef.current?.contentWindow?.postMessage({ type: 'aethel.preview.inspect.set', armed: inspectArmed }, '*')
  }, [canUseDevRuntime, frameRef, inspectArmed, showIframeRuntime])

  useEffect(() => {
    if (!onInlineElementInspect) return
    const handleInlineInspect = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return
      const data = event.data as InlineInspectMessage
      if (data?.type !== 'aethel.preview.inspect.element' || !data.elementInfo) return
      const iframeRect = frameRef.current.getBoundingClientRect()
      onInlineElementInspect({
        position: {
          x: Math.max(12, Math.min(window.innerWidth - 320, iframeRect.left + (data.bounds?.left ?? 0))),
          y: Math.max(12, Math.min(window.innerHeight - 180, iframeRect.top + (data.bounds?.bottom ?? 0) + 8)),
        },
        elementInfo: data.elementInfo,
      })
    }
    window.addEventListener('message', handleInlineInspect)
    return () => window.removeEventListener('message', handleInlineInspect)
  }, [frameRef, onInlineElementInspect])
}
