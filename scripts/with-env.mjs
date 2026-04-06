#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { resolve } from "node:path"
import dotenv from "dotenv"

function usage() {
  console.error("Usage: node scripts/with-env.mjs <env-file> -- <command> [...args]")
}

const separatorIndex = process.argv.indexOf("--")

if (separatorIndex === -1 || separatorIndex < 3) {
  usage()
  process.exit(1)
}

const envFile = process.argv[2]
const command = process.argv[separatorIndex + 1]
const args = process.argv.slice(separatorIndex + 2)

if (!command) {
  usage()
  process.exit(1)
}

dotenv.config({ path: resolve(process.cwd(), envFile), override: false })

const result = spawnSync(command, args, {
  stdio: "inherit",
  env: process.env,
  shell: true,
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
