'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Register() {
  const [step, setStep] = useState(1)
  const [bandId, setBandId] = useState('')
  const [bandInfo, setBandInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
const [form, setForm] = useState({
    name: '', city: '', state: '', country: '', prayer: '', verse: '', email: ''
  })

  function formatBandId(val: string) {
    let v = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (v.length > 2) v = 'PB-' + v.slice(2)
    if (v.length > 8) v = v.slice(0, 8) + '-' + v.slice(8)
    return v.slice(0, 11)
  }

  async function lookupBand() {
    if (bandId.length < 8) { setError('Please enter a complete band ID'); return }
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

    // Get previous registrations
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
    setStep(3)
    setLoading(false)
  }

  const lastReg = bandInfo?.registrations?.[bandInfo.registrations.length - 1]
  const giverName = lastReg?.user_name || 'Someone'

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#e8f4fd,#fdf6e3,#dcf2e6)',fontFamily:'sans-serif'}}>
      <nav style={{background:'rgba(255,255,255,0.9)',borderBottom:'2px solid #c8e6f7',padding:'0 40px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',backdropFilter:'blur(8px)'}}>
        <a href="/" style={{fontFamily:'Georgia,serif',fontSize:'20px',fontWeight:'700',color:'#1a5fa0',textDecoration:'none'}}>✝ PrayerBands</a>
      </nav>

      <div style={{maxWidth:'560px',margin:'0 auto',padding:'48px 24px 80px'}}>

        {/* Progress */}
        <div style={{display:'flex',alignItems:'center',marginBottom:'40px'}}>
          {['Band ID','Your Prayer','Done'].map((label,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',flex:i<2?1:undefined}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'6px'}}>
                <div style={{width:'28px',height:'28px',borderRadius:'50%',background:step>i+1?'#4caf7d':step===i+1?'#2b7bc4':'#e2eaf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',color:step>=i+1?'#fff':'#8896a8'}}>
                  {step>i+1?'✓':i+1}
                </div>
                <span style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.1em',textTransform:'uppercase',color:step===i+1?'#2b7bc4':'#8896a8'}}>{label}</span>
              </div>
              {i<2&&<div style={{flex:1,height:'2px',background:step>i+1?'#4caf7d':'#e2eaf4',margin:'0 8px',marginBottom:'20px'}}></div>}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step===1&&(
          <div style={{background:'#fff',borderRadius:'20px',boxShadow:'0 20px 60px rgba(26,95,160,0.15)',overflow:'hidden',border:'1.5px solid #e2eaf4'}}>
            <div style={{background:'#0d3d6e',padding:'32px',textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'180px',opacity:'0.05',pointerEvents:'none'}}>✝</div>
              <div style={{fontSize:'12px',fontWeight:'700',letterSpacing:'0.25em',textTransform:'uppercase',color:'rgba(255,255,255,0.45)',marginBottom:'10px'}}>PrayerBands.com</div>
              <h1 style={{fontFamily:'Georgia,serif',fontSize:'26px',color:'#fff',marginBottom:'8px',fontWeight:'400'}}>Someone gave you this band</h1>
              <p style={{fontSize:'15px',color:'rgba(255,255,255,0.6)',fontStyle:'italic'}}>There's a reason. Enter the ID to find out.</p>
            </div>
            <div style={{padding:'32px'}}>
              {error&&<div style={{background:'#fde8ec',border:'1px solid rgba(232,82,106,0.3)',color:'#c0392b',padding:'12px 16px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px'}}>{error}</div>}
              <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',color:'#8896a8',marginBottom:'8px'}}>Band ID — found inside your wristband</label>
              <div style={{display:'flex',gap:'0',borderRadius:'12px',overflow:'hidden',boxShadow:'0 2px 8px rgba(26,95,160,0.1)',marginBottom:'12px'}}>
                <input
                  value={bandId}
                  onChange={e=>setBandId(formatBandId(e.target.value))}
                  onKeyDown={e=>e.key==='Enter'&&lookupBand()}
                  placeholder="PB-XXXXX"
                  style={{flex:1,background:'#f7f3ee',border:'2px solid #e2eaf4',borderRight:'none',color:'#1e2a38',padding:'15px 18px',fontFamily:'monospace',fontSize:'20px',letterSpacing:'0.2em',outline:'none',borderRadius:'12px 0 0 12px'}}
                />
                <button onClick={lookupBand} disabled={loading} style={{background:'#f5a623',color:'#fff',border:'none',padding:'15px 24px',fontSize:'14px',fontWeight:'700',cursor:'pointer',borderRadius:'0 12px 12px 0'}}>
                  {loading?'…':'Find It ✝'}
                </button>
              </div>
              <div style={{fontSize:'13px',color:'#8896a8',textAlign:'center',fontStyle:'italic'}}>The unique code printed inside the band</div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step===2&&(
          <div style={{background:'#fff',borderRadius:'20px',boxShadow:'0 20px 60px rgba(26,95,160,0.15)',overflow:'hidden',border:'1.5px solid #e2eaf4'}}>
            <div style={{background:'linear-gradient(160deg,#0d3d6e,#1a5fa0,#1aabaa)',padding:'40px 36px',textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{fontSize:'48px',color:'#f5a623',marginBottom:'16px',display:'block'}}>✝</div>
              <div style={{fontSize:'12px',fontWeight:'700',letterSpacing:'0.25em',textTransform:'uppercase',color:'rgba(255,255,255,0.5)',marginBottom:'10px'}}>This band was given to you with intention</div>
              <h1 style={{fontFamily:'Georgia,serif',fontSize:'28px',color:'#fff',marginBottom:'6px',fontWeight:'700'}}><span style={{color:'#f5a623'}}>{giverName}</span> is praying for you</h1>
              <p style={{fontSize:'15px',color:'rgba(255,255,255,0.65)',fontStyle:'italic'}}>From {lastReg?.city||'somewhere'} — they gave you this band as a prayer</p>
            </div>

            {lastReg?.prayer&&(
              <div style={{padding:'28px 36px',borderBottom:'1px solid #e2eaf4'}}>
                <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',color:'#f5a623',marginBottom:'12px'}}>Their Prayer for You</div>
                <div style={{display:'flex',gap:'12px',marginBottom:'14px'}}>
                  <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#f5a623,#e8526a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:'900',color:'#fff',flexShrink:0}}>{giverName[0]}</div>
                  <div>
                    <div style={{fontSize:'14px',fontWeight:'700',color:'#1e2a38'}}>{giverName}</div>
                    <div style={{fontSize:'12px',color:'#8896a8'}}>{lastReg?.city&&lastReg?.country?`${lastReg.city}, ${lastReg.country}`:''}</div>
                  </div>
                </div>
                <div style={{fontFamily:'Georgia,serif',fontSize:'17px',fontStyle:'italic',color:'#4a5568',lineHeight:'1.75',padding:'14px 18px',borderLeft:'3px solid #f5a623',background:'rgba(245,166,35,0.04)',borderRadius:'0 10px 10px 0'}}>
                  "{lastReg.prayer}"
                </div>
                {lastReg?.verse&&<div style={{fontSize:'13px',color:'#1aabaa',fontWeight:'700',marginTop:'8px',textAlign:'right'}}>{lastReg.verse}</div>}
              </div>
            )}

            {!lastReg?.prayer&&(
              <div style={{padding:'24px 36px',borderBottom:'1px solid #e2eaf4'}}>
                <div style={{background:'#e8f4fd',border:'1.5px solid #c8e6f7',borderRadius:'12px',padding:'18px 20px',display:'flex',gap:'12px',alignItems:'flex-start'}}>
                  <div style={{fontSize:'24px',flexShrink:0}}>🤍</div>
                  <div style={{fontSize:'15px',color:'#4a5568',lineHeight:'1.6'}}><strong>{giverName}</strong> gave you this band as an act of prayer. The band itself is the message — you are being prayed over.</div>
                </div>
              </div>
            )}

            <div style={{padding:'28px 36px'}}>
              <h2 style={{fontFamily:'Georgia,serif',fontSize:'20px',color:'#1a5fa0',marginBottom:'6px'}}>Add Yourself to the Journey</h2>
              <p style={{fontSize:'14px',color:'#8896a8',marginBottom:'24px'}}>That's all this is. Let the band know you received it. No prayer required — being here is enough.</p>

              {error&&<div style={{background:'#fde8ec',border:'1px solid rgba(232,82,106,0.3)',color:'#c0392b',padding:'12px 16px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px'}}>{error}</div>}

              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#8896a8',marginBottom:'7px'}}>Your Name</label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="First name or Anonymous" style={{width:'100%',background:'#f7f3ee',border:'2px solid #e2eaf4',color:'#1e2a38',padding:'12px 14px',borderRadius:'10px',fontFamily:'sans-serif',fontSize:'16px',outline:'none'}}/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'16px'}}>
  <div>
    <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#8896a8',marginBottom:'7px'}}>City</label>
    <input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Nashville" style={{width:'100%',background:'#f7f3ee',border:'2px solid #e2eaf4',color:'#1e2a38',padding:'12px 14px',borderRadius:'10px',fontFamily:'sans-serif',fontSize:'16px',outline:'none'}}/>
  </div>
  <div>
    <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#8896a8',marginBottom:'7px'}}>State / Province</label>
    <input value={form.state} onChange={e=>setForm({...form,state:e.target.value})} placeholder="TN" style={{width:'100%',background:'#f7f3ee',border:'2px solid #e2eaf4',color:'#1e2a38',padding:'12px 14px',borderRadius:'10px',fontFamily:'sans-serif',fontSize:'16px',outline:'none'}}/>
  </div>
  <div>
    <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#8896a8',marginBottom:'7px'}}>Country</label>
    <input value={form.country} onChange={e=>setForm({...form,country:e.target.value})} placeholder="USA" style={{width:'100%',background:'#f7f3ee',border:'2px solid #e2eaf4',color:'#1e2a38',padding:'12px 14px',borderRadius:'10px',fontFamily:'sans-serif',fontSize:'16px',outline:'none'}}/>
  </div>
</div>

              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#8896a8',marginBottom:'7px'}}>Want to pass a prayer forward? <span style={{color:'#b0bec5',fontWeight:'400'}}>(optional)</span></label>
                <textarea value={form.prayer} onChange={e=>setForm({...form,prayer:e.target.value})} placeholder="Lord, whoever receives this next — may they know they are not alone…" style={{width:'100%',background:'#f7f3ee',border:'2px solid #e2eaf4',color:'#1e2a38',padding:'12px 14px',borderRadius:'10px',fontFamily:'Georgia,serif',fontSize:'16px',fontStyle:'italic',outline:'none',resize:'vertical',minHeight:'110px',lineHeight:'1.7'}}/>
              </div>

              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#8896a8',marginBottom:'7px'}}>Scripture Verse <span style={{color:'#b0bec5',fontWeight:'400'}}>(optional)</span></label>
                <input value={form.verse} onChange={e=>setForm({...form,verse:e.target.value})} placeholder='e.g. "Philippians 4:13"' style={{width:'100%',background:'#f7f3ee',border:'2px solid #e2eaf4',color:'#1e2a38',padding:'12px 14px',borderRadius:'10px',fontFamily:'sans-serif',fontSize:'16px',outline:'none'}}/>
              </div>

              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#8896a8',marginBottom:'7px'}}>Email — for journey alerts <span style={{color:'#b0bec5',fontWeight:'400'}}>(optional)</span></label>
                <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} type="email" placeholder="you@email.com" style={{width:'100%',background:'#f7f3ee',border:'2px solid #e2eaf4',color:'#1e2a38',padding:'12px 14px',borderRadius:'10px',fontFamily:'sans-serif',fontSize:'16px',outline:'none'}}/>
              </div>

              <button onClick={submitRegistration} disabled={loading} style={{width:'100%',background:'linear-gradient(135deg,#2b7bc4,#1aabaa)',color:'#fff',border:'none',padding:'17px',borderRadius:'12px',fontSize:'17px',fontWeight:'700',cursor:'pointer',boxShadow:'0 4px 20px rgba(43,123,196,0.35)'}}>
                {loading?'Registering…':'I Received This Band ✝'}
              </button>
              <div style={{textAlign:'center',fontSize:'12px',color:'#b0bec5',marginTop:'12px'}}>Your approximate location is recorded from your IP to map this band's journey.</div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step===3&&(
          <div style={{background:'#fff',borderRadius:'20px',boxShadow:'0 20px 60px rgba(26,95,160,0.15)',padding:'48px 36px',textAlign:'center',border:'2px solid #4caf7d'}}>
            <div style={{fontSize:'56px',color:'#4caf7d',marginBottom:'16px',display:'block'}}>✝</div>
            <h1 style={{fontFamily:'Georgia,serif',fontSize:'28px',color:'#1a5fa0',marginBottom:'8px',fontWeight:'700'}}>You're Part of the Journey</h1>
            <p style={{fontSize:'17px',color:'#4a5568',fontStyle:'italic',marginBottom:'32px',lineHeight:'1.7',maxWidth:'400px',margin:'0 auto 32px'}}>"And let us run with perseverance the race marked out for us." — Hebrews 12:1</p>
            <div style={{display:'flex',flexDirection:'column',gap:'10px',maxWidth:'360px',margin:'0 auto'}}>
              <a href={`/band/${bandId}`} style={{display:'block',textAlign:'center',background:'#2b7bc4',color:'#fff',padding:'15px 24px',borderRadius:'10px',fontSize:'15px',fontWeight:'700',textDecoration:'none'}}>View This Band's Full Journey ✝</a>
              <a href="/shop" style={{display:'block',textAlign:'center',border:'2px solid #e2eaf4',color:'#8896a8',padding:'13px 24px',borderRadius:'10px',fontSize:'14px',fontWeight:'700',textDecoration:'none'}}>Get Your Own Band to Give Away</a>
              <a href="/" style={{display:'block',textAlign:'center',color:'#8896a8',padding:'12px',fontSize:'14px',textDecoration:'none'}}>Return Home</a>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}