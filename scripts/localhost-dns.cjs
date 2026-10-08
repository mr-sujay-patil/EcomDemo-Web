// Preloaded by scripts/e2e-k8s.sh (NODE_OPTIONS=--require). Chromium resolves any *.localhost name to 127.0.0.1 itself, but
// Node (Playwright's `request` fixture, the global setup) asks the system resolver, and on a machine without `myhostname`
// in nsswitch (this WSL2) that fails for `shop.localhost`. This sends *.localhost to the loopback in Node, as RFC 6761
// says every resolver should, so no hosts-file edit (and no sudo) is needed.
const dns = require('node:dns')

const loopbackFor = (hostname) =>
  typeof hostname === 'string' && hostname.endsWith('.localhost') ? '127.0.0.1' : hostname

// `dns.lookup`: what Node's own http, net and fetch use.
const lookup = dns.lookup
dns.lookup = function lookupLocalhost(hostname, ...rest) {
  return lookup.call(this, loopbackFor(hostname), ...rest)
}

// `dns.promises.lookup`: what Playwright's request client uses (with `all: true` and one family at a time).
const promisesLookup = dns.promises.lookup
dns.promises.lookup = function lookupLocalhostAsync(hostname, ...rest) {
  return promisesLookup.call(this, loopbackFor(hostname), ...rest)
}
