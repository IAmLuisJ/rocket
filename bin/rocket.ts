#!/usr/bin/env node
import { program } from '../src/cli.js'

// Graceful SIGINT handling — exit cleanly without stack trace
process.on('SIGINT', () => {
  process.exit(0)
})

try {
  await program.parseAsync(process.argv)
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`\n\x1b[31mError:\x1b[0m ${message}\n`)
  process.exit(1)
}
