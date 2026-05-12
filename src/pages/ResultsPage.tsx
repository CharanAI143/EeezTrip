import { useState } from 'react';
import { useTripStore } from '../state/tripStore';
import { CostBreakdown, DayPlan, PlaceImage } from '../types';
import { AiConcierge } from '../components/AiConcierge';
import { ShareExport } from '../components/ShareExport';
import { WeatherWidget } from '../components/WeatherWidget';
import { Icons } from '../components/Icons';
import { MapWidget } from '../components/MapWidget';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { WeatherAdvisory } from '../components/WeatherAdvisory';

const MOOD_ALTERNATIVES: Record<string, string[]> = {
  'Relaxed': ['Goa', 'Pondicherry', 'Andaman'],
  'Romantic': ['Udaipur', 'Munnar', 'Darjeeling'],
  'Adventure': ['Rishikesh', 'Manali', 'Meghalaya'],
  'Nature': ['Wayanad', 'Coorg', 'Ooty'],
  'Foodie': ['Amritsar', 'Jaipur', 'Lucknow'],
};
const CHEAP_DESTINATIONS = Object.values(MOOD_ALTERNATIVES).flat();

// ─── Sub-components ───────────────────────────────────────────────────────────

function ImageGallery({ images }: { images: PlaceImage[] }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (images.length === 0) return null;

  const primary = images[activeIdx];

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Hero image */}
      <div style={{
        borderRadius: 24, overflow: 'hidden',
        height: 'clamp(240px, 40vw, 420px)',
        position: 'relative', marginBottom: 10,
        boxShadow: '0 16px 48px rgba(12,27,51,0.2)',
      }}>
        <img
          src={primary.url}
          alt={primary.alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(12,27,51,0.5) 0%, transparent 50%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 16, left: 20, right: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem',
            fontWeight: 600, maxWidth: '70%',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><circle cx="12" cy="13" r="4" /></svg>
            {primary.alt} · by {primary.author}
          </span>
          <span style={{
            color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem',
            fontWeight: 600,
          }}>
            {activeIdx + 1} / {images.length}
          </span>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {images.map((img, i) => (
          <button
            key={img.image_id}
            onClick={() => setActiveIdx(i)}
            style={{
              width: 70, height: 50, borderRadius: 10, overflow: 'hidden',
              border: `2.5px solid ${i === activeIdx ? '#38bdf8' : 'transparent'}`,
              cursor: 'pointer', flexShrink: 0, padding: 0, background: 'none',
              transition: 'border-color 0.2s',
              opacity: i === activeIdx ? 1 : 0.65,
            }}
          >
            <img src={img.url} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

function DayCard({ day }: { day: DayPlan }) {
  const [open, setOpen] = useState(day.day === 1);

  return (
    <div
      className="glass"
      style={{
        marginBottom: 12, overflow: 'hidden',
        transition: 'all 0.3s',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '20px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'Outfit, sans-serif',
            fontWeight: 800, fontSize: '0.95rem', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(14,165,233,0.3)'
          }}>
            {day.day}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: '1.05rem', color: '#0c1b33',
            }}>
              {day.title}
            </div>
            {!open && (
              <div style={{ color: '#5b8bad', fontSize: '0.85rem', marginTop: 4, fontWeight: 500 }}>
                Click to expand itinerary
              </div>
            )}
          </div>
        </div>
        <span style={{ color: '#a8d4ed', transition: 'transform 0.3s cubic-bezier(0.2,0.8,0.2,1)', transform: open ? 'rotate(180deg)' : '' }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 24px 24px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ paddingTop: 20, display: 'grid', gap: 20 }}>
            {[
              { time: 'Morning', text: day.morning, color: '#f97316', icon: Icons.morning },
              { time: 'Midday', text: day.midday, color: '#f59e0b', icon: (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M3 12h2.25m.386-6.364l1.591 1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12a6.75 6.75 0 1113.5 0 6.75 6.75 0 01-13.5 0z" /></svg>
              ) },
              { time: 'Afternoon', text: day.afternoon, color: '#0ea5e9', icon: Icons.afternoon },
              { time: 'Evening', text: day.evening, color: '#8b5cf6', icon: Icons.evening },
            ].map(slot => (
              <div key={slot.time} style={{ display: 'flex', gap: 16 }}>
                <div style={{
                  width: 90, flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 700, fontSize: '0.85rem',
                  color: slot.color,
                }}>
                  {slot.icon}
                  {slot.time}
                </div>
                <div style={{ color: '#1a2f4e', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  {slot.text}
                </div>
              </div>
            ))}

            {/* Tip */}
            <div style={{
              marginTop: 8, padding: '12px 16px',
              background: 'rgba(236,72,153,0.05)',
              border: '1px solid rgba(236,72,153,0.15)',
              borderRadius: 12,
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <span style={{ color: '#ec4899', flexShrink: 0, marginTop: 2 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.82 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.496 1.508 1.333 1.508 2.316V18" /></svg>
              </span>
              <span style={{ color: '#831843', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5 }}>
                {day.tip}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CostChart({ breakdown, total }: { breakdown: CostBreakdown; total: number }) {
  const items = [
    { label: 'Accommodation', value: breakdown.accommodation, color: '#0ea5e9', icon: Icons.acc },
    { label: 'Food & Dining', value: breakdown.food, color: '#ec4899', icon: Icons.dining },
    { label: 'Transport', value: breakdown.transport, color: '#8b5cf6', icon: Icons.transport },
    { label: 'Activities', value: breakdown.activities, color: '#f97316', icon: Icons.activities },
    { label: 'Misc / Extras', value: breakdown.misc, color: '#22c55e', icon: Icons.misc },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gap: 16 }}>
        {items.map(item => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.9rem', color: '#1a2f4e',
                }}>
                  <span style={{ color: item.color }}>{item.icon}</span>
                  {item.label}
                </span>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, color: item.color, fontSize: '0.95rem' }}>
                  ₹{item.value.toLocaleString('en-IN')} <span style={{ color: '#a8d4ed', fontWeight: 500 }}>({pct}%)</span>
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: `linear-gradient(90deg, ${item.color}, ${item.color}cc)`,
                  borderRadius: 4,
                  transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 24, padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(14,165,233,0.05), rgba(236,72,153,0.05))',
        border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, color: '#0c1b33', fontSize: '1.05rem' }}>
          Total Budget
        </span>
        <span style={{
          fontFamily: 'Outfit, sans-serif', fontWeight: 900,
          fontSize: '1.4rem',
          background: 'linear-gradient(135deg, #0284c7, #ec4899)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          ₹{total.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const { state, navigate, dispatch, submitTrip } = useTripStore();
  const { recommendation: rec, images, preferences } = state;

  if (state.loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, #f0f9ff 0%, #fdf2f8 50%, #f0f9ff 100%)',
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: '50%',
          border: '4px solid rgba(236,72,153,0.3)',
          borderTopColor: '#ec4899',
          animation: 'spin-slow 0.8s linear infinite',
          marginBottom: 24,
        }} />
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', color: '#0c1b33', fontWeight: 800 }}>
          Crafting your alternative trip...
        </h2>
        <p style={{ color: '#5b8bad', marginTop: 8 }}>Please wait a few moments.</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px', textAlign: 'center',
      }}>
        <div style={{ color: '#ef4444', marginBottom: 24 }}>
          <svg width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: 800, color: '#0c1b33', marginBottom: 12 }}>
          Generation Failed
        </h2>
        <p style={{ color: '#ef4444', marginBottom: 32, fontSize: '1.1rem', maxWidth: 500, fontWeight: 600 }}>
          {state.error}
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          <button className="btn btn-primary" onClick={() => navigate('preferences')} style={{ borderRadius: 999, padding: '14px 32px' }}>
            Try Again
          </button>
          <button className="btn btn-outline" onClick={() => navigate('start')} style={{ borderRadius: 999, padding: '14px 32px' }}>
            New Search
          </button>
        </div>
      </div>
    );
  }

  if (!rec) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px', textAlign: 'center',
      }}>
        {Icons.mapEmpty}
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: 800, color: '#0c1b33', marginBottom: 12 }}>
          No itinerary crafted yet
        </h2>
        <p style={{ color: '#5b8bad', marginBottom: 32, fontSize: '1.1rem', maxWidth: 400 }}>
          Set your preferences and let our AI curate the perfect travel experience for you.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('start')} style={{ borderRadius: 999, padding: '14px 32px' }}>
          Start Planning
        </button>
      </div>
    );
  }

  // Defensive array checks
  const highlights = Array.isArray(rec.highlights) ? rec.highlights : [];
  const dailyPlan = Array.isArray(rec.daily_plan) ? rec.daily_plan : [];
  const mustTryFood = Array.isArray(rec.must_try_food) ? rec.must_try_food : [];
  const cozyTips = Array.isArray(rec.cozy_tips) ? rec.cozy_tips : [];

  // Safe access to estimated cost breakdown
  const breakdown = rec.estimated_cost_breakdown || {
    accommodation: 0,
    food: 0,
    transport: 0,
    activities: 0,
    misc: 0
  };

  const totalCost =
    breakdown.accommodation +
    breakdown.food +
    breakdown.transport +
    breakdown.activities +
    breakdown.misc;

  const userBudget = preferences?.budget || 0;
  const currentDest = preferences?.destination || rec.destination || '';
  let budgetWarning: any = null;

  // Evaluate budget based on the calculated total cost (synced with live prices)
  if (userBudget < totalCost * 0.75) {
    const affordableDays = Math.max(2, Math.floor(userBudget / (totalCost / (preferences?.days || 5))));
    
    // Pick 2 alternatives that aren't the current destination
    const alternatives = (MOOD_ALTERNATIVES[preferences?.mood || 'Relaxed'] || ['Goa', 'Jaipur'])
      .filter(d => d.toLowerCase() !== currentDest.toLowerCase())
      .slice(0, 2);
    
    budgetWarning = {
      type: 'severe',
      message: `🚨 Not possible: Your budget (₹${userBudget.toLocaleString('en-IN')}) falls significantly short of the estimated ₹${totalCost.toLocaleString('en-IN')} required for ${preferences?.days || 5} days in ${currentDest}.`,
      alternatives: alternatives.map(dest => ({
        text: `Switch to ${dest} (${affordableDays} days)`,
        onClick: () => {
          dispatch({ type: 'SET_PREF', field: 'destination', value: dest });
          dispatch({ type: 'SET_PREF', field: 'days', value: affordableDays });
          submitTrip({ destination: dest, days: affordableDays });
        }
      }))
    };
  } else if (userBudget < totalCost) {
    budgetWarning = {
      type: 'moderate',
      message: `⚠️ Possible but tight: Your budget (₹${userBudget.toLocaleString('en-IN')}) is slightly below the estimated ₹${totalCost.toLocaleString('en-IN')}. Tips: Book hostels early, use public transport, and enjoy street food!`
    };
  } else {
    budgetWarning = {
      type: 'success',
      message: `✅ Possible: Your budget (₹${userBudget.toLocaleString('en-IN')}) comfortably covers the estimated ₹${totalCost.toLocaleString('en-IN')} trip cost!`
    };
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Hero gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #f0f9ff 0%, #fdf2f8 50%, #f0f9ff 100%)',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '100px 24px 80px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

          {/* ── Budget Warning ─────────────────────────────────────────── */}
          {budgetWarning && (
            <div className="anim-fade-up" style={{
              background: budgetWarning.type === 'severe' ? 'rgba(239, 68, 68, 0.1)' : 
                          budgetWarning.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${budgetWarning.type === 'severe' ? 'rgba(239, 68, 68, 0.3)' : 
                                   budgetWarning.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              padding: '20px 24px', borderRadius: 16, marginBottom: 32,
              color: budgetWarning.type === 'severe' ? '#991b1b' : 
                     budgetWarning.type === 'success' ? '#065f46' : '#b45309',
              fontWeight: 600, fontSize: '1.05rem', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
            }}>
              <div>{budgetWarning.message}</div>
              {budgetWarning.alternatives && budgetWarning.alternatives.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#991b1b' }}>Here are better alternatives that fit your budget:</span>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {budgetWarning.alternatives.map((alt: any, i: number) => (
                      <button 
                        key={i}
                        onClick={alt.onClick}
                        className="btn btn-primary" 
                        style={{ padding: '8px 20px', fontSize: '0.95rem', borderRadius: 8, background: '#0ea5e9', color: '#fff', border: 'none' }}
                      >
                        {alt.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="anim-fade-up" style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
              <span className="badge badge-ice" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {Icons.checkReady} Trip Ready
              </span>
              <span className="badge badge-pink" style={{ padding: '6px 14px' }}>
                {preferences?.mood || 'Relaxed'} · {preferences?.days || 4} days
              </span>
              <ErrorBoundary fallback={<div style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.7)', borderRadius: 999, fontSize: '0.85rem' }}>Weather unavailable</div>}>
                <WeatherWidget destination={rec.destination || (preferences && preferences.destination) || ''} />
              </ErrorBoundary>
            </div>

            {/* Share & Export Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <ShareExport rec={rec} preferences={preferences} />
            </div>

            <WeatherAdvisory destination={rec.destination || (preferences && preferences.destination) || ''} mood={preferences?.mood || 'Relaxed'} />

            <h1 style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(2.4rem, 5vw, 4rem)',
              fontWeight: 900, color: '#0c1b33',
              lineHeight: 1.1, marginBottom: 16,
              letterSpacing: '-0.02em'
            }}>
              {rec.title}
            </h1>

            <p style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0284c7, #ec4899)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 24,
            }}>
              "{rec.tagline}"
            </p>

            <p style={{ color: '#2d5474', maxWidth: 720, margin: '0 auto', lineHeight: 1.7, fontSize: '1.05rem' }}>
              {rec.summary}
            </p>
          </div>

          {/* ── Highlights ribbon ───────────────────────────────────── */}
          <div className="glass anim-fade-up delay-100" style={{
            display: 'flex', gap: 0, flexWrap: 'wrap',
            marginBottom: 40, overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(12, 27, 51, 0.04)'
          }}>
            {highlights.map((h, i) => (
              <div key={i} style={{
                flex: '1 1 200px', padding: '24px', textAlign: 'center',
                borderRight: i < highlights.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <div style={{ color: '#38bdf8', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                  {i === 0 ? <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg> : 
                   i === 1 ? <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> :
                   <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>}
                </div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#1a2f4e', lineHeight: 1.5 }}>
                  {h}
                </div>
              </div>
            ))}
          </div>

          {/* ── Image Gallery ────────────────────────────────────────── */}
          {images.length > 0 && (
            <div className="anim-fade-up delay-200" style={{ marginBottom: 40 }}>
              <h2 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.4rem',
                color: '#0c1b33', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ color: '#0ea5e9' }}>{Icons.camera}</span>
                <span className="text-gradient-ice">{preferences?.destination || rec.destination}</span> in Photos
              </h2>
              <ImageGallery images={images} />
            </div>
          )}

          {/* ── Two-column: Daily Plan + Sidebar ─────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(350px, 1fr)',
            gap: 24,
            alignItems: 'start',
          }}>
            {/* Daily Plan */}
            <div className="anim-fade-up delay-300">
              <h2 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.4rem',
                color: '#0c1b33', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ color: '#8b5cf6' }}>{Icons.map}</span>
                Day-by-Day Itinerary
              </h2>
              {dailyPlan.map(day => (
                <DayCard key={day.day} day={day} />
              ))}
            </div>

            {/* Sidebar (Map, Best time, Food, Tips, Cost) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Interactive Map */}
              <ErrorBoundary fallback={<div style={{ height: 350, background: '#f8fafc', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Interactive map unavailable</div>}>
                <div className="anim-fade-up delay-400" style={{ height: 350, zIndex: 10 }}>
                  <MapWidget destination={rec.destination || (preferences && preferences.destination) || ''} />
                </div>
              </ErrorBoundary>

              {/* Best time */}
              <div className="glass anim-fade-up delay-300" style={{ padding: '24px', boxShadow: '0 8px 30px rgba(12, 27, 51, 0.04)' }}>
                <h3 style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                  fontSize: '1.1rem', color: '#0c1b33', marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ color: '#0ea5e9' }}>{Icons.calendar}</span> Best Time to Visit
                </h3>
                <p style={{ color: '#2d5474', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  {rec.best_time}
                </p>
              </div>

              {/* Must-try food */}
              <div className="glass-pink anim-fade-up delay-400" style={{ padding: '24px' }}>
                <h3 style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                  fontSize: '1.1rem', color: '#0c1b33', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ color: '#ec4899' }}>{Icons.food}</span> Must-Try Culinary
                </h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  {mustTryFood.map((food, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.7)',
                      borderRadius: 12, fontSize: '0.9rem',
                    }}>
                      <span style={{ color: '#db2777', marginTop: 2 }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                      </span>
                      <span style={{ color: '#1a2f4e', fontWeight: 500 }}>{food}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cozy tips */}
              <div className="glass anim-fade-up delay-500" style={{ padding: '24px', boxShadow: '0 8px 30px rgba(12, 27, 51, 0.04)' }}>
                <h3 style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                  fontSize: '1.1rem', color: '#0c1b33', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ color: '#f97316' }}>{Icons.lightbulb}</span> Insider Tips
                </h3>
                <div style={{ display: 'grid', gap: 14 }}>
                  {cozyTips.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'rgba(56,189,248,0.1)',
                        border: '1.5px solid rgba(56,189,248,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 800, color: '#0284c7',
                        flexShrink: 0, marginTop: 1,
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ color: '#2d5474', fontSize: '0.9rem', lineHeight: 1.6 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="glass anim-fade-up delay-600" style={{ padding: '24px', boxShadow: '0 8px 30px rgba(12, 27, 51, 0.04)' }}>
                <h3 style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                  fontSize: '1.1rem', color: '#0c1b33', marginBottom: 20,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ color: '#22c55e' }}>{Icons.wallet}</span> Budget Breakdown
                </h3>
                <CostChart breakdown={breakdown} total={totalCost} />
              </div>
            </div>
          </div>

          {/* ── Action buttons ──────────────────────────────────────── */}
          <div className="anim-fade-up delay-700" style={{
            marginTop: 48, display: 'flex', gap: 16,
            justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('preferences')}
              style={{ borderRadius: 999 }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
              Tweak Preferences
            </button>
            <button
              className="btn btn-outline btn-lg"
              onClick={() => navigate('start')}
              style={{ borderRadius: 999 }}
            >
              Plan Another Trip
            </button>
            <button
              className="btn btn-pink"
              onClick={() => navigate('booking')}
              style={{ borderRadius: 999, padding: '16px 32px' }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
              Book Trip
            </button>
            <button
              className="btn btn-outline"
              onClick={() => window.print()}
              style={{ borderRadius: 999, padding: '16px 32px', borderColor: '#e2e8f0', color: '#64748b' }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.724.092m6.524-4.659A15.455 15.455 0 0113.5 15.3m0 0l-3-3m3 3l3-3m-8.25-3c.24-.03.48-.062.724-.092m6.524 4.659A15.455 15.455 0 0010.5 15.3m0 0l3-3m-3 3l-3-3m12.25 1.5c0 2.485-2.015 4.5-4.5 4.5H6.75C4.265 19.5 2.25 17.485 2.25 15c0-2.485 2.015-4.5 4.5-4.5h10.5c2.485 0 4.5 2.015 4.5 4.5z" /></svg>
              Save Itinerary
            </button>
          </div>
        </div>
      </div>
      <AiConcierge />
    </div>
  );
}
