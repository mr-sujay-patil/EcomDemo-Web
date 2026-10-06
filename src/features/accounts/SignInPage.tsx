import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router'
import { ApiError, supportReference } from '@/api/errors'
import { Alert } from '@/components/Alert'
import { buttonClass } from '@/components/Button'
import { Field, Form, FormError, SubmitButton } from '@/components/forms'
import { checkCredentials } from './api'
import { loginSchema, type LoginValues } from './schemas'
import { registeredUsername } from './signInState'
import './accounts.css'

export function SignInPage() {
  const registered = registeredUsername(useLocation().state)
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { username: registered ?? '', password: '' },
  })
  const [formError, setFormError] = useState<{ message: string; reference: string | null } | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const login = useMutation({ mutationFn: (values: LoginValues) => checkCredentials(values) })

  // Arriving from registration the name is filled in: the next thing to type is the password.
  const { setFocus } = form
  useEffect(() => {
    if (registered) setFocus('password')
  }, [registered, setFocus])

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      await login.mutateAsync(values)
    } catch (error) {
      // 401 reads the same for a wrong password and an unknown username, on purpose (no account probing).
      if (error instanceof ApiError && error.status === 401) {
        setFormError({ message: 'Wrong username or password.', reference: null })
        return
      }
      // Anything else (a throttled login, the server down) says what the server said. The countdown for a
      // throttled login is Phase 11.
      setFormError({
        message: error instanceof ApiError ? error.message : 'Something went wrong. Try again in a moment.',
        reference: supportReference(error),
      })
      return
    }
    setSignedIn(true)
  }

  if (signedIn) {
    return (
      <div className="auth">
        <h1>Sign in</h1>
        {/* Phase 11 keeps the session and removes this note. */}
        <Alert tone="success" title="Signed in. Sessions arrive in the next phase." />
        <Link to="/" className={buttonClass({ variant: 'secondary' })}>
          <span>Back to the shelf</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="auth">
      <h1>Sign in</h1>
      {registered && <Alert tone="success" title="Your account is ready. Sign in to start." />}
      <FormError reference={formError?.reference}>{formError?.message}</FormError>
      <Form form={form} onSubmit={onSubmit} aria-label="Sign in">
        <Field name="username" label="Username" autoComplete="username" autoCapitalize="none" spellCheck={false} />
        <Field name="password" label="Password" type="password" revealable autoComplete="current-password" />
        <SubmitButton>Sign in</SubmitButton>
      </Form>
      <p className="auth-switch">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  )
}
