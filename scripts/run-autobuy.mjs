#!/usr/bin/env node
// CLI stub: to run the optimizer from Node, import `runFullPipeline` from the
// module and run in a TypeScript-aware environment (ts-node or via a build step).
// This script intentionally avoids importing the TypeScript module directly so
// it can be executed under plain Node as a usage hint.

console.log('Run the autobuy optimizer from a TypeScript-aware runtime:')
console.log('  npx ts-node --esm scripts/run-autobuy-using-ts.mjs')

console.log('\nOr run the tests which exercise the pipeline:')
console.log('  npm test -- server/__tests__/autobuy.optimizer.test.ts')

console.log('\nSee server/autobuy/README.md for details.')
