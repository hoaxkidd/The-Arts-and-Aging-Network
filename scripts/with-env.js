#!/usr/bin/env node
/**
 * Load env from a file (e.g. .env.local) and run a command.
 * Usage: node scripts/with-env.js [path-to-env] -- <command> [args...]
 */
const { spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const args = process.argv.slice(2)
const dashDash = args.indexOf('--')
const envPath = dashDash >= 0 ? args[0] : '.env.local'
const cmdArgs = dashDash >= 0 ? args.slice(dashDash + 1) : []

if (cmdArgs.length === 0) {
  console.error('Usage: node scripts/with-env.js [.env.local] -- <command> [args...]')
  process.exit(1)
}

const envFile = path.resolve(process.cwd(), envPath)
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8')
  content.split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (m) {
      const key = m[1]
      let val = (m[2] || '').replace(/^["']|["']$/g, '').trim()
      if (!process.env[key]) process.env[key] = val
    }
  })
}

const [cmd, ...rest] = cmdArgs
const r = spawnSync(cmd, rest, { stdio: 'inherit', shell: true, env: process.env })
process.exit(r.status ?? 1)
