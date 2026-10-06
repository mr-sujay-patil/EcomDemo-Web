import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import { Field, Form } from '.'
import { applyServerErrors } from './serverErrors'

const labels = { username: 'Username', password: 'Password', fullName: 'Full name' }
const apiError = (status: number, message: string) => new ApiError({ status, message, correlationId: 'ref-1' })

/** Three real fields and a button that hands the form an error, as a page does after a failed request. */
function Harness({ error }: { error: unknown }) {
  const form = useForm({ defaultValues: { username: '', password: '', fullName: '' } })
  const [left, setLeft] = useState<string | null | undefined>(undefined)
  return (
    <Form
      form={form}
      onSubmit={() => {
        setLeft(applyServerErrors(form, error, labels))
      }}
      aria-label="Sample"
    >
      <Field name="username" label="Username" />
      <Field name="password" label="Password" />
      <Field name="fullName" label="Full name" />
      <button type="submit">Apply</button>
      <output>{left === undefined ? 'not run' : left === null ? 'nothing left' : `left: ${left}`}</output>
    </Form>
  )
}

async function apply(error: unknown) {
  const user = userEvent.setup()
  render(<Harness error={error} />)
  await user.click(screen.getByRole('button', { name: 'Apply' }))
  await screen.findByRole('status')
}

describe('applyServerErrors', () => {
  it('puts each rejected field of a 400 on its own field, in the field’s label, and nothing is left over', async () => {
    await apply(
      apiError(
        400,
        'fullName must not be blank; password must be between 8 and 72 characters; username may contain only letters, digits, dots, underscores and hyphens',
      ),
    )

    expect(screen.getByLabelText('Full name')).toHaveAccessibleDescription('Full name must not be blank')
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Password must be between 8 and 72 characters',
    )
    expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(
      'Username may contain only letters, digits, dots, underscores and hyphens',
    )
    expect(screen.getByLabelText('Username')).toBeInvalid()
    expect(screen.getByRole('status')).toHaveTextContent('nothing left')
  })

  it('keeps two rejections of one field together', async () => {
    await apply(apiError(400, 'username must be between 3 and 50 characters; username may contain only letters'))

    expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(
      'Username must be between 3 and 50 characters; username may contain only letters',
    )
  })

  it('focuses the first rejected field only', async () => {
    await apply(apiError(400, 'password must not be blank; username must not be blank'))

    // The message lists password first; the form lists username first, and the form's order wins.
    expect(screen.getByLabelText('Username')).toHaveFocus()
    expect(screen.getByLabelText('Password')).not.toHaveFocus()
  })

  it('returns what names no field, for the form as a whole', async () => {
    await apply(apiError(400, 'something else is wrong; username must not be blank'))

    expect(screen.getByRole('status')).toHaveTextContent('left: something else is wrong')
    expect(screen.getByLabelText('Username')).toBeInvalid()
  })

  it.each([401, 409, 429, 500, 503])('returns the server’s message for a %s and touches no field', async (status) => {
    await apply(apiError(status, 'The server says no.'))

    expect(screen.getByRole('status')).toHaveTextContent('left: The server says no.')
    expect(screen.getByLabelText('Username')).toBeValid()
    expect(screen.getByLabelText('Password')).toBeValid()
  })

  it('has a sentence for a failure that is not an ApiError', async () => {
    await apply(new Error('boom'))

    expect(screen.getByRole('status')).toHaveTextContent('left: Something went wrong. Try again in a moment.')
  })
})
