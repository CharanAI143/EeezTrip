import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, User as UserIcon, Star, Sparkles, MapPin, Heart, PenLine, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReviewDestinations } from '../components/ReviewDestinations';
import { useTripStore } from '../state/tripStore';
import { fetchExternalReviewsBundle } from '../api/client';
import type { DestinationReview, ExternalReview, ExternalReviewsBundle, ExternalReviewSource } from '../types';

const SOURCE_LABELS: Record<ExternalReviewSource, string> = {
  google: 'Google',
  tripadvisor: 'Tripadvisor',
  makemytrip: 'MakeMyTrip',
  booking: 'Booking.com',
};

// Tripadvisor first: it is the source that answers for cities, so it leads
// wherever it has something. Google is last because for city-level
// destinations it usually has nothing.
const SOURCE_ORDER: ExternalReviewSource[] = ['tripadvisor', 'makemytrip', 'booking', 'google'];

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

/** Case-insensitive "is this review about that place" — "Goa" matches "goa, india". */
function matchesDestination(reviewDestination: string, needle: string): boolean {
  const place = reviewDestination.trim().toLowerCase();
  const wanted = needle.trim().toLowerCase();
  return Boolean(place && wanted && (place.includes(wanted) || wanted.includes(place)));
}

function travellerMatches(reviews: DestinationReview[], destination: string): DestinationReview[] {
  return reviews.filter(r => matchesDestination(r.destination, destination));
}

const emptyBundle = (destination: string): ExternalReviewsBundle => ({
  destination,
  reviews: [],
  sources: {},
  links: {},
  count: 0,
  failed: [],
});

/**
 * One EeezTrip traveller review, compact enough for the hover panel and the
 * grouped page section alike.
 */
function TravellerReviewCard({ review }: { review: DestinationReview }) {
  return (
    <article className="bg-white/80 backdrop-blur border border-brand-border/50 rounded-xl p-3">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-sand to-brand-blush/40 flex items-center justify-center shrink-0">
            <UserIcon className="w-3.5 h-3.5 text-brand-muted" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-brand-navy text-sm truncate">{review.userName}</p>
            <p className="text-[9px] uppercase tracking-wider text-brand-muted font-medium">EeezTrip traveller</p>
          </div>
        </div>
        <Stars rating={Math.round(review.rating)} size={11} />
      </div>
      <p className="text-sm text-brand-slate leading-relaxed break-words border-l-[2px] border-brand-coral/40 pl-3">
        {review.review}
      </p>
    </article>
  );
}

/**
 * One third-party review, badged with the site it came from so it can never
 * read as a fellow traveller's words.
 */
function ExternalReviewCard({ review, compact = false }: { review: ExternalReview; compact?: boolean }) {
  const source = review.source && SOURCE_LABELS[review.source] ? SOURCE_LABELS[review.source] : 'Reviews';
  const body = (
    <>
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
      {/* break-words: review text routinely contains bare URLs, and a long
          unbreakable token would otherwise widen the whole grid past the
          page's max width. */}
      <p className="text-sm text-brand-slate leading-relaxed break-words border-l-[2px] border-brand-coral/40 pl-3">
        {review.text}
      </p>
    </>
  );

  const className = `bg-white/80 backdrop-blur border border-brand-border/50 rounded-xl p-3 ${compact ? '' : 'p-5'}`;

  return (
    <div className={className}>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-coral mb-2">{source}</p>
      {review.url ? (
        <a
          href={review.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group hover:opacity-90 transition-opacity"
        >
          {body}
        </a>
      ) : (
        body
      )}
    </div>
  );
}

/** "More on Tripadvisor →" style outbound links for everything we only sampled. */
function SourceLinks({ links }: { links: Partial<Record<ExternalReviewSource, string>> }) {
  const entries = SOURCE_ORDER.filter(s => links[s]);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(source => (
        <a
          key={source}
          href={links[source]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-navy bg-brand-sand hover:bg-brand-border px-3 py-1.5 rounded-full transition-colors"
        >
          More on {SOURCE_LABELS[source]}
          <ExternalLink className="w-3 h-3" />
        </a>
      ))}
    </div>
  );
}

