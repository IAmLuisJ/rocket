#!/usr/bin/env node
import { checkNodeVersion } from '../src/lib/preflight.js'

checkNodeVersion()

import { program } from '../src/cli.js'

// Graceful SIGINT handling — exit cleanly without stack trace
process.on('SIGINT', () => {
  process.stdout.write('\n')
  process.exit(0)
})

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason)
  console.error(`\n\x1b[31mUnhandled error:\x1b[0m ${message}\n`)
  process.exit(1)
})

try {
  await program.parseAsync(process.argv)
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`\n\x1b[31mError:\x1b[0m ${message}\n`)
  process.exit(1)
}
