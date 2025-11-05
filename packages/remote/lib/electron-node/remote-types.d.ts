/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { Disposable, Event } from '@theia/core';
import * as net from 'net';
export type RemoteStatusReport = (message: string) => void;
export interface ExpressLayer {
    name: string;
    regexp: RegExp;
    handle: Function;
    path?: string;
}
export interface RemoteExecOptions {
    env?: NodeJS.ProcessEnv;
}
export interface RemoteExecResult {
    stdout: string;
    stderr: string;
}
export type RemoteExecTester = (stdout: string, stderr: string) => boolean;
export interface RemoteConnection extends Disposable {
    id: string;
    name: string;
    type: string;
    localPort: number;
    remotePort: number;
    onDidDisconnect: Event<void>;
    forwardOut(socket: net.Socket, port?: number): void;
    /**
     * execute a single command on the remote machine
     */
    exec(cmd: string, args?: string[], options?: RemoteExecOptions): Promise<RemoteExecResult>;
    /**
     * execute a command on the remote machine and wait for a specific output
     * @param tester function which returns true if the output is as expected
     */
    execPartial(cmd: string, tester: RemoteExecTester, args?: string[], options?: RemoteExecOptions): Promise<RemoteExecResult>;
    /**
     * copy files from local to remote
     */
    copy(localPath: string | Buffer | NodeJS.ReadableStream, remotePath: string): Promise<void>;
    /**
     * used for disposing when theia is shutting down
     */
    disposeSync?(): void;
}
//# sourceMappingURL=remote-types.d.ts.map