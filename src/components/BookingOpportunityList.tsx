import React, { useEffect, useState } from 'react';
import { fetchBookingOpportunities, BookingRecommendationItem } from '../api/client';
import { BookingRecommendationCard } from './BookingRecommendationCard';

interface Props {
  destination: string;
}

export const BookingOpportunityList: React.FC<Props> = ({ destination }) => {
  const [opportunities, setOpportunities] = useState<BookingRecommendationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    if (destination) {
      setLoading(true);
      fetchBookingOpportunities(destination).then((res) => {
        if (isMounted) {
          setOpportunities(res);
          setLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [destination]);

  if (loading) return null;
  if (!opportunities || opportunities.length === 0) return null;

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
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
          }}
        >
          💰
        </div>
        <div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0c1b33', margin: 0 }}>
            Booking Intelligence & Decision Support
          </h3>
          <span style={{ fontSize: '0.82rem', color: '#5b8bad' }}>
            High-value savings, trade-offs, and hotel/transit opportunities for {destination}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {opportunities.map((item, idx) => (
          <BookingRecommendationCard key={idx} recommendation={item} />
        ))}
      </div>
    </div>
  );
};
