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
        <div className="set-eyebrow">✝ Your Account</div>
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
