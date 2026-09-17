import Image from 'next/image'
import Link from 'next/link'
import styles from './PrayerPartnersSection.module.css'

// Home page: Prayer Partners, laid out to the supplied mock-up. Copy on the
// left; a sample partner pair and two panels in the middle; the photograph
// on the right. Every button leads into the app's Partners tab.

const PARTNERS = '/my-band?open=partners'

const methods = [
  { icon: 'tap', title: 'Tap phones', detail: 'Tap your bands to connect' },
  { icon: 'qr', title: 'Scan a QR code', detail: 'Connect in seconds' },
  { icon: 'link', title: 'Send a code', detail: 'Invite from anywhere' },
] as const

const lists = [
  { icon: 'family', name: 'Family' },
  { icon: 'baseball', name: 'Baseball Team' },
  { icon: 'friends', name: 'Close Friends' },
  { icon: 'book', name: 'Men’s Group' },
] as const

type IconName = 'tap' | 'qr' | 'link' | 'family' | 'friends' | 'baseball' | 'book' | 'arrow' | 'hands' | 'chat'

function Icon({ name }: { name: IconName }) {
  const c = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  // The supplied set: a 64-unit box with a 3.25 stroke.
  const g = { fill: 'none', stroke: 'currentColor', strokeWidth: 3.25, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'tap': return <svg viewBox="0 0 64 64" aria-hidden="true"><g {...g}><rect x="10.5" y="27" width="17" height="27" rx="4" transform="rotate(17 10.5 27)" /><rect x="36.5" y="31.8" width="17" height="27" rx="4" transform="rotate(-17 36.5 31.8)" /><path d="M22.2 49.3h.1M41.7 49.3h.1" /><path d="M32 6v9M20.5 10.1l5.2 7.2M43.5 10.1l-5.2 7.2" /><path d="M26.8 27.2c1.4-2 3.1-3 5.2-3s3.8 1 5.2 3" /></g></svg>
    case 'qr': return <svg viewBox="0 0 64 64" aria-hidden="true"><g {...g}><path d="M8 22V10h12M44 10h12v12M56 44v12H44M20 56H8V44" /><rect x="18" y="18" width="12" height="12" rx="1.5" /><rect x="36" y="18" width="10" height="10" rx="1.5" /><rect x="18" y="36" width="12" height="12" rx="1.5" /><path d="M37 36h5v5h-5zM47 36v6h-5M36 47h6v7M48 48h6v6h-6z" /></g></svg>
    case 'link': return <svg viewBox="0 0 64 64" aria-hidden="true"><g {...g}><path d="M27.2 41.2l-4.6 4.6a10 10 0 0 1-14.1-14.1l8.2-8.2a10 10 0 0 1 14.1 0" /><path d="M36.8 22.8l4.6-4.6a10 10 0 0 1 14.1 14.1l-8.2 8.2a10 10 0 0 1-14.1 0" /><path d="M23.5 40.5l17-17" /></g></svg>
    case 'family': return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M12 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 20v-4a4 4 0 0 1 8 0v4M2 19v-3a3 3 0 0 1 4-2.8M22 19v-3a3 3 0 0 0-4-2.8" /></svg>
    case 'friends': return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20v-1.5a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4V20M17 4.5a3.5 3.5 0 0 1 0 6.6M22 20v-1.5a4 4 0 0 0-3-3.8" /></svg>
    case 'baseball': return <svg viewBox="0 0 24 24" aria-hidden="true"><circle {...c} cx="12" cy="12" r="9" /><path {...c} d="M5.5 5.5c2.2 1.6 3.5 4 3.5 6.5s-1.3 4.9-3.5 6.5M18.5 5.5c-2.2 1.6-3.5 4-3.5 6.5s1.3 4.9 3.5 6.5M8 9.5l1.4.6M8 14.5l1.4-.6M16 9.5l-1.4.6M16 14.5l-1.4-.6" /></svg>
    case 'book': return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M12 6c-1.6-1.4-4-2-8-2v14c4 0 6.4.6 8 2 1.6-1.4 4-2 8-2V4c-4 0-6.4.6-8 2ZM12 6v14" /></svg>
    case 'hands': return <svg viewBox="0 0 64 64" aria-hidden="true"><g {...g}><path d="M31.9 47.5c-4.7 5.1-9.7 8-15 10.5L7.5 48.4l9.3-7.8c3.4-5.7 5.8-11.7 7.1-18.1l2.5-12.3c.5-2.5 3.9-2.8 4.9-.5.4.9.6 1.9.6 2.9v34.9Z" /><path d="M32.1 47.5c4.7 5.1 9.7 8 15 10.5l9.4-9.6-9.3-7.8c-3.4-5.7-5.8-11.7-7.1-18.1l-2.5-12.3c-.5-2.5-3.9-2.8-4.9-.5-.4.9-.6 1.9-.6 2.9v34.9Z" /><path d="M25.5 25.8c1.7-2.4 3.8-3.6 6.4-3.6M38.5 25.8c-1.7-2.4-3.8-3.6-6.4-3.6" /><path d="m7.5 48.4 9.4 9.6M56.5 48.4 47.1 58" /></g></svg>
    case 'chat': return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M4 5h16v11h-9l-4 3v-3H4z" /></svg>
    default: return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="m9 18 6-6-6-6" /></svg>
  }
}

