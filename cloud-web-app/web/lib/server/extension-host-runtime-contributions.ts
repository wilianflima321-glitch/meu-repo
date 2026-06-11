import type { EventEmitter } from 'events';
import * as path from 'path';
import type { Extension } from './extension-host/types';

export function emitExtensionContributions(emitter: EventEmitter, extension: Extension): void {
  const contrib = extension.manifest.contributes;
  if (!contrib) return;

  if (contrib.commands) {
    for (const command of contrib.commands) {
      emitter.emit('commandContributed', {
        extensionId: extension.id,
        command,
      });
    }
  }

  if (contrib.keybindings) {
    for (const keybinding of contrib.keybindings) {
      emitter.emit('keybindingContributed', {
        extensionId: extension.id,
        keybinding,
      });
    }
  }

  if (contrib.configuration) {
    emitter.emit('configurationContributed', {
      extensionId: extension.id,
      configuration: contrib.configuration,
    });
  }

  if (contrib.themes) {
    for (const theme of contrib.themes) {
      emitter.emit('themeContributed', {
        extensionId: extension.id,
        theme: {
          ...theme,
          path: path.join(extension.extensionPath, theme.path),
        },
      });
    }
  }

  if (contrib.languages) {
    for (const language of contrib.languages) {
      emitter.emit('languageContributed', {
        extensionId: extension.id,
        language,
      });
    }
  }

  if (contrib.grammars) {
    for (const grammar of contrib.grammars) {
      emitter.emit('grammarContributed', {
        extensionId: extension.id,
        grammar: {
          ...grammar,
          path: path.join(extension.extensionPath, grammar.path),
        },
      });
    }
  }

  if (contrib.snippets) {
    for (const snippet of contrib.snippets) {
      emitter.emit('snippetContributed', {
        extensionId: extension.id,
        snippet: {
          ...snippet,
          path: path.join(extension.extensionPath, snippet.path),
        },
      });
    }
  }

  if (contrib.views) {
    for (const [containerId, views] of Object.entries(contrib.views)) {
      for (const view of views) {
        emitter.emit('viewContributed', {
          extensionId: extension.id,
          containerId,
          view,
        });
      }
    }
  }

  if (contrib.viewsContainers) {
    for (const [location, containers] of Object.entries(contrib.viewsContainers)) {
      for (const container of containers) {
        emitter.emit('viewContainerContributed', {
          extensionId: extension.id,
          location,
          container: {
            ...container,
            icon: path.join(extension.extensionPath, container.icon),
          },
        });
      }
    }
  }

  if (contrib.debuggers) {
    for (const debuggerContribution of contrib.debuggers) {
      emitter.emit('debuggerContributed', {
        extensionId: extension.id,
        debugger: debuggerContribution,
      });
    }
  }
}
