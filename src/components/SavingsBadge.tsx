import React from 'react';

interface Props {
  amount: number;
}

export const SavingsBadge: React.FC<Props> = ({ amount }) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 12px',
        borderRadius: 999,
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: '#fff',
        fontWeight: 800,
        fontSize: '0.8rem',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
      }}
    >
      💰 Save ₹{intFormat(amount)} INR
    </span>
  );
};

function intFormat(val: number): string {
  return Math.round(val).toLocaleString();
}
