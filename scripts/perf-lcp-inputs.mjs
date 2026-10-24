// What a Lighthouse run's simulated LCP is built from (web KI-042, KI-043). Lighthouse loads the page once at full speed, then
// simulates the slow phone; for LCP it replays every request that ended before the OBSERVED LCP on the slow link, so those requests
// decide the number. The report prints them for each page's first run, because CI's numbers cannot be reproduced on another
// machine (CI measures after the whole e2e suite, against the live backend) and its raw runs are only in an artifact.
//
// Times are in ms: the observed paints from navigation start, the requests' ends from the first request (Lighthouse's
// `network-requests` audit), which starts a few ms later, so a request that ends right at the LCP may land on either side.

const DATA_TYPES = new Set(['Fetch', 'XHR', 'Image'])

export function lcpInputs(run) {
  const observed = run.audits.metrics.details.items[0]
  const lcp = observed.observedLargestContentfulPaint
  const requests = run.audits['network-requests']?.details?.items ?? []
  const before = requests.filter((request) => Number.isFinite(request.networkEndTime) && request.networkEndTime <= lcp)

  const types = new Map()
  for (const request of before) {
    const type = types.get(request.resourceType) ?? { type: request.resourceType, count: 0, bytes: 0 }
    type.count += 1
    type.bytes += request.transferSize ?? 0
    types.set(request.resourceType, type)
  }

  return {
    fcp: observed.observedFirstContentfulPaint,
    lcp,
    before: before.length,
    total: requests.length,
    byType: [...types.values()].sort((a, b) => b.bytes - a.bytes),
    data: before
      .filter((request) => DATA_TYPES.has(request.resourceType))
      .map((request) => {
        const url = new URL(request.url)
        return `${url.pathname}${url.search}`
      }),
    domElements: run.audits['dom-size']?.numericValue,
  }
}

export function describeLcpInputs(path, inputs) {
  const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`
  const types = inputs.byType.map((type) => `${type.type} ${type.count} (${kb(type.bytes)})`).join(', ')
  return (
    `- ${path}: observed FCP ${Math.round(inputs.fcp)} ms, LCP ${Math.round(inputs.lcp)} ms (+${Math.round(inputs.lcp - inputs.fcp)} ms); ` +
    `${inputs.before} of ${inputs.total} requests ended before the observed LCP: ${types}; ` +
    `data and photos among them: ${inputs.data.length > 0 ? inputs.data.join(', ') : 'none'}; ` +
    `DOM ${inputs.domElements ?? '?'} elements`
  )
}
