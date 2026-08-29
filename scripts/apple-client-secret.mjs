// Generates the "client secret" JWT that Supabase needs for Sign in with Apple.
// The .p8 private key is read locally and never leaves your machine.
//
// Usage (from the project root):
//   node scripts/apple-client-secret.mjs ./AuthKey_XXXXXXXXXX.p8
//
// Fill in KEY_ID and SERVICES_ID below (TEAM_ID is already set).
// Apple caps the lifetime at 6 months — rerun this and update Supabase before it expires.

import { readFileSync } from 'node:fs'
import { createSign } from 'node:crypto'

// ── Fill these in ───────────────────────────────────────────
const TEAM_ID     = 'YYRBXF6ND2'         // Apple Developer Team ID
const KEY_ID      = 'KNNFV749AF'  // 10 chars, shown on the Key's page
const SERVICES_ID = 'com.prayerbands.web' // the Services ID identifier
// ────────────────────────────────────────────────────────────

const p8Path = process.argv[2]
if (!p8Path) {
  console.error('Usage: node scripts/apple-client-secret.mjs <path-to-AuthKey.p8>')
  process.exit(1)
}
const privateKey = readFileSync(p8Path, 'utf8')

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

const now = Math.floor(Date.now() / 1000)
const SIX_MONTHS = 15777000 // Apple's maximum

const header = { alg: 'ES256', kid: KEY_ID }
const payload = {
  iss: TEAM_ID,
  iat: now,
  exp: now + SIX_MONTHS,
  aud: 'https://appleid.apple.com',
  sub: SERVICES_ID,
}

const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`

// ES256 = ECDSA over P-256 with SHA-256; convert DER signature to raw r||s (JOSE).
const der = createSign('SHA256').update(signingInput).sign(privateKey)
function derToJose(der) {
  let offset = 3
  const rLen = der[offset]
  offset += 1
  let r = der.slice(offset, offset + rLen)
  offset += rLen + 1
  const sLen = der[offset]
  offset += 1
  let s = der.slice(offset, offset + sLen)
  const pad = (b) => {
    b = b[0] === 0 ? b.slice(1) : b // strip DER sign byte
    const out = Buffer.alloc(32)
    b.copy(out, 32 - b.length)
    return out
  }
  return Buffer.concat([pad(r), pad(s)])
}

const jwt = `${signingInput}.${b64url(derToJose(der))}`
const expDate = new Date((now + SIX_MONTHS) * 1000).toISOString().slice(0, 10)

console.log('\n─── Apple client secret (valid until ' + expDate + ') ───\n')
console.log(jwt)
console.log('\nSupabase → Authentication → Providers → Apple:')
console.log('  Client IDs (Services ID):  ' + SERVICES_ID)
console.log('  Secret Key (client secret): the JWT above')
console.log('  Also add App ID  com.prayerbands.app  to Client IDs for native/app sign-in.\n')
