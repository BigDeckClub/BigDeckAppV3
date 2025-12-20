const { execSync } = require('child_process');
const path = require('path');

try {
  const cwd = path.resolve(__dirname, '..');
  const out = execSync('node bin/run-autobuy.cjs', { cwd, encoding: 'utf8' });
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch (err) {
    console.error('autobuy verify: output is not valid JSON');
    console.error(out);
    process.exit(2);
  }

  if (!parsed || !parsed.summary || typeof parsed.summary.overallTotal !== 'number') {
    console.error('autobuy verify: output missing required summary.overallTotal');
    console.error(JSON.stringify(parsed, null, 2));
    process.exit(3);
  }

  if (!Array.isArray(parsed.baskets)) {
    console.error('autobuy verify: output missing baskets array');
    process.exit(4);
  }

  console.log('autobuy verify: OK — overallTotal=%d baskets=%d', parsed.summary.overallTotal, parsed.summary.totalBaskets || parsed.baskets.length);
  process.exit(0);
} catch (err) {
  console.error('autobuy verify failed:', err.message || err);
  process.exit(1);
}
