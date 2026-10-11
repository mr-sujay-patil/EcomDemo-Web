import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { retargetAlloyConfig } from './alloy-override.mjs'

// Web KI-039: the backend's Alloy keeps only containers of the compose project `ecomdemo`, and this repo runs the stack as
// `ecomdemo-backend-readonly`, so Loki got none of its logs. The stack now mounts a copy of the backend's own config.alloy with
// the project rule pointed at this stack's project. These tests need no stack: they feed the generator the pinned file.
// Paths are from the repository root, where Vitest runs (as scripts/k8s-https.test.ts does).
const read = (path: string) => readFileSync(path, 'utf8')
const pinned = read('scripts/fixtures/backend-config.alloy')

// The value of every `regex` that follows a rule on the compose project label, in order.
const projectRegexes = (config: string) =>
  [
    ...config.matchAll(
      /source_labels\s*=\s*\["__meta_docker_container_label_com_docker_compose_project"\]\s*\n\s*regex\s*=\s*"([^"]*)"/g,
    ),
  ].map((match) => match[1] ?? '')

// Alloy's relabel regexes are RE2 and anchored at both ends, as Prometheus's are.
const keeps = (regex: string, project: string) => new RegExp(`^(?:${regex})$`).test(project)

describe('the Alloy config this repo mounts (web KI-039)', () => {
  it('the pinned backend keeps only the project "ecomdemo", which is why this stack shipped no logs', () => {
    const regexes = projectRegexes(pinned)

    expect(regexes).toEqual(['ecomdemo', 'ecomdemo'])
    expect(regexes.some((regex) => keeps(regex, 'ecomdemo-backend-readonly'))).toBe(false)
  })

  it("keeps this stack's project in both pipelines (the application's and the infrastructure's)", () => {
    const regexes = projectRegexes(retargetAlloyConfig(pinned, 'ecomdemo-backend-readonly'))

    expect(regexes).toHaveLength(2)
    for (const regex of regexes) {
      expect(keeps(regex, 'ecomdemo-backend-readonly')).toBe(true)
      // Not the backend team's stack on the same machine, and not a look-alike project either.
      expect(keeps(regex, 'ecomdemo')).toBe(false)
      expect(keeps(regex, 'ecomdemo-backend-readonly-2')).toBe(false)
    }
  })

  it('changes nothing else: every other line of the backend file arrives as it was', () => {
    const before = pinned.split('\n')
    const after = retargetAlloyConfig(pinned, 'ecomdemo-backend-readonly').split('\n')
    const added = after.filter((line) => !before.includes(line))
    const removed = before.filter((line) => !after.includes(line))

    // The two regex lines, plus the header that says the file is generated and from where.
    expect(removed).toEqual(['    regex         = "ecomdemo"'])
    expect(added.filter((line) => !line.startsWith('//'))).toEqual(['    regex         = "ecomdemo-backend-readonly"'])
    expect(after[0]).toMatch(/^\/\/ GENERATED .*scripts\/alloy-override\.mjs/)
  })

  it('for a stack that is the project "ecomdemo" the rules stay as the backend wrote them', () => {
    expect(projectRegexes(retargetAlloyConfig(pinned, 'ecomdemo'))).toEqual(['ecomdemo', 'ecomdemo'])
  })

  it('fails loudly when the backend file has no project rule, instead of mounting a copy that changes nothing', () => {
    const noRule = pinned.replaceAll('__meta_docker_container_label_com_docker_compose_project', '__meta_docker_container_label_other')

    expect(() => retargetAlloyConfig(noRule, 'ecomdemo-backend-readonly')).toThrow(/project rule/)
    expect(() => retargetAlloyConfig('', 'ecomdemo-backend-readonly')).toThrow(/project rule/)
  })

  it('fails loudly when a project rule keeps something other than "ecomdemo" (a backend change to look at first)', () => {
    const changed = pinned.replace('regex         = "ecomdemo"', 'regex         = "ecomdemo.*"')

    expect(() => retargetAlloyConfig(changed, 'ecomdemo-backend-readonly')).toThrow(/"ecomdemo\.\*"/)
  })

  it.each(['', 'Upper', 'has space', 'quote"d', 'dot.ted', '-leading'])('refuses the project name %j', (project) => {
    expect(() => retargetAlloyConfig(pinned, project)).toThrow(/project name/)
  })
})

describe('every backend stack this repo starts mounts it (web KI-039)', () => {
  it('scripts/backend-stack.sh generates the copy from the clone and mounts it over Alloy\'s config', () => {
    const script = read('scripts/backend-stack.sh')

    expect(script).toContain('node scripts/alloy-override.mjs')
    // The copy lives where the container can keep reading it (a temp file would be gone after this script exits).
    expect(script).toContain('.local/backend-stack/config.alloy')
    // A backend without an Alloy service, or without its config mount, fails instead of silently shipping nothing.
    expect(script).toMatch(/no alloy service/i)
  })

  it('CI starts the stack through the same script, proves Loki has gateway lines, and runs the KI-032 check', () => {
    const ci = read('.github/workflows/ci.yml')
    const e2eJob = ci.slice(ci.indexOf('\n  e2e:'), ci.indexOf('\n  image:'))

    expect(e2eJob).toContain('bash scripts/backend-stack.sh up')
    expect(e2eJob).not.toMatch(/^\s*docker compose up/m)
    expect(e2eJob).toContain('service_name="gateway-service"')
    expect(e2eJob).toContain('npm run e2e:service-down')
  })
})
