import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Loader2, User as UserIcon, Star, Sparkles, WifiOff } from 'lucide-react';
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

      <GoogleReviews destination={search} />
    </div>
  );
}
