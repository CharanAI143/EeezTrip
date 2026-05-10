import { useTripStore } from '../state/tripStore';

export default function ChoicePage() {
  const { dispatch, navigate } = useTripStore();

  const handleDetailed = () => {
    dispatch({ type: 'SET_PREF', field: 'planningType', value: 'detailed' });
    navigate('start');
  };

  const handleMood = () => {
    dispatch({ type: 'SET_PREF', field: 'planningType', value: 'mood' });
    dispatch({ type: 'SET_PREF', field: 'destination', value: '' });
    navigate('mood-start');
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
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

        <div className="anim-fade-up" style={{ textAlign: 'center', maxWidth: 800, width: '100%' }}>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(2.2rem, 4vw, 3.5rem)',
            fontWeight: 900,
            color: '#0c1b33',
            marginBottom: 16,
            lineHeight: 1.1,
          }}>
            How would you like to plan?
          </h1>
          <p style={{ color: '#5b8bad', fontSize: '1.15rem', marginBottom: 48 }}>
            Choose your preferred way of building the perfect itinerary.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
            maxWidth: 800,
            margin: '0 auto',
          }}>
            {/* Detailed Planning */}
            <button
              onClick={handleDetailed}
              style={{
                background: '#fff',
                border: '2px solid transparent',
                borderRadius: 24,
                padding: 40,
                textAlign: 'left',
                boxShadow: '0 10px 40px rgba(12,27,51,0.06)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = '#0ea5e9';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(14,165,233,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(12,27,51,0.06)';
              }}
            >
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: 800, color: '#0c1b33', margin: 0 }}>
                Detailed Planning
              </h2>
              <p style={{ color: '#5b8bad', fontSize: '1.05rem', lineHeight: 1.6, margin: 0 }}>
                You already know where you want to go. Enter your destination and we will craft the perfect itinerary around it.
              </p>
            </button>

            {/* Mood Planning */}
            <button
              onClick={handleMood}
              style={{
                background: '#fff',
                border: '2px solid transparent',
                borderRadius: 24,
                padding: 40,
                textAlign: 'left',
                boxShadow: '0 10px 40px rgba(12,27,51,0.06)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = '#ec4899';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(236,72,153,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(12,27,51,0.06)';
              }}
            >
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'linear-gradient(135deg, #ec4899, #f472b6)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: 800, color: '#0c1b33', margin: 0 }}>
                Mood-Based Planning
              </h2>
              <p style={{ color: '#5b8bad', fontSize: '1.05rem', lineHeight: 1.6, margin: 0 }}>
                Not sure where to go? Tell us how you want to feel, and our AI will pick the perfect destination for you.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
