import { NextResponse } from 'next/server'
import { createComponentLogger } from '@/lib/observability/logger'

const logger = createComponentLogger('api.desktop.update')

const LATEST_VERSION = '1.0.1'
const UPDATE_MANIFEST = {
  version: LATEST_VERSION,
  notes: 'Aethel Studio Local Beta update. Stability fixes for WGPU viewport and ONNX model cache routing.',
  pub_date: '2026-06-25T18:41:56Z',
  platforms: {
    'windows-x86_64': {
      signature: 'dW5zaWduZWQgYm9keSBmb3IgdGVzdGluZyB1cGRhdGU=',
      url: 'https://assets.aethel.com/releases/Aethel-Studio-Local-Setup.zip',
    },
    'darwin-aarch64': {
      signature: 'dW5zaWduZWQgYm9keSBmb3IgdGVzdGluZyB1cGRhdGU=',
      url: 'https://assets.aethel.com/releases/Aethel-Studio-Local-universal.zip',
    },
    'darwin-x86_64': {
      signature: 'dW5zaWduZWQgYm9keSBmb3IgdGVzdGluZyB1cGRhdGU=',
      url: 'https://assets.aethel.com/releases/Aethel-Studio-Local-universal.zip',
    },
    'linux-x86_64': {
      signature: 'dW5zaWduZWQgYm9keSBmb3IgdGVzdGluZyB1cGRhdGU=',
      url: 'https://assets.aethel.com/releases/aethel-studio-local.zip',
    },
  },
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const version = url.searchParams.get('version')
    const platform = url.searchParams.get('platform')

    logger.info(`Received updater request: version=${version}, platform=${platform}`)

    if (!version) {
      return NextResponse.json({ error: 'Missing version parameter' }, { status: 400 })
    }

    if (version === LATEST_VERSION) {
      return new Response(null, { status: 204 })
    }

    // Otherwise, return update details
    return NextResponse.json(UPDATE_MANIFEST)
  } catch (error: any) {
    logger.error('Failed to process updater check', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
