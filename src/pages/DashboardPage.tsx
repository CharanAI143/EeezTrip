import { useEffect, useState } from 'react';
import { useTripStore } from '../state/tripStore';
import { auth } from '../lib/firebase';
import { fetchTripsFromDB } from '../api/client';
import { Icons } from '../components/Icons';
import { TripRecord } from '../types';

export default function DashboardPage() {
  const { state, navigate, setRecommendation } = useTripStore();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');

  useEffect(() => {
    let active = true;
    const loadTrips = async () => {
      if (!auth.currentUser) {
        if (active) setLoading(false);
        return;
      }
      
      try {
        // Fetch all trips (including mock data) to populate the dashboard
        const fetched = await fetchTripsFromDB('all');
        if (active) {
          setTrips(fetched);
        }
      } catch (e) {
        console.error("Error fetching saved trips", e);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadTrips();
    return () => { active = false; };
  }, [state.user]);

  if (!state.user) {
    return (
      <div style={{ padding: '120px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', color: '#0c1b33', marginBottom: 16 }}>My Plans</h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Please sign in to view your saved trips.</p>
      </div>
    );
  }

  // Separate trips into current and past based on created_at date (mocking trip dates if check-in isn't available)
  const now = new Date();
  
  const categorizedTrips = trips.map(t => {
    const tripDate = new Date(t.created_at || now);
    // Let's assume a trip is "past" if it was created more than 30 days ago, or if we had a specific end date.
    // Since mock data was inserted recently, let's just make one of the mock dates artificially older if needed, 
    // or just use 24 hours ago as a threshold for demonstration.
    const isPast = tripDate.getTime() < now.getTime() - 24 * 60 * 60 * 1000; 
    return { ...t, isPast };
  });

  const currentTrips = categorizedTrips.filter(t => !t.isPast);
  const pastTrips = categorizedTrips.filter(t => t.isPast);

  const displayedTrips = activeTab === 'current' ? currentTrips : pastTrips;

  return (
    <div style={{ padding: '120px 24px 80px', maxWidth: 1000, margin: '0 auto', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 900, color: '#0c1b33', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            My Plans
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0 }}>
            Welcome back, {state.user.displayName?.split(' ')[0] || 'Traveler'}! Here are your itineraries.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
        <button 
          onClick={() => setActiveTab('current')}
          style={{ 
            background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
            color: activeTab === 'current' ? '#0ea5e9' : '#64748b',
            position: 'relative'
          }}
        >
          Current Trips ({currentTrips.length})
          {activeTab === 'current' && <div style={{ position: 'absolute', bottom: -18, left: 0, right: 0, height: 3, background: '#0ea5e9', borderRadius: 2 }} />}
        </button>
        <button 
          onClick={() => setActiveTab('past')}
          style={{ 
            background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
            color: activeTab === 'past' ? '#0ea5e9' : '#64748b',
            position: 'relative'
          }}
        >
          Past Trips ({pastTrips.length})
          {activeTab === 'past' && <div style={{ position: 'absolute', bottom: -18, left: 0, right: 0, height: 3, background: '#0ea5e9', borderRadius: 2 }} />}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', animation: 'spin-slow 0.8s linear infinite' }} />
        </div>
      ) : displayedTrips.length === 0 ? (
        <div className="glass" style={{ padding: '60px 24px', textAlign: 'center', borderRadius: 24 }}>
          {Icons.mapEmpty}
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', color: '#0c1b33', marginBottom: 12 }}>
            No {activeTab} trips found
          </h2>
          <p style={{ color: '#64748b', marginBottom: 24 }}>When you generate an itinerary, click the "Save Trip" button to keep it here permanently.</p>
          <button 
            onClick={() => navigate('choice')}
            className="btn btn-primary"
          >
            Plan a New Trip
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {displayedTrips.map(trip => (
            <div 
              key={trip.id}
              onClick={() => {
                if (trip.trip) {
                  setRecommendation(trip.trip);
                  navigate('results');
                }
              }}
              className="anim-fade-up"
              style={{
                background: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(12px)',
                borderRadius: 20,
                padding: 24,
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.04)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <span style={{ background: '#f0f9ff', color: '#0284c7', padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
                  {trip.preferences?.days || trip.trip?.daily_plan?.length || '?'} Days
                </span>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  {trip.created_at ? new Date(trip.created_at).toLocaleDateString() : ''}
                </span>
              </div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, color: '#0c1b33', margin: '0 0 8px', lineHeight: 1.2 }}>
                {trip.trip?.title || trip.label}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {trip.trip?.tagline || 'View itinerary details...'}
              </p>
              
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
                  {Icons.map} {trip.destination || trip.trip?.destination}
                </div>
                <div style={{ color: '#0284c7', fontSize: '0.85rem', fontWeight: 700 }}>
                  View →
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
