import { useTripStore } from '../state/tripStore';
import { Page } from '../types';
import { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { signOut, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

const BASE_LINKS: { page: Page; label: string }[] = [
  { page: 'landing', label: 'Home' },
  { page: 'reviews', label: 'Reviews' },
  { page: 'start', label: 'Get Started' },
];

const PAGE_PROGRESS: Record<Page, number> = {
  landing: 0,
  choice: 12,
  start: 25,
  'mood-start': 25,
  'mood-destination': 38,
  preferences: 50,
  results: 75,
  booking: 100,
  dashboard: 75,
  reviews: 20,
  // Sign-in is not a step in planning a trip, so it shows a neutral sliver of
  // progress rather than implying the reader is partway through.
  auth: 0,
};

// Animated E+T Airplane Logo Component
function ETPlaneLogo() {
  const [isAssembled, setIsAssembled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAssembled(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <svg width="56" height="56" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="et-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* === LETTER E - becomes wings + forepart === */}
      <motion.g
        filter="url(#glow)"
        initial={{ opacity: 1, x: -60, y: 20, scale: 0.8, rotate: -15 }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
        transition={{ duration: 1.2, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ transformOrigin: 'center center' }}
      >
        {/* E vertical spine - becomes front fuselage */}
        <motion.rect
          x="28" y="20" width="8" height="60" rx="4"
          fill="url(#et-gradient)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
        />
        {/* E top bar - becomes left wing */}
        <motion.rect
          x="28" y="20" width="35" height="6" rx="3"
          fill="url(#et-gradient)"
          initial={{ x: 60, y: -20, scaleX: 0.3, rotate: -45, opacity: 0 }}
          animate={{ x: 0, y: 0, scaleX: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        />
        {/* E middle bar - becomes right wing */}
        <motion.rect
          x="28" y="47" width="35" height="6" rx="3"
          fill="url(#et-gradient)"
          initial={{ x: 60, y: 40, scaleX: 0.3, rotate: 45, opacity: 0 }}
          animate={{ x: 0, y: 0, scaleX: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        />
        {/* E bottom bar - becomes fuselage bottom */}
        <motion.rect
          x="28" y="74" width="28" height="5" rx="2.5"
          fill="url(#et-gradient)"
          initial={{ x: 50, y: 50, scaleX: 0.2, opacity: 0 }}
          animate={{ x: 0, y: 0, scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
        />
      </motion.g>

      {/* === LETTER T - becomes tail section === */}
      <motion.g
        filter="url(#glow)"
        initial={{ opacity: 1, x: 60, y: -20, scale: 0.8, rotate: 15 }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
        transition={{ duration: 1.2, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ transformOrigin: 'center center' }}
      >
        {/* T horizontal - becomes horizontal stabilizer (tail wings) */}
        <motion.rect
          x="56" y="28" width="40" height="5" rx="2.5"
          fill="url(#et-gradient)"
          initial={{ x: -40, scaleX: 0, opacity: 0 }}
          animate={{ x: 0, scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        />
        {/* T vertical - becomes vertical stabilizer (tail fin) */}
        <motion.rect
          x="74" y="28" width="6" height="40" rx="3"
          fill="url(#et-gradient)"
          initial={{ y: -40, scaleY: 0, opacity: 0 }}
          animate={{ y: 0, scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        />
        {/* Tail fin tip */}
        <motion.path
          d="M96 68 L100 78 L92 78 Z"
          fill="url(#et-gradient)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.0, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </motion.g>

      {/* === Engine glow / motion particles === */}
      <motion.g opacity={0.3} filter="url(#glow)">
        <motion.circle
          cx="14" cy="50" r="3"
          fill="url(#et-gradient)"
          initial={{ opacity: 0, r: 0 }}
          animate={{ opacity: [0, 1, 0], r: [1, 4, 2] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 1.2, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="10" cy="54" r="2"
          fill="url(#et-gradient)"
          initial={{ opacity: 0, r: 0 }}
          animate={{ opacity: [0, 1, 0], r: [1, 3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 1.4, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="6" cy="58" r="2"
          fill="url(#et-gradient)"
          initial={{ opacity: 0, r: 0 }}
          animate={{ opacity: [0, 1, 0], r: [1, 3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 1.6, ease: 'easeInOut' }}
        />
      </motion.g>

      {/* === Continuous subtle motion when assembled === */}
      {isAssembled && (
        <motion.g filter="url(#glow)">
          {/* Gentle bobbing motion */}
          <motion.g
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Re-apply the assembled shapes for continuous animation */}
          </motion.g>
        </motion.g>
      )}
    </svg>
  );
}

export default function Navbar() {
  const { state, navigate } = useTripStore();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const progress = PAGE_PROGRESS[state.page];
  const headerRef = useRef<HTMLElement>(null);

  // This header is fixed, so every page has to reserve exactly its height or the
  // first block of content sits underneath it. The height is not a constant: the
  // nav is a single flex row, so on a narrow viewport the links and CTA wrap
  // *inside* their buttons and the bar grows. Publishing the measured height as
  // `--nav-h` lets pages offset by the truth rather than a guessed constant that
  // silently goes stale at other viewport widths.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () => {
      document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`);
    };
    publish();
    // jsdom has no ResizeObserver, so a test that mounts this would throw on
    // construction. Fall back to the resize event, which is the bulk of what the
    // observer is reacting to anyway.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', publish);
      return () => window.removeEventListener('resize', publish);
    }
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sign-in lives on its own page now, so that Google, Outlook and email are
  // reachable from one place. The button used to open a Google popup directly,
  // which made the other two providers impossible to offer and gave a failed
  // sign-in nowhere to report itself.
  const handleSignIn = () => navigate('auth');

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setUserDropdownOpen(false);
      if (state.page === 'dashboard') navigate('landing');
    } catch (e) {
      console.error("Sign out failed", e);
    }
  };

  return (
    <header ref={headerRef} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: '12px 24px',
    }}>
      <nav style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        /* The labels below are nowrap so they cannot stack into a taller bar.
           Without a wrap here that trades a height problem for a horizontal one:
           the nav needs ~650px, so on a phone it pushed the fixed header wider
           than the viewport and dragged the page sideways. Wrapping moves whole
           items onto the next row instead — and `--nav-h` then reports the extra
           height, so pages still clear it. */
        flexWrap: 'wrap',
        rowGap: 10,
        justifyContent: 'space-between',
        background: 'rgba(240,249,255,0.82)',
        border: '1px solid rgba(186,230,253,0.7)',
        borderRadius: 999,
        padding: '10px 20px',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 4px 24px rgba(56,189,248,0.1)',
      }}>
        {/* Brand */}
        <button
          onClick={() => navigate('landing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            minWidth: 44,
            minHeight: 44,
          }}
        >
          <ETPlaneLogo />
          <span style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 800,
            fontSize: '1.15rem',
            background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            EeezTrip
          </span>
        </button>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {(() => {
            const navLinks = [...BASE_LINKS];
            if (state.preferences.destination.trim().length > 0) {
              navLinks.push({ page: 'preferences', label: 'Preferences' });
            }
            if (state.recommendation) {
              navLinks.push({ page: 'results', label: 'Results' });
            }
            return navLinks;
          })().map(({ page, label }) => {
            const active = state.page === page;
            return (
              <button
                key={page}
                onClick={() => navigate(page)}
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.875rem',
                  color: active ? '#0284c7' : '#3f7295',
                  background: active ? 'rgba(56,189,248,0.12)' : 'none',
                  border: 'none',
                  borderRadius: 999,
                  padding: '11px 16px',
                  minHeight: 44,
                  /* Without this the label wraps inside the button on narrow
                     viewports, which grows the fixed bar over the page content. */
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#0284c7';
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#3f7295';
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => navigate('choice')}
            className="btn btn-primary btn-sm"
            style={{ borderRadius: 999 }}
          >
            Plan a Trip ✈
          </button>

          {state.user ? (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  background: 'none', padding: 0, cursor: 'pointer',
                  width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
                  border: '2px solid #0284c7'
                }}
              >
                <img src={state.user.photoURL || `https://ui-avatars.com/api/?name=${state.user.displayName}`} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>

              <AnimatePresence>
                {userDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute', top: 50, right: 0,
                      background: '#fff', borderRadius: 16,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                      border: '1px solid #e2e8f0', overflow: 'hidden',
                      width: 200, zIndex: 999,
                    }}
                  >
                    <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{state.user.displayName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{state.user.email}</div>
                    </div>
                    <div style={{ padding: 8, display: 'flex', flexDirection: 'column' }}>
                      <button 
                        onClick={() => { navigate('dashboard'); setUserDropdownOpen(false); }}
                        style={{ background: 'none', border: 'none', padding: '10px 12px', textAlign: 'left', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        🗺️ My Trips
                      </button>
                      <button 
                        onClick={handleSignOut}
                        style={{ background: 'none', border: 'none', padding: '10px 12px', textAlign: 'left', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#dc2626' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600, fontSize: '0.9rem',
                color: '#fff', background: '#0f172a',
                border: 'none', borderRadius: 999,
                padding: '8px 20px', minHeight: 44, cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#334155'}
              onMouseLeave={e => e.currentTarget.style.background = '#0f172a'}
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Progress bar */}
      {state.page !== 'landing' && (
        <div style={{
          maxWidth: 1200,
          margin: '6px auto 0',
          height: 3,
          borderRadius: 2,
          background: 'rgba(186,230,253,0.4)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #0ea5e9, #ec4899)',
            borderRadius: 2,
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      )}
    </header>
  );
}
