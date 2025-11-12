const Module = require('module');
const path = require('path');
const fs = require('fs');

// Allow consumers to opt out of the test shims by setting THEIA_TEST_SHIMS=0
// When disabled we export the workspaceRoot but do not install the Module
// resolution hook so normal Node resolution applies.
if (process.env.THEIA_TEST_SHIMS === '0') {
  const workspaceRoot = path.resolve(__dirname, '..', '..', '..');
  module.exports = { workspaceRoot };
  return;
}

// Compute workspace root (packages/ai-ide/test -> ../../..)
const workspaceRoot = path.resolve(__dirname, '..', '..', '..');
// debug
try { console.debug('resolve-theia-paths workspaceRoot=', workspaceRoot); } catch(e) {}

const originalResolve = Module._resolveFilename;

Module._resolveFilename = function(request, parent, isMain, options) {
  try {
    // stub CSS imports to a tiny empty module so Node can require built .js files
    if (request && request.endsWith && request.endsWith('.css')) {
      return path.join(__dirname, 'empty-style.js');
    }
    // stub JSON imports from workspace package src (e.g., nls metadata) to an empty JSON
    // but avoid stubbing node_modules JSON (used by libraries like whatwg-encoding)
    if (request && request.endsWith && request.endsWith('.json')) {
      const parentFile = parent && parent.filename || '';
      if (parentFile.startsWith(workspaceRoot) && request.indexOf('src') !== -1) {
        // Special-case translation metadata files which expect { keys: {}, messages: {} }
        if (request.endsWith('nls.metadata.json')) {
          return path.join(__dirname, 'empty-nls.metadata.json');
        }
        return path.join(__dirname, 'empty.json');
      }
    }
    // If a module inside packages/core tries to require ../../../shared/inversify (relative),
    // map it to the installed 'inversify' package so runtime resolves correctly.
    try {
      const parentFile = parent && parent.filename || '';
      if (/shared\\?\/inversify$/.test(request) && /packages\\core\\lib/.test(parentFile)) {
        return require.resolve('inversify', { paths: [workspaceRoot, path.join(workspaceRoot, 'node_modules')] });
      }
    } catch (e) {
      // ignore
    }
    // Quick explicit mapping for stubbed runtime packages used during tests
    if (request === 'async-mutex') {
      try {
        const stub = path.join(workspaceRoot, 'node_modules', 'async-mutex', 'index.js');
        if (fs.existsSync(stub)) return stub;
      }
      catch (e) {
        // fall through
      }
    }
    // Special-case mapping for shared inversify re-export used by Theia builds
    if (request === '@theia/core/shared/inversify') {
      try {
        return require.resolve('inversify', { paths: [workspaceRoot, path.join(workspaceRoot, 'node_modules')] });
      } catch (e) {
        // fall through to original resolver
      }
    }
    // Special-case mapping for shared ajv re-export used in workspace packages
    if (request === '@theia/core/shared/ajv') {
      try {
        return require.resolve('ajv', { paths: [workspaceRoot, path.join(workspaceRoot, 'node_modules')] });
      } catch (e) {
        // fall through
      }
    }
    // Generic mapping for '@theia/core/shared/<pkg>' -> prefer installed package
    // e.g. '@theia/core/shared/vscode-languageserver-protocol' ->
    // 'vscode-languageserver-protocol', or '@theia/core/shared/@lumino/domutils' -> '@lumino/domutils'
    if (typeof request === 'string' && request.startsWith('@theia/core/shared/')) {
      const target = request.substring('@theia/core/shared/'.length);
      try {
        return require.resolve(target, { paths: [workspaceRoot, path.join(workspaceRoot, 'node_modules')] });
      } catch (e) {
        // fall through to other resolution strategies
      }
    }
    // Special-case mapping for shared @lumino re-exports (domutils, algorithm, etc.)
    // Many Theia compiled files require '@theia/core/shared/@lumino/*' which in a
    // normal install forwards to the real @lumino scoped packages. Prefer the
    // installed @lumino packages from workspace node_modules when available.
    if (request === '@theia/core/shared/@lumino/domutils') {
      try {
        return require.resolve('@lumino/domutils', { paths: [workspaceRoot, path.join(workspaceRoot, 'node_modules')] });
      } catch (e) {
        // fall through to original resolver
      }
    }
    // Remap @theia/<pkg> or @theia/<pkg>/<subpath> -> try several workspace locations
    const m = /^@theia\/([^\/]+)(?:\/(.+))?$/.exec(request);
    if (m) {
      const pkg = m[1];
      const sub = m[2] || '';
      // Special-case: many compiled files import deep ESM subpaths of
      // @theia/monaco-editor-core like '@theia/monaco-editor-core/esm/vs/editor/..'
      // or simply '@theia/monaco-editor-core'. The workspace provides a built
      // monaco under packages/monaco/lib/browser (monaco-editor.js). Prefer
      // mapping those imports to the installed package when available so the
      // expected exported symbols are present. Fall back to the workspace
      // monaco bundle if needed.
  // Match both the monaco package and the monaco-editor-core package
  // used across different builds in this workspace.
  if (pkg === 'monaco-editor-core' || pkg === 'monaco') {
        // If the import targets a very specific monaco subpath, map it to the
        // precise installed file so the expected named exports are present.
        // e.g. requests for
        // '@theia/monaco-editor-core/esm/vs/editor/standalone/browser/standaloneCodeEditor'
        // should return the installed standaloneCodeEditor.js file.
        try {
          if (sub && sub.indexOf('standalone/browser/standaloneCodeEditor') !== -1) {
            const installedStandalone = path.join(workspaceRoot, 'node_modules', '@theia', 'monaco-editor-core', 'esm', 'vs', 'editor', 'standalone', 'browser', 'standaloneCodeEditor.js');
            if (fs.existsSync(installedStandalone) && fs.statSync(installedStandalone).isFile()) {
              return installedStandalone;
            }
          }
        } catch (e) {
          // fall through
        }
        // If the import targets Theia's own lib paths (e.g. '@theia/monaco/lib/browser/..'),
        // prefer the workspace package outputs so we get Theia-specific exports such as
        // MonacoWorkspace or MonacoTextModelService. Only fall back to the installed
        // monaco-editor-core ESM API for deep 'vs/*' ESM imports coming from the
        // upstream monaco package.
        try {
          if (sub && sub.startsWith('lib/')) {
            const localModule = path.join(workspaceRoot, 'packages', 'monaco', sub);
            const localModuleJs = localModule.endsWith('.js') ? localModule : localModule + '.js';
            if (fs.existsSync(localModuleJs) && fs.statSync(localModuleJs).isFile()) {
              return localModuleJs;
            }
            // if path points to directory, try its lib/browser index
            const alt = path.join(workspaceRoot, 'packages', 'monaco', 'lib', sub.replace(/^lib\//, ''));
            if (fs.existsSync(alt) && fs.statSync(alt).isFile()) {
              return alt;
            }
          }
        } catch (e) {
          // fall through
        }
        // If the import is a deep ESM path under the monaco-editor-core package
        // (e.g. 'esm/vs/platform/instantiation/common/instantiation'), try to map
        // it directly to the installed package's esm file so the specific
        // decorator factories and exported helpers are available.
        try {
          if (sub && sub.indexOf('esm/') === 0) {
            const installedSpecific = path.join(workspaceRoot, 'node_modules', '@theia', 'monaco-editor-core', sub + '.js');
            if (fs.existsSync(installedSpecific) && fs.statSync(installedSpecific).isFile()) {
              return installedSpecific;
            }
          }
        } catch (e) {
          // fall through
        }
        // Prefer the installed package's ESM editor API as a general fallback.
        try {
          const installedApi = path.join(workspaceRoot, 'node_modules', '@theia', 'monaco-editor-core', 'esm', 'vs', 'editor', 'editor.api.js');
          if (fs.existsSync(installedApi) && fs.statSync(installedApi).isFile()) {
            return installedApi;
          }
        } catch (e) {
          // fall through
        }
        // Fallback to the workspace monaco bundle
        try {
          const localMonaco = path.join(workspaceRoot, 'packages', 'monaco', 'lib', 'browser', 'monaco-editor.js');
          if (fs.existsSync(localMonaco) && fs.statSync(localMonaco).isFile()) {
            return localMonaco;
          }
        } catch (e) {
          // fall through to normal candidate scanning below
        }
      }

      const candidates = [
        // direct package src/build outputs
        path.join(workspaceRoot, 'packages', pkg, sub),
        path.join(workspaceRoot, 'packages', pkg, 'lib', sub),
        // dev-packages used by this workspace
        path.join(workspaceRoot, 'dev-packages', pkg, sub),
        path.join(workspaceRoot, 'dev-packages', pkg, 'lib', sub),
      ];
      for (const c of candidates) {
        const withJs = c.endsWith('.js') ? c : c + '.js';
        try {
          if (fs.existsSync(withJs) && fs.statSync(withJs).isFile()) return withJs;
          if (fs.existsSync(c)) {
            const st = fs.statSync(c);
            if (st.isFile()) return c;
            if (st.isDirectory()) {
              // try typical index fallsbacks
              const tryLibCommonIndex = path.join(c, 'lib', 'common', 'index.js');
              const tryLibBrowserIndex = path.join(c, 'lib', 'browser', 'index.js');
              const tryLibIndex = path.join(c, 'lib', 'index.js');
              const tryIndex = path.join(c, 'index.js');
              if (fs.existsSync(tryLibCommonIndex)) return tryLibCommonIndex;
              if (fs.existsSync(tryLibBrowserIndex)) return tryLibBrowserIndex;
              if (fs.existsSync(tryLibIndex)) return tryLibIndex;
              if (fs.existsSync(tryIndex)) return tryIndex;
            }
          }
        } catch (e) {
          // ignore and continue
        }
      }
      // Also try package root index under packages or dev-packages
      const altRoots = [
        path.join(workspaceRoot, 'packages', pkg),
        path.join(workspaceRoot, 'dev-packages', pkg)
      ];
      for (const r of altRoots) {
        try {
          const idx = path.join(r, 'lib', 'index.js');
          const idx2 = path.join(r, 'lib', 'index');
          const idx3 = path.join(r, 'index.js');
          if (fs.existsSync(idx) && fs.statSync(idx).isFile()) return idx;
          if (fs.existsSync(idx2) && fs.statSync(idx2).isFile()) return idx2;
          if (fs.existsSync(idx3) && fs.statSync(idx3).isFile()) return idx3;
        } catch (e) {
          // ignore
        }
      }
      // Special-case @theia/core and similar packages that publish multiple entry points under lib/<flavor>/
      if (!sub && pkg === 'core') {
        const variants = [
          path.join(workspaceRoot, 'packages', 'core', 'lib', 'common', 'index.js'),
          path.join(workspaceRoot, 'packages', 'core', 'lib', 'browser', 'index.js'),
          path.join(workspaceRoot, 'packages', 'core', 'lib', 'node', 'index.js'),
          path.join(workspaceRoot, 'packages', 'core', 'lib', 'index.js')
        ];
        for (const v of variants) {
            if (fs.existsSync(v) && fs.statSync(v).isFile()) {
              // debug: which core variant we picked
              // console.debug('resolve-theia-paths: @theia/core ->', v);
              return v;
            }
        }
      }
    }
    // If it's a bare package import (not a relative or absolute path and not an @theia scoped import),
    // prefer resolving it from the workspace node_modules folder. This helps ensure packages that
    // compiled code expects (like async-mutex, valid-filename, etc.) are found in the workspace
    // even when parent resolution paths are unusual.
    if (typeof request === 'string' && !request.startsWith('.') && !request.startsWith('/') && !request.startsWith('@theia/')) {
      try {
        return require.resolve(request, { paths: [workspaceRoot, path.join(workspaceRoot, 'node_modules')] });
      } catch (e) {
        // fall back to default resolver
      }
    }
  }
  catch (e) {
    // ignore mapping errors and fall back to original resolver
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

// expose for debugging
module.exports = { workspaceRoot };
