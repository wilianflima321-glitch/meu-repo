import { createHash } from 'crypto'
import { hash as localHash, CRYPTO_VERSION } from '@/packages/core/crypto'
import { createLogger } from '@/packages/utils/logger'
import { appLogger } from './logger'

const log = createLogger('main')

export function boot(seed: string): string {
  const nodeDigest = createHash('sha256').update(seed).digest('hex').slice(0, 8)
  return log.info(`${localHash(seed)}:${CRYPTO_VERSION}:${appLogger(nodeDigest)}`)
}
