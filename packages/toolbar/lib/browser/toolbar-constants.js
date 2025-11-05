"use strict";
// *****************************************************************************
// Copyright (C) 2022 Ericsson and others.
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
exports.ReactKeyboardEvent = exports.ToolbarMenus = exports.USER_TOOLBAR_URI = exports.UserToolbarURI = exports.ToolbarCommands = void 0;
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const uri_1 = require("@theia/core/lib/common/uri");
const browser_2 = require("@theia/userstorage/lib/browser");
var ToolbarCommands;
(function (ToolbarCommands) {
    ToolbarCommands.TOGGLE_TOOLBAR = core_1.Command.toLocalizedCommand({
        id: 'toolbar.view.toggle',
        category: browser_1.CommonCommands.VIEW_CATEGORY,
        label: 'Toggle Toolbar',
    }, 'theia/toolbar/toggleToolbar', core_1.nls.getDefaultKey(browser_1.CommonCommands.VIEW_CATEGORY));
    ToolbarCommands.REMOVE_COMMAND_FROM_TOOLBAR = core_1.Command.toLocalizedCommand({
        id: 'toolbar.remove.command',
        category: 'Toolbar',
        label: 'Remove Command From Toolbar',
    }, 'theia/toolbar/removeCommand');
    ToolbarCommands.INSERT_GROUP_LEFT = core_1.Command.toLocalizedCommand({
        id: 'toolbar.insert.group.left',
        category: 'Toolbar',
        label: 'Insert Group Separator (Left)',
    }, 'theia/toolbar/insertGroupLeft');
    ToolbarCommands.INSERT_GROUP_RIGHT = core_1.Command.toLocalizedCommand({
        id: 'toolbar.insert.group.right',
        category: 'Toolbar',
        label: 'Insert Group Separator (Right)',
    }, 'theia/toolbar/insertGroupRight');
    ToolbarCommands.ADD_COMMAND_TO_TOOLBAR = core_1.Command.toLocalizedCommand({
        id: 'toolbar.add.command',
        category: 'Toolbar',
        label: 'Add Command to Toolbar',
    }, 'theia/toolbar/addCommand');
    ToolbarCommands.RESET_TOOLBAR = core_1.Command.toLocalizedCommand({
        id: 'toolbar.restore.defaults',
        category: 'Toolbar',
        label: 'Restore Toolbar Defaults',
    }, 'theia/toolbar/restoreDefaults');
    ToolbarCommands.CUSTOMIZE_TOOLBAR = core_1.Command.toLocalizedCommand({
        id: 'toolbar.customize',
        category: 'Toolbar',
        label: 'Customize Toolbar (Open JSON)',
    }, 'theia/toolbar/openJSON');
})(ToolbarCommands || (exports.ToolbarCommands = ToolbarCommands = {}));
exports.UserToolbarURI = Symbol('UserToolbarURI');
exports.USER_TOOLBAR_URI = new uri_1.default().withScheme(browser_2.UserStorageUri.scheme).withPath('/user/toolbar.json');
var ToolbarMenus;
(function (ToolbarMenus) {
    ToolbarMenus.TOOLBAR_ITEM_CONTEXT_MENU = ['toolbar:toolbarItemContextMenu'];
    ToolbarMenus.TOOLBAR_BACKGROUND_CONTEXT_MENU = ['toolbar:backgroundContextMenu'];
    ToolbarMenus.SEARCH_WIDGET_DROPDOWN_MENU = ['searchToolbar:dropdown'];
})(ToolbarMenus || (exports.ToolbarMenus = ToolbarMenus = {}));
var ReactKeyboardEvent;
(function (ReactKeyboardEvent) {
    function is(obj) {
        return (0, core_1.isObject)(obj) && 'key' in obj;
    }
    ReactKeyboardEvent.is = is;
})(ReactKeyboardEvent || (exports.ReactKeyboardEvent = ReactKeyboardEvent = {}));
//# sourceMappingURL=toolbar-constants.js.map