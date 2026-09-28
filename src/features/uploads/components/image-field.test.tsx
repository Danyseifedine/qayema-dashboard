import { zodResolver } from '@hookform/resolvers/zod'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosProgressEvent } from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { useForm } from 'react-hook-form'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { ImageField, type ImageFieldProps } from '@/features/uploads/components/image-field'
import {
  imageFieldSchema,
  type ImageFieldValue,
} from '@/features/uploads/schemas/temp-upload.schema'

type Values = { image: ImageFieldValue }

const KEY = '11111111-2222-4333-8444-555555555555'
const SAVED = 'https://cdn.qayema.test/saved.webp'

let mock: MockAdapter

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function png(name = 'dish.png', type = 'image/png'): File {
  return new File([new Uint8Array(32)], name, { type })
}

function uploaded(savedPercent = 64) {
  return {
    key: KEY,
    original_size: '400 KB',
    optimized_size: '144 KB',
    saved_percent: savedPercent,
  }
}

/** A form with just the field, and the value it holds printed beside it. */
function Harness({
  initial = null,
  ...props
}: Partial<Omit<ImageFieldProps<Values>, 'control' | 'name'>> & { initial?: ImageFieldValue }) {
  const form = useForm<Values>({
    resolver: zodResolver(z.object({ image: imageFieldSchema })),
    defaultValues: { image: initial },
  })
  const value = form.watch('image')

  return (
    <form onSubmit={form.handleSubmit(() => {})}>
      <ImageField control={form.control} name="image" context="dish" {...props} />
      <output data-testid="value">{JSON.stringify(value)}</output>
      <button type="submit">Submit</button>
    </form>
  )
}

function held(): unknown {
  return JSON.parse(screen.getByTestId('value').textContent!)
}

function fileInput(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>('input[type="file"]')!
}

function dropzone(): HTMLElement {
  return screen.getByRole('button', { name: /Drop an image or browse/ })
}

