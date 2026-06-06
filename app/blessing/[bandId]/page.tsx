'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
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
  { ref: "Psalm 121:1-2", text: "I lift up my eyes to the mountains — where does my help come from? My help comes from the Lord, the Maker of heaven and earth.", category: "trust" },
  { ref: "Lamentations 3:22-23", text: "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.", category: "hope" },
  { ref: "Romans 8:38-39", text: "For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God.", category: "love" },
  { ref: "Psalm 27:1", text: "The Lord is my light and my salvation — whom shall I fear? The Lord is the stronghold of my life — of whom shall I be afraid?", category: "fear" },
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
  { id: 'all', label: 'Today\'s Verse', icon: '✝' },
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
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return filtered[dayOfYear % filtered.length]
}

export default function BlessingPage() {
  const params = useParams()
  const bandId = params?.bandId as string
  const [bandInfo, setBandInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [verse, setVerse] = useState(getDailyVerse())
  const [verseVisible, setVerseVisible] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (!bandId) return
    async function load() {
      const { data: band } = await supabase
        .from('bands')
        .select('*')
        .eq('band_id', bandId)
        .single()

      const { data: regs } = await supabase
        .from('registrations')
        .select('*')
        .eq('band_id', bandId)
        .order('registered_at', { ascending: true })

      setBandInfo({ band, registrations: regs || [] })
      setLoading(false)
    }
    load()
  }, [bandId])

  function selectCategory(cat: string) {
    setVerseVisible(false)
    setTimeout(() => {
      setCategory(cat)
      setVerse(getVerseForCategory(cat))
      setVerseVisible(true)
    }, 300)
  }

  const firstReg = bandInfo?.registrations?.[0]
  const totalPeople = bandInfo?.registrations?.length || 0
  const countries = [...new Set((bandInfo?.registrations || []).map((r: any) => r.country).filter(Boolean))].length

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#fdf8f0',fontFamily:'sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'48px',color:'#C8A96E',marginBottom:'16px'}}>✝</div>
        <div style={{fontSize:'16px',color:'#9B7B62'}}>Loading your blessing...</div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#fdf8f0',fontFamily:'Georgia,serif',color:'#2C1A0E'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        .playfair { font-family: 'Playfair Display', serif; }
        .lato { font-family: 'Lato', sans-serif; }
        .cat-btn { transition: all 0.2s; cursor: pointer; border: none; }
        .cat-btn:hover { transform: translateY(-2px); }
        .verse-fade { transition: opacity 0.3s ease; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Nav */}
      <nav style={{background:'rgba(253,250,245,0.97)',backdropFilter:'blur(12px)',borderBottom:'1px solid #E8DFD0',padding:'0 32px',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:760,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
          <a href="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none'}}>
            <Logo size={28} />
            <span className="playfair" style={{fontSize:17,fontWeight:600,color:'#2C1A0E'}}>PrayerBands</span>
          </a>
          <a href={`/band/${bandId}`} className="lato" style={{fontSize:12,letterSpacing:'0.12em',textTransform:'uppercase',color:'#9B7B62',textDecoration:'none'}}>View Full Journey →</a>
        </div>
      </nav>

      <div style={{maxWidth:760,margin:'0 auto',padding:'40px 24px 80px'}}>

        {/* Date + band */}
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div className="lato" style={{fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'#C8A96E',marginBottom:'6px'}}>{today}</div>
          <div className="lato" style={{fontSize:12,color:'#C8B49A',letterSpacing:'0.1em'}}>Band {bandId}</div>
        </div>

        {/* Category selector */}
        <div style={{marginBottom:'36px'}}>
          <div className="lato" style={{fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'#9B7B62',textAlign:'center',marginBottom:'16px'}}>
            What do you need today?
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'8px',justifyContent:'center'}}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className="cat-btn"
                onClick={() => selectCategory(cat.id)}
                style={{
                  background: category === cat.id ? '#2C1A0E' : '#fff',
                  color: category === cat.id ? '#FDFAF5' : '#6B4C35',
                  border: category === cat.id ? '1.5px solid #2C1A0E' : '1.5px solid #E8DFD0',
                  padding: '8px 16px',
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontFamily: 'Lato, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Verse card */}
        <div
          className="verse-fade"
          style={{
            opacity: verseVisible ? 1 : 0,
            background: '#fff',
            border: '1px solid #E8DFD0',
            borderTop: '4px solid #C8A96E',
            borderRadius: '12px',
            padding: '40px 36px',
            textAlign: 'center',
            marginBottom: '28px',
            boxShadow: '0 4px 24px rgba(44,26,14,0.08)',
          }}
        >
          <div style={{fontSize:'32px',marginBottom:'20px'}}>✝</div>
          <p className="playfair" style={{fontSize:'clamp(18px,3vw,24px)',fontStyle:'italic',lineHeight:1.8,color:'#2C1A0E',marginBottom:'20px',maxWidth:'560px',margin:'0 auto 20px'}}>
            "{verse.text}"
          </p>
          <div className="lato" style={{fontSize:'14px',fontWeight:'700',letterSpacing:'0.12em',color:'#C8A96E',textTransform:'uppercase'}}>
            {verse.ref}
          </div>
        </div>

        {/* Band journey mini stats */}
        {bandInfo && totalPeople > 0 && (
          <div style={{background:'#F5EFE4',borderRadius:'12px',padding:'20px 24px',marginBottom:'28px',display:'flex',gap:'24px',justifyContent:'center',flexWrap:'wrap'}}>
            <div style={{textAlign:'center'}}>
              <div className="playfair" style={{fontSize:'28px',fontWeight:'700',color:'#C8A96E'}}>{totalPeople}</div>
              <div className="lato" style={{fontSize:'11px',letterSpacing:'0.12em',textTransform:'uppercase',color:'#9B7B62',marginTop:'2px'}}>People</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div className="playfair" style={{fontSize:'28px',fontWeight:'700',color:'#C8A96E'}}>{countries}</div>
              <div className="lato" style={{fontSize:'11px',letterSpacing:'0.12em',textTransform:'uppercase',color:'#9B7B62',marginTop:'2px'}}>Countries</div>
            </div>
            {firstReg && (
              <div style={{textAlign:'center'}}>
                <div className="playfair" style={{fontSize:'28px',fontWeight:'700',color:'#C8A96E'}}>{firstReg.city || '✝'}</div>
                <div className="lato" style={{fontSize:'11px',letterSpacing:'0.12em',textTransform:'uppercase',color:'#9B7B62',marginTop:'2px'}}>Started In</div>
              </div>
            )}
          </div>
        )}

        {/* Original prayer */}
        {firstReg?.prayer && (
          <div style={{background:'#fff',border:'1px solid #E8DFD0',borderLeft:'4px solid #C8A96E',borderRadius:'0 12px 12px 0',padding:'24px 28px',marginBottom:'28px'}}>
            <div className="lato" style={{fontSize:'11px',letterSpacing:'0.2em',textTransform:'uppercase',color:'#C8A96E',marginBottom:'12px'}}>
              The First Prayer — {firstReg.user_name || 'Anonymous'}
            </div>
            <p className="playfair" style={{fontSize:'17px',fontStyle:'italic',color:'#4A2E1A',lineHeight:1.8}}>
              "{firstReg.prayer}"
            </p>
            {firstReg.verse && (
              <div className="lato" style={{fontSize:'13px',color:'#7BAE8E',fontWeight:'700',marginTop:'10px'}}>📖 {firstReg.verse}</div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <a href={`/register?id=${bandId}`} style={{display:'block',textAlign:'center',background:'#2C1A0E',color:'#FDFAF5',padding:'15px 24px',borderRadius:'8px',textDecoration:'none',fontFamily:'Lato,sans-serif',fontSize:'13px',fontWeight:'700',letterSpacing:'0.1em',textTransform:'uppercase'}}>
            Pass This Band On ✝
          </a>
          <a href={`/band/${bandId}`} style={{display:'block',textAlign:'center',border:'1.5px solid #E8DFD0',color:'#9B7B62',padding:'13px 24px',borderRadius:'8px',textDecoration:'none',fontFamily:'Lato,sans-serif',fontSize:'13px',fontWeight:'700',letterSpacing:'0.1em',textTransform:'uppercase'}}>
            View Full Journey
          </a>
          <a href="/prayer-wall" style={{display:'block',textAlign:'center',color:'#C8A96E',padding:'12px',textDecoration:'none',fontFamily:'Lato,sans-serif',fontSize:'13px',letterSpacing:'0.08em'}}>
            Visit the Prayer Wall →
          </a>
        </div>

      </div>
    </div>
  )
}