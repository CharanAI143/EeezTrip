import { useEffect, useState } from 'react';
import { useTripStore } from '../state/tripStore';

const Icons = {
  plane: <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.875L5.999 12Zm0 0h7.5" /></svg>,
  hotel: <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" /></svg>,
  arrowRight: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" /></svg>,
  back: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
};

export default function BookingPage() {
  const { state, navigate } = useTripStore();
  const { preferences } = state;
  const [transportOptions, setTransportOptions] = useState<Array<{
    mode: string;
    provider: string;
    route: string;
    price_inr: number | null;
    currency: string;
    source: string;
    source_url: string;
    snippet: string;
    rating: number;
  }>>([]);
  const [loadingTransport, setLoadingTransport] = useState(false);
  const [hotelOptions, setHotelOptions] = useState<Array<{
    provider: string;
    destination: string;
    price_inr: number | null;
    currency: string;
    source: string;
    source_url: string;
    snippet: string;
    rating: number;
  }>>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);

  const origin = preferences.origin || 'Current Location';
  const destination = preferences.destination || 'Destination';

  useEffect(() => {
    let active = true;
    const fetchTransport = async () => {
      if (!origin || !destination) return;
      setLoadingTransport(true);
      try {
        const res = await fetch(`/api/transport-prices?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
        const data = await res.json();
        if (!active) return;
        setTransportOptions(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setTransportOptions([]);
      } finally {
        if (active) setLoadingTransport(false);
      }
    };
    fetchTransport();
    return () => {
      active = false;
    };
  }, [origin, destination]);

  useEffect(() => {
    let active = true;
    const fetchHotels = async () => {
      if (!destination) return;
      setLoadingHotels(true);
      try {
        const res = await fetch(`/api/hotel-prices?destination=${encodeURIComponent(destination)}`);
        const data = await res.json();
        if (!active) return;
        setHotelOptions(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setHotelOptions([]);
      } finally {
        if (active) setLoadingHotels(false);
      }
    };
    fetchHotels();
    return () => {
      active = false;
    };
  }, [destination]);

  const handleBookFlights = () => {
    // Navigating to general flights page on booking.com
    const url = `https://flights.booking.com/`;
    window.open(url, '_blank');
  };

  const handleBookHotels = () => {
    // Navigating to search results on booking.com
    const url = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #f0f9ff 0%, #fdf2f8 50%, #f0f9ff 100%)',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '100px 24px 80px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          
          <button 
            className="btn" 
            style={{ marginBottom: 40, padding: '8px 16px', background: 'rgba(255,255,255,0.7)', color: '#5b8bad', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            onClick={() => navigate('results')}
          >
            {Icons.back} Back to Itinerary
          </button>

          <div className="anim-fade-up" style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(2.4rem, 5vw, 3.5rem)',
              fontWeight: 900, color: '#0c1b33',
              lineHeight: 1.1, marginBottom: 16,
              letterSpacing: '-0.02em'
            }}>
              Ready to Book?
            </h1>
            <p style={{ color: '#2d5474', maxWidth: 600, margin: '0 auto', fontSize: '1.1rem', lineHeight: 1.6 }}>
              Turn your AI-curated itinerary into reality. Book your travel and accommodations securely.
            </p>
          </div>

          <div className="glass anim-fade-up delay-100" style={{
            padding: '32px', marginBottom: 40, textAlign: 'center',
            boxShadow: '0 8px 30px rgba(12, 27, 51, 0.04)', borderRadius: 24
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, minWidth: 150, textAlign: 'right' }}>
                <div style={{ color: '#5b8bad', fontSize: '0.85rem', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>Origin</div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: '#0c1b33' }}>
                  {origin}
                </div>
              </div>
              <div style={{ color: '#cbd5e1', padding: '16px', background: 'rgba(255,255,255,0.5)', borderRadius: '50%' }}>
                {Icons.arrowRight}
              </div>
              <div style={{ flex: 1, minWidth: 150, textAlign: 'left' }}>
                <div style={{ color: '#5b8bad', fontSize: '0.85rem', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>Destination</div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: '#ec4899' }}>
                  {destination}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
            {/* Flights Card */}
            <div className="glass anim-fade-up delay-200" style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 24 }}>
              <div style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(56,189,248,0.1))', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                {Icons.plane}
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: '#0c1b33', marginBottom: 12 }}>
                Flights
              </h2>
              <p style={{ color: '#2d5474', fontSize: '1rem', lineHeight: 1.6, marginBottom: 32, flex: 1 }}>
                Find the best deals on flights from {origin} to {destination}. Get your journey started.
              </p>
              <button className="btn btn-primary" style={{ width: '100%', borderRadius: 16, padding: '16px', fontSize: '1.05rem' }} onClick={handleBookFlights}>
                Search Flights on Booking.com
              </button>
            </div>

            {/* Hotels Card */}
            <div className="glass-pink anim-fade-up delay-300" style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 24 }}>
              <div style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(244,114,182,0.1))', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                {Icons.hotel}
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: '#0c1b33', marginBottom: 12 }}>
                Accommodations
              </h2>
              <p style={{ color: '#2d5474', fontSize: '1rem', lineHeight: 1.6, marginBottom: 32, flex: 1 }}>
                Discover cozy stays, luxury hotels, and perfect retreats tailored to your preferences in {destination}.
              </p>
              <button className="btn btn-pink" style={{ width: '100%', borderRadius: 16, padding: '16px', fontSize: '1.05rem' }} onClick={handleBookHotels}>
                Find Hotels on Booking.com
              </button>
            </div>
          </div>

          <div className="glass anim-fade-up delay-400" style={{ padding: '28px', marginTop: 32, borderRadius: 24 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#0c1b33', marginBottom: 10 }}>
              Compare Transport Modes
            </h2>
            <p style={{ color: '#5b8bad', marginBottom: 20 }}>
              Live web-scraped fare snippets for {origin} to {destination}.
            </p>

            {loadingTransport && (
              <p style={{ color: '#2d5474', fontWeight: 600 }}>Fetching live prices...</p>
            )}

            {!loadingTransport && transportOptions.length === 0 && (
              <p style={{ color: '#2d5474', fontWeight: 600 }}>
                Could not fetch live prices right now. Try again in a moment.
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              {transportOptions.map((option, idx) => (
                <div
                  key={`${option.mode}-${idx}`}
                  style={{
                    border: '1px solid rgba(14,165,233,0.2)',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.85)',
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#0c1b33' }}>
                        {option.mode}
                      </span>
                      {option.rating > 0 && (
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', background: '#fef3c7', padding: '2px 6px', borderRadius: 6 }}>
                          ★ {option.rating}
                        </span>
                      )}
                    </div>
                    <span style={{ fontWeight: 800, color: option.price_inr ? '#0284c7' : '#64748b' }}>
                      {option.price_inr ? `₹${option.price_inr.toLocaleString('en-IN')}` : 'N/A'}
                    </span>
                  </div>
                  <p style={{ color: '#334155', fontSize: '0.88rem', lineHeight: 1.45, minHeight: 44 }}>
                    {option.snippet || 'Open source for latest fare details.'}
                  </p>
                  <a
                    href={option.source_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-block', marginTop: 10, color: '#ec4899', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
                  >
                    View source ↗
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-pink anim-fade-up delay-500" style={{ padding: '28px', marginTop: 22, borderRadius: 24 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#0c1b33', marginBottom: 10 }}>
              Compare Hotel Prices
            </h2>
            <p style={{ color: '#5b8bad', marginBottom: 20 }}>
              Live web-scraped hotel price snippets for {destination}.
            </p>

            {loadingHotels && (
              <p style={{ color: '#2d5474', fontWeight: 600 }}>Fetching live hotel prices...</p>
            )}

            {!loadingHotels && hotelOptions.length === 0 && (
              <p style={{ color: '#2d5474', fontWeight: 600 }}>
                Could not fetch live hotel prices right now. Try again in a moment.
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              {hotelOptions.map((option, idx) => (
                <div
                  key={`${option.destination}-${idx}`}
                  style={{
                    border: '1px solid rgba(236,72,153,0.2)',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.85)',
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#0c1b33' }}>
                        {option.provider}
                      </span>
                      {option.rating > 0 && (
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', background: '#fef3c7', padding: '2px 6px', borderRadius: 6 }}>
                          ★ {option.rating}
                        </span>
                      )}
                    </div>
                    <span style={{ fontWeight: 800, color: option.price_inr ? '#db2777' : '#64748b' }}>
                      {option.price_inr ? `₹${option.price_inr.toLocaleString('en-IN')}` : 'N/A'}
                    </span>
                  </div>
                  <p style={{ color: '#334155', fontSize: '0.88rem', lineHeight: 1.45, minHeight: 44 }}>
                    {option.snippet || 'Open source for latest hotel price details.'}
                  </p>
                  <a
                    href={option.source_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-block', marginTop: 10, color: '#db2777', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
                  >
                    View source ↗
                  </a>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
