import { useState } from 'react'
import { Button } from '../Button'
import './ErrorReference.css'

/**
 * "Reference: <id>" and a button that copies it. The reference sits on its own line (an unbreakable UUID after a label
 * overflows a 360 px screen) and breaks anywhere. When the browser will not copy (no clipboard, an insecure page), the
 * button says so and the text stays selectable.
 */
export function ErrorReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no')

  async function copy() {
    try {
      await navigator.clipboard.writeText(reference)
      setCopied('yes')
    } catch {
      setCopied('failed')
    }
  }

  return (
    <div className="error-reference">
      <p>
        Reference:
        <br />
        <code>{reference}</code>
      </p>
      <Button variant="secondary" size="sm" onClick={() => void copy()}>
        Copy reference
      </Button>
      {/* Always in the page, so the screen reader hears the change. */}
      <span className="error-reference-status" role="status">
        {copied === 'yes' ? 'Copied.' : copied === 'failed' ? 'Could not copy. Select the reference and copy it.' : ''}
      </span>
    </div>
  )
}
