import { useState, useEffect, useMemo } from 'react';
import { db, collection, query, getDocs, where, orderBy, addDoc, serverTimestamp, limit, handleFirestoreError, OperationType } from '../lib/firebase';
import { User } from 'firebase/auth';
import { DestinationReview, SavedTrip } from '../types';
import { Star, MessageCircle, Send, Loader2, Search, User as UserIcon, Video, Play, X, Sparkles, Link2, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { toDate } from '../lib/utils';

interface ReviewDestinationsProps {
  user: User | null;
  onLogin: () => void;
  /** Told about every keystroke, so the page can show third-party reviews for the same term. */
  onSearch?: (term: string) => void;
}

/** Mirrors the URL check in firestore.rules so bad input fails fast and legibly. */
function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

/**
 * A stable colour pair per destination.
 *
 * The card art used to be `source.unsplash.com`, a random-image service Google
 * retired — every card rendered as a broken image, and because the URL varied
 * per load it gave no visual identity either. Hashing the name means the same
 * destination always gets the same art, costs nothing, and needs no network.
 */
function destinationArt(destination: string): { from: string; to: string; ink: string } {
  const palettes = [
    { from: '#0ea5e9', to: '#0369a1', ink: '#e0f2fe' },
    { from: '#ec4899', to: '#9d174d', ink: '#fce7f3' },
    { from: '#f59e0b', to: '#b45309', ink: '#fef3c7' },
    { from: '#10b981', to: '#065f46', ink: '#d1fae5' },
    { from: '#8b5cf6', to: '#4c1d95', ink: '#ede9fe' },
    { from: '#f43f5e', to: '#9f1239', ink: '#ffe4e6' },
    { from: '#06b6d4', to: '#0e7490', ink: '#cffafe' },
    { from: '#eab308', to: '#a16207', ink: '#fef9c3' },
  ];
  let hash = 0;
  for (let i = 0; i < destination.length; i++) {
    hash = (hash * 31 + destination.charCodeAt(i)) >>> 0;
  }
  return palettes[hash % palettes.length];
}

/** Average rating and a five-bar distribution, for the summary strip. */
function summarise(reviews: DestinationReview[]) {
  const distribution = [0, 0, 0, 0, 0];
  let total = 0;
  for (const review of reviews) {
    const rating = Math.min(5, Math.max(1, Math.round(review.rating)));
    distribution[rating - 1] += 1;
    total += rating;
  }
  return {
    average: reviews.length ? total / reviews.length : 0,
    distribution,
    peak: Math.max(...distribution, 1),
  };
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5 align-middle">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          width={size}
          height={size}
          className={rating >= s ? 'text-brand-amber fill-brand-amber' : 'text-brand-border'}
        />
      ))}
    </span>
  );
}

