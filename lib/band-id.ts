// What someone might hand a band-id input, in practice:
//
//   https://prayerbands.com/r/PB-UNVBS   an NFC tag, or a pasted link
//   PB-UNVBS                             the full id
//   UNVBS                                the short code, which is what people
//                                        actually read off the band
//
// The last one used to be rejected outright, which reads as "no such band" when
// the band is real and in your hand. Return a candidate for all three and let
// the lookup decide.
export function bandIdCandidate(text: string): string | null {
  const fromUrl = text.match(/\/(?:r|band)\/([A-Za-z0-9-]+)/)
  const raw = (fromUrl ? fromUrl[1] : text).trim().toUpperCase()
  return /^[A-Z0-9][A-Z0-9-]{2,19}$/.test(raw) ? raw : null
}

// A PostgREST `or` filter matching either the whole id or its short code, so
// "UNVBS" finds PB-UNVBS and "E5XS3" finds GCC-E5XS3 without hardcoding
// prefixes that will not stay stable across batches.
export function bandIdFilter(candidate: string): string {
  return `band_id.eq.${candidate},band_id.ilike.%-${candidate}`
}
