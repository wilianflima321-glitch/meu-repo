export type NodeStatus = 'success' | 'failure' | 'running'

export interface BehaviorTreeContext {
  entity: unknown
  world: unknown
  deltaTime: number
  blackboard: Blackboard
}

export interface Blackboard {
  data: Map<string, unknown>
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  has(key: string): boolean
  delete(key: string): void
  clear(): void
}

export class BlackboardImpl implements Blackboard {
  data: Map<string, unknown> = new Map()

  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined
  }

  set<T>(key: string, value: T): void {
    this.data.set(key, value)
  }

  has(key: string): boolean {
    return this.data.has(key)
  }

  delete(key: string): void {
    this.data.delete(key)
  }

  clear(): void {
    this.data.clear()
  }
}

export abstract class BehaviorNode {
  id: string
  name: string
  children: BehaviorNode[] = []
  parent: BehaviorNode | null = null

  constructor(name: string) {
    this.id = `node_${Math.random().toString(36).substr(2, 9)}`
    this.name = name
  }

  abstract tick(context: BehaviorTreeContext): NodeStatus

  addChild(child: BehaviorNode): this {
    child.parent = this
    this.children.push(child)
    return this
  }

  removeChild(child: BehaviorNode): void {
    const index = this.children.indexOf(child)
    if (index !== -1) {
      this.children.splice(index, 1)
      child.parent = null
    }
  }

  reset(): void {
    this.children.forEach((child) => child.reset())
  }
}
