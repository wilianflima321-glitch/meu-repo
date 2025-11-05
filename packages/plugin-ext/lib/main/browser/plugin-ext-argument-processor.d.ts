import { ArgumentProcessor } from '../../common/commands';
/**
 * This processor handles arguments passed to commands that are contributed by plugins and available as toolbar items.
 *
 * When a toolbar item executes a command, it often passes the active widget as an argument. This can lead to
 * serialization problems. To solve this issue, this processor checks if an argument is a Widget instance and if so, it extracts
 * and returns only the widget's ID, which can be safely serialized and used to identify the widget in the plugin host.
 */
export declare class PluginExtToolbarItemArgumentProcessor implements ArgumentProcessor {
    processArgument(arg: unknown): unknown;
}
//# sourceMappingURL=plugin-ext-argument-processor.d.ts.map