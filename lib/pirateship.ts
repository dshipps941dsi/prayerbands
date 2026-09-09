// Getting an order into Pirate Ship. There is no API to push a shipment, but
// its label screen parses a pasted address block, and its "Upload a
// spreadsheet" flow takes a CSV and maps these column names on its own. Both
// are produced here from the Stripe shipping address saved on the order.

export type ShipAddress = {
  name?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
}

export type ShippableOrder = {
  id: number
  customer_name?: string | null
  customer_email?: string | null
  shipping_address?: ShipAddress | null
  assigned_band_ids?: string[] | null
}

// Rough parcel weight for the rate quote: a padded mailer plus the bands.
// Pirate Ship prices by the ounce so being a little over never causes a
// problem; being under can get the label surcharged in transit.
const MAILER_OZ = 1
const BAND_OZ = 0.6
export function estimateOunces(bands: number): number {
  return Math.max(1, Math.ceil(MAILER_OZ + BAND_OZ * Math.max(1, bands)))
}

// Multi-line block in the shape Pirate Ship's paste box reads best:
//   Name / street / street 2 / City, ST ZIP / Country (only if not US)
export function addressBlock(o: ShippableOrder): string {
  const a = o.shipping_address || {}
  const name = (a.name || o.customer_name || '').trim()
  const cityLine = [a.city, [a.state, a.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const lines = [name, a.line1, a.line2, cityLine]
  if (a.country && a.country.toUpperCase() !== 'US') lines.push(a.country)
  return lines.map(l => (l || '').trim()).filter(Boolean).join('\n')
}

export function hasAddress(o: ShippableOrder): boolean {
  const a = o.shipping_address
  return !!(a && a.line1 && a.city && a.postal_code)
}

function csv(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// One row per order. "Rubber Stamp" columns print on the label itself, which
// is how the packer knows what's in the box without opening it.
export function pirateShipCsv(orders: ShippableOrder[]): string {
  const header = ['Order ID', 'Name', 'Email', 'Address 1', 'Address 2', 'City', 'State', 'Zipcode', 'Country', 'Weight (oz)', 'Rubber Stamp 1']
  const rows = orders.map(o => {
    const a = o.shipping_address || {}
    const bands = (o.assigned_band_ids || []).length
    return [
      `PB-${o.id}`,
      a.name || o.customer_name || '',
      o.customer_email || '',
      a.line1 || '', a.line2 || '', a.city || '', a.state || '', a.postal_code || '', (a.country || 'US').toUpperCase(),
      estimateOunces(bands),
      `Order ${o.id} · ${bands} band${bands === 1 ? '' : 's'}`,
    ].map(csv).join(',')
  })
  return [header.join(','), ...rows].join('\r\n') + '\r\n'
}
