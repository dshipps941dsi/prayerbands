// Maps store product slugs to the physical band attributes (theme / color) used
// in inventory, so fulfillment assigns bands that actually match what was
// ordered. Some slugs differ from the band theme name; 'default'-theme bands
// carry a color instead of a unique theme; packs / custom are assorted (any
// design). Keep in sync with the products catalog and the batch generator themes.

export type Variant = { name: string; theme?: string; color?: string; assorted?: boolean }

export const PRODUCT_VARIANTS: Record<string, Variant> = {
  baseball: { name: 'Home Run', theme: 'baseball' },
  military: { name: 'Military', theme: 'military' },
  beachlife: { name: 'Beach Life', theme: 'beach' },
  breastcancerawareness: { name: 'Breast Cancer Awareness', theme: 'breast-cancer' },
  standard: { name: 'Mountains', theme: 'mountain' },
  black: { name: 'Black', theme: 'default', color: 'Black' },
  teal: { name: 'Teal', theme: 'default', color: 'Teal' },
  pink: { name: 'Pink', theme: 'default', color: 'Pink' },
  vhs: { name: 'VHS', theme: 'vhs' },
  // Bulk / custom orders aren't a single design — ship assorted.
  custom: { name: 'Custom', assorted: true },
  'pack-50': { name: 'Starter Pack', assorted: true },
  'pack-100': { name: 'Community Pack', assorted: true },
  'pack-200': { name: 'Mission Pack', assorted: true },
}

export function variantForSlug(slug: string): Variant {
  return PRODUCT_VARIANTS[slug] || { name: slug, assorted: true }
}

export type OrderItem = { id: string; qty: number; size?: string }

// Read the per-line items from order_metadata (stored as a JSON string).
export function parseOrderItems(meta: any): OrderItem[] {
  const raw = meta?.items
  let items: any[] = []
  if (Array.isArray(raw)) items = raw
  else if (typeof raw === 'string') { try { items = JSON.parse(raw) } catch { items = [] } }
  return items
    .filter(i => i && i.id && Number(i.qty) > 0)
    .map(i => ({ id: String(i.id), qty: Math.floor(Number(i.qty)), size: i.size ? String(i.size).toUpperCase().slice(0, 2) : undefined }))
}

// A short human label for an order line, e.g. "2× Home Run · L".
export function orderItemLabel(it: OrderItem): string {
  const v = variantForSlug(it.id)
  return `${it.qty}× ${v.name}${it.size ? ` · ${it.size}` : ''}`
}

// Does a physical band match the design a line ordered? Shared by the picker
// (which chooses bands out of stock) and the packer (which checks the ones a
// human actually grabbed), so both answer the question identically. If they
// ever drifted, the picker could allocate a band the packer would reject.
export function matchesDesign(b: { theme: string | null; color: string | null }, v: Variant): boolean {
  return !!v.assorted || (b.theme === v.theme && (!v.color || b.color === v.color))
}

export type PackBand = { band_id: string; theme: string | null; color: string | null; size: string | null }

export type PackReconciliation = {
  need: (OrderItem & { left: number })[]
  matchedIds: Set<string>
  unmatched: PackBand[]
  remaining: number
}

// Match the bands a human physically picked against what an order asked for.
// Greedy per line, which is right here: a band can only satisfy one line, and
// orders have few lines.
//
// Shared by the pack API and the packing screen so the screen's live ✓/✕ is the
// same verdict the server will reach on save. Callers pass only shippable bands.
export function reconcilePack(bands: PackBand[], items: OrderItem[]): PackReconciliation {
  const need = items.map(it => ({ ...it, left: it.qty }))
  const matchedIds = new Set<string>()
  const unmatched: PackBand[] = []

  for (const b of bands) {
    const line = need.find(n => {
      if (n.left <= 0) return false
      if (!matchesDesign(b, variantForSlug(n.id))) return false
      // Hold a pick to its size only when both sides carry one: some designs are
      // stocked unsized, and flagging those would cry wolf.
      if (n.size && b.size && n.size !== b.size) return false
      return true
    })
    if (line) { line.left--; matchedIds.add(b.band_id) }
    else unmatched.push(b)
  }

  return { need, matchedIds, unmatched, remaining: need.reduce((a, n) => a + n.left, 0) }
}
