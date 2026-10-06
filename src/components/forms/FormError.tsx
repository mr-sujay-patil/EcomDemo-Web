import { Alert } from '../Alert'

export type FormErrorProps = {
  /** What went wrong with the form as a whole, in a sentence. Nothing is drawn without it. */
  children?: string | null
  /** The id support can look up (`supportReference`): only for a server or network failure. */
  reference?: string | null
}

/** An error that belongs to no single field: wrong credentials, the server being down. Announced at once. */
export function FormError({ children, reference }: FormErrorProps) {
  if (!children) return null
  return (
    <Alert tone="danger" title={children}>
      {reference ? (
        // On its own line: an unbreakable id after the label overflows a 360 px screen.
        <p>
          Reference for support:
          <br />
          <code>{reference}</code>
        </p>
      ) : null}
    </Alert>
  )
}
