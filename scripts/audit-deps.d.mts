export function checkAudit(
  report: unknown,
  allowlist: unknown,
  today: string,
): { failures: string[]; accepted: string[] }
