'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Logo from '@/components/Logo'

const VERSES = [
  { ref: "Joshua 1:9", text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", category: "fear" },
  { ref: "Philippians 4:13", text: "I can do all this through him who gives me strength.", category: "strength" },
  { ref: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", category: "hope" },
  { ref: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you.", category: "fear" },
  { ref: "Psalm 23:1-3", text: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.", category: "peace" },
  { ref: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", category: "hope" },
  { ref: "Matthew 11:28", text: "Come to me, all you who are weary and burdened, and I will give you rest.", category: "rest" },
  { ref: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", category: "trust" },
  { ref: "Psalm 46:1", text: "God is our refuge and strength, an ever-present help in trouble.", category: "strength" },
  { ref: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", category: "love" },
  { ref: "Romans 15:13", text: "May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.", category: "hope" },
  { ref: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary.", category: "strength" },
  { ref: "Psalm 34:18", text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", category: "grief" },
  { ref: "2 Corinthians 12:9", text: "My grace is sufficient for you, for my power is made perfect in weakness.", category: "strength" },
  { ref: "Philippians 4:6-7", text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", category: "anxiety" },
  { ref: "John 14:27", text: "Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.", category: "peace" },
  { ref: "Psalm 121:1-2", text: "I lift up my eyes to the mountains -- where does my help come from? My help comes from the Lord, the Maker of heaven and earth.", category: "trust" },
  { ref: "Lamentations 3:22-23", text: "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.", category: "hope" },
  { ref: "Romans 8:38-39", text: "For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God.", category: "love" },
  { ref: "Psalm 27:1", text: "The Lord is my light and my salvation -- whom shall I fear? The Lord is the stronghold of my life -- of whom shall I be afraid?", category: "fear" },
  { ref: "1 Peter 5:7", text: "Cast all your anxiety on him because he cares for you.", category: "anxiety" },
  { ref: "Hebrews 11:1", text: "Now faith is confidence in what we hope for and assurance about what we do not see.", category: "faith" },
  { ref: "Psalm 139:14", text: "I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.", category: "identity" },
  { ref: "James 1:2-3", text: "Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance.", category: "strength" },
  { ref: "Nahum 1:7", text: "The Lord is good, a refuge in times of trouble. He cares for those who trust in him.", category: "trust" },
  { ref: "Isaiah 43:2", text: "When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you.", category: "fear" },
  { ref: "Psalm 91:1-2", text: "Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the Lord, He is my refuge and my fortress, my God, in whom I trust.", category: "trust" },
  { ref: "Colossians 3:15", text: "Let the peace of Christ rule in your hearts, since as members of one body you were called to peace. And be thankful.", category: "peace" },
  { ref: "Zephaniah 3:17", text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.", category: "love" },
  { ref: "2 Timothy 1:7", text: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.", category: "fear" },
  { ref: "Psalm 55:22", text: "Cast your cares on the Lord and he will sustain you; he will never let the righteous be shaken.", category: "anxiety" },
  { ref: "Matthew 6:34", text: "Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.", category: "anxiety" },
  { ref: "Psalm 73:26", text: "My flesh and my heart may fail, but God is the strength of my heart and my portion forever.", category: "health" },
  { ref: "Jeremiah 17:14", text: "Heal me, Lord, and I will be healed; save me and I will be saved, for you are the one I praise.", category: "health" },
  { ref: "3 John 1:2", text: "Dear friend, I pray that you may enjoy good health and that all may go well with you, even as your soul is getting along well.", category: "health" },
  { ref: "Psalm 147:3", text: "He heals the brokenhearted and binds up their wounds.", category: "grief" },
  { ref: "John 11:25", text: "Jesus said to her, I am the resurrection and the life. The one who believes in me will live, even though they die.", category: "grief" },
  { ref: "Revelation 21:4", text: "He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain.", category: "grief" },
  { ref: "Psalm 16:8", text: "I keep my eyes always on the Lord. With him at my right hand, I will not be shaken.", category: "peace" },
  { ref: "Romans 5:3-4", text: "We also glory in our sufferings, because we know that suffering produces perseverance; perseverance, character; and character, hope.", category: "hope" },
  { ref: "Isaiah 26:3", text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you.", category: "peace" },
  { ref: "Psalm 37:4", text: "Take delight in the Lord, and he will give you the desires of your heart.", category: "trust" },
  { ref: "Mark 16:15", text: "Go into all the world and preach the gospel to all creation.", category: "purpose" },
  { ref: "Ephesians 2:10", text: "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.", category: "purpose" },
  { ref: "Micah 6:8", text: "He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.", category: "purpose" },
  { ref: "1 Corinthians 13:4-5", text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking.", category: "love" },
  { ref: "Proverbs 17:17", text: "A friend loves at all times, and a brother is born for a time of adversity.", category: "relationships" },
  { ref: "Ecclesiastes 4:9-10", text: "Two are better than one, because they have a good return for their labor: If either of them falls down, one can help the other up.", category: "relationships" },
  { ref: "Psalm 100:4-5", text: "Enter his gates with thanksgiving and his courts with praise; give thanks to him and praise his name. For the Lord is good and his love endures forever.", category: "gratitude" },
  { ref: "1 Thessalonians 5:18", text: "Give thanks in all circumstances; for this is God's will for you in Christ Jesus.", category: "gratitude" },
  { ref: "Philippians 4:11", text: "I have learned, in whatsoever state I am, therewith to be content.", category: "gratitude" },
  { ref: "Psalm 22:24", text: "For he has not despised or scorned the suffering of the afflicted one; he has not hidden his face from him but has listened to his cry for help.", category: "loneliness" },
  { ref: "Deuteronomy 31:6", text: "Be strong and courageous. Do not be afraid or terrified because of them, for the Lord your God goes with you; he will never leave you nor forsake you.", category: "loneliness" },
  { ref: "Hebrews 13:5", text: "Keep your lives free from the love of money and be content with what you have, because God has said, Never will I leave you; never will I forsake you.", category: "loneliness" },
]

const CATEGORIES = [
  { id: 'all', label: "Today's Verse", icon: '✝' },
  { id: 'fear', label: 'Fear', icon: '🛡' },
  { id: 'anxiety', label: 'Anxiety', icon: '🌊' },
  { id: 'hope', label: 'Hope', icon: '🌅' },
  { id: 'strength', label: 'Strength', icon: '⚡' },
  { id: 'peace', label: 'Peace', icon: '🕊' },
  { id: 'grief', label: 'Grief', icon: '🤍' },
  { id: 'health', label: 'Health', icon: '🙏' },
  { id: 'loneliness', label: 'Loneliness', icon: '💛' },
  { id: 'love', label: 'Love', icon: '❤️' },
  { id: 'purpose', label: 'Purpose', icon: '🌟' },
  { id: 'gratitude', label: 'Gratitude', icon: '🌿' },
  { id: 'trust', label: 'Trust', icon: '⚓' },
  { id: 'relationships', label: 'Relationships', icon: '🤝' },
]

function getDailyVerse() {
  const start = new Date(new Date().getFullYear(), 0, 0)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return VERSES[dayOfYear % VERSES.length]
}

function getVerseForCategory(category: string) {
  if (category === 'all') return getDailyVerse()
  const filtered = VERSES.filter(v => v.category === category)
  if (filtered.length === 0) return getDailyVerse()
  const start = new Date(new Date().getFullYear(), 0, 0)
  const diff = new Date().getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return filtered[dayOfYear % filtered.length]
}

type Registration = {
  id: string
  user_name: string
  city: string
  country: string
  registered_at: string
  prayer: string
  user_id: string | null
}

type BandStatus = {
  screen: 'personal_space' | 'incoming_transfer' | 'first_tap_gift' | 'journey' | 'first_tap_blank' | 'not_found' | 'loading'
  reason?: string
  band?: any
  registrations?: Registration[]
  currentHolder?: Registration
  transfer?: any
  senderName?: string
  dedicatorName?: string
}

const GOLD  = '#B8860B'
const GREEN = '#1a4a3a'
const NAVY  = '#1a2a4a'
const DARK  = '#2C1810'
const CREAM = '#FAF6EF'
const GRAY  = '#7A6A5A'
const serif = "'Playfair Display', Georgia, serif"
const body  = "'Lora', Georgia, serif"

function Avatar({ letter, color, size = 44 }: { letter: string; color: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif, fontSize: size * 0.4, fontWeight: 700, color: 'white', flexShrink: 0 }}>
      {letter}
    </div>
  )
}

const AVATAR_COLORS = [GOLD, GREEN, NAVY, '#5B4FCF', '#C0392B', '#2E7D6B', '#8B4513']
function avatarColor(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

function ClaimForm({ onSubmit, onBack, title, subtitle, submitLabel, claimName, setClaimName, claimPrayer, setClaimPrayer, claimCity, setClaimCity, claimState, setClaimState, claimCountry, setClaimCountry, submitting }: {
  onSubmit: () => void
  onBack?: () => void
  title: string
  subtitle: string
  submitLabel: string
  claimName: string
  setClaimName: (v: string) => void
  claimPrayer: string
  setClaimPrayer: (v: string) => void
  claimCity: string
  setClaimCity: (v: string) => void
  claimState: string
  setClaimState: (v: string) => void
  claimCountry: string
  setClaimCountry: (v: string) => void
  submitting: boolean
}) {
  return (
    <div style={{ margin: '16px 20px', background: 'white', borderRadius: 16, padding: '24px', border: '1px solid rgba(44,24,16,0.1)', boxShadow: '0 4px 20px rgba(44,24,16,0.06)' }}>
      {onBack && <button onClick={onBack} style={{ background: 'none', border: 'none', color: GRAY, fontFamily: body, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16 }}>← Back</button>}
      <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 20 }}>{subtitle}</div>
      <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Your name *</label>
      <input value={claimName} onChange={e => setClaimName(e.target.value)} placeholder="First name or full name" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 15, color: DARK, background: CREAM, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>City *</label>
          <input value={claimCity} onChange={e => setClaimCity(e.target.value)} placeholder="City" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>State / Province *</label>
          <input value={claimState} onChange={e => setClaimState(e.target.value)} placeholder="State" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>
      <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Country *</label>
      <input value={claimCountry} onChange={e => setClaimCountry(e.target.value)} placeholder="Country" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 15, color: DARK, background: CREAM, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }} />
      <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Your prayer (optional)</label>
      <textarea value={claimPrayer} onChange={e => setClaimPrayer(e.target.value)} placeholder="A prayer, a verse, or what this moment means to you..." rows={4} style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, marginBottom: 20, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }} />
      <button onClick={onSubmit} disabled={submitting || !claimName.trim() || !claimCity.trim() || !claimCountry.trim()} style={{ display: 'block', width: '100%', padding: 15, background: claimName.trim() ? GOLD : '#ccc', color: '#0f0d09', border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: claimName.trim() ? 'pointer' : 'not-allowed' }}>
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  )
}

export default function BandPage() {
  const params = useParams()
  const router = useRouter()
  const bandId = (params?.bandId as string)?.toUpperCase()

  const [status, setStatus] = useState<BandStatus>({ screen: 'loading' })
  const [userId, setUserId] = useState<string | null>(null)
  const [claimName, setClaimName] = useState('')
  const [claimCity, setClaimCity] = useState('')
  const [claimState, setClaimState] = useState('')
  const [claimCountry, setClaimCountry] = useState('')
  const [claimPrayer, setClaimPrayer] = useState('')
  const [claimStep, setClaimStep] = useState<'prompt' | 'form' | 'done'>('prompt')
  const [transferNote, setTransferNote] = useState('')
  const [transferStep, setTransferStep] = useState<'idle' | 'sheet' | 'pending'>('idle')
  const [transferComplete, setTransferComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null)
  const [verseCategory, setVerseCategory] = useState('all')
  const [prayers, setPrayers] = useState<any[]>([])
  const [prayerTitle, setPrayerTitle] = useState('')
  const [prayerBody, setPrayerBody] = useState('')
  const [prayerStep, setPrayerStep] = useState<'list' | 'form' | 'answer'>('list')
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [testimony, setTestimony] = useState('')
  const [prayerSubmitting, setPrayerSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (!bandId) return
    const localHolder = localStorage.getItem(`holder_${bandId}`)
    const url = `/api/band-status?id=${bandId}${userId ? `&userId=${userId}` : ''}${localHolder ? '&localHolder=true' : ''}`
    fetch(url).then(r => r.json()).then(data => setStatus(data)).catch(() => setStatus({ screen: 'not_found' }))
  }, [bandId, userId])

  useEffect(() => {
    if (!userId || !bandId) return
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    supabase.from('prayer_requests').select('*').eq('user_id', userId).eq('band_id', bandId)
      .order('created_at', { ascending: false }).then(({ data }) => setPrayers(data ?? []))
  }, [userId, bandId])

  useEffect(() => {
    if (transferStep !== 'pending') return
    const interval = setInterval(() => {
      fetch(`/api/band-status?id=${bandId}${userId ? `&userId=${userId}` : ''}`)
        .then(r => r.json())
        .then(data => {
          if (data.band?.status === 'registered') {
            clearInterval(interval)
            localStorage.removeItem(`holder_${bandId}`)
            setTransferStep('idle')
            setTransferComplete(true)
          }
        })
    }, 5000)
    return () => clearInterval(interval)
  }, [transferStep, bandId, userId])

  async function handleClaim() {
    if (!claimName.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/register-band', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId, name: claimName, city: claimCity, state: claimState, country: claimCountry, prayer: claimPrayer, userId: userId ?? null }),
      })
      localStorage.setItem(`holder_${bandId}`, 'true')
      setClaimStep('done')
      setTimeout(() => {
        fetch(`/api/band-status?id=${bandId}${userId ? `&userId=${userId}` : ''}`)
          .then(r => r.json()).then(data => setStatus(data))
      }, 1500)
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleInitiateTransfer() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/initiate-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId, userId, note: transferNote }),
      })
      if (!res.ok) throw new Error('Transfer failed')
      setTransferStep('pending')
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelTransfer() {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await supabase.from('band_transfers').update({ status: 'cancelled' }).eq('band_id', bandId).eq('status', 'pending')
    await supabase.from('bands').update({ status: 'registered' }).eq('band_id', bandId)
    setTransferStep('idle')
  }

  async function handleAcceptTransfer() {
    if (!claimName.trim()) return
    setSubmitting(true)
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await fetch('/api/register-band', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId, name: claimName, city: claimCity, state: claimState, country: claimCountry, prayer: claimPrayer, userId: userId ?? null }),
      })
      await supabase.from('band_transfers')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('band_id', bandId).eq('status', 'pending')
      await supabase.from('bands').update({ status: 'registered' }).eq('band_id', bandId)
      localStorage.setItem(`holder_${bandId}`, 'true')
      setClaimStep('done')
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function Nav() {
    const currentHolder = status.registrations?.[status.registrations.length - 1]
    return (
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(44,24,16,0.1)', background: 'rgba(250,246,239,0.97)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Logo size={28} withName nameColor={DARK} nameSize={18} />
        <div style={{ textAlign: 'right' }}>
          {status.screen === 'personal_space' && currentHolder?.user_name && (
            <div style={{ fontFamily: serif, fontSize: 13, fontWeight: 600, color: DARK }}>{currentHolder.user_name}</div>
          )}
          <div style={{ fontFamily: body, fontSize: 11, color: GRAY, fontStyle: 'italic' }}>{bandId}</div>
        </div>
      </nav>
    )
  }

  function StatsStrip({ regs }: { regs: Registration[] }) {
    const countries = new Set(regs.map(r => r.country).filter(Boolean)).size
    const prayerCount = regs.filter(r => r.prayer).length
    return (
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid rgba(44,24,16,0.08)' }}>
        {[{ num: regs.length, lbl: 'People' }, { num: countries || '—', lbl: 'Countries' }, { num: prayerCount, lbl: 'Prayers' }].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(44,24,16,0.08)' : 'none' }}>
            <span style={{ display: 'block', fontFamily: serif, fontSize: 20, fontWeight: 700, color: GOLD }}>{s.num}</span>
            <span style={{ display: 'block', fontFamily: body, fontSize: 10, color: GRAY, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>{s.lbl}</span>
          </div>
        ))}
      </div>
    )
  }

  function PendingBanner() {
    return (
      <div style={{ background: `linear-gradient(135deg, ${GREEN}, #2E7D6B)`, padding: '28px 24px', color: 'white', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✝</div>
        <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Waiting for them to tap</div>
        <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 20 }}>Hand the band to the other person and ask them to tap it with their phone.</div>
        <button onClick={handleCancelTransfer} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '10px 20px', fontFamily: body, fontSize: 13, cursor: 'pointer' }}>Cancel transfer</button>
      </div>
    )
  }

  function VerseEngine() {
    const verse = getVerseForCategory(verseCategory)
    return (
      <div style={{ margin: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setVerseCategory(cat.id)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: body, fontSize: 12, fontWeight: 600, background: verseCategory === cat.id ? GOLD : 'white', color: verseCategory === cat.id ? '#0f0d09' : GRAY, boxShadow: '0 1px 4px rgba(44,24,16,0.1)', transition: 'all 0.2s' }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
        <div style={{ background: `linear-gradient(135deg, ${NAVY}, #2c4a8a)`, borderRadius: 14, padding: '24px 20px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontFamily: body, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 12 }}>
            {verseCategory === 'all' ? "Today's Verse" : CATEGORIES.find(c => c.id === verseCategory)?.label}
          </div>
          <div style={{ fontFamily: serif, fontSize: 17, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 12 }}>"{verse.text}"</div>
          <div style={{ fontFamily: body, fontSize: 13, opacity: 0.7, fontWeight: 600 }}>{verse.ref}</div>
        </div>
      </div>
    )
  }

  function PrayerChain({ regs }: { regs: Registration[] }) {
    return (
      <div style={{ padding: '24px 20px' }}>
        <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid rgba(44,24,16,0.08)' }}>Prayer Chain</div>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 22, top: 8, bottom: 8, width: 1, background: 'rgba(44,24,16,0.1)' }} />
          {regs.map((reg, i) => (
            <div key={reg.id} style={{ display: 'flex', gap: 16, marginBottom: 24, position: 'relative' }}>
              <Avatar letter={reg.user_name?.[0]?.toUpperCase() ?? '?'} color={avatarColor(i)} />
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                  <span style={{ fontFamily: serif, fontSize: 15, fontWeight: 600, color: DARK }}>
                    {reg.user_name}
                    {i === 0 && <span style={{ display: 'inline-block', fontSize: 10, fontFamily: body, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, marginLeft: 6, background: 'rgba(184,134,11,0.12)', color: GOLD }}>Origin</span>}
                    {i === regs.length - 1 && i > 0 && <span style={{ display: 'inline-block', fontSize: 10, fontFamily: body, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, marginLeft: 6, background: 'rgba(44,24,16,0.08)', color: GRAY }}>Current</span>}
                  </span>
                  <span style={{ fontFamily: body, fontSize: 11, color: '#9A8A7A' }}>{new Date(reg.registered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {(reg.city || reg.country) && <div style={{ fontFamily: body, fontSize: 12, color: GRAY, marginBottom: 6 }}>📍 {[reg.city, reg.country].filter(Boolean).join(', ')}</div>}
                {reg.prayer && (
                  <>
                    <div style={{ fontFamily: body, fontSize: 13, color: '#3C2C1C', lineHeight: 1.6, fontStyle: 'italic', ...(expandedPrayer !== reg.id ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}) }}>"{reg.prayer}"</div>
                    <button onClick={() => setExpandedPrayer(expandedPrayer === reg.id ? null : reg.id)} style={{ background: 'none', border: 'none', color: GOLD, fontFamily: body, fontSize: 12, cursor: 'pointer', padding: '4px 0' }}>
                      {expandedPrayer === reg.id ? 'Show less' : 'Read full prayer'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function SuccessCard({ title, subtitle }: { title: string; subtitle: string }) {
    const [ageConsent, setAgeConsent] = useState(false)
    const [authMode, setAuthMode] = useState<'prompt' | 'email' | null>(null)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [authError, setAuthError] = useState('')
    const [authSubmitting, setAuthSubmitting] = useState(false)
    const [authDone, setAuthDone] = useState(false)

    async function handleEmailSignUp() {
      if (!ageConsent || !email.trim() || !password.trim()) return
      setAuthSubmitting(true)
      setAuthError('')
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { error } = await supabase.auth.signUp({ email: email.trim(), password: password.trim(), options: { emailRedirectTo: `${window.location.origin}/band/${bandId}` } })
      if (error) { setAuthError(error.message) } else { setAuthDone(true) }
      setAuthSubmitting(false)
    }

    async function handleGoogleSignIn() {
      if (!ageConsent) return
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/band/${bandId}` } })
    }

    if (userId) return null

    return (
      <div>
        <div style={{ margin: '24px 20px', background: `linear-gradient(135deg, ${GREEN}, #2E7D6B)`, borderRadius: 16, padding: '32px 24px', textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🙏</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</div>
          <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', lineHeight: 1.6 }}>{subtitle}</div>
        </div>
        {!authDone && (
          <div style={{ margin: '0 20px 24px', background: 'white', borderRadius: 16, padding: '24px', border: '1px solid rgba(44,24,16,0.1)', boxShadow: '0 4px 20px rgba(44,24,16,0.06)' }}>
            <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Save your place in this journey</div>
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>Create a free account to get your daily verse every time you tap, track your prayers, and follow this band's story.</div>
            <div onClick={() => setAgeConsent(!ageConsent)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, cursor: 'pointer' }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1, border: `2px solid ${ageConsent ? GOLD : 'rgba(44,24,16,0.2)'}`, background: ageConsent ? GOLD : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ageConsent && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>
              <div style={{ fontFamily: body, fontSize: 13, color: DARK, lineHeight: 1.5 }}>I confirm that I am <strong>13 years of age or older</strong>, or I am a parent or guardian creating this account on behalf of a child.</div>
            </div>
            {authMode === null && (
              <div>
                <button onClick={handleGoogleSignIn} disabled={!ageConsent} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '13px', marginBottom: 10, background: ageConsent ? DARK : '#ccc', color: 'white', border: 'none', borderRadius: 10, fontFamily: body, fontSize: 15, fontWeight: 600, cursor: ageConsent ? 'pointer' : 'not-allowed', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: 18 }}>G</span> Continue with Google
                </button>
                <button onClick={async () => {
                  if (!ageConsent) return
                  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                  await supabase.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: `${window.location.origin}/band/${bandId}` } })
                }} disabled={!ageConsent} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  width: '100%', padding: '13px', marginBottom: 10,
                  background: ageConsent ? '#1877F2' : '#ccc', color: 'white',
                  border: 'none', borderRadius: 10, fontFamily: body, fontSize: 15,
                  fontWeight: 600, cursor: ageConsent ? 'pointer' : 'not-allowed',
                  boxSizing: 'border-box',
                }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>f</span> Continue with Facebook
                </button>
                <button onClick={() => { if (ageConsent) setAuthMode('email') }} disabled={!ageConsent} style={{ display: 'block', width: '100%', padding: '13px', background: 'transparent', color: ageConsent ? DARK : '#ccc', border: `1px solid ${ageConsent ? 'rgba(44,24,16,0.2)' : '#eee'}`, borderRadius: 10, fontFamily: body, fontSize: 15, cursor: ageConsent ? 'pointer' : 'not-allowed', boxSizing: 'border-box' }}>
                  Create with email & password
                </button>
              </div>
            )}
            {authMode === 'email' && (
              <div>
                <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 15, color: DARK, background: CREAM, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }} />
                <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 15, color: DARK, background: CREAM, marginBottom: 6, outline: 'none', boxSizing: 'border-box' }} />
                {authError && <div style={{ fontFamily: body, fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{authError}</div>}
                <div style={{ fontFamily: body, fontSize: 12, color: GRAY, marginBottom: 16 }}>Already have an account? <a href="/signin" style={{ color: GOLD }}>Sign in</a></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleEmailSignUp} disabled={authSubmitting || !email.trim() || !password.trim()} style={{ flex: 1, padding: '13px', background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{authSubmitting ? 'Creating...' : 'Create Account ✝'}</button>
                  <button onClick={() => setAuthMode(null)} style={{ padding: '13px 16px', background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Back</button>
                </div>
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: 16, fontFamily: body, fontSize: 12, color: GRAY }}>No account needed to hold a band or leave a prayer.</div>
          </div>
        )}
        {authDone && (
          <div style={{ margin: '0 20px 24px', background: 'white', borderRadius: 16, padding: '20px 24px', border: `1px solid ${GOLD}`, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
            <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Check your email</div>
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, lineHeight: 1.5 }}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</div>
          </div>
        )}
      </div>
    )
  }

  if (status.screen === 'loading') {
    return <div style={{ background: CREAM, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: body, color: GRAY, fontStyle: 'italic' }}>Loading band journey...</div></div>
  }

  if (status.screen === 'not_found') {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }}>
        <Nav />
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✝</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Band not found</div>
          <div style={{ fontFamily: body, fontSize: 14, color: GRAY }}>Check the ID on your wristband and try again.</div>
        </div>
      </div>
    )
  }

  const regs = status.registrations ?? []

  if (status.screen === 'personal_space') {
    return (
      <div style={{ background: CREAM, minHeight: '100vh', fontFamily: body, color: DARK }}>
        <Nav />
        {transferStep === 'pending' && <PendingBanner />}
        {transferComplete && (
          <div style={{ margin: '20px 20px 0', background: `linear-gradient(135deg, ${GREEN}, #2E7D6B)`, borderRadius: 16, padding: '28px 24px', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
            <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Band passed on</div>
            <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20 }}>Your band is now in new hands. The prayer chain continues. ✝</div>
            <a href="/dashboard" style={{ display: 'inline-block', background: GOLD, color: '#0f0d09', padding: '12px 28px', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>Go to Dashboard</a>
          </div>
        )}
        <StatsStrip regs={regs} />
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700 }}>Your Band</div>
              <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginTop: 2 }}>{regs.length === 0 ? 'Just arrived' : 'Held by you'}</div>
            </div>
            {transferStep === 'idle' && (
              <button onClick={() => setTransferStep('sheet')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 10, padding: '10px 18px', fontFamily: serif, fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>↗ Pass On</button>
            )}
          </div>
        </div>
        <VerseEngine />
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(44,24,16,0.08)' }}>
            <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700 }}>Prayer Journal</div>
            {prayerStep === 'list' && userId && <button onClick={() => setPrayerStep('form')} style={{ background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: serif, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>}
          </div>

          {!userId && (
            <div style={{ background: 'white', borderRadius: 10, padding: '16px', border: '1px solid rgba(44,24,16,0.1)', textAlign: 'center' }}>
              <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Track your prayers</div>
              <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 14, lineHeight: 1.5 }}>Create a free account to keep a prayer journal on this band.</div>
              <a href="/signin" style={{ display: 'inline-block', background: GOLD, color: '#0f0d09', padding: '10px 24px', borderRadius: 8, fontFamily: serif, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Create Account ✝</a>
            </div>
          )}

          {userId && (<>
          {prayerStep === 'form' && (
            <div style={{ background: 'white', borderRadius: 12, padding: '20px', border: '1px solid rgba(44,24,16,0.1)', marginBottom: 12 }}>
              <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Prayer title</label>
              <input value={prayerTitle} onChange={e => setPrayerTitle(e.target.value)} placeholder="What are you praying for?" style={{ display: 'block', width: '100%', padding: '10px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }} />
              <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Details (optional)</label>
              <textarea value={prayerBody} onChange={e => setPrayerBody(e.target.value)} placeholder="Share more about this prayer request..." rows={3} style={{ display: 'block', width: '100%', padding: '10px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, marginBottom: 16, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => {
                  if (!prayerTitle.trim()) return
                  setPrayerSubmitting(true)
                  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                  const { data } = await supabase.from('prayer_requests').insert({ user_id: userId, band_id: bandId, title: prayerTitle, body: prayerBody, status: 'active', visibility: 'private' }).select().single()
                  if (data) setPrayers(prev => [data, ...prev])
                  setPrayerTitle(''); setPrayerBody(''); setPrayerStep('list'); setPrayerSubmitting(false)
                }} disabled={prayerSubmitting || !prayerTitle.trim()} style={{ flex: 1, padding: '10px', background: prayerTitle.trim() ? GOLD : '#ccc', color: '#0f0d09', border: 'none', borderRadius: 8, fontFamily: serif, fontSize: 14, fontWeight: 700, cursor: prayerTitle.trim() ? 'pointer' : 'not-allowed' }}>
                  {prayerSubmitting ? 'Saving...' : 'Add Prayer ✝'}
                </button>
                <button onClick={() => setPrayerStep('list')} style={{ padding: '10px 16px', background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
          {prayerStep === 'answer' && answeringId && (
            <div style={{ background: 'white', borderRadius: 12, padding: '20px', border: `1px solid ${GOLD}`, marginBottom: 12 }}>
              <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>God answered this prayer ✝</div>
              <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 14 }}>Share what happened — your testimony encourages others.</div>
              <textarea value={testimony} onChange={e => setTestimony(e.target.value)} placeholder="Share how God answered this prayer..." rows={3} style={{ display: 'block', width: '100%', padding: '10px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, marginBottom: 16, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => {
                  setPrayerSubmitting(true)
                  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                  await supabase.from('prayer_requests').update({ status: 'answered', answered_testimony: testimony, answered_at: new Date().toISOString() }).eq('id', answeringId)
                  setPrayers(prev => prev.map(p => p.id === answeringId ? { ...p, status: 'answered', answered_testimony: testimony } : p))
                  setAnsweringId(null); setTestimony(''); setPrayerStep('list'); setPrayerSubmitting(false)
                }} disabled={prayerSubmitting} style={{ flex: 1, padding: '10px', background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 8, fontFamily: serif, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {prayerSubmitting ? 'Saving...' : 'Mark Answered ✝'}
                </button>
                <button onClick={() => { setPrayerStep('list'); setAnsweringId(null) }} style={{ padding: '10px 16px', background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
          {prayers.length === 0 && prayerStep === 'list' && (
            <div style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '1px dashed rgba(44,24,16,0.15)', textAlign: 'center', fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic' }}>No entries yet — tap + Add to begin ✝</div>
          )}
          {prayerStep === 'list' && prayers.map(p => (
            <div key={p.id} style={{ background: p.status === 'answered' ? 'linear-gradient(135deg, rgba(26,74,58,0.05), white)' : 'white', borderRadius: 12, padding: '16px', marginBottom: 10, border: p.status === 'answered' ? `1px solid ${GREEN}` : '1px solid rgba(44,24,16,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 600, color: DARK, flex: 1 }}>{p.title}</div>
                {p.status === 'answered'
                  ? <span style={{ background: 'rgba(26,74,58,0.12)', color: GREEN, fontFamily: body, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>Answered ✝</span>
                  : <button onClick={() => { setAnsweringId(p.id); setPrayerStep('answer') }} style={{ background: 'rgba(184,134,11,0.1)', color: GOLD, border: 'none', borderRadius: 20, fontFamily: body, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 10px', cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>Mark Answered</button>}
              </div>
              {p.body && <div style={{ fontFamily: body, fontSize: 13, color: GRAY, lineHeight: 1.5, marginBottom: 4 }}>{p.body}</div>}
              {p.answered_testimony && <div style={{ fontFamily: body, fontSize: 13, color: GREEN, fontStyle: 'italic', lineHeight: 1.5, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(26,74,58,0.1)' }}>"{p.answered_testimony}"</div>}
              <div style={{ fontFamily: body, fontSize: 11, color: '#9A8A7A', marginTop: 6 }}>{new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
          ))}
          </>)}
        </div>
        {transferStep === 'sheet' && (
          <div onClick={() => setTransferStep('idle')} style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.4)', zIndex: 150, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: CREAM, borderRadius: '20px 20px 0 0', padding: '28px 24px 48px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(44,24,16,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
              <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Pass This Band On</div>
              <div style={{ fontFamily: body, fontSize: 14, color: GRAY, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>Write a prayer or note for the person you're giving this to.</div>
              <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Your prayer for them (optional)</label>
              <textarea value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="e.g. I'm giving you this band because I've been praying for you..." rows={3} style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: 'white', resize: 'none', marginBottom: 16, outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
              <button onClick={handleInitiateTransfer} disabled={submitting} style={{ display: 'block', width: '100%', padding: 15, background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>{submitting ? 'Setting up...' : 'Ready to hand it off →'}</button>
              <button onClick={() => setTransferStep('idle')} style={{ display: 'block', width: '100%', padding: 12, background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
        <PrayerChain regs={regs} />
        <div style={{ height: 40 }} />
      </div>
    )
  }

  if (status.screen === 'incoming_transfer') {
    return (
      <div style={{ background: CREAM, minHeight: '100vh', fontFamily: body, color: DARK }}>
        <Nav />
        <StatsStrip regs={regs} />
        {claimStep === 'prompt' && (
          <div style={{ margin: '24px 20px', background: `linear-gradient(160deg, ${NAVY}, #2c4a8a)`, borderRadius: 16, padding: '28px 24px', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{status.senderName ? `${status.senderName} is passing this band to you` : 'Someone is passing this band to you'}</div>
            <div style={{ fontFamily: body, fontSize: 14, opacity: 0.8, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>This band has traveled through {regs.length} {regs.length === 1 ? 'person' : 'people'}. Now it's being offered to you.</div>
            {status.transfer?.note && <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px', fontFamily: body, fontSize: 14, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20, textAlign: 'left' }}>"{status.transfer.note}"</div>}
            <button onClick={() => setClaimStep('form')} style={{ display: 'block', width: '100%', padding: 16, background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>Accept this band →</button>
            <button onClick={() => setClaimStep('form')} style={{ display: 'block', width: '100%', padding: 12, background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Just view the journey</button>
          </div>
        )}
        {claimStep === 'form' && <ClaimForm title="You're joining the chain ✝" subtitle="Add your name and a prayer to complete the handoff." submitLabel="Accept & add my prayer ✝" onSubmit={handleAcceptTransfer} onBack={() => setClaimStep('prompt')} claimName={claimName} setClaimName={setClaimName} claimPrayer={claimPrayer} setClaimPrayer={setClaimPrayer} claimCity={claimCity} setClaimCity={setClaimCity} claimState={claimState} setClaimState={setClaimState} claimCountry={claimCountry} setClaimCountry={setClaimCountry} submitting={submitting} />}
        {claimStep === 'done' && <SuccessCard title="The band is yours now" subtitle="You've been added to the prayer chain. Every time you tap this band, you'll see the full journey — and when you're ready, you can pass it on too." />}
        <PrayerChain regs={regs} />
        <div style={{ height: 40 }} />
      </div>
    )
  }

  if (status.screen === 'first_tap_gift') {
    return (
      <div style={{ background: CREAM, minHeight: '100vh', fontFamily: body, color: DARK }}>
        <Nav />
        {claimStep === 'prompt' && (
          <div style={{ margin: '24px 20px', background: 'linear-gradient(135deg, #1a4a3a, #2E7D6B)', borderRadius: 16, padding: '28px 24px', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✝</div>
            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{status.dedicatorName ? `${status.dedicatorName} is praying for you` : 'Someone is praying for you'}</div>
            <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>This band was sent to you as an act of prayer. You are not forgotten.</div>
            {status.band?.dedication_note && <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 16px', fontFamily: body, fontSize: 14, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20, textAlign: 'left' }}>"{status.band.dedication_note}"</div>}
            <button onClick={() => setClaimStep('form')} style={{ display: 'block', width: '100%', padding: 16, background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>This band is mine now →</button>
            <button onClick={() => setClaimStep('form')} style={{ display: 'block', width: '100%', padding: 12, background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Just add a prayer</button>
          </div>
        )}
        {claimStep === 'form' && <ClaimForm title="Join the Journey" subtitle="Your prayer becomes part of this band's story forever." submitLabel="Add my prayer to this band ✝" onSubmit={handleClaim} onBack={() => setClaimStep('prompt')} claimName={claimName} setClaimName={setClaimName} claimPrayer={claimPrayer} setClaimPrayer={setClaimPrayer} claimCity={claimCity} setClaimCity={setClaimCity} claimState={claimState} setClaimState={setClaimState} claimCountry={claimCountry} setClaimCountry={setClaimCountry} submitting={submitting} />}
        {claimStep === 'done' && <SuccessCard title="You're part of this story" subtitle="Your prayer has been woven into this band's journey. When you pass it on, they'll see every prayer that came before — including yours." />}
        <div style={{ height: 40 }} />
      </div>
    )
  }

  if (status.screen === 'journey') {
    return (
      <div style={{ background: CREAM, minHeight: '100vh', fontFamily: body, color: DARK }}>
        <Nav />
        <StatsStrip regs={regs} />
        <div style={{ padding: '24px 20px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: body, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 8 }}>✝ Prayer Band Journey</div>
          <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{bandId}</div>
          <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic' }}>Currently held by {status.currentHolder?.user_name ?? 'someone'} in {status.currentHolder?.city ?? 'the world'}</div>
        </div>
        {claimStep === 'prompt' && (
          <div style={{ margin: '20px 20px 0', background: 'white', borderRadius: 14, padding: '18px 20px', border: `1px solid ${GOLD}`, textAlign: 'center' }}>
            <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Do you now have this band?</div>
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 14 }}>If this band was passed to you, join the chain.</div>
            <button onClick={() => setClaimStep('form')} style={{ padding: '10px 24px', background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 8, fontFamily: serif, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>I now have this band →</button>
          </div>
        )}
        {claimStep === 'form' && <ClaimForm title="Join the Chain" subtitle="Add your name and prayer to continue this band's journey." submitLabel="Join the chain ✝" onSubmit={handleClaim} onBack={() => setClaimStep('prompt')} claimName={claimName} setClaimName={setClaimName} claimPrayer={claimPrayer} setClaimPrayer={setClaimPrayer} claimCity={claimCity} setClaimCity={setClaimCity} claimState={claimState} setClaimState={setClaimState} claimCountry={claimCountry} setClaimCountry={setClaimCountry} submitting={submitting} />}
        {claimStep === 'done' && <SuccessCard title="Welcome to the chain" subtitle="Your prayer has been added. Tap your band any time to see the full journey." />}
        <PrayerChain regs={regs} />
        <div style={{ height: 40 }} />
      </div>
    )
  }

  return (
    <div style={{ background: CREAM, minHeight: '100vh', fontFamily: body, color: DARK }}>
      <Nav />
      {claimStep === 'prompt' && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✝</div>
          <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Welcome to PrayerBands</div>
          <div style={{ fontFamily: body, fontSize: 14, color: GRAY, fontStyle: 'italic', marginBottom: 28, lineHeight: 1.6 }}>This band is beginning its journey. Be the first to add a prayer.</div>
          <button onClick={() => setClaimStep('form')} style={{ padding: '14px 32px', background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Start this band's journey →</button>
        </div>
      )}
      {claimStep === 'form' && <ClaimForm title="Start the Journey" subtitle="Your prayer is the first link in this band's chain." submitLabel="Begin the journey ✝" onSubmit={handleClaim} onBack={() => setClaimStep('prompt')} claimName={claimName} setClaimName={setClaimName} claimPrayer={claimPrayer} setClaimPrayer={setClaimPrayer} claimCity={claimCity} setClaimCity={setClaimCity} claimState={claimState} setClaimState={setClaimState} claimCountry={claimCountry} setClaimCountry={setClaimCountry} submitting={submitting} />}
      {claimStep === 'done' && <SuccessCard title="The journey has begun" subtitle="Your prayer is the first in this band's chain. Every person who holds it next will see what you wrote today." />}
      <div style={{ height: 40 }} />
    </div>
  )
}