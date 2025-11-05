"use strict";
// *****************************************************************************
// Copyright (C) 2021 logi.cals GmbH, EclipseSource and others.
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
exports.OSUtil = exports.elementId = exports.isElementVisible = exports.elementContainsClass = exports.containsClass = exports.textContent = exports.isNotNull = exports.isDefined = exports.toTextContentArray = exports.normalizeId = exports.USER_KEY_TYPING_DELAY = void 0;
const os_1 = require("os");
const path_1 = require("path");
exports.USER_KEY_TYPING_DELAY = 80;
function normalizeId(nodeId) {
    // Special characters (i.e. in our case '.',':','/','%', and '\\') in CSS IDs have to be escaped
    return nodeId.replace(/[.:,%/\\]/g, matchedChar => '\\' + matchedChar);
}
exports.normalizeId = normalizeId;
async function toTextContentArray(items) {
    const contents = items.map(item => item.textContent());
    const resolvedContents = await Promise.all(contents);
    return resolvedContents.filter(text => text !== undefined);
}
exports.toTextContentArray = toTextContentArray;
function isDefined(content) {
    return content !== undefined;
}
exports.isDefined = isDefined;
function isNotNull(content) {
    return content !== null;
}
exports.isNotNull = isNotNull;
async function textContent(elementPromise) {
    const element = await elementPromise;
    if (!element) {
        return undefined;
    }
    const content = await element.textContent();
    return content ? content : undefined;
}
exports.textContent = textContent;
async function containsClass(elementPromise, cssClass) {
    return elementContainsClass(await elementPromise, cssClass);
}
exports.containsClass = containsClass;
async function elementContainsClass(element, cssClass) {
    if (element) {
        const classValue = await element.getAttribute('class');
        if (classValue) {
            return classValue === null || classValue === void 0 ? void 0 : classValue.split(' ').includes(cssClass);
        }
    }
    return false;
}
exports.elementContainsClass = elementContainsClass;
async function isElementVisible(elementPromise) {
    const element = await elementPromise;
    return element ? element.isVisible() : false;
}
exports.isElementVisible = isElementVisible;
async function elementId(element) {
    const id = await element.getAttribute('id');
    if (id === null) {
        throw new Error('Could not get ID of ' + element);
    }
    return id;
}
exports.elementId = elementId;
var OSUtil;
(function (OSUtil) {
    OSUtil.isWindows = (0, os_1.platform)() === 'win32';
    OSUtil.isMacOS = (0, os_1.platform)() === 'darwin';
    // The platform-specific file separator '\' or '/'.
    OSUtil.fileSeparator = path_1.sep;
    // The platform-specific location of the temporary directory.
    OSUtil.tmpDir = (0, os_1.tmpdir)();
})(OSUtil || (exports.OSUtil = OSUtil = {}));
//# sourceMappingURL=util.js.map