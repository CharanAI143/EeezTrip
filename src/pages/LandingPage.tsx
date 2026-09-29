import { useEffect, useRef, useState } from 'react';
import { useTripStore } from '../state/tripStore';

const FLIP_DELAY_MS = 3000;

/**
 * Static editorial copy for the flip cards. `region` and `famousFor` are
 * well-known facts about each place, written to be accurate without a live
 * lookup — anything that changes per trip (cost, weather, opening hours)
 * comes from the API once a plan is generated.
 */
const DESTINATIONS = [
  {
    name: 'Santorini',
    tag: 'Romantic escape',
    region: 'Cyclades, Greece',
    image: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?q=80&w=800&auto=format&fit=crop',
    blurb: 'Whitewashed cliff villages stacked above a drowned volcano caldera.',
    famousFor: ['Caldera sunsets', 'Blue-domed Oia', 'Volcanic hot springs'],
  },
  {
    name: 'Bali',
    tag: 'Nature & culture',
    region: 'Indonesia, Southeast Asia',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800&auto=format&fit=crop',
    blurb: 'A volcanic island where Hindu temple rites sit minutes from surf breaks.',
    famousFor: ['Ubud rice terraces', 'Uluwatu cliff temples', 'Reef breaks'],
  },
  {
    name: 'Kyoto',
    tag: 'Serene tradition',
    region: 'Kansai, Japan',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
    blurb: 'Former imperial capital, preserved almost intact across seventeen centuries.',
    famousFor: ['Fushimi Inari gates', 'Arashiyama bamboo', 'Machiya wooden streets'],
  },
  {
    name: 'Maldives',
    tag: 'Island paradise',
    region: 'Indian Ocean, South Asia',
    image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=800&auto=format&fit=crop',
    blurb: 'A chain of coral atolls ringed by two thousand kilometres of reef.',
    famousFor: ['Overwater villas', 'Glass-clear lagoons', 'House-reef diving'],
  },
  {
    name: 'Swiss Alps',
    tag: 'Adventure peaks',
    region: 'Central Europe',
    image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=800&auto=format&fit=crop',
    blurb: 'Glacier-carved valleys crossed by rack railways and walking trails.',
    famousFor: ['Jungfraujoch rail', 'Glacier Express', 'Alpine lakes'],
  },
  {
    name: 'Paris',
    tag: 'City of love',
    region: 'Île-de-France, France',
    image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop',
    blurb: 'A river-bisected capital of museum halls and neighbourhood bistros.',
    famousFor: ['The Louvre', 'Seine-side walks', 'Montmartre at dawn'],
  },
];

/**
 * Hero cards reference DESTINATIONS by index rather than re-pasting URLs, and
 * deliberately skip Santorini/Kyoto/Swiss Alps so the hero does not simply
 * preview the first row of the grid below it.
 */
const HERO_CARDS = [DESTINATIONS[3], DESTINATIONS[1], DESTINATIONS[5]];

const STATS = [
  { value: '2–14', label: 'Day Itineraries' },
  { value: '4', label: 'Slots Per Day' },
  { value: '5', label: 'Cost Categories' },
  { value: '3', label: 'AI Providers' },
];

const STEPS = [
  {
    title: 'Pick your vibe',
    desc: 'Already know where you are going? Enter a destination and plan around it. Not sure? Pick a mood and we will suggest places that suit it.',
  },
  {
    title: 'Set budget and days',
    desc: 'Give us a budget and a trip length. We keep every rupee accounted for across stay, food, transport, activities, and extras.',
  },
  {
    title: 'Get your itinerary',
    desc: 'Receive a day-by-day plan with morning-to-evening slots, local food picks, live photos, and insider tips you can revise by just asking.',
  },
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Instant Results',
    desc: 'No waiting, no signup, no friction. Enter your preferences and get your full trip plan in seconds.',
  },
];

/**
 * These three used to be joined by 'Smart Budget Breakdown', 'Day-by-Day
 * Itinerary' and 'Tailored Travel Moods'. Each restated one of the three
 * How It Works steps almost word for word, so the page was explaining the same
 * flow twice. Restoring them is a paste into this array if the section needs
 * the weight back.
 */

