import { useEffect, useState } from 'react';
import { fetchWeather, fetchWeatherAlternatives, WeatherData } from '../api/client';
import { Icons } from './Icons';

interface Props {
  destination: string;
  mood: string;
}

export function WeatherAdvisory({ destination, mood }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAlts, setShowAlts] = useState(false);

  useEffect(() => {
    fetchWeather(destination).then(setWeather);
  }, [destination]);

  if (!weather || !weather.needs_alternatives) return null;

  const handleGetAlternatives = async () => {
    setLoading(true);
    try {
      const data = await fetchWeatherAlternatives(destination, weather.condition, mood);
      setAlternatives(data.alternatives);
      setShowAlts(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass anim-fade-up" style={{ 
      margin: '0 auto 40px', 
      maxWidth: 800, 
      padding: '24px', 
      borderRadius: 24, 
      border: '1px solid rgba(249,115,22,0.2)',
      background: 'linear-gradient(135deg, rgba(255,251,235,0.8), rgba(255,255,255,0.8))',
      textAlign: 'left'
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ 
          width: 48, height: 48, borderRadius: 16, background: '#fff7ed', color: '#f97316', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
        }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 800, color: '#9a3412', marginBottom: 4 }}>
            Weather Advisory for {destination}
          </h3>
          <p style={{ color: '#c2410c', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 16 }}>
            The current weather is <strong>{weather.condition}</strong>. This might affect some of your outdoor plans.
          </p>
          
          {!showAlts ? (
            <button 
              onClick={handleGetAlternatives}
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.9rem', background: '#f97316', borderColor: '#f97316' }}
            >
              {loading ? 'Consulting AI...' : 'Suggest Indoor Alternatives'}
            </button>
          ) : (
            <div className="anim-fade-up" style={{ background: 'rgba(255,255,255,0.5)', padding: 16, borderRadius: 16 }}>
              <div style={{ fontWeight: 800, color: '#9a3412', fontSize: '0.9rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                {Icons.sparkles} Weather-Adaptive Suggestions:
              </div>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {alternatives.map((alt, i) => (
                  <li key={i} style={{ color: '#c2410c', fontSize: '0.9rem', marginBottom: 6, lineHeight: 1.4 }}>
                    {alt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
