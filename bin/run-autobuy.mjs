#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

async function loadOptimizer() {
  const p = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'optimizer.js');
  if (!fs.existsSync(p)) throw new Error('Compiled optimizer not found; run npm run build:autobuy');
  const fileUrl = pathToFileURL(p).href;
  const mod = await import(fileUrl);
  return mod.runFullPipeline ? mod : (mod.default || mod);
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || path.join(process.cwd(), 'server', 'autobuy', 'examples', 'sample-input.json');
  let input = null;
  try {
    input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (e) {
    console.error('Failed to read input JSON:', e.message);
    process.exit(1);
  }

  const optimizer = await loadOptimizer();
  const pipeline = optimizer.runFullPipeline || (optimizer.default && optimizer.default.runFullPipeline);
  if (!pipeline) {
    console.error('runFullPipeline not found in compiled optimizer module');
    process.exit(1);
  }

  const ckPrices = new Map(Object.entries(input.cardKingdomPrices || {}));
  const currentInventory = new Map(Object.entries(input.currentInventory || {}));

  const plan = pipeline({
    demands: input.demands || [],
    directives: input.directives || [],
    offers: input.offers || [],
    hotList: input.hotList || [],
    cardKingdomPrices: ckPrices,
    currentInventory,
  });

  console.log(JSON.stringify(plan, null, 2));
}

main();
