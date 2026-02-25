'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import nipplejs from 'nipplejs'

interface LivePreviewProps {
  onMagicWandSelect: (position: THREE.Vector3) => void
  suggestions: string[]
  onSendSuggestion: (suggestion: string) => void
  isGenerating: boolean
}

function PreviewScene({
  magicWandActive,
  onMagicWandSelect,
  onOpenMiniChat,
}: {
  magicWandActive: boolean
  onMagicWandSelect: (position: THREE.Vector3) => void
  onOpenMiniChat: () => void
}) {
  const { camera } = useThree()
  const [selectedPoint, setSelectedPoint] = useState<THREE.Vector3 | null>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const keysPressed = useRef<Set<string>>(new Set())

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => keysPressed.current.add(event.code)
    const onKeyUp = (event: KeyboardEvent) => keysPressed.current.delete(event.code)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01
      meshRef.current.rotation.y += 0.01
    }

    const speed = 0.1
    if (keysPressed.current.has('KeyW')) camera.position.z -= speed
    if (keysPressed.current.has('KeyS')) camera.position.z += speed
    if (keysPressed.current.has('KeyA')) camera.position.x -= speed
    if (keysPressed.current.has('KeyD')) camera.position.x += speed
  })

  const handleClick = (event: unknown) => {
    if (!magicWandActive) return
    const point = (event as { point?: THREE.Vector3 })?.point
    if (!point) return
    setSelectedPoint(point)
    onMagicWandSelect(point)
    onOpenMiniChat()
  }

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#4b5563" />
      </mesh>

      <mesh ref={meshRef} position={[0, 0, 0]} onClick={handleClick}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#fb923c" />
      </mesh>

      <mesh position={[3, 0, 0]} onClick={handleClick}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial color="#60a5fa" />
      </mesh>

      <mesh position={[-3, 0, 0]} onClick={handleClick}>
        <cylinderGeometry args={[0.5, 0.5, 1]} />
        <meshStandardMaterial color="#34d399" />
      </mesh>

      {selectedPoint && (
        <Text position={[selectedPoint.x, selectedPoint.y + 1.5, selectedPoint.z]} fontSize={0.2} color="white">
          Selected Area
        </Text>
      )}

      <OrbitControls />
    </>
  )
}

function ControlButton({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium border transition ${
        active
          ? 'bg-blue-600 border-blue-500 text-white'
          : 'bg-slate-900/80 border-slate-700 text-slate-100 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  )
}

export default function LivePreview({
  onMagicWandSelect,
  suggestions,
  onSendSuggestion,
  isGenerating,
}: LivePreviewProps) {
  const [magicWandActive, setMagicWandActive] = useState(false)
  const [miniChatOpen, setMiniChatOpen] = useState(false)
  const [suggestionText, setSuggestionText] = useState('')
  const [showChrome, setShowChrome] = useState(true)
  const [showStatusBar, setShowStatusBar] = useState(true)
  const [inputMode, setInputMode] = useState<'keyboard' | 'joystick' | 'gamepad'>('keyboard')
  const [showJoystick, setShowJoystick] = useState(false)
  const joystickRef = useRef<{ destroy: () => void } | null>(null)
  const joystickZoneRef = useRef<HTMLDivElement | null>(null)

  const liveHints = useMemo(
    () => [
      'W/A/S/D: move camera',
      magicWandActive ? 'Magic Wand: click in scene to select area' : 'Magic Wand: inactive',
      `Input: ${inputMode}`,
    ],
    [magicWandActive, inputMode]
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)')
    const sync = () => setShowJoystick(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!showJoystick || !joystickZoneRef.current) {
      if (joystickRef.current?.destroy) joystickRef.current.destroy()
      joystickRef.current = null
      return
    }

    const manager = nipplejs.create({
      zone: joystickZoneRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#38bdf8',
      size: 110,
    })
    joystickRef.current = { destroy: () => manager.destroy() }
    ;(manager as any).on?.('move', () => setInputMode('joystick'))
    ;(manager as any).on?.('end', () => setInputMode('keyboard'))

    return () => {
      manager.destroy()
      joystickRef.current = null
    }
  }, [showJoystick])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const pads = navigator.getGamepads?.() || []
      const activeGamepad = pads.some((pad) => {
        if (!pad) return false
        const x = pad.axes[0] || 0
        const y = pad.axes[1] || 0
        return Math.abs(x) > 0.12 || Math.abs(y) > 0.12
      })
      if (activeGamepad) setInputMode('gamepad')
      else if (inputMode === 'gamepad') setInputMode('keyboard')
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [inputMode])

  const sendSuggestion = () => {
    const value = suggestionText.trim()
    if (!value) return
    onSendSuggestion(value)
    setSuggestionText('')
    setMiniChatOpen(false)
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg border border-slate-800 bg-black">
      <Canvas className="w-full h-full">
        <PreviewScene
          magicWandActive={magicWandActive}
          onMagicWandSelect={onMagicWandSelect}
          onOpenMiniChat={() => setMiniChatOpen(true)}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        {showChrome ? (
          <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between gap-3">
            <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 p-2 shadow-xl">
              <ControlButton
                label="Tools"
                active={magicWandActive}
                onClick={() => setMagicWandActive((v) => !v)}
              />
              <ControlButton label="Chat" active={miniChatOpen} onClick={() => setMiniChatOpen((v) => !v)} />
              <ControlButton
                label={showStatusBar ? 'Hide Bar' : 'Show Bar'}
                active={showStatusBar}
                onClick={() => setShowStatusBar((v) => !v)}
              />
            </div>

            <div className="pointer-events-auto">
              <ControlButton label="Hide UI" onClick={() => setShowChrome(false)} />
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto absolute top-3 right-3">
            <ControlButton label="Show UI" onClick={() => setShowChrome(true)} />
          </div>
        )}

        {miniChatOpen && (
          <div className="pointer-events-auto absolute top-16 right-3 w-80 rounded-lg border border-slate-700 bg-slate-900/90 p-3 shadow-2xl">
            <div className="mb-2 text-sm font-medium text-white">Suggestion for AI</div>
            <textarea
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder="Describe what should improve in preview..."
              className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              rows={4}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMiniChatOpen(false)}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={sendSuggestion}
                className="rounded-md border border-blue-500 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {showChrome && suggestions.length > 0 && (
          <div className="pointer-events-none absolute right-3 top-56 w-80 space-y-2">
            {suggestions.slice(-3).map((suggestion, index) => (
              <div
                key={`${suggestion}-${index}`}
                className="rounded-md border border-cyan-500/30 bg-slate-900/90 p-2 text-xs text-cyan-100 shadow-lg"
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}

        {showChrome && showJoystick && (
          <div className="pointer-events-auto absolute bottom-16 left-4 flex flex-col items-center gap-2">
            <div className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300">
              Mobile joystick
            </div>
            <div
              ref={joystickZoneRef}
              className="h-28 w-28 rounded-full border border-slate-700 bg-slate-900/70"
              aria-hidden
            />
          </div>
        )}

        {isGenerating && (
          <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="rounded-md border border-blue-500/40 bg-slate-900/90 px-4 py-2 text-sm text-blue-100">
              AI is generating updates...
            </div>
          </div>
        )}

        {showStatusBar && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 border-t border-slate-700 bg-slate-900/85 px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-[11px] text-slate-300">
              <div className="font-medium text-slate-100">Live Preview Runtime</div>
              <div className="flex flex-wrap justify-end gap-2">
                {liveHints.map((hint) => (
                  <span key={hint} className="rounded border border-slate-700 bg-slate-950/80 px-2 py-0.5">
                    {hint}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
