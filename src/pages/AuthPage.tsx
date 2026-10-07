import { useState, useEffect, type FormEvent } from 'react';
import {
  auth,
  googleProvider,
  microsoftProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  authErrorMessage,
  isFirebaseConfigured,
} from '../lib/firebase';
import { useTripStore } from '../state/tripStore';
import { Plane, Loader2, Mail, KeyRound, ArrowRight } from 'lucide-react';

type Mode = 'signin' | 'signup';

const GOOGLE_MARK = (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
  </svg>
);

/** Microsoft's four squares. Recoloured rather than themed, so it reads on any background. */
const MICROSOFT_MARK = (
  <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);

export default function AuthPage() {
  const { state, navigate } = useTripStore();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // A visitor who is already signed in has no business on this page. `state.user`
  // is populated by onAuthStateChanged in the trip store, so it is authoritative.
  // In an effect rather than during render, because navigating is a store
  // dispatch and dispatching mid-render re-enters this component.
  useEffect(() => {
    if (state.user) navigate(state.pendingReviewDestination ? 'reviews' : 'landing');
  }, [state.user, navigate, state.pendingReviewDestination]);

  /**
   * Where sign-in lands. A visitor who came here to review a place with no
   * reviews yet ("give review later") returns to the Reviews page with the
   * destination still pending, so the form opens prefilled; everyone else
   * goes home.
   */
  const postAuthPage = () => (state.pendingReviewDestination ? 'reviews' as const : 'landing' as const);

  const unavailable = !isFirebaseConfigured;

  const runOAuth = async (provider: 'google' | 'microsoft') => {
    if (!auth) {
      setError('Sign-in is unavailable: Firebase is not configured for this build.');
      return;
    }
    const p = provider === 'google' ? googleProvider : microsoftProvider;
    if (!p) {
      setError('That sign-in method is unavailable: Firebase is not configured for this build.');
      return;
    }
    setBusy(provider);
    setError(null);
    setNotice(null);
    try {
      await signInWithPopup(auth, p);
      navigate(postAuthPage());
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError('Sign-in is unavailable: Firebase is not configured for this build.');
      return;
    }
    setBusy('email');
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Reviews require a userName (firestore.rules) and this is the only point
        // where we know what the person wants to be called, so set it now rather
        // than letting their first review post as "Traveler".
        await updateProfile(cred.user, { displayName: displayName.trim() || email.split('@')[0] });
        setNotice('Account created. Welcome to EeezTrip.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate(postAuthPage());
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleReset = async () => {
    if (!auth) return;
    if (!email.trim()) {
      setError('Enter your email address above, then choose "Forgot password".');
      return;
    }
    setBusy('reset');
    setError(null);
    setNotice(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice('Check your inbox for a link to set a new password.');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(12,27,51,0.15)',
    outline: 'none',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '1rem',
    background: '#fff',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ padding: '120px 24px 80px', maxWidth: 460, margin: '0 auto', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', color: '#fff', marginBottom: 16,
        }}>
          <Plane size={26} />
        </span>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 900, color: '#0c1b33', margin: '0 0 8px' }}>
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
          {mode === 'signin'
            ? 'Sign in to review destinations and save your trips.'
            : 'One account for saved trips, reviews and personalised plans.'}
        </p>
      </div>

      <div className="glass" style={{ padding: 28, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {unavailable && (
          <div role="alert" style={{
            padding: '12px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
            background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e',
          }}>
            Sign-in is unavailable: Firebase is not configured for this build. Set the
            VITE_FIREBASE_* variables and enable the providers in the Firebase console.
          </div>
        )}

        <button
          type="button"
          onClick={() => runOAuth('google')}
          disabled={busy !== null}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
            background: '#fff', border: '1px solid rgba(12,27,51,0.15)',
            fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.95rem', color: '#0c1b33',
          }}
        >
          {busy === 'google' ? <Loader2 size={18} className="animate-spin" /> : GOOGLE_MARK}
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => runOAuth('microsoft')}
          disabled={busy !== null}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
            background: '#fff', border: '1px solid rgba(12,27,51,0.15)',
            fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.95rem', color: '#0c1b33',
          }}
        >
          {busy === 'microsoft' ? <Loader2 size={18} className="animate-spin" /> : MICROSOFT_MARK}
          Continue with Microsoft
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#94a3b8', fontSize: '0.8rem' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(12,27,51,0.12)' }} />
          or
          <div style={{ flex: 1, height: 1, background: 'rgba(12,27,51,0.12)' }} />
        </div>

        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Display name
              </label>
              <input
                id="auth-name"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="How your name appears on reviews"
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>

          {error && (
            <div role="alert" style={{
              padding: '12px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
              background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
            }}>
              {error}
            </div>
          )}
          {notice && (
            <div role="status" style={{
              padding: '12px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
              background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d',
            }}>
              {notice}
            </div>
          )}

          <button type="submit" disabled={busy !== null} className="btn btn-primary" style={{ width: '100%', padding: 13 }}>
            {busy === 'email' && <Loader2 size={16} className="animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
            {busy === null && <ArrowRight size={16} />}
          </button>
        </form>

        {mode === 'signin' && (
          <button
            type="button"
            onClick={handleReset}
            disabled={busy !== null}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'center',
              fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem', fontWeight: 600, color: '#0284c7',
            }}
          >
            {busy === 'reset' ? 'Sending...' : 'Forgot password?'}
          </button>
        )}

        <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#64748b', paddingTop: 4 }}>
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setNotice(null); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#0284c7', fontSize: '0.9rem',
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem', color: '#94a3b8' }}>
        Browsing works without an account — you only need one to post reviews and save trips.
      </p>
    </div>
  );
}
