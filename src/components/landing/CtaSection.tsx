import { SECTION_IDS } from './landingContent';
import { useTripStore } from '../../state/tripStore';

export default function CtaSection() {
  const { navigate } = useTripStore();

  return (
    <section id={SECTION_IDS.cta} style={{ padding: '80px 24px 100px', position: 'relative', zIndex: 1 }}>
      <div className="container">
        <div className="lp-cta-banner">
          {/* Subtle light effects */}
          <div className="lp-cta-glow" />

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
  );
}
