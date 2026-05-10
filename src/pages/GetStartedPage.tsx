import { FormEvent, useState } from 'react';
import { useTripStore } from '../state/tripStore';

const POPULAR = [
  { name: 'Santorini', image: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?q=80&w=200&auto=format&fit=crop' },
  { name: 'Bali', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=200&auto=format&fit=crop' },
  { name: 'Kyoto', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=200&auto=format&fit=crop' },
  { name: 'Maldives', image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=200&auto=format&fit=crop' },
  { name: 'Swiss Alps', image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=200&auto=format&fit=crop' },
  { name: 'Paris', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=200&auto=format&fit=crop' },
  { name: 'Amalfi Coast', image: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?q=80&w=200&auto=format&fit=crop' },
  { name: 'Tokyo', image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=200&auto=format&fit=crop' },
  { name: 'Cape Town', image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?q=80&w=200&auto=format&fit=crop' },
];

export default function GetStartedPage() {
  const { state, dispatch, navigate } = useTripStore();
  const [focused, setFocused] = useState(false);

  const origin = state.preferences.origin;
  const destination = state.preferences.destination;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (destination.trim().length >= 2) navigate('preferences');
  };

  const selectDestination = (name: string) => {
    dispatch({ type: 'SET_DESTINATION', destination: name });
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
          onClick={() => navigate('landing')}
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
          Back to Home
        </button>

        <div className="anim-fade-up" style={{ textAlign: 'center', maxWidth: 760, width: '100%' }}>
          
          <div className="icon-wrap anim-float" style={{ width: 80, height: 80, borderRadius: 24, margin: '0 auto 32px', background: 'linear-gradient(135deg, #0ea5e9, #ec4899)', color: '#fff', boxShadow: '0 12px 32px rgba(14,165,233,0.3)' }}>
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>

          <div className="badge badge-ice" style={{ marginBottom: 16 }}>Step 1 of 2</div>

          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
            fontWeight: 900,
            color: '#0c1b33',
            marginBottom: 16,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}>
            Where do you want to{' '}
            <span className="text-gradient-duo">escape to?</span>
          </h1>

          <p style={{ color: '#5b8bad', fontSize: '1.15rem', marginBottom: 48, lineHeight: 1.6 }}>
            Type any city, country, or region. We'll curate the perfect experience.
          </p>

          {/* Search form */}
          <form onSubmit={handleSubmit} style={{ position: 'relative', marginBottom: 56 }}>
            <div style={{
              display: 'flex',
              background: '#fff',
              border: `1px solid ${focused ? '#38bdf8' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 999,
              overflow: 'hidden',
              boxShadow: focused
                ? '0 0 0 4px rgba(56,189,248,0.15), 0 20px 40px rgba(12,27,51,0.08)'
                : '0 10px 30px rgba(12,27,51,0.05)',
              transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}>
              {/* Origin Input */}
              <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                <span style={{
                  paddingLeft: 28, display: 'flex', alignItems: 'center',
                  color: '#0ea5e9', flexShrink: 0,
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
                <div style={{ width: 1, background: 'rgba(0,0,0,0.08)', margin: '14px 0' }} />
              </div>

              {/* Destination Input */}
              <div style={{ display: 'flex', flex: 1 }}>
                <span style={{
                  paddingLeft: 20, display: 'flex', alignItems: 'center',
                  color: '#ec4899', flexShrink: 0,
                }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </span>
                <input
                  id="destination-input"
                  type="text"
                  value={destination}
                  onChange={e => dispatch({ type: 'SET_PREF', field: 'destination', value: e.target.value })}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Where to?"
                  required
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
                className="btn btn-primary"
                disabled={destination.trim().length < 2}
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

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32,
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(186,230,253,0.6)' }} />
            <span style={{ color: '#5b8bad', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              or select a popular destination
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(186,230,253,0.6)' }} />
          </div>

          {/* Premium Image Pills */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center',
          }}>
            {POPULAR.map((d, i) => (
              <button
                key={d.name}
                onClick={() => selectDestination(d.name)}
                className="anim-fade-up"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '6px 20px 6px 6px',
                  borderRadius: 999,
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.05)',
                  boxShadow: '0 4px 12px rgba(12,27,51,0.04)',
                  cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 600, fontSize: '1rem', color: '#0c1b33',
                  transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  animationDelay: `${i * 0.05}s`,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.transform = 'translateY(-3px)';
                  el.style.boxShadow = '0 8px 24px rgba(12,27,51,0.08)';
                  el.style.borderColor = 'rgba(56,189,248,0.4)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.transform = '';
                  el.style.boxShadow = '0 4px 12px rgba(12,27,51,0.04)';
                  el.style.borderColor = 'rgba(0,0,0,0.05)';
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                  background: '#f0f9ff'
                }}>
                  <img src={d.image} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                </div>
                <span>{d.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Info strip */}
        <div className="glass anim-fade-up delay-400" style={{
          marginTop: 64,
          padding: '20px 32px',
          display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(12,27,51,0.03)',
        }}>
          {[
            { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>, text: 'No signup required' },
            { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>, text: 'Results in seconds' },
            { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, text: '100% free to use' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#2d5474', fontSize: '0.95rem', fontWeight: 600 }}>
              <span style={{ color: '#0ea5e9' }}>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
