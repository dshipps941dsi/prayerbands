import { variantForSlug, matchesDesign, parseOrderItems, type OrderItem } from './fulfillment'

// What the store is allowed to sell, derived from the bands that physically
// exist rather than from a number somebody typed in.
//
// There used to be two independent inventory systems that never spoke to each
// other: the `bands` table (the real thing — one row per physical band) and
// product_variants.stock (a hand-kept number the store displayed). Only the
// second one drove the storefront, and only a sale ever moved it. Every other
// way a band leaves the box — handed out at a meeting, claimed, registered,
// assigned to an order, taken by one of the kids for a friend — moved the first
// and not the second. So the two drifted apart, silently, in the direction that
// oversells.
//
// The fix is to stop keeping the second number. A band's status already records
// everything that happens to it, so counting the shelf answers the question
// directly and cannot fall behind: whatever takes a band out of circulation
// takes it out of stock in the same motion, with nobody having to remember.

export type StockBand = {
  theme: string | null
  color: string | null
  size: string | null
  status: string | null
  owner_id: string | null
  org_id: string | null
}

// On the shelf means nothing has happened to this band yet: never registered,
// never claimed, not assigned to an order, not handed out, not church stock.
// Anything else is spoken for, wherever it physically sits.
export function isOnShelf(b: StockBand): boolean {
  return b.status === 'unregistered' && !b.owner_id && !b.org_id
}

// Sizes are only meaningful where a design is actually stocked in sizes. Some
// are stocked unsized, and holding those to a requested size would report zero
// stock for bands sitting right there in the box.
function sizedStockExists(shelf: StockBand[], slug: string): boolean {
  const v = variantForSlug(slug)
  return shelf.some(b => matchesDesign(b, v) && !!b.size)
}

// How many single bands of this design (and size, where sized) are on the shelf.
export function shelfCount(shelf: StockBand[], slug: string, size?: string): number {
  const v = variantForSlug(slug)
  const wantSize = size ? String(size).toUpperCase().slice(0, 2) : ''
  const constrain = !!wantSize && sizedStockExists(shelf, slug)
  return shelf.filter(b => {
    if (!matchesDesign(b, v)) return false
    if (constrain && b.size !== wantSize) return false
    return true
  }).length
}

// Bands already sold but not yet picked. Between payment and fulfillment the
// bands for an order are still sitting on the shelf unassigned, so counting the
// shelf alone would offer them to the next buyer as well. Once fulfillment
// assigns real bands they leave the shelf and the order stops being open, so
// the reservation and the allocation never both apply.
export type OpenOrder = { order_metadata: unknown; assigned_band_ids: string[] | null }

export function isAwaitingPick(o: OpenOrder): boolean {
  return !Array.isArray(o.assigned_band_ids) || o.assigned_band_ids.length === 0
}

export function reservedFor(openOrders: OpenOrder[], slug: string, size?: string): number {
  const wantSize = size ? String(size).toUpperCase().slice(0, 2) : ''
  let n = 0
  for (const o of openOrders) {
    if (!isAwaitingPick(o)) continue
    for (const it of parseOrderItems((o as any).order_metadata)) {
      if (it.id !== slug) continue
      // A line with no size reserves against every size, since which one it
      // will take is not yet known.
      if (wantSize && it.size && it.size !== wantSize) continue
      n += it.qty
    }
  }
  return n
}

export type Availability = { available: number; shelf: number; reserved: number }

// The number the storefront should show for one product/size.
// bandsPerUnit turns a shelf of single bands into how many packs can be filled.
export function availableFor(
  shelf: StockBand[],
  openOrders: OpenOrder[],
  slug: string,
  size: string | undefined,
  bandsPerUnit: number
): Availability {
  const per = Math.max(1, Math.floor(bandsPerUnit || 1))
  const bandsOnShelf = shelfCount(shelf, slug, size)
  const bandsReserved = reservedFor(openOrders, slug, size) * per
  const net = Math.max(0, bandsOnShelf - bandsReserved)
  return {
    available: Math.floor(net / per),
    shelf: Math.floor(bandsOnShelf / per),
    reserved: Math.floor(bandsReserved / per),
  }
}

// Physical stock the store has no way to sell: a design sitting in the box that
// no active product maps to. These are invisible in every stock number the
// store shows, so they need saying out loud rather than quietly counting zero.
export type OrphanStock = { theme: string; color: string; count: number }

export function orphanStock(shelf: StockBand[], sellableSlugs: string[]): OrphanStock[] {
  const byKey = new Map<string, OrphanStock>()
  for (const b of shelf) {
    if (sellableSlugs.some(slug => {
      const v = variantForSlug(slug)
      return !v.assorted && matchesDesign(b, v)
    })) continue
    const theme = b.theme || 'default'
    const color = b.color || '—'
    const key = `${theme}|${color}`
    const row = byKey.get(key) || { theme, color, count: 0 }
    row.count++
    byKey.set(key, row)
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count)
}

export type { OrderItem }
