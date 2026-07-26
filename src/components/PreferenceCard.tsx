import React from 'react';
import { PreferenceConfidenceIndicator } from './PreferenceConfidenceIndicator';

interface Props {
  label: string;
  item: { value: any; confidence: number; source: string; updated_at?: string };
}

export const PreferenceCard: React.FC<Props> = ({ label, item }) => {
  const displayVal = typeof item.value === 'number'
    ? `${Math.round(item.value * 100)}% Interest`
    : String(item.value).replace('_', ' ');

  return (
    <div
      style={{
        padding: '14px 18px',
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.75)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0c1b33', marginTop: 2, textTransform: 'capitalize' }}>
          {displayVal}
        </div>
      </div>
      <PreferenceConfidenceIndicator confidence={item.confidence} source={item.source} />
    </div>
  );
};
