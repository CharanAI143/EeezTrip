import { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, orderBy, handleFirestoreError, OperationType } from '../lib/firebase';
import { User } from 'firebase/auth';
import { SavedTrip } from '../types';
import { Calendar, MapPin, ChevronRight, Loader2, BookmarkX, ExternalLink, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ItineraryDisplay } from './ItineraryDisplay';

interface SavedTripsProps {
  user: User | null;
  onLogin: () => void;
}

export function SavedTrips({ user, onLogin }: SavedTripsProps) {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<SavedTrip | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTrips = async () => {
      setLoading(true);
      const path = 'saved_trips';
      try {
        const q = query(
          collection(db, path),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const fetchedTrips = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SavedTrip[];
        setTrips(fetchedTrips);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [user]);

  if (!user) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-brand-border shadow-sm">
        <div className="w-20 h-20 bg-brand-sand rounded-full flex items-center justify-center mx-auto mb-6">
          <BookmarkX className="w-10 h-10 text-brand-navy/30" />
        </div>
        <h3 className="text-xl font-bold text-brand-navy mb-2">Sign in to see your savings</h3>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">Keep all your dream itineraries in one place by signing in with your account.</p>
        <button 
          onClick={onLogin}
          className="px-8 py-3 bg-brand-navy text-white rounded-xl font-bold hover:bg-brand-slate transition-all shadow-lg active:scale-95"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-brand-coral animate-spin" />
        <p className="text-sm font-medium text-gray-500">Loading your adventures...</p>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-brand-border shadow-sm">
        <div className="w-20 h-20 bg-brand-sand rounded-full flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-10 h-10 text-brand-navy/30" />
        </div>
        <h3 className="text-xl font-bold text-brand-navy mb-2">No saved trips yet</h3>
        <p className="text-gray-500 mb-2">Start planning and save your first itinerary!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {selectedTrip ? (
          <motion.div
            key="details"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <button 
              onClick={() => setSelectedTrip(null)}
              className="group flex items-center gap-2 text-brand-coral font-bold hover:gap-3 transition-all mb-4"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back to all savings
            </button>
            <ItineraryDisplay content={selectedTrip.content} isComplete={true} />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {trips.map((trip) => (
              <motion.div
                key={trip.id}
                whileHover={{ y: -5 }}
                className="bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden flex flex-col group"
              >
                <div className="h-48 w-full overflow-hidden relative">
                  <img 
                    src={`https://source.unsplash.com/featured/?${trip.destination.replace(/\s+/g, '')},travel`} 
                    alt={trip.destination}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-6">
                    <div className="flex items-center gap-1 text-white/90 text-[10px] font-black uppercase tracking-widest bg-black/20 backdrop-blur-md px-2 py-1 rounded-md">
                      <Camera className="w-3 h-3" />
                      View Destination
                    </div>
                  </div>
                </div>
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="px-3 py-1 bg-brand-coral/10 text-brand-coral rounded-full text-[10px] font-black uppercase tracking-wider">
                      Trip Plan
                    </div>
                    {trip.createdAt && (
                      <span className="text-[10px] text-gray-400 font-medium ml-auto">
                        {format(trip.createdAt.toDate ? trip.createdAt.toDate() : new Date(trip.createdAt), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-brand-navy mb-2 group-hover:text-brand-coral transition-colors">{trip.title}</h3>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                    <MapPin className="w-4 h-4 text-brand-amber" />
                    <span>{trip.destination}</span>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-brand-border flex gap-2">
                  <button 
                    onClick={() => setSelectedTrip(trip)}
                    className="flex-1 py-2 bg-brand-navy text-white rounded-xl text-sm font-bold hover:bg-brand-slate transition-colors flex items-center justify-center gap-2"
                  >
                    View Plan
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