export default function PrayerPartnersSection() {
  return (
    <section id="partners" className={styles.section} aria-labelledby="prayer-partners-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Prayer Partners</p>
        <h2 id="prayer-partners-title">Faith grows<br />stronger together.</h2>
        <p className={styles.intro}>Build your trusted prayer network. Connect in person or from anywhere, share requests privately, and encourage one another through consistent prayer.</p>
        <div className={styles.actions}>
          <Link href={PARTNERS} className={styles.primaryButton}>Invite a prayer partner</Link>
          <Link href="/how-it-works#network" className={styles.textButton}>How it works <span aria-hidden="true">→</span></Link>
        </div>
      </div>

      <div className={styles.stack}>
        {/* A sample pair, the way two partners appear in the app. */}
        <div className={styles.pair} aria-hidden="true">
          <div className={styles.avatar}><img src="/home/partner-david.jpg" alt="" /></div>
          <div className={styles.pairLine} />
          <div className={styles.pairCard}>
            <div className={styles.pairIcon}><Icon name="hands" /></div>
            <div className={styles.pairNames}>David &amp; Michael</div>
            <div className={styles.pairSub}>Prayer Partners</div>
            <div className={styles.pairStat}><Icon name="chat" /> 12 prayers shared</div>
          </div>
          <div className={styles.pairLine} />
          <div className={styles.avatar}><img src="/home/partner-michael.jpg" alt="" /></div>
        </div>

        <div className={styles.panel}>
          <h3 className={styles.ruleTitle}><span>Connect your way</span></h3>
          <div className={styles.methods}>
            {methods.map(m => (
              <div className={styles.method} key={m.title}>
                <span className={styles.methodIcon}><Icon name={m.icon} /></span>
                <strong>{m.title}</strong>
                <small>{m.detail}</small>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.listsHead}><h3>Prayer Lists</h3></div>
          <p className={styles.listsSub}>Choose exactly who sees each request.</p>
          <div className={styles.listGrid}>
            {lists.map(l => (
              <Link className={styles.listItem} href={PARTNERS} key={l.name}>
                <Icon name={l.icon} /><span>{l.name}</span><Icon name="arrow" />
              </Link>
            ))}
          </div>
          <Link href={PARTNERS} className={styles.createList}>+ Create a list</Link>
        </div>
      </div>

      <div className={styles.photo}>
        <Image src="/home/prayer-partners.jpg" alt="Two friends praying together outdoors at sunset" fill sizes="(max-width: 860px) 100vw, 40vw" className={styles.photoImage} />
        <div className={styles.photoShade} />
      </div>
    </section>
  )
}
