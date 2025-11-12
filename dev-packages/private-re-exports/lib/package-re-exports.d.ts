import { PackageJson, ReExportJson } from './utility';
export declare function readJson<T = unknown>(jsonPath: string): Promise<T>;
export declare function readPackageJson(packageName: string, options?: {
    paths?: string[];
}): Promise<[string, PackageJson]>;
export declare function parsePackageReExports(packageJsonPath: string, packageJson: PackageJson): Promise<[string, ReExport[]]>;
export declare function resolveTheiaReExports(packageJsonPath: string, packageJson: PackageJson, reExportDir: string, reExportJson: ReExportJson): Promise<ReExport[]>;
export declare function getPackageVersionRange(packageJson: PackageJson, packageName: string): string;
export type ReExport = ReExportStar | ReExportEqual;
export interface ReExportInfo {
    /**
     * The full name of the module. e.g. '@some/dep/nested/file'
     */
    moduleName: string;
    /**
     * Name of the package the re-export is from. e.g. '@some/dep' in '@some/dep/nested/file'
     */
    packageName: string;
    /**
     * Name of the file within the package. e.g. 'nested/file' in '@some/dep/nested/file'
     */
    subModuleName?: string;
    /**
     * Name/path of the directory where the re-exports should be located.
     */
    reExportDir: string;
    /**
     * Import statement used internally for the re-export.
     */
    internalImport: string;
    /**
     * Import name dependents should use externally for the re-export.
     */
    externalImport: string;
    /**
     * Name of the package that depends on the re-export.
     */
    hostPackageName: string;
    /**
     * Version range defined by the host package depending on the re-export.
     */
    versionRange: string;
}
export interface ReExportStar extends ReExportInfo {
    reExportStyle: '*';
}
export interface ReExportEqual extends ReExportInfo {
    reExportStyle: '=';
    /**
     * Pretty name for the re-exported namespace. e.g. 'react-dom' as 'ReactDOM'
     */
    exportNamespace: string;
}
export declare class PackageReExports {
    readonly packageName: string;
    readonly packageRoot: string;
    readonly all: readonly Readonly<ReExport>[];
    static FromPackage(packageName: string): Promise<PackageReExports>;
    static FromPackageSync(packageName: string): PackageReExports;
    constructor(packageName: string, packageRoot: string, all: readonly Readonly<ReExport>[]);
    findReExportByModuleName(moduleName: string): ReExport | undefined;
    findReExportsByPackageName(packageName: string): ReExport[];
    resolvePath(...parts: string[]): string;
}
//# sourceMappingURL=package-re-exports.d.ts.map