const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist', 'server', 'autobuy');
const jsPath = path.join(distDir, 'optimizer.js');
const cjsPath = path.join(distDir, 'optimizer.cjs');

if (!fs.existsSync(jsPath)) {
  console.error('postbuild-autobuy: compiled optimizer.js not found at', jsPath);
  process.exit(1);
}

try {
  fs.copyFileSync(jsPath, cjsPath);
  console.log('postbuild-autobuy: wrote', cjsPath);
} catch (err) {
  console.error('postbuild-autobuy: failed to write .cjs file:', err.message);
  process.exit(1);
}
