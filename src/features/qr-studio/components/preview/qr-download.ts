import QRCodeStyling, { type Options } from 'qr-code-styling'

/** Big enough for print; a vector SVG scales past this anyway. */
const SIZE = 1024

/**
 * The quiet zone round a downloaded code. On screen the frame gives it one;
 * a file saved on its own has nothing round it, and a reader needs the gap
 * to find where the code starts.
 */
const MARGIN = 48

export async function downloadQr(
  options: Options,
  name: string,
  extension: 'png' | 'svg',
): Promise<void> {
  const code = new QRCodeStyling({
    ...options,
    width: SIZE,
    height: SIZE,
    margin: MARGIN,
    type: extension === 'svg' ? 'svg' : 'canvas',
  })

  await code.download({ name, extension })
}
