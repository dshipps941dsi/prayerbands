// Tidy the capitalisation of typed name/place fields when a band is registered,
// so "john smith" is stored as "John Smith", "venice" as "Venice", and a state
// code like "fl" as "FL". Kept deliberately light: it only fixes casing, and it
// leaves any word that already carries a capital alone (TJ, McDonald, D'Angelo)
// so intentional forms survive.

function capWord(w: string): string {
  if (!w) return w
  // A word that already has a capital is assumed intentional — leave it be.
  if (/[A-Z]/.test(w)) return w
  // Otherwise capitalise the first letter and any letter after a hyphen or
  // apostrophe (mary-jane -> Mary-Jane, o'brien -> O'Brien).
  return w.replace(/(^|[-'’])([a-zà-öø-ÿ])/g, (_m, sep, ch) => sep + ch.toUpperCase())
}

export function titleCase(input: string | null | undefined): string | null {
  const t = (input ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return input == null ? null : ''
  return t.split(' ').map(capWord).join(' ')
}

// A two-letter code (US/CA style) is upper-cased; a spelled-out state/province
// is title-cased.
export function formatState(input: string | null | undefined): string | null {
  const t = (input ?? '').trim()
  if (!t) return input == null ? null : ''
  if (/^[a-z]{2}$/i.test(t)) return t.toUpperCase()
  return titleCase(t)
}

// Countries: title-case, but keep short forms (US, USA, UK, UAE) upper-cased.
export function formatCountry(input: string | null | undefined): string | null {
  const t = (input ?? '').trim()
  if (!t) return input == null ? null : ''
  if (/^[a-z]{2,3}$/i.test(t)) return t.toUpperCase()
  return titleCase(t)
}
