"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelegationResponseContent = void 0;
exports.isDelegationResponseContent = isDelegationResponseContent;
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
const core_1 = require("@theia/core");
/**
 * Response Content created when an Agent delegates a prompt to another agent.
 * Contains agent id, delegated prompt, and the response.
 */
class DelegationResponseContent {
    /**
     * @param agentId The id of the agent to whom the task was delegated
     * @param prompt The prompt that was delegated
     * @param response The response from the delegated agent
     */
    constructor(agentId, prompt, response) {
        this.agentId = agentId;
        this.prompt = prompt;
        this.response = response;
        this.kind = 'AgentDelegation';
    }
    asString() {
        // The delegation and response is already part of a tool call and therefore does not need to be repeated
        return undefined;
    }
}
exports.DelegationResponseContent = DelegationResponseContent;
function isDelegationResponseContent(value) {
    return ((0, core_1.isObject)(value) &&
        value.kind === 'AgentDelegation');
}
//# sourceMappingURL=delegation-response-content.js.map