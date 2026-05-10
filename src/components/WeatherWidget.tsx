import { useEffect, useState } from 'react';
import { fetchWeather, WeatherData } from '../api/client';

export function WeatherWidget({ destination }: { destination: string }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchWeather(destination).then(data => {
      if (active) {
        setWeather(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [destination]);

  if (loading) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(255,255,255,0.7)', borderRadius: 999, border: '1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #cbd5e1', borderTopColor: '#0ea5e9', animation: 'spin-slow 1s linear infinite' }} />
        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Fetching weather…</span>
      </div>
    );
  }

  if (!weather) return null;

  // Determine Icon based on condition
  const getIcon = () => {
    const c = weather.condition.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return '🌧️';
    if (c.includes('snow')) return '❄️';
    if (c.includes('thunder')) return '⛈️';
    if (c.includes('cloud') || c.includes('fog')) return '☁️';
    return weather.is_day ? '☀️' : '🌙';
  };

  return (
    <div className="anim-fade-up" style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: 10, 
      padding: '6px 16px', 
      background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
      backdropFilter: 'blur(10px)',
      borderRadius: 999, 
      border: '1px solid rgba(2,132,199,0.15)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
    }}>
      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{getIcon()}</span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
          {Math.round(weather.temperature_max)}°C <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem' }}>/ {Math.round(weather.temperature_min)}°C</span>
        </span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {weather.condition}
        </span>
      </div>
    </div>
  );
}
