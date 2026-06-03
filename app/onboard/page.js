'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function generatePrefix(name) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words
    .filter(w => !['the','a','an','of','and','&'].includes(w.toLowerCase()))
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 5);
}

function generateSubdomain(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
}

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', location: '', website: '', pastor: '', email: '', password: '' });
  const [preview, setPreview] = useState({ prefix: '', subdomain: '' });

  function handleNameChange(e) {
    const val = e.target.value;
    setForm(f => ({ ...f, name: val }));
    if (val.length > 2) {
      setPreview({ prefix: generatePrefix(val), subdomain: generateSubdomain(val) });
    } else {
      setPreview({ prefix: '', subdomain: '' });
    }
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...preview }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Server error — please try again'); }
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const green = '#1a6b4a';
  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 7,
    border: '1px solid #ddd6ca', fontSize: 15,
    fontFamily: 'Georgia, serif', background: '#fdfaf7',
    color: '#2c2416', boxSizing: 'border-box', outline: 'none',
  };
  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: '#7a6c5a',
    display: 'block', marginBottom: 6, letterSpacing: 0.4,
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f7f4ef',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, serif', padding: '40px 20px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✝</div>
        <h1 style={{ fontSize: 26, fontWeight: 'bold', color: '#1a1208', margin: 0 }}>
          PrayerBands for Churches
        </h1>
        <p style={{ color: '#8a7c6a', marginTop: 8, fontSize: 14 }}>
          Set up your ministry account and start spreading prayer.
        </p>
      </div>

      {step < 3 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, alignItems: 'center' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step >= s ? green : '#e0d8cc',
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, fontWeight: 'bold',
              }}>{s}</div>
              {s < 2 && <div style={{ width: 40, height: 2, background: step > s ? green : '#e0d8cc' }} />}
            </div>
          ))}
        </div>
      )}

      <div style={{
        background: '#fff', borderRadius: 14,
        border: '1px solid #e8e1d6',
        padding: '36px 40px', width: '100%', maxWidth: 480,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 24, color: '#1a1208' }}>
              Tell us about your church
            </h2>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>CHURCH NAME *</label>
              <input
                style={inputStyle} name="name"
                value={form.name} onChange={handleNameChange}
                placeholder="Grace Community Church"
              />
            </div>

            {preview.prefix && (
              <div style={{
                background: '#f0f7f3', border: '1px solid #c8e6d4',
                borderRadius: 8, padding: '12px 16px', marginBottom: 18, fontSize: 13,
              }}>
                <div style={{ color: green, fontWeight: 'bold', marginBottom: 8 }}>
                  Your church will receive:
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <span style={{ color: '#8a7c6a', fontSize: 11 }}>BAND PREFIX</span>
                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 15, color: '#1a1208' }}>
                      {preview.prefix}-XXXXX
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#8a7c6a', fontSize: 11 }}>SUBDOMAIN</span>
                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 15, color: '#1a1208' }}>
                      {preview.subdomain}.prayerbands.com
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>LOCATION</label>
              <input
                style={inputStyle} name="location"
                value={form.location} onChange={handleChange}
                placeholder="Fort Lauderdale, FL"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>WEBSITE (optional)</label>
              <input
                style={inputStyle} name="website"
                value={form.website} onChange={handleChange}
                placeholder="https://gracechurch.com"
              />
            </div>

            <button
              onClick={() => { if (form.name.length > 2) setStep(2); }}
              disabled={form.name.length < 3}
              style={{
                width: '100%', padding: '13px', borderRadius: 8,
                background: form.name.length > 2 ? green : '#ccc',
                color: '#fff', border: 'none', fontSize: 15,
                fontWeight: 'bold', cursor: form.name.length > 2 ? 'pointer' : 'default',
                fontFamily: 'Georgia, serif',
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 24, color: '#1a1208' }}>
              Create your admin account
            </h2>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>YOUR NAME *</label>
              <input
                style={inputStyle} name="pastor"
                value={form.pastor} onChange={handleChange}
                placeholder="Pastor David Whitfield"
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>EMAIL *</label>
              <input
                style={inputStyle} name="email" type="email"
                value={form.email} onChange={handleChange}
                placeholder="pastor@gracechurch.com"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>PASSWORD *</label>
              <input
                style={inputStyle} name="password" type="password"
                value={form.password} onChange={handleChange}
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <div style={{
                background: '#fef0f0', border: '1px solid #f5c6c6',
                borderRadius: 7, padding: '10px 14px',
                color: '#c0392b', fontSize: 13, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1, padding: '13px', borderRadius: 8,
                  background: '#fff', color: '#5a4f42',
                  border: '1px solid #ddd6ca', fontSize: 15,
                  cursor: 'pointer', fontFamily: 'Georgia, serif',
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !form.pastor || !form.email || !form.password}
                style={{
                  flex: 2, padding: '13px', borderRadius: 8,
                  background: (!loading && form.pastor && form.email && form.password) ? green : '#ccc',
                  color: '#fff', border: 'none', fontSize: 15,
                  fontWeight: 'bold', cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                }}
              >
                {loading ? 'Creating account...' : 'Create Ministry Account'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
            <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#1a1208' }}>
              Your ministry account is ready!
            </h2>
            <p style={{ color: '#5a4f42', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              Welcome to PrayerBands, <strong>{form.pastor}</strong>.<br />
              Your church prefix is{' '}
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: green }}>
                {preview.prefix}-XXXXX
              </span>{' '}
              and your dashboard is at{' '}
              <span style={{ fontFamily: 'monospace', color: green }}>
                {preview.subdomain}.prayerbands.com
              </span>.
            </p>
            <button
  onClick={async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    router.push('/org/dashboard');
  }}
              style={{
                width: '100%', padding: '13px', borderRadius: 8,
                background: green, color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
                fontFamily: 'Georgia, serif',
              }}
            >
              Go to My Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
