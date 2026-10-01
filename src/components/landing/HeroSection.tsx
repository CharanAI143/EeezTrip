import { useEffect } from 'react';
import { useLandingPage } from './LandingPageProvider';
import { HERO_CARD_STARTS, HERO_TILTS, SECTION_IDS } from './landingContent';
import KanchenjungaBackdrop from './KanchenjungaBackdrop';
import { useTripStore } from '../../state/tripStore';
import type { CSSProperties } from 'react';

export default function HeroSection() {
  const { navigate } = useTripStore();
  const { state, actions, destinations } = useLandingPage();

  // The carousel timer is page state, not hero-local: pausing or retiming it
  // is something a control anywhere on the page can now do.
  useEffect(() => {
    if (state.reducedMotion || !state.heroPlaying || state.heroSwapMs <= 0) return;
    const id = window.setInterval(actions.advanceHero, state.heroSwapMs);
    return () => window.clearInterval(id);
  }, [state.reducedMotion, state.heroPlaying, state.heroSwapMs, actions.advanceHero]);

  return (
    <section
      id={SECTION_IDS.hero}
      className="lp-hero"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '120px 24px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'linear-gradient(160deg, #f0f9ff 0%, #fdf2f8 45%, #e0f2fe 100%)',
        }}
      />

      {/* The mountain sits between the gradient and the content, so it reads as
          part of the hero landscape rather than floating on top of the cards. */}
      <KanchenjungaBackdrop />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="lp-hero-grid">
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
                onClick={() => actions.scrollToSection(SECTION_IDS.howItWorks)}
                style={{ borderRadius: 999 }}
              >
                See How It Works
              </button>
            </div>
          </div>

          {/* Right Column: Floating 3D Image Composition */}
          <div className="anim-fade-up delay-400" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="hero-floating-grid">
              {HERO_CARD_STARTS.map((start, i) => {
                const d = destinations[(start + state.heroStep) % destinations.length];
                return (
                  <div
                    key={i}
                    className={`hero-card-slot hero-card-slot-${i + 1}`}
                  >
                    <div
                      className="hero-card"
                      style={{ '--hero-tilt': HERO_TILTS[i] } as CSSProperties}
                    >
                      {/* Keyed by name so React remounts the img on every
                          swap, which replays the cross-fade entrance. */}
                      <img
                        key={d.name}
                        className="hero-card-swap"
                        src={d.image.replace('w=800', 'w=600')}
                        alt={d.name}
                        loading="eager"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
