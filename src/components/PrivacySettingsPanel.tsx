import React, { useState } from 'react';
import { resetUserProfile } from '../api/client';

interface Props {
  onProfileReset?: () => void;
}

export const PrivacySettingsPanel: React.FC<Props> = ({ onProfileReset }) => {
  const [learningEnabled, setLearningEnabled] = useState<boolean>(true);
  const [resetDone, setResetDone] = useState<boolean>(false);

  const handleReset = async () => {
    await resetUserProfile();
    setResetDone(true);
    if (onProfileReset) onProfileReset();
  };

  return (
    <div
      style={{
        padding: '24px',
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div>
        <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#0c1b33', margin: '0 0 4px 0' }}>
          🔒 Personalization Privacy Controls
        </h4>
        <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
          EeezTrip is 100% transparent and privacy-first. You control what the system learns.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Behavioral Learning Engine</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Allow system to learn from accepted/rejected itineraries</div>
        </div>
        <button
          onClick={() => setLearningEnabled(!learningEnabled)}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: 'none',
            background: learningEnabled ? '#10b981' : '#cbd5e1',
            color: '#fff',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {learningEnabled ? 'Active' : 'Paused'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        <button
          onClick={handleReset}
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          {resetDone ? '✓ Profile Reset' : 'Reset Learned Profile'}
        </button>
      </div>
    </div>
  );
};
