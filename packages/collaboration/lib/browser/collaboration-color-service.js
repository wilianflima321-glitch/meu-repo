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
exports.CollaborationColorService = exports.CollaborationColor = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
var CollaborationColor;
(function (CollaborationColor) {
    function fromString(code) {
        if (code.startsWith('#')) {
            code = code.substring(1);
        }
        const r = parseInt(code.substring(0, 2), 16);
        const g = parseInt(code.substring(2, 4), 16);
        const b = parseInt(code.substring(4, 6), 16);
        return { r, g, b };
    }
    CollaborationColor.fromString = fromString;
    CollaborationColor.Gold = fromString('#FFD700');
    CollaborationColor.Tomato = fromString('#FF6347');
    CollaborationColor.Aquamarine = fromString('#7FFFD4');
    CollaborationColor.Beige = fromString('#F5F5DC');
    CollaborationColor.Coral = fromString('#FF7F50');
    CollaborationColor.DarkOrange = fromString('#FF8C00');
    CollaborationColor.VioletRed = fromString('#C71585');
    CollaborationColor.DodgerBlue = fromString('#1E90FF');
    CollaborationColor.Chocolate = fromString('#D2691E');
    CollaborationColor.LightGreen = fromString('#90EE90');
    CollaborationColor.MediumOrchid = fromString('#BA55D3');
    CollaborationColor.Orange = fromString('#FFA500');
})(CollaborationColor || (exports.CollaborationColor = CollaborationColor = {}));
let CollaborationColorService = class CollaborationColorService {
    constructor() {
        this.light = 'white';
        this.dark = 'black';
    }
    getColors() {
        return [
            CollaborationColor.Gold,
            CollaborationColor.Aquamarine,
            CollaborationColor.Tomato,
            CollaborationColor.MediumOrchid,
            CollaborationColor.LightGreen,
            CollaborationColor.Orange,
            CollaborationColor.Beige,
            CollaborationColor.Chocolate,
            CollaborationColor.VioletRed,
            CollaborationColor.Coral,
            CollaborationColor.DodgerBlue,
            CollaborationColor.DarkOrange
        ];
    }
    requiresDarkFont(color) {
        // From https://stackoverflow.com/a/3943023
        return ((color.r * 0.299) + (color.g * 0.587) + (color.b * 0.114)) > 186;
    }
};
exports.CollaborationColorService = CollaborationColorService;
exports.CollaborationColorService = CollaborationColorService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CollaborationColorService);
//# sourceMappingURL=collaboration-color-service.js.map