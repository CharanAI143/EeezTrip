import React from 'react';

interface Props {
  fetchedAt?: string;
  isCached?: boolean;
}

export const FreshnessBadge: React.FC<Props> = ({ isCached = true }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 999,
        background: 'rgba(240, 249, 255, 0.75)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#0284c7',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#10b981',
          boxShadow: '0 0 8px #10b981',
        }}
      />
      Live Data Platform · {isCached ? 'Cached & Fresh' : 'Real-time Synchronized'}
    </div>
  );
};
