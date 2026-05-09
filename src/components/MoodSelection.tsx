import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Zap, Coffee, Ghost, Palmtree, Mountain, Music, Heart, Loader2, ArrowRight, Wallet, Coins, TreePine, Waves, MountainSnow, Sun } from 'lucide-react';
import { getMoodRecommendations } from '../lib/gemini';
import { cn } from '../lib/utils';
import { Currency } from '../types';

import { SmartImage } from './SmartImage';

interface Mood {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

const moods: Mood[] = [
  { id: 'adventurous', label: 'Adventurous', icon: Zap, color: 'text-brand-coral', description: 'Action, heights, and speed' },
  { id: 'relaxed', label: 'Chill', icon: Coffee, color: 'text-brand-amber', description: 'Peace, quiet, and comfort' },
  { id: 'romantic', label: 'Romantic', icon: Heart, color: 'text-pink-500', description: 'Intimate and beautiful' },
  { id: 'mysterious', label: 'Mysterious', icon: Ghost, color: 'text-purple-500', description: 'Hidden gems and history' },
  { id: 'tropical', label: 'Tropical', icon: Palmtree, color: 'text-emerald-500', description: 'Sun, sand, and ocean' },
  { id: 'majestic', label: 'Majestic', icon: Mountain, color: 'text-blue-500', description: 'Grand landscapes' },
];

interface MoodChoice {
  name: string;
  description: string;
  whyMatch: string;
  estimatedCost: number;
  landscapeType: string;
  highlight: string;
}

interface MoodSelectionProps {
  onSelectDestination: (dest: string, budget: number, currency: string) => void;
}

export function MoodSelection({ onSelectDestination }: MoodSelectionProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<MoodChoice[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Local state for mood-based budget
  const [moodBudget, setMoodBudget] = useState<number>(50000);
  const [moodCurrency, setMoodCurrency] = useState<string>('INR');

  const handleMoodSelect = async (mood: Mood) => {
    setSelectedMood(mood.id);
    setLoading(true);
    setRecommendations([]); // Reset previous recs
    try {
      const results = await getMoodRecommendations(mood.label, moodBudget, moodCurrency);
      setRecommendations(results);
    } catch (error) {
      console.error("Mood search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 bg-brand-navy/5 p-6 md:p-8 rounded-[2rem] border border-brand-navy/10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-brand-coral/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand-coral" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-brand-navy">Plan on Mood</h3>
          </div>
          <p className="text-xs text-brand-navy/40 font-medium">Where should you go based on how you feel?</p>
        </div>

        {/* Budget for Mood Selection */}
        <div className="flex flex-wrap gap-4 p-4 bg-white rounded-2xl border border-brand-navy/5 shadow-sm">
          <div className="space-y-1.5 flex-1 min-w-[120px]">
             <label className="text-[10px] font-black uppercase tracking-widest text-brand-navy/40 flex items-center gap-1.5 px-1">
               <Wallet className="w-3 h-3" />
               Max Budget
             </label>
             <input 
               type="number"
               value={moodBudget}
               onChange={(e) => setMoodBudget(Number(e.target.value))}
               className="w-full bg-brand-navy/5 border-none rounded-xl px-4 py-2 text-sm font-bold text-brand-navy focus:ring-2 focus:ring-brand-coral"
             />
          </div>
          <div className="space-y-1.5">
             <label className="text-[10px] font-black uppercase tracking-widest text-brand-navy/40 flex items-center gap-1.5 px-1">
               <Coins className="w-3 h-3" />
               Currency
             </label>
             <select 
               value={moodCurrency}
               onChange={(e) => setMoodCurrency(e.target.value)}
               className="bg-brand-navy/5 border-none rounded-xl px-4 py-2 text-sm font-bold text-brand-navy focus:ring-2 focus:ring-brand-coral"
             >
               {Currency.options.map(curr => <option key={curr} value={curr}>{curr}</option>)}
             </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {moods.map((mood) => {
          const Icon = mood.icon;
          const isActive = selectedMood === mood.id;
          return (
            <button
              key={mood.id}
              onClick={() => handleMoodSelect(mood)}
              className={cn(
                "p-4 rounded-2xl text-left transition-all border-2 flex flex-col gap-3 group h-24 justify-center",
                isActive 
                  ? "bg-brand-navy border-brand-navy text-white shadow-xl scale-[1.05]" 
                  : "bg-white border-brand-navy/5 text-brand-navy/60 hover:border-brand-navy/20 hover:-translate-y-1"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive ? "text-white" : mood.color)} />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">{mood.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-12 flex flex-col items-center justify-center bg-white rounded-3xl border border-brand-navy/5"
          >
            <div className="relative">
              <Loader2 className="w-10 h-10 text-brand-coral animate-spin mb-4" />
              <Sparkles className="w-4 h-4 text-brand-amber absolute top-0 -right-2 animate-bounce" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-brand-navy/40">Curating for your soul...</span>
          </motion.div>
        )}

        {recommendations.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {recommendations.map((rec, idx) => (
              <button
                key={rec.name}
                onClick={() => onSelectDestination(rec.name, moodBudget, moodCurrency)}
                className="w-full group bg-white border border-brand-navy/5 p-0 rounded-[2rem] text-left hover:shadow-2xl transition-all overflow-hidden flex flex-col"
              >
                <div className="relative h-40 overflow-hidden">
                   <SmartImage 
                     place={rec.name}
                     type={rec.landscapeType}
                     className="w-full h-full"
                     fallbackQuery={`${rec.name},${rec.landscapeType},travel`}
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 via-transparent to-transparent opacity-60" />
                   <div className="absolute bottom-4 left-6 right-6">
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-brand-amber mb-0.5">
                         <Sparkles className="w-3 h-3" />
                         {rec.highlight}
                      </div>
                      <h4 className="text-lg font-black text-white">{rec.name}</h4>
                   </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                     <div className="px-3 py-1 bg-brand-coral/10 text-brand-coral rounded-full text-[10px] font-black uppercase tracking-widest">
                       {rec.landscapeType}
                     </div>
                     <span className="text-[11px] font-black text-brand-navy/60">
                       ~{rec.estimatedCost} {moodCurrency}
                     </span>
                  </div>
                  
                  <p className="text-[11px] text-brand-navy/60 leading-relaxed line-clamp-2">
                    {rec.whyMatch}
                  </p>
                  
                  <div className="pt-4 border-t border-brand-navy/5 flex items-center justify-between group-hover:text-brand-coral transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-widest">Plan This Trip</span>
                    <ArrowRight className="w-4 h-4 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
