// Shared PrayerBands brand mark: the "PB" + cross monogram, drawn as an inline
// SVG so it stays crisp at any size and inherits its color from the `color`
// prop. Use the slate-blue brand color on light backgrounds and white on dark
// ones (pass color accordingly). Optionally renders the "PrayerBands" wordmark
// beside the mark for header/footer lockups.

import type { CSSProperties } from 'react'

export const LOGO_SLATE = '#3D5A73'

// The monogram is authored on a 116 x 130 canvas (slightly taller than wide).
const VB_W = 116
const VB_H = 130

export default function Logo({
  size = 30,
  color = LOGO_SLATE,
  withName = false,
  name = 'PrayerBands',
  nameColor,
  nameSize,
  nameClassName,
  gap = 9,
  style,
}: {
  /** Height of the monogram in px. */
  size?: number
  /** Stroke color of the mark. Slate-blue on light, white on dark. */
  color?: string
  /** Render the wordmark next to the mark. */
  withName?: boolean
  name?: string
  /** Wordmark color (defaults to `color`). */
  nameColor?: string
  nameSize?: number
  /** If set, the wordmark uses this class instead of the built-in serif. */
  nameClassName?: string
  gap?: number
  style?: CSSProperties
}) {
  const width = Math.round((size * VB_W) / VB_H)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap, lineHeight: 1, ...style }}>
      <svg
        width={width}
        height={size}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        fill="none"
        stroke={color}
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={name}
        style={{ display: 'block', flexShrink: 0 }}
      >
        {/* P — left stem + top bowl */}
        <path d="M28 22 V112" />
        <path d="M28 22 H50 A15 15 0 0 1 50 52 H28" />
        {/* Cross — vertical (shared with the B spine) + crossbar */}
        <path d="M62 36 V112" />
        <path d="M42 58 H82" />
        {/* B — two right-facing bowls off the central spine */}
        <path d="M62 64 H80 A13 13 0 0 1 80 90 H62" />
        <path d="M62 90 H82 A11 11 0 0 1 82 112 H62" />
      </svg>
      {withName && (
        <span
          className={nameClassName}
          style={{
            fontFamily: nameClassName ? undefined : "'Playfair Display', Georgia, serif",
            fontWeight: 700,
            fontSize: nameSize ?? Math.round(size * 0.62),
            color: nameColor ?? color,
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      )}
    </span>
  )
}
