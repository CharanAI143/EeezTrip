import { SECTION_IDS, STEPS } from './landingContent';

export default function HowItWorksSection() {
  return (
    <section id={SECTION_IDS.howItWorks} className="lp-section-alt" style={{ scrollMarginTop: 90 }}>
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
  );
}
