import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supportReference } from '@/api/errors'
import { usePageTitle } from '@/app/pageTitle'
import { Alert } from '@/components/Alert'
import { ErrorPanel } from '@/components/ErrorPanel'
import { applyServerErrors, Field, Form, FormError, SubmitButton } from '@/components/forms'
import { useSession } from '@/features/auth/useSession'
import { fetchMe, updateMe, type CustomerResponse } from './api'
import { profileSchema, type ProfileValues } from './schemas'
import './accounts.css'

/** Not under `'catalog'`, so the session drops it when it ends. */
export const profileKey = ['account', 'me'] as const

const since = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' })
const memberSince = (iso: string | undefined) =>
  iso && !Number.isNaN(Date.parse(iso)) ? since.format(new Date(iso)) : undefined

export function ProfilePage() {
  usePageTitle('Your account')
  const me = useQuery({ queryKey: profileKey, queryFn: ({ signal }) => fetchMe(signal) })

  return (
    <div className="profile">
      <h1>Your account</h1>
      {me.isError ? <ErrorPanel error={me.error} onRetry={() => void me.refetch()} /> : null}
      {me.isPending ? <p role="status">Loading your account…</p> : null}
      {me.data ? <Profile profile={me.data} /> : null}
    </div>
  )
}

function Profile({ profile }: { profile: CustomerResponse }) {
  const { updateProfile } = useSession()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: { fullName: profile.fullName ?? '' },
  })
  const [formError, setFormError] = useState<{ message: string; reference: string | null } | null>(null)
  const [saved, setSaved] = useState(false)
  // A mutation: one pending state, and a lost reply is shown as an error, never silently repeated.
  const save = useMutation({ mutationFn: (values: ProfileValues) => updateMe(values) })
  const joined = memberSince(profile.createdAt)

  async function onSubmit(values: ProfileValues) {
    setFormError(null)
    setSaved(false)
    try {
      const updated = await save.mutateAsync(values)
      // The header says "Hi, <first name>": it follows the server's answer, not the typed value.
      updateProfile(updated)
      form.reset({ fullName: updated.fullName ?? '' })
      setSaved(true)
    } catch (error) {
      const left = applyServerErrors(form, error, { fullName: 'Full name' })
      if (left) setFormError({ message: left, reference: supportReference(error) })
    }
  }

  return (
    <>
      <dl className="profile-facts">
        <div>
          <dt className="ed-caption">Username</dt>
          <dd>{profile.username}</dd>
        </div>
        {joined ? (
          <div>
            <dt className="ed-caption">Member since</dt>
            <dd>{joined}</dd>
          </div>
        ) : null}
      </dl>
      {saved ? (
        <Alert tone="success" title="Saved">
          Your name is updated.
        </Alert>
      ) : null}
      <FormError reference={formError?.reference}>{formError?.message}</FormError>
      <Form form={form} onSubmit={onSubmit} aria-label="Your details">
        <Field name="fullName" label="Full name" hint="As you want it shown on your account." autoComplete="name" />
        <SubmitButton>Save name</SubmitButton>
      </Form>
      <p className="ed-caption">
        There is no way to change your password here yet: the shop&apos;s server does not offer it. Your username cannot
        be changed either.
      </p>
    </>
  )
}
