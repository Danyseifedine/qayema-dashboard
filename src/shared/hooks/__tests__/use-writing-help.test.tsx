import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { makeWritingHelp } from '@/test/factories/session'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { WritingHelpProvider } from '@/shared/components/forms/translatable/writing-help-provider'
import {
  spentFor,
  useTranslateText,
  useWriteDescription,
  useWritingHelp,
  withLeft,
} from '@/shared/hooks/use-writing-help'
import { renderWithProviders } from '@/test/render-with-providers'

let mock: MockAdapter

describe('useWritingHelp', () => {
  it('is off, with a count that goes nowhere, outside a WritingHelpProvider', () => {
    const { result } = renderHook(() => useWritingHelp())

    expect(result.current.uses).toBeNull()
    expect(() => result.current.setLeft({ credits: 3 })).not.toThrow()
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
      <WritingHelpProvider uses={makeWritingHelp()} onLeft={setLeft}>
        <Probe />
      </WritingHelpProvider>,
    )
    return { setLeft, current: () => current }
  }

  it('passes what is left after each answer to the provider', async () => {
    mock.onPost('/api/writing/translate').reply(200, { data: { text: 'Soupe', credits_left: 499 } })
    const { setLeft, current } = run(() => useTranslateText())

    let text = ''
    await act(async () => {
      text = await current().mutateAsync({ text: 'Soup', from: 'en', to: 'fr' })
    })

    expect(text).toBe('Soupe')
    expect(setLeft).toHaveBeenCalledWith({ credits: 499 })
  })

  it('sends a description to the address of its kind, without the kind', async () => {
    mock
      .onPost('/api/writing/restaurant-description')
      .reply(200, { data: { text: 'Hello.', credits_left: null } })
    const { setLeft, current } = run(() => useWriteDescription())

    await act(async () => {
      await current().mutateAsync({ kind: 'restaurant', text: '', language: 'en' })
    })

    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({ text: '', language: 'en' })
    expect(setLeft).toHaveBeenCalledWith({ credits: null })
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
    mock.onPost('/api/writing/translate').reply(200, { data: { words: 'Soupe' } })
    const { setLeft, current } = run(() => useTranslateText())

    act(() => current().mutate({ text: 'Soup', from: 'en', to: 'fr' }))

    expect(await screen.findByText('Could not translate')).toBeInTheDocument()
    expect(
      screen.getByText('Something went wrong on our side. Please try again in a moment.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(setLeft).not.toHaveBeenCalled())
  })

  it('locks what the month’s credits no longer cover and says when they come back', async () => {
    mock.onPost('/api/writing/category-description').reply(429, {
      message: 'You have used this month’s AI credits. They come back on 1 November.',
      code: 'writing_help_credits',
      retry_after: 900000,
      resets_on: '2099-11-01',
      credits_left: 2,
    })
    const { setLeft, current } = run(() => useWriteDescription())

    act(() => current().mutate({ kind: 'category', name: 'Soups', text: '', language: 'en' }))

    expect(
      await screen.findByText(
        'You have used this month’s AI credits. They come back on 1 November.',
      ),
    ).toBeInTheDocument()
    // Two left still translate: only what they do not cover locks.
    expect(setLeft).toHaveBeenCalledWith({ credits: 2 })
  })

  it('takes a credits refusal without a count as none left', async () => {
    mock
      .onPost('/api/writing/translate')
      .reply(429, { message: 'No credits.', code: 'writing_help_credits' })
    const { setLeft, current } = run(() => useTranslateText())

    act(() => current().mutate({ text: 'Soup', from: 'en', to: 'fr' }))

    await waitFor(() => expect(setLeft).toHaveBeenCalledWith({ credits: 0 }))
  })
})

describe('what is spent', () => {
  it('is the month’s credits short of what an action costs', () => {
    expect(spentFor(null, 'translation')).toBeNull()
    expect(spentFor(makeWritingHelp({ limit: 500, left: 2 }), 'translation')).toBeNull()
    expect(spentFor(makeWritingHelp({ limit: 500, left: 2 }), 'description')).toBe('month')
    expect(spentFor(makeWritingHelp({ limit: 500, left: 0 }), 'translation')).toBe('month')
    // No cap on the month.
    expect(spentFor(makeWritingHelp({ limit: null, left: null }), 'description')).toBeNull()
  })

  it('takes in what an answer says is left, keeping what it does not say', () => {
    const now = makeWritingHelp({ limit: 500, left: 400 })

    expect(withLeft(now, { credits: 399 })).toEqual(makeWritingHelp({ limit: 500, left: 399 }))
    expect(withLeft(now, { credits: 0 })).toEqual(makeWritingHelp({ limit: 500, left: 0 }))
    expect(withLeft(now, {})).toEqual(now)

    // A server from before the credits sends none to keep.
    const before = { credits: null }
    expect(withLeft(before, { credits: 3 })).toEqual(before)
    expect(spentFor(before, 'description')).toBeNull()
  })
})
