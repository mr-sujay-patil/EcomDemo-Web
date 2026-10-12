import { z } from 'zod'

// Zod compiles each schema into a faster function with `new Function`, and first probes whether the browser allows that.
// Our Content-Security-Policy does not (`script-src 'self'`, no 'unsafe-eval'): the probe's throw is caught, but the browser
// still reports it as a violation. `jitless` skips the probe and the compile; checking a form or a response takes a few
// microseconds longer, which no screen can notice. Imported first by every module that builds a schema (the forms' schemas.ts),
// not by main.tsx: that put zod in the shelf's entry, which has no form (web KI-042).
z.config({ jitless: true })
