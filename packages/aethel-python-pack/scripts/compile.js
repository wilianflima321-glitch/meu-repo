const fs = require('fs');
const cp = require('child_process');
try {
  if (fs.existsSync('src')) {
    console.log('Found src — running tsc');
    cp.execSync('npx tsc -p ./', { stdio: 'inherit' });
  } else {
    console.log('No TS sources for aethel-python-pack — skipping compile');
  }
} catch (err) {
  console.error(err && err.message ? err.message : err);
  process.exit(2);
}
