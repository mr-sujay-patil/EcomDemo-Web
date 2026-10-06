// The design system is only a system if nothing can step around it. This check runs in `npm run verify`
// and fails on what the phase 9 rules forbid, so a style guide nobody rereads is not the only defence:
//   - hex colours, rgb()/hsl() and named colours, anywhere but src/styles/tokens.css (colours are tokens)
//   - px font sizes (type sizes are the --fs-* tokens)
//   - gradients (the brand has none)
//   - imports of Tailwind, Radix, shadcn, Lucide or Heroicons
//   - emoji in src/ (the voice rules ban them in the UI; icons are drawn for this system)
// Usage: `node scripts/check-tokens.mjs` (exit 1 and a list of file:line when something is found).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The one file that may define colours and px sizes, and the generated API types (never hand-edited). */
const exempt = ['src/styles/tokens.css', 'src/api/generated/']

const namedColours = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood ' +
    'cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray ' +
    'darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
    'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue ' +
    'firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew ' +
    'hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
    'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray ' +
    'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue ' +
    'mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred ' +
    'midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
    'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple ' +
    'rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue ' +
    'slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white ' +
    'whitesmoke yellow yellowgreen'
  ).split(' '),
)

/** CSS properties whose values can hold a colour. A named colour elsewhere (`font-family: Tan`) is not one. */
const colourProperty = /color|background|border|outline|fill|stroke|shadow|caret|accent|column-rule/

const bannedImport = /(?:from|import|require\()\s*['"](tailwindcss|@radix-ui\/|shadcn|lucide-react|@heroicons\/)/

// Emoji and the symbol blocks they live in. Plain symbols such as the rupee sign, arrows and dashes are fine.
const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}]/u

/**
 * @typedef {{ file: string, line: number, message: string }} Violation
 */

/** Replaces every comment with spaces, keeping the line breaks, so reported line numbers stay right. */
function blank(text, pattern) {
  return text.replace(pattern, (match) => match.replace(/[^\n]/g, ' '))
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length
}

/** Checks one CSS file's declarations. @returns {Violation[]} */
function checkCss(file, source) {
  const text = blank(source, /\/\*[\s\S]*?\*\//g)
  /** @type {Violation[]} */
  const found = []
  const add = (index, message) => found.push({ file, line: lineOf(text, index), message })

  for (const match of text.matchAll(/(?:^|[;{}\s])([a-zA-Z-]+)\s*:\s*([^;{}]+)/g)) {
    const property = (match[1] ?? '').toLowerCase()
    const value = match[2] ?? ''
    const at = match.index + match[0].indexOf(value)
    // var(--token) and url(...) carry no colour of their own.
    const bare = value.replace(/var\([^)]*\)/g, ' ').replace(/url\([^)]*\)/g, ' ')

    if (/#[0-9a-fA-F]{3,8}\b/.test(bare)) add(at, `hex colour in "${property}": use a colour token`)
    if (/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\(/i.test(bare))
      add(at, `colour function in "${property}": use a colour token`)
    if (/gradient\(/i.test(bare)) add(at, `gradient in "${property}": the brand has none`)
    if ((property === 'font-size' || property === 'font') && /\d(?:\.\d+)?px\b/.test(bare)) {
      add(at, `px font size in "${property}": use a --fs-* token`)
    }
    if (colourProperty.test(property)) {
      const word = bare
        .toLowerCase()
        .match(/[a-z]+/g)
        ?.find((candidate) => namedColours.has(candidate))
      if (word) add(at, `named colour "${word}" in "${property}": use a colour token`)
    }
  }
  if (/@tailwind\b|@import\s+(?:url\()?['"]?tailwindcss/.test(text)) {
    add(text.search(/@tailwind\b|@import/), 'Tailwind is not used here')
  }
  return found
}

/** Checks one TypeScript/JavaScript file: colours and sizes written inline, and banned imports. @returns {Violation[]} */
function checkScript(file, source) {
  const text = blank(source, /\/\*[\s\S]*?\*\/|(?<![:'"`])\/\/[^\n]*/g)
  /** @type {Violation[]} */
  const found = []
  const add = (index, message) => found.push({ file, line: lineOf(text, index), message })

  const rules = [
    [/(['"`])#[0-9a-fA-F]{3,8}\1/g, 'hex colour string: use a colour token'],
    [/['"`][^'"`\n]*\b(?:rgba?|hsla?)\(/g, 'colour function in a string: use a colour token'],
    [/gradient\(/g, 'gradient: the brand has none'],
    [/\bfontSize\s*:\s*['"`]?\d/g, 'inline font size: use a --fs-* token'],
    [/\b(?:color|backgroundColor|borderColor|fill|stroke)\s*:\s*['"`](?:[a-z]+)['"`]/gi, null],
  ]
  for (const [pattern, message] of rules) {
    for (const match of text.matchAll(pattern)) {
      if (message) {
        add(match.index, message)
        continue
      }
      const word = /['"`]([a-z]+)['"`]/i.exec(match[0])?.[1]?.toLowerCase()
      if (word && namedColours.has(word)) add(match.index, `named colour "${word}": use a colour token`)
    }
  }
  return found
}

/**
 * Every violation in one file's text.
 * @param {string} file path relative to the repository root, with forward slashes
 * @param {string} source
 * @returns {Violation[]}
 */
export function checkSource(file, source) {
  if (exempt.some((prefix) => file === prefix || file.startsWith(prefix))) return []
  /** @type {Violation[]} */
  const found = []

  if (file.endsWith('.css')) found.push(...checkCss(file, source))
  else if (/\.(?:[cm]?[jt]sx?)$/.test(file)) found.push(...checkScript(file, source))

  source.split('\n').forEach((line, index) => {
    if (bannedImport.test(line))
      found.push({ file, line: index + 1, message: 'Tailwind, Radix, shadcn, Lucide and Heroicons are not used here' })
    if (emoji.test(line))
      found.push({ file, line: index + 1, message: 'emoji: the UI has none (draw an icon or use words)' })
  })
  return found
}

function* walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) yield* walk(path)
    else yield path
  }
}

/** Every violation under `<root>/src`. @param {string} root */
export function checkProject(root) {
  /** @type {Violation[]} */
  const found = []
  for (const path of walk(join(root, 'src'))) {
    if (!/\.(?:css|[cm]?[jt]sx?)$/.test(path)) continue
    found.push(...checkSource(relative(root, path).split(sep).join('/'), readFileSync(path, 'utf8')))
  }
  return found
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const violations = checkProject(process.cwd())
  for (const { file, line, message } of violations) console.error(`${file}:${line}: ${message}`)
  if (violations.length > 0) {
    console.error(`\ncheck-tokens: ${violations.length} problem(s). Colours and sizes come from src/styles/tokens.css.`)
    process.exit(1)
  }
  console.log('check-tokens: no stray colours, px font sizes, gradients, banned imports or emoji in src/')
}
