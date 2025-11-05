"use strict";
// *****************************************************************************
// Copyright (C) 2024 TypeFox and others.
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
exports.CollaborationInstance = exports.COLLABORATION_SELECTION_INVERTED = exports.COLLABORATION_SELECTION_MARKER = exports.COLLABORATION_SELECTION = exports.createCollaborationInstanceContainer = exports.CollaborationInstanceOptions = exports.CollaborationInstanceFactory = void 0;
const tslib_1 = require("tslib");
const types = require("open-collaboration-protocol");
const Y = require("yjs");
const awarenessProtocol = require("y-protocols/awareness");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const application_shell_1 = require("@theia/core/lib/browser/shell/application-shell");
const editor_manager_1 = require("@theia/editor/lib/browser/editor-manager");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const monaco_text_model_service_1 = require("@theia/monaco/lib/browser/monaco-text-model-service");
const collaboration_workspace_service_1 = require("./collaboration-workspace-service");
const monaco_editor_core_1 = require("@theia/monaco-editor-core");
const monaco_editor_1 = require("@theia/monaco/lib/browser/monaco-editor");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const browser_1 = require("@theia/editor/lib/browser");
const browser_2 = require("@theia/core/lib/browser");
const collaboration_file_system_provider_1 = require("./collaboration-file-system-provider");
const collaboration_color_service_1 = require("./collaboration-color-service");
const buffer_1 = require("@theia/core/lib/common/buffer");
const open_collaboration_yjs_1 = require("open-collaboration-yjs");
const mutex_1 = require("lib0/mutex");
const collaboration_utils_1 = require("./collaboration-utils");
const debounce = require("@theia/core/shared/lodash.debounce");
exports.CollaborationInstanceFactory = Symbol('CollaborationInstanceFactory');
exports.CollaborationInstanceOptions = Symbol('CollaborationInstanceOptions');
function createCollaborationInstanceContainer(parent, options) {
    const child = new inversify_1.Container();
    child.parent = parent;
    child.bind(CollaborationInstance).toSelf().inTransientScope();
    child.bind(exports.CollaborationInstanceOptions).toConstantValue(options);
    return child;
}
exports.createCollaborationInstanceContainer = createCollaborationInstanceContainer;
exports.COLLABORATION_SELECTION = 'theia-collaboration-selection';
exports.COLLABORATION_SELECTION_MARKER = 'theia-collaboration-selection-marker';
exports.COLLABORATION_SELECTION_INVERTED = 'theia-collaboration-selection-inverted';
let CollaborationInstance = class CollaborationInstance {
    constructor() {
        this.identity = new promise_util_1.Deferred();
        this.peers = new Map();
        this.yjs = new Y.Doc();
        this.yjsAwareness = new awarenessProtocol.Awareness(this.yjs);
        this.colorIndex = 0;
        this.editorDecorations = new Map();
        this.permissions = {
            readonly: false
        };
        this.onDidCloseEmitter = new core_1.Emitter();
        this.toDispose = new core_1.DisposableCollection();
        this._readonly = false;
        this.yjsMutex = (0, mutex_1.createMutex)();
    }
    get onDidClose() {
        return this.onDidCloseEmitter.event;
    }
    get readonly() {
        return this._readonly;
    }
    set readonly(value) {
        var _a;
        if (value !== this.readonly) {
            if (this.options.role === 'guest' && this.fileSystem) {
                this.fileSystem.readonly = value;
            }
            else if (this.options.role === 'host') {
                this.options.connection.room.updatePermissions({
                    ...((_a = this.permissions) !== null && _a !== void 0 ? _a : {}),
                    readonly: value
                });
            }
            if (this.permissions) {
                this.permissions.readonly = value;
            }
            this._readonly = value;
        }
    }
    get isHost() {
        return this.options.role === 'host';
    }
    get host() {
        return Array.from(this.peers.values()).find(e => e.peer.host).peer;
    }
    init() {
        const connection = this.options.connection;
        connection.onDisconnect(() => this.dispose());
        connection.onConnectionError(message => {
            this.messageService.error(message);
            this.dispose();
        });
        this.yjsProvider = new open_collaboration_yjs_1.OpenCollaborationYjsProvider(connection, this.yjs, this.yjsAwareness);
        this.yjsProvider.connect();
        this.toDispose.push(core_1.Disposable.create(() => this.yjs.destroy()));
        this.toDispose.push(this.yjsProvider);
        this.toDispose.push(connection);
        this.toDispose.push(this.onDidCloseEmitter);
        this.registerProtocolEvents(connection);
        this.registerEditorEvents(connection);
        this.registerFileSystemEvents(connection);
        if (this.isHost) {
            this.registerFileSystemChanges();
        }
    }
    registerProtocolEvents(connection) {
        connection.peer.onJoinRequest(async (_, user) => {
            var _a, _b;
            const allow = core_1.nls.localizeByDefault('Allow');
            const deny = core_1.nls.localizeByDefault('Deny');
            const result = await this.messageService.info(core_1.nls.localize('theia/collaboration/userWantsToJoin', "User '{0}' wants to join the collaboration room", user.email ? `${user.name} (${user.email})` : user.name), allow, deny);
            if (result === allow) {
                const roots = await this.workspaceService.roots;
                return {
                    workspace: {
                        name: (_b = (_a = this.workspaceService.workspace) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : core_1.nls.localize('theia/collaboration/collaboration', 'Collaboration'),
                        folders: roots.map(e => e.name)
                    }
                };
            }
            else {
                return undefined;
            }
        });
        connection.room.onJoin(async (_, peer) => {
            var _a, _b;
            this.addPeer(peer);
            if (this.isHost) {
                const roots = await this.workspaceService.roots;
                const data = {
                    protocol: types.VERSION,
                    host: await this.identity.promise,
                    guests: Array.from(this.peers.values()).map(e => e.peer),
                    capabilities: {},
                    permissions: this.permissions,
                    workspace: {
                        name: (_b = (_a = this.workspaceService.workspace) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : core_1.nls.localize('theia/collaboration/collaboration', 'Collaboration'),
                        folders: roots.map(e => e.name)
                    }
                };
                connection.peer.init(peer.id, data);
            }
        });
        connection.room.onLeave((_, peer) => {
            var _a;
            (_a = this.peers.get(peer.id)) === null || _a === void 0 ? void 0 : _a.dispose();
        });
        connection.room.onClose(() => {
            this.dispose();
        });
        connection.room.onPermissions((_, permissions) => {
            if (this.fileSystem) {
                this.fileSystem.readonly = permissions.readonly;
            }
        });
        connection.peer.onInfo((_, peer) => {
            this.yjsAwareness.setLocalStateField('peer', peer.id);
            this.identity.resolve(peer);
        });
        connection.peer.onInit(async (_, data) => {
            await this.initialize(data);
        });
    }
    registerEditorEvents(connection) {
        for (const model of this.monacoModelService.models) {
            if (this.isSharedResource(new core_1.URI(model.uri))) {
                this.registerModelUpdate(model);
            }
        }
        this.toDispose.push(this.monacoModelService.onDidCreate(newModel => {
            if (this.isSharedResource(new core_1.URI(newModel.uri))) {
                this.registerModelUpdate(newModel);
            }
        }));
        this.toDispose.push(this.editorManager.onCreated(widget => {
            if (this.isSharedResource(widget.getResourceUri())) {
                this.registerPresenceUpdate(widget);
            }
        }));
        this.getOpenEditors().forEach(widget => {
            if (this.isSharedResource(widget.getResourceUri())) {
                this.registerPresenceUpdate(widget);
            }
        });
        this.shell.onDidChangeActiveWidget(e => {
            if (e.newValue instanceof browser_1.EditorWidget) {
                this.updateEditorPresence(e.newValue);
            }
        });
        this.yjsAwareness.on('change', () => {
            this.rerenderPresence();
        });
        connection.editor.onOpen(async (_, path) => {
            const uri = this.utils.getResourceUri(path);
            if (uri) {
                await this.openUri(uri);
            }
            else {
                throw new Error('Could find file: ' + path);
            }
            return undefined;
        });
    }
    isSharedResource(resource) {
        if (!resource) {
            return false;
        }
        return this.isHost ? resource.scheme === 'file' : resource.scheme === collaboration_file_system_provider_1.CollaborationURI.scheme;
    }
    registerFileSystemEvents(connection) {
        connection.fs.onReadFile(async (_, path) => {
            const uri = this.utils.getResourceUri(path);
            if (uri) {
                const content = await this.fileService.readFile(uri);
                return {
                    content: content.value.buffer
                };
            }
            else {
                throw new Error('Could find file: ' + path);
            }
        });
        connection.fs.onReaddir(async (_, path) => {
            const uri = this.utils.getResourceUri(path);
            if (uri) {
                const resolved = await this.fileService.resolve(uri);
                if (resolved.children) {
                    const dir = {};
                    for (const child of resolved.children) {
                        dir[child.name] = child.isDirectory ? types.FileType.Directory : types.FileType.File;
                    }
                    return dir;
                }
                else {
                    return {};
                }
            }
            else {
                throw new Error('Could find directory: ' + path);
            }
        });
        connection.fs.onStat(async (_, path) => {
            const uri = this.utils.getResourceUri(path);
            if (uri) {
                const content = await this.fileService.resolve(uri, {
                    resolveMetadata: true
                });
                return {
                    type: content.isDirectory ? types.FileType.Directory : types.FileType.File,
                    ctime: content.ctime,
                    mtime: content.mtime,
                    size: content.size,
                    permissions: content.isReadonly ? types.FilePermission.Readonly : undefined
                };
            }
            else {
                throw new Error('Could find file: ' + path);
            }
        });
        connection.fs.onWriteFile(async (_, path, data) => {
            const uri = this.utils.getResourceUri(path);
            if (uri) {
                const model = this.getModel(uri);
                if (model) {
                    const content = new TextDecoder().decode(data.content);
                    if (content !== model.getText()) {
                        model.textEditorModel.setValue(content);
                    }
                    await model.save({ saveReason: browser_2.SaveReason.Manual });
                }
                else {
                    await this.fileService.createFile(uri, buffer_1.BinaryBuffer.wrap(data.content));
                }
            }
            else {
                throw new Error('Could find file: ' + path);
            }
        });
        connection.fs.onMkdir(async (_, path) => {
            const uri = this.utils.getResourceUri(path);
            if (uri) {
                await this.fileService.createFolder(uri);
            }
            else {
                throw new Error('Could find path: ' + path);
            }
        });
        connection.fs.onDelete(async (_, path) => {
            const uri = this.utils.getResourceUri(path);
            if (uri) {
                await this.fileService.delete(uri);
            }
            else {
                throw new Error('Could find entry: ' + path);
            }
        });
        connection.fs.onRename(async (_, from, to) => {
            const fromUri = this.utils.getResourceUri(from);
            const toUri = this.utils.getResourceUri(to);
            if (fromUri && toUri) {
                await this.fileService.move(fromUri, toUri);
            }
            else {
                throw new Error('Could find entries: ' + from + ' -> ' + to);
            }
        });
        connection.fs.onChange(async (_, event) => {
            // Only guests need to handle file system changes
            if (!this.isHost && this.fileSystem) {
                const changes = [];
                for (const change of event.changes) {
                    const uri = this.utils.getResourceUri(change.path);
                    if (uri) {
                        changes.push({
                            type: change.type === types.FileChangeEventType.Create
                                ? 1 /* FileChangeType.ADDED */
                                : change.type === types.FileChangeEventType.Update
                                    ? 0 /* FileChangeType.UPDATED */
                                    : 2 /* FileChangeType.DELETED */,
                            resource: uri
                        });
                    }
                }
                this.fileSystem.triggerEvent(changes);
            }
        });
    }
    rerenderPresence(...widgets) {
        const decorations = new Map();
        const states = this.yjsAwareness.getStates();
        for (const [clientID, state] of states.entries()) {
            if (clientID === this.yjs.clientID) {
                // Ignore own awareness state
                continue;
            }
            const peer = state.peer;
            if (!state.selection || !this.peers.has(peer)) {
                continue;
            }
            if (!types.ClientTextSelection.is(state.selection)) {
                continue;
            }
            const { path, textSelections } = state.selection;
            const selection = textSelections[0];
            if (!selection) {
                continue;
            }
            const uri = this.utils.getResourceUri(path);
            if (uri) {
                const model = this.getModel(uri);
                if (model) {
                    let existing = decorations.get(path);
                    if (!existing) {
                        existing = [];
                        decorations.set(path, existing);
                    }
                    const forward = selection.direction === types.SelectionDirection.LeftToRight;
                    let startIndex = Y.createAbsolutePositionFromRelativePosition(selection.start, this.yjs);
                    let endIndex = Y.createAbsolutePositionFromRelativePosition(selection.end, this.yjs);
                    if (startIndex && endIndex) {
                        if (startIndex.index > endIndex.index) {
                            [startIndex, endIndex] = [endIndex, startIndex];
                        }
                        const start = model.positionAt(startIndex.index);
                        const end = model.positionAt(endIndex.index);
                        const inverted = (forward && end.line === 0) || (!forward && start.line === 0);
                        const range = {
                            start,
                            end
                        };
                        const contentClassNames = [exports.COLLABORATION_SELECTION_MARKER, `${exports.COLLABORATION_SELECTION_MARKER}-${peer}`];
                        if (inverted) {
                            contentClassNames.push(exports.COLLABORATION_SELECTION_INVERTED);
                        }
                        const item = {
                            range,
                            options: {
                                className: `${exports.COLLABORATION_SELECTION} ${exports.COLLABORATION_SELECTION}-${peer}`,
                                beforeContentClassName: !forward ? contentClassNames.join(' ') : undefined,
                                afterContentClassName: forward ? contentClassNames.join(' ') : undefined,
                                stickiness: browser_1.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                            }
                        };
                        existing.push(item);
                    }
                }
            }
        }
        this.rerenderPresenceDecorations(decorations, ...widgets);
    }
    rerenderPresenceDecorations(decorations, ...widgets) {
        var _a, _b;
        for (const editor of new Set(this.getOpenEditors().concat(widgets))) {
            const uri = editor.getResourceUri();
            const path = this.utils.getProtocolPath(uri);
            if (path) {
                const old = (_a = this.editorDecorations.get(editor)) !== null && _a !== void 0 ? _a : [];
                this.editorDecorations.set(editor, editor.editor.deltaDecorations({
                    newDecorations: (_b = decorations.get(path)) !== null && _b !== void 0 ? _b : [],
                    oldDecorations: old
                }));
            }
        }
    }
    registerFileSystemChanges() {
        // Event listener for disk based events
        this.fileService.onDidFilesChange(event => {
            const changes = [];
            for (const change of event.changes) {
                const path = this.utils.getProtocolPath(change.resource);
                if (path) {
                    let type;
                    if (change.type === 1 /* FileChangeType.ADDED */) {
                        type = types.FileChangeEventType.Create;
                    }
                    else if (change.type === 2 /* FileChangeType.DELETED */) {
                        type = types.FileChangeEventType.Delete;
                    }
                    // Updates to files on disk are not sent
                    if (type !== undefined) {
                        changes.push({
                            path,
                            type
                        });
                    }
                }
            }
            if (changes.length) {
                this.options.connection.fs.change({ changes });
            }
        });
        // Event listener for user based events
        this.fileService.onDidRunOperation(operation => {
            const path = this.utils.getProtocolPath(operation.resource);
            if (!path) {
                return;
            }
            let type = types.FileChangeEventType.Update;
            if (operation.isOperation(0 /* FileOperation.CREATE */) || operation.isOperation(3 /* FileOperation.COPY */)) {
                type = types.FileChangeEventType.Create;
            }
            else if (operation.isOperation(1 /* FileOperation.DELETE */)) {
                type = types.FileChangeEventType.Delete;
            }
            this.options.connection.fs.change({
                changes: [{
                        path,
                        type
                    }]
            });
        });
    }
    async registerPresenceUpdate(widget) {
        const uri = widget.getResourceUri();
        const path = this.utils.getProtocolPath(uri);
        if (path) {
            if (!this.isHost) {
                this.options.connection.editor.open(this.host.id, path);
            }
            let currentSelection = widget.editor.selection;
            // // Update presence information when the selection changes
            const selectionChange = widget.editor.onSelectionChanged(selection => {
                if (!this.rangeEqual(currentSelection, selection)) {
                    this.updateEditorPresence(widget);
                    currentSelection = selection;
                }
            });
            const widgetDispose = widget.onDidDispose(() => {
                var _a;
                widgetDispose.dispose();
                selectionChange.dispose();
                // Remove presence information when the editor closes
                const state = this.yjsAwareness.getLocalState();
                if (((_a = state === null || state === void 0 ? void 0 : state.currentSelection) === null || _a === void 0 ? void 0 : _a.path) === path) {
                    delete state.currentSelection;
                }
                this.yjsAwareness.setLocalState(state);
            });
            this.toDispose.push(selectionChange);
            this.toDispose.push(widgetDispose);
            this.rerenderPresence(widget);
        }
    }
    updateEditorPresence(widget) {
        const uri = widget.getResourceUri();
        const path = this.utils.getProtocolPath(uri);
        if (path) {
            const ytext = this.yjs.getText(path);
            const selection = widget.editor.selection;
            let start = widget.editor.document.offsetAt(selection.start);
            let end = widget.editor.document.offsetAt(selection.end);
            if (start > end) {
                [start, end] = [end, start];
            }
            const direction = selection.direction === 'ltr'
                ? types.SelectionDirection.LeftToRight
                : types.SelectionDirection.RightToLeft;
            const editorSelection = {
                start: Y.createRelativePositionFromTypeIndex(ytext, start),
                end: Y.createRelativePositionFromTypeIndex(ytext, end),
                direction
            };
            const textSelection = {
                path,
                textSelections: [editorSelection]
            };
            this.setSharedSelection(textSelection);
        }
    }
    setSharedSelection(selection) {
        this.yjsAwareness.setLocalStateField('selection', selection);
    }
    rangeEqual(a, b) {
        return a.start.line === b.start.line
            && a.start.character === b.start.character
            && a.end.line === b.end.line
            && a.end.character === b.end.character;
    }
    async initialize(data) {
        this.permissions = data.permissions;
        this.readonly = data.permissions.readonly;
        for (const peer of [...data.guests, data.host]) {
            this.addPeer(peer);
        }
        this.fileSystem = new collaboration_file_system_provider_1.CollaborationFileSystemProvider(this.options.connection, data.host, this.yjs);
        this.fileSystem.readonly = this.readonly;
        this.toDispose.push(this.fileService.registerProvider(collaboration_file_system_provider_1.CollaborationURI.scheme, this.fileSystem));
        const workspaceDisposable = await this.workspaceService.setHostWorkspace(data.workspace, this.options.connection);
        this.toDispose.push(workspaceDisposable);
    }
    addPeer(peer) {
        const collection = new core_1.DisposableCollection();
        collection.push(this.createPeerStyleSheet(peer));
        collection.push(core_1.Disposable.create(() => this.peers.delete(peer.id)));
        const disposablePeer = {
            peer,
            dispose: () => collection.dispose()
        };
        this.peers.set(peer.id, disposablePeer);
    }
    createPeerStyleSheet(peer) {
        const style = browser_2.DecorationStyle.createStyleElement(`${peer.id}-collaboration-selection`);
        const colors = this.collaborationColorService.getColors();
        const sheet = style.sheet;
        const color = colors[this.colorIndex++ % colors.length];
        const colorString = `rgb(${color.r}, ${color.g}, ${color.b})`;
        sheet.insertRule(`
            .${exports.COLLABORATION_SELECTION}-${peer.id} {
                opacity: 0.2;
                background: ${colorString};
            }
        `);
        sheet.insertRule(`
            .${exports.COLLABORATION_SELECTION_MARKER}-${peer.id} {
                background: ${colorString};
                border-color: ${colorString};
            }`);
        sheet.insertRule(`
            .${exports.COLLABORATION_SELECTION_MARKER}-${peer.id}::after {
                content: "${peer.name}";
                background: ${colorString};
                color: ${this.collaborationColorService.requiresDarkFont(color)
            ? this.collaborationColorService.dark
            : this.collaborationColorService.light};
                z-index: ${(100 + this.colorIndex).toFixed()}
            }`);
        return core_1.Disposable.create(() => style.remove());
    }
    getOpenEditors(uri) {
        const widgets = this.shell.widgets;
        let editors = widgets.filter(e => e instanceof browser_1.EditorWidget);
        if (uri) {
            const uriString = uri.toString();
            editors = editors.filter(e => { var _a; return ((_a = e.getResourceUri()) === null || _a === void 0 ? void 0 : _a.toString()) === uriString; });
        }
        return editors;
    }
    createSelectionFromRelative(selection, model) {
        const start = Y.createAbsolutePositionFromRelativePosition(selection.start, this.yjs);
        const end = Y.createAbsolutePositionFromRelativePosition(selection.end, this.yjs);
        if (start && end) {
            return {
                start: model.positionAt(start.index),
                end: model.positionAt(end.index),
                direction: selection.direction === types.SelectionDirection.LeftToRight ? 'ltr' : 'rtl'
            };
        }
        return undefined;
    }
    createRelativeSelection(selection, model, ytext) {
        const start = Y.createRelativePositionFromTypeIndex(ytext, model.offsetAt(selection.start));
        const end = Y.createRelativePositionFromTypeIndex(ytext, model.offsetAt(selection.end));
        return {
            start,
            end,
            direction: selection.direction === 'ltr'
                ? types.SelectionDirection.LeftToRight
                : types.SelectionDirection.RightToLeft
        };
    }
    registerModelUpdate(model) {
        let updating = false;
        const modelPath = this.utils.getProtocolPath(new core_1.URI(model.uri));
        if (!modelPath) {
            return;
        }
        const unknownModel = !this.yjs.share.has(modelPath);
        const ytext = this.yjs.getText(modelPath);
        const modelText = model.textEditorModel.getValue();
        if (this.isHost && unknownModel) {
            // If we are hosting the room, set the initial content
            // First off, reset the shared content to be empty
            // This has the benefit of effectively clearing the memory of the shared content across all peers
            // This is important because the shared content accumulates changes/memory usage over time
            this.resetYjsText(ytext, modelText);
        }
        else {
            this.options.connection.editor.open(this.host.id, modelPath);
        }
        // The Ytext instance is our source of truth for the model content
        // Sometimes (especially after a lot of sequential undo/redo operations) our model content can get out of sync
        // This resyncs the model content with the Ytext content after a delay
        const resyncDebounce = debounce(() => {
            this.yjsMutex(() => {
                const newContent = ytext.toString();
                if (model.textEditorModel.getValue() !== newContent) {
                    updating = true;
                    this.softReplaceModel(model, newContent);
                    updating = false;
                }
            });
        }, 200);
        const disposable = new core_1.DisposableCollection();
        disposable.push(model.onDidChangeContent(e => {
            if (updating) {
                return;
            }
            this.yjsMutex(() => {
                this.yjs.transact(() => {
                    for (const change of e.contentChanges) {
                        ytext.delete(change.rangeOffset, change.rangeLength);
                        ytext.insert(change.rangeOffset, change.text);
                    }
                });
                resyncDebounce();
            });
        }));
        const observer = (textEvent) => {
            if (textEvent.transaction.local || model.getText() === ytext.toString()) {
                // Ignore local changes and changes that are already reflected in the model
                return;
            }
            this.yjsMutex(() => {
                updating = true;
                try {
                    let index = 0;
                    const operations = [];
                    textEvent.delta.forEach(delta => {
                        if (delta.retain !== undefined) {
                            index += delta.retain;
                        }
                        else if (delta.insert !== undefined) {
                            const pos = model.textEditorModel.getPositionAt(index);
                            const range = new monaco_editor_core_1.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
                            const insert = delta.insert;
                            operations.push({ range, text: insert });
                            index += insert.length;
                        }
                        else if (delta.delete !== undefined) {
                            const pos = model.textEditorModel.getPositionAt(index);
                            const endPos = model.textEditorModel.getPositionAt(index + delta.delete);
                            const range = new monaco_editor_core_1.Range(pos.lineNumber, pos.column, endPos.lineNumber, endPos.column);
                            operations.push({ range, text: '' });
                        }
                    });
                    this.pushChangesToModel(model, operations);
                }
                catch (err) {
                    console.error(err);
                }
                resyncDebounce();
                updating = false;
            });
        };
        ytext.observe(observer);
        disposable.push(core_1.Disposable.create(() => ytext.unobserve(observer)));
        model.onDispose(() => disposable.dispose());
    }
    resetYjsText(yjsText, text) {
        this.yjs.transact(() => {
            yjsText.delete(0, yjsText.length);
            yjsText.insert(0, text);
        });
    }
    getModel(uri) {
        const existing = this.monacoModelService.models.find(e => e.uri === uri.toString());
        if (existing) {
            return existing;
        }
        else {
            return undefined;
        }
    }
    pushChangesToModel(model, changes) {
        var _a;
        const editor = monaco_editor_1.MonacoEditor.findByDocument(this.editorManager, model)[0];
        const cursorState = (_a = editor === null || editor === void 0 ? void 0 : editor.getControl().getSelections()) !== null && _a !== void 0 ? _a : [];
        model.textEditorModel.pushStackElement();
        try {
            model.textEditorModel.pushEditOperations(cursorState, changes, () => cursorState);
            model.textEditorModel.pushStackElement();
        }
        catch (err) {
            console.error(err);
        }
    }
    softReplaceModel(model, text) {
        this.pushChangesToModel(model, [{
                range: model.textEditorModel.getFullModelRange(),
                text,
                forceMoveMarkers: false
            }]);
    }
    async openUri(uri) {
        const ref = await this.monacoModelService.createModelReference(uri);
        if (ref.object) {
            this.toDispose.push(ref);
        }
        else {
            ref.dispose();
        }
    }
    dispose() {
        for (const peer of this.peers.values()) {
            peer.dispose();
        }
        this.onDidCloseEmitter.fire();
        this.toDispose.dispose();
    }
};
exports.CollaborationInstance = CollaborationInstance;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", core_1.MessageService)
], CollaborationInstance.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(collaboration_workspace_service_1.CollaborationWorkspaceService),
    tslib_1.__metadata("design:type", collaboration_workspace_service_1.CollaborationWorkspaceService)
], CollaborationInstance.prototype, "workspaceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], CollaborationInstance.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(monaco_text_model_service_1.MonacoTextModelService),
    tslib_1.__metadata("design:type", monaco_text_model_service_1.MonacoTextModelService)
], CollaborationInstance.prototype, "monacoModelService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(editor_manager_1.EditorManager),
    tslib_1.__metadata("design:type", editor_manager_1.EditorManager)
], CollaborationInstance.prototype, "editorManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.OpenerService),
    tslib_1.__metadata("design:type", Object)
], CollaborationInstance.prototype, "openerService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(application_shell_1.ApplicationShell),
    tslib_1.__metadata("design:type", application_shell_1.ApplicationShell)
], CollaborationInstance.prototype, "shell", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.CollaborationInstanceOptions),
    tslib_1.__metadata("design:type", Object)
], CollaborationInstance.prototype, "options", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(collaboration_color_service_1.CollaborationColorService),
    tslib_1.__metadata("design:type", collaboration_color_service_1.CollaborationColorService)
], CollaborationInstance.prototype, "collaborationColorService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(collaboration_utils_1.CollaborationUtils),
    tslib_1.__metadata("design:type", collaboration_utils_1.CollaborationUtils)
], CollaborationInstance.prototype, "utils", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], CollaborationInstance.prototype, "init", null);
exports.CollaborationInstance = CollaborationInstance = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CollaborationInstance);
//# sourceMappingURL=collaboration-instance.js.map