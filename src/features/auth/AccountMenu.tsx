import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/Button'
import { firstName } from './session'
import { useSession } from './useSession'
import './auth.css'

/**
 * The signed-in person's menu in the header: their first name, then My orders, Account and Sign out. A disclosure
 * (a button that shows a list), not an ARIA menu: these are links, and links are announced as links. Escape or a
 * click outside closes it, Escape returns focus to the button, and following a link closes it.
 */
export function AccountMenu() {
  const { profile, signOut } = useSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Open on one page only: the page it was opened on. A new page closes it with no effect to do so.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event: PointerEvent) {
      if (root.current && event.target instanceof Node && !root.current.contains(event.target)) setOpenOn(null)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpenOn(null)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (profile === null) return null
  const name = firstName(profile)

  return (
    <div className="account-menu" ref={root}>
      <Button
        ref={button}
        variant="ghost"
        icon="user"
        aria-label={`Account: ${name}`}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpenOn(open ? null : pathname)
        }}
      >
        {name}
      </Button>
      {open && (
        <ul id={listId} className="account-menu-list">
          <li>
            <Link to="/orders">My orders</Link>
          </li>
          <li>
            <Link to="/account">Account</Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                // Home first, then sign out: ending the session on a guarded page would send the person to
                // the sign-in page, which is for a session that ended on them, not one they ended.
                void Promise.resolve(navigate('/')).then(signOut)
              }}
            >
              Sign out
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
