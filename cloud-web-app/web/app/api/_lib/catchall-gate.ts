import { NextRequest } from 'next/server'
import { notImplementedCapability } from '@/lib/server/capability-response'

type CatchallParams = {
  path?: string[]
}

type CatchallGateOptions = {
  request: NextRequest
  params: CatchallParams
  namespace: string
  milestone?: string
}

export function catchallNotImplemented(options: CatchallGateOptions) {
  const path = Array.isArray(options.params.path) ? options.params.path.join('/') : ''
  const normalizedNamespace = options.namespace.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  const capability = `${normalizedNamespace}_CATCHALL`

  return notImplementedCapability({
    message: `Endpoint /api/${options.namespace}/${path || '[root]'} is not available in this release channel.`,
    capability,
    milestone: options.milestone || 'P1',
    metadata: {
      namespace: options.namespace,
      path,
      method: options.request.method,
    },
  })
}
