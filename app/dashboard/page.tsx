"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────────────
interface OrgData {
  id: string;
  name: string;
  prefix: string;
  subdomain: string;
  color: string;
  plan: string;
  created_at: string;
}

interface BandRow {
  id: string;
  band_id: string;
  created_at: string;
  registrations: { count: number }[];
  chain_prayers: { count: number }[];
}

interface ActivityRow {
  id: string;
  type: "prayer" | "registration";
  band_id: string;
  message?: string;
  location?: string;
  created_at: string;
}

interface Order {
  id: string;
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── Nav config ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "◎" },
  { id: "bands", label: "Bands", icon: "⟳" },
  { id: "prayers", label: "Prayers", icon: "🙏" },
  { id: "orders", label: "Orders", icon: "📦" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChurchDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [org, setOrg] = useState<OrgData | null>(null);
  const [bands, setBands] = useState<BandRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ bands: 0, prayers: 0, registrations: 0, countries: 0 });
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  // Accent color from org or default amber
  const accent = org?.color || "#C8A96E";

  useEffect(() => {
  async function load() {
    try {
      const supabase = initSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      console.log("user:", user?.id);
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();
      console.log("profile:", profile, profileError);
      if (!profile?.org_id) return;

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.org_id)
        .single();
      console.log("org:", orgData, orgError);
      if (orgData) setOrg(orgData);

    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }
  load();
}, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fdf8f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#8a7c6a" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✝</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 16 }}>Loading your ministry…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fdf8f3", fontFamily: "Georgia, serif" }}>
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e8ddd0",
        padding: "0 16px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      }}>
        {/* Logo + church name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 16, fontWeight: "bold", flexShrink: 0,
          }}>✝</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#2c2416", lineHeight: 1.2 }}>
              {org?.name || "My Church"}
            </div>
            <div style={{ fontSize: 11, color: accent, fontFamily: "monospace", letterSpacing: 1 }}>
              {org?.prefix || "PB"} prefix
            </div>
          </div>
        </div>

        {/* Desktop nav — hidden on mobile */}
        <nav style={{ display: "flex", gap: 4 }} className="desktop-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "none",
                background: activeTab === item.id ? accent : "transparent",
                color: activeTab === item.id ? "#fff" : "#6B4C35",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "Georgia, serif",
                fontWeight: activeTab === item.id ? "bold" : "normal",
                transition: "all 0.15s",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Plan badge */}
        <div style={{
          background: `${accent}22`,
          color: accent,
          fontSize: 11,
          fontWeight: "bold",
          padding: "3px 10px",
          borderRadius: 20,
          border: `1px solid ${accent}44`,
          whiteSpace: "nowrap",
        }}>
          {org?.plan || "Ministry"}
        </div>
      </header>

      {/* ── Page Content ───────────────────────────────────────────────────── */}
      <main style={{ padding: "16px 16px 80px", maxWidth: 900, margin: "0 auto" }}>

        {/* Page title */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, color: "#2c2416", fontWeight: "bold" }}>
            {NAV_ITEMS.find(n => n.id === activeTab)?.icon}{" "}
            {NAV_ITEMS.find(n => n.id === activeTab)?.label}
          </h1>
          {activeTab === "overview" && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8a7c6a" }}>
              Ministry impact for {org?.name || "your church"}
            </p>
          )}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div>
            {/* Stat cards — 2×2 on mobile, 4-across on desktop */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
              marginBottom: 20,
            }}>
              {[
                { label: "Bands Active", value: stats.bands, icon: "⟳", delta: "total distributed" },
                { label: "People Reached", value: stats.registrations, icon: "✦", delta: "registered bands" },
                { label: "Prayers Offered", value: stats.prayers, icon: "🙏", delta: "across all bands" },
                { label: "Countries", value: stats.countries || "—", icon: "🌍", delta: "reached" },
              ].map((stat) => (
                <div key={stat.label} style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "14px 16px",
                  border: "1px solid #e8ddd0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: "bold", color: "#2c2416", lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 12, color: "#8a7c6a", marginTop: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 11, color: "#b8a898", marginTop: 2 }}>{stat.delta}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: "bold", color: "#2c2416", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                Quick Actions
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: "Order Bands", icon: "📦", href: "/store" },
                  { label: "Prayer Wall", icon: "🙏", action: () => setActiveTab("prayers") },
                  { label: "Share Ministry", icon: "✦", href: `/${org?.subdomain}` },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => action.action ? action.action() : window.location.href = action.href || "#"}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "#fff",
                      border: `1px solid ${accent}66`,
                      borderRadius: 10,
                      padding: "10px 16px",
                      color: "#2c2416",
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <div style={{ fontSize: 13, fontWeight: "bold", color: "#2c2416", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                Recent Activity
              </div>
              {activity.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#8a7c6a" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✝</div>
                  <div style={{ fontSize: 14 }}>Activity will appear as bands are registered and prayers are left.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activity.slice(0, 10).map((item) => (
                    <div key={item.id} style={{
                      background: "#fff",
                      borderRadius: 10,
                      padding: "12px 14px",
                      border: "1px solid #e8ddd0",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: item.type === "prayer" ? "#7BAE8E18" : `${accent}18`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16,
                      }}>
                        {item.type === "prayer" ? "🙏" : "✦"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: "bold", color: "#2c2416" }}>
                          {item.type === "prayer" ? "Prayer left on" : "Band registered"} ·{" "}
                          <span style={{ color: accent }}>{item.band_id}</span>
                        </div>
                        {item.message && (
                          <div style={{ fontSize: 13, color: "#6B4C35", fontStyle: "italic", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            "{item.message}"
                          </div>
                        )}
                        {item.location && (
                          <div style={{ fontSize: 12, color: "#9B7B62", marginTop: 2 }}>📍 {item.location}</div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#b8a898", flexShrink: 0 }}>{timeAgo(item.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BANDS ────────────────────────────────────────────── */}
        {activeTab === "bands" && (
          <div>
            {bands.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#8a7c6a" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⟳</div>
                <div style={{ fontSize: 16, fontWeight: "bold", color: "#2c2416", marginBottom: 6 }}>No bands yet</div>
                <div style={{ fontSize: 14 }}>Order bands to get started.</div>
                <button
                  onClick={() => window.location.href = "/store"}
                  style={{
                    marginTop: 16, padding: "10px 24px",
                    background: accent, color: "#fff",
                    border: "none", borderRadius: 8,
                    fontSize: 14, cursor: "pointer", fontFamily: "Georgia, serif",
                  }}
                >
                  Order Bands →
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {bands.map((band) => {
                  const prayers = band.chain_prayers?.[0]?.count || 0;
                  const hands = band.registrations?.[0]?.count || 0;
                  const isRegistered = hands > 0;
                  return (
                    <a
                      key={band.id}
                      href={`/band/${band.band_id}`}
                      style={{
                        background: "#fff",
                        borderRadius: 10,
                        padding: "14px 16px",
                        border: "1px solid #e8ddd0",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      {/* Band badge */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                        background: isRegistered ? `${accent}22` : "#f0ebe4",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontFamily: "monospace", fontWeight: "bold",
                        color: isRegistered ? accent : "#b8a898",
                        textAlign: "center", lineHeight: 1.2,
                      }}>
                        {band.band_id.split("-")[0]}<br />{band.band_id.split("-")[1]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: "bold", fontSize: 14, color: "#2c2416" }}>{band.band_id}</div>
                        <div style={{ fontSize: 12, color: "#8a7c6a", marginTop: 2 }}>
                          {isRegistered ? `${hands} hand${hands !== 1 ? "s" : ""}` : "Unregistered"} · {prayers} prayer{prayers !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: isRegistered ? "#7BAE8E" : "#d0c8be",
                        flexShrink: 0,
                      }} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PRAYERS ──────────────────────────────────────────── */}
        {activeTab === "prayers" && (
          <div>
            {activity.filter(a => a.type === "prayer").length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#8a7c6a" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🙏</div>
                <div style={{ fontSize: 16, fontWeight: "bold", color: "#2c2416", marginBottom: 6 }}>No prayers yet</div>
                <div style={{ fontSize: 14 }}>Prayers will appear here as people receive your bands.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {activity.filter(a => a.type === "prayer").map((prayer) => (
                  <div key={prayer.id} style={{
                    background: "#fff",
                    borderRadius: 10,
                    padding: "14px 16px",
                    border: "1px solid #e8ddd0",
                    borderLeft: `3px solid #7BAE8E`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: accent, fontFamily: "monospace", fontWeight: "bold" }}>{prayer.band_id}</span>
                      <span style={{ fontSize: 11, color: "#b8a898" }}>{timeAgo(prayer.created_at)}</span>
                    </div>
                    {prayer.message && (
                      <div style={{ fontSize: 15, color: "#2c2416", fontStyle: "italic", lineHeight: 1.5 }}>
                        "{prayer.message}"
                      </div>
                    )}
                    {prayer.location && (
                      <div style={{ fontSize: 12, color: "#9B7B62", marginTop: 6 }}>📍 {prayer.location}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS ───────────────────────────────────────────── */}
        {activeTab === "orders" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <a
                href="/store"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: accent, color: "#fff",
                  padding: "10px 20px", borderRadius: 8,
                  textDecoration: "none", fontSize: 14, fontFamily: "Georgia, serif",
                  fontWeight: "bold",
                }}
              >
                📦 Order More Bands
              </a>
            </div>
            {orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#8a7c6a" }}>
                <div style={{ fontSize: 14 }}>No orders yet.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {orders.map((order) => (
                  <div key={order.id} style={{
                    background: "#fff",
                    borderRadius: 10,
                    padding: "14px 16px",
                    border: "1px solid #e8ddd0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: 14, color: "#2c2416" }}>
                        {order.quantity} bands
                      </div>
                      <div style={{ fontSize: 12, color: "#8a7c6a", marginTop: 2 }}>
                        {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: "bold", color: "#2c2416" }}>
                        ${(order.total_amount / 100).toFixed(2)}
                      </div>
                      <div style={{
                        display: "inline-block",
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: order.status === "paid" ? "#7BAE8E22" : "#C8A96E22",
                        color: order.status === "paid" ? "#4a8a6a" : "#8a6a2a",
                        fontWeight: "bold",
                        marginTop: 3,
                      }}>
                        {order.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ─────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Church Name", value: org?.name || "—" },
              { label: "Band Prefix", value: org?.prefix || "—", mono: true },
              { label: "Subdomain", value: org ? `${org.subdomain}.prayerbands.com` : "—", mono: true },
              { label: "Plan", value: org?.plan || "—" },
              { label: "Member Since", value: org ? new Date(org.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—" },
            ].map((field) => (
              <div key={field.label} style={{
                background: "#fff",
                borderRadius: 10,
                padding: "14px 16px",
                border: "1px solid #e8ddd0",
              }}>
                <div style={{ fontSize: 11, color: "#8a7c6a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  {field.label}
                </div>
                <div style={{
                  fontSize: 15, color: "#2c2416",
                  fontFamily: field.mono ? "monospace" : "Georgia, serif",
                }}>
                  {field.value}
                </div>
              </div>
            ))}
            <a
              href="/api/auth/signout"
              style={{
                display: "block", textAlign: "center",
                padding: "12px", borderRadius: 10,
                border: "1px solid #e8ddd0", background: "#fff",
                color: "#c0392b", fontSize: 14, textDecoration: "none",
                fontFamily: "Georgia, serif",
              }}
            >
              Sign Out
            </a>
          </div>
        )}

      </main>

      {/* ── Bottom Tab Bar (mobile) ─────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#fff",
        borderTop: "1px solid #e8ddd0",
        display: "flex",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
        zIndex: 200,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }} className="mobile-nav">
        {NAV_ITEMS.map(item => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 4px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                gap: 2,
                position: "relative",
              }}
            >
              {/* Active indicator dot */}
              {active && (
                <div style={{
                  position: "absolute",
                  top: 0,
                  width: 28,
                  height: 2,
                  background: accent,
                  borderRadius: "0 0 2px 2px",
                }} />
              )}
              <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
              <span style={{
                fontSize: 10,
                color: active ? accent : "#b8a898",
                fontFamily: "Georgia, serif",
                fontWeight: active ? "bold" : "normal",
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Responsive CSS ─────────────────────────────────────────────────── */}
      <style>{`
        /* Hide bottom nav on desktop, show desktop nav */
        @media (min-width: 700px) {
          .mobile-nav { display: none !important; }
          .desktop-nav { display: flex !important; }
          main { padding-bottom: 24px !important; }
        }
        /* Show bottom nav on mobile, hide desktop nav */
        @media (max-width: 699px) {
          .mobile-nav { display: flex !important; }
          .desktop-nav { display: none !important; }
        }
        /* Stat cards 4-across on desktop */
        @media (min-width: 700px) {
          .stats-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
        * { box-sizing: border-box; }
        a { -webkit-tap-highlight-color: transparent; }
        button { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}