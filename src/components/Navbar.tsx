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

// Animated E+T → Rocket/Plane Logo Component (matches quick.png design)
function ETPlaneLogo() {
  return (
    <svg width="44" height="44" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Dark navy from quick.png: #2A3854 */}
        <linearGradient id="navy-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e2a4a" />
          <stop offset="50%" stopColor="#2a3854" />
          <stop offset="100%" stopColor="#1a2840" />
        </linearGradient>
        {/* Bright cyan from quick.png: #5DD1FD */}
        <linearGradient id="cyan-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3ab8f5" />
          <stop offset="50%" stopColor="#5dd1fd" />
          <stop offset="100%" stopColor="#3ab8f5" />
        </linearGradient>
        {/* Pink accent from quick.png: #FF8A93 */}
        <linearGradient id="pink-accent-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6b7a" />
          <stop offset="50%" stopColor="#ff8a93" />
          <stop offset="100%" stopColor="#ff6b7a" />
        </linearGradient>
        {/* Engine glow */}
        <radialGradient id="engine-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5dd1fd" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#5dd1fd" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#2a3854" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Phase 1: E and T enter from sides and orbit each other */}
      <motion.g
        initial={{ opacity: 1, x: -300, y: 0, scale: 1.2, rotate: 0 }}
        animate={{
          x: [ -300, -100, -30, 0, 0 ],
          y: [ 0, -80, 40, -20, 0 ],
          scale: [ 1.2, 1.3, 1.1, 1, 1 ],
          rotate: [ 0, -180, -360, -720, 0 ],
          opacity: [ 1, 1, 1, 1, 1 ]
        }}
        transition={{ duration: 2.8, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
      >
        <text
          x="128"
          y="280"
          font-size="160"
          font-weight="900"
          fill="url(#navy-gradient)"
          font-family="Arial, Helvetica, sans-serif"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          E
        </text>
      </motion.g>

      <motion.g
        initial={{ opacity: 1, x: 300, y: 0, scale: 1.2, rotate: 0 }}
        animate={{
          x: [ 300, 100, 30, 0, 0 ],
          y: [ 0, 80, -40, 20, 0 ],
          scale: [ 1.2, 1.3, 1.1, 1, 1 ],
          rotate: [ 0, 180, 360, 720, 0 ],
          opacity: [ 1, 1, 1, 1, 1 ]
        }}
        transition={{ duration: 2.8, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
      >
        <text
          x="384"
          y="280"
          font-size="160"
          font-weight="900"
          fill="url(#navy-gradient)"
          font-family="Arial, Helvetica, sans-serif"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          T
        </text>
      </motion.g>

      {/* Phase 2: Clump together at center */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0, 0, 1, 1], scale: [0.5, 0.5, 0.5, 1.2, 1] }}
        transition={{ duration: 0.7, delay: 2.5, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ transformOrigin: 'center' }}
      >
        <text
          x="256"
          y="270"
          font-size="180"
          font-weight="900"
          fill="url(#navy-gradient)"
          font-family="Arial, Helvetica, sans-serif"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          ET
        </text>
      </motion.g>

      {/* Phase 3: Transform into quick.png style rocket/plane */}
      <g>
        {/* ===== ROCKET BODY (dark navy) ===== */}
        <motion.path
          fill="url(#navy-gradient)"
          d="
            M 256 480
            L 256 120
            C 256 80, 220 40, 180 40
            L 100 40
            C 60 40, 30 70, 30 110
            L 30 200
            C 30 260, 60 300, 100 300
            L 160 300
            L 160 400
            C 160 440, 190 470, 256 480
            Z
          "
          initial={{ opacity: 0, scaleY: 0, transformOrigin: 'bottom center' }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 1.0, delay: 2.2, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Nose cone - bright cyan */}
        <motion.path
          fill="url(#cyan-gradient)"
          d="
            M 180 40
            L 256 5
            L 332 40
            L 180 40
            Z
          "
          initial={{ opacity: 0, scale: 0, transformOrigin: 'center' }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 2.4, ease: [0.34, 1.56, 0.64, 1] }}
        />

        {/* ===== CYAN WINGS/FINS ===== */}
        {/* Left wing */}
        <motion.path
          fill="url(#cyan-gradient)"
          d="
            M 180 200
            L 80 280
            L 160 300
            L 200 220
            Z
          "
          initial={{ opacity: 0, scale: 0, transformOrigin: 'top right' }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 2.6, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Right wing */}
        <motion.path
          fill="url(#cyan-gradient)"
          d="
            M 332 200
            L 432 280
            L 352 300
            L 312 220
            Z
          "
          initial={{ opacity: 0, scale: 0, transformOrigin: 'top left' }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 2.7, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* ===== ENGINE/EXHAUST (bright cyan glow) ===== */}
        <motion.path
          fill="url(#engine-glow)"
          d="
            M 200 480
            L 256 520
            L 312 480
            C 312 480, 256 510, 200 480
            Z
          "
          initial={{ opacity: 0, scaleY: 0, transformOrigin: 'top center' }}
          animate={{ opacity: [0.3, 0.8, 0.5, 0.8, 0.3], scaleY: [0.5, 1, 0.8, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 3.0, ease: 'easeInOut' }}
        />

        {/* Engine core */}
        <motion.circle
          cx="256"
          cy="470"
          r="12"
          fill="url(#cyan-gradient)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 2.8, ease: [0.34, 1.56, 0.64, 1] }}
        />

        {/* ===== PINK ACCENT - Tail flame/accent ===== */}
        <motion.path
          fill="url(#pink-accent-gradient)"
          d="
            M 230 480
            L 256 510
            L 282 480
            Z
          "
          initial={{ opacity: 0, scale: 0, transformOrigin: 'top center' }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 2.8, ease: [0.34, 1.56, 0.64, 1] }}
        />

        {/* Pink accent on nose */}
        <motion.circle
          cx="256"
          cy="55"
          r="8"
          fill="url(#pink-accent-gradient)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 2.5, ease: [0.34, 1.56, 0.64, 1] }}
        />

        {/* ===== WINDOWS (small cyan accents) ===== */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 3.2 }}>
          <circle cx="256" cy="180" r="10" fill="url(#cyan-gradient)" />
          <circle cx="256" cy="240" r="8" fill="url(#cyan-gradient)" />
          <circle cx="256" cy="300" r="8" fill="url(#cyan-gradient)" />
          <circle cx="256" cy="360" r="8" fill="url(#cyan-gradient)" />
        </motion.g>

        {/* ===== SUBTLE IDLE ANIMATION ===== */}
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* This creates a subtle floating effect on the whole rocket */}
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
