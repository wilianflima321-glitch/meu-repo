export declare class TheiaWorkspace {
    protected pathOfFilesToInitialize?: string[] | undefined;
    protected workspacePath: string;
    /**
     * Creates a Theia workspace location with the specified path to files that shall be copied to this workspace.
     * The `pathOfFilesToInitialize` must be relative to cwd of the node process.
     *
     * @param {string[]} pathOfFilesToInitialize Path to files or folders that shall be copied to the workspace
     */
    constructor(pathOfFilesToInitialize?: string[] | undefined);
    /** Performs the file system operations preparing the workspace location synchronously. */
    initialize(): void;
    /** Returns the absolute path to the workspace location. */
    get path(): string;
    /**
     * Returns the absolute path to the workspace location
     * as it would be returned by URI.path.
     */
    get pathAsPathComponent(): string;
    /**
     * Returns a file URL for the given subpath relative to the workspace location.
     */
    pathAsUrl(subpath: string): string;
    clear(): void;
    remove(): void;
}
//# sourceMappingURL=theia-workspace.d.ts.map