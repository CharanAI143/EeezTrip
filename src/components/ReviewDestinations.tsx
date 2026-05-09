import { useState, useEffect } from 'react';
import { db, collection, query, getDocs, orderBy, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../lib/firebase';
import { User } from 'firebase/auth';
import { DestinationReview } from '../types';
import { Star, MessageCircle, Send, Loader2, MapPin, Search, User as UserIcon, Video, Play, ExternalLink, X, Sparkles, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface ReviewDestinationsProps {
  user: User | null;
  onLogin: () => void;
}

export function ReviewDestinations({ user, onLogin }: ReviewDestinationsProps) {
  const [reviews, setReviews] = useState<DestinationReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showAddReview, setShowAddReview] = useState(false);

  // New Review Form State
  const [dest, setDest] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    const path = 'reviews';
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DestinationReview[];
      setReviews(fetched);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onLogin();
      return;
    }

    if (!dest || !reviewText) return;

    setIsPosting(true);
    const path = 'reviews';
    try {
      await addDoc(collection(db, path), {
        destination: dest,
        userId: user.uid,
        userName: user.displayName || 'Traveler',
        userPhoto: user.photoURL || null,
        rating,
        review: reviewText,
        videoUrl: videoUrl || null,
        createdAt: serverTimestamp()
      });
      
      // Reset form
      setDest('');
      setRating(5);
      setReviewText('');
      setVideoUrl('');
      setShowAddReview(false);
      fetchReviews();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setIsPosting(false);
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.review.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSearching = searchTerm.trim().length > 0;

  return (
    <div className="space-y-8">
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Explore destinations (e.g. Paris, Tokyo...)"
            className="w-full pl-12 pr-4 py-3 bg-white border border-brand-border rounded-2xl focus:ring-2 focus:ring-brand-coral/20 focus:border-brand-coral outline-none transition-all shadow-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => user ? setShowAddReview(!showAddReview) : onLogin()}
          className="w-full md:w-auto px-8 py-3 bg-brand-coral text-white rounded-2xl font-bold shadow-lg shadow-brand-coral/20 hover:bg-brand-orange transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          {user ? 'Share Experience' : 'Login to Review'}
        </button>
      </div>

      <AnimatePresence>
        {isSearching && filteredReviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-6 py-3 bg-brand-navy text-white rounded-2xl shadow-lg w-fit"
          >
            <Sparkles className="w-4 h-4 text-brand-amber" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Showing {filteredReviews.length} results for "{searchTerm}"
            </span>
            <button 
              onClick={() => setSearchTerm('')}
              className="ml-2 p-1 hover:bg-white/10 rounded-lg"
            >
              <X className="w-4 h-4 opacity-50" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddReview && user && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmitReview} className="bg-white rounded-3xl p-8 border border-brand-border shadow-md space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-brand-navy flex items-center gap-2">
                  <Star className="w-5 h-5 text-brand-amber fill-brand-amber" />
                  Your Review as {user.displayName}
                </h3>
                <button type="button" onClick={() => setShowAddReview(false)}>
                   <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-brand-slate block">Destination Visited</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Kyoto, Japan"
                    className="w-full px-4 py-3 bg-brand-sand/30 border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-coral/20 outline-none transition-all"
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-brand-slate block">Rating</label>
                  <div className="flex gap-2 p-1 bg-brand-sand/30 rounded-xl border border-brand-border w-fit">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${rating >= s ? 'text-brand-amber' : 'text-gray-300'}`}
                      >
                        <Star className={`w-6 h-6 ${rating >= s ? 'fill-brand-amber' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-slate block">Video Link (Optional)</label>
                <div className="relative">
                   <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                    type="url" 
                    placeholder="https://youtube.com/... or https://video-link.com"
                    className="w-full pl-10 pr-4 py-3 bg-brand-sand/30 border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-coral/20 outline-none transition-all"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-slate block">Text Review</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Describe your journey, the food, the vibe, and any tips..."
                  className="w-full px-4 py-3 bg-brand-sand/30 border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-coral/20 outline-none transition-all resize-none font-medium"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="submit"
                  disabled={isPosting}
                  className="w-full px-8 py-4 bg-brand-navy text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-slate disabled:opacity-50 transition-all shadow-lg active:scale-95"
                >
                  {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Post My Review
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-brand-coral animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading experiences data...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-brand-border">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
             <MessageCircle className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-brand-navy">No reviews yet</h3>
          <p className="text-gray-500 max-w-xs mx-auto">Be the first to help fellow travelers by sharing your recent trip highlights!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
          {filteredReviews.map((review) => (
            <motion.div
              layout
              key={review.id}
              className="group bg-white rounded-[2rem] border border-brand-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col overflow-hidden"
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={`https://source.unsplash.com/featured/?${review.destination.replace(/\s+/g, '')},travel`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  alt={review.destination}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                {review.videoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                     <a href={review.videoUrl} target="_blank" rel="noopener noreferrer" className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:scale-110 transition-transform ring-4 ring-white/10">
                        <Play className="w-8 h-8 fill-current" />
                     </a>
                  </div>
                )}
                
                <div className="absolute bottom-4 left-6 flex items-center gap-2">
                   <div className="px-3 py-1 bg-brand-coral/90 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                      {review.videoUrl ? <Video className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                      {review.videoUrl ? 'Watch Review' : 'Destination'}
                   </div>
                </div>
              </div>
              
              <div className="p-8 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    {review.userPhoto ? (
                      <img src={review.userPhoto} alt={review.userName} className="w-12 h-12 rounded-xl object-cover ring-2 ring-brand-sand shadow-md" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-brand-sand ring-2 ring-white flex items-center justify-center text-brand-navy font-bold shadow-md">
                        <UserIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-brand-navy leading-none mb-1.5">{review.userName}</p>
                      {review.createdAt && (
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">
                          {format(review.createdAt.toDate ? review.createdAt.toDate() : new Date(review.createdAt), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5 px-2 py-1 bg-brand-amber/10 rounded-lg">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${review.rating >= s ? 'text-brand-amber fill-brand-amber' : 'text-gray-200'}`} />
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-brand-coral font-black text-xs uppercase tracking-widest mb-4">
                  <MapPin className="w-3.5 h-3.5" />
                  {review.destination}
                </div>

                <blockquote className="text-gray-600 text-sm italic leading-relaxed flex-1 border-l-4 border-brand-sand pl-4 mb-6">
                  "{review.review}"
                </blockquote>

                {review.videoUrl && (
                  <a 
                    href={review.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase text-brand-navy bg-gray-100 p-3 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Video Resource
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
