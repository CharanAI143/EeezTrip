import { useEffect, useRef, useState } from 'react';
import { useTripStore } from '../state/tripStore';

// High-quality Unsplash images for popular destinations
const DESTINATIONS = [
  { name: 'Santorini', tag: 'Romantic escape', image: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?q=80&w=800&auto=format&fit=crop' },
  { name: 'Bali', tag: 'Nature & culture', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800&auto=format&fit=crop' },
  { name: 'Kyoto', tag: 'Serene tradition', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop' },
  { name: 'Maldives', tag: 'Island paradise', image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=800&auto=format&fit=crop' },
  { name: 'Swiss Alps', tag: 'Adventure peaks', image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=800&auto=format&fit=crop' },
  { name: 'Paris', tag: 'City of love', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop' },
];

const STATS = [
  { value: '50K+', label: 'Trips Planned' },
  { value: '120+', label: 'Destinations' },
  { value: '4.9★', label: 'Avg Rating' },
  { value: '98%', label: 'Satisfaction' },
];

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.792 0-5.484-.235-8.08-.683-1.717-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
    title: 'AI-Powered Planning',
    desc: 'Our intelligent engine crafts fully personalized itineraries tailored to your mood, budget, and travel style.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    title: 'Real Destination Photos',
    desc: 'See stunning, authentic images of your destination before you go — sourced live from Wikimedia Commons.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Smart Budget Breakdown',
    desc: 'Know exactly where every dollar goes — accommodation, food, transport, and activities all mapped out.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    title: 'Day-by-Day Itinerary',
    desc: 'Morning, afternoon, and evening plans for each day — with insider tips and local food picks included.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Instant Results',
    desc: 'No waiting, no signup, no friction. Enter your preferences and get your full trip plan in seconds.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: 'Tailored Travel Moods',
    desc: 'Relaxed, Romantic, Adventure, Nature, or Foodie — every vibe gets a uniquely curated experience.',
  },
];

export default function LandingPage() {
  const { navigate, dispatch } = useTripStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleDestinationClick = (name: string) => {
    dispatch({ type: 'SET_DESTINATION', destination: name });
    navigate('preferences');
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '120px 24px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Hero gradient bg */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'linear-gradient(160deg, #f0f9ff 0%, #fdf2f8 45%, #e0f2fe 100%)',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '60px',
            alignItems: 'center',
          }}>
            {/* Left Column: Text & CTA */}
            <div style={{ textAlign: 'left', maxWidth: 600 }}>
              <div className={`badge badge-ice anim-fade-up ${visible ? '' : 'opacity-0'}`} style={{ marginBottom: 24, display: 'inline-flex' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                AI Travel Planner — Powered by Intelligence
              </div>

              <h1
                className="anim-fade-up delay-100"
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 'clamp(3rem, 5vw, 5.2rem)',
                  fontWeight: 900,
                  lineHeight: 1.08,
                  letterSpacing: '-0.03em',
                  marginBottom: 24,
                  color: '#0c1b33',
                }}
              >
                Your next trip, <br />
                <span className="text-gradient-duo">perfectly planned</span>
                <br />in seconds.
              </h1>

              <p
                className="anim-fade-up delay-200"
                style={{
                  fontSize: '1.15rem',
                  color: '#2d5474',
                  marginBottom: 40,
                  lineHeight: 1.65,
                }}
              >
                Tell us your destination, mood, and budget.
                EeezTrip's AI crafts a jaw-dropping itinerary — complete with stunning photography,
                daily plans, local food picks, and a smart cost breakdown.
              </p>

              <div className="anim-fade-up delay-300" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => navigate('choice')}
                >
                  Start Planning Free
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
                <button
                  className="btn btn-outline btn-lg"
                  onClick={() => {
                    const features = document.getElementById('features-section');
                    if (features) features.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{ borderRadius: 999 }}
                >
                  See How It Works
                </button>
              </div>
            </div>

            {/* Right Column: Floating 3D Image Composition */}
            <div className="anim-fade-up delay-400" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div className="hero-floating-grid">
                {/* Image 1: Main Top Right */}
                <div className="hero-card hero-card-1 animate-float">
                  <img src="https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?q=80&w=600&auto=format&fit=crop" alt="Santorini" />
                </div>
                {/* Image 2: Bottom Left */}
                <div className="hero-card hero-card-2 animate-float-fast" style={{ animationDelay: '1s' }}>
                  <img src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop" alt="Kyoto" />
                </div>
                {/* Image 3: Far Right Behind */}
                <div className="hero-card hero-card-3 animate-float-slow" style={{ animationDelay: '2s' }}>
                  <img src="https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=600&auto=format&fit=crop" alt="Swiss Alps" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '48px 24px', position: 'relative', zIndex: 1 }}>
        <div className="container">
          <div className="glass" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 0,
            padding: '28px 16px',
          }}>
            {STATS.map((s, i) => (
              <div key={i} style={{
                textAlign: 'center',
                padding: '20px 12px',
                borderRight: i < STATS.length - 1 ? '1px solid rgba(186,230,253,0.5)' : 'none',
              }}>
                <div style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '2.4rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #0284c7, #ec4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {s.value}
                </div>
                <div style={{ color: '#5b8bad', fontSize: '0.9rem', fontWeight: 600, marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Destinations ──────────────────────────────────────── */}
      <section style={{ padding: '60px 24px', position: 'relative', zIndex: 1 }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="badge badge-pink" style={{ marginBottom: 16 }}>Top Picks</div>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 900,
              color: '#0c1b33',
            }}>
              Trending <span className="text-gradient-ice">destinations</span>
            </h2>
            <p style={{ color: '#5b8bad', marginTop: 12, fontSize: '1.1rem' }}>
              Click any destination to start planning instantly
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
          }}>
            {DESTINATIONS.map((d, i) => (
              <button
                key={d.name}
                onClick={() => handleDestinationClick(d.name)}
                className="img-card anim-fade-up"
                style={{
                  height: 340,
                  cursor: 'pointer',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <img src={d.image} alt={d.name} loading="lazy" />
                <div className="img-card-overlay" />
                <div className="img-card-content">
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', color: '#bae6fd', textTransform: 'uppercase', marginBottom: 6 }}>
                    {d.tag}
                  </div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1 }}>
                    {d.name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features-section" style={{
        padding: '80px 24px',
        background: 'linear-gradient(180deg, transparent, rgba(224,242,254,0.4), transparent)',
        position: 'relative', zIndex: 1,
      }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="badge badge-ice" style={{ marginBottom: 16 }}>Features</div>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 900,
              color: '#0c1b33',
            }}>
              Everything you need,{' '}
              <span className="text-gradient-pink">nothing you don't</span>
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="glass anim-fade-up"
                style={{
                  padding: '32px',
                  animationDelay: `${i * 0.08}s`,
                  transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  boxShadow: '0 8px 30px rgba(12, 27, 51, 0.05)'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-6px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = '')}
              >
                <div className="icon-wrap" style={{ marginBottom: 20 }}>
                  {f.icon}
                </div>
                <h3 style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 800, fontSize: '1.25rem',
                  color: '#0c1b33', marginBottom: 10,
                }}>
                  {f.title}
                </h3>
                <p style={{ color: '#5b8bad', lineHeight: 1.65, fontSize: '0.95rem' }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px 100px', position: 'relative', zIndex: 1 }}>
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, #075985 0%, #0ea5e9 50%, #ec4899 100%)',
            borderRadius: 32,
            padding: 'clamp(50px, 8vw, 80px) 24px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Subtle light effects */}
            <div style={{
              position: 'absolute', top: '-50%', right: '-15%',
              width: 400, height: 400, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
              filter: 'blur(40px)',
            }} />
            
            <h2 style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              color: '#fff',
              marginBottom: 20,
              letterSpacing: '-0.02em'
            }}>
              Ready to plan your dream trip?
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: '1.15rem',
              maxWidth: 500, margin: '0 auto 40px',
              lineHeight: 1.6,
            }}>
              No sign-up. No credit card. Just your destination and a dream. Let our intelligence do the rest.
            </p>
            <button
              className="btn btn-ghost btn-lg"
              onClick={() => navigate('choice')}
              style={{ fontSize: '1.1rem', borderRadius: 999, padding: '16px 36px', background: 'rgba(255,255,255,0.1)' }}
            >
              Plan My Trip Now
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginLeft: 6 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{
        textAlign: 'center',
        padding: '32px 24px',
        color: '#5b8bad',
        fontSize: '0.9rem',
        borderTop: '1px solid rgba(186,230,253,0.4)',
        position: 'relative', zIndex: 1,
      }}>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, color: '#0284c7' }}>EeezTrip</span>
        {' '}— Premium AI Travel Planner · Built with ❤️ · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
