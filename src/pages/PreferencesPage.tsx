import { FormEvent, useState, useEffect } from 'react';
import { useTripStore } from '../state/tripStore';
import { MoodOption } from '../types';

const MOODS: MoodOption[] = [
  {
    id: 'Relaxed',
    label: 'Relaxed',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop',
    description: 'Slow mornings, café walks, and golden-hour views',
    color: '#38bdf8',
  },
  {
    id: 'Romantic',
    label: 'Romantic',
    imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=400&auto=format&fit=crop',
    description: 'Sunset strolls, candlelit dinners, and scenic corners',
    color: '#ec4899',
    pinkAccent: true,
  },
  {
    id: 'Adventure',
    label: 'Adventure',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=400&auto=format&fit=crop',
    description: 'Active days, viewpoint trails, and heart-pumping moves',
    color: '#0ea5e9',
  },
  {
    id: 'Nature',
    label: 'Nature',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=400&auto=format&fit=crop',
    description: 'Green spaces, fresh air, and peaceful scenic calm',
    color: '#22c55e',
  },
  {
    id: 'Foodie',
    label: 'Foodie',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=400&auto=format&fit=crop',
    description: 'Local flavors, market hopping, and comfort meals',
    color: '#f97316',
  },
];

const BUDGET_PRESETS = [
  { label: 'Budget', value: 20000, icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { label: 'Mid-Range', value: 50000, icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg> },
  { label: 'Premium', value: 100000, icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg> },
  { label: 'Luxury', value: 300000, icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg> },
];

const DAY_OPTIONS = [2, 3, 4, 5, 7, 10, 14];

export default function PreferencesPage() {
  const { state, dispatch, navigate, submitTrip } = useTripStore();
  const prefs = state.preferences;

  const [budgetInput, setBudgetInput] = useState(String(prefs.budget));

  useEffect(() => {
    if (prefs.planningType === 'detailed' && (!prefs.destination || prefs.destination.trim().length < 2)) {
      navigate('start');
    }
  }, [prefs.destination, prefs.planningType, navigate]);

  const setMood = (mood: string) => dispatch({ type: 'SET_PREF', field: 'mood', value: mood });
  const setDays = (days: number) => dispatch({ type: 'SET_PREF', field: 'days', value: days });
  const setBudget = (val: number) => {
    dispatch({ type: 'SET_PREF', field: 'budget', value: val });
    setBudgetInput(String(val));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submitTrip();
  };

  const selectedMood = MOODS.find(m => m.id === prefs.mood) || MOODS[0];

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, #fdf2f8 0%, #f0f9ff 50%, #fdf2f8 100%)',
        zIndex: 0,
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 960, margin: '0 auto',
        padding: '120px 24px 60px',
      }}>
        {/* Back */}
        <button
          onClick={() => navigate(prefs.planningType === 'detailed' ? 'start' : 'mood-start')}
          style={{
            position: 'absolute', top: 90, left: 32,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            color: '#5b8bad', fontWeight: 600, fontSize: '0.95rem',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        {/* Header */}
        <div className="anim-fade-up" style={{ textAlign: 'center', marginBottom: 56 }}>
          {prefs.planningType === 'detailed' && (
            <button
              onClick={() => navigate('start')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#5b8bad', fontWeight: 600, fontSize: '0.95rem',
                marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto 20px',
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Change Destination
            </button>
          )}

          <div className="badge badge-pink" style={{ marginBottom: 16 }}>Step 2 of 2</div>

          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 900, color: '#0c1b33', marginBottom: 12,
            letterSpacing: '-0.02em',
          }}>
            {prefs.planningType === 'mood' ? (
              <>Curate your <span className="text-gradient-duo">experience</span></>
            ) : (
              <>Curate your <span className="text-gradient-duo">{prefs.destination}</span> experience</>
            )}
          </h1>
          <p style={{ color: '#5b8bad', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto' }}>
            Select your vibe, set your budget, and choose your duration. We'll handcraft the perfect itinerary.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Mood Selection ──────────────────────────────────────── */}
          <div className="glass anim-fade-up delay-100" style={{ padding: '32px', marginBottom: 24, boxShadow: '0 8px 30px rgba(12, 27, 51, 0.04)' }}>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: '1.25rem', color: '#0c1b33', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: '#38bdf8' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              What's your travel vibe?
            </h2>
            <p style={{ color: '#5b8bad', fontSize: '0.95rem', marginBottom: 24 }}>
              {selectedMood.description}
            </p>

            <div style={{
              display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16,
              scrollSnapType: 'x mandatory',
            }}>
              {MOODS.map(mood => {
                const active = prefs.mood === mood.id;
                return (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => setMood(mood.id)}
                    className="img-card"
                    style={{
                      flex: '0 0 180px',
                      height: 240,
                      scrollSnapAlign: 'start',
                      border: active ? `3px solid ${mood.color}` : '1px solid rgba(0,0,0,0.05)',
                      transform: active ? 'translateY(-6px)' : '',
                      boxShadow: active ? `0 12px 30px ${mood.color}44` : '',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <img src={mood.imageUrl} alt={mood.label} loading="lazy" />
                    <div className="img-card-overlay" style={{ opacity: active ? 0.9 : 0.7 }} />
                    <div className="img-card-content" style={{ padding: 16 }}>
                      <div style={{
                        fontFamily: 'Outfit, sans-serif',
                        fontWeight: 800, fontSize: '1.2rem',
                        color: active ? mood.color : '#fff',
                        textAlign: 'center',
                      }}>
                        {mood.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Budget ─────────────────────────────────────────────── */}
          <div className="glass anim-fade-up delay-200" style={{ padding: '32px', marginBottom: 24, boxShadow: '0 8px 30px rgba(12, 27, 51, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
              <div>
                <h2 style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                  fontSize: '1.25rem', color: '#0c1b33', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: '#0ea5e9' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  What's your total budget?
                </h2>
                <p style={{ color: '#5b8bad', fontSize: '0.95rem' }}>
                  Includes flights, stays, food, and activities.
                </p>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#fff',
                border: '1.5px solid rgba(14,165,233,0.3)',
                borderRadius: 16, padding: '12px 20px',
                boxShadow: '0 4px 12px rgba(14,165,233,0.08)',
              }}>
                <span style={{ color: '#0ea5e9', fontWeight: 700, fontSize: '1.1rem' }}>₹</span>
                <input
                  type="number"
                  value={budgetInput}
                  min={5000}
                  max={2000000}
                  onChange={e => {
                    setBudgetInput(e.target.value);
                    const v = parseInt(e.target.value);
                    if (!isNaN(v) && v >= 5000) dispatch({ type: 'SET_PREF', field: 'budget', value: v });
                  }}
                  style={{
                    border: 'none', outline: 'none', background: 'transparent',
                    width: 140, textAlign: 'right', fontFamily: 'Outfit, sans-serif',
                    fontWeight: 900, fontSize: '1.4rem', color: '#0284c7',
                  }}
                />
              </div>
            </div>

            {/* Budget slider */}
            <div style={{ marginBottom: 32, position: 'relative' }}>
              <input
                type="range"
                min={5000} max={500000} step={1000}
                value={prefs.budget}
                onChange={e => setBudget(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#0ea5e9',
                  height: 6, cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <span style={{ color: '#5b8bad', fontSize: '0.85rem', fontWeight: 600 }}>₹5,000</span>
                <span style={{ color: '#5b8bad', fontSize: '0.85rem', fontWeight: 600 }}>₹5,00,000+</span>
              </div>
            </div>

            {/* Quick presets */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {BUDGET_PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setBudget(p.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px', borderRadius: 999,
                    border: `1.5px solid ${prefs.budget === p.value ? '#0ea5e9' : 'rgba(0,0,0,0.06)'}`,
                    background: prefs.budget === p.value ? 'rgba(14,165,233,0.08)' : '#fff',
                    cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 600, fontSize: '0.95rem',
                    color: prefs.budget === p.value ? '#0284c7' : '#2d5474',
                    transition: 'all 0.2s',
                    boxShadow: prefs.budget === p.value ? '0 4px 12px rgba(14,165,233,0.1)' : '0 2px 8px rgba(0,0,0,0.02)',
                  }}
                >
                  <span style={{ color: prefs.budget === p.value ? '#0ea5e9' : '#a8d4ed' }}>{p.icon}</span>
                  {p.label} (₹{p.value.toLocaleString('en-IN')})
                </button>
              ))}
            </div>
          </div>

          {/* ── Duration ───────────────────────────────────────────── */}
          <div className="glass anim-fade-up delay-300" style={{ padding: '32px', marginBottom: 40, boxShadow: '0 8px 30px rgba(12, 27, 51, 0.04)' }}>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: '1.25rem', color: '#0c1b33', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: '#ec4899' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
              </svg>
              How many days?
            </h2>
            <p style={{ color: '#5b8bad', fontSize: '0.95rem', marginBottom: 24 }}>
              We'll craft a structured, day-by-day plan.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              {DAY_OPTIONS.map(d => {
                const active = prefs.days === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    style={{
                      width: 72, height: 72, borderRadius: 18,
                      border: active ? '2px solid #ec4899' : '1px solid rgba(0,0,0,0.06)',
                      background: active ? 'rgba(236,72,153,0.08)' : '#fff',
                      cursor: 'pointer',
                      fontFamily: 'Outfit, sans-serif',
                      fontWeight: 900, fontSize: '1.2rem',
                      color: active ? '#db2777' : '#2d5474',
                      transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      transform: active ? 'scale(1.05)' : '',
                      boxShadow: active ? '0 8px 24px rgba(236,72,153,0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                    }}
                  >
                    {d}
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, marginTop: 4, color: active ? '#ec4899' : '#5b8bad' }}>
                      {d === 1 ? 'DAY' : 'DAYS'}
                    </div>
                  </button>
                );
              })}
              
              {/* Custom days input */}
              <div style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                width: 80, height: 72, borderRadius: 18,
                background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                padding: '0 8px'
              }}>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={prefs.days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%', border: 'none', outline: 'none',
                    textAlign: 'center', fontFamily: 'Outfit, sans-serif',
                    fontWeight: 900, fontSize: '1.2rem', color: '#2d5474'
                  }}
                />
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#5b8bad' }}>CUSTOM</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#2d5474', marginBottom: 8 }}>Start Date</label>
                <input
                  type="date"
                  value={prefs.startDate}
                  onChange={(e) => dispatch({ type: 'SET_PREF', field: 'startDate', value: e.target.value })}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12,
                    border: '1.5px solid rgba(0,0,0,0.08)', outline: 'none',
                    fontFamily: 'Outfit, sans-serif', fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#2d5474', marginBottom: 8 }}>End Date</label>
                <input
                  type="date"
                  value={prefs.endDate}
                  onChange={(e) => dispatch({ type: 'SET_PREF', field: 'endDate', value: e.target.value })}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12,
                    border: '1.5px solid rgba(0,0,0,0.08)', outline: 'none',
                    fontFamily: 'Outfit, sans-serif', fontSize: '1rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Engine Badge ────────────────────────────────────────── */}
          <div className="glass anim-fade-up delay-400" style={{ padding: '20px 32px', marginBottom: 40, boxShadow: '0 8px 30px rgba(12, 27, 51, 0.04)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', flexShrink: 0 }}>
              <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H7.5a2.25 2.25 0 00-2.25 2.25v10.5a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#6d28d9' }}>Deep AI Mode — Active</div>
              <div style={{ color: '#5b8bad', fontSize: '0.88rem', marginTop: 2 }}>Powered by your local Ollama OSS model for rich, detailed itineraries.</div>
            </div>
          </div>

          {/* Error */}
          {state.error && (
            <div style={{
              marginBottom: 24, padding: '16px 20px',
              background: 'rgba(254,226,226,0.9)', border: '1px solid #f87171',
              borderRadius: 16, color: '#991b1b', fontWeight: 600, fontSize: '0.95rem',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {state.error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={state.loading || (prefs.planningType === 'detailed' && prefs.destination.trim().length < 1)}
            className="btn btn-pink btn-lg"
            style={{
              width: '100%', borderRadius: 20, fontSize: '1.15rem', padding: '20px',
              position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(236,72,153,0.3)',
            }}
          >
            {state.loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin-slow 0.7s linear infinite',
                  display: 'inline-block',
                }} />
                Crafting your luxury experience...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                Generate My Itinerary
              </span>
            )}
          </button>

          <p style={{ textAlign: 'center', color: '#a8d4ed', fontSize: '0.85rem', marginTop: 16 }}>
            Your personalized itinerary will be ready in seconds.
          </p>
        </form>
      </div>
    </div>
  );
}