export function ReviewDestinations({ user, onLogin, onSearch }: ReviewDestinationsProps) {
  const [reviews, setReviews] = useState<DestinationReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showAddReview, setShowAddReview] = useState(false);

  // New Review Form State
  const [dest, setDest] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [tripId, setTripId] = useState('');

  // The signed-in traveller's saved trips, offered as the subject of the review.
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);

  const fetchReviews = async () => {
    setLoading(true);
    const path = 'reviews';
    try {
      // The limit is required by the Firestore rule on this collection; without it
      // the query is denied. 50 matches the ceiling in firestore.rules.
      const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
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

  // Hand the search term up so the page can ask Google about the same destination.
  useEffect(() => {
    onSearch?.(searchTerm);
  }, [searchTerm, onSearch]);

  /**
   * Load the signed-in traveller's saved trips so a review can be attached to one.
   *
   * firestore.rules requires that a linked tripId is a saved_trips document the
   * author owns, so the id cannot be invented here — it has to come from a real
   * document of theirs.
   */
  useEffect(() => {
    if (!user) {
      setSavedTrips([]);
      return;
    }
    let cancelled = false;
    getDocs(
      query(
        collection(db, 'saved_trips'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
    )
      .then(snapshot => {
        if (cancelled) return;
        setSavedTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SavedTrip[]);
      })
      .catch(() => {
        // A traveller with no readable trips can still review a destination they
        // visited outside the app, so this is not worth interrupting them over.
        if (!cancelled) setSavedTrips([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onLogin();
      return;
    }

    if (!dest || !reviewText) return;

    // firestore.rules only accepts http(s) for videoUrl, so reject a bad scheme
    // here rather than letting the write come back as an opaque permission error.
    if (videoUrl && !isHttpUrl(videoUrl)) {
      setFormError('Video link must start with http:// or https://');
      return;
    }
    if (reviewText.length > 2000) {
      setFormError('Review is limited to 2000 characters');
      return;
    }

    // Both halves of the link travel together; firestore.rules rejects one without
    // the other, and a bare id would render as noise on the trip.
    const linkedTrip = savedTrips.find(t => t.id === tripId);

    setIsPosting(true);
    setFormError(null);
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
        tripId: linkedTrip ? linkedTrip.id : null,
        tripTitle: linkedTrip ? linkedTrip.title : null,
        createdAt: serverTimestamp()
      });

      // Reset form
      setDest('');
      setRating(5);
      setReviewText('');
      setVideoUrl('');
      setTripId('');
      setShowAddReview(false);
      fetchReviews();
    } catch (err) {
      // The old code let this bubble into a rejected promise, which surfaced as an
      // unhandled rejection and a form that silently refused to submit.
      handleFirestoreError(err, OperationType.CREATE, path);
      setFormError('Could not post your review. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const filteredReviews = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return reviews;
    return reviews.filter(r =>
      r.destination.toLowerCase().includes(needle) ||
      r.review.toLowerCase().includes(needle)
    );
  }, [reviews, searchTerm]);

  const isSearching = searchTerm.trim().length > 0;
  const summary = useMemo(() => summarise(filteredReviews), [filteredReviews]);

  const fieldClass =
    'reviews-field w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-brand-navy placeholder:text-brand-muted/70 focus:ring-4 focus:ring-brand-coral/15 focus:border-brand-coral outline-none transition-all';

  return (
    <div className="space-y-8">
      {/* Search and Action Bar. Full width, so its edges line up with the summary
          strip and the review grid below instead of floating in a narrower centred
          column. */}
      <div className="reviews-bar flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* A label, not a div: the whole box — icon and padding included — focuses
            the field on click. As a plain div only the text area was clickable,
            so clicking the magnifier left the field unfocused and the pale-blue
            resting border looking stuck. */}
        <label htmlFor="review-search" className="reviews-search sm:flex-1 min-w-0 flex items-center gap-3 px-4 bg-white/80 backdrop-blur border border-brand-border rounded-2xl shadow-sm transition-all cursor-text focus-within:ring-4 focus-within:ring-brand-coral/15 focus-within:border-brand-coral">
          <Search className="w-5 h-5 text-brand-muted shrink-0 pointer-events-none" aria-hidden="true" />
          <input
            id="review-search"
            type="text"
            aria-label="Search reviews by destination"
            placeholder="Search a destination, e.g. Kyoto, Goa, Ladakh..."
            className="reviews-search-field flex-1 min-w-0 bg-transparent border-0 outline-none font-medium text-brand-navy placeholder:text-brand-muted/70"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>
        {/* Hidden while the list is empty: the empty state below owns the call to
            action there, so the two sign-in buttons are never on screen together. */}
        {!loading && filteredReviews.length > 0 && (
          <button
            onClick={() => user ? setShowAddReview(!showAddReview) : onLogin()}
            className="btn btn-pink reviews-search-btn sm:shrink-0 rounded-2xl shadow-lg shadow-brand-coral/25"
          >
            <MessageCircle className="w-5 h-5" />
            {user ? 'Write a review' : 'Sign in to review'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isSearching && filteredReviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-5 py-3 bg-brand-navy text-white rounded-2xl shadow-lg w-fit max-w-full"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-brand-amber" />
            <span className="text-xs font-bold uppercase tracking-widest truncate">
              {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'} for “{searchTerm.trim()}”
            </span>
            <button
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              className="ml-1 p-1 hover:bg-white/10 rounded-lg shrink-0"
            >
              <X className="w-4 h-4 opacity-60" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddReview && user && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmitReview}
              className="bg-white/90 backdrop-blur rounded-3xl border border-brand-border shadow-xl shadow-brand-border/40 overflow-hidden"
            >
              <div className="flex items-center justify-between px-7 py-5 bg-brand-sand border-b border-brand-border">
                <h3 className="text-lg font-extrabold text-brand-navy flex items-center gap-2.5">
                  <Star className="w-5 h-5 text-brand-amber fill-brand-amber" />
                  Your review{user.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddReview(false)}
                  aria-label="Close review form"
                  className="p-1.5 rounded-lg text-brand-muted hover:bg-white hover:text-brand-navy transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-7 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label htmlFor="review-destination" className="text-xs font-extrabold text-brand-slate uppercase tracking-widest block">
                      Destination
                    </label>
                    <input
                      id="review-destination"
                      type="text"
                      required
                      placeholder="e.g. Kyoto, Japan"
                      className={fieldClass}
                      value={dest}
                      onChange={(e) => setDest(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-extrabold text-brand-slate uppercase tracking-widest block">
                      Your rating
                    </span>
                    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-sand border border-brand-border rounded-xl w-fit">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          aria-label={`${s} ${s === 1 ? 'star' : 'stars'}`}
                          aria-pressed={rating === s}
                          className={`p-1 rounded-lg transition-all hover:scale-110 ${rating >= s ? 'text-brand-amber' : 'text-brand-border'}`}
                        >
                          <Star className={`w-6 h-6 ${rating >= s ? 'fill-brand-amber' : ''}`} />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-bold text-brand-navy tabular-nums">{rating}.0</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="review-body" className="text-xs font-extrabold text-brand-slate uppercase tracking-widest block">
                    What was it like?
                  </label>
                  <textarea
                    id="review-body"
                    required
                    rows={4}
                    placeholder="Describe your journey, the food, the vibe, and any tips..."
                    className={`${fieldClass} resize-none`}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                  <div className="flex justify-between text-[11px] font-bold text-brand-muted">
                    <span>Be specific — it helps more than “great trip”.</span>
                    <span className={reviewText.length > 1800 ? 'text-brand-coral' : ''}>
                      {reviewText.length}/2000
                    </span>
                  </div>
                </div>

                {savedTrips.length > 0 && (
                  <div className="space-y-2">
                    <label htmlFor="review-trip" className="text-xs font-extrabold text-brand-slate uppercase tracking-widest flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5" />
                      Link to one of your trips (optional)
                    </label>
                    <select
                      id="review-trip"
                      value={tripId}
                      onChange={(e) => {
                        setTripId(e.target.value);
                        const chosen = savedTrips.find(t => t.id === e.target.value);
                        // Prefill the destination from the trip, but keep whatever
                        // the traveller has already typed if they typed something
                        // more specific than the trip's own title.
                        if (chosen && !dest) setDest(chosen.destination || chosen.title);
                      }}
                      className={`${fieldClass} cursor-pointer`}
                    >
                      <option value="">Not about a specific trip</option>
                      {savedTrips.map(trip => (
                        <option key={trip.id} value={trip.id}>
                          {trip.title}{trip.destination ? ` — ${trip.destination}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="review-video" className="text-xs font-extrabold text-brand-slate uppercase tracking-widest block">
                    Video link (optional)
                  </label>
                  <div className="relative">
                    <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted pointer-events-none" />
                    <input
                      id="review-video"
                      type="url"
                      placeholder="https://youtube.com/..."
                      className={`${fieldClass} pl-11`}
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                    />
                  </div>
                </div>

                {formError && (
                  <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-700">
                    {formError}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isPosting}
                    className="btn btn-pink px-8 py-3.5 rounded-xl shadow-lg shadow-brand-coral/25"
                  >
                    {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {isPosting ? 'Posting...' : 'Post my review'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating summary, once there is something to summarise. */}
      {!loading && filteredReviews.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-center px-7 py-6 bg-white/70 backdrop-blur border border-brand-border rounded-3xl shadow-sm">
          <div className="text-center sm:text-right sm:pr-7 sm:border-r sm:border-brand-border">
            <div className="text-5xl font-black text-brand-navy leading-none tabular-nums">
              {summary.average.toFixed(1)}
            </div>
            <Stars rating={Math.round(summary.average)} size={16} />
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-muted mt-1.5">
              {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'}
            </p>
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.distribution[star - 1];
              const pct = summary.peak ? (count / summary.peak) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-brand-slate w-3 tabular-nums">{star}</span>
                  <Star className="w-3.5 h-3.5 text-brand-amber fill-brand-amber shrink-0" />
                  <div className="flex-1 h-2 bg-brand-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-brand-amber to-brand-orange"
                    />
                  </div>
                  <span className="text-xs font-bold text-brand-muted w-6 text-right tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-9 h-9 text-brand-coral animate-spin" />
          <p className="text-sm font-semibold text-brand-muted">Loading traveller experiences...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-16 bg-white/70 backdrop-blur rounded-[2rem] border-2 border-dashed border-brand-border">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-ice/10 to-brand-coral/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Quote className="w-7 h-7 text-brand-ice" />
          </div>
          <h3 className="text-lg font-extrabold text-brand-navy">
            {isSearching ? 'No reviews match that search' : 'No reviews yet'}
          </h3>
          <p className="text-brand-muted text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            {isSearching
              ? 'Try a different spelling, or clear the search to see everything.'
              : 'Be the first traveller to tell others what a destination was really like.'}
          </p>
          {/* This is the page's only call to action while the list is empty: the
              toolbar button above steps aside so the two never appear together. */}
          {!isSearching && (
            <button
              onClick={() => (user ? setShowAddReview(true) : onLogin())}
              /* No px/py here on purpose: .btn-pink is unlayered and would
                 silently drop them, so it supplies its own 14px/32px padding. */
              className="btn btn-pink mt-6 rounded-xl shadow-lg shadow-brand-coral/25"
            >
              {user ? 'Write the first review' : 'Sign in to review'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          {filteredReviews.map((review, index) => {
            const art = destinationArt(review.destination);
            const posted = review.createdAt ? toDate(review.createdAt) : null;
            return (
              <motion.article
                layout
                key={review.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.35) }}
                className="group min-w-0 bg-white rounded-[1.75rem] border border-brand-border shadow-sm hover:shadow-xl hover:shadow-brand-border/60 hover:-translate-y-1 transition-all flex flex-col overflow-hidden"
              >
                <div
                  className="relative h-36 overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${art.from} 0%, ${art.to} 100%)` }}
                >
                  {/* A soft light source, so the flat gradient reads as depth
                      rather than as a colour swatch. */}
                  <div
                    className="absolute inset-0 opacity-70"
                    style={{
                      background:
                        'radial-gradient(120% 90% at 15% 0%, rgba(255,255,255,0.45) 0%, transparent 60%)',
                    }}
                  />
                  <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className="text-[10px] font-black uppercase tracking-[0.2em] mb-1"
                        style={{ color: art.ink, opacity: 0.85 }}
                      >
                        {review.tripTitle ? 'From your trip' : 'Traveller review'}
                      </p>
                      <h3 className="text-xl font-black text-white leading-tight truncate">
                        {review.destination}
                      </h3>
                    </div>
                    {review.videoUrl && (
                      <a
                        href={review.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Watch the review video"
                        className="shrink-0 w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 hover:scale-110 transition-all ring-2 ring-white/25"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1 -mt-1">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {review.userPhoto ? (
                        <img
                          src={review.userPhoto}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-brand-sand shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-brand-sand flex items-center justify-center shrink-0">
                          <UserIcon className="w-5 h-5 text-brand-muted" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-brand-navy leading-tight truncate text-sm">
                          {review.userName}
                        </p>
                        {posted && (
                          <p className="text-[10px] text-brand-muted uppercase tracking-[0.15em] font-bold">
                            {format(posted as Date, 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-black text-brand-navy tabular-nums">
                        {review.rating.toFixed(1)}
                      </span>
                      <Stars rating={Math.round(review.rating)} />
                    </div>
                  </div>

                  {review.tripTitle && (
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-brand-coral mb-3">
                      <Link2 className="w-3 h-3" />
                      <span className="truncate">{review.tripTitle}</span>
                    </div>
                  )}

                  {/* break-words, and min-w-0 on the card below: a review containing a
                      long URL must not widen the column and push the page sideways. */}
                  <blockquote className="text-brand-slate text-sm leading-relaxed flex-1 break-words border-l-[3px] border-brand-coral/40 pl-4">
                    {review.review}
                  </blockquote>

                  {review.videoUrl && (
                    <a
                      href={review.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-navy bg-brand-sand hover:bg-brand-border px-4 py-2.5 rounded-xl transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Watch the video
                    </a>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
