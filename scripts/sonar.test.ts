import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The code quality dashboard (Phase 25, web KI-014) is a SonarQube server, which cannot run in a unit test. These read the
// files it is started, configured and fed with; the real run (server up, setup, analysis, quality gate) is in
// docs/test-reports/phase-25.md. Paths are from the repository root, where Vitest runs (as scripts/k8s-https.test.ts).
const read = (path: string) => readFileSync(path, 'utf8')

const compose = read('compose.sonar.yaml')
const setup = read('scripts/sonar-setup.sh')
const scan = read('scripts/sonar-scan.sh')
const vite = read('vite.config.ts')
const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> }

// sonar-project.properties as key/value pairs (comments and blank lines skipped).
const properties = new Map(
  read('sonar-project.properties')
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.trimStart().startsWith('#'))
    .map((line) => {
      const at = line.indexOf('=')
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()] as const
    }),
)
const list = (key: string) => (properties.get(key) ?? '').split(',').map((entry) => entry.trim())

describe('the SonarQube stack runs beside the backend team’s, never on top of it (compose.sonar.yaml)', () => {
  it('pins every image to an exact version, SonarQube to the backend’s Community build', () => {
    const images = [...compose.matchAll(/^\s*image:\s*(\S+)/gm)].map((match) => match[1])

    expect(images).toEqual(['sonarqube:26.9.0.129388-community', 'postgres:18.6-alpine3.24'])
    expect(scan).toContain("image='sonarsource/sonar-scanner-cli:12.2.0.4256_8.1.0'")
    for (const image of [...images, 'sonarsource/sonar-scanner-cli:12.2.0.4256_8.1.0']) {
      expect(image).not.toMatch(/:(latest|lts|lts-community|community)$/)
    }
  })

  it('publishes only SonarQube, on loopback and port 9010 (the backend’s SonarQube has 9000)', () => {
    const published = [...compose.matchAll(/^\s*- '([^']*:\d+)'\s*$/gm)].map((match) => match[1])

    expect(published).toEqual(['127.0.0.1:${SONAR_PORT:-9010}:9000'])
    expect(compose.match(/^\s*ports:/gm)).toHaveLength(1)
  })

  it('has its own project, container and volume names, none of the backend’s', () => {
    const containers = [...compose.matchAll(/container_name:\s*(\S+)/g)].map((match) => match[1])

    expect(compose).toMatch(/^name: ecomdemo-web-sonar$/m)
    expect(containers).toEqual(['ecomdemo-web-sonarqube', 'ecomdemo-web-sonar-db'])
    // The backend team's: ecomdemo-sonarqube and ecomdemo-sonar-db (project `ecomdemo`); the E2E's backend: webstack-*.
    for (const name of containers) expect(name).toMatch(/^ecomdemo-web-/)
    expect(scan).toContain('ecomdemo-web-sonar_default')
  })

  it('waits for SonarQube to report UP, not for an open port', () => {
    expect(compose).toContain('/api/system/status')
    expect(compose).toContain('"status":"UP"')
  })
})

describe('the analysis covers the app’s own code, and only that (sonar-project.properties)', () => {
  it('analyses src/ under the project the setup script creates', () => {
    expect(properties.get('sonar.projectKey')).toBe('ecomdemo-web')
    expect(setup).toContain('PROJECT_KEY="${SONAR_PROJECT_KEY:-ecomdemo-web}"')
    expect(properties.get('sonar.sources')).toBe('src')
  })

  it('counts the tests as tests, never as sources to cover', () => {
    const tests = ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/test/**']

    expect(properties.get('sonar.tests')).toBe('src')
    expect(list('sonar.test.inclusions')).toEqual(tests)
    expect(list('sonar.exclusions')).toEqual(expect.arrayContaining(tests))
  })

  it('leaves the code generated from the backend’s OpenAPI documents out', () => {
    expect(list('sonar.exclusions')).toContain('src/api/generated/**')
  })

  it('imports the coverage Vitest writes, with the same file left out as vite.config.ts leaves out', () => {
    expect(properties.get('sonar.javascript.lcov.reportPaths')).toBe('coverage/lcov.info')
    expect(vite).toMatch(/reporter: \[[^\]]*'lcov'[^\]]*\]/)
    expect(list('sonar.coverage.exclusions')).toEqual(['src/main.tsx'])
    expect(vite).toContain("'src/main.tsx'")
  })

  it('type-checks with the app’s tsconfig and fails when the quality gate fails', () => {
    expect(properties.get('sonar.typescript.tsconfigPaths')).toBe('tsconfig.app.json')
    expect(properties.get('sonar.qualitygate.wait')).toBe('true')
  })

  it('`npm run sonar` runs the scanner script, with the repository mounted read-only', () => {
    expect(packageJson.scripts.sonar).toBe('bash scripts/sonar-scan.sh')
    expect(scan).toContain('-v "$PWD:/usr/src:ro"')
  })
})

describe('the quality gate is code, and judges new code (scripts/sonar-setup.sh)', () => {
  it('sets the backend’s six conditions, every one on new code, coverage at 80', () => {
    const conditions = [...setup.matchAll(/^\s*"(\w+)\|(LT|GT)\|(\d+)\|/gm)].map(([, metric, op, threshold]) => ({
      metric,
      op,
      threshold,
    }))

    expect(conditions).toEqual([
      { metric: 'new_coverage', op: 'LT', threshold: '80' },
      { metric: 'new_violations', op: 'GT', threshold: '0' },
      { metric: 'new_duplicated_lines_density', op: 'GT', threshold: '3' },
      { metric: 'new_security_hotspots_reviewed', op: 'LT', threshold: '100' },
      { metric: 'new_reliability_rating', op: 'GT', threshold: '1' },
      { metric: 'new_security_rating', op: 'GT', threshold: '1' },
    ])
    for (const { metric } of conditions) expect(metric).toMatch(/^new_/)
  })

  it('generates a token scoped to this one project', () => {
    expect(setup).toContain('"type=PROJECT_ANALYSIS_TOKEN" "projectKey=$PROJECT_KEY"')
  })
})

describe('no secret is in the repository', () => {
  it('takes the admin password and the token from the environment, and refuses to run without the password', () => {
    expect(setup).toContain('if [ -z "${SONAR_ADMIN_PASSWORD:-}" ]; then')
    expect(scan).toContain('if [ -z "${SONAR_TOKEN:-}" ]; then')
    // Passed through by name: `-e SONAR_TOKEN` on its own line, never `-e SONAR_TOKEN=<value>`.
    expect(scan).toMatch(/^\s*-e SONAR_TOKEN \\$/m)
  })

  it('assigns no password or token a value, except SonarQube’s public factory password that the script replaces', () => {
    for (const source of [compose, setup, scan, read('sonar-project.properties')]) {
      expect(source).not.toMatch(/sq[uap]_[0-9a-f]{20,}/) // the shape of a SonarQube token
      expect(source).not.toMatch(/sonar\.(token|login|password)\s*=/)
      expect(source).not.toMatch(/SONAR_(TOKEN|ADMIN_PASSWORD)=[^\s"'$]/)
    }
    expect([...setup.matchAll(/^\s*\w*PASSWORD\w*=(.*)$/gm)].map((match) => match[1])).toEqual(["'admin'"])
  })

  it('sends credentials to curl on its standard input, never on a command line other users can see in `ps`', () => {
    expect(setup).toContain('--config -')
    expect(setup).not.toMatch(/curl[^\n]*\s-u\s/)
  })
})
