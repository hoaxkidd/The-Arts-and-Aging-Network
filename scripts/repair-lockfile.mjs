import { readFileSync, writeFileSync } from "node:fs";

const lockfilePath = "package-lock.json";
const fromToken = "bookingstream-";
const toToken = "eventstream-";

try {
  const contents = readFileSync(lockfilePath, "utf8");
  const matches = contents.match(/bookingstream-/g);
  const replacements = matches ? matches.length : 0;

  if (replacements === 0) {
    console.log("lockfile repair: no changes needed");
    process.exit(0);
  }

  const updated = contents.replaceAll(fromToken, toToken);
  writeFileSync(lockfilePath, updated);
  console.log(`lockfile repair: replaced ${replacements} invalid token(s)`);
  process.exit(0);
} catch (error) {
  console.warn(`lockfile repair: skipped (${error.message})`);
  process.exit(0);
}
