import { SECTION_IDS, STATS } from './landingContent';

export default function StatsSection() {
  return (
    <section id={SECTION_IDS.stats} style={{ padding: '48px 24px', position: 'relative', zIndex: 1 }}>
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
  );
}
