'use client'

import { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import nipplejs from 'nipplejs'

interface LivePreviewProps {
  onMagicWandSelect: (position: THREE.Vector3) => void
  suggestions: string[]
  onSendSuggestion: (suggestion: string) => void
  isGenerating: boolean
}

function Scene({ onMagicWandSelect, suggestions, onOpenMiniChat }: { onMagicWandSelect: (pos: THREE.Vector3) => void, suggestions: string[], onOpenMiniChat: () => void }) {
  const { camera, scene } = useThree()
  const [selectedPoint, setSelectedPoint] = useState<THREE.Vector3 | null>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const keysPressed = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keysPressed.current.add(event.code)
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current.delete(event.code)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01
      meshRef.current.rotation.y += 0.01
    }

    // Handle keyboard movement
    const speed = 0.1
    if (keysPressed.current.has('KeyW')) {
      camera.position.z -= speed
    }
    if (keysPressed.current.has('KeyS')) {
      camera.position.z += speed
    }
    if (keysPressed.current.has('KeyA')) {
      camera.position.x -= speed
    }
    if (keysPressed.current.has('KeyD')) {
      camera.position.x += speed
    }
  })

  const handleClick = (event: any) => {
    const point: THREE.Vector3 | undefined = event?.point;
    if (point) {
      setSelectedPoint(point)
      onMagicWandSelect(point)
      onOpenMiniChat() // Open mini chat on click
    }
  }

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      {/* Ground plane */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="gray" />
      </mesh>

      {/* Sample objects */}
      <mesh ref={meshRef} position={[0, 0, 0]} onClick={handleClick}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>

      <mesh position={[3, 0, 0]} onClick={handleClick}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial color="blue" />
      </mesh>

      <mesh position={[-3, 0, 0]} onClick={handleClick}>
        <cylinderGeometry args={[0.5, 0.5, 1]} />
        <meshStandardMaterial color="green" />
      </mesh>

      {selectedPoint && (
        <Text position={[selectedPoint.x, selectedPoint.y + 1.5, selectedPoint.z]} fontSize={0.2} color="white">
          Selected Area
        </Text>
      )}

      {suggestions.map((suggestion, index) => (
        <Html key={index} position={[2, 2 - index * 0.5, 0]}>
          <div className="bg-gray-800 text-white p-2 rounded text-sm max-w-xs">
            {suggestion}
          </div>
        </Html>
      ))}

      <OrbitControls />
    </>
  )
}

export default function LivePreview({ onMagicWandSelect, suggestions, onSendSuggestion, isGenerating }: LivePreviewProps) {
  const [magicWandActive, setMagicWandActive] = useState(false)
  const [miniChatOpen, setMiniChatOpen] = useState(false)
  const [suggestionText, setSuggestionText] = useState('')
  const joystickRef = useRef<any>(null)

  const openMiniChat = () => setMiniChatOpen(true)

  useEffect(() => {
    // Initialize virtual joystick for mobile
    const joystickZone = document.getElementById('joystick-zone')
    if (joystickZone) {
      const options: any = {
        zone: joystickZone,
        mode: 'static' as const,
        position: { left: '50%', top: '50%' },
        color: 'blue'
      }
      joystickRef.current = nipplejs.create(options)

      joystickRef.current.on('move', (evt: any, data: any) => {
        // Handle joystick movement for navigation
        console.log('Joystick moved:', data)
        // Could integrate with camera controls here
      })
    }

    return () => {
      if (joystickRef.current) {
        joystickRef.current.destroy()
      }
    }
  }, [])

  useEffect(() => {
    // Gamepad support
    const handleGamepad = () => {
      const gamepads = navigator.getGamepads()
      for (const gamepad of gamepads) {
        if (gamepad) {
          // Example: use left stick for movement
          const xAxis = gamepad.axes[0]
          const yAxis = gamepad.axes[1]
          if (Math.abs(xAxis) > 0.1 || Math.abs(yAxis) > 0.1) {
            // Move camera based on gamepad input
            console.log('Gamepad movement:', xAxis, yAxis)
            // Integrate with camera controls
          }
        }
      }
    }

    const gamepadInterval = setInterval(handleGamepad, 100)
    return () => clearInterval(gamepadInterval)
  }, [])

  const handleMagicWandClick = () => {
    setMagicWandActive(!magicWandActive)
  }

  const handleSendSuggestion = () => {
    if (suggestionText.trim()) {
      onSendSuggestion(suggestionText)
      setSuggestionText('')
      setMiniChatOpen(false)
    }
  }



  return (
    <div className="relative w-full h-full bg-black">
      <Canvas className="w-full h-full">
        <Scene onMagicWandSelect={onMagicWandSelect} suggestions={suggestions} onOpenMiniChat={openMiniChat} />
      </Canvas>

      {/* Joystick Zone for Mobile */}
      <div id="joystick-zone" className="absolute bottom-4 left-4 w-32 h-32"></div>

      {/* Magic Wand Button */}
      <button
        onClick={handleMagicWandClick}
        className={`absolute top-4 left-4 p-3 rounded-full ${magicWandActive ? 'bg-purple-600' : 'bg-gray-700'} hover:bg-purple-500 transition`}
        title="Magic Wand - Select areas to improve"
      >
        <span className="text-xs font-semibold">Tools</span>
      </button>

      {/* Mini Chat Button */}
      <button
        onClick={() => setMiniChatOpen(!miniChatOpen)}
        className="absolute top-4 right-4 p-3 rounded-full bg-blue-600 hover:bg-blue-700 transition"
        title="Open Mini Chat"
      >
        <span className="text-xs font-semibold">Chat</span>
      </button>

      {/* Mini Chat Panel */}
      {miniChatOpen && (
        <div className="absolute top-16 right-4 bg-gray-800 p-4 rounded-lg shadow-lg w-80">
          <h4 className="text-white mb-2">Suggestions for AI</h4>
          <textarea
            value={suggestionText}
            onChange={(e) => setSuggestionText(e.target.value)}
            placeholder="Tell the AI what to improve..."
            className="w-full p-2 bg-gray-700 text-white rounded mb-2"
            rows={3}
          />
          <button
            onClick={handleSendSuggestion}
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      )}

      {/* Joystick Zone for Mobile */}
      <div id="joystick-zone" className="absolute bottom-4 left-4 w-24 h-24 bg-gray-700 rounded-full opacity-50 md:hidden"></div>

      {/* Loading Indicator */}
      {isGenerating && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-white text-xl">AI is generating...</div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-gray-800 p-3 rounded text-white text-sm max-w-xs">
        Use WASD to move, mouse to look around, magic wand to select areas, mini chat for suggestions.
      </div>
    </div>
  )
}