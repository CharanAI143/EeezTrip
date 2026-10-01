import { FEATURES, SECTION_IDS } from './landingContent';

export default function FeaturesSection() {
  return (
    <section id={SECTION_IDS.features} className="lp-section-alt" style={{ scrollMarginTop: 90 }}>
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
  );
}
