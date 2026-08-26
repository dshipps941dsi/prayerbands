import React from 'react'
import { fontStack, initialsFor } from '@/lib/avatars'

// One consistent avatar everywhere: the profile's chosen emoji icon, or the
// person's initials on a gold disc when they haven't picked one. Initials
// honour the profile's style ('single' | 'double') and font key.
export default function AvatarBadge({
  icon,
  name,
  initials,
  font,
  size = 36,
  ring = false,
}: {
  icon?: string | null
  name?: string | null
  initials?: string | null
  font?: string | null
  size?: number
  ring?: boolean
}) {
  const label = icon || initialsFor(name, initials)
  const isTwo = !icon && label.length >= 2
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--pb-primary, #C8A96E), #E2C98A)',
        color: '#0A1628',
        fontFamily: icon ? "'Cormorant Garamond', Georgia, serif" : fontStack(font),
        fontWeight: 700,
        fontSize: icon ? Math.round(size * 0.56) : Math.round(size * (isTwo ? 0.36 : 0.44)),
        letterSpacing: isTwo ? '0.02em' : 0,
        lineHeight: 1,
        ...(ring ? { boxShadow: '0 0 0 2px #fff' } : {}),
      }}
    >
      {label}
    </div>
  )
}