/**
 * The combined review view for one destination: EeezTrip travellers first
 * (only when there are any), then the third-party sources. When a place has no
 * reviews from anyone, the empty state invites the visitor to become the
 * first — which is how a location with no reviews gets its reviews.
 */
function GroupedReviews({
  destination,
  travellerReviews,
  bundle,
  loading,
  requested,
  onWriteReview,
  onRetry,
  user,
  compact = false,
}: {
  destination: string;
  travellerReviews: DestinationReview[];
  bundle: ExternalReviewsBundle;
  loading: boolean;
  requested: boolean;
  onWriteReview: (destination: string) => void;
  onRetry?: () => void;
  user: { uid: string } | null;
  compact?: boolean;
}) {
  const ours = travellerMatches(travellerReviews, destination);
  const groups = SOURCE_ORDER
    .map(source => ({ source, reviews: bundle.sources[source] ?? [] }))
    .filter(group => group.reviews.length > 0);

  const nothingAtAll = !loading && requested && ours.length === 0 && groups.length === 0;

  if (nothingAtAll) {
    // A source that errored means we do not know whether this place has
    // reviews — offering to "write the first one" about, say, Varanasi would
    // be a lie the visitor pays for with their time.
    const degraded = bundle.failed.length > 0;
    return (
      <div className="text-center py-6 px-4 bg-white/70 border border-dashed border-brand-border rounded-2xl space-y-3">
        <p className="text-sm font-bold text-brand-navy">
          {degraded
            ? `Couldn't load reviews for ${destination}`
            : `No reviews yet for ${destination}`}
        </p>
        <p className="text-xs text-brand-muted leading-relaxed">
          {degraded
            ? 'The travel sites did not answer, so we cannot say whether anyone has reviewed it. This is a hiccup, not an empty page.'
            : `Nobody has reported on ${destination} — from EeezTrip or anywhere else. Be the first, and your review becomes the place's first review.`}
        </p>
        {degraded ? (
          onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-navy hover:bg-brand-navy/90 px-4 py-2 rounded-full transition-colors mx-auto"
            >
              Try again
            </button>
          )
        ) : (
          <button
            onClick={() => onWriteReview(destination)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-coral hover:bg-brand-coral/90 px-4 py-2 rounded-full transition-colors mx-auto"
          >
            <PenLine className="w-4 h-4" />
            {user ? `Review ${destination}` : 'Sign in to review'}
          </button>
        )}
      </div>
    );
  }

  if (loading && ours.length === 0 && groups.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-brand-muted text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand-coral" />
        Loading reviews…
      </div>
    );
  }

  const limit = compact ? 2 : 4;

  return (
    <div className="space-y-4">
      {ours.length > 0 && (
        <div>
          {!compact && (
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-coral mb-2">
              From EeezTrip travellers
            </p>
          )}
          <div className={compact ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-5'}>
            {ours.slice(0, limit).map(review => (
              <TravellerReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      )}

      {groups.map(({ source, reviews }) => (
        <div key={source}>
          {!compact && (
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-coral mb-2">
              From {SOURCE_LABELS[source]}
            </p>
          )}
          <div className={compact ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-5'}>
            {reviews.slice(0, limit).map((review, i) => (
              <ExternalReviewCard key={`${source}-${review.author}-${i}`} review={review} compact={compact} />
            ))}
          </div>
        </div>
      ))}

      {!compact && <SourceLinks links={bundle.links} />}
    </div>
  );
}

/**
 * The search-driven combined section below the traveller list: one search term
 * drives the Firestore filter above and every third-party source here, so a
 * reader looking for "Goa" sees community reports and independent ones from a
 * single input instead of two competing ones.
 */
function DestinationReviewsSection({
  destination,
  travellerReviews,
  user,
  onWriteReview,
}: {
  destination: string;
  travellerReviews: DestinationReview[];
  user: { uid: string } | null;
  onWriteReview: (destination: string) => void;
}) {
  const [bundle, setBundle] = useState<ExternalReviewsBundle>(emptyBundle(''));
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  // Bumped by the "Try again" button: a source that errored is worth another
  // request, and the retry must not change the query to do it.
  const [reload, setReload] = useState(0);

  const query = destination.trim();

  useEffect(() => {
    if (!query) {
      setBundle(emptyBundle(''));
      setRequested(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setRequested(true);

    fetchExternalReviewsBundle(query)
      .then(data => {
        if (!cancelled) setBundle(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, reload]);

  const summary = useMemo(() => {
    const rated = bundle.reviews
      .map(r => r.rating)
      .filter((r): r is number => typeof r === 'number');
    const average = rated.length ? rated.reduce((sum, r) => sum + r, 0) / rated.length : null;
    const total = bundle.reviews.find(r => r.totalReviews != null)?.totalReviews ?? null;
    return { average, total };
  }, [bundle]);

  if (!query) return null;

  const ours = travellerMatches(travellerReviews, query);
  const oursRated = ours.map(r => r.rating).filter(r => typeof r === 'number');
  const average = summary.average ??
    (oursRated.length ? oursRated.reduce((sum, r) => sum + r, 0) / oursRated.length : null);
  const thirdPartyCount = bundle.count;

  return (
    <section className="mt-20" aria-labelledby="destination-reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-coral mb-1.5">
            Reviews
          </p>
          <h2 id="destination-reviews-heading" className="text-2xl font-black text-brand-navy">
            What travellers say about {query}
          </h2>
        </div>
        {(average != null || ours.length > 0) && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/80 border border-brand-border rounded-2xl shadow-sm">
            {average != null && (
              <span className="text-2xl font-black text-brand-navy tabular-nums leading-none">
                {average.toFixed(1)}
              </span>
            )}
            <div>
              {average != null && <Stars rating={Math.round(average)} size={14} />}
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted mt-0.5">
                {ours.length > 0 && `${ours.length} from EeezTrip`}
                {ours.length > 0 && thirdPartyCount > 0 && ' · '}
                {thirdPartyCount > 0 && `${thirdPartyCount} from travel sites`}
                {summary.total != null && ` · ${summary.total.toLocaleString()} on Google`}
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-brand-muted mb-6">
        EeezTrip traveller reports alongside Tripadvisor, MakeMyTrip, Booking.com and Google —
        never written by us.
      </p>

      <GroupedReviews
        destination={query}
        travellerReviews={travellerReviews}
        bundle={bundle}
        loading={loading}
        requested={requested}
        onWriteReview={onWriteReview}
        onRetry={() => setReload(value => value + 1)}
        user={user}
      />
    </section>
  );
}

/**
 * Popular destination cards for quick browsing.
 * Shows curated top destinations with rating summary.
 * On hover: transparent overlay with combined reviews and rating circle.
 */
function PopularDestinationCards({
  user,
  travellerReviews,
  onWriteReview,
}: {
  user: { uid: string } | null;
  travellerReviews: DestinationReview[];
  onWriteReview: (destination: string) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<Record<string, ExternalReviewsBundle>>({});
  const [loadingReviews, setLoadingReviews] = useState<Record<string, boolean>>({});
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollEdge, setScrollEdge] = useState({ left: false, right: true });

  // The scrollbar is hidden, so the only signs that more cards exist are the
  // edge fades and the arrows — keep both tied to the real scroll position.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () =>
      setScrollEdge({
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const scrollCards = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 240), behavior: 'smooth' });
  };

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
    if (expandedReviews[destId]?.count || loadingReviews[destId]) return;
    setLoadingReviews(prev => ({ ...prev, [destId]: true }));
    try {
      const data = await fetchExternalReviewsBundle(destination);
      setExpandedReviews(prev => ({ ...prev, [destId]: data }));
    } finally {
      setLoadingReviews(prev => ({ ...prev, [destId]: false }));
    }
  };

  /**
   * "Try again" for a panel whose sources errored: drop the failed bundle
   * first, or the guard above would treat it as an answer we already have.
   */
  const retryReviewsForCard = (destination: string, destId: string) => {
    setExpandedReviews(prev => {
      const next = { ...prev };
      delete next[destId];
      return next;
    });
    void fetchReviewsForCard(destination, destId);
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollCards(-1)}
            disabled={!scrollEdge.left}
            aria-label="Scroll destinations left"
            className="p-2.5 rounded-full border border-brand-border bg-white/90 text-brand-navy hover:bg-white hover:border-brand-coral/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollCards(1)}
            disabled={!scrollEdge.right}
            aria-label="Scroll destinations right"
            className="p-2.5 rounded-full border border-brand-border bg-white/90 text-brand-navy hover:bg-white hover:border-brand-coral/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory scroll-smooth"
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

        {/* Edge fades: shown only on the side that still has cards */}
        {scrollEdge.left && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-4 w-10 bg-gradient-to-r from-white via-white/80 to-transparent" />
        )}
        {scrollEdge.right && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-4 w-14 bg-gradient-to-l from-white via-white/80 to-transparent" />
        )}

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
                if (!expandedReviews[dest.id]?.count && !loadingReviews[dest.id]) {
                  fetchReviewsForCard(dest.name, dest.id);
                }
              }}
              onMouseLeave={handleMouseLeave}
            >
              {(() => {
                const dest = popularDestinations[hoveredIndex!];
                const bundle = expandedReviews[dest.id] ?? emptyBundle(dest.name);
                const hasLoaded = Boolean(expandedReviews[dest.id]);
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

                    {/* Combined reviews: ours first, then travel sites, then Google */}
                    <div className="space-y-4 max-h-[500px] overflow-auto pr-2">
                      {!hasLoaded ? (
                        <div className="text-center py-6 text-brand-muted text-sm space-y-2">
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
                      ) : (
                        <>
                          <GroupedReviews
                            destination={dest.name}
                            travellerReviews={travellerReviews}
                            bundle={bundle}
                            loading={loadingReviews[dest.id] ?? false}
                            requested
                            onWriteReview={onWriteReview}
                            onRetry={() => retryReviewsForCard(dest.name, dest.id)}
                            user={user}
                            compact
                          />
                          {bundle.count > 0 && (
                            <div className="pt-2 border-t border-brand-border/50">
                              <SourceLinks links={bundle.links} />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Write-review prompt */}
                    <div className="mt-4 pt-4 border-t border-brand-border/50 text-center">
                      {user ? (
                        <button
                          onClick={() => onWriteReview(dest.name)}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-coral hover:text-brand-navy transition-colors"
                        >
                          <PenLine className="w-4 h-4" />
                          Write your review of {dest.name}
                        </button>
                      ) : (
                        <button
                          onClick={() => onWriteReview(dest.name)}
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
    </section>
  );
}

export default function ReviewsPage() {
  const { state, dispatch, navigate } = useTripStore();
  // `search` is written by ReviewDestinations' search box and read by the
  // combined section. The indirection is the point: one query drives both the
  // traveller reviews and the third-party lookup, so a reader looking for
  // "Goa" sees community reports and independent ones from a single term
  // instead of two competing inputs.
  const [search, setSearch] = useState('');
  // The traveller review list, fetched once by ReviewDestinations and shared
  // with the card panel and the combined section — one Firestore read, three
  // views that can never disagree.
  const [travellerReviews, setTravellerReviews] = useState<DestinationReview[]>([]);

  const onSearch = (term: string) => setSearch(term);

  /**
   * Start a review for a destination — including one with no reviews at all.
   * Signed in: the form opens prefilled via the store's pending destination.
   * Signed out: the destination is remembered across the sign-in round-trip,
   * so "review later" lands back here with the form ready.
   */
  const writeReviewFor = useCallback((destination: string) => {
    dispatch({ type: 'SET_PENDING_REVIEW_DEST', destination });
    if (!state.user) navigate('auth');
  }, [dispatch, state.user, navigate]);

  const clearPendingReview = useCallback(() => {
    dispatch({ type: 'SET_PENDING_REVIEW_DEST', destination: null });
  }, [dispatch]);

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
            : 'Search any destination for reviews from travellers, Tripadvisor, MakeMyTrip and Google — and sign in to add what you found.'}
        </p>
      </header>

      <ReviewDestinations
        user={state.user}
        onLogin={() => navigate('auth')}
        onSearch={onSearch}
        onReviewsLoaded={setTravellerReviews}
        openFor={state.user ? state.pendingReviewDestination : null}
        onOpened={clearPendingReview}
      />

      <PopularDestinationCards
        user={state.user}
        travellerReviews={travellerReviews}
        onWriteReview={writeReviewFor}
      />

      <DestinationReviewsSection
        destination={search}
        travellerReviews={travellerReviews}
        user={state.user}
        onWriteReview={writeReviewFor}
      />
    </div>
  );
}
