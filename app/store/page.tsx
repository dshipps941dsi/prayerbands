'use client'
import { useState } from "react";
import Logo from "@/components/Logo";
import Icon from "@/components/Icon";

// ─── Types ───────────────────────────────────────────────────
type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  type: "standard" | "custom" | "pack";
  detail?: string;
};

// ─── Product Data ─────────────────────────────────────────────
const INDIVIDUAL = [
  {
    id: "standard",
    type: "standard" as const,
    name: "Standard Band",
    price: 5,
    color: "#C8A96E",
    icon: "✝",
    tag: "Most Popular",
    desc: "A wristband laser-engraved with a unique PB-XXXXX ID and NFC chip. Ready to carry a prayer.",
    features: ["Unique PB-XXXXX ID", "NFC chip enabled", "Laser-engraved", "Full journey tracking"],
  },
  {
    id: "custom",
    type: "custom" as const,
    name: "Custom Band",
    price: 10,
    color: "#7BAE8E",
    icon: "✦",
    tag: "Personalized",
    desc: "Everything in Standard, plus your choice of color, a custom scripture verse, and a personal message engraved.",
    features: ["Everything in Standard", "Choose band color", "Custom scripture verse", "Personal message", "Gift-ready packaging"],
  },
];

const PACKS = [
  {
    id: "pack-50",
    type: "pack" as const,
    name: "Starter Pack",
    bands: 50,
    price: 225.00,
    perBand: 4.50,
    color: "#7BAE8E",
    desc: "Perfect for small groups, house churches, or personal outreach.",
    savings: "Save 10%",
  },
  {
    id: "pack-100",
    type: "pack" as const,
    name: "Community Pack",
    bands: 100,
    price: 425.00,
    perBand: 4.25,
    color: "#C8A96E",
    desc: "Ideal for congregation-wide initiatives and mission trips.",
    savings: "Save 15%",
    popular: true,
  },
  {
    id: "pack-200",
    type: "pack" as const,
    name: "Mission Pack",
    bands: 200,
    price: 800.00,
    perBand: 4.00,
    color: "#7B8FAE",
    desc: "For conferences, large outreaches, and denominational orders.",
    savings: "Save 20%",
  },
];

const COLORS = [
  { name: "Amber Gold", hex: "#C8A96E" },
  { name: "Sage Green", hex: "#7BAE8E" },
  { name: "Slate Blue", hex: "#7B8FAE" },
  { name: "Burgundy", hex: "#AE7B7B" },
  { name: "Midnight", hex: "#2C1A0E" },
  { name: "Ivory", hex: "#F5EFE4" },
];

