import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CollisionDetector } from '@/lib/physics/physics-system-collision'
import { Constraint } from '@/lib/physics/physics-system-constraint'
import { RigidBody } from '@/lib/physics/physics-system-core'
import type { ColliderShape } from '@/lib/physics/physics-system-contracts'

function sphere(radius = 1): RigidBody {
  const collider: ColliderShape = {
    type: 'sphere',
    offset: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    radius,
  }
  return new RigidBody(collider)
}

describe('physics runtime modules', () => {
  it('detects sphere collisions and reports penetration', () => {
    const detector = new CollisionDetector()
    const a = sphere(1)
    const b = sphere(1)
    a.setPosition(new THREE.Vector3(0, 0, 0))
    b.setPosition(new THREE.Vector3(1.5, 0, 0))

    const contacts = detector.detectCollision(a, b)

    expect(contacts).toHaveLength(1)
    expect(contacts?.[0].penetration).toBeCloseTo(0.5)
    expect(contacts?.[0].normal.x).toBeCloseTo(1)
  })

  it('raycasts against sphere bodies', () => {
    const detector = new CollisionDetector()
    const body = sphere(1)
    body.setPosition(new THREE.Vector3(0, 0, 5))

    const hit = detector.raycast(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 1),
      10,
      [body],
    )

    expect(hit?.body).toBe(body)
    expect(hit?.distance).toBeCloseTo(4)
  })

  it('solves distance constraints by correcting dynamic bodies', () => {
    const a = sphere(1)
    const b = sphere(1)
    a.setPosition(new THREE.Vector3(0, 0, 0))
    b.setPosition(new THREE.Vector3(5, 0, 0))

    const constraint = new Constraint({
      type: 'distance',
      bodyA: a,
      bodyB: b,
      pivotA: new THREE.Vector3(),
      pivotB: new THREE.Vector3(),
      maxDistance: 2,
    })

    constraint.solve(1 / 60)

    expect(a.position.x).toBeGreaterThan(0)
    expect(b.position.x).toBeLessThan(5)
  })
})
