'use client'
import { useEffect, useState, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import { track } from "@/lib/analytics";
import SiteFooter from "@/components/SiteFooter";
import { FREE_SHIPPING_MIN_CENTS, amountToFreeShipping } from "@/lib/shipping";
import { readGaIds } from "@/lib/ga4";

type PendingReferral = { code: string; referrerUserId?: string };

// ─── Types ───────────────────────────────────────────────────
type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  type: string;
  size?: string;
  multiDiscount?: boolean;
  detail?: string;
};

type Variant = { size: string; stock: number; backorder: boolean };
type Product = {
  slug: string;
  name: string;
  description: string;
  category: string;       // 'band' | 'pack'
  theme: string;
  color: string;
  icon: string;
  tag?: string | null;
  price: number;          // dollars
  bandsPerUnit: number;
  features: string[];
  sizes: string[];
  hasSizes: boolean;
  multiDiscount: boolean;
  discountTiers?: { min_qty: number; percent: number }[];
  images: string[];
  variants: Variant[];
};

const COLORS = [
  { name: "Amber Gold", hex: "#C8A96E" },
  { name: "Sage Green", hex: "#7BAE8E" },
  { name: "Slate Blue", hex: "#7B8FAE" },
  { name: "Burgundy", hex: "#AE7B7B" },
  { name: "Midnight", hex: "#2C1A0E" },
  { name: "Ivory", hex: "#F5EFE4" },
];

const SIZES = [
  { id: "S", label: "Small" },
  { id: "M", label: "Medium" },
  { id: "L", label: "Large" },
];

// Inches lead, centimetres follow in brackets: every customer is in the US for
// now, and the unit they measure in should be the one they read first.
//
// NOTE: these are still the placeholder ranges from the original build, not
// measurements taken off a real band. The unit order is right; the numbers want
// checking against the actual product.
const SIZE_CHART = [
  { size: "Small", wrist: "5.5–6.3 in (14–16 cm)", fit: "Youth / smaller wrists" },
  { size: "Medium", wrist: "6.3–7.1 in (16–18 cm)", fit: "Most adults" },
  { size: "Large", wrist: "7.1–7.9 in (18–20 cm)", fit: "Larger wrists" },
];

