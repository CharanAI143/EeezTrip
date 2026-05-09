import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MapPin, Globe, Compass, ChevronRight, Loader2, Camera, CloudSun, Leaf, Snowflake, Sun } from 'lucide-react';
import { getSeasonalRecommendations } from '../lib/gemini';

import { SmartImage } from './SmartImage';

interface Destination {
  name: string;
  description: string;
  highlight: string;
  type: 'nature' | 'city' | 'beach' | 'culture';
}

interface SeasonalData {
  nearby: Destination[];
  national: Destination[];
  global: Destination[];
}

interface SeasonalTripsProps {
  userLocation?: string;
  onSelectDestination?: (name: string) => void;
}

export function SeasonalTrips({ userLocation = "New York", onSelectDestination }: SeasonalTripsProps) {
  const [data, setData] = useState<SeasonalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'nearby' | 'national' | 'global'>('nearby');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const recommendations = await getSeasonalRecommendations(userLocation);
        setData(recommendations);
      } catch (error) {
        console.error("Failed to load seasonal trips:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userLocation]);

  const tabs = [
    { id: 'nearby', label: 'Nearby & State', icon: MapPin },
    { id: 'national', label: 'Across Country', icon: Compass },
    { id: 'global', label: 'Around the World', icon: Globe },
  ] as const;

  const monthName = new Date().toLocaleString('default', { month: 'long' });

  const getBackgroundIcon = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return <Leaf className="w-64 h-64 text-brand-coral/5 absolute -right-20 -top-20 rotate-12" />;
    if (month >= 5 && month <= 7) return <Sun className="w-64 h-64 text-brand-amber/5 absolute -right-20 -top-20 rotate-45" />;
    if (month >= 8 && month <= 10) return <Leaf className="w-64 h-64 text-brand-orange/5 absolute -right-20 -top-20 -rotate-12" />;
    return <Snowflake className="w-64 h-64 text-blue-500/5 absolute -right-20 -top-20 animate-pulse" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[3rem] border border-brand-border p-12 flex flex-col items-center justify-center min-h-[400px] shadow-sm">
        <Loader2 className="w-12 h-12 text-brand-coral animate-spin mb-4" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Curating {monthName} Picks...</p>
      </div>
    );
  }

  if (!data) return null;

  const currentDestinations = data[activeTab];

  return (
    <div className="bg-white rounded-[3rem] border border-brand-border p-8 md:p-12 relative overflow-hidden shadow-sm">
      {getBackgroundIcon()}
      
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="px-3 py-1 bg-brand-coral/10 text-brand-coral rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Monthly Special
              </div>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-brand-navy leading-tight">
              Best of <span className="text-brand-coral">{monthName}</span>
            </h2>
            <p className="text-gray-500 mt-2 font-medium">Curated destinations based on local weather and global events.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(['nearby', 'national', 'global'] as const).map((category, catIdx) => (
            <div key={category} className="space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-brand-navy/5">
                {category === 'nearby' && <MapPin className="w-4 h-4 text-brand-coral" />}
                {category === 'national' && <Compass className="w-4 h-4 text-brand-amber" />}
                {category === 'global' && <Globe className="w-4 h-4 text-brand-coral" />}
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-brand-navy">
                  {category === 'nearby' ? 'Local & Nearby' : category === 'national' ? 'Across Country' : 'Global Picks'}
                </h3>
              </div>
              
              <div className="space-y-6">
                {data[category].map((dest, idx) => (
                  <motion.div
                    key={`${category}-${dest.name}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (catIdx * 3 + idx) * 0.05 }}
                    className="group cursor-pointer"
                    onClick={() => onSelectDestination?.(dest.name)}
                  >
                    <div className="relative h-40 rounded-[1.5rem] overflow-hidden mb-3 shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-500">
                      <SmartImage 
                        place={dest.name}
                        type={dest.type}
                        className="w-full h-full"
                        fallbackQuery={`${dest.name},travel`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 via-transparent to-transparent opacity-60" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="text-[9px] font-black uppercase tracking-widest text-brand-amber mb-0.5">
                          {dest.highlight}
                        </div>
                        <h4 className="text-sm font-black text-white">{dest.name}</h4>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
