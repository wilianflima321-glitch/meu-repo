// Provide runtime tokens (values) for DI / bindToolProvider usage as well as types.
export const GetWorkspaceFileList: any = Symbol('GetWorkspaceFileList');
export type GetWorkspaceFileList = any;

export const FileContentFunction: any = Symbol('FileContentFunction');
export type FileContentFunction = any;

export const GetWorkspaceDirectoryStructure: any = Symbol('GetWorkspaceDirectoryStructure');
export type GetWorkspaceDirectoryStructure = any;

export const FileDiagnosticProvider: any = Symbol('FileDiagnosticProvider');
export type FileDiagnosticProvider = any;

export const FindFilesByPattern: any = Symbol('FindFilesByPattern');
export type FindFilesByPattern = any;

export class WorkspaceFunctionScope {}
