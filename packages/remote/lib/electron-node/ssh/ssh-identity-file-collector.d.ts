import { ParsedKey } from 'ssh2';
export interface SSHKey {
    filename: string;
    parsedKey: ParsedKey;
    fingerprint: string;
    agentSupport?: boolean;
    isPrivate?: boolean;
}
export declare class SSHIdentityFileCollector {
    protected getDefaultIdentityFiles(): string[];
    gatherIdentityFiles(sshAgentSock?: string, overrideIdentityFiles?: string[]): Promise<SSHKey[]>;
}
//# sourceMappingURL=ssh-identity-file-collector.d.ts.map