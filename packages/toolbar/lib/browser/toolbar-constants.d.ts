/// <reference types="react" />
import { Command, MenuPath } from '@theia/core';
import URI from '@theia/core/lib/common/uri';
export declare namespace ToolbarCommands {
    const TOGGLE_TOOLBAR: Command;
    const REMOVE_COMMAND_FROM_TOOLBAR: Command;
    const INSERT_GROUP_LEFT: Command;
    const INSERT_GROUP_RIGHT: Command;
    const ADD_COMMAND_TO_TOOLBAR: Command;
    const RESET_TOOLBAR: Command;
    const CUSTOMIZE_TOOLBAR: Command;
}
export declare const UserToolbarURI: unique symbol;
export declare const USER_TOOLBAR_URI: URI;
export declare namespace ToolbarMenus {
    const TOOLBAR_ITEM_CONTEXT_MENU: MenuPath;
    const TOOLBAR_BACKGROUND_CONTEXT_MENU: MenuPath;
    const SEARCH_WIDGET_DROPDOWN_MENU: MenuPath;
}
export type ReactInteraction<T = Element, U = MouseEvent> = React.MouseEvent<T, U> | React.KeyboardEvent<T>;
export declare namespace ReactKeyboardEvent {
    function is(obj: unknown): obj is React.KeyboardEvent;
}
//# sourceMappingURL=toolbar-constants.d.ts.map