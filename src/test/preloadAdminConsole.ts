/**
 * Loads the admin console's code before a test renders it. `/admin/*` is a lazy route (src/app/router.tsx): the first render of
 * it fetches and transforms `AdminPage` and the six pages it imports, which is ~300 ms on an idle machine and several seconds on
 * a busy one, and a `findBy` query waits only 1 s. Done in a `beforeAll` (10 s allowed) the cost is outside every assertion's
 * clock, so the first admin test of a file no longer fails when the machine is loaded (web KI-029). The module is cached after
 * the first import, so later calls cost nothing.
 */
export const preloadAdminConsole = () => import('@/features/admin/AdminPage')
