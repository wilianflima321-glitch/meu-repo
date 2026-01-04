export class ConnectionContainerModule {
  static create(factory: (ctx: { bind: any; bindBackendService: any; bindFrontendService: any }) => void): ConnectionContainerModule;
}
