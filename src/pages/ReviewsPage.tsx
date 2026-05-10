import { useEffect, useState } from 'react';
import { useTripStore } from '../state/tripStore';
import { fetchReviews, submitReview } from '../api/client';
import { Review } from '../types';

export default function ReviewsPage() {
  const { state } = useTripStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // New review form state
  const [destination, setDestination] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    const data = await fetchReviews();
    setReviews(data);
    setLoading(false);
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !comment) return;
    setSubmitting(true);
    
    const newReview = {
      user_id: state.user?.uid || 'anonymous',
      destination,
      rating,
      comment,
      video_url: videoUrl || null,
    };

    const success = await submitReview(newReview);
    if (success) {
      setDestination('');
      setRating(5);
      setComment('');
      setVideoUrl('');
      loadReviews();
    }
    setSubmitting(false);
  };

  return (
    <div style={{ padding: '120px 24px 80px', maxWidth: 1000, margin: '0 auto', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 900, color: '#0c1b33', margin: '0 0 16px' }}>
          Traveler <span className="text-gradient-duo">Reviews</span>
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
          See what others are saying about their trips, and share your own experiences!
        </p>
      </div>

      <div style={{ display: 'grid', gap: 32, gridTemplateColumns: '1fr 350px', alignItems: 'start' }}>
        
        {/* Reviews List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="glass" style={{ padding: 40, textAlign: 'center', borderRadius: 20 }}>
              No reviews yet. Be the first to share!
            </div>
          ) : (
            reviews.map((r, i) => (
              <div key={r.id || i} className="glass anim-fade-up" style={{ padding: 24, borderRadius: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0c1b33' }}>{r.destination}</div>
                  <div style={{ color: '#eab308', letterSpacing: 2 }}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </div>
                </div>
                <p style={{ color: '#334155', lineHeight: 1.6, marginBottom: 16 }}>"{r.comment}"</p>
                
                {r.video_url && (
                  <div style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden', background: '#000', width: '100%', maxWidth: 400 }}>
                    <video controls src={r.video_url} style={{ width: '100%', display: 'block' }} />
                  </div>
                )}
                
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 16 }}>
                  Posted on {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'recently'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Review Form */}
        <div className="glass" style={{ padding: 24, borderRadius: 20, position: 'sticky', top: 100 }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, color: '#0c1b33', marginBottom: 20 }}>
            Add a Review
          </h3>
          <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Destination</label>
              <input 
                type="text" 
                required 
                value={destination} 
                onChange={e => setDestination(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', outline: 'none' }}
                placeholder="e.g. Paris"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Rating (1-5)</label>
              <select 
                value={rating} 
                onChange={e => setRating(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', outline: 'none' }}
              >
                {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Comment</label>
              <textarea 
                required 
                value={comment} 
                onChange={e => setComment(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', outline: 'none', minHeight: 80, resize: 'vertical' }}
                placeholder="How was your trip?"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Video URL (Optional)</label>
              <input 
                type="url" 
                value={videoUrl} 
                onChange={e => setVideoUrl(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', outline: 'none' }}
                placeholder="https://..."
              />
            </div>
            <button 
              type="submit" 
              disabled={submitting}
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', marginTop: 8 }}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
