import { act, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/app/providers/toast-provider'
import { usePreferencesStore } from '@/stores/preferences.store'

function toaster(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-sonner-toaster]')
  if (!element) throw new Error('no toaster on the page')
  return element
}

describe('ToastProvider', () => {
  afterEach(() => {
    act(() => {
      toast.dismiss()
      usePreferencesStore.getState().setLocale('en')
      usePreferencesStore.getState().setTheme('light')
    })
  })

  it('sits top right in a left-to-right language, in the current theme', async () => {
    act(() => usePreferencesStore.getState().setTheme('dark'))
    render(<ToastProvider />)

    act(() => {
      toast('Saved')
    })

    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(toaster()).toHaveAttribute('data-x-position', 'right')
    expect(toaster()).toHaveAttribute('data-y-position', 'top')
    expect(toaster()).toHaveAttribute('dir', 'ltr')
    expect(toaster()).toHaveAttribute('data-sonner-theme', 'dark')
  })

  it('mirrors to top left in a right-to-left language', async () => {
    act(() => usePreferencesStore.getState().setLocale('ar'))
    render(<ToastProvider />)

    act(() => {
      toast('تم الحفظ')
    })

    expect(await screen.findByText('تم الحفظ')).toBeInTheDocument()
    expect(toaster()).toHaveAttribute('data-x-position', 'left')
    expect(toaster()).toHaveAttribute('dir', 'rtl')
  })
})
