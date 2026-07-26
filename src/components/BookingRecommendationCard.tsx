import React from 'react';
import { BookingRecommendationItem } from '../api/client';
import { SavingsBadge } from './SavingsBadge';

interface Props {
  recommendation: BookingRecommendationItem;
}

export const BookingRecommendationCard: React.FC<Props> = ({ recommendation }) => {
  const { offer, savings_amount, description } = recommendation;

  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '18px',
        background: 'rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 4px 16px rgba(12, 27, 51, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 999,
              background: '#0ea5e9',
              color: '#fff',
              textTransform: 'uppercase',
            }}
          >
            {recommendation.category}
          </span>
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
            {offer.provider}
          </span>
        </div>
        {savings_amount > 0 && <SavingsBadge amount={savings_amount} />}
      </div>

      <div>
        <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#0c1b33', margin: '0 0 4px 0' }}>
          {offer.title}
        </h4>
        <p style={{ fontSize: '0.86rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>
          {description}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ display: 'flex', gap: 12, fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>
          <span>★ {offer.rating}</span>
          <span>• {offer.distance_from_itinerary_km} km away</span>
          <span>• {offer.cancellation_policy}</span>
        </div>

        <a
          href={offer.booking_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            background: '#0c1b33',
            color: '#fff',
            fontSize: '0.82rem',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
        >
          View Option ➔
        </a>
      </div>
    </div>
  );
};
