import React from 'react'

// One consistent avatar everywhere: the profile's chosen emoji icon, or the
// person's initial on a gold disc when they haven't picked one.
export default function AvatarBadge({
  icon,
  name,
  size = 36,
  ring = false,
}: {
  icon?: string | null
  name?: string | null
  size?: number
  ring?: boolean
}) {
  const initial = ((name || '').trim()[0] || '✝').toUpperCase()
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
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontWeight: 700,
        fontSize: icon ? Math.round(size * 0.56) : Math.round(size * 0.42),
        lineHeight: 1,
        ...(ring ? { boxShadow: '0 0 0 2px #fff' } : {}),
      }}
    >
      {icon || initial}
    </div>
  )
}
