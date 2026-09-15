'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { AVATAR_ICONS, AVATAR_FONTS, initialsFor } from '@/lib/avatars'

// Profile & settings, inside the band app's Account tab: avatar, display
// name, password, connected sign-in methods, and band emails on/off. This
// replaced the standalone /settings page, which looked like the marketing
// site rather than the app people were just using.

const GOLD = 'var(--pb-primary, #B8860B)'
const DARK = 'var(--pb-text, #2C1810)'
const GRAY = 'var(--pb-text-muted, #7A6A5A)'
const INK = 'var(--pb-text-on-primary, #0f0d09)'
const CREAM = 'var(--pb-background, #FAF6EF)'
const serif = "'Playfair Display', Georgia, serif"
const body = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const BORDER = '1px solid rgba(44,24,16,0.12)'

const sb = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function SettingsPanel({ userId, onProfileChange }: { userId: string | null; onProfileChange?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [avatarInitials, setAvatarInitials] = useState('single')
  const [avatarFont, setAvatarFont] = useState('serif')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [emailNotif, setEmailNotif] = useState(true)
  const [identities, setIdentities] = useState<{ identity_id: string; provider: string }[]>([])
  const [linkMsg, setLinkMsg] = useState('')

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const s = sb()
      const { data: { user } } = await s.auth.getUser()
      if (!user) return
      setEmail(user.email || '')
      const { data: profile } = await s.from('profiles').select('full_name, email_notifications, avatar_icon, avatar_initials, avatar_font').eq('id', user.id).maybeSingle()
      setName(profile?.full_name || user.user_metadata?.full_name || '')
      setAvatar(profile?.avatar_icon ?? null)
      setAvatarInitials(profile?.avatar_initials ?? 'single')
      setAvatarFont(profile?.avatar_font ?? 'serif')
      setEmailNotif(profile?.email_notifications !== false)
      const { data: ids } = await s.auth.getUserIdentities()
      if (ids?.identities) setIdentities(ids.identities.map(i => ({ identity_id: i.identity_id, provider: i.provider })))
      setLoading(false)
    })()
  }, [userId])

  async function patch(fields: Record<string, unknown>): Promise<string | null> {
    if (!userId) return 'Not signed in.'
    const { error } = await sb().from('profiles').update(fields).eq('id', userId)
    if (!error) onProfileChange?.()
    return error?.message ?? null
  }
  async function saveName() {
    setSavingName(true); setNameMsg('')
    const err = await patch({ full_name: name.trim() })
    if (!err) { await sb().auth.updateUser({ data: { full_name: name.trim() } }); setNameMsg('saved'); setTimeout(() => setNameMsg(''), 2500) }
    else setNameMsg(err)
    setSavingName(false)
  }
  async function saveAvatar(icon: string | null) { const prev = avatar; setAvatar(icon); if (await patch({ avatar_icon: icon })) setAvatar(prev) }
  async function saveInitials(style: string) { setAvatarInitials(style); await patch({ avatar_initials: style }) }
  async function saveFont(key: string) { setAvatarFont(key); await patch({ avatar_font: key }) }
  async function toggleNotif() { const next = !emailNotif; setEmailNotif(next); if (await patch({ email_notifications: next })) setEmailNotif(!next) }
  async function changePassword() {
    setPwMsg('')
    if (pw.length < 8) { setPwMsg('At least 8 characters.'); return }
    if (pw !== pw2) { setPwMsg("Passwords don't match."); return }
    setSavingPw(true)
    const { error } = await sb().auth.updateUser({ password: pw })
    if (!error) { setPw(''); setPw2(''); setPwMsg('saved'); setTimeout(() => setPwMsg(''), 2500) }
    else setPwMsg(error.message || 'Could not update password.')
    setSavingPw(false)
  }
  async function linkProvider(provider: 'google' | 'apple') {
    setLinkMsg('')
    const back = `${window.location.pathname}?tab=account&settings=1`
    const { data, error } = await sb().auth.linkIdentity({ provider, options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(back)}` } })
    if (error) setLinkMsg(error.message || `Could not connect ${provider}.`)
    else if (data?.url) window.location.href = data.url
  }
  async function unlinkProvider(identity: { identity_id: string; provider: string }) {
    setLinkMsg('')
    const s = sb()
    const { data: ids } = await s.auth.getUserIdentities()
    const full = ids?.identities?.find(i => i.identity_id === identity.identity_id)
    if (!full) return
    const { error } = await s.auth.unlinkIdentity(full)
    if (error) { setLinkMsg(error.message || 'Could not disconnect.'); return }
    setIdentities(prev => prev.filter(i => i.identity_id !== identity.identity_id))
  }

  if (!userId) return null
  if (loading) return <div style={{ fontFamily: body, fontSize: 13, color: GRAY, padding: '4px 0 12px' }}>Loading…</div>

  const label: React.CSSProperties = { display: 'block', fontFamily: body, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: GRAY, margin: '14px 0 6px' }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: BORDER, borderRadius: 8, background: CREAM, color: DARK, fontFamily: body, fontSize: 15, outline: 'none' }
  const chip = (on: boolean): React.CSSProperties => ({ borderRadius: 8, border: on ? `2px solid ${GOLD}` : BORDER, background: on ? 'rgba(184,134,11,0.12)' : 'white', cursor: 'pointer' })
  const saveBtn = (on: () => void, working: boolean, text = 'Save') => (
    <button onClick={on} disabled={working} style={{ background: GOLD, color: INK, border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: serif, fontSize: 13, fontWeight: 700, cursor: working ? 'wait' : 'pointer' }}>{working ? 'Saving…' : text}</button>
  )
  const ok = (m: string, savedText = 'Saved ✓') => m === 'saved'
    ? <span style={{ fontFamily: body, fontSize: 12.5, color: '#2E7D5B' }}>{savedText}</span>
    : m ? <span style={{ fontFamily: body, fontSize: 12.5, color: '#C0392B' }}>{m}</span> : null
  const sectionTitle = (t: string) => <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: DARK, marginTop: 4 }}>{t}</div>
  const divider = <div style={{ borderTop: BORDER, margin: '18px 0 14px' }} />

  return (
    <div style={{ paddingBottom: 6 }}>
      {sectionTitle('Avatar')}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${GOLD}, color-mix(in srgb, ${GOLD} 60%, white))`, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: avatar ? 25 : 18, fontWeight: 700, fontFamily: AVATAR_FONTS.find(f => f.key === avatarFont)?.stack || serif, flexShrink: 0 }}>
          {avatar || initialsFor(name, avatarInitials)}
        </div>
        <span style={{ fontFamily: body, fontSize: 13, color: GRAY }}>{avatar ? 'Tap the icon again to go back to your initials.' : 'Pick an icon, or style your initials.'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
        {AVATAR_ICONS.map(ic => (
          <button key={ic} onClick={() => saveAvatar(avatar === ic ? null : ic)} aria-label={`Avatar ${ic}`} style={{ ...chip(avatar === ic), aspectRatio: '1', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ic}</button>
        ))}
      </div>
      {!avatar && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {([['single', 'First initial'], ['double', 'First + Last']] as const).map(([val, lbl]) => (
              <button key={val} onClick={() => saveInitials(val)} style={{ ...chip(avatarInitials === val), flex: 1, padding: '8px 6px', fontFamily: body, fontSize: 12.5, fontWeight: 600, color: DARK }}>{lbl}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {AVATAR_FONTS.map(f => (
              <button key={f.key} onClick={() => saveFont(f.key)} style={{ ...chip(avatarFont === f.key), padding: '8px 4px 6px', textAlign: 'center' }}>
                <div style={{ fontFamily: f.stack, fontSize: 18, fontWeight: 700, color: DARK, lineHeight: 1.1 }}>{initialsFor(name, avatarInitials)}</div>
                <div style={{ fontFamily: body, fontSize: 10, color: GRAY, marginTop: 3 }}>{f.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {divider}
      {sectionTitle('Profile')}
      <label style={label}>Display name</label>
      <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
      <label style={label}>Email</label>
      <input style={{ ...input, color: GRAY }} value={email} readOnly />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>{saveBtn(saveName, savingName)}{ok(nameMsg)}</div>

      {divider}
      {sectionTitle('Band emails')}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <div style={{ flex: 1, fontFamily: body, fontSize: 13, color: GRAY, lineHeight: 1.5 }}>Email me when one of my bands is registered or passed on. Push notifications are just above.</div>
        <button role="switch" aria-checked={emailNotif} aria-label="Band emails" onClick={toggleNotif} style={{ width: 46, height: 26, borderRadius: 13, border: 'none', background: emailNotif ? GOLD : 'rgba(44,24,16,0.2)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: 3, left: emailNotif ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.15s' }} />
        </button>
      </div>

      {divider}
      {sectionTitle('Sign-in')}
      {([{ key: 'google' as const, label: 'Google' }, { key: 'apple' as const, label: 'Apple' }]).map(p => {
        const linked = identities.find(i => i.provider === p.key)
        const canUnlink = identities.length > 1
        return (
          <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0' }}>
            <div>
              <div style={{ fontFamily: body, fontSize: 14.5, fontWeight: 600, color: DARK }}>{p.label}</div>
              <div style={{ fontFamily: body, fontSize: 12.5, color: linked ? '#2E7D5B' : GRAY }}>{linked ? 'Connected' : 'Not connected'}</div>
            </div>
            {linked
              ? (canUnlink
                ? <button onClick={() => unlinkProvider(linked)} style={{ background: 'white', border: BORDER, color: GRAY, borderRadius: 8, padding: '7px 12px', fontFamily: body, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Disconnect</button>
                : <span style={{ fontFamily: body, fontSize: 12, color: GRAY }}>Your sign-in</span>)
              : <button onClick={() => linkProvider(p.key)} style={{ background: 'white', border: `1px solid ${GOLD}`, color: DARK, borderRadius: 8, padding: '7px 12px', fontFamily: body, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Connect</button>}
          </div>
        )
      })}
      {linkMsg && <div style={{ fontFamily: body, fontSize: 12.5, color: '#C0392B' }}>{linkMsg}</div>}
      <button onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', padding: '8px 0 0', color: GOLD, fontFamily: body, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        {showPw ? 'Hide password' : (identities.some(i => i.provider === 'email') ? 'Set or change a password' : 'Add a password')}
      </button>
      {showPw && (
        <div>
          <div style={{ fontFamily: body, fontSize: 12.5, color: GRAY, lineHeight: 1.5, marginTop: 6 }}>Signed up with an emailed code? You have no password yet. Set one to sign in without waiting for a code, or keep using codes. Either works.</div>
          <label style={label}>Password</label>
          <input style={input} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 8 characters" />
          <label style={label}>Confirm</label>
          <input style={input} type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Re-enter password" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>{saveBtn(changePassword, savingPw, 'Save password')}{ok(pwMsg, 'Updated ✓')}</div>
        </div>
      )}
    </div>
  )
}