// ─── Image carousel (falls back to the band illustration) ─────
function BandCarousel({ images, color, icon, tag }: { images: string[]; color: string; icon: string; tag?: string | null }) {
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const ok = images.filter(src => !broken[src]);
  useEffect(() => {
    if (ok.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % ok.length), 4000);
    return () => clearInterval(t);
  }, [ok.length]);
  const cur = ok.length ? idx % ok.length : 0;
  const curSrc = ok[cur];
  return (
    <div style={{ height: 260, position: "relative", background: `linear-gradient(135deg, ${color}22, ${color}44)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {tag && <div className="lato" style={{ position: "absolute", top: 16, right: 16, zIndex: 3, background: color, color: "#fff", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}>{tag}</div>}
      {images.map(src => broken[src] ? null : (
        <img key={src} className="pb-band-img" src={src} alt="" onError={() => setBroken(b => ({ ...b, [src]: true }))} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: ok[cur] === src ? 1 : 0, transition: "opacity 0.5s" }} />
      ))}
      {curSrc && (
        <button className="pb-zoom-btn" onClick={() => setZoom(true)} aria-label="View full image" title="View full image">⤢</button>
      )}
      {zoom && curSrc && typeof document !== "undefined" && createPortal(
        <div className="pb-lightbox" onClick={() => setZoom(false)} role="dialog" aria-modal="true">
          <button className="pb-lightbox-close" onClick={() => setZoom(false)} aria-label="Close">×</button>
          <img src={curSrc} alt="" onClick={e => e.stopPropagation()} />
        </div>,
        document.body
      )}
      {ok.length === 0 && (
        <div style={{ position: "relative", width: 120, height: 120 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `18px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28 }}>{icon}</div>
              <div className="lato" style={{ fontSize: 9, letterSpacing: "0.15em", color, marginTop: 2 }}>PB-XXXXX</div>
            </div>
          </div>
        </div>
      )}
      {ok.length > 1 && (
        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 3 }}>
          {ok.map((src, i) => (
            <button key={src} onClick={() => setIdx(i)} aria-label={`Image ${i + 1}`} style={{ width: 8, height: 8, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", background: i === cur ? "#fff" : "rgba(255,255,255,0.5)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function StorePageInner() {
  const searchParams = useSearchParams();
  const [referral, setReferral] = useState<PendingReferral | null>(null);
  const [storeTab, setStoreTab] = useState<'buy' | 'subscribe' | 'bulk' | 'community'>('buy');
  const [bulkQty, setBulkQty] = useState<Record<string, number>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkImgBroken, setBulkImgBroken] = useState<Record<string, boolean>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customColor, setCustomColor] = useState(COLORS[0].name);
  const [customVerse, setCustomVerse] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [toast, setToast] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isGift, setIsGift] = useState(false);
  const [giftName, setGiftName] = useState("");
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [replaces, setReplaces] = useState("");
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [bandFilter, setBandFilter] = useState<'all' | 'themed' | 'solid'>('all');
  // Sticky auto-discount bar: hidden at the top, slides up once the shopper
  // scrolls into the bands so the offer follows them without stealing top space.
  const [showDealBar, setShowDealBar] = useState(false);
  const [dealDismissed, setDealDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/pricing").then(r => r.json()).then(d => { if (d.pricing) setPricing(d.pricing); }).catch(() => {});
    fetch("/api/products").then(r => r.json()).then(d => { if (Array.isArray(d.products) && d.products.length) setCatalog(d.products); }).catch(() => {});
    const r = new URLSearchParams(window.location.search).get("replaces");
    if (r) setReplaces(r.trim().toUpperCase());
    if (window.location.hash === "#packs") setStoreTab("community");
    if (window.location.hash === "#bulk") setStoreTab("bulk");
  }, []);

  // Referral: if ?ref= is present, validate it and remember it; otherwise show
  // any referral already saved this session so the discount banner persists.
  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) {
      fetch("/api/referral/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: ref }),
      })
        .then(res => res.json())
        .then(data => {
          if (data?.valid) {
            const pending: PendingReferral = { code: ref.trim().toUpperCase(), referrerUserId: data.referrerUserId };
            try { localStorage.setItem("pendingReferral", JSON.stringify({ ...pending, ts: Date.now() })); } catch {}
            setReferral(pending);
          }
        })
        .catch(() => {});
      return;
    }
    // Show a saved referral only if it's still fresh. A referral with no
    // timestamp (from before expiry existed) or older than 30 days is dropped —
    // otherwise a one-time referral link becomes a permanent discount banner.
    try {
      const saved = localStorage.getItem("pendingReferral");
      if (saved) {
        const parsed = JSON.parse(saved);
        const fresh = parsed?.code && typeof parsed?.ts === "number" && (Date.now() - parsed.ts) < 30 * 24 * 60 * 60 * 1000;
        if (fresh) setReferral(parsed as PendingReferral);
        else localStorage.removeItem("pendingReferral");
      }
    } catch {}
  }, [searchParams]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  // Reveal the sticky discount bar once the shopper has scrolled past the hero.
  useEffect(() => {
    const onScroll = () => setShowDealBar(window.scrollY > 240);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fallback catalog (used only until db/products.sql is run) so the store never breaks.
  const fallback: Product[] = [
    { slug: "standard", name: "Standard Band", description: "A wristband laser-engraved with a unique PB-XXXXX ID and NFC chip. Ready to carry a prayer.", category: "band", theme: "default", color: "#C8A96E", icon: "✝︎", tag: "Most Popular", price: (pricing["band_price_single"] ?? 1499) / 100, bandsPerUnit: 1, features: ["Unique PB-XXXXX ID", "NFC chip enabled", "Laser-engraved", "Full journey tracking"], sizes: ["S", "M", "L"], hasSizes: true, multiDiscount: true, images: [], variants: [] },
    { slug: "custom", name: "Custom Band", description: "Everything in Standard, plus your choice of color, a custom scripture verse, and a personal message engraved.", category: "band", theme: "default", color: "#7BAE8E", icon: "✦", tag: "Personalized", price: (pricing["band_price_custom"] ?? 1000) / 100, bandsPerUnit: 1, features: ["Everything in Standard", "Choose band color", "Custom scripture verse", "Personal message", "Gift-ready packaging"], sizes: ["S", "M", "L"], hasSizes: true, multiDiscount: false, images: [], variants: [] },
    { slug: "pack-50", name: "Starter Pack", description: "Perfect for small groups, house churches, or personal outreach.", category: "pack", theme: "default", color: "#7BAE8E", icon: "✝︎", tag: null, price: (pricing["pack_price_50"] ?? 22500) / 100, bandsPerUnit: 50, features: ["Custom ministry prefix", "Ministry dashboard", "NFC + laser-engraved", "Journey tracking", "Bulk reorder pricing"], sizes: [], hasSizes: false, multiDiscount: false, images: [], variants: [] },
    { slug: "pack-100", name: "Community Pack", description: "Ideal for congregation-wide initiatives and mission trips.", category: "pack", theme: "default", color: "#C8A96E", icon: "✝︎", tag: "Most Popular", price: (pricing["pack_price_100"] ?? 42500) / 100, bandsPerUnit: 100, features: ["Custom ministry prefix", "Ministry dashboard", "NFC + laser-engraved", "Journey tracking", "Bulk reorder pricing"], sizes: [], hasSizes: false, multiDiscount: false, images: [], variants: [] },
    { slug: "pack-200", name: "Mission Pack", description: "For conferences, large outreaches, and denominational orders.", category: "pack", theme: "default", color: "#7B8FAE", icon: "✝︎", tag: null, price: (pricing["pack_price_200"] ?? 80000) / 100, bandsPerUnit: 200, features: ["Custom ministry prefix", "Ministry dashboard", "NFC + laser-engraved", "Journey tracking", "Bulk reorder pricing"], sizes: [], hasSizes: false, multiDiscount: false, images: [], variants: [] },
  ];

  const products = catalog.length ? catalog : fallback;
  const bandProducts = products.filter(p => p.category === "band");
  // "Solid" = no decorative theme (theme 'default' or unset); "Themed" = anything else.
  const isSolid = (p: Product) => !p.theme || p.theme === "default";
  const shownBands = bandFilter === "all" ? bandProducts : bandProducts.filter(p => bandFilter === "solid" ? isSolid(p) : !isSolid(p));
  const hasThemed = bandProducts.some(p => !isSolid(p));
  const packProducts = products.filter(p => p.category === "pack");

  // GA4: record item views once the catalog is on screen (once per load).
  const viewedRef = useRef(false);
  useEffect(() => {
    if (viewedRef.current || !products.length) return;
    viewedRef.current = true;
    products.forEach(p => track('view_item', { currency: 'USD', value: p.price, items: [{ item_id: p.slug, item_name: p.name, price: p.price, item_category: p.category }] }));
  }, [products.length]);

  // ── Automatic multi-band discount — percent tiers live on the product, so
  // they track the base price and never drift from a separate pricing table. ──
  const discountBase = bandProducts.find(p => p.multiDiscount);
  const single = discountBase?.price ?? ((pricing["band_price_single"] ?? 1499) / 100);
  const tierPct = (qty: number) => (discountBase?.discountTiers ?? []).filter(t => qty >= t.min_qty).reduce((m, t) => Math.max(m, t.percent), 0);
  const standardUnitFor = (qty: number) => single * (1 - tierPct(qty) / 100);
  const tier3 = standardUnitFor(3);
  const tier5 = standardUnitFor(5);
  // Per-product discount — each card reflects ITS OWN price + tiers set in
  // admin (Band Mgmt → Products), not a shared/representative product.
  const prodPct = (p: Product, qty: number) => (p.discountTiers ?? []).filter(t => qty >= t.min_qty).reduce((m, t) => Math.max(m, t.percent), 0);
  const prodUnit = (p: Product, qty: number) => p.price * (1 - prodPct(p, qty) / 100);

  // ── Availability ──
  const variantFor = (p: Product, size: string): Variant => {
    if (!p.variants || p.variants.length === 0) return { size, stock: 9999, backorder: false };
    return p.variants.find(v => v.size === (p.hasSizes ? size : "")) || p.variants[0];
  };
  const availabilityOf = (p: Product, size: string): "in" | "backorder" | "out" => {
    const v = variantFor(p, size);
    return v.stock > 0 ? "in" : v.backorder ? "backorder" : "out";
  };

  const addToCart = (item: Omit<CartItem, "qty">) => {
    setCart(prev => {
      const i = prev.findIndex(c => c.id === item.id && c.size === item.size);
      if (i >= 0) { const copy = [...prev]; copy[i] = { ...copy[i], qty: copy[i].qty + 1 }; return copy; }
      return [...prev, { ...item, qty: 1 }];
    });
    track('add_to_cart', { currency: 'USD', value: item.price, items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: 1 }] });
    showToast(`${item.name} added to cart`);
  };
  const updateQty = (id: string, size: string | undefined, delta: number) => {
    const it = cart.find(c => c.id === id && c.size === size);
    if (it) track(delta < 0 ? 'remove_from_cart' : 'add_to_cart', { currency: 'USD', value: it.price, items: [{ item_id: it.id, item_name: it.name, price: it.price, quantity: 1 }] });
    setCart(prev => prev.map(c => (c.id === id && c.size === size) ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
  };

  const standardQty = cart.filter(c => c.multiDiscount).reduce((s, c) => s + c.qty, 0);
  const stdUnit = standardUnitFor(standardQty);
  const lineUnit = (c: CartItem) => (c.multiDiscount ? stdUnit : c.price);
  const subtotal = cart.reduce((sum, c) => sum + lineUnit(c) * c.qty, 0);
  const stdSavings = (single - stdUnit) * standardQty;
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
  // Free shipping once the subtotal clears the threshold — mirrors the checkout
  // so the cart total never disagrees with what Stripe charges.
  const subtotalCents = Math.round(subtotal * 100);
  const qualifiesFreeShip = subtotalCents >= FREE_SHIPPING_MIN_CENTS;
  const toFreeShip = amountToFreeShipping(subtotalCents) / 100;
  const shipping = qualifiesFreeShip ? 0 : (pricing["shipping_cost_standard"] ?? 299) / 100;
  const total = subtotal + shipping;

  // ── Bulk order builder ──────────────────────────────────────────────────
  // Giftable band styles with sizes (skip the personalized "custom" band and
  // packs). Quantities keyed by `${slug}|${size}`. Pricing mirrors the server:
  // the multi-band tier is keyed on the combined multi-eligible quantity, so a
  // big assorted order earns the same 3+/5+ discount the cart does.
  const bulkStyles = bandProducts.filter(p => p.hasSizes && p.slug !== "custom");
  // Prefer a real (absolute) image over any stale relative placeholder path.
  const bulkImg = (p: Product) => (p.images || []).find(u => /^https?:\/\//.test(u)) || (p.images || [])[0] || "";
  const bulkProdBySlug: Record<string, Product> = Object.fromEntries(bandProducts.map(p => [p.slug, p]));
  const bulkItems = Object.entries(bulkQty)
    .filter(([, q]) => q > 0)
    .map(([k, q]) => { const [slug, size] = k.split("|"); return { slug, size, qty: q }; });
  const bulkDiscountQty = bulkItems.reduce((s, i) => s + (bulkProdBySlug[i.slug]?.multiDiscount ? i.qty : 0), 0);
  const bulkTierPct = (tiers?: { min_qty: number; percent: number }[]) =>
    (tiers ?? []).filter(t => bulkDiscountQty >= t.min_qty).reduce((m, t) => Math.max(m, t.percent), 0);
  const bulkUnit = (p: Product) => p.multiDiscount ? p.price * (1 - bulkTierPct(p.discountTiers) / 100) : p.price;
  const bulkBands = bulkItems.reduce((s, i) => s + i.qty, 0);
  const bulkSubtotal = bulkItems.reduce((s, i) => { const p = bulkProdBySlug[i.slug]; return s + (p ? bulkUnit(p) : 0) * i.qty; }, 0);
  const bulkSavings = bulkItems.reduce((s, i) => { const p = bulkProdBySlug[i.slug]; return s + (p && p.multiDiscount ? (p.price - bulkUnit(p)) * i.qty : 0); }, 0);
  const bulkFreeShip = Math.round(bulkSubtotal * 100) >= FREE_SHIPPING_MIN_CENTS;
  const bulkShip = bulkFreeShip ? 0 : (pricing["shipping_cost_standard"] ?? 299) / 100;
  const bulkTotal = bulkSubtotal + bulkShip;
  const setBulkCell = (slug: string, size: string, val: string) => setBulkQty(prev => {
    const n = { ...prev }; const k = `${slug}|${size}`;
    const q = Math.max(0, Math.min(999, Math.floor(Number(val) || 0)));
    if (q) n[k] = q; else delete n[k];
    return n;
  });
  async function bulkCheckout() {
    if (!bulkBands) return;
    setBulkLoading(true);
    track('begin_checkout', { currency: 'USD', value: bulkSubtotal, items: bulkItems.map(i => ({ item_id: i.slug, quantity: i.qty })) });
    const res = await fetch('/api/create-checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...readGaIds(), items: bulkItems.map(i => ({ id: i.slug, qty: i.qty, size: i.size })), returnTo: '/store', referralCode: referral?.code || '' }),
    });
    const data = await res.json();
    if (data.url) { window.location.href = data.url; } else { showToast('Something went wrong — please try again'); setBulkLoading(false); }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#F6F1E4", color: "#2A3344", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .playfair { font-family: 'Cormorant Garamond', serif; }
        .lato { font-family: 'Inter', sans-serif; }
        .section-label { font-family:'Cinzel',serif; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:#9A7A35; display:block; margin-bottom:10px; }
        .add-btn { width: 100%; padding: 14px; border: none; border-radius: 4px; font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; font-weight: 600; }
        .add-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(10,22,40,0.15); }
        .add-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .product-card { background: #FFFDF8; border: 1px solid rgba(200,169,110,0.34); border-radius: 10px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(10,22,40,0.10); }
        .pack-card { background: #FFFDF8; border: 1px solid rgba(200,169,110,0.34); border-radius: 10px; padding: 32px 28px; transition: transform 0.2s, box-shadow 0.2s; position: relative; }
        .pack-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(10,22,40,0.10); }
        .qty-btn { width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(92,101,115,0.30); background: #F6F1E4; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .qty-btn:hover { background: #ECEEF1; }
        .cart-overlay { position: fixed; inset: 0; background: rgba(10,22,40,0.45); z-index: 200; display: flex; justify-content: flex-end; }
        .cart-drawer { width: 420px; max-width: 100vw; background: #F6F1E4; height: 100vh; overflow-y: auto; padding: 32px 28px; box-shadow: -8px 0 48px rgba(10,22,40,0.18); }
        .checkout-btn { width: 100%; padding: 16px; background: #C8A96E; color: #0A1628; border: none; border-radius: 4px; font-family: 'Cinzel', serif; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; font-weight: 600; transition: background 0.2s; margin-top: 16px; }
        .checkout-btn:hover { background: #E2C98A; }
        .checkout-btn:disabled { background: #C9CFD6; color: #5C6573; cursor: not-allowed; }
        .size-btn { flex: 1; padding: 9px 0; border-radius: 4px; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px; transition: all 0.15s; }
        .toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); background: #0E1E38; color: #F6F1E4; padding: 12px 28px; border-radius: 40px; font-family: 'Inter', sans-serif; font-size: 13px; letter-spacing: 0.08em; z-index: 999; pointer-events: none; animation: fadeInUp 0.3s ease; }
        @keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        input, textarea, select { width: 100%; padding: 10px 14px; border: 1px solid rgba(92,101,115,0.30); border-radius: 4px; background: #FFFDF8; font-family: 'Inter', sans-serif; font-size: 14px; color: #15223B; outline: none; transition: border-color 0.2s; }
        input:focus, textarea:focus, select:focus { border-color: #C8A96E; }
        textarea { resize: vertical; min-height: 72px; }
        .store-tabs { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; width: fit-content; max-width: 100%; margin: 0 auto 24px; padding: 6px; background: #FFFDF8; border: 1px solid rgba(200,169,110,0.40); border-radius: 999px; box-shadow: 0 3px 16px rgba(10,22,40,0.10); }
        .store-tab { background: transparent; border: none; border-radius: 999px; padding: 12px 28px; font-family: 'Cinzel', serif; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #5C6573; cursor: pointer; font-weight: 600; transition: color 0.18s, background 0.18s, box-shadow 0.18s; white-space: nowrap; }
        .store-tab:hover { color: #15223B; background: rgba(200,169,110,0.12); }
        .store-tab--active, .store-tab--active:hover { color: #F5EDD8; background: linear-gradient(135deg, #0E1E38 0%, #0A1628 100%); box-shadow: 0 3px 12px rgba(10,22,40,0.30); }
        @media (max-width: 600px) { .store-tabs { gap: 4px; padding: 5px; } .store-tab { padding: 10px 16px; font-size: 11px; letter-spacing: 0.04em; } }
        @media (max-width: 768px) { .products-grid { grid-template-columns: 1fr !important; } .packs-grid { grid-template-columns: 1fr !important; } .cart-drawer { width: 100vw; } }
        @media (max-width: 600px) { .nav-extra { display: none !important; } .store-nav { padding: 0 16px !important; } }
        /* Band card image: fill on desktop, but show the WHOLE band on mobile (no crop). */
        .pb-band-img { object-fit: cover; }
        @media (max-width: 768px) { .pb-band-img { object-fit: contain !important; padding: 14px; } }
        .pb-zoom-btn { position: absolute; bottom: 10px; right: 12px; z-index: 4; width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer; background: rgba(10,22,40,0.55); color: #fff; font-size: 14px; display: flex; align-items: center; justify-content: center; line-height: 1; }
        .pb-zoom-btn:hover { background: rgba(10,22,40,0.78); }
        .pb-lightbox { position: fixed; inset: 0; z-index: 1000; background: rgba(8,12,22,0.92); display: flex; align-items: center; justify-content: center; padding: 24px; cursor: zoom-out; }
        .pb-lightbox img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
        .pb-lightbox-close { position: absolute; top: 18px; right: 22px; background: none; border: none; color: #fff; font-size: 30px; cursor: pointer; line-height: 1; }
      `}</style>

      {toast && <div className="toast">✝︎ {toast}</div>}

      {replaces && (
        <div style={{ background: "#0E1E38", color: "#F6F1E4", textAlign: "center", padding: "10px 20px", fontFamily: "'Inter', sans-serif", fontSize: 13, letterSpacing: "0.03em" }}>
          ✝︎ Replacing band <strong style={{ color: "#E2C98A" }}>{replaces}</strong> — its prayer journey will move to your new band once it ships.
        </div>
      )}

      {/* NAV — shared site navigation; cart icon opens the drawer here */}
      <SiteNav onCartClick={() => setCartOpen(true)} cartCount={totalItems} />

      {/* Referral discount banner — only when a valid ?ref was applied.
          The amount must match the live Stripe coupon behind
          STRIPE_REFERRAL_PROMO_CODE_ID (FRIEND20 = 20%). */}
      {referral && (
        <div style={{ background: "#F5EFE4", borderBottom: "1px solid rgba(200,169,110,0.34)", textAlign: "center", padding: "11px 20px", fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: "#9A7A35", letterSpacing: "0.02em" }}>
          You&rsquo;re getting <strong style={{ color: "#5A3E12" }}>20% off</strong> — a gift from someone in the Prayer Bands community 🙏
        </div>
      )}

      {/* HERO */}
      <section style={{ padding: "30px 32px 26px", textAlign: "center", background: "radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%), linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%)", borderBottom: "1px solid rgba(200,169,110,0.34)" }}>
        <span className="section-label" style={{ color: "#C8A96E", marginBottom: "6px" }}>The Store</span>
        <h1 className="playfair" style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 700, lineHeight: 1.1, marginBottom: 8, color: "#F5EDD8" }}>Send a Prayer Into <em style={{ color: "#C8A96E" }}>the World</em></h1>
        <p className="lato" style={{ fontSize: 14, color: "rgba(245,237,216,0.72)", maxWidth: 440, margin: "0 auto", lineHeight: 1.55, fontWeight: 300 }}>Every band ships NFC-enabled and laser-engraved with a unique ID — one tap opens its digital journey.</p>
      </section>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "24px 32px 64px" }}>

        {/* STORE TABS */}
        <div className="store-tabs">
          {([
            { id: "buy", label: "Buy a Band" },
            { id: "subscribe", label: "Subscribe" },
            { id: "bulk", label: "Bulk Order" },
            { id: "community", label: "Communities" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setStoreTab(t.id)} className={`store-tab ${storeTab === t.id ? "store-tab--active" : ""}`}>{t.label}</button>
          ))}
        </div>

        {storeTab === "buy" && (<>
        {/* Auto-discount now lives in a sticky footer bar (see end of page) so
            it stays visible while browsing without eating the top of the page. */}

        {/* INDIVIDUAL BANDS */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ marginBottom: 16 }}>
            <span className="section-label">Individual Bands</span>
            <h2 className="playfair" style={{ fontSize: 26, fontWeight: 600, color: "#15223B", marginTop: 2 }}>For Personal Giving</h2>
          </div>

          {/* Filter: themed vs solid color bands */}
          {hasThemed && (
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {([["all", "All Bands"], ["themed", "Themed"], ["solid", "Solid Color"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => setBandFilter(val)} className="lato" style={{
                  padding: "8px 18px", borderRadius: 24, cursor: "pointer", fontSize: 12, letterSpacing: "0.04em",
                  border: `1px solid ${bandFilter === val ? "#C8A96E" : "#C9CFD6"}`,
                  background: bandFilter === val ? "#C8A96E" : "transparent",
                  color: bandFilter === val ? "#0A1628" : "#5C6573",
                  fontWeight: bandFilter === val ? 700 : 400,
                }}>{label}</button>
              ))}
            </div>
          )}

          <div className="products-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            {shownBands.map(product => {
              const price = product.price;
              const size = sizes[product.slug] || (product.sizes[0] || "M");
              const sizeLabel = SIZES.find(s => s.id === size)?.label || size;
              const avail = availabilityOf(product, size);
              const isCustom = product.slug === "custom";
              return (
              <div key={product.slug} className="product-card">
                <BandCarousel images={product.images || []} color={product.color} icon={product.icon} tag={product.tag} />
                <div style={{ padding: "28px 28px 32px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <h3 className="playfair" style={{ fontSize: 24, fontWeight: 600, color: "#15223B" }}>{product.name}</h3>
                    <div className="playfair" style={{ fontSize: 28, fontWeight: 700, color: "#9A7A35" }}>${price}</div>
                  </div>
                  <p className="lato" style={{ fontSize: 14, lineHeight: 1.75, color: "#5C6573", fontWeight: 300, marginBottom: 20 }}>{product.description}</p>

                  {product.multiDiscount && (prodPct(product, 3) > 0 || prodPct(product, 5) > 0) && (
                    <div className="lato" style={{ fontSize: 12, color: "#9A7A35", fontWeight: 600, marginBottom: 18, letterSpacing: "0.02em" }}>
                      Buy 3+ for ${prodUnit(product, 3).toFixed(2)} ea · 5+ for ${prodUnit(product, 5).toFixed(2)} ea — applied automatically
                    </div>
                  )}

                  <div style={{ marginBottom: 20 }}>
                    {product.features.map(f => (
                      <div key={f} className="lato" style={{ fontSize: 13, color: "#2A3344", padding: "5px 0", borderBottom: "1px solid rgba(92,101,115,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#C8A96E", fontSize: 10 }}>✦</span> {f}
                      </div>
                    ))}
                  </div>

                  {product.hasSizes && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <label style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#5C6573" }}>Size</label>
                        <button onClick={() => setShowSizeGuide(true)} className="lato" style={{ background: "none", border: "none", color: "#9A7A35", fontSize: 11, cursor: "pointer", textDecoration: "underline", letterSpacing: "0.05em", padding: 0 }}>Size guide</button>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {product.sizes.map(sid => {
                          const sel = size === sid;
                          const label = SIZES.find(s => s.id === sid)?.label || sid;
                          return <button key={sid} className="size-btn" onClick={() => setSizes(p => ({ ...p, [product.slug]: sid }))} style={{ border: `1px solid ${sel ? "#C8A96E" : "rgba(92,101,115,0.25)"}`, background: sel ? "rgba(200,169,110,0.12)" : "#FFFDF8", color: sel ? "#15223B" : "#5C6573", fontWeight: sel ? 700 : 400 }}>{label}</button>;
                        })}
                      </div>
                    </div>
                  )}

                  {isCustom && (
                    <div style={{ marginBottom: 20, display: "grid", gap: 12 }}>
                      <div>
                        <label style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#5C6573", display: "block", marginBottom: 6 }}>Band Color</label>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {COLORS.map(c => <button key={c.name} title={c.name} onClick={() => setCustomColor(c.name)} style={{ width: 28, height: 28, borderRadius: "50%", background: c.hex, border: customColor === c.name ? "3px solid #0A1628" : "2px solid rgba(92,101,115,0.25)", cursor: "pointer" }} />)}
                        </div>
                      </div>
                      <div><label style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#5C6573", display: "block", marginBottom: 6 }}>Scripture Verse (optional)</label><input placeholder="e.g. John 3:16" value={customVerse} onChange={e => setCustomVerse(e.target.value)} /></div>
                      <div><label style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#5C6573", display: "block", marginBottom: 6 }}>Personal Message (optional)</label><textarea placeholder="A short message for the recipient..." value={customMsg} onChange={e => setCustomMsg(e.target.value)} /></div>
                    </div>
                  )}

                  {avail === "backorder" && <div className="lato" style={{ fontSize: 12, color: "#9A7A35", marginBottom: 10, fontWeight: 700 }}>On backorder — ships when restocked.</div>}
                  {avail === "out" && <div className="lato" style={{ fontSize: 12, color: "#5C6573", marginBottom: 10, fontWeight: 700 }}>Out of stock</div>}

                  <button className="add-btn" disabled={avail === "out"} style={{ background: "#C8A96E", color: "#0A1628" }}
                    onClick={() => addToCart({
                      id: product.slug, name: product.name, price, type: product.category, size,
                      multiDiscount: product.multiDiscount,
                      detail: isCustom ? `${sizeLabel} · ${customColor}${customVerse ? ` · ${customVerse}` : ""}` : `Size: ${sizeLabel}`,
                    })}>
                    {avail === "out" ? "Out of Stock" : avail === "backorder" ? `Backorder — $${price}` : `Add to Cart — $${price}`}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
          {shownBands.length === 0 && (
            <div className="lato" style={{ padding: "32px 0", color: "#5C6573", fontStyle: "italic" }}>No {bandFilter} bands available right now.</div>
          )}
        </div>
        </>)}

        {/* SUBSCRIPTION */}
        {storeTab === "subscribe" && (
        <a href="/subscribe" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ marginBottom: 80, background: "linear-gradient(135deg, #132544 0%, #0E1E38 100%)", border: "1px solid rgba(200,169,110,0.30)", borderRadius: 12, padding: "40px 48px", display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap", cursor: "pointer", boxShadow: "0 8px 28px rgba(10,22,40,0.22)" }}>
            <div style={{ fontSize: 52 }}>🔁</div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <span className="section-label" style={{ color: "#C8A96E" }}>Subscribe & Save</span>
              <h3 className="playfair" style={{ fontSize: 30, fontWeight: 600, marginBottom: 10, color: "#F6F1E4" }}>Band Credit, Every Month — Send Whenever</h3>
              <p className="lato" style={{ fontSize: 15, color: "#C9CFD6", lineHeight: 1.8, fontWeight: 300 }}>Make intercession a rhythm. Subscribe and save up to 25% — credit lands in your account each cycle to send a band the moment someone needs prayer. Free shipping, never expires, cancel anytime.</p>
            </div>
            <button style={{ background: "#C8A96E", border: "none", color: "#0A1628", padding: "14px 36px", borderRadius: 4, fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>View Plans →</button>
          </div>
        </a>
        )}

        {storeTab === "bulk" && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ marginBottom: 20 }}>
              <span className="section-label">Bulk Order</span>
              <h2 className="playfair" style={{ fontSize: 26, fontWeight: 600, color: "#15223B", marginTop: 2 }}>Build an assorted order</h2>
              <p className="lato" style={{ fontSize: 14, color: "#5C6573", marginTop: 8, lineHeight: 1.6, fontWeight: 300 }}>
                Enter quantities by style and size — perfect for handing out 20–30 at a group, church, or event. Ships to you; you distribute. The multi-band discount applies automatically (3+ ${tier3.toFixed(2)}/ea · 5+ ${tier5.toFixed(2)}/ea), and shipping is free over $35.
              </p>
            </div>

            {bulkStyles.length === 0 && <p className="lato" style={{ color: "#5C6573", fontStyle: "italic" }}>Loading styles…</p>}

            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              {bulkStyles.map(p => (
                <div key={p.slug} style={{ background: "#FFFDF8", border: "1px solid rgba(200,169,110,0.30)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                    {bulkImg(p) && !bulkImgBroken[p.slug] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bulkImg(p)} alt="" onError={() => setBulkImgBroken(b => ({ ...b, [p.slug]: true }))}
                        style={{ width: 46, height: 46, borderRadius: 8, objectFit: "contain", background: "#fff", border: "1px solid rgba(200,169,110,0.25)", flexShrink: 0, padding: 3, boxSizing: "border-box" }} />
                    ) : (
                      <div style={{ width: 46, height: 46, borderRadius: 8, background: p.color || "#C8A96E", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, flexShrink: 0 }}>{p.icon || "✝︎"}</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div className="playfair" style={{ fontSize: 15.5, fontWeight: 600, color: "#15223B" }}>{p.name}</div>
                      <div className="lato" style={{ fontSize: 12, color: "#9A7A35" }}>${bulkUnit(p).toFixed(2)} each{p.multiDiscount && bulkTierPct(p.discountTiers) > 0 ? " · bulk price" : ""}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {SIZES.filter(s => p.sizes.includes(s.id)).map(s => (
                      <label key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <span className="lato" style={{ fontSize: 11, color: "#5C6573", fontWeight: 600 }}>{s.id}</span>
                        <input type="number" inputMode="numeric" min={0} value={bulkQty[`${p.slug}|${s.id}`] || ""} onChange={e => setBulkCell(p.slug, s.id, e.target.value)} placeholder="0"
                          style={{ width: 52, textAlign: "center", padding: "8px 4px", borderRadius: 8, border: "1px solid rgba(10,22,40,0.15)", fontSize: 15, fontFamily: "'Inter', sans-serif", color: "#15223B", background: "#fff", outline: "none" }} />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "#ECEEF1", borderRadius: 10, padding: "18px 20px", border: "1px solid rgba(92,101,115,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span className="lato" style={{ fontSize: 13, color: "#5C6573" }}>Bands</span><span className="lato" style={{ fontSize: 13, color: "#15223B", fontWeight: 700 }}>{bulkBands}</span></div>
              {bulkSavings > 0.001 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span className="lato" style={{ fontSize: 13, color: "#5C6573" }}>Total</span><span className="lato" style={{ fontSize: 13, color: "#15223B", fontWeight: 700 }}>${(bulkSubtotal + bulkSavings).toFixed(2)}</span></div>}
              {bulkSavings > 0.001 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span className="lato" style={{ fontSize: 13, color: "#2F7D5B" }}>Multi-band savings</span><span className="lato" style={{ fontSize: 13, color: "#2F7D5B", fontWeight: 700 }}>−${bulkSavings.toFixed(2)}</span></div>}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span className="lato" style={{ fontSize: 13, color: "#5C6573" }}>Subtotal</span><span className="lato" style={{ fontSize: 13, color: "#15223B", fontWeight: 700 }}>${bulkSubtotal.toFixed(2)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span className="lato" style={{ fontSize: 13, color: "#5C6573" }}>Shipping</span><span className="lato" style={{ fontSize: 13, color: bulkFreeShip ? "#2F7D5B" : "#5C6573", fontWeight: bulkFreeShip ? 700 : 400 }}>{bulkFreeShip ? "FREE" : `$${bulkShip.toFixed(2)}`}</span></div>
              <div style={{ borderTop: "1px solid rgba(92,101,115,0.20)", paddingTop: 12, marginTop: 8, display: "flex", justifyContent: "space-between" }}><span className="playfair" style={{ fontSize: 18, fontWeight: 600, color: "#15223B" }}>Total due</span><span className="playfair" style={{ fontSize: 22, fontWeight: 700, color: "#9A7A35" }}>${bulkTotal.toFixed(2)}</span></div>
            </div>

            <button className="checkout-btn" disabled={bulkLoading || bulkBands === 0} onClick={bulkCheckout} style={{ marginTop: 14 }}>
              {bulkLoading ? "Redirecting…" : bulkBands === 0 ? "Add quantities above" : `Checkout ${bulkBands} band${bulkBands === 1 ? "" : "s"} — $${bulkTotal.toFixed(2)} →`}
            </button>
            <p className="lato" style={{ fontSize: 11, textAlign: "center", color: "#5C6573", marginTop: 12, letterSpacing: "0.05em" }}>Ships to you to hand out · Secure checkout via Stripe</p>
          </div>
        )}

        {storeTab === "community" && (<>
        {/* CHURCH PACKS */}
        {packProducts.length > 0 && (
        <div id="packs" style={{ marginBottom: 80, scrollMarginTop: 80 }}>
          <div style={{ marginBottom: 40 }}>
            <span className="section-label">Church & Ministry Packs</span>
            <h2 className="playfair" style={{ fontSize: 36, fontWeight: 600, color: "#15223B" }}>For Communities</h2>
            <div style={{ width: 40, height: 1, background: "#C9CFD6", marginTop: 14, marginBottom: 10 }} />
            <p className="lato" style={{ fontSize: 15, color: "#5C6573", marginTop: 0, fontWeight: 300 }}>Bulk pricing with a custom ministry prefix (e.g. FBC-XXXXX) and dashboard access. Special and custom designs — your own colors, artwork, or logo — are available on request.</p>
          </div>
          <div className="lato" style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#FFFDF8", border: "1px solid rgba(200,169,110,0.34)", borderLeft: "3px solid #C8A96E", borderRadius: 8, padding: "12px 16px", marginBottom: 28, fontSize: 13.5, color: "#2A3344", lineHeight: 1.6, fontWeight: 300 }}>
            <span style={{ fontSize: 15, lineHeight: 1.4 }}>🗓️</span>
            <span>Please allow <strong style={{ fontWeight: 600, color: "#15223B" }}>4–6 weeks</strong> for bulk and custom orders — every band is laser-engraved and programmed to order.</span>
          </div>
          <div className="packs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {packProducts.map(pack => {
              const price = pack.price;
              const perBand = price / (pack.bandsPerUnit || 1);
              const avail = availabilityOf(pack, "");
              return (
              <div key={pack.slug} className="pack-card" style={{ borderTop: "4px solid #C8A96E" }}>
                {pack.tag && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: "#C8A96E", color: "#0A1628", fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", padding: "3px 14px", borderRadius: "0 0 8px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>{pack.tag}</div>}
                <div style={{ marginBottom: 20 }}>
                  <h3 className="playfair" style={{ fontSize: 22, fontWeight: 600, marginBottom: 6, color: "#15223B" }}>{pack.name}</h3>
                  <p className="lato" style={{ fontSize: 13, color: "#5C6573", lineHeight: 1.7, fontWeight: 300 }}>{pack.description}</p>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <div className="playfair" style={{ fontSize: 38, fontWeight: 700, color: "#9A7A35", lineHeight: 1 }}>${price.toFixed(2)}</div>
                  <div className="lato" style={{ fontSize: 12, color: "#5C6573", marginTop: 4 }}>${perBand.toFixed(2)}/band · {pack.bandsPerUnit} bands</div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  {pack.features.map(f => <div key={f} className="lato" style={{ fontSize: 13, color: "#2A3344", padding: "5px 0", borderBottom: "1px solid rgba(92,101,115,0.15)", display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "#C8A96E", fontSize: 10 }}>✦</span> {f}</div>)}
                </div>
                {avail === "backorder" && <div className="lato" style={{ fontSize: 12, color: "#9A7A35", marginBottom: 10, fontWeight: 700 }}>On backorder — ships when restocked.</div>}
                {avail === "out" && <div className="lato" style={{ fontSize: 12, color: "#5C6573", marginBottom: 10, fontWeight: 700 }}>Out of stock</div>}
                <button className="add-btn" disabled={avail === "out"} style={{ background: "#C8A96E", color: "#0A1628" }}
                  onClick={() => addToCart({ id: pack.slug, name: `${pack.name} (${pack.bandsPerUnit} bands)`, price, type: "pack" })}>
                  {avail === "out" ? "Out of Stock" : `Add to Cart — $${price.toFixed(2)}`}
                </button>
              </div>
              );
            })}
          </div>
        </div>
        )}

        {/* LARGE ORDERS */}
        <div style={{ background: "linear-gradient(135deg, #0A1628 0%, #132544 100%)", borderRadius: 12, padding: "48px 56px", display: "flex", alignItems: "center", gap: 48, flexWrap: "wrap", border: "1px solid rgba(200,169,110,0.25)" }}>
          <div style={{ fontSize: 56 }}>🕊️</div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <span className="section-label" style={{ color: "#C8A96E" }}>Large Orders</span>
            <h3 className="playfair" style={{ fontSize: 28, color: "#F6F1E4", marginBottom: 12 }}>Need 500+ Bands?</h3>
            <p className="lato" style={{ fontSize: 15, color: "#C9CFD6", lineHeight: 1.8, fontWeight: 300 }}>We work with denominations, mission organizations, and large congregations for custom quantities, special designs, and pricing. Bulk and custom orders take about 4–6 weeks to produce and ship.</p>
          </div>
          <a href="/contact" style={{ textDecoration: "none" }}><button style={{ background: "transparent", border: "1.5px solid #C8A96E", color: "#C8A96E", padding: "14px 36px", borderRadius: 4, fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>Contact Us</button></a>
        </div>
        </>)}
      </div>

      {/* SIZE GUIDE MODAL */}
      {showSizeGuide && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={e => { if (e.target === e.currentTarget) setShowSizeGuide(false); }}>
          <div style={{ background: "#FFFDF8", borderRadius: 12, padding: "32px 28px", maxWidth: 440, width: "100%", boxShadow: "0 24px 80px rgba(10,22,40,0.22)", border: "1px solid rgba(200,169,110,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div><span className="section-label">Find your fit</span><h2 className="playfair" style={{ fontSize: 24, fontWeight: 600, color: "#15223B" }}>Band Size Guide</h2></div>
              <button onClick={() => setShowSizeGuide(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#5C6573", lineHeight: 1 }}>×</button>
            </div>
            <p className="lato" style={{ fontSize: 13, color: "#5C6573", lineHeight: 1.7, marginBottom: 20, fontWeight: 300 }}>Measure around your wrist with a soft tape or a strip of paper, then match it below.</p>
            <div style={{ border: "1px solid rgba(92,101,115,0.20)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", background: "#0A1628", color: "#F6F1E4", fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
                <div style={{ padding: "10px 12px" }}>Size</div><div style={{ padding: "10px 12px" }}>Wrist</div><div style={{ padding: "10px 12px" }}>Best for</div>
              </div>
              {SIZE_CHART.map((row, i) => (
                <div key={row.size} className="lato" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", fontSize: 13, color: "#15223B", background: i % 2 ? "#ECEEF1" : "#FFFDF8" }}>
                  <div style={{ padding: "12px", fontWeight: 700 }}>{row.size}</div><div style={{ padding: "12px", color: "#2A3344" }}>{row.wrist}</div><div style={{ padding: "12px", color: "#5C6573" }}>{row.fit}</div>
                </div>
              ))}
            </div>
            <button className="add-btn" style={{ background: "#C8A96E", color: "#0A1628", marginTop: 20 }} onClick={() => setShowSizeGuide(false)}>Got it</button>
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {cartOpen && (
        <div className="cart-overlay" onClick={e => { if (e.target === e.currentTarget) setCartOpen(false); }}>
          <div className="cart-drawer">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <h2 className="playfair" style={{ fontSize: 26, fontWeight: 600, color: "#15223B" }}>Your Cart</h2>
              <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#5C6573" }}>×</button>
            </div>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
                <p className="lato" style={{ fontSize: 14, color: "#5C6573", fontWeight: 300 }}>Your cart is empty.</p>
                <p className="lato" style={{ fontSize: 13, color: "#9A7A35", marginTop: 8, fontWeight: 300 }}>Add a band to start a prayer chain.</p>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
                  {cart.map(item => {
                    const unit = lineUnit(item);
                    return (
                    <div key={`${item.id}-${item.size || ""}`} style={{ background: "#FFFDF8", border: "1px solid rgba(200,169,110,0.30)", borderRadius: 8, padding: "16px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div className="playfair" style={{ fontSize: 16, fontWeight: 600, color: "#15223B" }}>{item.name}</div>
                          {item.detail && <div className="lato" style={{ fontSize: 12, color: "#5C6573", marginTop: 2 }}>{item.detail}</div>}
                        </div>
                        <div className="playfair" style={{ fontSize: 16, fontWeight: 600, color: "#9A7A35" }}>${(unit * item.qty).toFixed(2)}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button className="qty-btn" onClick={() => updateQty(item.id, item.size, -1)}>−</button>
                        <span className="lato" style={{ fontSize: 15, fontWeight: 700, minWidth: 20, textAlign: "center", color: "#15223B" }}>{item.qty}</span>
                        <button className="qty-btn" onClick={() => updateQty(item.id, item.size, 1)}>+</button>
                        <span className="lato" style={{ fontSize: 12, color: "#5C6573", marginLeft: 4 }}>${unit.toFixed(2)} each</span>
                      </div>
                    </div>
                    );
                  })}
                </div>

                {stdSavings > 0.001 && <div className="lato" style={{ background: "#ECEEF1", color: "#15223B", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 12, textAlign: "center", fontWeight: 700, border: "1px solid rgba(92,101,115,0.20)" }}>✓ Multi-band pricing saved you ${stdSavings.toFixed(2)}</div>}

                {/* Free-shipping progress: nudge toward the threshold, celebrate once cleared. */}
                <div style={{ background: qualifiesFreeShip ? "#E4F1E8" : "#FBF3E0", border: `1px solid ${qualifiesFreeShip ? "rgba(47,125,91,0.35)" : "rgba(200,169,110,0.40)"}`, borderRadius: 8, padding: "11px 14px", marginBottom: 12 }}>
                  <div className="lato" style={{ fontSize: 12.5, textAlign: "center", color: qualifiesFreeShip ? "#2F7D5B" : "#9A7A35", fontWeight: 600 }}>
                    {qualifiesFreeShip ? "🎉 You've unlocked free shipping!" : <>Add <strong>${toFreeShip.toFixed(2)}</strong> more for free shipping 🚚</>}
                  </div>
                  <div style={{ height: 5, background: "rgba(92,101,115,0.15)", borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (subtotalCents / FREE_SHIPPING_MIN_CENTS) * 100)}%`, background: qualifiesFreeShip ? "#2F7D5B" : "#C8A96E", borderRadius: 99, transition: "width 0.3s ease" }} />
                  </div>
                </div>

                <div style={{ background: "#ECEEF1", borderRadius: 8, padding: "20px 20px", marginBottom: 8, border: "1px solid rgba(92,101,115,0.15)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span className="lato" style={{ fontSize: 13, color: "#5C6573" }}>Subtotal</span><span className="lato" style={{ fontSize: 13, color: "#15223B", fontWeight: 700 }}>${subtotal.toFixed(2)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span className="lato" style={{ fontSize: 13, color: "#5C6573" }}>Shipping</span><span className="lato" style={{ fontSize: 13, color: qualifiesFreeShip ? "#2F7D5B" : "#5C6573", fontWeight: qualifiesFreeShip ? 700 : 400 }}>{qualifiesFreeShip ? "FREE" : `$${shipping.toFixed(2)}`}</span></div>
                  <div style={{ borderTop: "1px solid rgba(92,101,115,0.20)", paddingTop: 12, marginTop: 8, display: "flex", justifyContent: "space-between" }}><span className="playfair" style={{ fontSize: 18, fontWeight: 600, color: "#15223B" }}>Total</span><span className="playfair" style={{ fontSize: 22, fontWeight: 700, color: "#9A7A35" }}>${total.toFixed(2)}</span></div>
                </div>

                <div style={{ background: "#FBF7EE", border: "1px solid rgba(200,169,110,0.4)", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#15223B", cursor: "pointer", fontWeight: 600 }}>
                    <input type="checkbox" checked={isGift} onChange={e => setIsGift(e.target.checked)} style={{ width: 16, height: 16 }} />
                    This is a gift for someone else
                  </label>
                  {isGift && (
                    <>
                      <input value={giftName} onChange={e => setGiftName(e.target.value)} placeholder="Recipient's full name" style={{ width: "100%", marginTop: 10, padding: "10px 12px", border: "1px solid rgba(92,101,115,0.3)", borderRadius: 6, fontSize: 14 }} />
                      <p className="lato" style={{ fontSize: 11, color: "#5C6573", marginTop: 6, lineHeight: 1.5 }}>The band ships to this person at the address you enter next. Leave the gift box unchecked if it's for you.</p>
                    </>
                  )}
                </div>

                <button className="checkout-btn" disabled={checkoutLoading || cart.length === 0 || (isGift && !giftName.trim())} onClick={async () => {
                  setCheckoutLoading(true)
                  track('begin_checkout', { currency: 'USD', value: subtotal, items: cart.map(c => ({ item_id: c.id, item_name: c.name, quantity: c.qty, price: lineUnit(c) })) })
                  const res = await fetch('/api/create-checkout', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ ...readGaIds(), items: cart.map(c => ({ id: c.id, qty: c.qty, size: c.size })), customMessage: customMsg || '', verse: customVerse || '', color: customColor || 'Amber Gold', replaces: replaces || '', referralCode: referral?.code || '', recipientName: isGift ? giftName.trim() : '' })
                  })
                  const data = await res.json()
                  if (data.url) { window.location.href = data.url } else { showToast('Something went wrong — please try again'); setCheckoutLoading(false) }
                }}>{checkoutLoading ? 'Redirecting...' : (isGift && !giftName.trim()) ? "Enter the recipient's name" : `Proceed to Checkout — $${total.toFixed(2)}`}</button>
                <p className="lato" style={{ fontSize: 11, textAlign: "center", color: "#5C6573", marginTop: 12, letterSpacing: "0.05em" }}>Secure checkout via Stripe · Ships in 3-5 days</p>
              </>
            )}
          </div>
        </div>
      )}
      {/* Sticky auto-discount bar — slides up on scroll, buy tab only. */}
      {storeTab === "buy" && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90, background: "#0E1E38", color: "#F6F1E4", borderTop: "1px solid rgba(200,169,110,0.35)", boxShadow: "0 -4px 20px rgba(10,22,40,0.28)", padding: "10px 44px calc(10px + env(safe-area-inset-bottom))", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", transform: (showDealBar && !dealDismissed) ? "translateY(0)" : "translateY(105%)", transition: "transform 0.3s ease" }}>
          <span style={{ fontSize: 18 }}>🎉</span>
          <span className="lato" style={{ fontSize: 13.5, letterSpacing: "0.02em", lineHeight: 1.4 }}>
            Buy more, save automatically — <strong style={{ color: "#E2C98A" }}>3+ ${tier3.toFixed(2)}/ea</strong> · <strong style={{ color: "#E2C98A" }}>5+ ${tier5.toFixed(2)}/ea</strong>, applied in your cart.
          </span>
          <button onClick={() => setDealDismissed(true)} aria-label="Dismiss" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(246,241,228,0.6)", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#F6F1E4" }} />}>
      <StorePageInner />
    </Suspense>
  );
}
