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

// Animated EEEZTRIP → Airplane Logo Component
function ETPlaneLogo() {
  return (
    <svg width="44" height="44" viewBox="0 0 1200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="pink-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="50%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#f9a8d4" />
        </linearGradient>
      </defs>

      {/* Phase 1: EEEZTRIP word appears - EEEZ blue, TRIP pink */}
      <motion.g
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <text
          x="540"
          y="100"
          font-size="48"
          font-weight="800"
          font-family="Arial, Helvetica, sans-serif"
          text-anchor="middle"
          dominant-baseline="middle"
          letter-spacing="2"
        >
          <tspan fill="url(#blue-gradient)" font-weight="900">EEEZ</tspan>
          <tspan fill="url(#pink-gradient)" font-weight="900">TRIP</tspan>
        </text>
      </motion.g>

      {/* Phase 2: Letters melt together - merge into center */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 1, 0] }}
        transition={{ duration: 4.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Melt phase - letters compress toward center */}
        <motion.text
          x="540"
          y="100"
          font-size="48"
          font-weight="800"
          font-family="Arial, Helvetica, sans-serif"
          text-anchor="middle"
          dominant-baseline="middle"
          letter-spacing={[-2, -4, -8, -12, -20]}
          fill="url(#blue-gradient)"
        >
          EEEZTRIP
        </motion.text>
      </motion.g>

      {/* Phase 3: Melted blob transforms into airplane */}
      <motion.g
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: [0, 0, 0, 1], scale: [0.5, 0.5, 0.5, 1] }}
        transition={{ duration: 1.5, delay: 3.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <g>
          {/* Main airplane body - blue */}
          <motion.path
            fill="url(#blue-gradient)"
            d="
              M 235 250
              C 265 210, 315 195, 375 198
              L 690 220
              C 775 226, 850 226, 920 218
              L 985 210
              L 985 290
              L 920 282
              C 850 274, 775 274, 690 280
              L 375 302
              C 315 305, 265 290, 235 250
              Z
            "
            initial={{ opacity: 0, scaleX: 0, transformOrigin: 'center' }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 1.25, delay: 3.8, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Upper wing */}
          <motion.path
            fill="url(#blue-gradient)"
            d="
              M 475 215
              L 650 55
              C 665 42, 690 40, 715 43
              L 625 225
              Z
            "
            initial={{ opacity: 0, scale: 0, transformOrigin: 'center' }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 3.9, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Lower wing */}
          <motion.path
            fill="url(#blue-gradient)"
            d="
              M 475 285
              L 650 445
              C 665 458, 690 460, 715 457
              L 625 275
              Z
            "
            initial={{ opacity: 0, scale: 0, transformOrigin: 'center' }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 4.0, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Tail - PINK (from TRIP) */}
          <motion.path
            fill="url(#pink-gradient)"
            d="
              M 900 220
              L 985 145
              C 995 137, 1010 135, 1030 136
              L 1010 220
              L 1010 280
              L 1030 364
              C 1010 365, 995 363, 985 355
              L 900 280
              Z
            "
            initial={{ opacity: 0, x: 30, scale: 0.2, transformOrigin: 'center' }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1, delay: 3.7, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* E-shaped nose cutout - pink */}
          <motion.path
            fill="url(#pink-gradient)"
            fillRule="evenodd"
            d="
              M 235 250
              C 250 220, 275 207, 310 207
              L 395 207
              L 395 228
              L 300 228
              L 300 240
              L 370 240
              L 370 260
              L 300 260
              L 300 272
              L 395 272
              L 395 293
              L 310 293
              C 275 293, 250 280, 235 250
              Z
            "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 4.2, ease: 'easeOut' }}
          />
        </g>
      </motion.g>
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
            gap: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            minWidth: 44,
            minHeight: 44,
          }}
        >
          <span style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
            color: '#fff',
          }}>
            <ETPlaneLogo />
          </span>
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
