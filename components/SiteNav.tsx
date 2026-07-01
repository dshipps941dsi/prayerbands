'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

// Shared top navigation (announcement bar + sticky nav). Used on the home page,
// the store, and anywhere else that wants the marketing-site header. The cart
// icon opens a drawer when `onCartClick` is passed (store), otherwise it links
// to /store.
const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/#map', label: 'The Map' },
  { href: '/#circles', label: 'Prayer Circles' },
  { href: '/#stories', label: 'Stories' },
  { href: '/store', label: 'Shop' },
  { href: '/contact', label: 'Contact' },
]

const SOCIAL: { label: string; href: string; path: string }[] = [
  { label: 'Facebook', href: 'https://facebook.com/prayerbands', path: 'M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z' },
  { label: 'Instagram', href: 'https://instagram.com/prayer_bands', path: 'instagram' },
  { label: 'X (Twitter)', href: 'https://twitter.com/prayerbands', path: 'M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.74-8.84L1.25 2.25H8.1l4.71 6.23 5.43-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64Z' },
  { label: 'TikTok', href: 'https://tiktok.com/@prayerbands', path: 'M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.3v12.97a2.32 2.32 0 1 1-2.32-2.32c.24 0 .47.04.69.1v-3.36a5.66 5.66 0 0 0-.69-.04 5.66 5.66 0 1 0 5.66 5.66V9.46a7.55 7.55 0 0 0 4.42 1.42V7.55a4.28 4.28 0 0 1-3.4-1.73Z' },
  { label: 'YouTube', href: 'https://youtube.com/@prayerbands', path: 'M23.5 6.5a3 3 0 0 0-2.11-2.13C19.5 3.86 12 3.86 12 3.86s-7.5 0-9.39.51A3 3 0 0 0 .5 6.5 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.5 3 3 0 0 0 2.11 2.13c1.89.51 9.39.51 9.39.51s7.5 0 9.39-.51A3 3 0 0 0 23.5 17.5 31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.5ZM9.6 15.57V8.43L15.82 12 9.6 15.57Z' },
]

function SocialIcon({ path }: { path: string }) {
  if (path === 'instagram') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" /></svg>
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={path} /></svg>
}

function NavIcon({ name }: { name: 'user' | 'cart' }) {
  const c = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'user') return <svg {...c} aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></svg>
  return <svg {...c} aria-hidden><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M3 4h2l2.4 12.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L21 8H6" /></svg>
}

