export interface PackageJson {
    name: string;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    theiaReExports?: Record<string, ReExportJson>;
}
/**
 * Raw re-export declaration as written in `package.json#theiaReExports[<destination>]`.
 */
export interface ReExportJson {
    'export *'?: string[];
    'export ='?: string[];
    copy?: string;
}
/**
 * Examples:
 * - `a` => `['a']`
 * - `a/b/c/...` => `['a', 'b/c/...']`
 * - `@a/b` => `['@a/b']`
 * - `@a/b/c/...` => `['@a/b', 'c/...']`
 */
export declare function parseModule(moduleName: string): [string, string?];
//# sourceMappingURL=utility.d.ts.map