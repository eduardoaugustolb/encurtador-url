import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon() {
  const logoData = await readFile(join(process.cwd(), 'public/logo-white.svg'), 'utf-8')
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logoData).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
        }}
      >
        <img src={logoSrc} width={24} height={24} />
      </div>
    ),
    { ...size },
  )
}
