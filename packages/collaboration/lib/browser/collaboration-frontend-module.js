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
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/workspace/lib/browser");
const collaboration_color_service_1 = require("./collaboration-color-service");
const collaboration_frontend_contribution_1 = require("./collaboration-frontend-contribution");
const collaboration_instance_1 = require("./collaboration-instance");
const collaboration_utils_1 = require("./collaboration-utils");
const collaboration_workspace_service_1 = require("./collaboration-workspace-service");
const collaboration_preferences_1 = require("../common/collaboration-preferences");
exports.default = new inversify_1.ContainerModule((bind, _, __, rebind) => {
    bind(collaboration_workspace_service_1.CollaborationWorkspaceService).toSelf().inSingletonScope();
    rebind(browser_1.WorkspaceService).toService(collaboration_workspace_service_1.CollaborationWorkspaceService);
    bind(collaboration_utils_1.CollaborationUtils).toSelf().inSingletonScope();
    bind(collaboration_frontend_contribution_1.CollaborationFrontendContribution).toSelf().inSingletonScope();
    bind(core_1.CommandContribution).toService(collaboration_frontend_contribution_1.CollaborationFrontendContribution);
    bind(collaboration_instance_1.CollaborationInstanceFactory).toFactory(context => (options) => {
        const container = (0, collaboration_instance_1.createCollaborationInstanceContainer)(context.container, options);
        return container.get(collaboration_instance_1.CollaborationInstance);
    });
    bind(collaboration_color_service_1.CollaborationColorService).toSelf().inSingletonScope();
    bind(core_1.PreferenceContribution).toConstantValue({ schema: collaboration_preferences_1.collaborationPreferencesSchema });
});
//# sourceMappingURL=collaboration-frontend-module.js.map