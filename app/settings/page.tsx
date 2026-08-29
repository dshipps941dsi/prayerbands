"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { AVATAR_ICONS, AVATAR_FONTS, initialsFor, fontStack } from "@/lib/avatars";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarInitials, setAvatarInitials] = useState<string>("single");
  const [avatarFont, setAvatarFont] = useState<string>("serif");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);
  // Connected sign-in methods (Google / Apple). Loaded on mount.
  const [identities, setIdentities] = useState<{ identity_id: string; provider: string }[]>([]);
  const [linkMsg, setLinkMsg] = useState("");

  const router = useRouter();
  const supabase = () =>
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // Return into the app (the band experience) rather than the marketing site.
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else window.location.href = "/my-band";
  }

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        window.location.href = `/signin?redirect=${encodeURIComponent("/settings")}`;
        return;
      }
      setEmail(user.email || "");
      const { data: profile } = await sb.from("profiles").select("full_name, email_notifications, avatar_icon, avatar_initials, avatar_font").eq("id", user.id).maybeSingle();
      setName(profile?.full_name || user.user_metadata?.full_name || "");
      setAvatar(profile?.avatar_icon ?? null);
      setAvatarInitials(profile?.avatar_initials ?? "single");
      setAvatarFont(profile?.avatar_font ?? "serif");
      setEmailNotif(profile?.email_notifications !== false);
      const { data: ids } = await sb.auth.getUserIdentities();
      if (ids?.identities) setIdentities(ids.identities.map((i) => ({ identity_id: i.identity_id, provider: i.provider })));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveName() {
    setSavingName(true); setNameMsg("");
    const sb = supabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = "/signin"; return; }
    const { error } = await sb.from("profiles").update({ full_name: name.trim() }).eq("id", user.id);
    if (!error) { await sb.auth.updateUser({ data: { full_name: name.trim() } }); setNameMsg("saved"); setTimeout(() => setNameMsg(""), 2500); }
    else setNameMsg(error.message || "Could not save.");
    setSavingName(false);
  }

  // Saves immediately on pick (optimistic). Tapping the current one clears it,
  // falling back to the initial.
  async function saveAvatar(icon: string | null) {
    const prev = avatar;
    setAvatar(icon);
    const sb = supabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = "/signin"; return; }
    const { error } = await sb.from("profiles").update({ avatar_icon: icon }).eq("id", user.id);
    if (error) setAvatar(prev);
  }

  async function saveInitials(style: string) {
    setAvatarInitials(style);
    const sb = supabase();
    const { data: { user } } = await sb.auth.getUser();
    if (user) await sb.from("profiles").update({ avatar_initials: style }).eq("id", user.id);
  }
  async function saveFont(fontKey: string) {
    setAvatarFont(fontKey);
    const sb = supabase();
    const { data: { user } } = await sb.auth.getUser();
    if (user) await sb.from("profiles").update({ avatar_font: fontKey }).eq("id", user.id);
  }

  async function toggleNotif() {
    const next = !emailNotif;
    setEmailNotif(next); // optimistic
    setSavingNotif(true);
    const sb = supabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = "/signin"; return; }
    const { error } = await sb.from("profiles").update({ email_notifications: next }).eq("id", user.id);
    if (error) setEmailNotif(!next); // revert on failure
    setSavingNotif(false);
  }

  async function changePassword() {
    setPwMsg("");
    if (pw.length < 8) { setPwMsg("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setPwMsg("Passwords don't match."); return; }
    setSavingPw(true);
    const { error } = await supabase().auth.updateUser({ password: pw });
    if (!error) { setPw(""); setPw2(""); setPwMsg("saved"); setTimeout(() => setPwMsg(""), 2500); }
    else setPwMsg(error.message || "Could not update password.");
    setSavingPw(false);
  }

  // Link another sign-in method to this same account. Redirects out to the
  // provider and back to /settings, where the new identity shows as connected.
  async function linkProvider(provider: "google" | "apple") {
    setLinkMsg("");
    const { data, error } = await supabase().auth.linkIdentity({
      provider,
      options: { redirectTo: `${window.location.origin}/settings` },
    });
    if (error) setLinkMsg(error.message || `Could not connect ${provider}.`);
    else if (data?.url) window.location.href = data.url;
  }

  // Remove a linked method. Supabase refuses to remove your only way in, so we
  // only offer this when more than one method is connected.
  async function unlinkProvider(identity: { identity_id: string; provider: string }) {
    setLinkMsg("");
    const sb = supabase();
    const { data: ids } = await sb.auth.getUserIdentities();
    const full = ids?.identities?.find((i) => i.identity_id === identity.identity_id);
    if (!full) return;
    const { error } = await sb.auth.unlinkIdentity(full);
    if (error) { setLinkMsg(error.message || "Could not disconnect."); return; }
    setIdentities((prev) => prev.filter((i) => i.identity_id !== identity.identity_id));
  }

  async function signOut() {
    await supabase().auth.signOut();
    window.location.href = "/signin";
  }

  return (
    <div style={{ background: "#F6F1E4", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#2A3344" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        .set-hero {
          text-align: center; padding: 64px 24px 48px;
          background:
            radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%),
            linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%);
          border-bottom: 1px solid rgba(200,169,110,0.34);
        }
        .set-eyebrow { font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; color: #C8A96E; margin-bottom: 14px; }
        .set-title { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: clamp(32px, 5vw, 48px); line-height: 1.1; color: #F5EDD8; }
        .set-wrap { max-width: 600px; margin: 0 auto; padding: 40px 24px 72px; }
        .set-card { background: #FFFDF8; border: 1px solid rgba(200,169,110,0.30); border-radius: 12px; padding: 26px 24px; margin-bottom: 20px; box-shadow: 0 2px 12px rgba(10,22,40,0.05); }
        .set-card-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 21px; font-weight: 700; color: #15223B; margin-bottom: 16px; }
        .set-label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #9A7A35; font-family: 'Cinzel', serif; margin-bottom: 7px; }
        .set-hint { font-size: 13px; line-height: 1.6; color: #5C6573; margin: -2px 0 14px; }
        .set-input { width: 100%; box-sizing: border-box; padding: 12px 14px; font-size: 15px; border: 1px solid rgba(10,22,40,0.15); border-radius: 8px; background: #F6F1E4; color: #15223B; outline: none; font-family: 'Inter', sans-serif; margin-bottom: 16px; }
        .set-input:focus { border-color: #C8A96E; }
        .set-readonly { color: #5C6573; background: #EFE9DA; }
        .set-btn { background: #0E1E38; color: #F5EDD8; border: 1px solid rgba(200,169,110,0.45); border-radius: 8px; padding: 11px 22px; font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; cursor: pointer; }
        .set-btn:disabled { opacity: 0.6; cursor: default; }
        .set-msg-ok { color: #2E7D52; font-size: 13px; font-weight: 600; margin-left: 12px; }
        .set-msg-err { color: #C0392B; font-size: 13px; margin-top: 8px; }
        .set-signout { width: 100%; background: white; border: 1px solid rgba(192,57,43,0.4); color: #C0392B; border-radius: 10px; padding: 14px; font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; cursor: pointer; }
        .set-link { color: #9A7A35; font-weight: 600; text-decoration: none; }
        .set-link:hover { text-decoration: underline; }
        .set-toggle-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .set-toggle-copy { font-size: 14px; color: #5C6573; line-height: 1.6; max-width: 380px; }
        .set-switch { position: relative; width: 50px; height: 28px; flex-shrink: 0; border: none; border-radius: 999px; cursor: pointer; transition: background 0.2s; padding: 0; }
        .set-switch[data-on="true"] { background: #2E7D52; }
        .set-switch[data-on="false"] { background: #C9CFD6; }
        .set-switch:disabled { opacity: 0.6; cursor: default; }
        .set-knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; background: #fff; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.25); transition: transform 0.2s; }
        .set-switch[data-on="true"] .set-knob { transform: translateX(22px); }
      `}</style>

      <section className="set-hero" style={{ position: "relative" }}>
        <button onClick={goBack} aria-label="Back" style={{ position: "absolute", left: 16, top: "calc(16px + env(safe-area-inset-top, 0px))", display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(200,169,110,0.35)", borderRadius: 20, padding: "7px 14px", color: "#F5EDD8", fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", cursor: "pointer" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </button>
        <div className="set-eyebrow">✝︎ Your Account</div>
        <h1 className="set-title">Settings</h1>
      </section>

      <div className="set-wrap">
        {loading ? (
          <div style={{ textAlign: "center", color: "#5C6573", padding: "40px 0" }}>Loading…</div>
        ) : (
          <>
            <div className="set-card">
              <div className="set-card-title">Profile</div>
              <label className="set-label">Your Avatar</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#C8A96E,#E2C98A)", color: "#0A1628", display: "flex", alignItems: "center", justifyContent: "center", fontSize: avatar ? 27 : (initialsFor(name, avatarInitials).length >= 2 ? 19 : 22), fontWeight: 700, flexShrink: 0, fontFamily: avatar ? "'Cormorant Garamond', Georgia, serif" : fontStack(avatarFont) }}>
                  {avatar || initialsFor(name, avatarInitials)}
                </div>
                <span style={{ fontSize: 13, color: "#5C6573" }}>{avatar ? "Tap it again to go back to your initials." : "Pick an icon, or style your initials below."}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 14 }}>
                {AVATAR_ICONS.map(ic => (
                  <button key={ic} onClick={() => saveAvatar(avatar === ic ? null : ic)} aria-label={`Avatar ${ic}`}
                    style={{ aspectRatio: "1", borderRadius: 10, border: `1.5px solid ${avatar === ic ? "#C8A96E" : "rgba(92,101,115,0.20)"}`, background: avatar === ic ? "#FFF8E7" : "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1 }}>
                    {ic}
                  </button>
                ))}
              </div>

              {/* Initials styling — only relevant when no icon is chosen. */}
              {!avatar && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    {([["single", "First initial"], ["double", "First + Last"]] as const).map(([val, lbl]) => (
                      <button key={val} onClick={() => saveInitials(val)}
                        style={{ flex: 1, padding: "9px 6px", borderRadius: 8, border: `1.5px solid ${avatarInitials === val ? "#C8A96E" : "rgba(92,101,115,0.20)"}`, background: avatarInitials === val ? "#FFF8E7" : "#fff", color: avatarInitials === val ? "#9A7A35" : "#5C6573", fontSize: 12.5, fontFamily: "'Inter', sans-serif", fontWeight: avatarInitials === val ? 700 : 400, cursor: "pointer" }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {AVATAR_FONTS.map(f => (
                      <button key={f.key} onClick={() => saveFont(f.key)}
                        style={{ padding: "8px 4px 6px", borderRadius: 8, border: `1.5px solid ${avatarFont === f.key ? "#C8A96E" : "rgba(92,101,115,0.20)"}`, background: avatarFont === f.key ? "#FFF8E7" : "#fff", cursor: "pointer", textAlign: "center" }}>
                        <div style={{ fontFamily: f.stack, fontSize: 18, fontWeight: 700, color: "#15223B", lineHeight: 1.1 }}>{initialsFor(name, avatarInitials)}</div>
                        <div style={{ fontSize: 10, color: "#9A7A35", fontFamily: "'Inter', sans-serif", marginTop: 3 }}>{f.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="set-label">Display Name</label>
              <input className="set-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              <label className="set-label">Email</label>
              <input className="set-input set-readonly" value={email} readOnly />
              <div style={{ display: "flex", alignItems: "center" }}>
                <button className="set-btn" onClick={saveName} disabled={savingName}>{savingName ? "Saving…" : "Save"}</button>
                {nameMsg === "saved" && <span className="set-msg-ok">Saved ✓</span>}
              </div>
              {nameMsg && nameMsg !== "saved" && <div className="set-msg-err">{nameMsg}</div>}
            </div>

            <div className="set-card">
              <div className="set-card-title">Password</div>
              {/* Accounts created from a band page have no password at all — the emailed
                  code was the entire sign-up. "New Password" read as though you were
                  changing one you already had. */}
              <div className="set-hint">Signed up with an emailed code? You do not have a password yet. Set one here to sign in without waiting for a code — or carry on using codes, either works.</div>
              <label className="set-label">Password</label>
              <input className="set-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
              <label className="set-label">Confirm New Password</label>
              <input className="set-input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Re-enter password" />
              <div style={{ display: "flex", alignItems: "center" }}>
                <button className="set-btn" onClick={changePassword} disabled={savingPw}>{savingPw ? "Saving…" : "Save Password"}</button>
                {pwMsg === "saved" && <span className="set-msg-ok">Updated ✓</span>}
              </div>
              {pwMsg && pwMsg !== "saved" && <div className="set-msg-err">{pwMsg}</div>}
            </div>

            <div className="set-card">
              <div className="set-card-title">Connected accounts</div>
              <div className="set-hint">Sign in faster by connecting Google or Apple. You can use any connected method to reach this same account.</div>
              {([
                { key: "google" as const, label: "Google", logo: (
                  <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                ) },
                { key: "apple" as const, label: "Apple", logo: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#15223B"><path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.74-1.517.03-2.01-.9-3.71-.9-1.717 0-2.26.87-3.71.93-1.44.05-2.53-1.51-3.6-2.84-1.877-2.35-3.32-6.64-1.39-9.53.96-1.42 2.68-2.32 4.55-2.35 1.45-.03 2.83.98 3.71.98.87 0 2.53-1.21 4.26-1.03.72.03 2.75.29 4.06 2.18-.11.07-2.42 1.42-2.39 4.24.03 3.37 2.95 4.49 2.98 4.5z"/></svg>
                ) },
              ]).map((p) => {
                const linked = identities.find((i) => i.provider === p.key);
                const canUnlink = identities.length > 1;
                return (
                  <div key={p.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: "1px solid rgba(92,101,115,0.14)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {p.logo}
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#15223B" }}>{p.label}</div>
                        <div style={{ fontSize: 12.5, color: linked ? "#2E7D52" : "#7A8494" }}>{linked ? "Connected" : "Not connected"}</div>
                      </div>
                    </div>
                    {linked ? (
                      canUnlink ? (
                        <button onClick={() => unlinkProvider(linked)} style={{ background: "white", border: "1px solid rgba(92,101,115,0.28)", color: "#5C6573", borderRadius: 8, padding: "8px 16px", fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600, cursor: "pointer" }}>Disconnect</button>
                      ) : (
                        <span style={{ fontSize: 12, color: "#9A7A35" }}>✓ Sign-in</span>
                      )
                    ) : (
                      <button className="set-btn" onClick={() => linkProvider(p.key)}>Connect</button>
                    )}
                  </div>
                );
              })}
              {linkMsg && <div className="set-msg-err">{linkMsg}</div>}
            </div>

            <div className="set-card">
              <div className="set-card-title">Notifications</div>
              <div className="set-toggle-row">
                <div className="set-toggle-copy">
                  Email me when one of my bands is registered or passed on to someone new. Turn this off to take a break from notifications — you can turn it back on anytime.
                </div>
                <button
                  className="set-switch"
                  data-on={emailNotif}
                  onClick={toggleNotif}
                  disabled={savingNotif}
                  aria-label="Toggle band notification emails"
                  role="switch"
                  aria-checked={emailNotif}
                >
                  <span className="set-knob" />
                </button>
              </div>
            </div>

            <div className="set-card">
              <div className="set-card-title">Account</div>
              <p style={{ fontSize: 14, color: "#5C6573", lineHeight: 1.6, marginBottom: 16 }}>
                Manage your bands, subscription, and prayer network from your <Link href="/dashboard" className="set-link">dashboard</Link>.
              </p>
              <button className="set-signout" onClick={signOut}>🚪 Sign Out</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
