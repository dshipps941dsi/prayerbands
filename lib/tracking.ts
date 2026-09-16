// Where a tracking number can be followed. Pirate Ship labels are UPS or USPS
// depending on the rate picked, so the carrier is read off the number itself.

export type Carrier = 'ups' | 'usps' | 'fedex' | 'unknown'

export function carrierFor(raw: string | null | undefined): Carrier {
  const n = String(raw || '').replace(/\s+/g, '').toUpperCase()
  if (!n) return 'unknown'
  if (/^1Z[0-9A-Z]{16}$/.test(n) || /^T\d{10}$/.test(n)) return 'ups'
  if (/^(9[2-5]\d{18,24}|(EA|EC|CP|RA|LZ)\d{9}US|\d{20,22})$/.test(n)) return 'usps'
  if (/^\d{12}$|^\d{15}$/.test(n)) return 'fedex'
  return 'unknown'
}

export function carrierLabel(raw: string | null | undefined): string {
  return { ups: 'UPS', usps: 'USPS', fedex: 'FedEx', unknown: 'Track' }[carrierFor(raw)]
}

export function trackingUrl(raw: string | null | undefined): string | null {
  const n = String(raw || '').replace(/\s+/g, '')
  if (!n) return null
  switch (carrierFor(n)) {
    case 'ups': return `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`
    case 'usps': return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`
    case 'fedex': return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`
    // Not a shape we know: a search still gets the person to the right page.
    default: return `https://www.google.com/search?q=${encodeURIComponent(n + ' tracking')}`
  }
}
