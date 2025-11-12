"use strict";
// *****************************************************************************
// Copyright (C) 2022 Ericsson and others.
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
exports.PackageReExports = void 0;
exports.readJson = readJson;
exports.readPackageJson = readPackageJson;
exports.parsePackageReExports = parsePackageReExports;
exports.resolveTheiaReExports = resolveTheiaReExports;
exports.getPackageVersionRange = getPackageVersionRange;
const cp = require("child_process");
const fs = require("fs");
const path = require("path");
const utility_1 = require("./utility");
async function readJson(jsonPath) {
    return JSON.parse(await fs.promises.readFile(jsonPath, 'utf8'));
}
async function readPackageJson(packageName, options) {
    const packageJsonPath = require.resolve(`${packageName}/package.json`, options);
    const packageJson = await readJson(packageJsonPath);
    return [packageJsonPath, packageJson];
}
async function parsePackageReExports(packageJsonPath, packageJson) {
    const packageRoot = path.dirname(packageJsonPath);
    const { theiaReExports } = packageJson;
    if (!theiaReExports) {
        return [packageRoot, []];
    }
    const reExportsByExportDir = await Promise.all(Object.entries(theiaReExports).map(async ([reExportDir, reExportJson]) => resolveTheiaReExports(packageJsonPath, packageJson, reExportDir, reExportJson)));
    return [packageRoot, [].concat(...reExportsByExportDir)];
}
async function resolveTheiaReExports(packageJsonPath, packageJson, reExportDir, reExportJson) {
    if (reExportJson.copy) {
        const [packageName, dir] = reExportJson.copy.split('#', 2);
        const [subPackageJsonPath, subPackageJson] = await readPackageJson(packageName, { paths: [path.dirname(packageJsonPath)] });
        if (!subPackageJson.theiaReExports) {
            return [];
        }
        const reExports = await resolveTheiaReExports(subPackageJsonPath, subPackageJson, dir, subPackageJson.theiaReExports[dir]);
        return reExports.map(reExport => {
            reExport.reExportDir = reExportDir;
            reExport.internalImport = reExport.externalImport;
            reExport.externalImport = `${packageJson.name}/${reExportDir}/${reExport.moduleName}`;
            return reExport;
        });
    }
    const reExportsStar = reExportJson['export *'] || [];
    const reExportsEqual = reExportJson['export ='] || [];
    return [
        ...reExportsStar.map(moduleName => {
            const [packageName, subModuleName] = (0, utility_1.parseModule)(moduleName);
            return {
                moduleName,
                packageName,
                subModuleName,
                reExportStyle: '*',
                reExportDir,
                internalImport: moduleName,
                externalImport: `${packageJson.name}/${reExportDir}/${moduleName}`,
                hostPackageName: packageJson.name,
                versionRange: getPackageVersionRange(packageJson, packageName)
            };
        }),
        ...reExportsEqual.map(pattern => {
            const [moduleName, exportNamespace = moduleName] = pattern.split(' as ', 2);
            if (!/^[a-zA-Z_]\w/.test(exportNamespace)) {
                console.warn(`"${exportNamespace}" is not a valid namespace (module: ${moduleName})`);
            }
            const [packageName, subModuleName] = (0, utility_1.parseModule)(moduleName);
            return {
                moduleName,
                packageName,
                subModuleName,
                exportNamespace,
                reExportStyle: '=',
                reExportDir,
                internalImport: moduleName,
                externalImport: `${packageJson.name}/${reExportDir}/${moduleName}`,
                hostPackageName: packageJson.name,
                versionRange: getPackageVersionRange(packageJson, packageName),
            };
        })
    ];
}
function getPackageVersionRange(packageJson, packageName) {
    var _a, _b, _c;
    const range = ((_a = packageJson.dependencies) === null || _a === void 0 ? void 0 : _a[packageName])
        || ((_b = packageJson.optionalDependencies) === null || _b === void 0 ? void 0 : _b[packageName])
        || ((_c = packageJson.peerDependencies) === null || _c === void 0 ? void 0 : _c[packageName]);
    if (!range) {
        throw new Error(`package not found: ${packageName}`);
    }
    return range;
}
class PackageReExports {
    static async FromPackage(packageName) {
        const [packageJsonPath, packageJson] = await readPackageJson(packageName);
        const [packageRoot, reExports] = await parsePackageReExports(packageJsonPath, packageJson);
        return new PackageReExports(packageName, packageRoot, reExports);
    }
    static FromPackageSync(packageName) {
        // Some tools (e.g. eslint) don't support async operations.
        // To get around this, we can spawn a sub NodeJS process that will run the asynchronous
        // logic and then synchronously wait for the serialized result on the standard output.
        const scriptPath = require.resolve('./bin-package-re-exports-from-package.js');
        const { stdout } = cp.spawnSync(process.platform === 'win32' ? `"${process.argv[0]}"` : process.argv[0], [...process.execArgv, scriptPath, packageName], {
            env: {
                ELECTRON_RUN_AS_NODE: '1'
            },
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'inherit'],
            shell: true
        });
        const [packageRoot, reExports] = JSON.parse(stdout);
        return new PackageReExports(packageName, packageRoot, reExports);
    }
    constructor(packageName, packageRoot, all) {
        this.packageName = packageName;
        this.packageRoot = packageRoot;
        this.all = all;
    }
    findReExportByModuleName(moduleName) {
        return this.all.find(reExport => reExport.moduleName === moduleName);
    }
    findReExportsByPackageName(packageName) {
        return this.all.filter(reExport => reExport.packageName === packageName);
    }
    resolvePath(...parts) {
        return path.resolve(this.packageRoot, ...parts);
    }
}
exports.PackageReExports = PackageReExports;
//# sourceMappingURL=package-re-exports.js.map