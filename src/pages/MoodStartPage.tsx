import { FormEvent, useState } from 'react';
import { useTripStore } from '../state/tripStore';

export default function MoodStartPage() {
  const { state, dispatch, navigate } = useTripStore();
  const [focused, setFocused] = useState(false);

  const origin = state.preferences.origin;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate('preferences');
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Top gradient bg */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, #f0f9ff 0%, #fdf2f8 40%, #e0f2fe 100%)',
        zIndex: 0,
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
        padding: '120px 24px 60px',
      }}>
        {/* Back */}
        <button
          onClick={() => navigate('choice')}
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
          Back to Choice
        </button>

        <div className="anim-fade-up" style={{ textAlign: 'center', maxWidth: 760, width: '100%' }}>
          
          <div className="icon-wrap anim-float" style={{ width: 80, height: 80, borderRadius: 24, margin: '0 auto 32px', background: 'linear-gradient(135deg, #ec4899, #f472b6)', color: '#fff', boxShadow: '0 12px 32px rgba(236,72,153,0.3)' }}>
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>

          <div className="badge badge-pink" style={{ marginBottom: 16 }}>Mood-Based Planning</div>

          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
            fontWeight: 900,
            color: '#0c1b33',
            marginBottom: 16,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}>
            Where are you{' '}
            <span className="text-gradient-duo">leaving from?</span>
          </h1>

          <p style={{ color: '#5b8bad', fontSize: '1.15rem', marginBottom: 48, lineHeight: 1.6 }}>
            Tell us your starting point, and we'll handle the rest.
          </p>

          {/* Search form */}
          <form onSubmit={handleSubmit} style={{ position: 'relative', marginBottom: 56 }}>
            <div style={{
              display: 'flex',
              background: '#fff',
              border: `1px solid ${focused ? '#ec4899' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 999,
              overflow: 'hidden',
              boxShadow: focused
                ? '0 0 0 4px rgba(236,72,153,0.15), 0 20px 40px rgba(12,27,51,0.08)'
                : '0 10px 30px rgba(12,27,51,0.05)',
              transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
              maxWidth: 600,
              margin: '0 auto',
            }}>
              {/* Origin Input */}
              <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                <span style={{
                  paddingLeft: 28, display: 'flex', alignItems: 'center',
                  color: '#ec4899', flexShrink: 0,
                }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </span>
                <input
                  id="origin-input"
                  type="text"
                  value={origin}
                  onChange={e => dispatch({ type: 'SET_PREF', field: 'origin', value: e.target.value })}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Leaving from (Optional)"
                  minLength={2}
                  style={{
                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                    padding: '22px 20px', fontFamily: 'Outfit, sans-serif',
                    fontSize: '1.15rem', fontWeight: 500, color: '#0c1b33',
                    minWidth: 0,
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-pink"
                style={{
                  margin: 8, borderRadius: 999,
                  padding: '14px 36px',
                  fontSize: '1.05rem',
                  flexShrink: 0,
                }}
              >
                Continue
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginLeft: 6 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
