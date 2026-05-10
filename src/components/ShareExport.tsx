import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, collection, addDoc, serverTimestamp, auth } from '../lib/firebase';
import { Recommendation, TripPreferences } from '../types';
import { useTripStore } from '../state/tripStore';

// ─── Icons ────────────────────────────────────────────────────────────────────

const ShareIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

const HeartIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const LinkIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── PDF Styles injected at print time ────────────────────────────────────────

function injectPrintStyles(rec: Recommendation, prefs: TripPreferences) {
  const existing = document.getElementById('eeeztrip-print-styles');
  if (existing) existing.remove();

  const totalCost =
    (rec.estimated_cost_breakdown.accommodation || 0) +
    (rec.estimated_cost_breakdown.food || 0) +
    (rec.estimated_cost_breakdown.transport || 0) +
    (rec.estimated_cost_breakdown.activities || 0) +
    (rec.estimated_cost_breakdown.misc || 0);

  const dailyPlanHtml = rec.daily_plan
    .map(
      (day, i) => `
      <div style="page-break-inside:avoid;margin-bottom:20px;background:#f8fafc;border-radius:12px;padding:16px;">
        <div style="font-weight:800;font-size:1rem;color:#0284c7;margin-bottom:10px;">Day ${i + 1}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <div><div style="font-weight:700;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Morning</div><div style="margin-top:4px;font-size:0.9rem;color:#0f172a;">${day.morning}</div></div>
          <div><div style="font-weight:700;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Afternoon</div><div style="margin-top:4px;font-size:0.9rem;color:#0f172a;">${day.afternoon}</div></div>
          <div><div style="font-weight:700;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Evening</div><div style="margin-top:4px;font-size:0.9rem;color:#0f172a;">${day.evening}</div></div>
        </div>
        ${day.stay ? `<div style="margin-top:10px;padding:8px 12px;background:#fff;border-radius:8px;font-size:0.85rem;color:#334155;"><strong>Stay:</strong> ${day.stay}</div>` : ''}
      </div>
    `
    )
    .join('');

  const style = document.createElement('style');
  style.id = 'eeeztrip-print-styles';
  style.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      #eeeztrip-printable, #eeeztrip-printable * { visibility: visible !important; }
      #eeeztrip-printable { 
        position: fixed !important; inset: 0 !important; z-index: 999999 !important;
        background: #fff !important; padding: 40px !important; overflow: auto !important;
      }
    }
  `;
  document.head.appendChild(style);

  let printDiv = document.getElementById('eeeztrip-printable');
  if (!printDiv) {
    printDiv = document.createElement('div');
    printDiv.id = 'eeeztrip-printable';
    document.body.appendChild(printDiv);
  }

  printDiv.innerHTML = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:800px;margin:0 auto;color:#0f172a;">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #e2e8f0;">
        <div style="font-size:0.85rem;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">EeezTrip • AI-Curated Itinerary</div>
        <h1 style="font-size:2.2rem;font-weight:900;margin:0 0 8px;color:#0c1b33;">${rec.title}</h1>
        <p style="font-size:1rem;color:#0284c7;font-style:italic;margin:0 0 12px;">"${rec.tagline}"</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <span style="background:#f0f9ff;color:#0284c7;padding:4px 12px;border-radius:999px;font-size:0.8rem;font-weight:600;">${prefs.mood}</span>
          <span style="background:#fdf2f8;color:#ec4899;padding:4px 12px;border-radius:999px;font-size:0.8rem;font-weight:600;">${prefs.days} Days</span>
          ${prefs.origin ? `<span style="background:#f0fdf4;color:#16a34a;padding:4px 12px;border-radius:999px;font-size:0.8rem;font-weight:600;">${prefs.origin} → ${rec.destination}</span>` : ''}
          <span style="background:#fff7ed;color:#ea580c;padding:4px 12px;border-radius:999px;font-size:0.8rem;font-weight:600;">Budget: ₹${prefs.budget.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <!-- Summary -->
      <p style="color:#334155;line-height:1.7;margin-bottom:28px;font-size:0.95rem;">${rec.summary}</p>

      <!-- Budget Breakdown -->
      <div style="margin-bottom:28px;background:#f8fafc;border-radius:12px;padding:20px;">
        <h2 style="font-size:1rem;font-weight:800;color:#0c1b33;margin:0 0 14px;">💰 Estimated Cost Breakdown</h2>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px;">
          ${[
            ['🏨 Accommodation', rec.estimated_cost_breakdown.accommodation],
            ['🍽️ Food & Dining', rec.estimated_cost_breakdown.food],
            ['🚗 Transport', rec.estimated_cost_breakdown.transport],
            ['🎯 Activities', rec.estimated_cost_breakdown.activities],
            ['📦 Misc', rec.estimated_cost_breakdown.misc],
          ].map(([label, val]) => `<div style="background:#fff;border-radius:8px;padding:10px 12px;"><div style="font-size:0.75rem;color:#64748b;">${label}</div><div style="font-weight:700;color:#0f172a;font-size:1rem;">₹${Number(val).toLocaleString('en-IN')}</div></div>`).join('')}
        </div>
        <div style="border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;">Total Estimated Cost</span>
          <span style="font-size:1.3rem;font-weight:900;color:#0284c7;">₹${totalCost.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <!-- Daily Plan -->
      <h2 style="font-size:1.1rem;font-weight:800;color:#0c1b33;margin-bottom:16px;">📅 Day-by-Day Itinerary</h2>
      ${dailyPlanHtml}

      <!-- Food & Tips -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;">
        <div style="background:#fff7ed;border-radius:12px;padding:16px;">
          <h3 style="font-size:0.9rem;font-weight:800;color:#ea580c;margin:0 0 10px;">🍴 Must Try Food</h3>
          ${rec.must_try_food.map(f => `<div style="font-size:0.85rem;color:#431407;margin-bottom:4px;">• ${f}</div>`).join('')}
        </div>
        <div style="background:#f0fdf4;border-radius:12px;padding:16px;">
          <h3 style="font-size:0.9rem;font-weight:800;color:#16a34a;margin:0 0 10px;">💡 Travel Tips</h3>
          ${rec.cozy_tips.map(t => `<div style="font-size:0.85rem;color:#14532d;margin-bottom:4px;">• ${t}</div>`).join('')}
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top:32px;text-align:center;padding-top:20px;border-top:1px solid #e2e8f0;font-size:0.75rem;color:#94a3b8;">
        Generated by EeezTrip AI • ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}
      </div>
    </div>
  `;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  rec: Recommendation;
  preferences: TripPreferences;
}

