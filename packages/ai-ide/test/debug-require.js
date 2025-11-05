// Debug helper: require the loader and then dump the exports for a target module
try {
  require('./patch-inversify');
} catch (e) {
  console.error('failed to load patch-inversify', e);
}
function dump(name) {
  try {
    const mod = require(name);
    console.error('EXPORTS for', name, Object.keys(mod));
    console.error('module:', mod);
  } catch (e) {
    console.error('FAILED to require', name, e && e.stack ? e.stack : e);
  }
}
// Dump the URI module and the uri-command-handler
dump('@theia/core/lib/common/uri');
dump('@theia/core/lib/common/uri-command-handler');
// Also dump the whole core common to see if keys are present
dump('@theia/core/lib/common');

console.error('done');
