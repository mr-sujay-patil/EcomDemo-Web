// The size budgets of the build, checked on dist/ after `npm run build` (and so in `npm run verify` and in CI).
//   - No JavaScript chunk over 100 KB gzipped.
//   - The JavaScript the shelf needs (the entry and what index.html preloads) at most 170 KB gzipped, in at most 5 files.
//   - None of those files holds code that only a later page, or the time after the first paint, needs (web KI-042):
//     bundle-analysis/chunk-modules.json, written by the build (vite.config.ts), says which modules each file holds.
// What needs a browser (LCP, CLS, the performance score, fonts as fetched) is Lighthouse's: lighthouserc.cjs, scripts/perf-flows.mjs.
// "Gzipped" here is level 9, which is what the container serves (the Dockerfile compresses the build once, at -9).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

// Files, not only bytes (web KI-042): on a slow link each file the shelf waits for is another request, and Phase 21 measured a
// 5 to 8 file split as 0.15 s later. Phase 24's lazy cart route made rolldown split three more files out of the entry the same way.
export const budgets = { chunkKB: 100, shelfScriptKB: 170, shelfFiles: 5 }

// Code that must not be in the files the shelf loads first: it is fetched when a page that uses it opens (forms, the admin
// console, sign-in, checkout, the assistant) or after the first paint (tracing, web KI-033). Matched against module ids.
export const notOnShelf = [
  { what: 'zod', test: /node_modules[\\/]zod[\\/]/ },
  { what: 'react-hook-form', test: /node_modules[\\/](react-hook-form|@hookform)[\\/]/ },
  { what: '@opentelemetry', test: /node_modules[\\/]@opentelemetry[\\/]/ },
  { what: 'the admin console', test: /src[\\/]features[\\/]admin[\\/]/ },
  { what: 'the account forms', test: /src[\\/]features[\\/]accounts[\\/]/ },
  { what: 'checkout and orders', test: /src[\\/]features[\\/](checkout|orders)[\\/]/ },
  { what: 'the assistant', test: /src[\\/]features[\\/]assistant[\\/]/ },
  { what: 'tracing', test: /src[\\/]app[\\/]tracing\.ts$/ },
]

const gzipped = (bytes) => gzipSync(bytes, { level: 9 }).length

/**
 * `files` maps a path inside dist/ (as index.html names it, without the leading slash: `assets/index-abc.js`) to its bytes;
 * `indexHtml` is dist/index.html; `chunkModules` (optional) maps each chunk's path to the module ids in it. Returns one row per
 * JavaScript chunk and the shelf's total, with the broken budgets listed.
 */
export function checkBudgets(files, indexHtml, chunkModules) {
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
  if (shelf.length > budgets.shelfFiles) {
    failures.push(
      `the shelf loads ${shelf.length} files of JavaScript before it can start: over the limit of ${budgets.shelfFiles} (each is another request on a slow link)`,
    )
  }
  if (chunkModules) {
    for (const path of shelf) {
      const modules = chunkModules[path]
      if (!modules) {
        failures.push(`the chunk report has no module list for ${path}: the build is not what this check expects`)
        continue
      }
      for (const rule of notOnShelf) {
        const found = modules.find((id) => rule.test.test(id))
        if (found) failures.push(`${path}, which the shelf loads first, holds ${rule.what} (${found}): it belongs in a lazy chunk`)
      }
    }
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

/** bundle-analysis/chunk-modules.json, written by every build (vite.config.ts), or undefined when there is none. */
function readChunkModules(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return undefined
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { files, indexHtml } = readDist('dist')
  const chunkModules = readChunkModules('bundle-analysis/chunk-modules.json')
  const { chunks, shelf, shelfBytes, failures } = checkBudgets(files, indexHtml, chunkModules)
  if (!chunkModules) failures.push('bundle-analysis/chunk-modules.json is missing: run `npm run build` first (vite.config.ts writes it)')
  const biggest = [...chunks].sort((a, b) => b.bytes - a.bytes)[0]
  console.log(
    `check-budgets: ${chunks.length} JavaScript chunks, the biggest ${biggest?.path} at ${((biggest?.bytes ?? 0) / 1024).toFixed(1)} KB gzipped (limit ${budgets.chunkKB}); ` +
      `the shelf loads ${shelf.length} files (limit ${budgets.shelfFiles}), ${(shelfBytes / 1024).toFixed(1)} KB gzipped (limit ${budgets.shelfScriptKB}).`,
  )
  if (failures.length > 0) {
    for (const failure of failures) console.error(`check-budgets: ${failure}`)
    process.exit(1)
  }
}
