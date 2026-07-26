import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  reasons: string[];
  district?: string;
}

export const RecommendationExplanationDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  reasons,
  district,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(12, 27, 51, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 500,
          background: '#fff',
          borderRadius: 24,
          padding: 28,
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, margin: 0, fontSize: '1.25rem', color: '#0c1b33' }}>
            Why am I seeing this?
          </h3>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 16, fontSize: '0.95rem', fontWeight: 700, color: '#0ea5e9' }}>
          📍 {title} {district ? `• ${district}` : ''}
        </div>

        <ul style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 10, fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
          {reasons.map((r, idx) => (
            <li key={idx}><strong>{r}</strong></li>
          ))}
        </ul>

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              background: '#0c1b33',
              color: '#fff',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
