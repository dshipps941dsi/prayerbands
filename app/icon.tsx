import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: '#C8A96E',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 20, fontWeight: 'bold'
      }}>
        ✝
      </div>
    ),
    { ...size }
  )
}