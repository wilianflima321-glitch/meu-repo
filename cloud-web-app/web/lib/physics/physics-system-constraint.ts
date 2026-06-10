// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
import type * as THREE from 'three'
import type { ConstraintType } from './physics-system-contracts'
import { RigidBody } from './physics-system-core'

export interface ConstraintConfig {
  type: ConstraintType
  bodyA: RigidBody
  bodyB: RigidBody | null
  pivotA: THREE.Vector3
  pivotB: THREE.Vector3
  axisA?: THREE.Vector3
  axisB?: THREE.Vector3
  lowerLimit?: number
  upperLimit?: number
  stiffness?: number
  damping?: number
  restLength?: number
  minDistance?: number
  maxDistance?: number
}

export class Constraint {
  id: string
  config: ConstraintConfig
  enabled = true
  private static idCounter = 0
  constructor(config: ConstraintConfig) {
    this.id = `constraint_${++Constraint.idCounter}`
    this.config = config
  }
  solve(dt: number): void {
    const { bodyA, bodyB, type } = this.config
    switch (type) {
      case 'distance':
        this.solveDistance(dt)
        break
      case 'spring':
        this.solveSpring(dt)
        break
      case 'fixed':
        this.solveFixed(dt)
        break
    }
  }
  private solveDistance(_dt: number): void {
    const { bodyA, bodyB, minDistance, maxDistance } = this.config
    if (!bodyB) return
    const worldPivotA = this.config.pivotA.clone().applyQuaternion(bodyA.rotation).add(bodyA.position)
    const worldPivotB = this.config.pivotB.clone().applyQuaternion(bodyB.rotation).add(bodyB.position)
    const diff = worldPivotB.clone().sub(worldPivotA)
    const distance = diff.length()
    const min = minDistance ?? 0
    const max = maxDistance ?? Infinity
    if (distance >= min && distance <= max) return
    const normal = diff.normalize()
    const targetDistance = distance < min ? min : max
    const correction = (distance - targetDistance) * 0.5
    if (bodyA.config.type === 'dynamic') {
      bodyA.position.add(normal.clone().multiplyScalar(correction))
    }
    if (bodyB.config.type === 'dynamic') {
      bodyB.position.sub(normal.clone().multiplyScalar(correction))
    }
  }
  private solveSpring(dt: number): void {
    const { bodyA, bodyB, stiffness = 100, damping = 1, restLength = 0 } = this.config
    if (!bodyB) return
    const worldPivotA = this.config.pivotA.clone().applyQuaternion(bodyA.rotation).add(bodyA.position)
    const worldPivotB = this.config.pivotB.clone().applyQuaternion(bodyB.rotation).add(bodyB.position)
    const diff = worldPivotB.clone().sub(worldPivotA)
    const distance = diff.length()
    const normal = diff.normalize()
    const displacement = distance - restLength
    const relativeVelocity = bodyB.linearVelocity.clone().sub(bodyA.linearVelocity)
    const velocityAlongSpring = relativeVelocity.dot(normal)
    const forceMagnitude = stiffness * displacement + damping * velocityAlongSpring
    const force = normal.clone().multiplyScalar(forceMagnitude)
    bodyA.applyForce(force, worldPivotA)
    bodyB.applyForce(force.negate(), worldPivotB)
  }
  private solveFixed(_dt: number): void {
    const { bodyA, bodyB } = this.config
    if (!bodyB) return
    const targetOffset = this.config.pivotB.clone().sub(this.config.pivotA)
    const worldPivotA = this.config.pivotA.clone().applyQuaternion(bodyA.rotation).add(bodyA.position)
    const targetPosition = worldPivotA.clone().add(targetOffset.applyQuaternion(bodyA.rotation))
    if (bodyB.config.type === 'dynamic') {
      const correction = targetPosition.sub(bodyB.position)
      bodyB.position.add(correction.multiplyScalar(0.5))
      bodyB.rotation.copy(bodyA.rotation)
    }
  }
}