export default function StorePage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customColor, setCustomColor] = useState(COLORS[0].name);
  const [customVerse, setCustomVerse] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [toast, setToast] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const addToCart = (item: Omit<CartItem, "qty">) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
    showToast(`${item.name} added to cart`);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.id === id ? { ...c, qty: c.qty + delta } : c)
      .filter(c => c.qty > 0)
    );
  };

  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: "#FDFAF5", color: "#2C1A0E", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .playfair { font-family: 'Playfair Display', serif; }
        .lato { font-family: 'Lato', sans-serif; }
        .section-label { font-family:'Lato',sans-serif; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:#C8A96E; display:block; margin-bottom:10px; }
        .add-btn {
          width: 100%; padding: 14px; border: none; border-radius: 4px;
          font-family: 'Lato', sans-serif; font-size: 13px; letter-spacing: 0.12em;
          text-transform: uppercase; cursor: pointer; transition: all 0.2s;
          font-weight: 700;
        }
        .add-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(44,26,14,0.15); }
        .product-card {
          background: #fff; border: 1px solid #E8DFD0; border-radius: 10px;
          overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;
        }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(44,26,14,0.10); }
        .pack-card {
          background: #fff; border: 1px solid #E8DFD0; border-radius: 10px;
          padding: 32px 28px; transition: transform 0.2s, box-shadow 0.2s; position: relative;
        }
        .pack-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(44,26,14,0.10); }
        .qty-btn {
          width: 28px; height: 28px; border-radius: 50%; border: 1px solid #E8DFD0;
          background: #FDFAF5; cursor: pointer; font-size: 16px; display: flex;
          align-items: center; justify-content: center; transition: background 0.15s;
        }
        .qty-btn:hover { background: #E8DFD0; }
        .cart-overlay {
          position: fixed; inset: 0; background: rgba(44,26,14,0.4); z-index: 200;
          display: flex; justify-content: flex-end;
        }
        .cart-drawer {
          width: 420px; max-width: 100vw; background: #FDFAF5;
          height: 100vh; overflow-y: auto; padding: 32px 28px;
          box-shadow: -8px 0 48px rgba(44,26,14,0.15);
        }
        .checkout-btn {
          width: 100%; padding: 16px; background: #C8A96E; color: #fff;
          border: none; border-radius: 4px; font-family: 'Lato', sans-serif;
          font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase;
          cursor: pointer; font-weight: 700; transition: background 0.2s;
          margin-top: 16px;
        }
        .checkout-btn:hover { background: #B8944A; }
        .checkout-btn:disabled { background: #C8B49A; cursor: not-allowed; }
        .toast {
          position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
          background: #2C1A0E; color: #FDFAF5; padding: 12px 28px; border-radius: 40px;
          font-family: 'Lato', sans-serif; font-size: 13px; letter-spacing: 0.08em;
          z-index: 999; pointer-events: none;
          animation: fadeInUp 0.3s ease;
        }
        @keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        input, textarea, select {
          width: 100%; padding: 10px 14px; border: 1px solid #E8DFD0; border-radius: 4px;
          background: #FDFAF5; font-family: 'Lato', sans-serif; font-size: 14px;
          color: #2C1A0E; outline: none; transition: border-color 0.2s;
        }
        input:focus, textarea:focus, select:focus { border-color: #C8A96E; }
        textarea { resize: vertical; min-height: 72px; }
        @media (max-width: 768px) {
          .products-grid { grid-template-columns: 1fr !important; }
          .packs-grid { grid-template-columns: 1fr !important; }
          .cart-drawer { width: 100vw; }
        }
      `}</style>

      {/* TOAST */}
      {toast && <div className="toast">✝ {toast}</div>}

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(253,250,245,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid #E8DFD0", padding: "0 32px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <Logo size={30} />
            <span className="playfair" style={{ fontSize: 18, fontWeight: 600, color: "#2C1A0E" }}>PrayerBands</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="/" className="lato" style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9B7B62", textDecoration: "none" }}>← Back to Home</a>
            <a href="/subscribe" className="lato" style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#C8A96E", textDecoration: "none", fontWeight: 700 }}>Subscribe</a>
            <button
              onClick={() => setCartOpen(true)}
              style={{ position: "relative", background: "#2C1A0E", border: "none", borderRadius: 4, padding: "9px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              <Icon name="shop-bag" size={16} color="#FDFAF5" bg="#2C1A0E" />
              <span className="lato" style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FDFAF5", fontWeight: 700 }}>Cart</span>
              {totalItems > 0 && (
                <span style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%", background: "#C8A96E", color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Lato, sans-serif", fontWeight: 700 }}>{totalItems}</span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: "72px 32px 56px", textAlign: "center", background: "linear-gradient(180deg, #F5EFE4 0%, #FDFAF5 100%)", borderBottom: "1px solid #E8DFD0" }}>
        <span className="section-label">The Store</span>
        <h1 className="playfair" style={{ fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 700, lineHeight: 1.15, marginBottom: 16 }}>
          Send a Prayer Into<br />
          <em style={{ color: "#C8A96E" }}>the World</em>
        </h1>
        <div style={{ width: 48, height: 2, background: "#C8A96E", margin: "0 auto 20px" }} />
        <p className="lato" style={{ fontSize: 16, color: "#6B4C35", maxWidth: 480, margin: "0 auto", lineHeight: 1.8, fontWeight: 300 }}>
          Every band ships NFC-enabled and laser-engraved with a unique ID. One tap opens its digital journey.
        </p>
      </section>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 32px" }}>

        {/* ── INDIVIDUAL BANDS ── */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ marginBottom: 40 }}>
            <span className="section-label">Individual Bands</span>
            <h2 className="playfair" style={{ fontSize: 36, fontWeight: 600 }}>For Personal Giving</h2>
          </div>

          <div className="products-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            {INDIVIDUAL.map(product => (
              <div key={product.id} className="product-card">
                {/* Band visual */}
                <div style={{ height: 200, background: `linear-gradient(135deg, ${product.color}22, ${product.color}44)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  {product.tag && (
                    <div className="lato" style={{ position: "absolute", top: 16, right: 16, background: product.color, color: "#fff", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}>{product.tag}</div>
                  )}
                  {/* Band ring illustration */}
                  <div style={{ position: "relative", width: 120, height: 120 }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `18px solid ${product.color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 28 }}>{product.icon}</div>
                        <div className="lato" style={{ fontSize: 9, letterSpacing: "0.15em", color: product.color, marginTop: 2 }}>PB-XXXXX</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: "28px 28px 32px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <h3 className="playfair" style={{ fontSize: 24, fontWeight: 600 }}>{product.name}</h3>
                    <div className="playfair" style={{ fontSize: 28, fontWeight: 700, color: "#C8A96E" }}>${product.price}</div>
                  </div>
                  <p className="lato" style={{ fontSize: 14, lineHeight: 1.75, color: "#6B4C35", fontWeight: 300, marginBottom: 20 }}>{product.desc}</p>

                  <div style={{ marginBottom: 24 }}>
                    {product.features.map(f => (
                      <div key={f} className="lato" style={{ fontSize: 13, color: "#9B7B62", padding: "5px 0", borderBottom: "1px solid #F5EFE4", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: product.color, fontSize: 10 }}>✦</span> {f}
                      </div>
                    ))}
                  </div>

                  {/* Custom options */}
                  {product.type === "custom" && (
                    <div style={{ marginBottom: 20, display: "grid", gap: 12 }}>
                      <div>
                        <label className="lato" style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9B7B62", display: "block", marginBottom: 6 }}>Band Color</label>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {COLORS.map(c => (
                            <button
                              key={c.name}
                              title={c.name}
                              onClick={() => setCustomColor(c.name)}
                              style={{ width: 28, height: 28, borderRadius: "50%", background: c.hex, border: customColor === c.name ? "3px solid #2C1A0E" : "2px solid #E8DFD0", cursor: "pointer", transition: "transform 0.15s" }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="lato" style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9B7B62", display: "block", marginBottom: 6 }}>Scripture Verse (optional)</label>
                        <input placeholder="e.g. John 3:16" value={customVerse} onChange={e => setCustomVerse(e.target.value)} />
                      </div>
                      <div>
                        <label className="lato" style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9B7B62", display: "block", marginBottom: 6 }}>Personal Message (optional)</label>
                        <textarea placeholder="A short message for the recipient..." value={customMsg} onChange={e => setCustomMsg(e.target.value)} />
                      </div>
                    </div>
                  )}

                  <button
                    className="add-btn"
                    style={{ background: product.color, color: "#fff" }}
                    onClick={() => addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      type: product.type,
                      detail: product.type === "custom" ? `${customColor}${customVerse ? ` · ${customVerse}` : ""}` : undefined,
                    })}
                  >
                    Add to Cart — ${product.price}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SUBSCRIPTION ── */}
        <a href="/subscribe" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ marginBottom: 80, background: "linear-gradient(135deg, #7B8FAE 0%, #566f92 100%)", border: "none", borderRadius: 12, padding: "40px 48px", display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap", cursor: "pointer", transition: "box-shadow 0.2s", boxShadow: "0 8px 28px rgba(86,111,146,0.28)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 48px rgba(86,111,146,0.42)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(86,111,146,0.28)"; }}
          >
            <div style={{ fontSize: 52 }}>🔁</div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <span className="section-label" style={{ color: "#E3EAF2" }}>Subscribe & Save</span>
              <h3 className="playfair" style={{ fontSize: 30, fontWeight: 600, marginBottom: 10, color: "#fff" }}>A Band Delivered to Your Door, Every Month</h3>
              <p className="lato" style={{ fontSize: 15, color: "#DCE4EF", lineHeight: 1.8, fontWeight: 300 }}>Make intercession a rhythm. Subscribe and save up to 25% — bands ship automatically, ready to give away. Cancel anytime.</p>
            </div>
            <button style={{ background: "#FFFDF7", border: "none", color: "#4f6d8f", padding: "14px 36px", borderRadius: 4, fontFamily: "Lato, sans-serif", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
              View Plans →
            </button>
          </div>
        </a>

        {/* ── CHURCH PACKS ── */}
        <div id="packs" style={{ marginBottom: 80, scrollMarginTop: 80 }}>
          <div style={{ marginBottom: 40 }}>
            <span className="section-label">Church & Ministry Packs</span>
            <h2 className="playfair" style={{ fontSize: 36, fontWeight: 600 }}>For Communities</h2>
            <p className="lato" style={{ fontSize: 15, color: "#9B7B62", marginTop: 10, fontWeight: 300 }}>Bulk pricing with a custom ministry prefix (e.g. FBC-XXXXX) and dashboard access.</p>
          </div>

          <div className="packs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {PACKS.map(pack => (
              <div key={pack.id} className="pack-card" style={{ borderTop: `4px solid ${pack.color}` }}>
                {pack.popular && (
                  <div className="lato" style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: pack.color, color: "#fff", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", padding: "3px 14px", borderRadius: "0 0 8px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>Most Popular</div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <h3 className="playfair" style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>{pack.name}</h3>
                  <p className="lato" style={{ fontSize: 13, color: "#9B7B62", lineHeight: 1.7, fontWeight: 300 }}>{pack.desc}</p>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div className="playfair" style={{ fontSize: 38, fontWeight: 700, color: pack.color, lineHeight: 1 }}>${pack.price}</div>
                  <div className="lato" style={{ fontSize: 12, color: "#9B7B62", marginTop: 4 }}>
                    ${pack.perBand.toFixed(2)}/band · {pack.bands} bands
                  </div>
                  <div className="lato" style={{ fontSize: 11, color: pack.color, fontWeight: 700, marginTop: 4, letterSpacing: "0.08em" }}>{pack.savings} vs individual</div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  {["Custom ministry prefix", "Ministry dashboard", "NFC + laser-engraved", "Journey tracking", "Bulk reorder pricing"].map(f => (
                    <div key={f} className="lato" style={{ fontSize: 13, color: "#6B4C35", padding: "5px 0", borderBottom: "1px solid #F5EFE4", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: pack.color, fontSize: 10 }}>✦</span> {f}
                    </div>
                  ))}
                </div>

                <button
                  className="add-btn"
                  style={{ background: pack.color, color: "#fff" }}
                  onClick={() => addToCart({ id: pack.id, name: `${pack.name} (${pack.bands} bands)`, price: pack.price, type: "pack" })}
                >
                  Add to Cart — ${pack.price}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── CUSTOM / LARGE ORDERS ── */}
        <div style={{ background: "#2C1A0E", borderRadius: 12, padding: "48px 56px", display: "flex", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
          <div style={{ fontSize: 56 }}>🕊️</div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <span className="section-label" style={{ color: "#C8A96E" }}>Large Orders</span>
            <h3 className="playfair" style={{ fontSize: 28, color: "#FDFAF5", marginBottom: 12 }}>Need 500+ Bands?</h3>
            <p className="lato" style={{ fontSize: 15, color: "#C8B49A", lineHeight: 1.8, fontWeight: 300 }}>We work with denominations, mission organizations, and large congregations for custom quantities and pricing.</p>
          </div>
          <a href="/contact" style={{ textDecoration: "none" }}>
            <button style={{ background: "transparent", border: "1.5px solid #C8A96E", color: "#C8A96E", padding: "14px 36px", borderRadius: 4, fontFamily: "Lato, sans-serif", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap", transition: "all 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#C8A96E"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#C8A96E"; }}
            >
              Contact Us
            </button>
          </a>
        </div>
      </div>

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <div className="cart-overlay" onClick={e => { if (e.target === e.currentTarget) setCartOpen(false); }}>
          <div className="cart-drawer">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <h2 className="playfair" style={{ fontSize: 26, fontWeight: 600 }}>Your Cart</h2>
              <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#9B7B62" }}>×</button>
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
                <p className="lato" style={{ fontSize: 14, color: "#9B7B62", fontWeight: 300 }}>Your cart is empty.</p>
                <p className="lato" style={{ fontSize: 13, color: "#C8B49A", marginTop: 8, fontWeight: 300 }}>Add a band to start a prayer chain.</p>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 16, marginBottom: 32 }}>
                  {cart.map(item => (
                    <div key={item.id} style={{ background: "#fff", border: "1px solid #E8DFD0", borderRadius: 8, padding: "16px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div className="playfair" style={{ fontSize: 16, fontWeight: 600 }}>{item.name}</div>
                          {item.detail && <div className="lato" style={{ fontSize: 12, color: "#9B7B62", marginTop: 2 }}>{item.detail}</div>}
                        </div>
                        <div className="playfair" style={{ fontSize: 16, fontWeight: 600, color: "#C8A96E" }}>${(item.price * item.qty).toFixed(2)}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                        <span className="lato" style={{ fontSize: 15, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                        <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                        <span className="lato" style={{ fontSize: 12, color: "#C8B49A", marginLeft: 4 }}>${item.price} each</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order summary */}
                <div style={{ background: "#F5EFE4", borderRadius: 8, padding: "20px 20px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span className="lato" style={{ fontSize: 13, color: "#9B7B62" }}>Subtotal</span>
                    <span className="lato" style={{ fontSize: 13, color: "#2C1A0E", fontWeight: 700 }}>${total.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span className="lato" style={{ fontSize: 13, color: "#9B7B62" }}>Shipping</span>
                    <span className="lato" style={{ fontSize: 13, color: "#9B7B62" }}>Calculated at checkout</span>
                  </div>
                  <div style={{ borderTop: "1px solid #E8DFD0", paddingTop: 12, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <span className="playfair" style={{ fontSize: 18, fontWeight: 600 }}>Total</span>
                    <span className="playfair" style={{ fontSize: 22, fontWeight: 700, color: "#C8A96E" }}>${total.toFixed(2)}</span>
                  </div>
                </div>

                <button className="checkout-btn" disabled={checkoutLoading || cart.length === 0} onClick={async () => {
  setCheckoutLoading(true)
  const hasCustom = cart.some(c => c.type === 'custom')
  const totalQty = cart.reduce((sum, c) => sum + c.qty, 0)
  const customItem = cart.find(c => c.type === 'custom')
  const res = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: hasCustom ? 'custom' : 'standard',
      quantity: totalQty,
      customMessage: customMsg || '',
      verse: customVerse || '',
      color: customColor || 'Amber Gold',
    })
  })
  const data = await res.json()
  if (data.url) {
    window.location.href = data.url
  } else {
    showToast('Something went wrong — please try again')
    setCheckoutLoading(false)
  }
}}>
  {checkoutLoading ? 'Redirecting...' : `Proceed to Checkout — $${total.toFixed(2)}`}
</button>
<p className="lato" style={{ fontSize: 11, textAlign: "center", color: "#C8B49A", marginTop: 12, letterSpacing: "0.05em" }}>
  Secure checkout via Stripe · Ships in 3-5 days
</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}