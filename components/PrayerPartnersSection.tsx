import Image from 'next/image'
import Link from 'next/link'
import styles from './PrayerPartnersSection.module.css'

// Home page: Prayer Partners. Photo on the left, the pitch and two panels on
// the right. Everything links into the app's Partners tab; the groups shown
// are the kind people make there (Youth Group, Baseball Team…).

const PARTNERS = '/my-band?open=partners'

const methods = [
  { icon: 'tap', title: 'Tap a band', detail: 'Tap your phone to their band, or theirs to yours, and connect on the spot.' },
  { icon: 'qr', title: 'Scan a QR', detail: 'Show yours, they point their camera. Done.' },
  { icon: 'link', title: 'Enter a code', detail: 'Every band carries a code. Type theirs from anywhere.' },
] as const

const groups = ['Family', 'Close Friends', 'Baseball Team', 'Men’s Group']

function Icon({ name }: { name: 'tap' | 'qr' | 'link' | 'users' | 'arrow' }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'tap') return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M7 8 3.7 15.2a2 2 0 0 0 1 2.6l3.5 1.6a2 2 0 0 0 2.7-1l2.1-4.6M17 8l3.3 7.2a2 2 0 0 1-1 2.6l-3.5 1.6a2 2 0 0 1-2.7-1L11 13.8M12 3v4M7.8 4.7l1.7 3M16.2 4.7l-1.7 3" /></svg>
  if (name === 'qr') return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 14h2v2h-2zM19 14h1v3h-3v3h-3v-2M19 19h1v1h-1" /></svg>
  if (name === 'link') return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m9.5 14.5 5-5M7.2 17.8l-1 .9a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M16.8 6.2l1-.9a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" /></svg>
  if (name === 'users') return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 11a3 3 0 1 0 0-6M22 20v-1.5a4 4 0 0 0-3-3.8" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m9 18 6-6-6-6" /></svg>
}

export default function PrayerPartnersSection() {
  return (
    <section id="partners" className={styles.section} aria-labelledby="prayer-partners-title">
      <div className={styles.photo}>
        <Image src="/home/prayer-partners.jpg" alt="Two friends praying together outdoors at sunset" fill sizes="(max-width: 860px) 100vw, 46vw" className={styles.photoImage} />
        <div className={styles.photoShade} />
      </div>

      <div className={styles.content}>
        <p className={styles.eyebrow}>Prayer Partners</p>
        <h2 id="prayer-partners-title">Faith Grows <em>Stronger Together.</em></h2>
        <p className={styles.intro}>Build your trusted prayer network. Connect in person or from anywhere, share requests privately with the people you choose, and encourage one another through consistent prayer.</p>
        <p className={styles.contrast}><b>A partner</b> is one person you pray with. <b>A circle</b> is a group gathered around one need. Most people have both.</p>

        <div className={styles.actions}>
          <Link href={PARTNERS} className={styles.primaryButton}>Invite a prayer partner</Link>
          <Link href="/how-it-works#network" className={styles.textButton}>How it works <span aria-hidden="true">→</span></Link>
        </div>

        <div className={styles.panel}>
          <h3><span>Connect your way</span></h3>
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
          <div className={styles.panelHeader}>
            <div><h3>Groups</h3><p>Sort your partners into private groups, then share a prayer with just one.</p></div>
            <Link href={PARTNERS}>+ Create a group</Link>
          </div>
          <div className={styles.listGrid}>
            {groups.map(g => (
              <Link className={styles.listItem} href={PARTNERS} key={g}>
                <Icon name="users" /><span>{g}</span><Icon name="arrow" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
