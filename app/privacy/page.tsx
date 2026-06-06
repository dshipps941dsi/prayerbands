import Logo from "@/components/Logo";

export default function PrivacyPolicy() {
  return (
    <div style={{minHeight:'100vh',background:'#fdf8f0',fontFamily:'Georgia,serif',color:'#2C1A0E'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');
        .playfair { font-family: 'Playfair Display', serif; }
        .lato { font-family: 'Lato', sans-serif; }
        * { box-sizing: border-box; }
        h2 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 600; margin: 36px 0 12px; color: #2C1A0E; }
        p { font-family: 'Lato', sans-serif; font-size: 15px; line-height: 1.8; color: #6B4C35; margin-bottom: 16px; font-weight: 300; }
        ul { font-family: 'Lato', sans-serif; font-size: 15px; line-height: 1.8; color: #6B4C35; margin: 0 0 16px 24px; font-weight: 300; }
        li { margin-bottom: 6px; }
        a { color: #C8A96E; }
      `}</style>

      <nav style={{background:'rgba(253,250,245,0.97)',borderBottom:'1px solid #E8DFD0',padding:'0 32px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a href="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none'}}>
          <Logo size={28} />
          <span className="playfair" style={{fontSize:17,fontWeight:600,color:'#2C1A0E'}}>PrayerBands</span>
        </a>
        <a href="/" className="lato" style={{fontSize:12,letterSpacing:'0.12em',textTransform:'uppercase',color:'#9B7B62',textDecoration:'none'}}>← Back to Home</a>
      </nav>

      <div style={{maxWidth:720,margin:'0 auto',padding:'60px 24px 80px'}}>
        <span className="lato" style={{fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'#C8A96E',display:'block',marginBottom:12}}>Legal</span>
        <h1 className="playfair" style={{fontSize:'clamp(32px,5vw,48px)',fontWeight:700,lineHeight:1.15,marginBottom:8}}>Privacy Policy</h1>
        <div style={{width:48,height:2,background:'#C8A96E',margin:'0 0 12px'}}/>
        <p className="lato" style={{fontSize:13,color:'#C8B49A'}}>Last updated: June 2025</p>

        <h2>Who We Are</h2>
        <p>PrayerBands.com is a faith-based ministry platform. Our mission is to connect people through prayer via physical silicone wristbands with unique IDs. We are based in the United States.</p>
        <p>For privacy questions, contact us at: <a href="mailto:hello@prayerbands.com">hello@prayerbands.com</a></p>

        <h2>What Information We Collect</h2>
        <p>When you register a band or create an account, we may collect:</p>
        <ul>
          <li>Your name (first name or anonymous — your choice)</li>
          <li>Your approximate location (city, state, country)</li>
          <li>Your email address (optional — only if you want journey alerts)</li>
          <li>A prayer or scripture verse you choose to leave (optional)</li>
          <li>Your IP address (used only to determine your approximate geographic location)</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>To display your name and prayer on the band's journey page</li>
          <li>To send you journey alert emails when your band reaches a new person (only if you provided your email)</li>
          <li>To show the band's travel path on a map</li>
          <li>To display prayers publicly on the Prayer Wall (anonymous option available)</li>
        </ul>

        <h2>Browser Storage (localStorage)</h2>
        <p>We use your browser's localStorage — a form of local storage on your device — to remember whether you have previously registered a specific band. This allows us to show you a personalized Daily Verse experience when you tap your band again, instead of showing the registration form.</p>
        <p>This data is stored only on your device and is never transmitted to our servers. It contains only a simple flag (e.g. "registered_PB-XXXXX = true"). You can clear this at any time by clearing your browser's site data.</p>
        <p>We do not use advertising cookies or third-party tracking cookies.</p>

        <h2>Who We Share Your Information With</h2>
        <p>We do not sell your personal information. We share limited data only with:</p>
        <ul>
          <li><strong>Supabase</strong> — our database provider (stores your registration data securely)</li>
          <li><strong>Resend</strong> — our email provider (sends journey alert emails)</li>
          <li><strong>Stripe</strong> — our payment processor (handles orders; we never see your card details)</li>
          <li><strong>Vercel</strong> — our hosting provider</li>
        </ul>
        <p>All providers are reputable, GDPR-compliant services.</p>

        <h2>Public Information</h2>
        <p>When you register a band, your first name, city, country, and prayer (if provided) become part of that band's public journey page. If you prefer anonymity, you may enter "Anonymous" as your name and omit your prayer.</p>

        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Request deletion of your registration data by emailing us</li>
          <li>Request a copy of data we hold about you</li>
          <li>Opt out of journey alert emails by not providing your email, or by contacting us</li>
          <li>Clear your local browser storage at any time</li>
        </ul>

        <h2>Children</h2>
        <p>PrayerBands is not directed at children under 13. We do not knowingly collect data from children under 13.</p>

        <h2>Changes to This Policy</h2>
        <p>We may update this policy from time to time. We will post the updated date at the top of this page.</p>

        <h2>Contact</h2>
        <p>Questions about your privacy? Email us at <a href="mailto:hello@prayerbands.com">hello@prayerbands.com</a></p>

        <div style={{marginTop:48,padding:'24px 28px',background:'#F5EFE4',borderRadius:12,borderLeft:'4px solid #C8A96E'}}>
          <p className="lato" style={{fontSize:14,color:'#6B4C35',fontStyle:'italic',margin:0,lineHeight:1.7}}>
            ✝ PrayerBands is a ministry platform, not a data company. We collect only what is necessary to make the prayer journey work. Your privacy and your faith are both sacred to us.
          </p>
        </div>
      </div>
    </div>
  )
}