import * as path from 'path';
import * as vm from 'vm';
import type { ExtensionContext } from './extension-host/types';

const nativeRequire = eval('require') as NodeRequire;

export type ExtensionModule = {
  activate?: (ctx: ExtensionContext) => unknown | Promise<unknown>;
  deactivate?: () => void | Promise<void>;
};

export function createExtensionRequire(basePath: string): (id: string) => unknown {
  return (id: string) => {
    if (id.startsWith('.')) {
      return nativeRequire(path.join(basePath, id)) as unknown;
    }

    return nativeRequire(id) as unknown;
  };
}

export function executeExtensionModule(input: {
  code: string;
  filename: string;
  extensionPath: string;
  api: unknown;
}): ExtensionModule {
  const sandbox = {
    exports: {},
    module: { exports: {} },
    require: createExtensionRequire(input.extensionPath),
    console,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    setImmediate,
    clearImmediate,
    Buffer,
    process: {
      env: process.env,
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      cwd: () => input.extensionPath,
    },
    vscode: input.api,
    aethel: input.api,
  };

  const script = new vm.Script(input.code, { filename: input.filename });
  const vmContext = vm.createContext(sandbox);
  script.runInContext(vmContext);

  return (sandbox.module.exports || sandbox.exports) as ExtensionModule;
}
