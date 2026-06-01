'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

function getFlag(country: string) {
  const flags: any = {
    'United States': '🇺🇸', 'USA': '🇺🇸', 'Brazil': '🇧🇷',
    'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'South Africa': '🇿🇦',
    'Kenya': '🇰🇪', 'Nigeria': '🇳🇬', 'Germany': '🇩🇪',
    'France': '🇫🇷', 'Australia': '🇦🇺', 'Canada': '🇨🇦',
    'Philippines': '🇵🇭', 'Mexico': '🇲🇽', 'India': '🇮🇳',
  }
  return flags[country] || '🌍'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BandJourney() {
  const params = useParams()
  const bandId = params.bandId as string
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!bandId) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function load() {
      // Check band exists
      const { data: band } = await supabase
        .from('bands')
        .select('*')
        .eq('band_id', bandId)
        .single()

      if (!band) { setNotFound(true); setLoading(false); return }

      // Get all registrations
      const { data: regs } = await supabase
        .from('registrations')
        .select('*')
        .eq('band_id', bandId)
        .order('registered_at', { ascending: true })

      setRegistrations(regs || [])
      setLoading(false)
    }
    load()
  }, [bandId])

  const countries = [...new Set(registrations.map(r => r.country).filter(Boolean))]
  const first = registrations[0]

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f6ff',fontFamily:'sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'48px',color:'#f5a623',marginBottom:'16px'}}>✝</div>
        <div style={{fontSize:'16px',color:'#4a5568'}}>Loading journey...</div>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f6ff',fontFamily:'sans-serif',textAlign:'center',padding:'24px'}}>
      <div>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>🔍</div>
        <h1 style={{fontFamily:'Georgia,serif',fontSize:'24px',color:'#1a5fa0',marginBottom:'8px'}}>Band Not Found</h1>
        <p style={{color:'#8896a8',marginBottom:'24px'}}>Check the band ID and try again.</p>
        <a href="/" style={{background:'#2b7bc4',color:'#fff',padding:'12px 24px',borderRadius:'10px',textDecoration:'none',fontWeight:'700'}}>Go Home</a>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#e8f4fd,#fdf6e3,#dcf2e6)',fontFamily:'sans-serif'}}>
      {/* Nav */}
      <nav style={{background:'rgba(255,255,255,0.9)',borderBottom:'2px solid #c8e6f7',padding:'0 40px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',backdropFilter:'blur(8px)'}}>
        <a href="/" style={{fontFamily:'Georgia,serif',fontSize:'20px',fontWeight:'700',color:'#1a5fa0',textDecoration:'none'}}>✝ PrayerBands</a>
        <a href={`/register?id=${bandId}`} style={{background:'#f5a623',color:'#fff',padding:'8px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:'700',textDecoration:'none'}}>I Have This Band ✝</a>
      </nav>

      <div style={{maxWidth:'720px',margin:'0 auto',padding:'40px 24px 80px'}}>

        {/* Band header */}
        <div style={{background:'linear-gradient(135deg,#0d3d6e,#2b7bc4,#1aabaa)',borderRadius:'20px',padding:'32px 36px',color:'#fff',marginBottom:'28px',boxShadow:'0 16px 48px rgba(26,95,160,0.2)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',right:'28px',top:'50%',transform:'translateY(-50%)',fontSize:'140px',opacity:'0.05',lineHeight:'1'}}>✝</div>
          <div style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.25em',textTransform:'uppercase',opacity:'0.6',marginBottom:'8px'}}>✝ Prayer Band Journey</div>
          <div style={{fontFamily:'monospace',fontSize:'clamp(24px,5vw,40px)',color:'#f5a623',letterSpacing:'0.12em',marginBottom:'4px'}}>{bandId}</div>
          {first&&<div style={{fontSize:'14px',opacity:'0.7',fontStyle:'italic',marginBottom:'24px'}}>
            Originated {formatDate(first.registered_at)}{first.city?` · ${first.city}`:''}{first.country?`, ${first.country}`:''}
          </div>}
          <div style={{display:'flex',gap:'28px',flexWrap:'wrap',paddingTop:'20px',borderTop:'1px solid rgba(255,255,255,0.15)'}}>
            <div>
              <div style={{fontFamily:'Georgia,serif',fontSize:'36px',fontWeight:'700',lineHeight:'1'}}>{registrations.length}</div>
              <div style={{fontSize:'10px',opacity:'0.6',letterSpacing:'0.12em',textTransform:'uppercase',marginTop:'3px'}}>People</div>
            </div>
            <div>
              <div style={{fontFamily:'Georgia,serif',fontSize:'36px',fontWeight:'700',lineHeight:'1'}}>{countries.length}</div>
              <div style={{fontSize:'10px',opacity:'0.6',letterSpacing:'0.12em',textTransform:'uppercase',marginTop:'3px'}}>Countries</div>
            </div>
            <div>
              <div style={{fontFamily:'Georgia,serif',fontSize:'36px',fontWeight:'700',lineHeight:'1'}}>{countries.map(getFlag).join(' ')||'—'}</div>
              <div style={{fontSize:'10px',opacity:'0.6',letterSpacing:'0.12em',textTransform:'uppercase',marginTop:'3px'}}>Flags</div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',color:'#1aabaa',marginBottom:'20px'}}>The Journey — Every Prayer</div>

        <div style={{position:'relative',paddingLeft:'36px'}}>
          {/* Timeline line */}
          <div style={{position:'absolute',left:'10px',top:'0',bottom:'0',width:'2px',background:'linear-gradient(to bottom,#f5a623,#1aabaa,#e8526a)',borderRadius:'2px'}}></div>

          {registrations.length === 0 && (
            <div style={{background:'#fff',borderRadius:'14px',padding:'32px',textAlign:'center',border:'1.5px solid #e2eaf4'}}>
              <div style={{fontSize:'32px',marginBottom:'12px',opacity:'0.4'}}>✝</div>
              <div style={{fontFamily:'Georgia,serif',fontSize:'18px',color:'#1a5fa0',marginBottom:'8px'}}>The Journey Begins With You</div>
              <p style={{fontSize:'14px',color:'#8896a8',marginBottom:'20px'}}>No one has registered this band yet. Be the first.</p>
              <a href={`/register?id=${bandId}`} style={{background:'#2b7bc4',color:'#fff',padding:'12px 24px',borderRadius:'10px',textDecoration:'none',fontWeight:'700',fontSize:'14px'}}>Register This Band ✝</a>
            </div>
          )}

          {registrations.map((reg, i) => {
            const colors = ['#f5a623','#2b7bc4','#e8526a','#4caf7d','#1aabaa','#7c5cbf']
            const color = colors[i % colors.length]
            return (
              <div key={reg.id} style={{position:'relative',marginBottom:'28px',opacity:0,animation:`fadeUp 0.5s ${i*0.1}s forwards`}}>
                {/* Dot */}
                <div style={{position:'absolute',left:'-32px',top:'6px',width:i===0?'16px':'12px',height:i===0?'16px':'12px',borderRadius:'50%',background:color,border:'2px solid #fff',boxShadow:`0 0 8px ${color}50`,marginLeft:i===0?'-2px':'0'}}></div>

                <div style={{background:'#fff',borderRadius:'14px',padding:'20px',border:'1.5px solid #e2eaf4',boxShadow:'0 2px 8px rgba(26,95,160,0.08)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'20px'}}>{getFlag(reg.country)}</span>
                    <span style={{fontSize:'13px',fontWeight:'700',letterSpacing:'0.08em',textTransform:'uppercase',color:'#2b7bc4'}}>
                      {[reg.city, reg.state, reg.country].filter(Boolean).join(', ') || 'Location unknown'}
                    </span>
                    <span style={{fontSize:'12px',color:'#8896a8'}}>{formatDate(reg.registered_at)}</span>
                    {reg.user_name&&<span style={{fontSize:'12px',color:'#8896a8',marginLeft:'auto'}}>— {reg.user_name}</span>}
                    {i===0&&<span style={{background:'#fff3d6',color:'#d4891a',fontSize:'10px',fontWeight:'700',padding:'2px 8px',borderRadius:'100px',border:'1px solid rgba(245,166,35,0.3)'}}>✝ Origin</span>}
                  </div>
                  {reg.prayer&&(
                    <div style={{fontFamily:'Georgia,serif',fontSize:'16px',fontStyle:'italic',color:'#4a5568',lineHeight:'1.75',padding:'12px 16px',borderLeft:`3px solid ${color}`,background:`${color}08`,borderRadius:'0 8px 8px 0',marginBottom:'8px'}}>
                      "{reg.prayer}"
                    </div>
                  )}
                  {!reg.prayer&&(
                    <div style={{fontSize:'14px',color:'#b0bec5',fontStyle:'italic'}}>
                      Received this band — no prayer left
                    </div>
                  )}
                  {reg.verse&&<div style={{fontSize:'13px',color:'#1aabaa',fontWeight:'700',marginTop:'6px'}}>{reg.verse}</div>}
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        {registrations.length > 0 && (
          <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginTop:'8px'}}>
            <a href={`/register?id=${bandId}`} style={{flex:1,display:'block',textAlign:'center',background:'#2b7bc4',color:'#fff',padding:'15px 24px',borderRadius:'10px',fontSize:'15px',fontWeight:'700',textDecoration:'none',minWidth:'200px'}}>
              I Have This Band ✝
            </a>
            <button onClick={()=>{navigator.clipboard?.writeText(window.location.href);alert('Link copied!')}} style={{flex:1,display:'block',textAlign:'center',background:'#fff',color:'#2b7bc4',padding:'15px 24px',borderRadius:'10px',fontSize:'15px',fontWeight:'700',border:'2px solid #e2eaf4',cursor:'pointer',minWidth:'200px'}}>
              Share This Journey ↗
            </button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}