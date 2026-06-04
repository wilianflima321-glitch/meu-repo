export type ThreeNamespace = typeof import('three')
export type ReactThreeFiberNamespace = typeof import('@react-three/fiber')
export type ReactThreeDreiNamespace = typeof import('@react-three/drei')

let threePromise: Promise<ThreeNamespace> | null = null
let reactThreeFiberPromise: Promise<ReactThreeFiberNamespace> | null = null
let reactThreeDreiPromise: Promise<ReactThreeDreiNamespace> | null = null

export function loadThree(): Promise<ThreeNamespace> {
  threePromise ??= import('three')
  return threePromise
}

export function loadReactThreeFiber(): Promise<ReactThreeFiberNamespace> {
  reactThreeFiberPromise ??= import('@react-three/fiber')
  return reactThreeFiberPromise
}

export function loadReactThreeDrei(): Promise<ReactThreeDreiNamespace> {
  reactThreeDreiPromise ??= import('@react-three/drei')
  return reactThreeDreiPromise
}

export async function loadThreeExamples<TModule>(loader: () => Promise<TModule>): Promise<TModule> {
  return loader()
}
