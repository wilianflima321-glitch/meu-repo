import { useCallback, useEffect, useRef, useState } from 'react'

import { ParticleEmitter, ParticleSystemManager } from './advanced-particle-system'
import type { ParticleSystemSettings } from './advanced-particle-system-types'

export function useParticleSystem() {
  const managerRef = useRef<ParticleSystemManager>(new ParticleSystemManager())
  const [emitters, setEmitters] = useState<ParticleEmitter[]>([])
  const [totalParticles, setTotalParticles] = useState(0)

  useEffect(() => {
    const manager = managerRef.current

    const updateEmitters = () => setEmitters(manager.getAllEmitters())

    manager.on('emitterCreated', updateEmitters)
    manager.on('emitterRemoved', updateEmitters)

    return () => {
      manager.removeAllListeners()
      manager.dispose()
    }
  }, [])

  const update = useCallback((deltaTime: number) => {
    managerRef.current.update(deltaTime)
    setTotalParticles(managerRef.current.getTotalParticleCount())
  }, [])

  const createEmitter = useCallback((settings: ParticleSystemSettings) => {
    return managerRef.current.createEmitter(settings)
  }, [])

  const createFire = useCallback((pos: { x: number; y: number; z: number }) => {
    return managerRef.current.createFireEffect(pos)
  }, [])

  const createSmoke = useCallback((pos: { x: number; y: number; z: number }) => {
    return managerRef.current.createSmokeEffect(pos)
  }, [])

  const createSparks = useCallback((pos: { x: number; y: number; z: number }) => {
    return managerRef.current.createSparkEffect(pos)
  }, [])

  return {
    manager: managerRef.current,
    emitters,
    totalParticles,
    update,
    createEmitter,
    createFire,
    createSmoke,
    createSparks,
    playAll: () => managerRef.current.playAll(),
    stopAll: () => managerRef.current.stopAll(),
    pauseAll: () => managerRef.current.pauseAll(),
    removeEmitter: (id: string) => managerRef.current.removeEmitter(id),
    getGroup: () => managerRef.current.getGroup(),
  }
}
