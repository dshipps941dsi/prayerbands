// Single source of truth for the free-shipping threshold, so the checkout,
// the cart nudge, and the marketing copy can't drift apart. $35 matches the
// "Free Shipping on Orders $35+" promise in the site top bar.
export const FREE_SHIPPING_MIN_CENTS = 3500

// Cents remaining before free shipping kicks in (0 once the order qualifies).
export function amountToFreeShipping(subtotalCents: number): number {
  return Math.max(0, FREE_SHIPPING_MIN_CENTS - subtotalCents)
}
