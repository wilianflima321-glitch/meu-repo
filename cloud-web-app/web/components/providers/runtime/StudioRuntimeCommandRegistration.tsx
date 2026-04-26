'use client'

import { useDefaultCommands } from '@/lib/commands/command-registry'

export default function StudioRuntimeCommandRegistration() {
  useDefaultCommands()
  return null
}