export default function LandingPage() {
  const { navigate, dispatch } = useTripStore();
  const [flipped, setFlipped] = useState<string | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const hoveredCard = useRef<string | null>(null);

  const clearHoverTimer = () => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  useEffect(() => clearHoverTimer, []);

  const handleDestinationClick = (name: string) => {
    dispatch({ type: 'SET_DESTINATION', destination: name });
    navigate('preferences');
  };

  /**
   * A card flips when tapped, or when the pointer rests on it for 3s. The
   * dwell timer is cancelled as soon as the pointer leaves so a quick pass
   * never triggers it.
   */
  const startHoverTimer = (name: string) => {
    clearHoverTimer();
    hoveredCard.current = name;
    hoverTimer.current = window.setTimeout(() => {
      setFlipped(name);
      hoverTimer.current = null;
    }, FLIP_DELAY_MS);
  };

  const cancelHoverTimer = () => {
    if (hoveredCard.current !== null) {
      clearHoverTimer();
      hoveredCard.current = null;
    }
  };

  const toggleFlip = (name: string) => {
    cancelHoverTimer();
    setFlipped(prev => (prev === name ? null : name));
  };

  const scrollTo = (id: string) => {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
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
              <div className="badge badge-ice anim-fade-up" style={{ marginBottom: 24, display: 'inline-flex' }}>
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
                Your next trip,<br />{' '}
                <span className="text-gradient-duo">perfectly planned</span>
                <br />{' '}in seconds.
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
                  onClick={() => scrollTo('how-it-works')}
                  style={{ borderRadius: 999 }}
                >
                  See How It Works
                </button>
              </div>
            </div>

            {/* Right Column: Floating 3D Image Composition */}
            <div className="anim-fade-up delay-400" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div className="hero-floating-grid">
                {HERO_CARDS.map((d, i) => (
                  <div
                    key={d.name}
                    className={`hero-card hero-card-${i + 1} ${
                      i === 0 ? 'animate-float' : i === 1 ? 'animate-float-fast' : 'animate-float-slow'
                    }`}
                    style={i === 0 ? undefined : { animationDelay: `${i}s` }}
                  >
                    <img src={d.image.replace('w=800', 'w=600')} alt={d.name} loading="eager" />
                  </div>
                ))}
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
                <div style={{ color: '#3f7295', fontSize: '0.9rem', fontWeight: 600, marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section id="how-it-works" style={{
        padding: '80px 24px',
        background: 'linear-gradient(180deg, transparent, rgba(224,242,254,0.4), transparent)',
        position: 'relative', zIndex: 1, scrollMarginTop: 90,
      }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="badge badge-ice" style={{ marginBottom: 16 }}>How It Works</div>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 900,
              color: '#0c1b33',
            }}>
              Three steps, <span className="text-gradient-duo">one perfect trip</span>
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            maxWidth: 1100,
            margin: '0 auto',
          }}>
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="glass anim-fade-up"
                style={{ padding: '32px', animationDelay: `${i * 0.1}s`, position: 'relative' }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 16,
                  background: 'linear-gradient(135deg, #0284c7, #ec4899)',
                  color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.4rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  {i + 1}
                </div>
                <h3 style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 800, fontSize: '1.25rem',
                  color: '#0c1b33', marginBottom: 10,
                }}>
                  {step.title}
                </h3>
                <p style={{ color: '#3f7295', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>
                  {step.desc}
                </p>
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
            <p style={{ color: '#3f7295', marginTop: 12, fontSize: '1.1rem' }}>
              Tap a card, or hover for 3 seconds, to see what makes each place worth the trip
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
          }}>
            {DESTINATIONS.map((d, i) => (
              <div
                key={d.name}
                className="img-card anim-fade-up"
                data-flipped={flipped === d.name}
                style={{ height: 340, animationDelay: `${i * 0.1}s` }}
                onMouseEnter={() => startHoverTimer(d.name)}
                onMouseLeave={cancelHoverTimer}
              >
                <div className="img-card-inner">
                  {/* Front */}
                  <div className="img-card-face img-card-front">
                    <img src={d.image} alt={d.name} loading="lazy" />
                    <div className="img-card-overlay" />
                    <button
                      type="button"
                      className="img-card-hit"
                      aria-expanded={flipped === d.name}
                      aria-label={`${flipped === d.name ? 'Hide details for' : 'Show details for'} ${d.name}`}
                      onClick={() => toggleFlip(d.name)}
                    />
                    <div className="img-card-hint" aria-hidden="true">
                      {flipped === d.name ? 'Tap to close' : 'Tap for details'}
                    </div>
                    <div className="img-card-content">
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', color: '#bae6fd', textTransform: 'uppercase', marginBottom: 6 }}>
                        {d.tag}
                      </div>
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1 }}>
                        {d.name}
                      </div>
                    </div>
                  </div>

                  {/* Back. `inert` matters here: aria-hidden alone does not
                      remove the buttons below from the tab order, so keyboard
                      users would otherwise land on an invisible back face. */}
                  <div
                    className="img-card-face img-card-back"
                    aria-hidden={flipped !== d.name}
                    inert={flipped !== d.name}
                  >
                    <div className="img-card-back-tag">{d.tag}</div>
                    <h3 className="img-card-back-title">{d.name}</h3>
                    <p className="img-card-back-region">{d.region}</p>
                    <p className="img-card-back-body">{d.blurb}</p>
                    <p className="img-card-back-label" id={`famous-${i}`}>
                      Most famous for
                    </p>
                    <ul className="img-card-highlights" aria-labelledby={`famous-${i}`}>
                      {d.famousFor.map(h => <li key={h}>{h}</li>)}
                    </ul>
                    <div className="img-card-back-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleDestinationClick(d.name)}
                      >
                        Plan this trip
                      </button>
                      <button
                        type="button"
                        className="img-card-flip-back"
                        onClick={() => toggleFlip(d.name)}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
                className="glass feature-card anim-fade-up"
                style={{
                  padding: '32px',
                  animationDelay: `${i * 0.08}s`,
                  boxShadow: '0 8px 30px rgba(12, 27, 51, 0.05)'
                }}
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
                <p style={{ color: '#3f7295', lineHeight: 1.65, fontSize: '0.95rem' }}>
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
              Plan My Trip Now — It's Free
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
        color: '#3f7295',
        fontSize: '0.9rem',
        borderTop: '1px solid rgba(186,230,253,0.4)',
        position: 'relative', zIndex: 1,
      }}>
        {/* #0284c7 was 3.84:1 here; #0369a1 gives 5.57:1. */}
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, color: '#0369a1' }}>EeezTrip</span>
        {' '}— Premium AI Travel Planner · Built with ❤️ · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