export default function SiteNav({ onCartClick, cartCount = 0 }: { onCartClick?: () => void; cartCount?: number }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <style>{navStyles}</style>
      <div className="sn-topbar">
        <span><span className="sn-dot" /> NFC Technology · Just Tap &amp; Go</span>
        <span className="sn-topbar-sep">Free Shipping on Orders $35+</span>
        <span>Designed in the USA 🇺🇸</span>
      </div>
      <nav className={`sn-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="sn-nav-inner">
          <Link href="/" className="sn-logo"><PrayerBandsLogo size={30} color="#0A1628" />Prayer&nbsp;<span>Bands</span></Link>
          <div className="sn-links">
            {NAV_LINKS.map(l => <Link key={l.label} href={l.href} className="sn-link">{l.label}</Link>)}
          </div>
          <div className="sn-actions">
            <span className="sn-social">
              {SOCIAL.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="sn-social-link"><SocialIcon path={s.path} /></a>
              ))}
            </span>
            <Link href="/signin" className="sn-ico" aria-label="Account"><NavIcon name="user" /></Link>
            {onCartClick ? (
              <button onClick={onCartClick} className="sn-ico" aria-label="Cart" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <NavIcon name="cart" />
                {cartCount > 0 && <span className="sn-cart-badge">{cartCount}</span>}
              </button>
            ) : (
              <Link href="/store" className="sn-ico" aria-label="Shop"><NavIcon name="cart" /></Link>
            )}
            <button className={`sn-toggle${menuOpen ? ' open' : ''}`} aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}><span /><span /><span /></button>
          </div>
        </div>
        {menuOpen && (
          <div className="sn-mobile">
            {NAV_LINKS.map(l => <Link key={l.label} href={l.href} className="sn-mobile-link" onClick={() => setMenuOpen(false)}>{l.label}</Link>)}
            <Link href="/signin" className="sn-mobile-link" onClick={() => setMenuOpen(false)}>Sign In</Link>
            <span className="sn-mobile-social">
              {SOCIAL.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="sn-social-link"><SocialIcon path={s.path} /></a>
              ))}
            </span>
          </div>
        )}
      </nav>
    </>
  )
}

const navStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');
  .sn-topbar { background:#0A1628; color:rgba(245,237,216,0.8); font-size:0.72rem; letter-spacing:0.06em; display:flex; justify-content:center; gap:34px; align-items:center; padding:9px 20px; position:relative; z-index:101; font-family:'Inter',sans-serif; }
  .sn-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:#C8A96E; margin-right:6px; }
  @media (max-width:760px){ .sn-topbar-sep { display:none; } .sn-topbar { gap:18px; font-size:0.66rem; } }
  .sn-nav { position:sticky; top:0; z-index:100; background:rgba(250,247,239,0.9); backdrop-filter:blur(12px); border-bottom:1px solid transparent; transition:background .3s, border-color .3s, box-shadow .3s; }
  .sn-nav.scrolled { background:rgba(250,247,239,0.97); border-color:rgba(10,22,40,0.10); box-shadow:0 6px 24px rgba(10,22,40,0.06); }
  .sn-nav-inner { display:flex; align-items:center; justify-content:space-between; height:72px; max-width:1280px; margin:0 auto; padding:0 32px; }
  @media (max-width:600px){ .sn-nav-inner { padding:0 20px; } }
  .sn-logo { display:inline-flex; align-items:center; gap:9px; font-family:'Cinzel',serif; font-size:1.18rem; font-weight:700; color:#15223B; letter-spacing:0.06em; text-decoration:none; }
  .sn-logo span { color:#9A7A35; font-weight:500; }
  .sn-links { display:flex; gap:26px; }
  .sn-link { color:#3a4660; font-size:0.74rem; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; text-decoration:none; transition:color .2s; font-family:'Inter',sans-serif; }
  .sn-link:hover { color:#9A7A35; }
  .sn-actions { display:flex; align-items:center; gap:14px; }
  .sn-social { display:flex; align-items:center; gap:13px; padding-right:15px; border-right:1px solid rgba(10,22,40,0.14); }
  .sn-social-link { color:#3a4660; display:inline-flex; align-items:center; transition:color .2s; }
  .sn-social-link:hover { color:#9A7A35; }
  .sn-social-link svg { width:16px; height:16px; }
  .sn-ico { color:#15223B; display:inline-flex; align-items:center; transition:color .2s; position:relative; }
  .sn-ico:hover { color:#9A7A35; }
  .sn-mobile-social { display:none; }
  .sn-cart-badge { position:absolute; top:-7px; right:-9px; min-width:17px; height:17px; padding:0 4px; border-radius:9px; background:#C8A96E; color:#0A1628; font-size:10px; font-weight:700; font-family:'Inter',sans-serif; display:flex; align-items:center; justify-content:center; }
  .sn-toggle { display:none; flex-direction:column; gap:5px; width:38px; height:38px; background:none; border:none; cursor:pointer; padding:8px; }
  .sn-toggle span { display:block; width:22px; height:2px; background:#15223B; border-radius:2px; transition:transform .25s, opacity .25s; }
  .sn-toggle.open span:nth-child(1){ transform:translateY(7px) rotate(45deg); }
  .sn-toggle.open span:nth-child(2){ opacity:0; }
  .sn-toggle.open span:nth-child(3){ transform:translateY(-7px) rotate(-45deg); }
  .sn-mobile { display:flex; flex-direction:column; background:#FAF7EF; border-top:1px solid rgba(10,22,40,0.10); padding:8px 24px 16px; }
  .sn-mobile-link { color:#15223B; font-size:0.95rem; letter-spacing:0.05em; text-decoration:none; padding:14px 4px; border-bottom:1px solid rgba(10,22,40,0.10); font-family:'Inter',sans-serif; }
  .sn-mobile-link:last-child { border-bottom:none; color:#9A7A35; font-family:'Cinzel',serif; font-weight:600; }
  .sn-mobile-social { gap:22px; padding:18px 4px 6px; }
  .sn-mobile-social .sn-social-link { color:#15223B; }
  .sn-mobile-social .sn-social-link svg { width:20px; height:20px; }
  @media (max-width:980px){ .sn-links { display:none; } .sn-toggle { display:flex; } .sn-social { display:none; } .sn-mobile-social { display:flex; } }
  @media (min-width:981px){ .sn-mobile { display:none !important; } }
`
