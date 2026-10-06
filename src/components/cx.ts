/** Joins class names, skipping the falsy ones: `cx('ed-btn', big && 'ed-btn--lg')`. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
