'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Logo from '@/components/Logo'
import { CATEGORIES, getDailyVerse, getVerseForCategory } from '@/lib/verses'

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
    <div style={{minHeight:'100vh',background:'#fdf8f0',fontFamily:"'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",color:'#2C1A0E'}}>
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
            <span className="playfair" style={{fontSize:17,fontWeight:600,color:'#2C1A0E'}}>Prayer Bands</span>
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