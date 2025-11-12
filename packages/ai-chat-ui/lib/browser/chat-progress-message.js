"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
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
exports.Indicator = exports.ProgressMessage = void 0;
const React = require("@theia/core/shared/react");
const ProgressMessage = (c) => (React.createElement("div", { className: 'theia-ResponseNode-ProgressMessage' },
    React.createElement(exports.Indicator, { ...c }),
    " ",
    c.content));
exports.ProgressMessage = ProgressMessage;
const Indicator = (progressMessage) => (React.createElement("span", { className: 'theia-ResponseNode-ProgressMessage-Indicator' },
    progressMessage.status === 'inProgress' &&
        React.createElement("i", { className: 'fa fa-spinner fa-spin ' + progressMessage.status }),
    progressMessage.status === 'completed' &&
        React.createElement("i", { className: 'fa fa-check ' + progressMessage.status }),
    progressMessage.status === 'failed' &&
        React.createElement("i", { className: 'fa fa-warning ' + progressMessage.status })));
exports.Indicator = Indicator;
//# sourceMappingURL=chat-progress-message.js.map