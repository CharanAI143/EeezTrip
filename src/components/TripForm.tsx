import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TripFormSchema, type TripFormData, TravelStyle, Currency, Preference, TripType } from '../types';
import { cn } from '../lib/utils';
import { Plane, Calendar, Wallet, Users, Compass, FileText, MapPin, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { VoiceFormFiller } from './VoiceFormFiller';

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  isLoading: boolean;
}

export function TripForm({ onSubmit, isLoading }: TripFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TripFormData>({
    resolver: zodResolver(TripFormSchema),
    defaultValues: {
      currency: 'USD',
      travelStyle: 'mid-range',
      guests: 1,
      duration: 5,
      preferences: [],
      tripTypes: [],
    },
  });

  const selectedPreferences = watch('preferences');
  const selectedTripTypes = watch('tripTypes');
  const duration = watch('duration');
  const budget = watch('budget');
  const currency = watch('currency');

  useEffect(() => {
    const handlePrefill = (e: any) => {
      if (e.detail) {
        setValue('destination', e.detail, { shouldValidate: true });
        
        // Check if we can auto-submit
        const currentBudget = watch('budget');
        const currentStart = watch('startLocation');
        
        if (currentBudget && currentStart) {
          // Give a small delay for the user to see the change
          setTimeout(() => {
            handleSubmit(onSubmit)();
          }, 800);
        }
      }
    };
    window.addEventListener('prefill-trip', handlePrefill);
    return () => window.removeEventListener('prefill-trip', handlePrefill);
  }, [setValue, handleSubmit, onSubmit, watch]);

  const togglePreference = (pref: Preference) => {
    const current = selectedPreferences || [];
    const updated = current.includes(pref)
      ? current.filter((p) => p !== pref)
      : [...current, pref];
    setValue('preferences', updated, { shouldValidate: true });
  };

  const toggleTripType = (type: TripType) => {
    const current = selectedTripTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setValue('tripTypes', updated, { shouldValidate: true });
  };

  const handleVoiceData = (data: any) => {
    if (data.startLocation) setValue('startLocation', data.startLocation);
    if (data.destination) setValue('destination', data.destination);
    if (data.budget) setValue('budget', Number(data.budget));
    if (data.currency) setValue('currency', data.currency as any);
    if (data.duration) setValue('duration', Number(data.duration));
    
    if (data.tripTypes && Array.isArray(data.tripTypes)) {
      const validTypes = data.tripTypes.filter((t: string) => 
        TripType.options.includes(t as any)
      ) as TripType[];
      setValue('tripTypes', validTypes);
    }
    
    if (data.preferences && Array.isArray(data.preferences)) {
      const validPrefs = data.preferences.filter((p: string) => 
        Preference.options.includes(p as any)
      ) as Preference[];
      setValue('preferences', validPrefs);
    }

    // Auto-submit if we have destination
    if (data.destination) {
      setTimeout(() => {
        handleSubmit(onSubmit)();
      }, 1500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-brand-coral/5 rounded-2xl border border-brand-coral/20 flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
             <Sparkles className="w-3 h-3 text-brand-coral" />
             <span className="text-[10px] font-black uppercase tracking-widest text-brand-coral">Voice Assistant</span>
          </div>
          <p className="text-[11px] text-brand-navy/60 leading-relaxed font-medium">
            Tap the mic and say: <br/> "I want to go to Tokyo from Paris"
          </p>
        </div>
        <VoiceFormFiller onDataExtracted={handleVoiceData} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-4">
        {/* Locations */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="input-label">Start</label>
            <input
              {...register('startLocation')}
              placeholder="City, Country"
              className={cn("styled-input", errors.startLocation && "border-red-500")}
            />
          </div>

          <div className="space-y-1">
            <label className="input-label">Destination</label>
            <input
              {...register('destination')}
              placeholder="City, Country"
              className={cn("styled-input", errors.destination && "border-red-500")}
            />
          </div>
        </div>

        {/* Trip Duration Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="input-label">Trip Duration</label>
            <span className="text-xl font-black text-brand-coral">{duration} <span className="text-xs uppercase tracking-widest text-brand-navy/40">Days</span></span>
          </div>
          <input
            {...register('duration', { valueAsNumber: true })}
            type="range"
            min={1}
            max={30}
            step={1}
            className="w-full h-2 bg-brand-navy/10 rounded-full appearance-none cursor-pointer accent-brand-coral"
          />
          <div className="flex justify-between text-[10px] font-bold text-brand-navy/30 uppercase tracking-widest">
            <span>Short Trip</span>
            <span>Monthly Adventure</span>
          </div>
        </div>

        {/* Trip Types / Categories */}
        <div className="space-y-3">
          <label className="input-label">Trip Kind</label>
          <div className="flex flex-wrap gap-2">
            {TripType.options.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleTripType(type)}
                className={cn(
                  "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border-2",
                  selectedTripTypes?.includes(type)
                    ? "bg-brand-navy border-brand-navy text-white shadow-lg scale-105"
                    : "bg-white border-brand-navy/5 text-brand-navy/60 hover:border-brand-navy/20"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Budget & Guests */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="input-label">Travelers</label>
            <input
              {...register('guests', { valueAsNumber: true })}
              type="number"
              min={1}
              className="styled-input"
            />
          </div>
          <div className="space-y-1">
            <label className="input-label">Currency</label>
            <select {...register('currency')} className="styled-input">
              {Currency.options.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-1">
            <label className="input-label">Budget</label>
            <input
              {...register('budget', { valueAsNumber: true })}
              type="number"
              className="styled-input"
            />
          </div>
          <div className="space-y-1 col-span-1">
            <label className="input-label">Style</label>
            <select {...register('travelStyle')} className="styled-input">
              {TravelStyle.options.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-2">
        <label className="input-label">Vibe & Interests</label>
        <div className="flex flex-wrap gap-2">
          {Preference.options.map((pref) => (
            <button
              key={pref}
              type="button"
              onClick={() => togglePreference(pref)}
              className={cn(
                "px-3 py-1 text-[11px] font-bold rounded-full transition-all border",
                selectedPreferences?.includes(pref)
                  ? "bg-[#FFF5F5] border-brand-coral text-brand-coral"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:border-brand-coral/30"
              )}
            >
              {pref.charAt(0).toUpperCase() + pref.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="input-label">Optional Notes</label>
        <textarea
          {...register('notes')}
          rows={2}
          className="styled-input resize-none"
          placeholder="Allergies, specific landmarks..."
        />
      </div>

      <button
        disabled={isLoading}
        type="submit"
        className={cn(
          "w-full py-4 bg-gradient-to-r from-brand-coral to-brand-orange text-white font-bold rounded-xl shadow-lg shadow-coral-100 transition-all active:scale-[0.98]",
          isLoading && "opacity-70 cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            AI Planning...
          </div>
        ) : (
          "Plan My Dream Trip"
        )}
      </button>
    </form>
  </div>
  );
}
