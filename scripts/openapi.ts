// The pure part of the API tooling (scripts/api.ts does the I/O), so vitest can test it.

/** The five backend services whose OpenAPI documents the gateway serves at /v3/api-docs/<service>. */
export const services = ['catalog', 'customer', 'app', 'assistant', 'inventory'] as const
export type Service = (typeof services)[number]

/** Copies a JSON value with every object's keys in alphabetical order (array order is meaningful and kept). */
export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, child]) => [key, sortKeys(child)]),
    )
  }
  return value
}

/** The text a snapshot file holds: sorted keys, two-space indent, trailing newline, so a git diff shows only real changes. */
export function formatDocument(document: unknown): string {
  return `${JSON.stringify(sortKeys(document), null, 2)}\n`
}

/** Says where two formatted documents first differ, in a line or two a person can act on. */
export function describeDifference(snapshot: string, live: string): string {
  const before = snapshot.split('\n')
  const after = live.split('\n')
  let line = 0
  while (line < before.length && line < after.length && before[line] === after[line]) line++
  const changed = Math.max(before.length, after.length) - line
  const show = (text: string | undefined) => (text === undefined ? '(end of file)' : text.trim())
  return [
    `first difference at line ${line + 1} (${changed} line${changed === 1 ? '' : 's'} from there on)`,
    `  snapshot: ${show(before[line])}`,
    `  live:     ${show(after[line])}`,
  ].join('\n')
}

export type Drift = { service: Service; problem: string }

/** Null when the live document matches the committed snapshot exactly; otherwise what is wrong. */
export function findDrift(service: Service, snapshot: string | null, liveDocument: unknown): Drift | null {
  if (snapshot === null) {
    return { service, problem: 'no snapshot is committed (run npm run api:snapshot)' }
  }
  const live = formatDocument(liveDocument)
  if (snapshot === live) return null
  return { service, problem: describeDifference(snapshot, live) }
}

type Schema = { properties?: Record<string, unknown>; required?: string[] }
type OpenApiDocument = { components?: { schemas?: Record<string, Schema> } }

/** Schemas that describe what a client sends: their `required` arrays are the backend's own and are kept. */
const requestSchemaName = /(Request|Upsert)$/

/**
 * The backend's documents mark no response property as required, so a generated type would make
 * every field `price?: number`. The backend serialises every property of a response (Jackson's
 * default includes nulls; nothing in the backend sets NON_NULL), so the types are generated from
 * a copy of the snapshot in which each response schema lists all its properties as required.
 * The snapshot itself stays exactly what the backend served. See web KI-016.
 */
export function assumeResponsePropertiesPresent<T>(document: T): T {
  const copy = structuredClone(document) as OpenApiDocument
  for (const [name, schema] of Object.entries(copy.components?.schemas ?? {})) {
    if (schema.required !== undefined || requestSchemaName.test(name) || !schema.properties) continue
    schema.required = Object.keys(schema.properties)
  }
  return copy as T
}
