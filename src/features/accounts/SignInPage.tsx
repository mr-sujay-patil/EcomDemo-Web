import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router'
import { ApiError, supportReference } from '@/api/errors'
import { Alert } from '@/components/Alert'
import { Field, Form, FormError, SubmitButton } from '@/components/forms'
import { safeNext } from '@/features/auth/nextPath'
import type { EndReason } from '@/features/auth/session'
import { useSession } from '@/features/auth/useSession'
import { loginSchema, type LoginValues } from './schemas'
import { registeredUsername } from './signInState'
import { formatWait, useCountdown } from './wait'
import './accounts.css'

/** Why the person is here again, when the session ended on them rather than the other way round. */
const ENDED: Record<EndReason, string | null> = {
  'signed-out': null,
  expired: 'Your session ended, so we signed you out. Sign in to carry on where you were.',
  rejected: 'The shop no longer accepts your sign-in, so we signed you out. Sign in to carry on.',
}

export function SignInPage() {
  const location = useLocation()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const registered = registeredUsername(location.state)
  const { session, endedBy, signIn } = useSession()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { username: registered ?? '', password: '' },
  })
  const [formError, setFormError] = useState<{ message: string; reference: string | null } | null>(null)
  // A throttled login (429) waits: the seconds left, and whether the wait has run out.
  const wait = useCountdown()
  const waiting = wait.secondsLeft

  // Arriving from registration the name is filled in: the next thing to type is the password.
  const { setFocus } = form
  useEffect(() => {
    if (registered) setFocus('password')
  }, [registered, setFocus])

  async function onSubmit(values: LoginValues) {
    if (waiting > 0) return
    setFormError(null)
    wait.reset()
    try {
      await signIn(values)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // The same words for a wrong password and an unknown username, on purpose (no account probing).
        setFormError({ message: 'Wrong username or password.', reference: null })
      } else if (error instanceof ApiError && error.status === 429) {
        // Throttled: wait out what the server says, never retry by itself. Without a `Retry-After` it is the
        // gateway's general limit, and a second is enough.
        wait.start(error.retryAfter ?? 1)
        setFormError({
          message:
            error.retryAfter === undefined
              ? 'The server is busy. Try again in a moment.'
              : 'Too many sign-in attempts.',
          reference: null,
        })
      } else {
        setFormError({
          message: error instanceof ApiError ? error.message : 'Something went wrong. Try again in a moment.',
          reference: supportReference(error),
        })
      }
    }
  }

  // Signed in (here just now, or already): on to where they were going.
  if (session) return <Navigate to={next} replace />

  const endedNote = endedBy ? ENDED[endedBy] : null
  return (
    <div className="auth">
      <h1>Sign in</h1>
      {registered && <Alert tone="success" title="Your account is ready. Sign in to start." />}
      {endedNote && <Alert tone="info" title={endedNote} />}
      {/* When the wait runs out the error goes with it: it was about the wait. */}
      <FormError reference={formError?.reference}>{wait.over ? null : formError?.message}</FormError>
      <Form form={form} onSubmit={onSubmit} aria-label="Sign in">
        <Field name="username" label="Username" autoComplete="username" autoCapitalize="none" spellCheck={false} />
        <Field name="password" label="Password" type="password" revealable autoComplete="current-password" />
        <SubmitButton disabled={waiting > 0}>
          {waiting > 0 ? `Try again in ${formatWait(waiting)}` : 'Sign in'}
        </SubmitButton>
      </Form>
      {wait.over && (
        <p className="visually-hidden" role="status">
          You can try again now.
        </p>
      )}
      <p className="ed-caption">You stay signed in while you shop, until your session ends or you reload the page.</p>
      <p className="auth-switch">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  )
}
