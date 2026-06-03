'use client'
import { useState, useEffect, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'

function RegisterInner() {
  const [step, setStep] = useState(1)
  const [bandId, setBandId] = useState('')
  const [bandInfo, setBandInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', city: '', state: '', country: '', prayer: '', verse: '', email: ''
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      const id = url.searchParams.get('id')
      if (id && id.length > 0 && id !== 'undefined') {
        setBandId(id.toUpperCase())
      }
    }
  }, [])

  function formatBandId(val: string) {
    let v = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (v.length > 2) v = 'PB-' + v.slice(2)
    return v.slice(0, 8)
  }

  async function lookupBand() {
    if (bandId.length < 7) { setError('Please enter a complete band ID'); return }
    setLoading(true)
    setError('')
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error: err } = await supabase
      .from('bands')
      .select('*')
      .eq('band_id', bandId)
      .single()

    if (err || !data) {
      setError('Band not found. Check the ID on your wristband.')
      setLoading(false)
      return
    }

    const { data: regs } = await supabase
      .from('registrations')
      .select('*')
      .eq('band_id', bandId)
      .order('registered_at', { ascending: true })

    setBandInfo({ band: data, registrations: regs || [] })
    setStep(2)
    setLoading(false)
  }

  async function submitRegistration() {
    if (!form.name.trim()) { setError('Please enter your name'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/register-band', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bandId, ...form })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Something went wrong'); setLoading(false); return }
    localStorage.setItem(`registered_${bandId}`, 'true')
    setStep(3)
    setLoading(false)
  }

  const lastReg = bandInfo?.registrations?.[bandInfo.registrations.length - 1]
  const giverName = lastReg?.user_name || 'Someone'

  const inputStyle: any = {
    width: '100%', background: '#FDFAF5', border: '1px solid #E8DFD0',
    color: '#2C1A0E', padding: '12px 14px', borderRadius: '6px',
    fontFamily: 'Lato, sans-serif', fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
  }

  const labelStyle: any = {
    display: 'block', fontSize: '11px', fontWeight: '700',
    letterSpacing: '0.15em', textTransform: 'uppercase',
    color: '#9B7B62', marginBottom: '7px', fontFamily: 'Lato, sans-serif',
  }

  return (
    <div style={{minHeight:'100vh',background:'#FDFAF5',fontFamily:'Georgia,serif',color:'#2C1A0E'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        .playfair { font-family: 'Playfair Display', serif; }
        .lato { font-family: 'Lato', sans-serif; }
        * { box-sizing: border-box; }
        input:focus, textarea:focus { border-color: #C8A96E !important; }
      `}</style>

      <nav style={{background:'rgba(253,250,245,0.97)',backdropFilter:'blur(12px)',borderBottom:'1px solid #E8DFD0',padding:'0 32px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <a href="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none'}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:'#C8A96E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#fff'}}>✝</div>
          <span className="playfair" style={{fontSize:17,fontWeight:600,color:'#2C1A0E'}}>PrayerBands</span>
        </a>
        <a href="/store" className="lato" style={{fontSize:12,letterSpacing:'0.12em',textTransform:'uppercase',color:'#9B7B62',textDecoration:'none'}}>Get a Band →</a>
      </nav>

      <div style={{maxWidth:'560px',margin:'0 auto',padding:'40px 24px 120px'}}>

        {/* Progress */}
        <div style={{display:'flex',alignItems:'center',marginBottom:'36px'}}>
          {['Band ID','Your Prayer','Done'].map((label,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',flex:i<2?1:undefined}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'6px'}}>
                <div style={{width:'28px',height:'28px',borderRadius:'50%',background:step>i+1?'#7BAE8E':step===i+1?'#C8A96E':'#E8DFD0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',color:step>=i+1?'#fff':'#9B7B62',fontFamily:'Lato,sans-serif'}}>
                  {step>i+1?'✓':i+1}
                </div>
                <span className="lato" style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.1em',textTransform:'uppercase',color:step===i+1?'#C8A96E':'#C8B49A'}}>{label}</span>
              </div>
              {i<2&&<div style={{flex:1,height:'1px',background:step>i+1?'#7BAE8E':'#E8DFD0',margin:'0 8px',marginBottom:'20px'}}></div>}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step===1&&(
          <div style={{background:'#fff',borderRadius:'12px',overflow:'hidden',border:'1px solid #E8DFD0',boxShadow:'0 4px 24px rgba(44,26,14,0.07)'}}>
            <div style={{background:'linear-gradient(160deg,#2C1A0E,#4A2E1A)',padding:'40px 32px',textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'180px',opacity:'0.05',pointerEvents:'none'}}>✝</div>
              <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'0.25em',textTransform:'uppercase',color:'#C8A96E',marginBottom:'10px',fontFamily:'Lato,sans-serif'}}>PrayerBands.com</div>
              <h1 className="playfair" style={{fontSize:'28px',color:'#FDFAF5',marginBottom:'8px',fontWeight:'600'}}>Someone gave you this band</h1>
              <p style={{fontSize:'15px',color:'rgba(253,250,245,0.55)',fontStyle:'italic',margin:0,fontFamily:'Lato,sans-serif'}}>There is a reason. Enter the ID to find out.</p>
            </div>
            <div style={{padding:'32px'}}>
              {error&&<div style={{background:'#fde8ec',border:'1px solid rgba(174,123,123,0.3)',color:'#AE7B7B',padding:'12px 16px',borderRadius:'6px',marginBottom:'16px',fontSize:'14px',fontFamily:'Lato,sans-serif'}}>{error}</div>}
              <label style={labelStyle}>Band ID — found inside your wristband</label>
              <div style={{display:'flex',borderRadius:'8px',overflow:'hidden',border:'1px solid #E8DFD0',marginBottom:'12px'}}>
                <input
                  value={bandId}
                  onChange={e=>setBandId(formatBandId(e.target.value))}
                  onKeyDown={e=>e.key==='Enter'&&lookupBand()}
                  placeholder="PB-XXXXX"
                  style={{flex:1,background:'#FDFAF5',border:'none',color:'#2C1A0E',padding:'14px 18px',fontFamily:'monospace',fontSize:'20px',letterSpacing:'0.2em',outline:'none',minWidth:0}}
                />
                <button onClick={lookupBand} disabled={loading} style={{background:'#C8A96E',color:'#fff',border:'none',padding:'14px 22px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Lato,sans-serif',letterSpacing:'0.1em',textTransform:'uppercase',whiteSpace:'nowrap'}}>
                  {loading?'…':'Find It ✝'}
                </button>
              </div>
              <div className="lato" style={{fontSize:'13px',color:'#C8B49A',textAlign:'center',fontStyle:'italic'}}>The unique code printed inside the band</div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step===2&&(
          <div style={{background:'#fff',borderRadius:'12px',overflow:'hidden',border:'1px solid #E8DFD0',boxShadow:'0 4px 24px rgba(44,26,14,0.07)'}}>
            <div style={{background:'linear-gradient(160deg,#2C1A0E,#4A2E1A)',padding:'40px 32px',textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'180px',opacity:'0.05',pointerEvents:'none'}}>✝</div>
              <div style={{fontSize:'44px',color:'#C8A96E',marginBottom:'14px'}}>✝</div>
              <div className="lato" style={{fontSize:'11px',fontWeight:'700',letterSpacing:'0.25em',textTransform:'uppercase',color:'rgba(253,250,245,0.45)',marginBottom:'8px'}}>This band was given to you with intention</div>
              <h1 className="playfair" style={{fontSize:'28px',color:'#FDFAF5',marginBottom:'6px',fontWeight:'600'}}>
                <span style={{color:'#C8A96E'}}>{giverName}</span> is praying for you
              </h1>
              <p style={{fontSize:'14px',color:'rgba(253,250,245,0.55)',fontStyle:'italic',margin:0,fontFamily:'Lato,sans-serif'}}>
                From {lastReg?.city||'somewhere'} — they gave you this band as a prayer
              </p>
            </div>

            {lastReg?.prayer&&(
              <div style={{padding:'24px 28px',borderBottom:'1px solid #F5EFE4'}}>
                <div className="lato" style={{fontSize:'11px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',color:'#C8A96E',marginBottom:'12px'}}>Their Prayer for You</div>
                <div style={{display:'flex',gap:'12px',marginBottom:'12px'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'#C8A96E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',fontWeight:'900',color:'#fff',flexShrink:0,fontFamily:'Lato,sans-serif'}}>{giverName[0]}</div>
                  <div>
                    <div className="lato" style={{fontSize:'14px',fontWeight:'700',color:'#2C1A0E'}}>{giverName}</div>
                    <div className="lato" style={{fontSize:'12px',color:'#9B7B62'}}>{lastReg?.city&&lastReg?.country?`${lastReg.city}, ${lastReg.country}`:''}</div>
                  </div>
                </div>
                <div className="playfair" style={{fontSize:'17px',fontStyle:'italic',color:'#4A2E1A',lineHeight:'1.75',padding:'14px 18px',borderLeft:'3px solid #C8A96E',background:'rgba(200,169,110,0.05)',borderRadius:'0 8px 8px 0'}}>
                  "{lastReg.prayer}"
                </div>
                {lastReg?.verse&&<div className="lato" style={{fontSize:'13px',color:'#7BAE8E',fontWeight:'700',marginTop:'8px',textAlign:'right'}}>{lastReg.verse}</div>}
              </div>
            )}

            {!lastReg?.prayer&&(
              <div style={{padding:'20px 28px',borderBottom:'1px solid #F5EFE4'}}>
                <div style={{background:'#F5EFE4',border:'1px solid #E8DFD0',borderRadius:'10px',padding:'16px 20px',display:'flex',gap:'10px',alignItems:'flex-start'}}>
                  <div style={{fontSize:'22px',flexShrink:0}}>🤍</div>
                  <div className="lato" style={{fontSize:'15px',color:'#6B4C35',lineHeight:'1.6'}}><strong>{giverName}</strong> gave you this band as an act of prayer. The band itself is the message — you are being prayed over.</div>
                </div>
              </div>
            )}

            <div style={{padding:'28px'}}>
              <h2 className="playfair" style={{fontSize:'22px',color:'#2C1A0E',marginBottom:'6px'}}>Add Yourself to the Journey</h2>
              <p className="lato" style={{fontSize:'14px',color:'#9B7B62',marginBottom:'24px',fontWeight:'300'}}>No prayer required — being here is enough.</p>

              {error&&<div style={{background:'#fde8ec',border:'1px solid rgba(174,123,123,0.3)',color:'#AE7B7B',padding:'12px 16px',borderRadius:'6px',marginBottom:'16px',fontSize:'14px',fontFamily:'Lato,sans-serif'}}>{error}</div>}

              <div style={{marginBottom:'16px'}}>
                <label style={labelStyle}>Your Name</label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="First name or Anonymous" style={inputStyle}/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
                <div>
                  <label style={labelStyle}>City</label>
                  <input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Nashville" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>State / Province</label>
                  <input value={form.state} onChange={e=>setForm({...form,state:e.target.value})} placeholder="TN" style={inputStyle}/>
                </div>
              </div>

              <div style={{marginBottom:'16px'}}>
                <label style={labelStyle}>Country</label>
                <input value={form.country} onChange={e=>setForm({...form,country:e.target.value})} placeholder="USA" style={inputStyle}/>
              </div>

              <div style={{marginBottom:'16px'}}>
                <label style={labelStyle}>Pass a Prayer Forward <span style={{color:'#C8B49A',fontWeight:'400',textTransform:'none',letterSpacing:0}}>(optional)</span></label>
                <textarea value={form.prayer} onChange={e=>setForm({...form,prayer:e.target.value})} placeholder="Lord, whoever receives this next — may they know they are not alone…" style={{...inputStyle,fontFamily:'Playfair Display,Georgia,serif',fontStyle:'italic',resize:'vertical',minHeight:'100px',lineHeight:'1.7'}}/>
              </div>

              <div style={{marginBottom:'16px'}}>
                <label style={labelStyle}>Scripture Verse <span style={{color:'#C8B49A',fontWeight:'400',textTransform:'none',letterSpacing:0}}>(optional)</span></label>
                <input value={form.verse} onChange={e=>setForm({...form,verse:e.target.value})} placeholder='e.g. "Philippians 4:13"' style={inputStyle}/>
              </div>

              <div style={{marginBottom:'24px'}}>
                <label style={labelStyle}>Email — for journey alerts <span style={{color:'#C8B49A',fontWeight:'400',textTransform:'none',letterSpacing:0}}>(optional)</span></label>
                <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} type="email" placeholder="you@email.com" style={inputStyle}/>
              </div>

              <button
                onClick={submitRegistration}
                disabled={loading}
                style={{width:'100%',background:'#2C1A0E',color:'#FDFAF5',border:'none',padding:'16px',borderRadius:'8px',fontSize:'14px',fontWeight:'700',cursor:'pointer',fontFamily:'Lato,sans-serif',letterSpacing:'0.12em',textTransform:'uppercase',display:'block',boxSizing:'border-box'}}
              >
                {loading?'Registering…':'I Received This Band ✝'}
              </button>
              <div className="lato" style={{textAlign:'center',fontSize:'12px',color:'#C8B49A',marginTop:'12px',paddingBottom:'8px'}}>Your approximate location is recorded from your IP to map this band's journey.</div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step===3&&(
          <div style={{background:'#fff',borderRadius:'12px',padding:'48px 32px',textAlign:'center',border:'1px solid #E8DFD0',boxShadow:'0 4px 24px rgba(44,26,14,0.07)',borderTop:'4px solid #7BAE8E'}}>
            <div style={{fontSize:'52px',color:'#7BAE8E',marginBottom:'16px'}}>✝</div>
            <h1 className="playfair" style={{fontSize:'28px',color:'#2C1A0E',marginBottom:'8px',fontWeight:'600'}}>You're Part of the Journey</h1>
            <p className="playfair" style={{fontSize:'17px',color:'#6B4C35',fontStyle:'italic',marginBottom:'32px',lineHeight:'1.7',maxWidth:'380px',margin:'0 auto 32px'}}>"And let us run with perseverance the race marked out for us." — Hebrews 12:1</p>
            <div style={{display:'flex',flexDirection:'column',gap:'10px',maxWidth:'340px',margin:'0 auto'}}>
              <a href={`/band/${bandId}`} style={{display:'block',textAlign:'center',background:'#2C1A0E',color:'#FDFAF5',padding:'15px 24px',borderRadius:'8px',fontSize:'13px',fontWeight:'700',textDecoration:'none',fontFamily:'Lato,sans-serif',letterSpacing:'0.1em',textTransform:'uppercase'}}>View This Band's Full Journey ✝</a>
              <a href="/store" style={{display:'block',textAlign:'center',border:'1px solid #E8DFD0',color:'#9B7B62',padding:'13px 24px',borderRadius:'8px',fontSize:'13px',fontWeight:'700',textDecoration:'none',fontFamily:'Lato,sans-serif',letterSpacing:'0.1em',textTransform:'uppercase'}}>Get Your Own Band to Give Away</a>
              <a href="/" style={{display:'block',textAlign:'center',color:'#C8A96E',padding:'12px',fontSize:'13px',textDecoration:'none',fontFamily:'Lato,sans-serif'}}>Return Home</a>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function Register() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FDFAF5',fontFamily:'sans-serif',textAlign:'center'}}>
        <div>
          <div style={{fontSize:'48px',color:'#C8A96E',marginBottom:'16px'}}>✝</div>
          <div style={{fontSize:'16px',color:'#9B7B62'}}>Loading...</div>
        </div>
      </div>
    }>
      <RegisterInner />
    </Suspense>
  )
}