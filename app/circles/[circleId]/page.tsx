'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'
import ShareSheet from '@/components/ShareSheet'

interface CircleData {
  id: string
  name: string
  description: string | null
  join_code: string
  is_closed: boolean
  created_by: string
  created_at: string
}

interface Member {
  id: string
  user_id: string
  role: 'leader' | 'member'
  joined_at: string
}

interface PrayerRequest {
  id: string
  user_id: string
  request_text: string
  is_answered: boolean
  answered_at: string | null
  created_at: string
  intercession_count: number
  i_prayed: boolean
}

type Tab = 'prayers' | 'members' | 'about'

function CirclePageInner() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const circleId = params?.circleId as string
  const isNew = searchParams?.get('new') === 'true'

  const [tab, setTab] = useState<Tab>('prayers')
  const [circle, setCircle] = useState<CircleData | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [requests, setRequests] = useState<PrayerRequest[]>([])
  const [myRole, setMyRole] = useState<'leader' | 'member' | null>(null)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // New request
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestText, setRequestText] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)

  // Code copied
  const [codeCopied, setCodeCopied] = useState(false)

  // Settings state
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const loadCircle = useCallback(async () => {
    // Carry the join code through so guests (no account) can view read-only.
    const code = searchParams?.get('code')
    const res = await fetch(`/api/circles/${circleId}${code ? `?code=${encodeURIComponent(code)}` : ''}`)
    if (res.status === 401) {
      // Not signed in and no valid code — send to the join/sign-in flow.
      router.push('/circles')
      return
    }
    if (res.status === 403) {
      setError('You are not a member of this circle.')
      setLoading(false)
      return
    }
    if (!res.ok) {
      setError('Circle not found.')
      setLoading(false)
      return
    }
    const data = await res.json()
    setCircle(data.circle)
    setMembers(data.members)
    setRequests(data.requests)
    setMyRole(data.my_role)
    setMyUserId(data.my_user_id)
    setIsMember(!!data.is_member)
    setEditName(data.circle.name)
    setEditDescription(data.circle.description || '')

    setLoading(false)
  }, [circleId, router, searchParams])

  // Ensure the user can act. Members pass through. A signed-in non-member is
  // auto-joined in one tap (no separate Join screen). A guest is sent to sign
  // in and returned here, where the next tap joins them.
  const ensureMember = useCallback(async (): Promise<boolean> => {
    if (isMember) return true
    if (!myUserId) {
      const back = `/circles/${circleId}?code=${circle?.join_code ?? ''}`
      router.push(`/signin/personal?redirect=${encodeURIComponent(back)}`)
      return false
    }
    const res = await fetch('/api/circles/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circle_id: circleId }),
    })
    if (res.ok || res.status === 409) {
      setIsMember(true)
      if (res.ok) { setToast('✓ Joined the circle'); setTimeout(() => setToast(''), 2500) }
      loadCircle()
      return true
    }
    return false
  }, [isMember, myUserId, circleId, circle, router, loadCircle])

  useEffect(() => {
    loadCircle()
  }, [loadCircle])

  // Show code share on first load for new circles
  useEffect(() => {
    if (isNew && circle) {
      setTab('about')
    }
  }, [isNew, circle])

  async function handleIntercede(requestId: string) {
    if (!(await ensureMember())) return
    const res = await fetch(`/api/circles/${circleId}/intercede`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId })
    })
    if (!res.ok) return
    const data = await res.json()
    setRequests(prev => prev.map(r =>
      r.id === requestId
        ? {
          ...r,
          i_prayed: data.praying,
          // Trust the server's authoritative count (avoids drift from races).
          intercession_count: typeof data.count === 'number'
            ? data.count
            : (data.praying ? r.intercession_count + 1 : r.intercession_count - 1)
        }
        : r
    ))
  }

  async function handleSubmitRequest() {
    if (!(await ensureMember())) return
    if (!requestText.trim()) return
    setSubmittingRequest(true)
    const res = await fetch(`/api/circles/${circleId}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_text: requestText.trim() })
    })
    if (res.ok) {
      const data = await res.json()
      setRequests(prev => [{
        ...data.request,
        intercession_count: 0,
        i_prayed: false
      }, ...prev])
      setRequestText('')
      setShowRequestForm(false)
    }
    setSubmittingRequest(false)
  }

  async function handleMarkAnswered(requestId: string, isAnswered: boolean) {
    const res = await fetch(`/api/circles/${circleId}/request`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, is_answered: isAnswered })
    })
    if (res.ok) {
      setRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, is_answered: isAnswered } : r
      ))
    }
  }

  async function handleRemoveMember(userId: string) {
    const res = await fetch(`/api/circles/${circleId}/remove-member?user_id=${userId}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      // Leaving the circle yourself — you're no longer a member, so navigate away.
      if (userId === myUserId) {
        router.push('/dashboard?tab=prayers')
        return
      }
      setMembers(prev => prev.filter(m => m.user_id !== userId))
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    const res = await fetch(`/api/circles/${circleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, description: editDescription })
    })
    if (res.ok) {
      const data = await res.json()
      setCircle(data.circle)
    }
    setSavingSettings(false)
  }

  async function handleRegenerateCode() {
    const res = await fetch(`/api/circles/${circleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regenerate_code: true })
    })
    if (res.ok) {
      const data = await res.json()
      setCircle(data.circle)
    }
  }

  async function handleCloseCircle() {
    const res = await fetch(`/api/circles/${circleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_closed: true })
    })
    if (res.ok) {
      router.push('/dashboard?tab=prayers')
    }
  }

  function copyCode() {
    if (!circle) return
    navigator.clipboard.writeText(circle.join_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }


  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F6F1E4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        color: '#5C6573'
      }}>
        Loading circle...
      </div>
    )
  }

  if (error || !circle) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F6F1E4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        padding: '24px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '16px', color: '#2A3344', marginBottom: '20px' }}>
          {error || 'This circle could not be found.'}
        </p>
        <button
          onClick={() => router.push('/circles')}
          style={{
            backgroundColor: '#C8A96E',
            color: '#0A1628',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '12px',
            fontFamily: "'Cinzel', serif",
            fontWeight: '600',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          Back to Circles
        </button>
      </div>
    )
  }

  const activeRequests = requests.filter(r => !r.is_answered)
  const answeredRequests = requests.filter(r => r.is_answered)

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F6F1E4',
      fontFamily: "'Inter', sans-serif",
      paddingBottom: '80px'
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: '#0E1E38', color: '#F6F1E4', padding: '11px 24px', borderRadius: 40, fontFamily: "'Inter', sans-serif", fontSize: 13, letterSpacing: '0.04em', boxShadow: '0 6px 24px rgba(10,22,40,0.3)', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{
        backgroundColor: '#FFFDF8',
        borderBottom: '1px solid rgba(10,22,40,0.12)',
        padding: '20px 24px 0 24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => router.push(isMember ? '/dashboard?tab=prayers' : '/circles')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#5C6573',
                padding: 0,
                lineHeight: 1
              }}
            >
              ←
            </button>
            <PrayerBandsLogo size={28} color="#C8A96E" />
            <div>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '20px',
                fontWeight: '700',
                color: '#15223B',
                margin: 0,
                lineHeight: 1.2
              }}>{circle.name}</h1>
              <p style={{ fontSize: '12px', color: '#5C6573', margin: '3px 0 0 0', fontFamily: "'Inter', sans-serif" }}>
                {members.length} {members.length === 1 ? 'person' : 'people'} praying
              </p>
            </div>
          </div>
          {/* Join code badge */}
          <div
            onClick={copyCode}
            style={{
              backgroundColor: '#F6F1E4',
              border: '1px solid rgba(200,169,110,0.34)',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <p style={{
              fontSize: '15px',
              fontWeight: '700',
              letterSpacing: '0.15em',
              color: '#9A7A35',
              margin: 0,
              fontFamily: "'Cinzel', serif"
            }}>{circle.join_code}</p>
            <p style={{ fontSize: '10px', color: '#5C6573', margin: '2px 0 0 0', fontFamily: "'Inter', sans-serif" }}>
              {codeCopied ? 'Copied!' : 'tap to copy'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0' }}>
          {(['prayers', 'members', 'about'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid #C8A96E' : '2px solid transparent',
                padding: '10px 0',
                fontSize: '11px',
                fontFamily: "'Cinzel', serif",
                fontWeight: tab === t ? '700' : '400',
                color: tab === t ? '#9A7A35' : '#5C6573',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 24px 0 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* ── PRAYERS TAB ── */}
        {tab === 'prayers' && (
          <div>
            {!isMember && (
              <div onClick={() => ensureMember()} style={{ backgroundColor: '#FFF8E7', border: '1px solid rgba(200,169,110,0.45)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, cursor: 'pointer', fontSize: 13, color: '#5A3E12', fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                {myUserId
                  ? <>👋 <strong style={{ color: '#9A7A35' }}>Tap to join this circle and start praying →</strong></>
                  : <>👋 You&rsquo;re viewing as a guest. <strong style={{ color: '#9A7A35' }}>Sign in to join and pray →</strong></>}
              </div>
            )}
            {/* Add request button */}
            {!showRequestForm && (
              <button
                onClick={async () => { if (!(await ensureMember())) return; setShowRequestForm(true) }}
                style={{
                  width: '100%',
                  backgroundColor: '#FFFDF8',
                  border: '2px dashed rgba(200,169,110,0.34)',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '12px',
                  fontFamily: "'Cinzel', serif",
                  fontWeight: '600',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#9A7A35',
                  cursor: 'pointer',
                  marginBottom: '20px'
                }}
              >
                {myUserId ? '+ Share a Prayer Request' : '🔒 Sign in to share a request'}
              </button>
            )}

            {/* Request form */}
            {showRequestForm && (
              <div style={{
                backgroundColor: '#FFFDF8',
                border: '1px solid rgba(10,22,40,0.12)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(10,22,40,0.06)'
              }}>
                <textarea
                  value={requestText}
                  onChange={e => setRequestText(e.target.value)}
                  placeholder="What would you like the circle to pray for?"
                  rows={3}
                  autoFocus
                  maxLength={400}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '15px',
                    fontFamily: "'Inter', sans-serif",
                    color: '#15223B',
                    border: '1px solid rgba(200,169,110,0.34)',
                    borderRadius: '8px',
                    backgroundColor: '#F6F1E4',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                    lineHeight: '1.6'
                  }}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button
                    onClick={() => { setShowRequestForm(false); setRequestText('') }}
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(92,101,115,0.20)',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '12px',
                      fontFamily: "'Cinzel', serif",
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#5C6573',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitRequest}
                    disabled={!requestText.trim() || submittingRequest}
                    style={{
                      flex: 2,
                      backgroundColor: requestText.trim() ? '#C8A96E' : '#C9CFD6',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '12px',
                      fontFamily: "'Cinzel', serif",
                      fontWeight: '600',
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      color: requestText.trim() ? '#0A1628' : '#5C6573',
                      cursor: requestText.trim() ? 'pointer' : 'default'
                    }}
                  >
                    {submittingRequest ? 'Sharing...' : 'Share Request'}
                  </button>
                </div>
              </div>
            )}

            {/* Active requests */}
            {activeRequests.length === 0 && !showRequestForm && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#5C6573',
                fontFamily: "'Inter', sans-serif"
              }}>
                <p style={{ fontSize: '32px', margin: '0 0 12px 0' }}>🕊️</p>
                <p style={{ fontSize: '15px', margin: 0 }}>
                  No prayer requests yet. Be the first to share one.
                </p>
              </div>
            )}

            {activeRequests.map(req => (
              <PrayerRequestCard
                key={req.id}
                request={req}
                myRole={myRole}
                onIntercede={() => handleIntercede(req.id)}
                onMarkAnswered={() => handleMarkAnswered(req.id, true)}
              />
            ))}

            {/* Answered prayers */}
            {answeredRequests.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <p style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#9A7A35',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  margin: '0 0 12px 0',
                  fontFamily: "'Cinzel', serif"
                }}>
                  ✓ Answered Prayers ({answeredRequests.length})
                </p>
                {answeredRequests.map(req => (
                  <PrayerRequestCard
                    key={req.id}
                    request={req}
                    myRole={myRole}
                    onIntercede={() => handleIntercede(req.id)}
                    onMarkAnswered={() => handleMarkAnswered(req.id, false)}
                    answered
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MEMBERS TAB ── */}
        {tab === 'members' && (
          <div>
            {members.map(member => (
              <div
                key={member.id}
                style={{
                  backgroundColor: '#FFFDF8',
                  border: '1px solid rgba(10,22,40,0.12)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 4px rgba(10,22,40,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: member.role === 'leader' ? '#C8A96E' : '#ECEEF1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}>
                    {member.role === 'leader' ? '👑' : '🙏'}
                  </div>
                  <div>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#15223B',
                      margin: 0,
                      fontFamily: "'Inter', sans-serif"
                    }}>
                      {member.role === 'leader' ? 'Circle Leader' : 'Member'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#5C6573', margin: '2px 0 0 0', fontFamily: "'Inter', sans-serif" }}>
                      Joined {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                {myRole === 'leader' && member.role !== 'leader' && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(192,57,43,0.35)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontFamily: "'Cinzel', serif",
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: '#C0392B',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── ABOUT TAB ── */}
        {tab === 'about' && (
          <div>
            {/* Join code share card */}
            <div style={{
              backgroundColor: '#FFFDF8',
              border: '2px solid rgba(200,169,110,0.34)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '20px',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(10,22,40,0.08)'
            }}>
              {isNew && (
                <p style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#9A7A35',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  margin: '0 0 12px 0',
                  fontFamily: "'Cinzel', serif"
                }}>
                  ✓ Circle Created!
                </p>
              )}
              <p style={{ fontSize: '13px', color: '#5C6573', margin: '0 0 8px 0', fontFamily: "'Inter', sans-serif" }}>
                Invite people to your circle
              </p>
              <div style={{
                fontSize: '34px',
                fontWeight: '700',
                letterSpacing: '0.3em',
                color: '#15223B',
                fontFamily: "'Cinzel', serif",
                margin: '0 0 16px 0'
              }}>
                {circle.join_code}
              </div>
              {/* Primary: share the invite page — a tap-to-join link with a
                  preview, so people join without typing the code. */}
              <ShareSheet
                block
                url={`https://prayerbands.com/circle/${circle.id}`}
                title={circle.name}
                text={`Join our Prayer Circle "${circle.name}" on Prayer Bands 🙏`}
                label="Invite people"
                variant="gold"
              />
              {/* Secondary: the raw code, for reading aloud, a flyer, or manual entry. */}
              <button onClick={copyCode} style={{ background: 'none', border: 'none', color: '#5C6573', fontSize: '12px', fontFamily: 'Georgia, serif', cursor: 'pointer', marginTop: '12px', textDecoration: 'underline', padding: 0 }}>
                {codeCopied ? 'Code copied!' : 'Or copy the join code'}
              </button>
              <p style={{ fontSize: '12px', color: '#5C6573', margin: '12px 0 0', fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                They land on a private invite page (no prayer details) and join in one tap. The code is handy for reading aloud or a flyer.
              </p>
            </div>

            {/* Circle description */}
            {circle.description && (
              <div style={{
                backgroundColor: '#FFFDF8',
                border: '1px solid rgba(10,22,40,0.12)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <p style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#9A7A35',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  margin: '0 0 8px 0',
                  fontFamily: "'Cinzel', serif"
                }}>About This Circle</p>
                <p style={{
                  fontSize: '15px',
                  color: '#2A3344',
                  lineHeight: '1.7',
                  margin: 0,
                  fontStyle: 'italic',
                  fontFamily: "'Cormorant Garamond', Georgia, serif"
                }}>
                  "{circle.description}"
                </p>
              </div>
            )}

            {/* Leader settings */}
            {myRole === 'leader' && (
              <div style={{
                backgroundColor: '#FFFDF8',
                border: '1px solid rgba(10,22,40,0.12)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(10,22,40,0.06)'
              }}>
                <p style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#9A7A35',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  margin: '0 0 16px 0',
                  fontFamily: "'Cinzel', serif"
                }}>Circle Settings</p>

                <label style={{ fontSize: '11px', color: '#5C6573', display: 'block', marginBottom: '4px', fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em' }}>
                  Circle Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  maxLength={80}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    color: '#15223B',
                    border: '1px solid rgba(200,169,110,0.34)',
                    borderRadius: '8px',
                    backgroundColor: '#F6F1E4',
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginBottom: '12px'
                  }}
                />

                <label style={{ fontSize: '11px', color: '#5C6573', display: 'block', marginBottom: '4px', fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em' }}>
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  maxLength={300}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    fontFamily: "'Inter', sans-serif",
                    color: '#15223B',
                    border: '1px solid rgba(200,169,110,0.34)',
                    borderRadius: '8px',
                    backgroundColor: '#F6F1E4',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    marginBottom: '16px'
                  }}
                />

                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  style={{
                    width: '100%',
                    backgroundColor: '#C8A96E',
                    color: '#0A1628',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '12px',
                    fontFamily: "'Cinzel', serif",
                    fontWeight: '600',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    marginBottom: '10px'
                  }}
                >
                  {savingSettings ? 'Saving...' : 'Save Changes'}
                </button>

                <button
                  onClick={handleRegenerateCode}
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(92,101,115,0.20)',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '12px',
                    fontFamily: "'Cinzel', serif",
                    fontWeight: '600',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#5C6573',
                    cursor: 'pointer',
                    marginBottom: '10px'
                  }}
                >
                  🔄 Generate New Join Code
                </button>

                {!showCloseConfirm ? (
                  <button
                    onClick={() => setShowCloseConfirm(true)}
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(192,57,43,0.35)',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '12px',
                      fontFamily: "'Cinzel', serif",
                      fontWeight: '600',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#C0392B',
                      cursor: 'pointer'
                    }}
                  >
                    Close Circle
                  </button>
                ) : (
                  <div style={{
                    backgroundColor: '#FDF0EE',
                    border: '1px solid rgba(192,57,43,0.25)',
                    borderRadius: '8px',
                    padding: '14px'
                  }}>
                    <p style={{ fontSize: '13px', color: '#2A3344', margin: '0 0 12px 0', fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
                      Closing this circle will remove it from everyone's dashboard.
                      Prayer requests will be preserved. Are you sure?
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setShowCloseConfirm(false)}
                        style={{
                          flex: 1,
                          backgroundColor: 'transparent',
                          border: '1px solid rgba(92,101,115,0.20)',
                          borderRadius: '6px',
                          padding: '8px',
                          fontSize: '11px',
                          fontFamily: "'Cinzel', serif",
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: '#5C6573',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCloseCircle}
                        style={{
                          flex: 1,
                          backgroundColor: '#C0392B',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px',
                          fontSize: '11px',
                          fontFamily: "'Cinzel', serif",
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: '#fff',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Yes, Close It
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Leave circle (members only) */}
            {myRole === 'member' && myUserId && (
              <button
                onClick={() => handleRemoveMember(myUserId)}
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(192,57,43,0.35)',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '12px',
                  fontFamily: "'Cinzel', serif",
                  fontWeight: '600',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#C0392B',
                  cursor: 'pointer'
                }}
              >
                Leave Circle
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Prayer Request Card Component ──
function PrayerRequestCard({
  request,
  myRole,
  onIntercede,
  onMarkAnswered,
  answered = false
}: {
  request: PrayerRequest
  myRole: 'leader' | 'member' | null
  onIntercede: () => void
  onMarkAnswered: () => void
  answered?: boolean
}) {
  return (
    <div style={{
      backgroundColor: answered ? '#ECEEF1' : '#FFFDF8',
      border: `1px solid ${answered ? 'rgba(92,101,115,0.20)' : 'rgba(10,22,40,0.12)'}`,
      borderRadius: '10px',
      padding: '16px',
      marginBottom: '12px',
      opacity: answered ? 0.85 : 1,
      boxShadow: answered ? 'none' : '0 1px 4px rgba(10,22,40,0.05)'
    }}>
      {answered && (
        <p style={{
          fontSize: '10px',
          fontWeight: '600',
          color: '#9A7A35',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          margin: '0 0 8px 0',
          fontFamily: "'Cinzel', serif"
        }}>
          ✓ Answered
        </p>
      )}

      <p style={{
        fontSize: '15px',
        color: '#2A3344',
        lineHeight: '1.6',
        margin: '0 0 12px 0',
        fontStyle: 'italic',
        fontFamily: "'Cormorant Garamond', Georgia, serif"
      }}>
        "{request.request_text}"
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button
          onClick={onIntercede}
          style={{
            backgroundColor: request.i_prayed ? '#F5EDD8' : '#F6F1E4',
            border: `1px solid ${request.i_prayed ? 'rgba(200,169,110,0.34)' : 'rgba(92,101,115,0.20)'}`,
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif",
            color: request.i_prayed ? '#9A7A35' : '#5C6573',
            cursor: 'pointer',
            fontWeight: request.i_prayed ? '600' : '400'
          }}
        >
          🙏 {request.i_prayed ? 'Praying' : 'Pray'} · {request.intercession_count}
        </button>

        {!answered && myRole === 'leader' && (
          <button
            onClick={onMarkAnswered}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '11px',
              fontFamily: "'Cinzel', serif",
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#9A7A35',
              cursor: 'pointer',
              padding: '0'
            }}
          >
            Mark Answered ✓
          </button>
        )}

        {answered && myRole === 'leader' && (
          <button
            onClick={onMarkAnswered}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '11px',
              fontFamily: "'Cinzel', serif",
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#5C6573',
              cursor: 'pointer',
              padding: '0'
            }}
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  )
}

// useSearchParams() must be inside a Suspense boundary in this build.
export default function CirclePage() {
  return (
    <Suspense fallback={null}>
      <CirclePageInner />
    </Suspense>
  )
}