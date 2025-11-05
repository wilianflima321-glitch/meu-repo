"use strict";
// *****************************************************************************
// Copyright (C) 2023 TypeFox and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeWebpackPlugin = void 0;
const path = require("path");
const fs = require("fs");
const os = require("os");
const REQUIRE_RIPGREP = '@vscode/ripgrep';
const REQUIRE_VSCODE_WINDOWS_CA_CERTS = '@vscode/windows-ca-certs';
const REQUIRE_BINDINGS = 'bindings';
const REQUIRE_KEYMAPPING = './build/Release/keymapping';
const REQUIRE_PARCEL_WATCHER = './build/Release/watcher.node';
const REQUIRE_NODE_PTY_CONPTY = '../build/Release/conpty.node';
class NativeWebpackPlugin {
    constructor(options) {
        var _a;
        this.bindings = new Map();
        this.options = options;
        for (const [name, value] of Object.entries((_a = options.nativeBindings) !== null && _a !== void 0 ? _a : {})) {
            this.nativeBinding(name, value);
        }
    }
    nativeBinding(dependency, nodePath) {
        this.bindings.set(dependency, nodePath);
    }
    apply(compiler) {
        let replacements = {};
        let nodePtyIssuer;
        let trashHelperIssuer;
        let ripgrepIssuer;
        compiler.hooks.initialize.tap(NativeWebpackPlugin.name, async () => {
            var _a;
            const directory = path.resolve(compiler.outputPath, 'native-webpack-plugin');
            await fs.promises.mkdir(directory, { recursive: true });
            const bindingsFile = (issuer) => buildFile(directory, 'bindings.js', bindingsReplacement(issuer, Array.from(this.bindings.entries())));
            const ripgrepFile = () => buildFile(directory, 'ripgrep.js', ripgrepReplacement(this.options.out));
            const keymappingFile = () => Promise.resolve('./build/Release/keymapping.node');
            const windowsCaCertsFile = () => Promise.resolve('@vscode/windows-ca-certs/build/Release/crypt32.node');
            replacements = {
                ...((_a = this.options.replacements) !== null && _a !== void 0 ? _a : {}),
                [REQUIRE_RIPGREP]: ripgrepFile,
                [REQUIRE_BINDINGS]: bindingsFile,
                [REQUIRE_KEYMAPPING]: keymappingFile,
                [REQUIRE_VSCODE_WINDOWS_CA_CERTS]: windowsCaCertsFile,
                [REQUIRE_PARCEL_WATCHER]: issuer => Promise.resolve(findNativeWatcherFile(issuer))
            };
            if (process.platform !== 'win32') {
                // The expected conpty.node file is not available on non-windows platforms during build.
                // We need to provide a stub that will be replaced by the real file at runtime.
                replacements[REQUIRE_NODE_PTY_CONPTY] = () => buildFile(directory, 'conpty.js', conhostWindowsReplacement());
            }
        });
        compiler.hooks.normalModuleFactory.tap(NativeWebpackPlugin.name, (nmf) => {
            nmf.hooks.beforeResolve.tapPromise(NativeWebpackPlugin.name, async (result) => {
                var _a;
                if (!result) {
                    return undefined;
                }
                const issuer = (_a = result.contextInfo.issuer) !== null && _a !== void 0 ? _a : '';
                if (result.request === REQUIRE_RIPGREP) {
                    ripgrepIssuer = issuer;
                }
                else if (result.request === 'node-pty') {
                    nodePtyIssuer = issuer;
                }
                else if (result.request === 'trash') {
                    trashHelperIssuer = issuer;
                }
                for (const [file, replacement] of Object.entries(replacements)) {
                    if (result.request === file) {
                        result.request = await replacement(issuer);
                    }
                }
                return result;
            });
        });
        compiler.hooks.afterEmit.tapPromise(NativeWebpackPlugin.name, async () => {
            if (this.options.trash && trashHelperIssuer) {
                await this.copyTrashHelper(trashHelperIssuer, compiler);
            }
            if (this.options.ripgrep && ripgrepIssuer) {
                await this.copyRipgrep(ripgrepIssuer, compiler);
            }
            if (this.options.pty && nodePtyIssuer) {
                await this.copyNodePtySpawnHelper(nodePtyIssuer, compiler);
            }
        });
    }
    async copyRipgrep(issuer, compiler) {
        const suffix = process.platform === 'win32' ? '.exe' : '';
        const sourceFile = require.resolve(`@vscode/ripgrep/bin/rg${suffix}`, { paths: [issuer] });
        const targetFile = path.join(compiler.outputPath, this.options.out, `rg${suffix}`);
        await this.copyExecutable(sourceFile, targetFile);
    }
    async copyNodePtySpawnHelper(issuer, compiler) {
        const targetDirectory = path.resolve(compiler.outputPath, '..', 'build', 'Release');
        if (process.platform === 'win32') {
            const agentFile = require.resolve('node-pty/build/Release/winpty-agent.exe', { paths: [issuer] });
            const targetAgentFile = path.join(targetDirectory, 'winpty-agent.exe');
            await this.copyExecutable(agentFile, targetAgentFile);
            const dllFile = require.resolve('node-pty/build/Release/winpty.dll', { paths: [issuer] });
            const targetDllFile = path.join(targetDirectory, 'winpty.dll');
            await this.copyExecutable(dllFile, targetDllFile);
        }
        else if (process.platform === 'darwin') {
            const sourceFile = require.resolve('node-pty/build/Release/spawn-helper', { paths: [issuer] });
            const targetFile = path.join(targetDirectory, 'spawn-helper');
            await this.copyExecutable(sourceFile, targetFile);
        }
    }
    async copyTrashHelper(issuer, compiler) {
        let sourceFile;
        let targetFile;
        if (process.platform === 'win32') {
            sourceFile = require.resolve('trash/lib/windows-trash.exe', { paths: [issuer] });
            targetFile = path.join(compiler.outputPath, 'windows-trash.exe');
        }
        else if (process.platform === 'darwin') {
            sourceFile = require.resolve('trash/lib/macos-trash', { paths: [issuer] });
            targetFile = path.join(compiler.outputPath, 'macos-trash');
        }
        if (sourceFile && targetFile) {
            await this.copyExecutable(sourceFile, targetFile);
        }
    }
    async copyExecutable(source, target) {
        const targetDirectory = path.dirname(target);
        await fs.promises.mkdir(targetDirectory, { recursive: true });
        await fs.promises.copyFile(source, target);
        await fs.promises.chmod(target, 0o777);
    }
}
exports.NativeWebpackPlugin = NativeWebpackPlugin;
function findNativeWatcherFile(issuer) {
    let name = `@parcel/watcher-${process.platform}-${process.arch}`;
    if (process.platform === 'linux') {
        const { MUSL, family } = require('detect-libc');
        if (family === MUSL) {
            name += '-musl';
        }
        else {
            name += '-glibc';
        }
    }
    return require.resolve(name, {
        paths: [issuer]
    });
}
async function buildFile(root, name, content) {
    const tmpFile = path.join(root, name);
    let write = true;
    try {
        const existing = await fs.promises.readFile(tmpFile, 'utf8');
        if (existing === content) {
            // prevent writing the same content again
            // this would trigger the watch mode repeatedly
            write = false;
        }
    }
    catch {
        // ignore
    }
    if (write) {
        await fs.promises.writeFile(tmpFile, content);
    }
    return tmpFile;
}
const ripgrepReplacement = (nativePath = '.') => `
const path = require('path');

exports.rgPath = path.join(__dirname, \`./${nativePath}/rg\${process.platform === 'win32' ? '.exe' : ''}\`);
`;
const bindingsReplacement = (issuer, entries) => {
    const cases = [];
    for (const [module, node] of entries) {
        const modulePath = require.resolve(node, {
            paths: [issuer]
        });
        cases.push(`${' '.repeat(8)}case '${module}': return require('${modulePath.replace(/\\/g, '/')}');`);
    }
    return `
module.exports = function (jsModule) {
    switch (jsModule) {
${cases.join(os.EOL)}
    }
    throw new Error(\`unhandled module: "\${jsModule}"\`);
}`.trim();
};
const conhostWindowsReplacement = (nativePath = '.') => `
module.exports = __non_webpack_require__('${nativePath}/native/conpty.node');
`;
//# sourceMappingURL=native-webpack-plugin.js.map