// Shared look for the blog index and posts: the FAQ page's navy hero over the
// site's cream ground, Cormorant for display, Inter for body. Post prose is
// kept to ~68 characters a line for reading, not for a wide screen.
export const blogStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap');
  .pbb-page { background: #F6F1E4; min-height: 100vh; font-family: 'Inter', sans-serif; color: #2A3344; }
  .pbb-hero {
    text-align: center; padding: 64px 24px 48px;
    background: radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%), linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%);
    border-bottom: 1px solid rgba(200,169,110,0.34);
  }
  .pbb-eyebrow { font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; color: #C8A96E; margin-bottom: 14px; }
  .pbb-title { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: clamp(32px, 5vw, 52px); line-height: 1.1; color: #F5EDD8; margin: 0 0 14px; text-wrap: balance; }
  .pbb-title em { font-style: italic; color: #C8A96E; }
  .pbb-sub { font-size: 16px; font-weight: 300; color: rgba(245,237,216,0.78); max-width: 540px; margin: 0 auto; line-height: 1.7; }
  .pbb-wrap { max-width: 820px; margin: 0 auto; padding: 40px 24px 72px; }
  .pbb-empty { color: #5C6573; font-style: italic; text-align: center; }
  .pbb-lead { display: block; background: #FFFDF8; border: 1px solid rgba(200,169,110,0.5); border-radius: 12px; padding: 28px 28px 24px; text-decoration: none; color: inherit; box-shadow: 0 2px 12px rgba(10,22,40,0.05); margin-bottom: 22px; }
  .pbb-lead-meta, .pbb-card-meta { font-family: 'Cinzel', serif; font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #9A7A35; }
  .pbb-lead-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(26px, 3.6vw, 34px); font-weight: 700; color: #15223B; margin: 8px 0 8px; line-height: 1.15; text-wrap: balance; }
  .pbb-lead-desc { font-size: 15.5px; line-height: 1.7; color: #4A5260; margin: 0 0 14px; max-width: 620px; }
  .pbb-more { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #9A7A35; font-weight: 600; }
  .pbb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .pbb-card { display: block; background: #FFFDF8; border: 1px solid rgba(10,22,40,0.10); border-radius: 10px; padding: 18px 20px; text-decoration: none; color: inherit; }
  .pbb-card:hover, .pbb-lead:hover { border-color: #C8A96E; }
  .pbb-card-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 21px; font-weight: 700; color: #15223B; margin: 6px 0 6px; line-height: 1.2; }
  .pbb-card-desc { font-size: 13.5px; line-height: 1.6; color: #4A5260; margin: 0; }

  /* Post */
  .pbb-post-hero { padding: 56px 24px 40px; }
  .pbb-post-hero .pbb-title { font-size: clamp(30px, 4.6vw, 46px); max-width: 760px; margin-left: auto; margin-right: auto; }
  .pbb-post-meta { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #C8A96E; margin-top: 16px; }
  .pbb-article { max-width: 680px; margin: 0 auto; padding: 44px 24px 24px; }
  .pbb-prose { font-family: 'Inter', sans-serif; font-size: 17px; line-height: 1.8; color: #2A3344; }
  .pbb-prose > * + * { margin-top: 1.1em; }
  .pbb-prose h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 30px; font-weight: 700; color: #15223B; line-height: 1.2; margin-top: 1.8em; text-wrap: balance; }
  .pbb-prose h3 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 23px; font-weight: 700; color: #15223B; line-height: 1.25; margin-top: 1.5em; }
  .pbb-prose p { margin: 0; }
  .pbb-prose p + p { margin-top: 1.1em; }
  .pbb-prose a { color: #9A7A35; text-decoration: underline; text-underline-offset: 2px; }
  .pbb-prose ul, .pbb-prose ol { padding-left: 1.4em; }
  .pbb-prose li + li { margin-top: 0.4em; }
  .pbb-prose blockquote { margin: 1.4em 0; padding: 4px 0 4px 18px; border-left: 3px solid #C8A96E; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 21px; font-style: italic; color: #4A5260; }
  .pbb-prose strong { color: #15223B; }
  .pbb-prose hr { border: none; border-top: 1px solid rgba(200,169,110,0.4); margin: 2em 0; }
  .pbb-prose img { border-radius: 10px; }
  .pbb-cta { max-width: 680px; margin: 28px auto 64px; padding: 0 24px; }
  .pbb-cta-box { background: linear-gradient(180deg, #0A1628 0%, #0E1E38 100%); border: 1px solid rgba(200,169,110,0.4); border-radius: 12px; padding: 26px 26px 24px; color: #F5EDD8; text-align: center; }
  .pbb-cta-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; font-weight: 700; margin: 0 0 8px; }
  .pbb-cta-copy { font-size: 14.5px; color: rgba(245,237,216,0.78); line-height: 1.65; max-width: 480px; margin: 0 auto 18px; }
  .pbb-cta-btn { display: inline-block; background: #C8A96E; color: #0A1628; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
  .pbb-related { max-width: 680px; margin: 0 auto 72px; padding: 0 24px; }
  .pbb-related-title { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #9A7A35; margin: 0 0 12px; }
  .pbb-back { display: inline-block; margin-top: 18px; color: #9A7A35; text-decoration: none; font-size: 14px; }
`
