import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const submitBookingMock = vi.fn()
const turnstileSuccessHandlers: Array<(token: string) => void> = []
const firstSubmissionId = '11111111-1111-4111-8111-111111111111'
const secondSubmissionId = '22222222-2222-4222-8222-222222222222'

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }) => {
    if (onSuccess) turnstileSuccessHandlers.push(onSuccess)
    return <div data-testid="turnstile" />
  },
}))

vi.mock('@/app/[locale]/actions/booking', () => ({
  submitBooking: submitBookingMock,
}))

const labels = {
  name: 'Name',
  email: 'Email',
  company: 'Company',
  phone: 'Phone',
  service: 'Service',
  preferredWindows: 'Preferred times',
  message: 'Message',
  submit: 'Send request',
  sending: 'Sending…',
}

async function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ari' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ari@example.com' } })
  fireEvent.change(screen.getByLabelText('Service'), { target: { value: 'pt-pma-setup' } })
  fireEvent.change(screen.getByLabelText('Message'), {
    target: { value: 'Please help with PMA setup next month.' },
  })
}

describe('BookingFormWired', () => {
  let randomUUIDMock: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    submitBookingMock.mockReset()
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

  it('submits booking FormData with locale, serviceSlug, and Turnstile token', async () => {
    submitBookingMock.mockResolvedValueOnce({ ok: true })
    const { BookingFormWired } = await import('./BookingFormWired')

    render(
      <BookingFormWired
        labels={labels}
        services={[{ slug: 'pt-pma-setup', name: 'PT PMA Setup' }]}
        locale="en"
        successMessage="Thanks. We'll reply within 1 business day."
      />,
    )

    expect(randomUUIDMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('turnstile')).toBeInTheDocument()
    turnstileSuccessHandlers.at(-1)?.('turnstile-token')
    await fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))

    await waitFor(() => expect(submitBookingMock).toHaveBeenCalledTimes(1))
    const formData = submitBookingMock.mock.calls[0]?.[0] as FormData
    expect(formData.get('locale')).toBe('en')
    expect(formData.get('serviceSlug')).toBe('pt-pma-setup')
    expect(formData.get('turnstileToken')).toBe('turnstile-token')
    expect(formData.get('submissionId')).toBe(firstSubmissionId)
  })

  it('clears an exhausted token after a failed server submission before retrying', async () => {
    submitBookingMock.mockResolvedValueOnce({ ok: false, code: 'persistence' })
    submitBookingMock.mockResolvedValueOnce({ ok: false, code: 'captcha' })
    submitBookingMock.mockResolvedValueOnce({ ok: true })
    const { BookingFormWired } = await import('./BookingFormWired')

    render(
      <BookingFormWired
        labels={labels}
        services={[{ slug: 'pt-pma-setup', name: 'PT PMA Setup' }]}
        locale="en"
        defaultService="pt-pma-setup"
        successMessage="Thanks. We'll reply within 1 business day."
      />,
    )

    turnstileSuccessHandlers.at(-1)?.('first-token')
    await fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))

    await screen.findByRole('alert')
    expect(submitBookingMock.mock.calls[0]?.[0].get('turnstileToken')).toBe('first-token')

    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))

    await waitFor(() => expect(submitBookingMock).toHaveBeenCalledTimes(2))
    expect(submitBookingMock.mock.calls[1]?.[0].get('turnstileToken')).toBe('')

    turnstileSuccessHandlers.at(-1)?.('second-token')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Send request' })).not.toBeDisabled(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))

    await waitFor(() => expect(submitBookingMock).toHaveBeenCalledTimes(3))
    expect(submitBookingMock.mock.calls[2]?.[0].get('turnstileToken')).toBe('second-token')
    expect(submitBookingMock.mock.calls[0]?.[0].get('submissionId')).toBe(firstSubmissionId)
    expect(submitBookingMock.mock.calls[1]?.[0].get('submissionId')).toBe(firstSubmissionId)
    expect(submitBookingMock.mock.calls[2]?.[0].get('submissionId')).toBe(firstSubmissionId)
    expect(randomUUIDMock).toHaveBeenCalledTimes(2)
    expect(randomUUIDMock.mock.results[1]?.value).toBe(secondSubmissionId)
  })

  it('reuses submissionId after the action throws', async () => {
    submitBookingMock.mockRejectedValueOnce(new Error('network unavailable'))
    submitBookingMock.mockResolvedValueOnce({ ok: false, code: 'temporarily-unavailable' })
    const { BookingFormWired } = await import('./BookingFormWired')

    render(
      <BookingFormWired
        labels={labels}
        services={[{ slug: 'pt-pma-setup', name: 'PT PMA Setup' }]}
        locale="en"
        defaultService="pt-pma-setup"
        successMessage="Thanks. We'll reply within 1 business day."
      />,
    )

    await fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))
    await screen.findByRole('alert')

    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))
    await waitFor(() => expect(submitBookingMock).toHaveBeenCalledTimes(2))

    expect(submitBookingMock.mock.calls[0]?.[0].get('submissionId')).toBe(firstSubmissionId)
    expect(submitBookingMock.mock.calls[1]?.[0].get('submissionId')).toBe(firstSubmissionId)
    expect(randomUUIDMock).toHaveBeenCalledTimes(1)
  })

  it('disables submission while one request is pending', async () => {
    let resolveSubmit: ((result: { ok: false; code: 'persistence' }) => void) | undefined
    submitBookingMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve
        }),
    )
    const { BookingFormWired } = await import('./BookingFormWired')

    render(
      <BookingFormWired
        labels={labels}
        services={[{ slug: 'pt-pma-setup', name: 'PT PMA Setup' }]}
        locale="en"
        defaultService="pt-pma-setup"
        successMessage="Thanks. We'll reply within 1 business day."
      />,
    )

    await fillRequiredFields()
    const submitButton = screen.getByRole('button', { name: 'Send request' })
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled())
    expect(submitBookingMock).toHaveBeenCalledTimes(1)

    resolveSubmit?.({ ok: false, code: 'persistence' })
    await screen.findByRole('alert')
  })
})
