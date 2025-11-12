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
import { Disposable } from '@theia/core';
import { Anchor } from '@theia/core/lib/browser';
export interface EasilyMappedObject {
    [key: string]: string | number;
}
export declare class MemoryHoverRendererService implements Disposable {
    protected readonly container: HTMLDivElement;
    protected isShown: boolean;
    protected currentRenderContainer: HTMLElement;
    constructor();
    render(container: HTMLElement, anchor: Anchor, properties?: EasilyMappedObject): void;
    hide(): void;
    show({ x, y }: Anchor): void;
    protected checkNotOffScreen(): void;
    protected clearAll(): void;
    protected closeIfHoverOff: (e: MouseEvent) => void;
    dispose(): void;
}
//# sourceMappingURL=memory-hover-renderer.d.ts.map