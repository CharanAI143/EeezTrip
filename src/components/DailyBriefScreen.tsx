import React, { useEffect, useState } from 'react';
import { fetchDailyBrief, DailyBriefData } from '../api/client';
import { TripHealthCard } from './TripHealthCard';
import { useTripStore } from '../state/tripStore';

interface Props {
  destination: string;
}

export const DailyBriefScreen: React.FC<Props> = ({ destination }) => {
  const { state, reviseTrip } = useTripStore();
  const [brief, setBrief] = useState<DailyBriefData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (destination) {
      setLoading(true);
      fetchDailyBrief(destination, state.sessionId || undefined).then((res) => {
        if (isMounted) {
          setBrief(res);
          setLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [destination, state.sessionId]);

  if (dismissed) return null;

  if (loading) {
    return (
      <div
        className="glass anim-fade-up"
        style={{
          padding: '24px',
          borderRadius: '24px',
          marginBottom: '28px',
          background: 'rgba(255, 255, 255, 0.75)',
        }}
      >
        <div style={{ color: '#0ea5e9', fontWeight: 600, fontSize: '0.9rem' }}>
          Generating your Smart Daily Briefing & Health Assessment...
        </div>
      </div>
    );
  }

  if (!brief) return null;

  const handleOptimizeMyDay = () => {
    const reason = brief.recommendations.length > 0
      ? brief.recommendations[0].description
      : "Swap outdoor activities with indoor venues due to weather forecast.";
    reviseTrip(reason);
  };

  return (
    <div
      className="glass anim-fade-up"
      style={{
        padding: '28px',
        borderRadius: '24px',
        marginBottom: '32px',
        background: 'rgba(255, 255, 255, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 12px 40px rgba(14, 165, 233, 0.08)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🌤 Morning Briefing
          </span>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.6rem', color: '#0c1b33', margin: '4px 0 0 0' }}>
            Good Morning, Traveler!
          </h2>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Summary Banner */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.9), rgba(224, 242, 254, 0.9))',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          color: '#0369a1',
          fontSize: '0.95rem',
          lineHeight: 1.5,
          fontWeight: 500,
          marginBottom: 20,
        }}
      >
        {brief.summary}
      </div>

      {/* Embedded Trip Health Card */}
      <TripHealthCard
        score={brief.trip_health_score.score}
        contributingFactors={brief.trip_health_score.contributing_factors}
        improvementDelta={brief.trip_health_score.improvement_delta}
      />

      {/* Actionable Recommendations */}
      {brief.recommendations.length > 0 && (
        <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0c1b33' }}>
            Key Daily Advisories
          </span>
          {brief.recommendations.map((rec, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 16px',
                borderRadius: '14px',
                background: rec.severity === 'CRITICAL' ? 'rgba(254, 242, 242, 0.8)' : 'rgba(254, 243, 199, 0.8)',
                border: `1px solid ${rec.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: rec.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                  color: '#fff',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {rec.severity}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0c1b33' }}>{rec.title}</div>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 2 }}>{rec.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          onClick={() => setDismissed(true)}
          style={{
            flex: 1,
            padding: '12px 20px',
            borderRadius: '14px',
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#475569',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Keep Current Plan
        </button>

        <button
          onClick={handleOptimizeMyDay}
          disabled={state.revising}
          style={{
            flex: 1.2,
            padding: '12px 20px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.9rem',
            boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)',
          }}
        >
          {state.revising ? 'Optimizing Day...' : '⚡ Optimize My Day'}
        </button>
      </div>
    </div>
  );
};
