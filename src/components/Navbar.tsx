import { useTripStore } from '../state/tripStore';
import { Page } from '../types';
import { useState, useLayoutEffect, useRef } from 'react';
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

// Animated E+T Airplane Logo Component - E and T revolve, clump, form plane with pink T at tail
function ETPlaneLogo() {
  return (
    <svg width="56" height="56" viewBox="0 0 1200 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Blue gradient for airplane parts */}
        <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        {/* Pink gradient for T at tail */}
        <linearGradient id="pink-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="50%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#f9a8d4" />
        </linearGradient>
      </defs>

      {/* =================================
           PHASE 1: E and T revolve around each other
      ================================== */}
      {/* Letter E - starts left, orbits to center */}
      <motion.g
        initial={{ opacity: 1, x: -400, y: 0, scale: 1.2, rotate: 0 }}
        animate={{
          x: [ -400, -150, -50, 0, 0 ],
          y: [ 0, -100, 50, -30, 0 ],
          scale: [ 1.2, 1.3, 1.1, 1, 1 ],
          rotate: [ 0, -180, -360, -720, 0 ],
          opacity: [ 1, 1, 1, 1, 1 ]
        }}
        transition={{ duration: 3.2, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
      >
        <text
          x="150"
          y="290"
          font-size="190"
          font-weight="900"
          fill="url(#blue-gradient)"
          font-family="Arial, Helvetica, sans-serif"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          E
        </text>
      </motion.g>

      {/* Letter T - starts right, orbits to center */}
      <motion.g
        initial={{ opacity: 1, x: 400, y: 0, scale: 1.2, rotate: 0 }}
        animate={{
          x: [ 400, 150, 50, 0, 0 ],
          y: [ 0, 100, -50, 30, 0 ],
          scale: [ 1.2, 1.3, 1.1, 1, 1 ],
          rotate: [ 0, 180, 360, 720, 0 ],
          opacity: [ 1, 1, 1, 1, 1 ]
        }}
        transition={{ duration: 3.2, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
      >
        <text
          x="930"
          y="290"
          font-size="190"
          font-weight="900"
          fill="url(#blue-gradient)"
          font-family="Arial, Helvetica, sans-serif"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          T
        </text>
      </motion.g>

      {/* =================================
           PHASE 2: Clump together in center (letters overlap)
      ================================== */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0, 0, 1, 1], scale: [0.5, 0.5, 0.5, 1.2, 1] }}
        transition={{ duration: 0.8, delay: 3.0, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ transformOrigin: 'center' }}
      >
        <text
          x="540"
          y="290"
          font-size="200"
          font-weight="900"
          fill="url(#blue-gradient)"
          font-family="Arial, Helvetica, sans-serif"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          ET
        </text>
      </motion.g>

      {/* =================================
           PHASE 3: Transform into airplane
      ================================== */}
      <g className="airplane">
        {/* Main airplane body - from E's vertical stroke */}
        <motion.path
          className="airplane"
          fill="url(#blue-gradient)"
          d="
            M 230 245
            C 270 205, 330 190, 400 195
            L 720 220
            C 790 225, 855 225, 930 215
            L 985 205
            L 985 295
            L 930 285
            C 855 275, 790 275, 720 280
            L 400 305
            C 330 310, 270 295, 230 255
            Z
          "
          initial={{ opacity: 0, scaleX: 0, transformOrigin: 'left center' }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1.4, delay: 3.8, ease: 'easeOut' }}
        />

        {/* Upper wing - from E's top bar */}
        <motion.path
          className="airplane"
          fill="url(#blue-gradient)"
          d="
            M 475 210
            L 650 55
            C 665 42, 690 42, 710 43
            L 625 220
            Z
          "
          initial={{ opacity: 0, scale: 0.05, transformOrigin: 'left center' }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 3.9, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Lower wing - from E's middle bar */}
        <motion.path
          className="airplane"
          fill="url(#blue-gradient)"
          d="
            M 470 290
            L 650 445
            C 665 458, 690 458, 710 457
            L 625 280
            Z
          "
          initial={{ opacity: 0, scale: 0.05, transformOrigin: 'left center' }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 4.0, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* =================================
             TAIL - formed from T (PINK!)
        ================================== */}
        {/* Tail horizontal stabilizer - from T's horizontal bar */}
        <motion.path
          className="airplane"
          fill="url(#pink-gradient)"
          d="
            M 900 220
            L 985 145
            C 995 136, 1010 135, 1030 136
            L 1010 220
            L 1010 280
            L 1030 365
            C 1010 366, 995 365, 995 356
            L 900 280
            Z
          "
          initial={{ opacity: 0, scale: 0.05, rotate: -15, transformOrigin: 'center' }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.1, delay: 3.7, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Vertical tail fin - from T's vertical stem */}
        <motion.path
          className="airplane"
          fill="url(#pink-gradient)"
          d="
            M 1000 220
            L 1020 220
            L 1020 140
            L 1000 140
            Z
          "
          initial={{ opacity: 0, scaleY: 0, transformOrigin: 'bottom center' }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.8, delay: 3.9, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Pink T letter at the tail - THE KEY REQUIREMENT */}
        <motion.g
          initial={{ opacity: 0, scale: 0.3, rotate: -90 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, delay: 4.2, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ transformOrigin: 'center' }}
        >
          <text
            x="1010"
            y="190"
            font-size="50"
            font-weight="900"
            fill="url(#pink-gradient)"
            font-family="Arial, Helvetica, sans-serif"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            T
          </text>
        </motion.g>
      </g>
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
