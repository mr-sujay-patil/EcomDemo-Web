import { execFileSync } from 'node:child_process'
import type { APIRequestContext } from '@playwright/test'
import { expect, test } from './fixtures'

// The shop in the backend's kind cluster (`npm run e2e:k8s`). Registered only when E2E_K8S is set, so no `test.skip`.
// Tagged @disruptive: these tests delete and replace pods, so they run alone, after the main suite (scripts/e2e-k8s.sh).
if (process.env.E2E_K8S) {
  const selector = 'app.kubernetes.io/name=ecomdemo-web'
  const kubectl = (...args: string[]) =>
    execFileSync('kubectl', ['--context', 'kind-ecomdemo', '-n', 'ecomdemo', ...args], { encoding: 'utf8' }).trim()

  const readyPods = () =>
    kubectl(
      'get',
      'pods',
      '-l',
      selector,
      '-o',
      'jsonpath={range .items[*]}{.metadata.name}{" "}{.status.containerStatuses[0].ready}{" "}{.metadata.deletionTimestamp}{"\\n"}{end}',
    )
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => line.split(' '))
      // name, ready, deletionTimestamp: a pod being deleted is not counted.
      .filter(([, ready, deleting]) => ready === 'true' && !deleting)
      .map(([name]) => name ?? '')

  /**
   * Three steady streams, one per kind of thing the shop serves (a page, a deep link, an API call), each asking again 100 ms
   * after its last answer. Resolves, once `stop` has resolved, with how many requests were sent and every answer that was not 200.
   */
  async function trafficUntil(request: APIRequestContext, stop: Promise<void>) {
    const failures: string[] = []
    let sent = 0
    let finished = false
    void stop.then(() => {
      finished = true
    })
    const stream = async (path: string) => {
      while (!finished) {
        sent += 1
        try {
          const response = await request.get(path)
          if (response.status() !== 200) failures.push(`${path} answered ${response.status()}`)
        } catch (error) {
          failures.push(`${path} failed: ${error instanceof Error ? error.message : String(error)}`)
        }
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
    await Promise.all(['/', '/products/1', '/api/products/1'].map(stream))
    return { sent, failures }
  }

  test.describe('the shop in the cluster @disruptive', () => {
    test.describe.configure({ mode: 'serial' })

    test('two replicas serve, behind the shop.localhost Ingress, and nothing else changes for localhost', async ({
      request,
    }) => {
      expect(readyPods(), 'two ready pods').toHaveLength(2)

      expect((await request.get('/healthz')).status()).toBe(200)
      // The backend's own front door, `localhost:18080`, still goes to the gateway and not to the shop.
      const backend = await request.get('http://localhost:18080/api/products/1')
      expect(backend.status()).toBe(200)
      expect((await backend.text()).includes('<div id="root">')).toBe(false)
    })

    test('deleting one pod loses no request, and the Deployment brings it back', async ({ request }) => {
      const [victim] = readyPods()
      expect(victim, 'a pod to delete').toBeTruthy()
      let done!: () => void
      const stop = new Promise<void>((resolve) => {
        done = resolve
      })
      const traffic = trafficUntil(request, stop)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      kubectl('delete', 'pod', victim ?? '', '--wait=true')
      // Two ready pods again, with the replacement among them.
      await expect.poll(() => readyPods().length, { timeout: 90_000 }).toBe(2)
      await new Promise((resolve) => setTimeout(resolve, 2000))
      done()
      const { sent, failures } = await traffic

      expect(sent, 'traffic ran the whole time').toBeGreaterThan(50)
      expect(failures, 'no failed request while the pod went and came back').toEqual([])
      expect(readyPods()).not.toContain(victim)
    })

    test('a rolling update loses no request', async ({ request }) => {
      const before = readyPods()
      let done!: () => void
      const stop = new Promise<void>((resolve) => {
        done = resolve
      })
      const traffic = trafficUntil(request, stop)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      kubectl('rollout', 'restart', 'deployment/ecomdemo-web')
      kubectl('rollout', 'status', 'deployment/ecomdemo-web', '--timeout=120s')
      await new Promise((resolve) => setTimeout(resolve, 2000))
      done()
      const { sent, failures } = await traffic

      expect(sent, 'traffic ran the whole time').toBeGreaterThan(50)
      expect(failures, 'no failed request during the rolling update').toEqual([])
      const after = readyPods()
      expect(after).toHaveLength(2)
      expect(
        after.filter((name) => before.includes(name)),
        'every pod was replaced',
      ).toEqual([])
    })
  })
}
