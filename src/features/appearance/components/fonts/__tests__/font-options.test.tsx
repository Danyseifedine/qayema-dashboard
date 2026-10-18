import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FontOptions } from '@/features/appearance/components/fonts/font-options'

const arabic = {
  script: 'arabic',
  languages: ['ar'],
  value: 'Cairo',
  default: 'Cairo',
  sample: 'حلوم مشوي',
  options: [
    { family: 'Cairo', category: 'sans' },
    { family: 'Amiri', category: 'serif' },
  ],
}

describe('FontOptions', () => {
  it('marks a script without Latin letters with its own first letter, and picks a font', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <FontOptions legend="العربية" script={arabic} onChange={onChange} />,
    )

    expect(container.querySelector('label span[aria-hidden]')).toHaveTextContent('ح')
    expect(screen.getByRole('radio', { name: /Cairo/ })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: /Amiri/ }))
    expect(onChange).toHaveBeenCalledWith('Amiri')
  })
})
