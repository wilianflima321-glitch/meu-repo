"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceFunctionScope = exports.FindFilesByPattern = exports.FileDiagnosticProvider = exports.GetWorkspaceDirectoryStructure = exports.FileContentFunction = exports.GetWorkspaceFileList = void 0;
// Provide runtime tokens (values) for DI / bindToolProvider usage as well as types.
exports.GetWorkspaceFileList = Symbol('GetWorkspaceFileList');
exports.FileContentFunction = Symbol('FileContentFunction');
exports.GetWorkspaceDirectoryStructure = Symbol('GetWorkspaceDirectoryStructure');
exports.FileDiagnosticProvider = Symbol('FileDiagnosticProvider');
exports.FindFilesByPattern = Symbol('FindFilesByPattern');
class WorkspaceFunctionScope {
}
exports.WorkspaceFunctionScope = WorkspaceFunctionScope;
