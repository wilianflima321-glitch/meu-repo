"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBarItemImpl = void 0;
const types_impl_1 = require("../types-impl");
const coreutils_1 = require("@theia/core/shared/@lumino/coreutils");
const markdown_string_1 = require("../markdown-string");
const disposable_1 = require("@theia/core/lib/common/disposable");
class StatusBarItemImpl {
    constructor(_proxy, commandRegistry, alignment = types_impl_1.StatusBarAlignment.Left, priority = 0, id = StatusBarItemImpl.nextId()) {
        this.commandRegistry = commandRegistry;
        this._proxy = _proxy;
        this._alignment = alignment;
        this._priority = priority;
        this._id = id;
    }
    get id() {
        return this._id;
    }
    get alignment() {
        return this._alignment;
    }
    get priority() {
        return this._priority;
    }
    get name() {
        return this._name;
    }
    get text() {
        return this._text;
    }
    get tooltip() {
        return this._tooltip;
    }
    get color() {
        return this._color;
    }
    get backgroundColor() {
        return this._backgroundColor;
    }
    get command() {
        return this._command;
    }
    get accessibilityInformation() {
        return this._accessibilityInformation;
    }
    set name(name) {
        this._name = name;
        this.update();
    }
    set text(text) {
        this._text = text;
        this.update();
    }
    set tooltip(tooltip) {
        if (tooltip && markdown_string_1.MarkdownString.isMarkdownString(tooltip)) {
            const markdownTooltip = tooltip;
            const content = markdownTooltip.value;
            // Find all command links in the markdown content
            const regex = /\[([^\]]+)\]\(command:([^?\s\)]+)(?:\?([^\s\)]+))?([^\)]*)\)/g;
            let match;
            let updatedContent = content;
            while ((match = regex.exec(content)) !== null) {
                const linkText = match[1];
                const commandId = match[2];
                const argsEncoded = match[3]; // This captures the encoded arguments
                const tooltipPart = match[4] || ''; // This captures any tooltip or additional content after the command and args
                let args = [];
                if (argsEncoded) {
                    try {
                        const decoded = decodeURIComponent(argsEncoded);
                        args = JSON.parse(decoded);
                    }
                    catch (e) {
                        console.error('Failed to parse command arguments:', e);
                    }
                }
                const safeCommand = this.commandRegistry.converter.toSafeCommand({
                    command: commandId,
                    title: linkText,
                    arguments: Array.isArray(args) ? args : [args]
                }, new disposable_1.DisposableCollection());
                if (safeCommand === null || safeCommand === void 0 ? void 0 : safeCommand.id) {
                    let newArgsPart = '';
                    if (safeCommand.arguments && safeCommand.arguments.length > 0) {
                        newArgsPart = `?${encodeURIComponent(JSON.stringify(safeCommand.arguments))}`;
                    }
                    const argsPart = argsEncoded ? `?${argsEncoded}` : '';
                    const originalLink = `[${linkText}](command:${commandId}${argsPart}${tooltipPart})`;
                    const safeLink = `[${linkText}](command:${safeCommand.id}${newArgsPart}${tooltipPart})`;
                    updatedContent = updatedContent.replace(originalLink, safeLink);
                }
            }
            if (updatedContent !== content) {
                markdownTooltip.value = updatedContent;
            }
        }
        this._tooltip = tooltip;
        this.update();
    }
    set color(color) {
        this._color = color;
        this.update();
    }
    set backgroundColor(backgroundColor) {
        if (backgroundColor && StatusBarItemImpl.BACKGROUND_COLORS.has(backgroundColor.id)) {
            this._backgroundColor = backgroundColor;
        }
        else {
            this._backgroundColor = undefined;
        }
        this.update();
    }
    set command(command) {
        this._command = command;
        this.update();
    }
    set accessibilityInformation(information) {
        this._accessibilityInformation = information;
        this.update();
    }
    show() {
        this._isVisible = true;
        this.update();
    }
    hide() {
        if (this._timeoutHandle) {
            clearTimeout(this._timeoutHandle);
        }
        this._proxy.$dispose(this.id);
        this._isVisible = false;
    }
    update() {
        if (!this._isVisible) {
            return;
        }
        if (this._timeoutHandle) {
            clearTimeout(this._timeoutHandle);
        }
        // Defer the update so that multiple changes to setters don't cause a redraw each
        this._timeoutHandle = setTimeout(() => {
            var _a;
            this._timeoutHandle = undefined;
            const commandId = typeof this.command === 'object' ? this.command.command : this.command;
            const args = typeof this.command === 'object' ? this.command.arguments : undefined;
            let color = this.color;
            if (this.backgroundColor) {
                // If an error or warning background color is set, set the corresponding foreground color
                color = StatusBarItemImpl.BACKGROUND_COLORS.get(this.backgroundColor.id);
            }
            // Set to status bar
            this._proxy.$setMessage(this.id, this.name, this.text, this.priority, this.alignment, typeof color === 'string' ? color : color === null || color === void 0 ? void 0 : color.id, (_a = this.backgroundColor) === null || _a === void 0 ? void 0 : _a.id, this.tooltip, commandId, this.accessibilityInformation, args);
        }, 0);
    }
    dispose() {
        this.hide();
    }
    static nextId() {
        return StatusBarItemImpl.ID_PREFIX + ':' + coreutils_1.UUID.uuid4();
    }
}
exports.StatusBarItemImpl = StatusBarItemImpl;
/** Map from allowed background colors to corresponding foreground colors. */
StatusBarItemImpl.BACKGROUND_COLORS = new Map([
    ['statusBarItem.errorBackground', 'statusBarItem.errorForeground'],
    ['statusBarItem.warningBackground', 'statusBarItem.warningForeground']
]);
StatusBarItemImpl.ID_PREFIX = 'plugin-status-bar-item';
//# sourceMappingURL=status-bar-item.js.map