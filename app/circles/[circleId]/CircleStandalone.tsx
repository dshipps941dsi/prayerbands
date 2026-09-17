'use client'

import { useRouter } from 'next/navigation'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'
import CircleRoom from '@/components/CircleRoom'

// The circle room on its own page — only for people who cannot be sent into
// the band app: guests looking in with an invite code, and members who do
// not hold a band yet. Same room, same behaviour, a thin shell around it.
export default function CircleStandalone({ circleId, code }: { circleId: string; code: string | null }) {
  const router = useRouter()
  const leave = () => router.push('/circles')
  return (
    <div style={{ minHeight: '100vh', background: '#F6F1E4', paddingBottom: 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(14px + env(safe-area-inset-top, 0px)) 20px 14px', borderBottom: '1px solid rgba(10,22,40,0.1)', background: '#FFFDF8' }}>
        <PrayerBandsLogo size={26} color="#C8A96E" />
        <span style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#15223B', fontWeight: 700 }}>Prayer Bands</span>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '18px 16px 0' }}>
        <CircleRoom circleId={circleId} code={code} onBack={leave} onLeft={leave} />
      </div>
    </div>
  )
}
