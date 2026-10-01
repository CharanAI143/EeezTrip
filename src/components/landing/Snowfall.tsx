import type { CSSProperties } from 'react';
import { useLandingPage } from './LandingPageProvider';

/**
 * Falling snow for the landing page.
 *
 * Rendered page-wide (the whole landing page is the Himalayan showcase, not
 * just the hero), fixed to the viewport so it keeps falling while the reader
 * scrolls. `pointer-events: none` so it never swallows clicks, and its layer
 * sits below the navbar and chat bubble so navigation stays crisp above the
 * weather.
 *
 * The flakes are computed once with a tiny LCG so the drift, size and timing
 * are stable across renders — re-mounting the page does not reshuffle the
 * storm — and stops entirely when the reader has asked for reduced motion.
 */

/** Small deterministic PRNG so flake geometry never varies between renders. */
function makeRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const rand = makeRandom(0xc0ffee);
const COUNT = 30;

type Flake = {
  left: string;
  size: number;
  opacity: number;
  blur: number;
  fall: number;
  drift: number;
  delay: number;
  flutter: number;
};

const FLAKES: Flake[] = Array.from({ length: COUNT }, () => {
  const size = rand() * 6 + 4;
  return {
    left: `${(rand() * 100).toFixed(2)}%`,
    size,
    opacity: rand() * 0.45 + 0.4,
    // Bigger flakes blur a touch more, which sells the depth-of-field.
    blur: size > 8 ? rand() * 1.2 + 0.4 : 0,
    // An early negative delay scatters the flakes mid-fall at load instead of
    // having the whole storm start together off the top of the viewport.
    fall: rand() * 12 + 9,
    drift: rand() * 70 + 30,
    delay: -(rand() * 20),
    // Horizontal flutter runs faster than the vertical fall, so each flake
    // traces an S, not a straight drop.
    flutter: rand() * 1.8 + 1.2,
  };
});

function flakeStyle(f: Flake, still: boolean): CSSProperties {
  return {
    left: f.left,
    width: f.size,
    height: f.size,
    opacity: still ? 0 : f.opacity,
    filter: f.blur > 0 ? `blur(${f.blur.toFixed(2)}px)` : undefined,
    ['--fl-fall' as string]: `${f.fall.toFixed(2)}s`,
    ['--fl-drift' as string]: `${f.drift.toFixed(0)}px`,
    ['--fl-delay' as string]: `${f.delay.toFixed(2)}s`,
    ['--fl-flutter' as string]: `${f.flutter.toFixed(2)}s`,
  };
}

export default function Snowfall() {
  // Keeping still under reduced motion matters beyond the main reduce: the
  // page also exposes this through its own state, so a control that turns the
  // weather down stops the storm through the same channel.
  const { state } = useLandingPage();
  const still = state.reducedMotion;

  return (
    <div className="snowfall" aria-hidden="true" data-still={still}>
      {FLAKES.map((f, i) => (
        <span key={i} className="snowfall-flake" style={flakeStyle(f, still)} />
      ))}
    </div>
  );
}