export function ShareExport({ rec, preferences }: Props) {
  const { state } = useTripStore();
  const [isOpen, setIsOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleExportPDF = () => {
    setExporting(true);
    injectPrintStyles(rec, preferences);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 300);
  };

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const docRef = await addDoc(collection(db, 'shared_trips'), {
        rec,
        preferences,
        createdAt: serverTimestamp(),
      });
      const url = `${window.location.origin}?shared=${docRef.id}`;
      setShareUrl(url);
    } catch (e) {
      console.error('Failed to generate share link', e);
      // Fallback: just encode state in URL
      const encoded = encodeURIComponent(btoa(JSON.stringify({ rec: { title: rec.title, destination: rec.destination, tagline: rec.tagline }, preferences })));
      setShareUrl(`${window.location.origin}?trip=${encoded.slice(0, 300)}`);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!state.user) {
      alert("Please sign in to save your trip!");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'saved_trips'), {
        userId: state.user.uid,
        rec,
        preferences,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
    } catch (e) {
      console.error('Failed to save trip', e);
      alert("Failed to save trip. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: rec.title,
        text: `Check out this AI-curated trip to ${rec.destination}: "${rec.tagline}"`,
        url: shareUrl || window.location.href,
      }).catch(() => {});
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', gap: 10 }}>
      {/* Save Trip Button */}
      {state.user && (
        <button
          onClick={handleSaveTrip}
          disabled={saving || saved}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 999,
            background: saved ? '#10b981' : '#fff',
            border: saved ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
            color: saved ? '#fff' : '#ef4444', fontFamily: 'Outfit, sans-serif',
            fontWeight: 700, fontSize: '0.9rem',
            cursor: saved ? 'default' : 'pointer', transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
          onMouseEnter={e => { if (!saved) e.currentTarget.style.borderColor = '#ef4444' }}
          onMouseLeave={e => { if (!saved) e.currentTarget.style.borderColor = '#e2e8f0' }}
        >
          {saved ? <CheckIcon /> : <HeartIcon />}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Trip'}
        </button>
      )}

      {/* Export PDF Button */}
      <button
        onClick={handleExportPDF}
        disabled={exporting}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 999,
          background: '#fff',
          border: '1.5px solid #e2e8f0',
          color: '#334155', fontFamily: 'Outfit, sans-serif',
          fontWeight: 700, fontSize: '0.9rem',
          cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#0284c7')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
      >
        <DownloadIcon />
        {exporting ? 'Preparing…' : 'Export PDF'}
      </button>

      {/* Share Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 999,
          background: 'linear-gradient(135deg, #0284c7, #ec4899)',
          border: 'none', color: '#fff',
          fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem',
          cursor: 'pointer', transition: 'transform 0.15s',
          boxShadow: '0 4px 15px rgba(2,132,199,0.3)',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <ShareIcon />
        Share Trip
      </button>

      {/* Share Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute', top: 52, right: 0,
              width: 320,
              background: '#fff',
              borderRadius: 20,
              boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
              border: '1px solid #e2e8f0',
              padding: 20,
              zIndex: 9999,
            }}
          >
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, color: '#0c1b33', fontSize: '1rem' }}>
                Share this trip ✈️
              </span>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                <XIcon />
              </button>
            </div>

            {/* Trip Info */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginBottom: 4 }}>{rec.title}</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{preferences.days} days · {preferences.mood} · {rec.destination}</div>
            </div>

            {/* Generate link */}
            {!shareUrl ? (
              <button
                onClick={handleGenerateLink}
                disabled={generatingLink}
                style={{
                  width: '100%', padding: '12px',
                  background: generatingLink ? '#f1f5f9' : 'linear-gradient(135deg, #0284c7, #ec4899)',
                  color: generatingLink ? '#64748b' : '#fff',
                  border: 'none', borderRadius: 12,
                  fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                  cursor: generatingLink ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginBottom: 12,
                }}
              >
                {generatingLink ? (
                  <>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #cbd5e1', borderTopColor: '#0284c7', animation: 'spin-slow 0.7s linear infinite' }} />
                    Generating link…
                  </>
                ) : (
                  <><LinkIcon /> Generate Shareable Link</>
                )}
              </button>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    readOnly
                    value={shareUrl}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 10,
                      border: '1.5px solid #e2e8f0',
                      background: '#f8fafc', color: '#334155',
                      fontSize: '0.8rem', fontFamily: 'monospace',
                    }}
                  />
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: copied ? '#10b981' : '#0284c7',
                      color: '#fff', border: 'none',
                      cursor: 'pointer', transition: 'background 0.2s',
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: '0.8rem', fontWeight: 700,
                    }}
                  >
                    {copied ? <><CheckIcon /> Copied!</> : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Native Share (mobile) */}
            {typeof navigator.share === 'function' && (
              <button
                onClick={handleNativeShare}
                style={{
                  width: '100%', padding: '10px',
                  background: '#f8fafc', border: '1.5px solid #e2e8f0',
                  borderRadius: 12, color: '#334155',
                  fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.85rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  marginTop: 4,
                }}
              >
                <ShareIcon /> Share via device…
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
