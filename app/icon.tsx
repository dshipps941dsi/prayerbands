import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// Favicon: the traced P+B logo (white) on a slate-blue disc. Rendered as a
// data-URI SVG so resvg rasterizes the paths faithfully.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
<circle cx="16" cy="16" r="16" fill="#3D5A73"/>
<g transform="translate(6.5,5) scale(0.0906)" fill="#fff">
<path d="M168.15,141.7l-51.92-.39.19-22.81,52.24-.14c14.26-.04,26.71,8.34,32.61,19.89,6.73,13.19,5.29,28.4-4.32,40.04,8.72,7.66,12.55,17.18,12.61,28.93.09,17.98-12.98,34.92-32.32,35.03l-103.58.57c-2.15.01-5.54-1.78-5.54-4.09V104.49s-25.23-.36-25.23-.36l.12-22.6,25.13-.2-.05-24.43c0-1.23,2.13-3.43,3.58-3.44l17.08-.09c2.33-.01,4.22,2.39,4.2,4.58l-.19,23.19,25.3.48-.04,22.57-25.21.32.03,114.65,78.6-.11c8.67-.01,14.93-5.82,15.31-13.61s-4.95-14.95-13.32-15.38l-14.54-.74-.25-18.37c3.51-3.65,11.92.92,18.4-4.36,4.61-3.75,5.67-9.69,3.96-15.06-1.46-4.58-6.23-9.78-12.84-9.83Z"/>
<path d="M143.19,43.02c-5.31-9.53-14-18.33-25.75-18.38l-92.35-.38-.24,211.57c0,3.86-1.15,6.83-5.35,6.84l-14.08.04C3.21,242.72,0,240.6,0,237.67L.03,7.29C.03,2.79,3.38-.01,7.66,0l110.99.37c27.06.09,48.96,23.41,51.43,49.36,2.2,23.1-4.77,45.12-25.27,55.35-4.86,2.42-9.88,3.3-15.39,2.06l-.03-20.31c16.89-5.3,20.77-26.82,13.8-43.82Z"/>
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
