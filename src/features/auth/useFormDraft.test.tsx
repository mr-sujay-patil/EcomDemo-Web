import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { useFormDraft } from './useFormDraft'
import { useSession } from './useSession'

function Notes({ draftKey, leaveOut = ['secret'] }: { draftKey: string; leaveOut?: string[] }) {
  const form = useForm({ defaultValues: { note: '', secret: '' } })
  const { clearDraft } = useFormDraft(form, draftKey, leaveOut)
  return (
    <form>
      <label>
        Note <input {...form.register('note')} />
      </label>
      <label>
        Secret <input {...form.register('secret')} />
      </label>
      <button type="button" onClick={clearDraft}>
        Done
      </button>
    </form>
  )
}

/** The form comes and goes (a page the app leaves and returns to); the provider, with its drafts, stays: as in the app. */
function Harness({ draftKey = 'notes' }: { draftKey?: string }) {
  const [shown, setShown] = useState(true)
  const { signOut } = useSession()
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShown((value) => !value)
        }}
      >
        Toggle
      </button>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
      {shown && <Notes draftKey={draftKey} />}
    </>
  )
}

const toggle = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Toggle' }))

describe('useFormDraft', () => {
  it('gives back what was typed when the form comes back', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />, { signedInAs: 'CUSTOMER' })
    await user.type(screen.getByLabelText('Note'), 'half a message')

    await toggle(user)
    expect(screen.queryByLabelText('Note')).not.toBeInTheDocument()
    await toggle(user)

    expect(screen.getByLabelText('Note')).toHaveValue('half a message')
  })

  it('never keeps the fields it is told to leave out', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />, { signedInAs: 'CUSTOMER' })
    await user.type(screen.getByLabelText('Note'), 'kept')
    await user.type(screen.getByLabelText('Secret'), 'not for keeping')

    await toggle(user)
    await toggle(user)

    expect(screen.getByLabelText('Note')).toHaveValue('kept')
    expect(screen.getByLabelText('Secret')).toHaveValue('')
  })

  it('is emptied by clearDraft, for after a successful submit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />, { signedInAs: 'CUSTOMER' })
    await user.type(screen.getByLabelText('Note'), 'sent')
    await user.click(screen.getByRole('button', { name: 'Done' }))

    await toggle(user)
    await toggle(user)

    expect(screen.getByLabelText('Note')).toHaveValue('')
  })

  it('is dropped by a deliberate sign-out: the next person at this browser must not find it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />, { signedInAs: 'CUSTOMER' })
    await user.type(screen.getByLabelText('Note'), 'private words')
    await toggle(user)

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await toggle(user)

    expect(screen.getByLabelText('Note')).toHaveValue('')
  })

  it('survives a session that ends on the person: expired or refused', async () => {
    const user = userEvent.setup()
    const { store } = renderWithProviders(<Harness />, { signedInAs: 'CUSTOMER' })
    await user.type(screen.getByLabelText('Note'), 'half a message')
    await toggle(user)

    act(() => {
      store.end('expired')
    })
    await toggle(user)

    expect(screen.getByLabelText('Note')).toHaveValue('half a message')
  })
})
