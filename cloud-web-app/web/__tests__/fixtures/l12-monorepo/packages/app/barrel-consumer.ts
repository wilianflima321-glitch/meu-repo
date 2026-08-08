import { formatLabel } from '@/packages/core'
import { boot } from './main'

export function labelBoot(name: string): string {
  return formatLabel(boot(name))
}
