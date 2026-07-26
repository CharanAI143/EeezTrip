import React from 'react';

export const RecommendationSkeleton: React.FC = () => {
  return (
    <div
      className="glass anim-fade-up"
      style={{
        padding: '32px',
        borderRadius: '24px',
        marginBottom: '24px',
        background: 'rgba(255, 255, 255, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 8px 32px rgba(12, 27, 51, 0.05)',
      }}
    >
      {/* Title skeleton */}
      <div
        style={{
          height: '32px',
          width: '60%',
          background: 'linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.12) 37%, rgba(0,0,0,0.06) 63%)',
          backgroundSize: '400% 100%',
          animation: 'skeleton-shimmer 1.4s ease infinite',
          borderRadius: '12px',
          marginBottom: '16px',
        }}
      />
      {/* Tagline skeleton */}
      <div
        style={{
          height: '20px',
          width: '80%',
          background: 'linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.12) 37%, rgba(0,0,0,0.06) 63%)',
          backgroundSize: '400% 100%',
          animation: 'skeleton-shimmer 1.4s ease infinite',
          borderRadius: '8px',
          marginBottom: '24px',
        }}
      />

      {/* Daily plans skeleton cards */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: '72px',
            background: 'rgba(255, 255, 255, 0.5)',
            border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: '16px',
            marginBottom: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#e0f2fe',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: '16px',
                width: '40%',
                background: 'rgba(0,0,0,0.08)',
                borderRadius: '6px',
                marginBottom: '8px',
              }}
            />
            <div
              style={{
                height: '12px',
                width: '70%',
                background: 'rgba(0,0,0,0.05)',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
