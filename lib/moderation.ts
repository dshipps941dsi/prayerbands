// Lightweight content moderation for user-submitted prayers.
//
// Soft auto-flag: text that matches the list is FLAGGED for admin review
// (hidden from the public wall, queued in Admin → Prayers) — never hard-blocked,
// so a false positive just waits for a human to approve it.
//
// Matching is word-start anchored (\b) so it catches simple variants
// (e.g. "fuck", "fucking", "fucker") without firing inside unrelated words for
// most cases. Edit the list below to tune it.

const BANNED_WORDS: string[] = [
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dickhead', 'piss',
  'cunt', 'slut', 'whore', 'nigger', 'nigga', 'faggot', 'retard',
  'motherfucker', 'cock', 'pussy', 'twat', 'wank', 'jerkoff',
]

// Single compiled regex, word-start anchored, case-insensitive.
const BANNED_RE = new RegExp(`\\b(${BANNED_WORDS.join('|')})`, 'i')

// Map common leetspeak substitutions back to letters so "sh1t" / "@sshole"
// don't slip through. (Soft filter — false positives just wait for review.)
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's' }
const deLeet = (s: string) => s.toLowerCase().replace(/[0134578@$]/g, c => LEET[c] ?? c)

// Strip everything but letters and collapse repeated letters, so spaced-out and
// stretched evasions ("f u c k", "fuuuck", "s.h.i.t") normalize to the word.
const collapse = (s: string) => deLeet(s).replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1')
const BANNED_COLLAPSED = BANNED_WORDS.map(w => w.replace(/(.)\1+/g, '$1'))

// Returns true if the text should be auto-flagged for review.
export function isFlaggable(text?: string | null): boolean {
  if (!text) return false
  if (BANNED_RE.test(text)) return true
  if (BANNED_RE.test(deLeet(text))) return true
  const c = collapse(text)
  return BANNED_COLLAPSED.some(w => c.includes(w))
}

export const AUTO_FLAG_REASON = 'Auto-flagged: filtered language'
