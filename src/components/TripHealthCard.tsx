import React from 'react';

interface Props {
  score: number;
  contributingFactors: Array<{ category: string; impact: number; detail: string }>;
  improvementDelta: number;
}

export const TripHealthCard: React.FC<Props> = ({ score, contributingFactors, improvementDelta }) => {
  const getBadgeColor = (s: number) => {
    if (s >= 90) return '#10b981'; // Green
    if (s >= 75) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div
      className="glass anim-fade-up"
      style={{
        padding: '24px',
        borderRadius: '24px',
        background: 'rgba(255, 255, 255, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 10px 30px rgba(12, 27, 51, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Flagship Intelligence
          </span>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0c1b33', margin: '4px 0 0 0' }}>
            Trip Health Score
          </h3>
        </div>

        {/* Score Ring */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: `conic-gradient(${getBadgeColor(score)} ${score * 3.6}deg, #e2e8f0 0deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.1rem',
              color: getBadgeColor(score),
            }}
          >
            {score}
          </div>
        </div>
      </div>

      {/* Factors List */}
      <div style={{ display: 'grid', gap: 8 }}>
        {contributingFactors.map((factor, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '12px',
              background: 'rgba(241, 245, 249, 0.6)',
              fontSize: '0.85rem',
            }}
          >
            <span style={{ color: '#334155', fontWeight: 500 }}>{factor.detail}</span>
            <span style={{ fontWeight: 700, color: factor.impact < 0 ? '#ef4444' : '#10b981' }}>
              {factor.impact > 0 ? `+${factor.impact}` : factor.impact} pts
            </span>
          </div>
        ))}
      </div>

      {improvementDelta > 0 && (
        <div style={{ fontSize: '0.82rem', color: '#0284c7', fontWeight: 600 }}>
          💡 Optimization potential: +{improvementDelta} points score boost available!
        </div>
      )}
    </div>
  );
};
