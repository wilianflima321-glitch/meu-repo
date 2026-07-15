export function createDapInitializeArguments(): Record<string, unknown> {
  return {
    clientID: 'aethel-engine',
    clientName: 'Aethel Engine IDE',
    adapterID: 'aethel',
    pathFormat: 'path',
    linesStartAt1: true,
    columnsStartAt1: true,
    supportsVariableType: true,
    supportsVariablePaging: true,
    supportsRunInTerminalRequest: true,
    supportsMemoryReferences: true,
    supportsProgressReporting: true,
    supportsInvalidatedEvent: true,
    supportsMemoryEvent: true,
  }
}
