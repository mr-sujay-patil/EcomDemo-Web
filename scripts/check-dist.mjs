// What the production build may contain, checked on dist/ after `npm run build` (so in `npm run verify` and in CI):
//   - no secret-shaped text (keys, tokens, passwords) and no source maps or .env files;
//   - no backend address: the app talks to `/api` on its own origin and nothing else. Any absolute URL has to be one of the
//     few namespaces and documentation links that libraries carry in their code (the allowlist below, each with its reason).
// A hit fails the build. Adding to the allowlist is a review decision: a real address in the bundle is a bug, not an entry.
import { readdirSync, readFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Absolute URLs that may appear. The first five are XML namespaces and error-documentation links inside React, React Router and
// the JSON-Schema tooling: strings in their code, never requested. `http://localhost` with no port is the placeholder base
// the API client and the router give `new URL(...)` when there is no `window` (a test or a server): nothing is fetched from it.
export const allowedUrls = [
  /^https?:\/\/www\.w3\.org\//,
  /^https:\/\/react\.dev\//,
  /^https:\/\/reactrouter\.com\//,
  /^https?:\/\/json-schema\.org\//,
  /^https:\/\/github\.com\/ungap\//,
  /^http:\/\/localhost$/,
]

// Text that names where the backend lives. The app reaches it through nginx at /api, so none of this has a reason to be here.
const backendAddresses = [
  /localhost:\d/,
  /127\.0\.0\.1/,
  /0\.0\.0\.0/,
  /:8080\b/,
  /gateway-service/,
  /host\.docker\.internal/,
]

const secretShapes = [
  ['a private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['an AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['a GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['an API secret key (sk-...)', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['a JSON Web Token', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./],
  // A literal that mixes letters and digits and has no spaces: a real value, not a label such as `password: 'Password'`.
  [
    'a credential assigned a literal value',
    /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token)\b["']?\s*[:=]\s*["'`](?=[^"'`\s]*\d)(?=[^"'`\s]*[A-Za-z])[^"'`\s]{8,}["'`]/i,
  ],
]

const textTypes = new Set(['.js', '.css', '.html', '.json', '.txt', '.svg', '.webmanifest'])

/** `files` maps a path inside dist/ to its bytes. Returns the problems found, each naming the file. */
export function checkDist(files) {
  const failures = []
  for (const [path, bytes] of files) {
    if (path.endsWith('.map')) failures.push(`${path}: a source map ships the source code to every visitor`)
    if (/(^|\/)\.env/.test(path)) failures.push(`${path}: an environment file must never be in the build`)
    if (!textTypes.has(extname(path))) continue
    const text = Buffer.from(bytes).toString('utf8')

    for (const [url] of text.matchAll(/https?:\/\/[A-Za-z0-9._~:/?#@!$&()*+,;=%-]*[A-Za-z0-9/_-]/g)) {
      if (!allowedUrls.some((allowed) => allowed.test(url)))
        failures.push(`${path}: the address ${url} is not on the allowlist (the app talks to /api only)`)
    }
    for (const pattern of backendAddresses) {
      const hit = text.match(pattern)
      if (hit) failures.push(`${path}: "${hit[0]}" looks like a backend address; the app calls /api on its own origin`)
    }
    for (const [what, pattern] of secretShapes) {
      if (pattern.test(text)) failures.push(`${path}: looks like ${what}`)
    }
  }
  return { failures }
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
  return files
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const files = readDist('dist')
  const { failures } = checkDist(files)
  console.log(`check-dist: ${files.size} files scanned for secrets, source maps and backend addresses.`)
  if (failures.length > 0) {
    for (const failure of failures) console.error(`check-dist: ${failure}`)
    process.exit(1)
  }
}
