const USER_COLOR_TOKENS = [
  '--aethel-collab-mocha-0',
  '--aethel-collab-mocha-1',
  '--aethel-collab-mocha-2',
  '--aethel-collab-mocha-3',
  '--aethel-collab-mocha-4',
  '--aethel-collab-mocha-6',
  '--aethel-collab-mocha-7',
  '--aethel-collab-mocha-8',
] as const

export function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash = hash & hash
  }
  const token = USER_COLOR_TOKENS[Math.abs(hash) % USER_COLOR_TOKENS.length]
  return `var(${token})`
}
