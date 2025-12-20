#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function loadOptimizer() {
  const mod = require(path.join(__dirname, '..', 'dist', 'server', 'autobuy', 'optimizer'))
  // support default or direct exports
  return mod.runFullPipeline ? mod : (mod.default || mod)
}

async function main() {
  const args = process.argv.slice(2)
  const inputPath = args[0] || path.join(__dirname, '..', 'server', 'autobuy', 'examples', 'sample-input.json')
  let input = null
  try {
    input = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  } catch (e) {
    console.error('Failed to read input JSON:', e.message)
    process.exit(1)
  }

  const optimizer = loadOptimizer()
  const pipeline = optimizer.runFullPipeline || (optimizer.default && optimizer.default.runFullPipeline)
  if (!pipeline) {
    console.error('runFullPipeline not found in compiled optimizer module')
    process.exit(1)
  }

  // adapt plain JSON shapes to expected structures (Maps)
  const ckPrices = new Map(Object.entries(input.cardKingdomPrices || {}))
  const currentInventory = new Map(Object.entries(input.currentInventory || {}))

  const plan = pipeline({
    demands: input.demands || [],
    directives: input.directives || [],
    offers: input.offers || [],
    hotList: input.hotList || [],
    cardKingdomPrices: ckPrices,
    currentInventory,
  })

  console.log(JSON.stringify(plan, null, 2))
}

main()
