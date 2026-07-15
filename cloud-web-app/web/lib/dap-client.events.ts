import type {
  BreakpointEventBody,
  DapEvent,
  OutputEventBody,
  Source,
  StoppedEventBody,
} from './dap-client.contracts'

export interface DapEventDispatcher {
  markInitialized: () => void
  updateCapabilities: (capabilities: Record<string, unknown>) => Record<string, unknown>
  emit: (eventName: string, ...args: unknown[]) => void
  logUnknown: (eventName: string, body: Record<string, unknown>) => void
}

export function dispatchDapEvent(event: DapEvent, dispatcher: DapEventDispatcher): void {
  const body = event.body || {}

  switch (event.event) {
    case 'initialized':
      dispatcher.markInitialized()
      dispatcher.emit('initialized')
      break

    case 'stopped':
      dispatcher.emit('stopped', body as unknown as StoppedEventBody)
      break

    case 'continued':
      dispatcher.emit('continued', (body as { threadId: number }).threadId)
      break

    case 'exited':
      dispatcher.emit('exited', (body as { exitCode: number }).exitCode)
      break

    case 'terminated':
      dispatcher.emit('terminated')
      break

    case 'thread': {
      const threadBody = body as { reason: 'started' | 'exited'; threadId: number }
      dispatcher.emit('thread', threadBody.reason, threadBody.threadId)
      break
    }

    case 'output':
      dispatcher.emit('output', body as unknown as OutputEventBody)
      break

    case 'breakpoint':
      dispatcher.emit('breakpoint', body as unknown as BreakpointEventBody)
      break

    case 'module': {
      const moduleBody = body as { reason: 'new' | 'changed' | 'removed'; module: unknown }
      dispatcher.emit('module', moduleBody.reason, moduleBody.module)
      break
    }

    case 'loadedSource': {
      const sourceBody = body as { reason: 'new' | 'changed' | 'removed'; source: Source }
      dispatcher.emit('loadedSource', sourceBody.reason, sourceBody.source)
      break
    }

    case 'process': {
      const processBody = body as { name: string; startMethod?: string }
      dispatcher.emit('process', processBody.name, processBody.startMethod)
      break
    }

    case 'capabilities': {
      const nextCapabilities = dispatcher.updateCapabilities(
        (body as { capabilities: Record<string, unknown> }).capabilities,
      )
      dispatcher.emit('capabilities', nextCapabilities)
      break
    }

    default:
      dispatcher.logUnknown(event.event, body)
  }
}
