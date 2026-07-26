import React, { useEffect, useState } from 'react';
import { fetchUserProfile, UserProfileData } from '../api/client';
import { PreferenceCard } from './PreferenceCard';
import { PrivacySettingsPanel } from './PrivacySettingsPanel';

export const LearningInsightsCard: React.FC = () => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);

  const loadProfile = () => {
    fetchUserProfile().then(setProfile);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (!profile) return null;

  return (
    <div
      className="glass anim-fade-up"
      style={{
        padding: '28px',
        borderRadius: '24px',
        marginBottom: '32px',
        background: 'rgba(255, 255, 255, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 12px 40px rgba(12, 27, 51, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
          }}
        >
          🧠
        </div>
        <div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0c1b33', margin: 0 }}>
            Personalization & Transparent Learning Engine
          </h3>
          <span style={{ fontSize: '0.82rem', color: '#5b8bad' }}>
            Adaptable preference profile grounded in real-world location geography
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        <PreferenceCard label="Food & Culinary" item={profile.food_interest} />
        <PreferenceCard label="Nature & Outdoors" item={profile.nature_interest} />
        <PreferenceCard label="Museums & History" item={profile.museum_interest} />
        <PreferenceCard label="Hotel Style" item={profile.hotel_style} />
      </div>

      <PrivacySettingsPanel onProfileReset={loadProfile} />
    </div>
  );
};
