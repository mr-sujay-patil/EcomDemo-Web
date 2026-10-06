import { Link } from 'react-router'
import { usePageTitle } from '@/app/pageTitle'
import { buttonClass } from '@/components/Button'

/**
 * A 403 in words: the identity is fine, the account just may not open this page. Never a sign-in prompt
 * (signing in again would change nothing), and shown in place, so the address still says where they tried to go.
 */
export function NotPermittedPage() {
  usePageTitle('Not permitted')
  return (
    <div className="stack">
      <h1>Not permitted</h1>
      <p>Your account cannot open this page.</p>
      <Link to="/" className={buttonClass({ variant: 'secondary' })}>
        <span>Back to the shelf</span>
      </Link>
    </div>
  )
}
