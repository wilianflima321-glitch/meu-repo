require('./resolve-theia-paths');
const core = require('@theia/core');
console.log('resolved @theia/core keys:', Object.keys(core));
console.log('nls exists?', !!core.nls);
if (core.nls) {
  console.log('nls keys:', Object.keys(core.nls));
}
