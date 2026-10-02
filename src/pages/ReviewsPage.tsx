import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, User as UserIcon, Star, Sparkles, WifiOff, MapPin, Heart } from 'lucide-react';
import { ReviewDestinations } from '../components/ReviewDestinations';
import { useTripStore } from '../state/tripStore';
import { fetchExternalReviews } from '../api/client';
import type { ExternalReview } from '../types';

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5 align-middle" aria-label={`${rating} out of 5`}>
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

/**
 * Google reviews for a destination, for visitors who have not signed in.
 *
 * Kept visually and structurally separate from the traveller reviews above: these
 * are attributed to a place, carry no traveller identity, and are never written by
 * anyone using the app. Merging them into one list would let a visitor post a
 * Google quote and pass it off as a fellow traveller's experience.
 */
function GoogleReviews({ destination }: { destination: string }) {
  const [reviews, setReviews] = useState<ExternalReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);

  const query = destination.trim();

  useEffect(() => {
    if (!query) {
      setReviews([]);
      setRequested(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setRequested(true);

    fetchExternalReviews(query)
      .then(data => {
        if (!cancelled) setReviews(data);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const summary = useMemo(() => {
    const rated = reviews.map(r => r.rating).filter((r): r is number => typeof r === 'number');
    const average = rated.length ? rated.reduce((sum, r) => sum + r, 0) / rated.length : null;
    const total = reviews.find(r => r.totalReviews != null)?.totalReviews ?? null;
    return { average, total };
  }, [reviews]);

  if (!query) return null;

  return (
    <section className="mt-20" aria-labelledby="google-reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-coral mb-1.5">
            From Google
          </p>
          <h2 id="google-reviews-heading" className="text-2xl font-black text-brand-navy">
            What travellers say about {query}
          </h2>
        </div>
        {summary.average != null && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/80 border border-brand-border rounded-2xl shadow-sm">
            <span className="text-2xl font-black text-brand-navy tabular-nums leading-none">
              {summary.average.toFixed(1)}
            </span>
            <div>
              <Stars rating={Math.round(summary.average)} size={14} />
              {summary.total != null && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted mt-0.5">
                  {summary.total.toLocaleString()} Google reviews
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-brand-muted mb-6">
        Collected from Google, not written by other EeezTrip travellers.
      </p>

      {loading ? (
        <div className="flex items-center gap-3 px-6 py-8 bg-white/70 border border-brand-border rounded-2xl text-sm font-semibold text-brand-muted">
          <Loader2 className="w-5 h-5 animate-spin text-brand-coral" />
          Looking up what travellers said about {query}...
        </div>
      ) : !requested ? null : reviews.length === 0 ? (
        <div className="flex items-center gap-3 px-6 py-6 bg-white/70 border border-dashed border-brand-border rounded-2xl text-sm text-brand-muted">
          <WifiOff className="w-4 h-4 shrink-0" />
          No Google reviews available for {query} right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reviews.map((review, i) => (
            <motion.article
              key={`${review.author}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className="min-w-0 bg-white/70 backdrop-blur border border-brand-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-sand to-brand-blush/40 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4 text-brand-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-brand-navy text-sm leading-tight truncate">
                      {review.author}
                    </p>
                    {review.visitedAt && (
                      <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">
                        Visited {review.visitedAt}
                      </p>
                    )}
                  </div>
                </div>
                {review.rating != null && <Stars rating={Math.round(review.rating)} />}
              </div>
              {/* A left border, not an inline quote glyph. The glyph was an inline
                  SVG on the text baseline with a negative top margin, so its ink —
                  already high in the viewBox — sat above the first line and read as
                  breaking out of the card. This also matches how the traveller
                  review cards quote their text. */}
              {/* break-words: Google reviews routinely contain bare URLs, and a long
                  unbreakable token would otherwise widen the whole grid past the
                  page's max width. */}
              <p className="text-sm text-brand-slate leading-relaxed break-words border-l-[3px] border-brand-coral/40 pl-4">
                {review.text}
              </p>
              {review.placeName && (
                <p className="mt-3 pt-3 border-t border-brand-border text-[10px] uppercase tracking-widest text-brand-muted font-bold truncate">
                  {review.placeName}
                </p>
              )}
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Popular destination cards for quick browsing.
 * Shows curated top destinations with rating summary.
 * On hover: transparent overlay with review snippets and rating circle.
 */
function PopularDestinationCards({ user }: { user: { uid: string } | null }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<Record<string, ExternalReview[]>>({});
  const [loadingReviews, setLoadingReviews] = useState<Record<string, boolean>>({});
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseEnter = (index: number) => {
    clearCloseTimeout();
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => setHoveredIndex(null), 120);
  };

  const popularDestinations = useMemo(() => [
    { id: 'goa', name: 'Goa', country: 'India', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=400&auto=format&fit=crop', rating: 4.6, reviewCount: 125000, tagline: 'Beaches, nightlife & Portuguese heritage' },
    { id: 'kerala', name: 'Kerala', country: 'India', image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=400&auto=format&fit=crop', rating: 4.7, reviewCount: 98000, tagline: 'Backwaters, ayurveda & spice hills' },
    { id: 'agra', name: 'Taj Mahal, Agra', country: 'India', image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=400&auto=format&fit=crop', rating: 4.8, reviewCount: 252000, tagline: 'Iconic marble mausoleum & Mughal history' },
    { id: 'mumbai', name: 'Gateway of India, Mumbai', country: 'India', image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=400&auto=format&fit=crop', rating: 4.5, reviewCount: 89000, tagline: 'Historic arch overlooking the Arabian Sea' },
    { id: 'rajasthan', name: 'Jaipur', country: 'India', image: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?q=80&w=400&auto=format&fit=crop', rating: 4.6, reviewCount: 112000, tagline: 'Pink City palaces, forts & bazaars' },
    { id: 'ladakh', name: 'Leh-Ladakh', country: 'India', image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=400&auto=format&fit=crop', rating: 4.8, reviewCount: 67000, tagline: 'High-altitude desert, monasteries & lakes' },
    { id: 'varanasi', name: 'Varanasi', country: 'India', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=400&auto=format&fit=crop', rating: 4.7, reviewCount: 74000, tagline: 'Spiritual heart on the Ganges ghats' },
    { id: 'andaman', name: 'Andaman Islands', country: 'India', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=400&auto=format&fit=crop', rating: 4.7, reviewCount: 53000, tagline: 'Turquoise waters, coral reefs & white sand' },
  ], []);

  const fetchReviewsForCard = async (destination: string, destId: string) => {
    if (expandedReviews[destId]?.length || loadingReviews[destId]) return;
    setLoadingReviews(prev => ({ ...prev, [destId]: true }));
    try {
      const data = await fetchExternalReviews(destination);
      setExpandedReviews(prev => ({ ...prev, [destId]: data }));
    } catch {
      setExpandedReviews(prev => ({ ...prev, [destId]: [] }));
    } finally {
      setLoadingReviews(prev => ({ ...prev, [destId]: false }));
    }
  };

  const getPanelStyle = (index: number) => {
    const card = cardRefs.current[index];
    if (!card) return {};
    const rect = card.getBoundingClientRect();
    const containerRect = card.parentElement?.getBoundingClientRect();
    if (!containerRect) return {};
    // Position panel to the right of the card, within viewport
    const panelWidth = 380; // md:w-[380px]
    const gap = 12; // ml-3
    let left = rect.right - containerRect.left + gap;
    const maxLeft = containerRect.width - panelWidth - 8;
    if (left > maxLeft) left = maxLeft;
    if (left < 0) left = 8;
    const top = rect.top - containerRect.top;
    return { left: `${left}px`, top: `${top}px`, width: `${panelWidth}px` };
  };

  return (
    <section className="mt-16" aria-labelledby="popular-heading">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-coral mb-1.5">
            Popular in India
          </p>
          <h2 id="popular-heading" className="text-2xl font-black text-brand-navy">
            Top rated destinations nearby
          </h2>
        </div>
      </div>

      <div className="relative">
        <div
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory"
          style={{ scrollPaddingLeft: 24, scrollPaddingRight: 24 }}
        >
          {popularDestinations.map((dest, index) => (
            <motion.div
              key={dest.id}
              ref={(el) => { cardRefs.current[index] = el; }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="relative flex-shrink-0 snap-start w-72 md:w-80"
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Card */}
              <div className={`relative group bg-white/90 backdrop-blur border border-brand-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ${hoveredIndex === index ? 'z-10' : ''}`}>
                {/* Image */}
                <div className="relative h-40 md:h-44 overflow-hidden">
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <p className="text-white font-black text-lg leading-tight drop-shadow-md">{dest.name}</p>
                      <p className="text-white/90 text-xs font-medium flex items-center gap-1 drop-shadow-sm">
                        <MapPin className="w-3 h-3" /> {dest.country}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-full px-3 py-1.5">
                      <Star className="w-4 h-4 fill-brand-amber text-brand-amber" />
                      <span className="font-black text-brand-navy tabular-nums">{dest.rating.toFixed(1)}</span>
                      <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">{dest.reviewCount.toLocaleString()}+</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <p className="text-sm text-brand-slate mb-3 line-clamp-2">{dest.tagline}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-brand-border">
                    <span className="text-xs font-bold text-brand-muted uppercase tracking-widest">
                      {dest.reviewCount.toLocaleString()} reviews
                    </span>
                    <span className="text-xs font-medium text-brand-coral/70 hidden sm:block">
                      Hover for reviews
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Hover Side Panel - rendered outside scroll container */}
        <AnimatePresence mode="wait">
          {hoveredIndex !== null && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              style={getPanelStyle(hoveredIndex)}
              className="absolute bg-white/75 backdrop-blur-xl rounded-2xl p-5 overflow-auto z-30 border border-brand-border/30 shadow-2xl pointer-events-auto"
              onMouseEnter={() => {
                clearCloseTimeout();
                const dest = popularDestinations[hoveredIndex!];
                if (!expandedReviews[dest.id]?.length && !loadingReviews[dest.id]) {
                  fetchReviewsForCard(dest.name, dest.id);
                }
              }}
              onMouseLeave={handleMouseLeave}
            >
              {(() => {
                const dest = popularDestinations[hoveredIndex!];
                return (
                  <>
                    {/* Rating Circle */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="relative w-24 h-24 flex-shrink-0">
                        <svg viewBox="0 0 96 96" className="w-full h-full transform -rotate-90">
                          <circle
                            cx="48" cy="48" r="40"
                            stroke="rgba(14,23,42,0.1)"
                            strokeWidth="8"
                            fill="none"
                          />
                          <motion.circle
                            cx="48" cy="48" r="40"
                            stroke="url(#rating-gradient)"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            initial={{ strokeDashoffset: 251 }}
                            animate={{ strokeDashoffset: 251 - (251 * dest.rating / 5) }}
                            transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                          />
                          <defs>
                            <linearGradient id="rating-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#f97316" />
                              <stop offset="100%" stopColor="#f59e0b" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-brand-navy tabular-nums">{dest.rating.toFixed(1)}</span>
                          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">/ 5.0</span>
                        </div>
                      </div>
                      <div className="flex-1 ml-4 min-w-0">
                        <p className="font-black text-brand-navy text-lg truncate">{dest.name}</p>
                        <p className="text-sm text-brand-muted">{dest.reviewCount.toLocaleString()} Google reviews</p>
                        <p className="text-xs text-brand-coral/80 font-semibold mt-1">{dest.tagline}</p>
                      </div>
                    </div>

                    {/* Review snippets */}
                    <div className="space-y-3 max-h-[500px] overflow-auto pr-2">
                      {expandedReviews[dest.id] && expandedReviews[dest.id].length > 0 ? (
                        expandedReviews[dest.id]!.slice(0, 5).map((review, ri) => (
                          <motion.div
                            key={`${review.author}-${ri}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: ri * 0.05 }}
                            className="bg-white/80 backdrop-blur border border-brand-border/50 rounded-xl p-3"
                          >
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-sand to-brand-blush/40 flex items-center justify-center shrink-0">
                                  <UserIcon className="w-3.5 h-3.5 text-brand-muted" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-brand-navy text-sm truncate">{review.author}</p>
                                  {review.visitedAt && (
                                    <p className="text-[9px] uppercase tracking-wider text-brand-muted font-medium">
                                      Visited {review.visitedAt}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {review.rating != null && <Stars rating={Math.round(review.rating)} size={11} />}
                            </div>
                            <p className="text-sm text-brand-slate leading-relaxed break-words border-l-[2px] border-brand-coral/40 pl-3">
                              {review.text}
                            </p>
                          </motion.div>
                        ))
                      ) : loadingReviews[dest.id] ? (
                        <div className="flex items-center justify-center py-8 text-brand-muted text-sm">
                          <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand-coral" />
                          Loading reviews…
                        </div>
                      ) : (
                        <div className="text-center py-6 text-brand-muted text-sm space-y-2">
                          <p>Reviews load when you hover</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchReviewsForCard(dest.name, dest.id);
                            }}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-coral hover:bg-brand-coral/90 px-4 py-2 rounded-full transition-colors mx-auto"
                          >
                            Read reviews
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Sign in prompt */}
                    <div className="mt-4 pt-4 border-t border-brand-border/50 text-center">
                      {user ? (
                        <span className="text-sm font-medium text-brand-coral">Signed in — you can add your review from the search above</span>
                      ) : (
                        <button
                          onClick={() => {
                            const ev = new CustomEvent('navigate', { detail: 'auth' });
                            window.dispatchEvent(ev);
                          }}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-coral hover:bg-brand-coral/90 px-4 py-2 rounded-full transition-colors"
                        >
                          <Heart className="w-4 h-4" />
                          Sign in to add your review
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* Scroll hint gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none bg-gradient-to-l from-white to-transparent" />
    </section>
  );
}

export default function ReviewsPage() {
  const { state, navigate } = useTripStore();
  // `search` is written by ReviewDestinations' search box and read by GoogleReviews.
  // The indirection is the point: one query drives both the traveller reviews and
  // the Google lookup, so a reader looking for "Goa" sees community reports and
  // independent ones from a single term instead of two competing inputs.
  const [search, setSearch] = useState('');

  const onSearch = (term: string) => setSearch(term);

  return (
    <div className="page-offset-nav w-full max-w-6xl mx-auto px-6 pb-24">
      <header className="text-center mb-12">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-brand-coral bg-white/70 border border-brand-border rounded-full px-4 py-1.5 mb-5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Traveller reports
        </motion.p>
        <h1 className="font-head text-4xl sm:text-5xl font-black text-brand-navy mb-4">
          What the trip <span className="text-gradient-duo">actually</span> felt like
        </h1>
        <p className="text-brand-muted text-lg max-w-xl mx-auto leading-relaxed">
          {state.user
            ? 'Add a review to your trip, and read what other travellers reported on the ground.'
            : 'Search any destination for independent Google reviews, and sign in to add what you found.'}
        </p>
      </header>

      <ReviewDestinations user={state.user} onLogin={() => navigate('auth')} onSearch={onSearch} />

      <PopularDestinationCards user={state.user} />

      <GoogleReviews destination={search} />
    </div>
  );
}
