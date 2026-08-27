// One-shot: create the "Give $2, Get $2" friend discount in Stripe.
//
//   node scripts/create-g2g2-coupon.mjs
//
// Uses STRIPE_SECRET_KEY from the environment. If that key is sk_test the
// objects land in test mode; for the real promo run it with the LIVE key:
//
//   STRIPE_SECRET_KEY=sk_live_xxx node scripts/create-g2g2-coupon.mjs
//
// It creates:
//   * a $2.00-off coupon (amount_off, duration once) — this is what the
//     referral link auto-applies, so set STRIPE_REFERRAL_PROMO_CODE_ID to the
//     printed coupon id and redeploy.
//   * a human-typable promotion code "G2G2" pointing at the same coupon, so it
//     can also be entered by hand if you ever want that.
//
// Idempotent-ish: it looks for an existing "G2G2" promotion code first and
// reuses its coupon instead of making duplicates.
import fs from 'node:fs'
import Stripe from 'stripe'

// Load .env.local the way Next does (dotenv/config only reads .env).
try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const key = process.env.STRIPE_SECRET_KEY
if (!key) { console.error('No STRIPE_SECRET_KEY in env'); process.exit(1) }
const stripe = new Stripe(key)
const mode = key.startsWith('sk_live') ? 'LIVE' : 'TEST'

const existing = await stripe.promotionCodes.list({ code: 'G2G2', limit: 1 })
if (existing.data.length) {
  const pc = existing.data[0]
  console.log(`[${mode}] G2G2 already exists → promotion_code ${pc.id}, coupon ${pc.coupon.id}`)
  console.log(`Set STRIPE_REFERRAL_PROMO_CODE_ID=${pc.coupon.id}`)
  process.exit(0)
}

const coupon = await stripe.coupons.create({
  amount_off: 200,
  currency: 'usd',
  duration: 'once',
  name: 'Give $2, Get $2',
})
const promo = await stripe.promotionCodes.create({ coupon: coupon.id, code: 'G2G2' })

console.log(`[${mode}] created coupon ${coupon.id} ($2 off) + promotion code ${promo.code} (${promo.id})`)
console.log('')
console.log('Point the referral link at the coupon:')
console.log(`  STRIPE_REFERRAL_PROMO_CODE_ID=${coupon.id}`)
