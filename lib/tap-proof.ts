import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

// Proof that a phone actually tapped a band, as opposed to someone typing an
// ID they saw in a link.
//
// Bands made from September 2026 on carry a per-band secret in the chip's
// URL (/r/PB-XXXXX?k=…). The /r route checks it against the stored hash,
// drops a signed, time-limited cookie on the phone, and forwards to the clean
// band URL — so the secret never shows in the address bar or in anything
// shared from it. The actions that require holding the band (a new stop that
// takes ownership, accepting a hand-off, claiming) look for that cookie on
// bands that have a secret. Bands made before this have no secret and are
// never gated — they keep working exactly as they always have.
//
// Storage: bands.tap_secret_hash (SHA-256, for verification) and
// bands.tap_secret_enc (AES-256-GCM under TAP_SECRET_KEY, so a past batch's
// supplier CSV can be rebuilt). bands.nfc_url stays the plain /r/ID because
// that column is readable by the public API role.

const TTL_SECONDS = 24 * 60 * 60
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no 0/o/1/l/i — unambiguous if ever read aloud

function masterKey(): Buffer | null {
  const hex = process.env.TAP_SECRET_KEY
  if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) return null
  return Buffer.from(hex, 'hex')
}

function signingKey(): Buffer {
  // Prefer the dedicated key; fall back to the service key so cookies still
  // verify in an environment that has not been given TAP_SECRET_KEY.
  return masterKey() ?? Buffer.from(process.env.SUPABASE_SERVICE_KEY || process.env.INTERNAL_API_SECRET_KEY || 'dev-only')
}

export function tapSecretsConfigured(): boolean {
  return masterKey() !== null
}

export function newTapSecret(): string {
  const bytes = randomBytes(14)
  let out = ''
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return out
}

export function hashTapSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

export function encryptTapSecret(secret: string): string {
  const key = masterKey()
  if (!key) throw new Error('TAP_SECRET_KEY is not configured')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return `${iv.toString('base64url')}.${ct.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}`
}

export function decryptTapSecret(enc: string | null | undefined): string | null {
  const key = masterKey()
  if (!key || !enc) return null
  try {
    const [iv, ct, tag] = enc.split('.').map(p => Buffer.from(p, 'base64url'))
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
  } catch { return null }
}

export function secretMatches(secret: string | null | undefined, hash: string | null | undefined): boolean {
  if (!secret || !hash) return false
  const a = Buffer.from(hashTapSecret(secret), 'hex'), b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function tapUrl(bandId: string, secret: string | null | undefined): string {
  return `https://prayerbands.com/r/${bandId}${secret ? `?k=${secret}` : ''}`
}

export function tapCookieName(bandId: string): string {
  return `pb_tap_${bandId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
}

// Signed, time-limited token bound to one band.
export function issueTapProof(bandId: string): { name: string; value: string; maxAge: number } {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
  const sig = createHmac('sha256', signingKey()).update(`${bandId.toUpperCase()}.${exp}`).digest('base64url')
  return { name: tapCookieName(bandId), value: `${exp}.${sig}`, maxAge: TTL_SECONDS }
}

export function verifyTapProof(bandId: string, cookieValue: string | null | undefined): boolean {
  if (!cookieValue) return false
  const [expStr, sig] = cookieValue.split('.')
  const exp = Number(expStr)
  if (!exp || !sig || exp < Math.floor(Date.now() / 1000)) return false
  const expected = createHmac('sha256', signingKey()).update(`${bandId.toUpperCase()}.${exp}`).digest('base64url')
  const a = Buffer.from(expected), b = Buffer.from(sig)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Did this request's phone tap this band recently?
export function hasTapProof(bandId: string, req: NextRequest): boolean {
  return verifyTapProof(bandId, req.cookies.get(tapCookieName(bandId))?.value)
}

// The message shown when a secret-carrying band is opened from a typed or
// shared link and someone tries to take it.
export const NEEDS_TAP_MESSAGE = 'To add your name to this band, hold it against the top of your phone so the band itself opens this page.'
