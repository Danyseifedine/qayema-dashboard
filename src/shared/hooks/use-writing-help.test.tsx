import { act, renderHook, screen, waitFor } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { WritingHelpProvider } from '@/shared/components/forms/translatable/writing-help'
import {
  useTranslateText,
  useWriteDescription,
  useWritingHelp,
} from '@/shared/hooks/use-writing-help'
import { renderWithProviders } from '@/test/render-with-providers'

let mock: MockAdapter

describe('useWritingHelp', () => {
  it('is off, with a count that goes nowhere, outside a WritingHelpProvider', () => {
    const { result } = renderHook(() => useWritingHelp())

    expect(result.current.uses).toBeNull()
    expect(() => result.current.setLeft(3)).not.toThrow()
    expect(result.current.spentNoteBy).toBeNull()
    expect(() => result.current.queueForSpentNote('name')()).not.toThrow()
  })
})

describe('the writing help calls', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    resetCsrfToken(api)
  })

  /** Runs a hook under a provider whose count lands in `setLeft`. */
  function run<T>(hook: () => T) {
    const setLeft = vi.fn()
    let current!: T
    function Probe() {
      current = hook()
      return null
    }
    renderWithProviders(
      <WritingHelpProvider uses={{ limit: 30, left: 30 }} onLeft={setLeft}>
        <Probe />
      </WritingHelpProvider>,
    )
    return { setLeft, current: () => current }
  }

  it('passes what is left after each answer to the provider', async () => {
    mock.onPost('/api/writing/translate').reply(200, { data: { text: 'Soupe', left: 29 } })
    const { setLeft, current } = run(() => useTranslateText())

    let text = ''
    await act(async () => {
      text = await current().mutateAsync({ text: 'Soup', from: 'en', to: 'fr' })
    })

    expect(text).toBe('Soupe')
    expect(setLeft).toHaveBeenCalledWith(29)
  })

  it('sends a description to the address of its kind, without the kind', async () => {
    mock
      .onPost('/api/writing/restaurant-description')
      .reply(200, { data: { text: 'Hello.', left: null } })
    const { setLeft, current } = run(() => useWriteDescription())

    await act(async () => {
      await current().mutateAsync({ kind: 'restaurant', text: '', language: 'en' })
    })

    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({ text: '', language: 'en' })
    expect(setLeft).toHaveBeenCalledWith(null)
  })

  it('says a busy writing help with the server’s words, and keeps the count', async () => {
    mock.onPost('/api/writing/category-description').reply(503, {
      message: 'Writing help is busy right now. Try again in a moment.',
      code: 'writing_help_busy',
    })
    const { setLeft, current } = run(() => useWriteDescription())

    act(() => current().mutate({ kind: 'category', name: 'Soups', text: '', language: 'en' }))

    expect(await screen.findByText('Could not write the description')).toBeInTheDocument()
    expect(
      screen.getByText('Writing help is busy right now. Try again in a moment.'),
    ).toBeInTheDocument()
    expect(setLeft).not.toHaveBeenCalled()
  })

  it('treats an answer in the wrong shape as a failure, not as text', async () => {
    mock.onPost('/api/writing/translate').reply(200, { data: { text: 'Soupe' } })
    const { setLeft, current } = run(() => useTranslateText())

    act(() => current().mutate({ text: 'Soup', from: 'en', to: 'fr' }))

    expect(await screen.findByText('Could not translate')).toBeInTheDocument()
    expect(
      screen.getByText('Something went wrong on our side. Please try again in a moment.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(setLeft).not.toHaveBeenCalled())
  })

  it('locks the buttons and says when the uses come back once the day is spent', async () => {
    mock.onPost('/api/writing/category-description').reply(429, {
      message: 'You have used today’s writing help. It comes back tomorrow.',
      code: 'writing_help_limit',
      retry_after: 80000,
      left: 0,
    })
    const { setLeft, current } = run(() => useWriteDescription())

    act(() => current().mutate({ kind: 'category', name: 'Soups', text: '', language: 'en' }))

    expect(
      await screen.findByText('You have used today’s writing help. It comes back tomorrow.'),
    ).toBeInTheDocument()
    expect(setLeft).toHaveBeenCalledWith(0)
    // Not the usual "try again in 80000 seconds".
    expect(screen.queryByText(/80000/)).not.toBeInTheDocument()
  })
})
