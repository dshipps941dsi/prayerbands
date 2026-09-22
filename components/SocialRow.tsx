import { SOCIAL } from '@/lib/social'

// Round icon links to every social account. Used in the app's Account tab
// and the site footer.
export function SocialIcon({ name, size = 18 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const }
  switch (name) {
    case 'facebook': return <svg {...p} fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.77l-.44 2.9h-2.33V22C18.34 21.21 22 17.06 22 12.06z"/></svg>
    case 'instagram': return <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
    case 'pinterest': return <svg {...p} fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12c0 4.1 2.5 7.7 6.1 9.2-.1-.8-.2-2 0-2.8l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.3-4.5-4.3-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4.1.1.1.2.1.3l-.3 1.2c0 .2-.2.2-.4.1-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2.1-1.3 2.8.9.3 1.9.4 2.9.4 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>
    case 'tiktok': return <svg {...p} fill="currentColor"><path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.3v12.97a2.32 2.32 0 1 1-2.32-2.32c.24 0 .47.04.69.1v-3.36a5.66 5.66 0 0 0-.69-.04 5.65 5.65 0 1 0 5.65 5.65V9.3a7.55 7.55 0 0 0 4.43 1.43V7.4a4.3 4.3 0 0 1-3.4-1.58z"/></svg>
    case 'youtube': return <svg {...p} fill="currentColor"><path d="M23.5 6.5a3 3 0 0 0-2.11-2.13C19.5 3.86 12 3.86 12 3.86s-7.5 0-9.39.51A3 3 0 0 0 .5 6.5 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.5 3 3 0 0 0 2.11 2.13c1.89.51 9.39.51 9.39.51s7.5 0 9.39-.51A3 3 0 0 0 23.5 17.5 31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.5zM9.6 15.5v-7l6.2 3.5-6.2 3.5z"/></svg>
    case 'x': return <svg {...p} fill="currentColor"><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.74-8.84L1.25 2.25H8.1l4.71 6.23 5.43-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z"/></svg>
    default: return null
  }
}

export default function SocialRow({ color = 'currentColor', bg = 'transparent', border = 'rgba(44,24,16,0.12)', size = 40 }: { color?: string; bg?: string; border?: string; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {SOCIAL.map(s => (
        <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} ${s.handle}`} title={`${s.label} ${s.handle}`}
          style={{ width: size, height: size, borderRadius: size / 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: bg, border: `1px solid ${border}`, color, textDecoration: 'none' }}>
          <SocialIcon name={s.key} size={Math.round(size * 0.45)} />
        </a>
      ))}
    </div>
  )
}
