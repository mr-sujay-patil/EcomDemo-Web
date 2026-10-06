import { Link } from 'react-router'
import { buttonClass } from '@/components/Button'

export function NotFoundPage() {
  return (
    <div className="stack">
      <h1>Page not found</h1>
      <p>There is nothing at this address.</p>
      <Link to="/" className={buttonClass({ variant: 'secondary' })}>
        <span>Back to the products</span>
      </Link>
    </div>
  )
}
