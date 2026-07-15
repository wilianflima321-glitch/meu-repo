/**
 * Aethel L5 Architectural Linter (AST-Based)
 * Replaces the 58 legacy RegEx validation scripts.
 */

module.exports = {
  rules: {
    'no-window-in-workers': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Prevents usage of window or document in worker threads or backend code.',
          category: 'Architecture',
          recommended: true,
        },
        messages: {
          noWindow: 'Aethel Architecture Violation: Cannot access `window` in a background worker or Rust context.',
          noDocument: 'Aethel Architecture Violation: Cannot access `document` in a background worker or Rust context.',
        },
      },
      create(context) {
        // Only apply to worker files
        if (!context.getFilename().includes('.worker.') && !context.getFilename().includes('/workers/')) {
          return {};
        }

        return {
          Identifier(node) {
            if (node.name === 'window' && node.parent.type !== 'MemberExpression') {
              context.report({ node, messageId: 'noWindow' });
            }
            if (node.name === 'document' && node.parent.type !== 'MemberExpression') {
              context.report({ node, messageId: 'noDocument' });
            }
          },
        };
      },
    },

    'require-strict-kernel-types': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Ensures strict usage of Aethel Runtime Contracts across the Next.js boundary.',
          category: 'Architecture',
          recommended: true,
        },
        messages: {
          missingContract: 'Aethel Architecture Violation: Hardcoded target or lane. You must import and use `RuntimeExecutionTarget` or `RuntimeJobLane` from `packages/runtime-contracts`.',
        },
      },
      create(context) {
        return {
          Literal(node) {
            const forbiddenStrings = [
              'local-native', 'local-worker', 'local-main-safe', 'cloud-sandbox', 'held',
              'ai-local-inference', 'memory-indexing', 'asset-import', 'viewport-render'
            ];
            
            if (typeof node.value === 'string' && forbiddenStrings.includes(node.value)) {
              // Ensure it's not inside an import declaration
              let parent = node.parent;
              let isImport = false;
              while (parent) {
                if (parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration') {
                  isImport = true;
                  break;
                }
                parent = parent.parent;
              }

              if (!isImport) {
                context.report({ node, messageId: 'missingContract' });
              }
            }
          },
        };
      },
    },

    'prevent-ghost-routes': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Prevents creation of new serverless API routes that bypass the Rust NGINX Bridge.',
          category: 'Architecture',
          recommended: true,
        },
        messages: {
          noGhostRoute: 'Aethel Architecture Violation: New Next.js `/api/` routes are strictly forbidden. All heavy processing must route through the NGINX WebSocket proxy to the Rust Kernel.',
        },
      },
      create(context) {
        const filePath = context.getFilename();
        // Applies to Next.js App Router API routes
        if (filePath.includes('app/api/') || filePath.includes('pages/api/')) {
          return {
            ExportNamedDeclaration(node) {
              if (node.declaration && node.declaration.type === 'FunctionDeclaration') {
                const name = node.declaration.id.name;
                // Allow specific whitelisted legacy routes, deny all new GET/POST
                if (['GET', 'POST', 'PUT', 'DELETE'].includes(name)) {
                   // Exemption for auth and local-capabilities sync (the official bridge)
                   if (!filePath.includes('auth') && !filePath.includes('local-capabilities')) {
                     context.report({ node, messageId: 'noGhostRoute' });
                   }
                }
              }
            }
          };
        }
        return {};
      }
    }
  },
};
