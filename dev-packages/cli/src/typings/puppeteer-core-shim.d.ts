// *****************************************************************************
// Copyright (C) 2017 Ericsson and others.
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

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare module 'puppeteer-core' {
  export interface PuppeteerLaunchOptions {
    devtools?: boolean;
    [key: string]: unknown;
  }

  export interface CoverageEntry {
    [key: string]: unknown;
  }

  export interface Coverage {
    startJSCoverage(): Promise<void>;
    startCSSCoverage(): Promise<void>;
    stopJSCoverage(): Promise<CoverageEntry[]>;
    stopCSSCoverage(): Promise<CoverageEntry[]>;
  }

  export interface ElementHandle {
    click(): Promise<void>;
  }

  export interface Frame {
    url(): string;
  }

  export interface Page {
    coverage: Coverage;
    on(event: string, handler: (...args: unknown[]) => unknown): Page;
    exposeFunction(name: string, fn: (...args: unknown[]) => unknown): Promise<void>;
    addScriptTag(options: { path: string }): Promise<void>;
    evaluate<T>(pageFunction: (...args: unknown[]) => T | Promise<T>, ...args: unknown[]): Promise<T>;
    waitForSelector(selector: string, options?: Record<string, unknown>): Promise<ElementHandle | null>;
  waitForFunction(pageFunction: (...args: unknown[]) => unknown, options?: Record<string, unknown>): Promise<unknown>;
    waitForNavigation(options?: Record<string, unknown>): Promise<unknown>;
    goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
    bringToFront(): Promise<void>;
    close(options?: Record<string, unknown>): Promise<void>;
    url(): string;
  }

  export interface Browser {
    pages(): Promise<Page[]>;
    close(): Promise<void>;
  }

  export function launch(options?: PuppeteerLaunchOptions): Promise<Browser>;
}
