import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The shop in the backend's kind cluster is HTTPS end to end (web KI-034, KI-035). The cluster itself cannot run in CI, so
// these read the manifests and scripts it is deployed with; `npm run e2e:k8s` is the proof on a running cluster, and
// scripts/test-nginx-upstream-tls.sh proves nginx verifies the gateway's certificate.
// Paths are from the repository root, where Vitest runs (as scripts/openapi.test.ts reads api/openapi/).
const read = (path: string) => readFileSync(path, 'utf8')

describe('the shop in the cluster is served over HTTPS (KI-034)', () => {
  it('the Ingress terminates TLS for shop.localhost with the backend edge certificate', () => {
    const ingress = read('k8s/ingress.yaml')

    expect(ingress).toMatch(/tls:\s*\n\s*- hosts: \[shop\.localhost\]\s*\n\s*secretName: ecomdemo-tls/)
  })

  it.each(['scripts/k8s-up.sh', 'scripts/e2e-k8s.sh', 'e2e/k8s.spec.ts'])(
    '%s uses the HTTPS port, not the plain one that only redirects',
    (path) => {
      const source = read(path)

      expect(source).toContain(':18443')
      // 18080 may appear only where the spec checks that it redirects to 18443.
      const plainPort = source.split('\n').filter((line) => line.includes(':18080') && !/redirect/i.test(line))
      expect(plainPort).toEqual([])
    },
  )

  it('Node and Chromium trust the cluster, through its CA and the served key, never by ignoring certificate errors', () => {
    const script = read('scripts/e2e-k8s.sh')
    const config = read('playwright.config.ts')

    expect(script).toContain('NODE_EXTRA_CA_CERTS=')
    expect(script).toContain('E2E_K8S_SPKI=')
    expect(config).toContain('--ignore-certificate-errors-spki-list=')
    expect(config).not.toMatch(/ignoreHTTPSErrors:\s*true/)
  })
})

describe("the shop's nginx reaches the gateway over verified HTTPS in the cluster (KI-035)", () => {
  it('the ConfigMap names the gateway by https and the CA file nginx checks it against', () => {
    const configMap = read('k8s/configmap.yaml')

    expect(configMap).toMatch(/API_UPSTREAM: 'https:\/\/gateway-service\.ecomdemo\.svc\.cluster\.local:8080'/)
    expect(configMap).toMatch(/API_CA_FILE: '\/etc\/ecomdemo-ca\/tls\.ca'/)
  })

  it("the CA file is the backend's public CA Secret, mounted read-only where the ConfigMap says", () => {
    const deployment = read('k8s/deployment.yaml')

    expect(deployment).toMatch(/- name: cluster-ca\s*\n\s*mountPath: \/etc\/ecomdemo-ca\s*\n\s*readOnly: true/)
    expect(deployment).toMatch(/- name: cluster-ca\s*\n\s*secret:\s*\n\s*secretName: ecomdemo-ca-public/)
  })

  it('nginx verifies the upstream certificate and its name, with the file API_CA_FILE names', () => {
    const template = read('nginx/default.conf.template')

    expect(template).toContain('proxy_ssl_verify on;')
    expect(template).toContain('proxy_ssl_trusted_certificate ${API_CA_FILE};')
    expect(template).toContain('proxy_ssl_server_name on;')
  })

  it('the image has a default CA file, so compose (plain HTTP upstream) needs no new setting', () => {
    expect(read('Dockerfile')).toMatch(/ENV API_CA_FILE=\/etc\/ssl\/certs\/ca-certificates\.crt/)
  })
})
