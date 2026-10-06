import type { ReactNode } from 'react'
import './StaffNote.css'

export type StaffNoteProps = {
  /** Words a real person wrote. Never generated (CLAUDE.md rule 11). */
  children: ReactNode
  name: string
  role?: string
  /** Shown as written, for example "12 Sep 2026". */
  date?: string
  initials?: string
}

/** Signed and dated, so a reader can tell a person wrote it. */
export function StaffNote({ children, name, role, date, initials }: StaffNoteProps) {
  const shown =
    initials ??
    name
      .split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
  return (
    <figure className="ed-note">
      <blockquote className="ed-note-text">{children}</blockquote>
      <figcaption className="ed-note-by">
        <span className="ed-note-initials" aria-hidden>
          {shown}
        </span>
        <span>
          <span className="ed-note-name">{name}</span>
          {role ? <span className="ed-caption">{role}</span> : null}
        </span>
        {date ? <time className="ed-note-date">{date}</time> : null}
      </figcaption>
    </figure>
  )
}
