'use client'
import { QRCodeCanvas } from 'qrcode.react'

// /fulfill/welcome-qr — print-once QR for the welcome letter.
// Instead of printing the onboarding insert with every shipment, print this
// card (or just the code) and drop it in the box: scanning opens /welcome,
// which now holds the full letter. Rendered at high resolution so it stays
// crisp when printed small.
const URL = 'https://prayerbands.com/welcome'

const NAVY = '#0A1628'
const GOLD = '#C8A96E'
const GOLD_DEEP = '#9A7A35'
const IVORY = '#F7F1E3'

export default function WelcomeQrPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F6F1E4', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        .wq-card { background: ${IVORY}; border: 1px solid rgba(200,169,110,0.38); border-radius: 10px; padding: 28px 30px 26px; text-align: center; width: 100%; max-width: 380px; box-shadow: 0 8px 28px rgba(10,22,40,0.10); }
        .wq-eyebrow { font-family: 'Cinzel', serif; font-size: 10.5px; letter-spacing: 0.3em; text-transform: uppercase; color: ${GOLD_DEEP}; margin: 0 0 10px; }
        .wq-title { font-family: 'Cinzel', serif; font-weight: 700; font-size: 20px; letter-spacing: 0.12em; text-transform: uppercase; color: ${NAVY}; margin: 0 0 18px; }
        .wq-hint { font-size: 14px; line-height: 1.55; color: #574C3B; margin: 18px 0 0; }
        .wq-url { font-family: ui-monospace, monospace; font-size: 12.5px; color: ${GOLD_DEEP}; margin: 10px 0 0; letter-spacing: 0.02em; }
        .wq-print { margin-top: 22px; background: ${NAVY}; color: #F5EDD8; border: 1px solid rgba(200,169,110,0.45); border-radius: 8px; padding: 11px 22px; font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; cursor: pointer; }
        .wq-note { max-width: 380px; font-size: 12.5px; color: #5C6573; line-height: 1.55; margin-top: 14px; text-align: center; }
        @page { size: Letter portrait; margin: 0.5in; }
        @media print {
          body { background: #fff !important; }
          .wq-noprint { display: none !important; }
          .wq-card { box-shadow: none; border: 1px solid #C8A96E; }
        }
      `}</style>

      <div className="wq-card">
        <p className="wq-eyebrow">One Band &nbsp;&bull;&nbsp; Endless Reach</p>
        <p className="wq-title">Welcome</p>
        {/* 720px canvas → sharp even at business-card size. level H tolerates smudges. */}
        <div style={{ display: 'inline-block', background: '#fff', padding: 12, borderRadius: 8, border: '1px solid rgba(10,22,40,0.10)' }}>
          <QRCodeCanvas value={URL} size={720} level="H" bgColor="#ffffff" fgColor={NAVY} marginSize={0} style={{ width: 240, height: 240, display: 'block' }} />
        </div>
        <p className="wq-hint">
          <strong style={{ color: NAVY }}>Scan to begin.</strong><br />
          Point your phone camera here to open your welcome guide &mdash; how to tap your band, and what it can do.
        </p>
        <p className="wq-url">prayerbands.com/welcome</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '18px 0 0', color: GOLD }}>
          <span style={{ width: 40, height: 1, background: 'rgba(200,169,110,0.38)' }} /><span style={{ fontSize: 10, letterSpacing: '0.3em' }}>&#10015;</span><span style={{ width: 40, height: 1, background: 'rgba(200,169,110,0.38)' }} />
        </div>
      </div>

      <div className="wq-noprint" style={{ textAlign: 'center' }}>
        <button className="wq-print" onClick={() => window.print()}>Print this card</button>
        <p className="wq-note">Print once and reuse — every copy opens the same page. If the letter ever changes, only the page updates; the printed code stays valid.</p>
      </div>
    </div>
  )
}
