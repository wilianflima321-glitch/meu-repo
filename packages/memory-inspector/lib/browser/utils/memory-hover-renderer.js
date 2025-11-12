"use strict";
/********************************************************************************
 * Copyright (C) 2021 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryHoverRendererService = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
let MemoryHoverRendererService = class MemoryHoverRendererService {
    constructor() {
        this.isShown = false;
        this.closeIfHoverOff = (e) => {
            const { target } = e;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            if (!this.currentRenderContainer.contains(target) && !this.container.contains(target)) {
                this.hide();
            }
        };
        this.container = document.createElement('div');
        this.container.classList.add('t-mv-hover', 'hidden');
        document.body.appendChild(this.container);
    }
    render(container, anchor, properties) {
        this.clearAll();
        if (!this.isShown) {
            document.addEventListener('mousemove', this.closeIfHoverOff);
            this.currentRenderContainer = container;
        }
        if (properties) {
            for (const [key, value] of Object.entries(properties)) {
                const label = key.toLowerCase().replace(/[\W]/g, '-');
                const keySpan = document.createElement('span');
                keySpan.classList.add('t-mv-hover-key', label);
                keySpan.textContent = `${key}:`;
                const valueSpan = document.createElement('span');
                valueSpan.classList.add('t-mv-hover-value', label);
                // stringify as decimal number by default.
                valueSpan.textContent = value.toString(10);
                this.container.appendChild(keySpan);
                this.container.appendChild(valueSpan);
            }
        }
        if (this.container.children.length) {
            this.show(anchor);
            this.isShown = true;
        }
        else {
            this.hide();
        }
    }
    hide() {
        if (this.isShown) {
            document.removeEventListener('mousemove', this.closeIfHoverOff);
            this.container.classList.add('hidden');
            this.isShown = false;
        }
    }
    show({ x, y }) {
        this.container.classList.remove('hidden');
        this.container.style.top = `${y}px`;
        this.container.style.left = `${x}px`;
        setTimeout(() => this.checkNotOffScreen());
    }
    checkNotOffScreen() {
        var _a;
        const left = parseInt(((_a = this.container.style.left) !== null && _a !== void 0 ? _a : '').replace('px', ''));
        const width = this.container.clientWidth;
        const overflow = left + width - document.body.clientWidth;
        if (overflow > 0) {
            const safeLeft = Math.round(left - overflow);
            this.container.style.left = `${safeLeft}px`;
        }
    }
    clearAll() {
        let toRemove = this.container.lastChild;
        while (toRemove) {
            this.container.removeChild(toRemove);
            toRemove = this.container.lastChild;
        }
    }
    dispose() {
        this.container.remove();
    }
};
exports.MemoryHoverRendererService = MemoryHoverRendererService;
exports.MemoryHoverRendererService = MemoryHoverRendererService = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], MemoryHoverRendererService);
//# sourceMappingURL=memory-hover-renderer.js.map