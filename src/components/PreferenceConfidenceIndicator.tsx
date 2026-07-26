import React from 'react';

interface Props {
  confidence: number;
  source: string;
}

export const PreferenceConfidenceIndicator: React.FC<Props> = ({ confidence, source }) => {
  const pct = Math.round(confidence * 100);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 999,
        background: source === 'EXPLICIT' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(14, 165, 233, 0.15)',
        color: source === 'EXPLICIT' ? '#059669' : '#0284c7',
        fontSize: '0.72rem',
        fontWeight: 700,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: source === 'EXPLICIT' ? '#10b981' : '#0ea5e9',
        }}
      />
      {pct}% Confidence · {source === 'EXPLICIT' ? 'User Defined' : 'Learned Behavior'}
    </div>
  );
};
