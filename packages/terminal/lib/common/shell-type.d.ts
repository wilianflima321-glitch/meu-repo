export declare const enum GeneralShellType {
    Bash = "bash",
    Csh = "csh",
    Fish = "fish",
    Julia = "julia",
    Ksh = "ksh",
    Node = "node",
    NuShell = "nu",
    PowerShell = "pwsh",
    Python = "python",
    Sh = "sh",
    Zsh = "zsh"
}
export declare const enum WindowsShellType {
    CommandPrompt = "cmd",
    GitBash = "gitbash",
    Wsl = "wsl"
}
export type ShellType = GeneralShellType | WindowsShellType;
export declare const windowShellTypesToRegex: Map<string, RegExp>;
export declare const shellTypesToRegex: Map<string, RegExp>;
export declare function guessShellTypeFromExecutable(executable: string | undefined): string | undefined;
//# sourceMappingURL=shell-type.d.ts.map