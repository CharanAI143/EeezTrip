import { useState } from 'react';
import { useTripStore } from '../state/tripStore';
import { getMoodRecommendations, type MoodChoice } from '../lib/gemini';
import { RecommendationSkeleton } from '../components/RecommendationSkeleton';

/**
 * Mood ids are lowercase and shared with MOOD_FALLBACK in lib/gemini, which
 * keys its offline suggestions off them.
 */
const MOODS: { id: string; label: string; blurb: string; color: string }[] = [
  { id: 'relaxed', label: 'Chill', blurb: 'Slow, quiet, zero rush', color: '#38bdf8' },
  { id: 'romantic', label: 'Romantic', blurb: 'Intimate and beautiful', color: '#ec4899' },
  { id: 'adventurous', label: 'Adventurous', blurb: 'Action, heights, and speed', color: '#0ea5e9' },
  { id: 'nature', label: 'Nature', blurb: 'Green spaces and fresh air', color: '#22c55e' },
  { id: 'foodie', label: 'Foodie', blurb: 'Local flavours and market hopping', color: '#f97316' },
];

/** TripPreferences has no currency field yet; the backend defaults to INR. */
const CURRENCY = 'INR';

export default function MoodDestinationPage() {
  const { state, dispatch, navigate } = useTripStore();
  const prefs = state.preferences;

  const [mood, setMood] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MoodChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseMood = async (moodId: string) => {
    setMood(moodId);
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      setSuggestions(await getMoodRecommendations(moodId, prefs.budget, CURRENCY));
    } catch {
      setError('Could not load suggestions. Try another mood.');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const chooseDestination = (name: string) => {
    dispatch({ type: 'SET_DESTINATION', destination: name });
    if (mood) dispatch({ type: 'SET_PREF', field: 'mood', value: mood });
    navigate('preferences');
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, #f0f9ff 0%, #fdf2f8 40%, #e0f2fe 100%)',
        zIndex: 0,
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1080, margin: '0 auto',
        padding: '120px 24px 60px',
      }}>
        <button
          onClick={() => navigate('mood-start')}
          style={{
            position: 'absolute', top: 90, left: 32,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            color: '#3f7295', fontWeight: 600, fontSize: '0.95rem',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        <div className="anim-fade-up" style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="badge badge-pink" style={{ marginBottom: 16 }}>Step 2 of 3</div>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 900, color: '#0c1b33', marginBottom: 12,
            letterSpacing: '-0.02em',
          }}>
            How do you want to <span className="text-gradient-duo">feel?</span>
          </h1>
          <p style={{ color: '#3f7295', fontSize: '1.1rem', maxWidth: 620, margin: '0 auto' }}>
            Pick a mood and we'll suggest where to go. You choose the destination, then set your budget and duration.
          </p>
        </div>

        {/* ── Mood picker ──────────────────────────────────────────── */}
        <div className="glass anim-fade-up delay-100" style={{
          padding: '32px', marginBottom: 24,
          boxShadow: '0 8px 30px rgba(12, 27, 51, 0.04)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
          }}>
            {MOODS.map(m => {
              const active = mood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseMood(m.id)}
                  style={{
                    padding: '20px 18px', textAlign: 'left', cursor: 'pointer',
                    borderRadius: 18,
                    border: active ? `2px solid ${m.color}` : '1px solid rgba(12,27,51,0.08)',
                    background: active ? `${m.color}14` : '#fff',
                    transform: active ? 'translateY(-4px)' : 'none',
                    boxShadow: active ? `0 12px 28px ${m.color}33` : '0 4px 14px rgba(12,27,51,0.04)',
                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: active ? m.color : '#0c1b33' }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#3f7295', marginTop: 4 }}>{m.blurb}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Suggestions ──────────────────────────────────────────── */}
        {loading && (
          <div style={{ marginTop: 32 }}>
            <RecommendationSkeleton />
          </div>
        )}

        {error && !loading && (
          <div role="alert" style={{
            marginTop: 32, padding: '20px 24px', textAlign: 'center',
            background: 'rgba(254,226,226,0.95)', border: '1.5px solid #f87171',
            borderRadius: 20, color: '#991b1b', fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {!mood && !loading && (
          <p style={{ textAlign: 'center', color: '#a8d4ed', marginTop: 48, fontSize: '0.95rem' }}>
            Choose a mood above to see destination suggestions.
          </p>
        )}

        {suggestions.length > 0 && !loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24, marginTop: 32,
          }}>
            {suggestions.map(s => (
              <button
                key={s.name}
                type="button"
                onClick={() => chooseDestination(s.name)}
                className="img-card"
                style={{
                  height: 300, cursor: 'pointer', border: 'none', padding: 0, textAlign: 'left',
                }}
              >
                <img src={cardImage(s)} alt={s.name} loading="lazy" />
                <div className="img-card-overlay" />
                <div className="img-card-content" style={{ padding: 20 }}>
                  <div style={{
                    fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: '#7dd3fc', marginBottom: 6,
                  }}>
                    {s.highlight}
                  </div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.15 }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#e2f1fb', marginTop: 8, lineHeight: 1.5 }}>
                    {s.whyMatch}
                  </div>
                  <div style={{
                    display: 'inline-block', marginTop: 12,
                    padding: '4px 12px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                    fontSize: '0.75rem', fontWeight: 700,
                  }}>
                    ~{s.estimatedCost.toLocaleString('en-IN')} {CURRENCY}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Prefer a real photo; fall back to a themed placeholder when the query misses. */
function cardImage(choice: MoodChoice): string {
  const slugs: Record<string, string> = {
    Rishikesh: 'photo-1544735716-392fe2489ffa',
    Manali: 'photo-1626718967095-d0d1e0ee0ac4',
    Ladakh: 'photo-1590675810380-a4d3d4b02a3d',
    Goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2',
    Udaipur: 'https://images.unsplash.com/photo-1599661046289-e31897846e41',
    Coorg: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd',
    Kerala: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944',
    Andaman: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa',
    Munnar: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da',
    Amritsar: 'https://images.unsplash.com/photo-1599661046827-dacde6976549',
    Jaipur: 'https://images.unsplash.com/photo-1477587458883-47145ed94245',
  };
  const known = slugs[choice.name];
  if (known) return known.startsWith('http') ? `${known}?q=80&w=800&auto=format&fit=crop` : `https://images.unsplash.com/${known}?q=80&w=800&auto=format&fit=crop`;
  return `https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=800&auto=format&fit=crop`;
}
