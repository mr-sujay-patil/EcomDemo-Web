// The size budgets of the build, checked on dist/ after `npm run build` (and so in `npm run verify` and in CI).
//   - No JavaScript chunk over 100 KB gzipped.
//   - The JavaScript the shelf needs (the entry and what index.html preloads) at most 170 KB gzipped.
// What needs a browser (LCP, CLS, the performance score, fonts as fetched) is Lighthouse's: lighthouserc.cjs, scripts/perf-flows.mjs.
// "Gzipped" here is level 9, which is what the container serves (the Dockerfile compresses the build once, at -9).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

export const budgets = { chunkKB: 100, shelfScriptKB: 170 }

const gzipped = (bytes) => gzipSync(bytes, { level: 9 }).length

/**
 * `files` maps a path inside dist/ (as index.html names it, without the leading slash: `assets/index-abc.js`) to its bytes;
 * `indexHtml` is dist/index.html. Returns one row per JavaScript chunk and the shelf's total, with the broken budgets listed.
 */
export function checkBudgets(files, indexHtml) {
  const sizes = new Map()
  for (const [path, bytes] of files) if (path.endsWith('.js')) sizes.set(path, gzipped(bytes))

  // What the shelf loads before it can show anything: the entry script and every module index.html preloads.
  const wanted = [
    ...indexHtml.matchAll(
      /<script[^>]+type="module"[^>]+src="\/([^"]+)"|<link[^>]+rel="modulepreload"[^>]+href="\/([^"]+)"/g,
    ),
  ].map((match) => match[1] ?? match[2])
  const shelf = [...new Set(wanted)]
  const shelfBytes = shelf.reduce((sum, path) => sum + (sizes.get(path) ?? 0), 0)

  const failures = []
  for (const [path, bytes] of sizes) {
    if (bytes > budgets.chunkKB * 1024)
      failures.push(
        `${path} is ${(bytes / 1024).toFixed(1)} KB gzipped: over the ${budgets.chunkKB} KB limit for one chunk`,
      )
  }
  if (shelf.length === 0) failures.push('index.html names no entry script: the build is not what this check expects')
  if (shelfBytes > budgets.shelfScriptKB * 1024) {
    failures.push(
      `the shelf loads ${(shelfBytes / 1024).toFixed(1)} KB of JavaScript gzipped: over the ${budgets.shelfScriptKB} KB limit`,
    )
  }
  return { chunks: [...sizes].map(([path, bytes]) => ({ path, bytes })), shelf, shelfBytes, failures }
}

function readDist(root) {
  const files = new Map()
  const walk = (dir) => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = dir ? `${dir}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(path)
      else files.set(path, readFileSync(join(root, path)))
    }
  }
  walk('')
  return { files, indexHtml: readFileSync(join(root, 'index.html'), 'utf8') }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { files, indexHtml } = readDist('dist')
  const { chunks, shelf, shelfBytes, failures } = checkBudgets(files, indexHtml)
  const biggest = [...chunks].sort((a, b) => b.bytes - a.bytes)[0]
  console.log(
    `check-budgets: ${chunks.length} JavaScript chunks, the biggest ${biggest?.path} at ${((biggest?.bytes ?? 0) / 1024).toFixed(1)} KB gzipped (limit ${budgets.chunkKB}); ` +
      `the shelf loads ${shelf.length} files, ${(shelfBytes / 1024).toFixed(1)} KB gzipped (limit ${budgets.shelfScriptKB}).`,
  )
  if (failures.length > 0) {
    for (const failure of failures) console.error(`check-budgets: ${failure}`)
    process.exit(1)
  }
}
