const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

function readPNG(file) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(new PNG())
      .on('parsed', function() { resolve(this); })
      .on('error', reject);
  });
}

async function compare({ baselineDir, currentDir, outDir, perPageThreshold = 100, totalThreshold = 500 }) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const pages = fs.readdirSync(baselineDir).filter(f => f.endsWith('.png'));
  const report = [];
  let totalDiff = 0;

  for (const file of pages) {
    const basePath = path.join(baselineDir, file);
    const curPath = path.join(currentDir, file);
    if (!fs.existsSync(curPath)) {
      report.push({ file, error: 'missing-current' });
      continue;
    }
    const img1 = await readPNG(basePath);
    const img2 = await readPNG(curPath);
    const { width, height } = img1;
    if (width !== img2.width || height !== img2.height) {
      report.push({ file, error: 'size-mismatch' });
      continue;
    }
    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.12 });
    totalDiff += diffPixels;
    const outPath = path.join(outDir, file.replace('.png', '-diff.png'));
    diff.pack().pipe(fs.createWriteStream(outPath));
    report.push({ file, diffPixels, diffPath: outPath });
  }

  const summary = { totalDiff, pages: report };
  fs.writeFileSync(path.join(outDir, 'compare-report.json'), JSON.stringify(summary, null, 2));

  // determine failure
  const failPages = report.filter(r => r.diffPixels && r.diffPixels > perPageThreshold);
  const fail = totalDiff > totalThreshold || failPages.length > 0;
  return { summary, fail };
}

// CLI
if (require.main === module) {
  const argv = require('minimist')(process.argv.slice(2));
  const baselineDir = argv.baseline || argv.b || path.join(__dirname, 'baseline');
  const currentDir = argv.current || argv.c || path.join(__dirname, 'output', 'current');
  const outDir = argv.out || path.join(__dirname, 'output', 'diffs');
  const perPageThreshold = parseInt(argv.per || 100, 10);
  const totalThreshold = parseInt(argv.total || 500, 10);

  compare({ baselineDir, currentDir, outDir, perPageThreshold, totalThreshold }).then(res => {
    console.log('Compare summary:', res.summary);
    if (res.fail) process.exit(2);
    else process.exit(0);
  }).catch(err => { console.error(err); process.exit(1); });
}
