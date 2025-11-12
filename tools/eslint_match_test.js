const path = require('path');
const fs = require('fs');

function globToRegex(glob) {
  // very small glob -> regex conversion for debugging (handles ** and *)
  let g = glob.replace(/\\/g, '/');
  g = g.replace(/\*\*/g, '<<TWOSTAR>>');
  g = g.replace(/\*/g, '[^/]*');
  g = g.replace(/<<TWOSTAR>>/g, '.*');
  g = '^' + g + '$';
  return new RegExp(g);
}

(function main() {
  const cfgPath = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide', 'eslint.config.cjs');
  if (!fs.existsSync(cfgPath)) {
    console.error('config not found', cfgPath);
    process.exit(2);
  }
  const cfg = require(cfgPath);
  const file = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide', 'src', 'browser', 'frontend-module.ts');
  const rel = path.relative(path.dirname(cfgPath), file).replace(/\\/g, '/');
  console.log('config path:', cfgPath);
  console.log('file relative to config:', rel);
  if (cfg.overrides && Array.isArray(cfg.overrides)) {
    for (const ov of cfg.overrides) {
      if (ov.files) {
        const patterns = Array.isArray(ov.files) ? ov.files : [ov.files];
        for (const p of patterns) {
          const re = globToRegex(p);
          console.log('pattern', p, '=>', re, 'match?', re.test(rel));
        }
      }
    }
  } else {
    console.log('no overrides in config');
  }
})();
