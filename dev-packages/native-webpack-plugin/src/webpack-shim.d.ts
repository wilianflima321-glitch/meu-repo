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

declare module 'webpack' {
  export interface ResolveData {
    request: string;
    contextInfo: {
      issuer?: string;
    };
  }

  export interface NormalModuleFactory {
    hooks: {
      beforeResolve: {
        tapPromise(name: string, handler: (data: ResolveData | undefined) => Promise<ResolveData | void> | ResolveData | void): void;
      };
    };
  }

  export interface ContextModuleFactory {
    hooks: {
      contextModuleFiles: {
        tap(name: string, handler: (files: string[]) => string[]): void;
      };
    };
  }

  export interface Compiler {
    outputPath: string;
    hooks: {
      initialize: {
        tap(name: string, handler: () => void | Promise<void>): void;
      };
      normalModuleFactory: {
        tap(name: string, handler: (factory: NormalModuleFactory) => void): void;
      };
      afterEmit: {
        tapPromise(name: string, handler: () => Promise<void>): void;
      };
      contextModuleFactory: {
        tap(name: string, handler: (factory: ContextModuleFactory) => void): void;
      };
    };
  }
}
