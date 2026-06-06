import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// Favicon: the PB + cross monogram (white) on a slate-blue disc. Rendered as a
// data-URI SVG so resvg rasterizes the strokes/arcs faithfully.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
<circle cx="16" cy="16" r="16" fill="#3D5A73"/>
<g transform="translate(1.78,0.25) scale(0.235)" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
<path d="M28 22 V112"/>
<path d="M28 22 H50 A15 15 0 0 1 50 52 H28"/>
<path d="M62 36 V112"/>
<path d="M42 58 H82"/>
<path d="M62 64 H80 A13 13 0 0 1 80 90 H62"/>
<path d="M62 90 H82 A11 11 0 0 1 82 112 H62"/>
</g></svg>`

export default function Icon() {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img width={32} height={32} src={src} alt="PrayerBands" />
    ),
    { ...size }
  )
}
