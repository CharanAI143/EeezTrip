import React, { useEffect, useState } from 'react';
import { fetchTravelIntelligence, TravelIntelligenceData } from '../api/client';

interface Props {
  destination: string;
}

export const TravelInsightsCard: React.FC<Props> = ({ destination }) => {
  const [data, setData] = useState<TravelIntelligenceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    if (destination) {
      setLoading(true);
      fetchTravelIntelligence(destination).then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [destination]);

  if (loading) {
    return (
      <div
        className="glass anim-fade-up"
        style={{
          padding: '20px 24px',
          borderRadius: '20px',
          marginBottom: '24px',
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(255,255,255,0.4)',
        }}
      >
        <div style={{ fontSize: '0.9rem', color: '#0ea5e9', fontWeight: 600 }}>
          Fetching real-time travel intelligence insights...
        </div>
      </div>
    );
  }

  if (!data || !data.insights || data.insights.length === 0) {
    return null;
  }

  return (
    <div
      className="glass anim-fade-up"
      style={{
        padding: '24px',
        borderRadius: '24px',
        marginBottom: '28px',
        boxShadow: '0 8px 30px rgba(12, 27, 51, 0.04)',
        border: '1px solid rgba(255,255,255,0.6)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.493 1.508 1.333 1.508 2.316V18" />
          </svg>
        </div>
        <div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#0c1b33', margin: 0 }}>
            Travel Intelligence & Insights
          </h3>
          <span style={{ fontSize: '0.82rem', color: '#5b8bad' }}>
            Real-time environmental, transit, and venue advisories for {destination}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {data.insights.map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: '14px 18px',
              borderRadius: '16px',
              background: item.severity === 'warning' ? 'rgba(254,243,199,0.7)' : 'rgba(240,249,255,0.7)',
              border: `1px solid ${item.severity === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(14,165,233,0.2)'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                background: item.severity === 'warning' ? '#f59e0b' : '#0ea5e9',
                color: '#fff',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {item.badge}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0c1b33', marginBottom: 2 }}>
                {item.title}
              </div>
              <div style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.5 }}>
                {item.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
