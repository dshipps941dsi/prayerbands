import Logo from "@/components/Logo";

export default function PrivacyPolicy() {
  return (
    <div style={{minHeight:'100vh',background:'#F6F1E4',fontFamily:'Inter, sans-serif',color:'#2A3344'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        .cinzel { font-family: 'Cinzel', serif; }
        .cormorant { font-family: 'Cormorant Garamond', serif; }
        * { box-sizing: border-box; }
        h2 { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; margin: 36px 0 12px; color: #15223B; }
        p { font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.8; color: #2A3344; margin-bottom: 16px; font-weight: 300; }
        ul { font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.8; color: #2A3344; margin: 0 0 16px 24px; font-weight: 300; }
        li { margin-bottom: 6px; }
        a { color: #9A7A35; }
        strong { font-weight: 600; color: #15223B; }
      `}</style>

      <nav style={{background:'rgba(246,241,228,0.97)',borderBottom:'1px solid rgba(201,207,214,0.60)',padding:'0 32px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a href="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none'}}>
          <Logo size={28} />
          <span className="cormorant" style={{fontSize:18,fontWeight:600,color:'#15223B'}}>Prayer Bands</span>
        </a>
        <a href="/" className="cinzel" style={{fontSize:10,letterSpacing:'0.14em',textTransform:'uppercase',color:'#5C6573',textDecoration:'none'}}>← Back to Home</a>
      </nav>

      <div style={{maxWidth:720,margin:'0 auto',padding:'60px 24px 80px'}}>
        <span className="cinzel" style={{fontSize:10,letterSpacing:'0.28em',textTransform:'uppercase',color:'#9A7A35',display:'block',marginBottom:12}}>Legal</span>
        <h1 className="cormorant" style={{fontSize:'clamp(32px,5vw,48px)',fontWeight:700,lineHeight:1.15,marginBottom:8,color:'#15223B'}}>Privacy Policy</h1>
        <div style={{width:48,height:2,background:'linear-gradient(90deg, #C8A96E, #E2C98A)',margin:'0 0 12px'}}/>
        <p className="cinzel" style={{fontSize:11,color:'#5C6573',letterSpacing:'0.10em',textTransform:'uppercase'}}>Last updated: August 2026</p>

        <h2>Who We Are</h2>
        <p>PrayerBands.com is a faith-based ministry platform. Our mission is to connect people through prayer via physical wristbands with unique IDs. We are based in the United States.</p>
        <p>For privacy questions, contact us at: <a href="mailto:hello@prayerbands.com">hello@prayerbands.com</a></p>

        <h2>What Information We Collect</h2>
        <p>When you register a band or create an account, we may collect:</p>
        <ul>
          <li>Your name (first name or anonymous — your choice)</li>
          <li>Your approximate location (city, state, country)</li>
          <li>Your email address (optional — only if you want journey alerts)</li>
          <li>A prayer or scripture verse you choose to leave (optional)</li>
          <li>Your IP address — used only to place a rough map pin if you leave the location box blank, and never resolved to a street address</li>
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

        <h2>Analytics</h2>
        <p>We use <strong>Google Analytics</strong> to see how many people visit the site and which pages they read. It is configured not to collect granular location data, so we see a country at most — never your city, and never an address. It does not tell us who you are, and we do not use it to build a profile of you or to follow you onto other websites.</p>
        <p>We do not use advertising cookies, and we do not allow our analytics to be used for ad targeting or personalization. We do not sell or share analytics data with advertisers.</p>
        <p>If you would rather not be counted at all, Google offers an opt-out add-on for most browsers, and any browser setting or extension that blocks analytics will block ours too. Nothing on this site stops working if you do.</p>

        <h2>Who We Share Your Information With</h2>
        <p>We do not sell your personal information. We share limited data only with:</p>
        <ul>
          <li><strong>Supabase</strong> — our database provider (stores your registration data securely)</li>
          <li><strong>Resend</strong> — our email provider (sends journey alert emails)</li>
          <li><strong>Stripe</strong> — our payment processor (handles orders; we never see your card details)</li>
          <li><strong>Vercel</strong> — our hosting provider</li>
          <li><strong>Google Analytics</strong> — anonymous, country-level visit statistics (see Analytics above)</li>
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
        <p>Prayer Bands is not directed at children under 13. We do not knowingly collect data from children under 13.</p>

        <h2>Changes to This Policy</h2>
        <p>We may update this policy from time to time. We will post the updated date at the top of this page.</p>

        <h2>Contact</h2>
        <p>Questions about your privacy? Email us at <a href="mailto:hello@prayerbands.com">hello@prayerbands.com</a></p>

        <div style={{marginTop:48,padding:'24px 28px',background:'#FFFDF8',borderRadius:12,borderLeft:'4px solid #C8A96E',boxShadow:'0 2px 12px rgba(10,22,40,0.06)'}}>
          <p className="cormorant" style={{fontSize:15,color:'#2A3344',fontStyle:'italic',margin:0,lineHeight:1.7}}>
            ✝ Prayer Bands is a ministry platform, not a data company. We collect only what is necessary to make the prayer journey work. Your privacy and your faith are both sacred to us.
          </p>
        </div>
      </div>
    </div>
  )
}