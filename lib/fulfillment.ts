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
