import { z } from 'zod'

// Zod compiles each schema into a faster function with `new Function`, and first probes whether the browser allows that.
// Our Content-Security-Policy does not (`script-src 'self'`, no 'unsafe-eval'): the probe's throw is caught, but the browser
// still reports it as a violation. `jitless` skips the probe and the compile; checking a form or a response takes a few
// microseconds longer, which no screen can notice. Imported first in main.tsx, before any schema is built.
z.config({ jitless: true })
