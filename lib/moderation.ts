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

// Returns true if the text should be auto-flagged for review.
export function isFlaggable(text?: string | null): boolean {
  if (!text) return false
  return BANNED_RE.test(text)
}

export const AUTO_FLAG_REASON = 'Auto-flagged: filtered language'
