import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { ApiError, supportReference } from '@/api/errors'
import { applyServerErrors, Field, Form, FormError, SubmitButton } from '@/components/forms'
import { registerCustomer } from './api'
import { registerLabels, registerSchema, type RegisterValues } from './schemas'
import { signInStateFor } from './signInState'
import './accounts.css'

export function RegisterPage() {
  const navigate = useNavigate()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    // Say nothing until the person leaves a field, then keep it up to date as they fix it.
    mode: 'onTouched',
    defaultValues: { username: '', password: '', fullName: '' },
  })
  const [formError, setFormError] = useState<{ message: string; reference: string | null } | null>(null)
  // A mutation, not a bare call: one pending state, and it is never retried (a lost reply is not a failed create).
  const register = useMutation({ mutationFn: (values: RegisterValues) => registerCustomer(values) })

  async function onSubmit(values: RegisterValues) {
    setFormError(null)
    try {
      await register.mutateAsync(values)
    } catch (error) {
      // 409: the username is taken. It is about one field, so it goes on that field.
      if (error instanceof ApiError && error.status === 409) {
        form.setError('username', { type: 'server', message: error.message }, { shouldFocus: true })
        return
      }
      const left = applyServerErrors(form, error, registerLabels)
      if (left) setFormError({ message: left, reference: supportReference(error) })
      return
    }
    // Registration does not sign anyone in: go to sign-in, which has the name ready and says so.
    void navigate('/sign-in', { state: signInStateFor(values.username) })
  }

  return (
    <div className="auth">
      <h1>Create an account</h1>
      <p className="ed-caption">An account keeps your cart and your orders in one place.</p>
      <FormError reference={formError?.reference}>{formError?.message}</FormError>
      <Form form={form} onSubmit={onSubmit} aria-label="Create an account">
        <Field
          name="username"
          label="Username"
          hint="3 to 50 characters: letters, digits, dots, underscores and hyphens."
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
        />
        <Field
          name="password"
          label="Password"
          type="password"
          revealable
          hint="At least 8 characters. Length counts for more than symbols."
          autoComplete="new-password"
        />
        <Field name="fullName" label="Full name" hint="As you want it shown on your account." autoComplete="name" />
        <SubmitButton>Create account</SubmitButton>
      </Form>
      <p className="auth-switch">
        Already have an account? <Link to="/sign-in">Sign in</Link>
      </p>
    </div>
  )
}