describe('ImageField', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    // jsdom cannot decode an image; the guard then defers the pixel check to
    // the server.
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('no decoder')))
    // Vitest's jsdom object URLs only take jsdom's own Blob; the URL itself
    // is not under test.
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('starts as an empty drop area with its label and hint', () => {
    render(<Harness label="Photo" optionalText="optional" hint="Cropped to fit." />)

    expect(screen.getByText('Photo')).toBeInTheDocument()
    expect(screen.getByText('optional')).toBeInTheDocument()
    expect(screen.getByText('Cropped to fit.')).toBeInTheDocument()
    expect(screen.getByText('JPEG, PNG or WebP · up to 20 MB')).toBeInTheDocument()
    expect(dropzone()).toHaveAttribute('tabindex', '0')
    expect(dropzone()).not.toHaveAttribute('aria-disabled')
    expect(fileInput()).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(held()).toBeNull()
  })

  it('names the file input after its label', () => {
    render(<Harness label="Logo" />)

    expect(fileInput()).toHaveAccessibleName('Logo')
  })

  it('marks a required field', () => {
    render(<Harness label="Logo" required />)

    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('opens the file picker on click, Enter and Space, and nothing else', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const click = vi.spyOn(fileInput(), 'click').mockImplementation(() => {})

    await user.click(dropzone())
    expect(click).toHaveBeenCalledTimes(1)

    dropzone().focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(click).toHaveBeenCalledTimes(3)

    await user.keyboard('a')
    expect(click).toHaveBeenCalledTimes(3)
  })

  it('uploads a picked file and keeps only its key and a preview', async () => {
    mock.onPost('/api/uploads/temp').reply(200, uploaded())
    const user = userEvent.setup()
    render(<Harness />)

    await user.upload(fileInput(), png('mezze.png'))

    expect(await screen.findByText('mezze.png')).toBeInTheDocument()
    expect(screen.getByText('144 KB')).toBeInTheDocument()
    expect(screen.getByText('64% smaller')).toBeInTheDocument()
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:preview')
    // Wide by default: a cover-shaped thumbnail.
    expect(document.querySelector('img')).toHaveClass('w-[86px]')
    expect(held()).toEqual({
      key: KEY,
      previewUrl: 'blob:preview',
      name: 'mezze.png',
      optimizedSize: '144 KB',
      savedPercent: 64,
    })

    const body = mock.history.post[0]!.data as FormData
    expect(body.get('context')).toBe('dish')
    expect((body.get('file') as File).name).toBe('mezze.png')
  })

  it('shows a square thumbnail for a logo', async () => {
    render(<Harness aspect="square" currentUrl={SAVED} />)

    expect(document.querySelector('img')).toHaveClass('size-16')
  })

  it('ignores a change that carries no file', () => {
    render(<Harness />)

    fireEvent.change(fileInput(), { target: { files: [] } })

    expect(mock.history.post).toHaveLength(0)
    expect(held()).toBeNull()
  })

  it('refuses a file type the server does not take, before any upload', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<Harness hint="Cropped to fit." />)

    await user.upload(fileInput(), png('menu.gif', 'image/gif'))

    expect(await screen.findByText('Images must be JPEG, PNG, or WebP.')).toBeInTheDocument()
    // The error takes the hint's place.
    expect(screen.queryByText('Cropped to fit.')).not.toBeInTheDocument()
    expect(mock.history.post).toHaveLength(0)
    expect(held()).toBeNull()
  })

  it('refuses a file over 20 MB before any upload', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const huge = png('huge.png')
    Object.defineProperty(huge, 'size', { value: 21 * 1024 * 1024 })

    await user.upload(fileInput(), huge)

    expect(await screen.findByText('Images must be 20 MB or smaller.')).toBeInTheDocument()
    expect(mock.history.post).toHaveLength(0)
  })

  it('refuses an image past the pixel cap before any upload', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 200, height: 9000, close: vi.fn() }),
    )
    const user = userEvent.setup()
    render(<Harness />)

    await user.upload(fileInput(), png())

    expect(
      await screen.findByText('Images must be at most 6000 × 6000 pixels.'),
    ).toBeInTheDocument()
    expect(mock.history.post).toHaveLength(0)
  })

  it('shows a busy bar while the size is unknown, then the real percentage', async () => {
    const response = deferred<[number, unknown]>()
    let report: ((event: AxiosProgressEvent) => void) | undefined
    mock.onPost('/api/uploads/temp').reply((config) => {
      report = config.onUploadProgress
      return response.promise
    })
    const user = userEvent.setup()
    render(<Harness />)

    await user.upload(fileInput(), png())

    const bar = await screen.findByRole('progressbar', { name: 'Upload progress' })
    expect(screen.getByText('Uploading…')).toBeInTheDocument()
    // Starts at zero the moment the upload begins.
    expect(bar).toHaveAttribute('aria-valuenow', '0')

    report!({ loaded: 10, total: undefined } as AxiosProgressEvent)
    await waitFor(() => expect(bar).not.toHaveAttribute('aria-valuenow'))
    expect(bar.firstElementChild).toHaveClass('animate-pulse')

    report!({ loaded: 3, total: 4 } as AxiosProgressEvent)
    await waitFor(() => expect(bar).toHaveAttribute('aria-valuenow', '75'))
    expect(bar.firstElementChild).toHaveStyle({ width: '75%' })

    // While bytes are in flight a second pick cannot start from the drop area.
    const busy = screen.getByRole('button', { name: /Uploading/ })
    const click = vi.spyOn(fileInput(), 'click').mockImplementation(() => {})
    fireEvent.click(busy)
    fireEvent.keyDown(busy, { key: 'Enter' })
    fireEvent.drop(busy, { dataTransfer: { files: [png('second.png')] } })
    expect(click).not.toHaveBeenCalled()

    response.resolve([200, uploaded(0)])

    expect(await screen.findByText('dish.png')).toBeInTheDocument()
    // Nothing saved, so no "smaller" chip.
    expect(screen.queryByText(/smaller/)).not.toBeInTheDocument()
    expect(mock.history.post).toHaveLength(1)
  })

  it('shows why an upload failed and keeps the field empty', async () => {
    mock.onPost('/api/uploads/temp').reply(500, { message: 'Server error', code: 'server_error' })
    const user = userEvent.setup()
    render(<Harness hint="Cropped to fit." />)

    await user.upload(fileInput(), png())

    expect(await screen.findByText('Server error')).toBeInTheDocument()
    expect(held()).toBeNull()
    expect(dropzone()).toBeInTheDocument()
  })

  it('lights up while a file is dragged over and uploads what is dropped', async () => {
    mock.onPost('/api/uploads/temp').reply(200, uploaded())
    render(<Harness />)

    fireEvent.dragOver(dropzone())
    expect(dropzone()).toHaveClass('border-gold')

    fireEvent.dragLeave(dropzone())
    expect(dropzone()).not.toHaveClass('border-gold')

    fireEvent.dragOver(dropzone())
    fireEvent.drop(dropzone(), { dataTransfer: { files: [png('dropped.png')] } })

    expect(await screen.findByText('dropped.png')).toBeInTheDocument()
    expect(mock.history.post).toHaveLength(1)
  })

  it('does nothing at all when disabled', async () => {
    render(<Harness disabled />)
    const click = vi.spyOn(fileInput(), 'click').mockImplementation(() => {})

    expect(dropzone()).toHaveAttribute('tabindex', '-1')
    expect(dropzone()).toHaveAttribute('aria-disabled', 'true')
    expect(fileInput()).toBeDisabled()

    fireEvent.click(dropzone())
    fireEvent.keyDown(dropzone(), { key: ' ' })
    expect(click).not.toHaveBeenCalled()

    fireEvent.dragOver(dropzone())
    expect(dropzone()).not.toHaveClass('border-gold')
    fireEvent.drop(dropzone(), { dataTransfer: { files: [png()] } })

    // Give a stray upload the chance to start; none should.
    await new Promise((done) => setTimeout(done, 0))
    expect(mock.history.post).toHaveLength(0)
  })

  it('shows the saved image with Replace and Remove', async () => {
    const user = userEvent.setup()
    render(<Harness currentUrl={SAVED} />)

    expect(screen.getByText('Current image')).toBeInTheDocument()
    expect(document.querySelector('img')).toHaveAttribute('src', SAVED)

    const click = vi.spyOn(fileInput(), 'click').mockImplementation(() => {})
    await user.click(screen.getByRole('button', { name: 'Replace' }))
    expect(click).toHaveBeenCalledOnce()
  })

  it('removing the saved image marks it for deletion and shows the drop area', async () => {
    const user = userEvent.setup()
    render(<Harness currentUrl={SAVED} />)

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(held()).toBe('removed')
    expect(document.querySelector('img')).toBeNull()
    expect(dropzone()).toBeInTheDocument()
    // Nothing picked, so there is no preview URL to release.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })

  it('removing a new pick over a saved image still deletes the saved one', async () => {
    mock.onPost('/api/uploads/temp').reply(200, uploaded())
    const user = userEvent.setup()
    render(<Harness currentUrl={SAVED} />)

    await user.upload(fileInput(), png('new.png'))
    expect(await screen.findByText('new.png')).toBeInTheDocument()
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:preview')

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    expect(held()).toBe('removed')
    expect(fileInput().value).toBe('')
  })

  it('removing a new pick with nothing saved leaves the field unchanged', async () => {
    mock.onPost('/api/uploads/temp').reply(200, uploaded())
    const user = userEvent.setup()
    render(<Harness />)

    await user.upload(fileInput(), png('new.png'))
    await screen.findByText('new.png')

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(held()).toBeNull()
    expect(dropzone()).toBeInTheDocument()
  })

  it('offers no Remove for an image the record cannot do without', () => {
    render(<Harness currentUrl={SAVED} removable={false} />)

    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })

  it('locks Replace and Remove while disabled', () => {
    render(<Harness currentUrl={SAVED} disabled />)

    expect(screen.getByRole('button', { name: 'Replace' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled()
  })

  it('shows Replace as busy while a replacement uploads', async () => {
    const response = deferred<[number, unknown]>()
    mock.onPost('/api/uploads/temp').reply(() => response.promise)
    const user = userEvent.setup()
    render(<Harness currentUrl={SAVED} />)

    await user.upload(fileInput(), png('next.png'))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Replace' })).toHaveAttribute('aria-busy', 'true'),
    )
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled()

    response.resolve([200, uploaded()])
    expect(await screen.findByText('next.png')).toBeInTheDocument()
  })

  // Regression: zod reports this on `image.key`, and the field only read the
  // top-level message, so the save was refused with nothing on screen.
  it('shows a schema error when the held value is not a real upload', async () => {
    const user = userEvent.setup()
    render(
      <Harness
        initial={{
          key: 'not-a-key',
          previewUrl: 'blob:old',
          name: 'old.png',
          optimizedSize: '1 KB',
          savedPercent: 0,
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(
      await screen.findByText('That upload could not be read. Please try again.'),
    ).toBeInTheDocument()
  })
})
