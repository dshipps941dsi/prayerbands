'use client'
import { useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

// /fulfill/welcome-qr?n=20 — print welcome cards for a shipment.
// Every card carries the same QR (it opens /welcome, the onboarding letter),
// so an order of N bands just needs N copies. Laid out business-card size,
// 10 per Letter sheet with cut lines; ?n= prefills the count (the packing
// station links here with the order's band count).
const URL = 'https://prayerbands.com/welcome'
const PER_PAGE = 10 // 2 columns x 5 rows of 3.5in x 2in cards on Letter

const NAVY = '#0A1628'
const GOLD = '#C8A96E'
const GOLD_DEEP = '#9A7A35'
const IVORY = '#F7F1E3'

export default function WelcomeQrPage() {
  const [n, setN] = useState(1)
  useEffect(() => {
    const q = parseInt(new URLSearchParams(window.location.search).get('n') || '', 10)
    if (q > 0) setN(Math.min(200, q))
  }, [])

  const pages = Math.max(1, Math.ceil(n / PER_PAGE))
  const cards = Array.from({ length: n }, (_, i) => i)

  return (
    <div style={{ minHeight: '100vh', background: '#F6F1E4', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        .wq-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: center; padding: 18px 16px; }
        .wq-input { width: 84px; padding: 9px 10px; border: 1px solid rgba(92,101,115,0.3); border-radius: 8px; font-size: 15px; text-align: center; font-family: 'Inter', sans-serif; }
        .wq-print { background: ${NAVY}; color: #F5EDD8; border: 1px solid rgba(200,169,110,0.45); border-radius: 8px; padding: 10px 20px; font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; cursor: pointer; }
        .wq-note { font-size: 12.5px; color: #5C6573; text-align: center; max-width: 520px; margin: 0 auto 10px; line-height: 1.5; padding: 0 16px; }
        /* Sheet = one Letter page. Cards are exact business-card size so a
           paper cutter along the dashed lines yields a standard 3.5x2 card. */
        .wq-sheet { width: 8.5in; min-height: 11in; margin: 0 auto 24px; background: #fff; padding: 0.5in 0.75in; box-sizing: border-box; display: grid; grid-template-columns: repeat(2, 3.5in); grid-auto-rows: 2in; justify-content: center; box-shadow: 0 8px 28px rgba(10,22,40,0.10); }
        .wq-card { width: 3.5in; height: 2in; box-sizing: border-box; border: 1px dashed rgba(10,22,40,0.28); background: ${IVORY}; display: flex; align-items: center; gap: 0.16in; padding: 0.14in 0.18in; overflow: hidden; }
        .wq-qr { flex: 0 0 auto; background: #fff; padding: 4px; border: 1px solid rgba(10,22,40,0.10); border-radius: 4px; line-height: 0; }
        .wq-txt { min-width: 0; }
        .wq-eyebrow { font-family: 'Cinzel', serif; font-size: 7px; letter-spacing: 0.26em; text-transform: uppercase; color: ${GOLD_DEEP}; margin: 0 0 3px; }
        .wq-title { font-family: 'Cinzel', serif; font-weight: 700; font-size: 12.5px; letter-spacing: 0.1em; text-transform: uppercase; color: ${NAVY}; margin: 0 0 5px; }
        .wq-hint { font-size: 8.6px; line-height: 1.4; color: #574C3B; margin: 0; }
        .wq-url { font-family: ui-monospace, monospace; font-size: 7.6px; color: ${GOLD_DEEP}; margin: 4px 0 0; }
        @page { size: Letter portrait; margin: 0; }
        @media print {
          body { background: #fff !important; }
          .wq-noprint { display: none !important; }
          .wq-sheet { box-shadow: none; margin: 0; page-break-after: always; break-after: page; }
          .wq-sheet:last-child { page-break-after: auto; break-after: auto; }
          .wq-card, .wq-qr, .wq-eyebrow, .wq-title { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="wq-noprint">
        <div className="wq-bar">
          <label style={{ fontSize: 13.5, color: NAVY, fontWeight: 600 }}>Cards to print</label>
          <input className="wq-input" type="number" min={1} max={200} value={n} onChange={e => setN(Math.max(1, Math.min(200, parseInt(e.target.value || '1', 10) || 1)))} />
          <span style={{ fontSize: 12.5, color: '#5C6573' }}>{pages} sheet{pages === 1 ? '' : 's'} · {PER_PAGE} per sheet</span>
          <button className="wq-print" onClick={() => window.print()}>Print {n} card{n === 1 ? '' : 's'}</button>
        </div>
        <p className="wq-note">Every card is the same QR — it opens the welcome guide at <strong>prayerbands.com/welcome</strong>. Print on cardstock, then cut along the dashed lines (standard 3.5&times;2 in). Set the printer to <em>100% / actual size</em>, not &ldquo;fit to page.&rdquo;</p>
      </div>

      {Array.from({ length: pages }, (_, p) => (
        <div className="wq-sheet" key={p}>
          {cards.slice(p * PER_PAGE, (p + 1) * PER_PAGE).map(i => (
            <div className="wq-card" key={i}>
              <div className="wq-qr">
                {/* 480px canvas scaled to ~1.4in prints crisp; level H shrugs off smudges. */}
                <QRCodeCanvas value={URL} size={480} level="H" bgColor="#ffffff" fgColor={NAVY} marginSize={0} style={{ width: '1.4in', height: '1.4in', display: 'block' }} />
              </div>
              <div className="wq-txt">
                <p className="wq-eyebrow">One Band &bull; Endless Reach</p>
                <p className="wq-title">Welcome</p>
                <p className="wq-hint"><strong style={{ color: NAVY }}>Scan to begin.</strong> Point your phone camera here for how to tap your band and what it can do.</p>
                <p className="wq-url">prayerbands.com/welcome</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
