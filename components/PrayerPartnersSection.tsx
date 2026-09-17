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
  switch (name) {
    case 'tap': return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M8.5 4.5 3.9 6.2a1.6 1.6 0 0 0-1 2.1l4 10.4a1.6 1.6 0 0 0 2.1.9l4.6-1.7M15.5 4.5l4.6 1.7a1.6 1.6 0 0 1 1 2.1l-4 10.4a1.6 1.6 0 0 1-2.1.9l-4.6-1.7M12 2.5v3M8.6 3.4l1 2.4M15.4 3.4l-1 2.4" /></svg>
    case 'qr': return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM6 6h2v2H6zM16 6h2v2h-2zM6 16h2v2H6zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" /></svg>
    case 'link': return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="m9.5 14.5 5-5M7.2 17.8l-1 .9a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M16.8 6.2l1-.9a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" /></svg>
    case 'family': return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M12 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 20v-4a4 4 0 0 1 8 0v4M2 19v-3a3 3 0 0 1 4-2.8M22 19v-3a3 3 0 0 0-4-2.8" /></svg>
    case 'friends': return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20v-1.5a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4V20M17 4.5a3.5 3.5 0 0 1 0 6.6M22 20v-1.5a4 4 0 0 0-3-3.8" /></svg>
    case 'baseball': return <svg viewBox="0 0 24 24" aria-hidden="true"><circle {...c} cx="12" cy="12" r="9" /><path {...c} d="M5.5 5.5c2.2 1.6 3.5 4 3.5 6.5s-1.3 4.9-3.5 6.5M18.5 5.5c-2.2 1.6-3.5 4-3.5 6.5s1.3 4.9 3.5 6.5M8 9.5l1.4.6M8 14.5l1.4-.6M16 9.5l-1.4.6M16 14.5l-1.4-.6" /></svg>
    case 'book': return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M12 6c-1.6-1.4-4-2-8-2v14c4 0 6.4.6 8 2 1.6-1.4 4-2 8-2V4c-4 0-6.4.6-8 2ZM12 6v14" /></svg>
    case 'hands': return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M12 3v6M12 9 8.5 5.5a1.6 1.6 0 0 0-2.3 2.2L9 11.5 7 18a2.5 2.5 0 0 0 2.3 3H12M12 9l3.5-3.5a1.6 1.6 0 0 1 2.3 2.2L15 11.5l2 6.5a2.5 2.5 0 0 1-2.3 3H12M9.5 21v-4M14.5 21v-4" /></svg>
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
