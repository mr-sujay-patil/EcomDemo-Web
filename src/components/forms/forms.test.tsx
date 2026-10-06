import { zodResolver } from '@hookform/resolvers/zod'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { Field, Form, FormError, SubmitButton } from '.'

const schema = z.object({
  name: z.string().min(1, 'Enter your name.'),
  email: z.string().min(1, 'Enter your email.').max(10, 'Use at most 10 characters.'),
  secret: z.string().min(3, 'Use at least 3 characters.'),
})
type Values = z.infer<typeof schema>

function Sample({ onSubmit = vi.fn() }: { onSubmit?: (values: Values) => void | Promise<void> }) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', secret: '' },
  })
  return (
    <Form form={form} onSubmit={onSubmit} aria-label="Sample">
      <Field name="name" label="Name" hint="As on your card." autoComplete="name" />
      <Field name="email" label="Email" />
      <Field name="secret" label="Secret" type="password" revealable />
      <SubmitButton>Send</SubmitButton>
    </Form>
  )
}

describe('Form and Field', () => {
  it('is a form with a name, and labels each field', () => {
    render(<Sample />)

    expect(screen.getByRole('form', { name: 'Sample' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAttribute('autocomplete', 'name')
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('As on your card.')
  })

  it('says nothing while a field is untouched, then validates when the person leaves it', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    const name = screen.getByLabelText('Name')

    await user.click(name)
    expect(screen.queryByText('Enter your name.')).not.toBeInTheDocument()
    await user.tab()

    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()
    expect(name).toBeInvalid()
    expect(name).toHaveAccessibleDescription('Enter your name.')
  })

  it('then validates on every change, so the message goes away as soon as it is fixed', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    const name = screen.getByLabelText('Name')
    await user.click(name)
    await user.tab()
    await screen.findByText('Enter your name.')

    await user.type(name, 'A')

    await waitFor(() => {
      expect(screen.queryByText('Enter your name.')).not.toBeInTheDocument()
    })
    expect(name).toBeValid()
  })

  it('does not submit invalid values, and focuses the first invalid field', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Sample onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Email'), 'a@b.c')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Name')).toHaveFocus()
    expect(screen.getByText('Use at least 3 characters.')).toBeInTheDocument()
  })

  it('submits the values when they are valid', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Sample onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Name'), 'Test Person')
    await user.type(screen.getByLabelText('Email'), 'a@b.c')
    await user.type(screen.getByLabelText('Secret'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Test Person', email: 'a@b.c', secret: 'abc' }, expect.anything())
    })
  })

  it('shows a spinner and disables the button while the submit runs, and ignores a second submit', async () => {
    const user = userEvent.setup()
    let finish: () => void = () => undefined
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    render(<Sample onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Name'), 'Test Person')
    await user.type(screen.getByLabelText('Email'), 'a@b.c')
    await user.type(screen.getByLabelText('Secret'), 'abc')

    await user.click(screen.getByRole('button', { name: 'Send' }))
    // Enter in a field submits the form without the button: that must not send a second request either.
    await user.type(screen.getByLabelText('Email'), '{Enter}')

    expect(await screen.findByRole('button', { name: 'Send' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('aria-busy', 'true')
    expect(onSubmit).toHaveBeenCalledTimes(1)

    finish()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
    })
  })

  it('lets the person submit again after a submit has finished', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Sample onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Name'), 'Test Person')
    await user.type(screen.getByLabelText('Email'), 'a@b.c')
    await user.type(screen.getByLabelText('Secret'), 'abc')

    await user.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(2)
    })
  })

  it('has a Show/Hide button on a revealable password that switches the input type', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    const secret = screen.getByLabelText('Secret')
    expect(secret).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show secret' }))
    expect(secret).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Hide secret' }))
    expect(secret).toHaveAttribute('type', 'password')
  })

  it('does not submit the form when Show is pressed', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Sample onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Show secret' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('FormError', () => {
  it('announces the problem at once, as an alert', () => {
    render(<FormError>Wrong username or password.</FormError>)

    expect(screen.getByRole('alert')).toHaveTextContent('Wrong username or password.')
  })

  it('shows the reference for support on its own line when it has one', () => {
    render(<FormError reference="ref-1234">We could not reach the server.</FormError>)

    expect(screen.getByRole('alert')).toHaveTextContent('ref-1234')
    expect(screen.getByText('ref-1234').tagName).toBe('CODE')
  })

  it.each([undefined, null, ''])('draws nothing for %s', (message) => {
    const { container } = render(<FormError>{message}</FormError>)

    expect(container).toBeEmptyDOMElement()
  })
})
