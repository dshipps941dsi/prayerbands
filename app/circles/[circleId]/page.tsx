'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

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

export default function CirclePage() {
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
    const res = await fetch(`/api/circles/${circleId}`)
    if (res.status === 401) {
      router.push('/signin')
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
    setEditName(data.circle.name)
    setEditDescription(data.circle.description || '')

    setLoading(false)
  }, [circleId, router])

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
          intercession_count: data.praying ? r.intercession_count + 1 : r.intercession_count - 1
        }
        : r
    ))
  }

  async function handleSubmitRequest() {
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

  function shareCircle() {
    if (!circle) return
    const text = `Join my Prayer Circle — ${circle.name}\nCode: ${circle.join_code}\nprayerbands.com/circles`
    if (navigator.share) {
      navigator.share({ text })
    } else {
      navigator.clipboard.writeText(text)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#FAF6EF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, serif',
        color: '#8B7355'
      }}>
        Loading circle...
      </div>
    )
  }

  if (error || !circle) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#FAF6EF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, serif',
        padding: '24px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '16px', color: '#5C4033', marginBottom: '20px' }}>
          {error || 'This circle could not be found.'}
        </p>
        <button
          onClick={() => router.push('/circles')}
          style={{
            backgroundColor: '#B8860B',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontFamily: 'Georgia, serif',
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
      backgroundColor: '#FAF6EF',
      fontFamily: 'Georgia, serif',
      paddingBottom: '80px'
    }}>

      {/* Header */}
      <div style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #E8DCC8',
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
              onClick={() => router.push('/dashboard?tab=prayers')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#8B7355',
                padding: 0,
                lineHeight: 1
              }}
            >
              ←
            </button>
            <PrayerBandsLogo size={28} color="#B8860B" />
            <div>
              <h1 style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '20px',
                fontWeight: '700',
                color: '#2C1810',
                margin: 0,
                lineHeight: 1.2
              }}>{circle.name}</h1>
              <p style={{ fontSize: '12px', color: '#8B7355', margin: '3px 0 0 0' }}>
                {members.length} {members.length === 1 ? 'person' : 'people'} praying
              </p>
            </div>
          </div>
          {/* Join code badge */}
          <div
            onClick={copyCode}
            style={{
              backgroundColor: '#FAF6EF',
              border: '1px solid #E8DCC8',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <p style={{
              fontSize: '16px',
              fontWeight: '700',
              letterSpacing: '0.15em',
              color: '#B8860B',
              margin: 0
            }}>{circle.join_code}</p>
            <p style={{ fontSize: '10px', color: '#8B7355', margin: '2px 0 0 0' }}>
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
                borderBottom: tab === t ? '2px solid #B8860B' : '2px solid transparent',
                padding: '10px 0',
                fontSize: '13px',
                fontFamily: 'Georgia, serif',
                fontWeight: tab === t ? '700' : '400',
                color: tab === t ? '#B8860B' : '#8B7355',
                cursor: 'pointer',
                textTransform: 'capitalize'
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
            {/* Add request button */}
            {!showRequestForm && (
              <button
                onClick={() => setShowRequestForm(true)}
                style={{
                  width: '100%',
                  backgroundColor: '#fff',
                  border: '2px dashed #D4C5B0',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '14px',
                  fontFamily: 'Georgia, serif',
                  color: '#8B7355',
                  cursor: 'pointer',
                  marginBottom: '20px'
                }}
              >
                + Share a Prayer Request
              </button>
            )}

            {/* Request form */}
            {showRequestForm && (
              <div style={{
                backgroundColor: '#fff',
                border: '1px solid #E8DCC8',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
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
                    fontFamily: 'Georgia, serif',
                    color: '#2C1810',
                    border: '1px solid #E8DCC8',
                    borderRadius: '8px',
                    backgroundColor: '#FAF6EF',
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
                      border: '1px solid #D4C5B0',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '14px',
                      fontFamily: 'Georgia, serif',
                      color: '#8B7355',
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
                      backgroundColor: requestText.trim() ? '#B8860B' : '#D4C5B0',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '14px',
                      fontFamily: 'Georgia, serif',
                      fontWeight: '600',
                      color: '#fff',
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
                color: '#8B7355'
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
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#7BAE8E',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  margin: '0 0 12px 0'
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
                  backgroundColor: '#fff',
                  border: '1px solid #E8DCC8',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: member.role === 'leader' ? '#B8860B' : '#E8DCC8',
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
                      color: '#2C1810',
                      margin: 0
                    }}>
                      {member.role === 'leader' ? 'Circle Leader' : 'Member'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#8B7355', margin: '2px 0 0 0' }}>
                      Joined {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                {myRole === 'leader' && member.role !== 'leader' && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    style={{
                      background: 'none',
                      border: '1px solid #E8C4BB',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
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
              backgroundColor: '#fff',
              border: '2px solid #B8860B',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {isNew && (
                <p style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#7BAE8E',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: '0 0 12px 0'
                }}>
                  ✓ Circle Created!
                </p>
              )}
              <p style={{ fontSize: '13px', color: '#8B7355', margin: '0 0 8px 0' }}>
                Share this code to invite people
              </p>
              <div style={{
                fontSize: '36px',
                fontWeight: '700',
                letterSpacing: '0.3em',
                color: '#B8860B',
                fontFamily: 'Georgia, serif',
                margin: '0 0 16px 0'
              }}>
                {circle.join_code}
              </div>
              <button
                onClick={shareCircle}
                style={{
                  width: '100%',
                  backgroundColor: '#B8860B',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '15px',
                  fontFamily: 'Georgia, serif',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '8px'
                }}
              >
                {codeCopied ? 'Copied!' : '📤 Share Join Code'}
              </button>
              <p style={{ fontSize: '12px', color: '#B0A090', margin: 0 }}>
                prayerbands.com/circles → enter code <strong>{circle.join_code}</strong>
              </p>
            </div>

            {/* Circle description */}
            {circle.description && (
              <div style={{
                backgroundColor: '#fff',
                border: '1px solid #E8DCC8',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <p style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#8B7355',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: '0 0 8px 0'
                }}>About This Circle</p>
                <p style={{
                  fontSize: '15px',
                  color: '#5C4033',
                  lineHeight: '1.7',
                  margin: 0,
                  fontStyle: 'italic'
                }}>
                  "{circle.description}"
                </p>
              </div>
            )}

            {/* Leader settings */}
            {myRole === 'leader' && (
              <div style={{
                backgroundColor: '#fff',
                border: '1px solid #E8DCC8',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <p style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#8B7355',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: '0 0 16px 0'
                }}>Circle Settings</p>

                <label style={{ fontSize: '12px', color: '#8B7355', display: 'block', marginBottom: '4px' }}>
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
                    fontFamily: 'Georgia, serif',
                    color: '#2C1810',
                    border: '1px solid #E8DCC8',
                    borderRadius: '8px',
                    backgroundColor: '#FAF6EF',
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginBottom: '12px'
                  }}
                />

                <label style={{ fontSize: '12px', color: '#8B7355', display: 'block', marginBottom: '4px' }}>
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
                    fontFamily: 'Georgia, serif',
                    color: '#2C1810',
                    border: '1px solid #E8DCC8',
                    borderRadius: '8px',
                    backgroundColor: '#FAF6EF',
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
                    backgroundColor: '#2C1810',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '14px',
                    fontFamily: 'Georgia, serif',
                    fontWeight: '600',
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
                    border: '1px solid #D4C5B0',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '14px',
                    fontFamily: 'Georgia, serif',
                    color: '#8B7355',
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
                      border: '1px solid #E8C4BB',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '14px',
                      fontFamily: 'Georgia, serif',
                      color: '#C0392B',
                      cursor: 'pointer'
                    }}
                  >
                    Close Circle
                  </button>
                ) : (
                  <div style={{
                    backgroundColor: '#FDF0EE',
                    border: '1px solid #E8C4BB',
                    borderRadius: '8px',
                    padding: '14px'
                  }}>
                    <p style={{ fontSize: '13px', color: '#5C4033', margin: '0 0 12px 0' }}>
                      Closing this circle will remove it from everyone's dashboard.
                      Prayer requests will be preserved. Are you sure?
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setShowCloseConfirm(false)}
                        style={{
                          flex: 1,
                          backgroundColor: 'transparent',
                          border: '1px solid #D4C5B0',
                          borderRadius: '6px',
                          padding: '8px',
                          fontSize: '13px',
                          color: '#8B7355',
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
                          fontSize: '13px',
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
                  border: '1px solid #E8C4BB',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  fontFamily: 'Georgia, serif',
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
      backgroundColor: answered ? '#F5F5F0' : '#fff',
      border: `1px solid ${answered ? '#D4D0C8' : '#E8DCC8'}`,
      borderRadius: '10px',
      padding: '16px',
      marginBottom: '12px',
      opacity: answered ? 0.8 : 1
    }}>
      {answered && (
        <p style={{
          fontSize: '11px',
          fontWeight: '600',
          color: '#7BAE8E',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin: '0 0 8px 0'
        }}>
          ✓ Answered
        </p>
      )}

      <p style={{
        fontSize: '15px',
        color: '#2C1810',
        lineHeight: '1.6',
        margin: '0 0 12px 0',
        fontStyle: 'italic'
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
            backgroundColor: request.i_prayed ? '#FFF8E7' : '#FAF6EF',
            border: `1px solid ${request.i_prayed ? '#B8860B' : '#E8DCC8'}`,
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '13px',
            fontFamily: 'Georgia, serif',
            color: request.i_prayed ? '#B8860B' : '#8B7355',
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
              fontSize: '12px',
              color: '#7BAE8E',
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
              fontSize: '12px',
              color: '#8B7355',
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