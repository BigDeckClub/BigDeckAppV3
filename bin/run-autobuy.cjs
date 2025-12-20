#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

async function loadOptimizer() {
  const distDir = path.join(__dirname, '..', 'dist', 'server', 'autobuy')
  const jsPath = path.join(distDir, 'optimizer.js')
  const cjsPath = path.join(distDir, 'optimizer.cjs')

  if (fs.existsSync(cjsPath)) {
    return require(cjsPath)
  }

  if (fs.existsSync(jsPath)) {
    try {
      fs.copyFileSync(jsPath, cjsPath)
      return require(cjsPath)
    } catch (err) {
      // fallback to dynamic import if copy/require fails
      const fileUrl = require('url').pathToFileURL(jsPath).href
      const mod = await import(fileUrl)
      return mod.runFullPipeline ? mod : (mod.default || mod)
    }
  }

  throw new Error('Compiled optimizer not found in dist/server/autobuy')
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

  const optimizer = await loadOptimizer()
  const pipeline = optimizer.runFullPipeline || (optimizer.default && optimizer.default.runFullPipeline)
  if (!pipeline) {
    console.error('runFullPipeline not found in compiled optimizer module')
    process.exit(1)
  }

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
