import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const submitContactMock = vi.fn()
const turnstileSuccessHandlers: Array<(token: string) => void> = []
const firstSubmissionId = '11111111-1111-4111-8111-111111111111'
const secondSubmissionId = '22222222-2222-4222-8222-222222222222'

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }) => {
    if (onSuccess) turnstileSuccessHandlers.push(onSuccess)
    return <div data-testid="turnstile" />
  },
}))

vi.mock('@/app/[locale]/actions/contact', () => ({
  submitContact: submitContactMock,
}))

const labels = {
  name: 'Name',
  email: 'Email',
  company: 'Company',
  message: 'Message',
  submit: 'Send message',
  sending: 'Sending…',
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ari' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ari@example.com' } })
  fireEvent.change(screen.getByLabelText('Message'), {
    target: { value: 'Please help with company setup.' },
  })
}

describe('ContactFormWired', () => {
  let randomUUIDMock: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    submitContactMock.mockReset()
    turnstileSuccessHandlers.length = 0
    randomUUIDMock = vi
      .spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce(firstSubmissionId)
      .mockReturnValueOnce(secondSubmissionId)
  })

  afterEach(() => {
    randomUUIDMock.mockRestore()
    cleanup()
  })

  it('reuses submissionId after a rejected attempt and rotates only after acceptance', async () => {
    submitContactMock.mockResolvedValueOnce({ ok: false, code: 'persistence' })
    submitContactMock.mockResolvedValueOnce({ ok: true })
    const { ContactFormWired } = await import('./ContactFormWired')

    render(
      <ContactFormWired
        labels={labels}
        locale="en"
        successMessage="Thanks. We'll reply within 1 business day."
      />,
    )

    expect(randomUUIDMock).not.toHaveBeenCalled()
    turnstileSuccessHandlers.at(-1)?.('first-token')
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    await screen.findByRole('alert')
    expect(submitContactMock.mock.calls[0]?.[0].get('submissionId')).toBe(firstSubmissionId)
    expect(randomUUIDMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    await screen.findByRole('status')
    expect(submitContactMock.mock.calls[1]?.[0].get('submissionId')).toBe(firstSubmissionId)
    expect(randomUUIDMock).toHaveBeenCalledTimes(2)
    expect(randomUUIDMock.mock.results[1]?.value).toBe(secondSubmissionId)
  })

  it('reuses submissionId after the action throws', async () => {
    submitContactMock.mockRejectedValueOnce(new Error('network unavailable'))
    submitContactMock.mockResolvedValueOnce({ ok: false, code: 'temporarily-unavailable' })
    const { ContactFormWired } = await import('./ContactFormWired')

    render(
      <ContactFormWired
        labels={labels}
        locale="en"
        successMessage="Thanks. We'll reply within 1 business day."
      />,
    )

    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    await screen.findByRole('alert')

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    await waitFor(() => expect(submitContactMock).toHaveBeenCalledTimes(2))

    expect(submitContactMock.mock.calls[0]?.[0].get('submissionId')).toBe(firstSubmissionId)
    expect(submitContactMock.mock.calls[1]?.[0].get('submissionId')).toBe(firstSubmissionId)
    expect(randomUUIDMock).toHaveBeenCalledTimes(1)
  })

  it('disables submission while one request is pending', async () => {
    let resolveSubmit: ((result: { ok: false; code: 'persistence' }) => void) | undefined
    submitContactMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve
        }),
    )
    const { ContactFormWired } = await import('./ContactFormWired')

    render(
      <ContactFormWired
        labels={labels}
        locale="en"
        successMessage="Thanks. We'll reply within 1 business day."
      />,
    )

    fillRequiredFields()
    const submitButton = screen.getByRole('button', { name: 'Send message' })
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled())
    expect(submitContactMock).toHaveBeenCalledTimes(1)

    resolveSubmit?.({ ok: false, code: 'persistence' })
    await screen.findByRole('alert')
  })
})
