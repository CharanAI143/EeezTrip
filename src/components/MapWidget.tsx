import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Icons } from './Icons';

// Fix for default Leaflet marker icon not loading in Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// A custom map component that dynamically updates its center when coordinates change
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function MapWidget({ destination }: { destination: string }) {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    if (!destination?.trim()) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setCoords(null);

    const fetchCoords = async () => {
      try {
        // Nominatim returns an importance score (0–1) so we always
        // get the most globally significant place, not just alphabetically first.
        const nominatimUrl =
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=5&addressdetails=1`;

        const res = await fetch(nominatimUrl, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'EeezTrip/1.0' },
        });
        const results = await res.json();

        if (active && Array.isArray(results) && results.length > 0) {
          // Sort by importance descending, pick the best match
          const best = results.sort(
            (a: any, b: any) => parseFloat(b.importance) - parseFloat(a.importance)
          )[0];
          const lat = parseFloat(best.lat);
          const lon = parseFloat(best.lon);
          // Use a wider zoom for large regions/countries, tighter for cities
          const zoom = best.type === 'administrative' || best.type === 'island' ? 10 : 12;
          if (active && !isNaN(lat) && !isNaN(lon)) {
            setCoords([lat, lon]);
          }
          if (active) setZoom(zoom);
        }
      } catch (e) {
        console.error('Failed to geocode destination', e);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCoords();
    return () => { active = false; };
  }, [destination]);

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 24, border: '1px solid #e2e8f0' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #cbd5e1', borderTopColor: '#0ea5e9', animation: 'spin-slow 1s linear infinite' }} />
      </div>
    );
  }

  if (!coords) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 24, border: '1px solid #e2e8f0', color: '#64748b' }}>
        {Icons.mapEmpty}
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Map data unavailable</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(2,132,199,0.1)' }}>
      <MapContainer 
        center={coords} 
        zoom={zoom} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeView center={coords} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <Marker position={coords} />
      </MapContainer>
    </div>
  );
}
