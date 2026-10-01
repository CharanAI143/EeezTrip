import type { CSSProperties } from 'react';
import { useLandingPage } from './LandingPageProvider';
import { makeRandom, type WeatherKind } from './weather';

/**
 * Seasonal weather for the landing page.
 *
 * Rendered page-wide (the whole page is the showcase, not just the hero),
 * fixed to the viewport so it keeps playing while the reader scrolls.
 * `pointer-events: none` so it never swallows clicks, and its layer sits below
 * the navbar and chat bubble so navigation stays crisp above the weather.
 *
 * The effect is chosen from the page season rather than hardcoded, so the page
 * is not showing a Himalayan blizzard to a reader in Chennai in June. Geometry
 * is computed once per kind with a small LCG, so the pattern is stable across
 * renders, and everything stops entirely when the reader has asked for reduced
 * motion.
 */

/* ── Rain ──
   Stretched streaks rather than dots, because a drop in motion is a line.
   Falls fast, with a slight lean and a much slower sideways drift, so the
   sheet reads as wind-blown rain rather than vertical hatching. */

const rainRand = makeRandom(0x51ee7);
const RAIN_COUNT = 150;

type Drop = {
  left: string;
  length: number;
  thickness: number;
  opacity: number;
  fall: number;
  lean: number;
  delay: number;
};

const DROPS: Drop[] = Array.from({ length: RAIN_COUNT }, () => {
  const length = rainRand() * 26 + 14;
  return {
    left: `${(rainRand() * 108 - 4).toFixed(2)}%`,
    length,
    // A thin drop still needs to be at least ~1px to render at all. The longer
    // ones carry more weight so the sheet has depth rather than being uniformly
    // faint.
    thickness: length > 34 ? 2 : 1.2,
    // Density is doing the work here rather than opacity. Ninety faint drops
    // read as a dirty screen; a hundred and fifty at a moderate alpha read as
    // weather, and a hundred and fifty bright ones would be a wall of white.
    opacity: rainRand() * 0.4 + 0.34,
    fall: rainRand() * 0.55 + 0.38,
    lean: rainRand() * 10 + 4,
    delay: -(rainRand() * 2.4),
  };
});

function dropStyle(d: Drop, still: boolean): CSSProperties {
  return {
    left: d.left,
    height: d.length,
    width: d.thickness,
    opacity: still ? 0 : d.opacity,
    // Same reason the wind streaks are blurred: a 1.2px line at this opacity
    // aliases into a hard mark, and the aliasing is what makes a dense rain
    // sheet shimmer and strain rather than read as rain.
    filter: 'blur(0.3px)',
    ['--dr-fall' as string]: `${d.fall.toFixed(2)}s`,
    ['--dr-lean' as string]: `${d.lean.toFixed(1)}deg`,
    ['--dr-delay' as string]: `${d.delay.toFixed(2)}s`,
  };
}

/* ── Sunny ──
   A warm haze that breathes, plus slow-rising motes. No falling element: on a
   clear day the thing that moves is the light, not the air. */

const sunRand = makeRandom(0x5a4d0);
const SUN_COUNT = 60;

type Mote = {
  left: string;
  size: number;
  opacity: number;
  rise: number;
  sway: number;
  delay: number;
};

const MOTES: Mote[] = Array.from({ length: SUN_COUNT }, () => ({
  left: `${(sunRand() * 100).toFixed(2)}%`,
  // Larger than the first build, because a 2px mote on a bright warm ground
  // disappears and a bigger one still reads as suspended dust rather than a
  // blemish once it is softened.
  size: sunRand() * 4 + 3,
  opacity: sunRand() * 0.34 + 0.26,
  rise: sunRand() * 18 + 14,
  sway: sunRand() * 60 + 30,
  delay: -(sunRand() * 22),
}));

function moteStyle(m: Mote, still: boolean): CSSProperties {
  return {
    left: m.left,
    width: m.size,
    height: m.size,
    opacity: still ? 0 : m.opacity,
    filter: 'blur(0.3px)',
    ['--mo-rise' as string]: `${m.rise.toFixed(2)}s`,
    ['--mo-sway' as string]: `${m.sway.toFixed(0)}px`,
    ['--mo-delay' as string]: `${m.delay.toFixed(2)}s`,
  };
}

/* ── Wind ──
   Wind is not an object, so the elements are streaks and dust rather than
   shapes. Each is a line that fades out at both ends, so it has no hard edge
   to read as an orb, and it travels across the frame and off it rather than
   returning to its origin — a closed loop is what made the previous version
   look like a row of objects circling past.

   Speeds, lengths and vertical offsets are all spread, and several strands are
   in frame at once, so the field reads as moving air rather than one
   procession travelling in a single direction. */

const windRand = makeRandom(0x21d7);
const STREAK_COUNT = 30;
const DUST_COUNT = 22;

type Streak = {
  top: string;
  length: number;
  thickness: number;
  opacity: number;
  lean: number;
  bob: number;
  duration: number;
  delay: number;
};

const STREAKS: Streak[] = Array.from({ length: STREAK_COUNT }, () => {
  const length = windRand() * 200 + 90;
  return {
    top: `${(windRand() * 94 + 3).toFixed(2)}%`,
    length,
    // A sub-pixel line disappears, so the thinnest strand is 1px and half of
    // them are 2px, which is what carries the weight at this opacity.
    thickness: windRand() < 0.5 ? 2 : 1,
    // Visible without being harsh: the peaks stay well under the 0.8 the
    // gradient itself allows, so no strand ever reads as a hard bright line
    // against the hero. The fade at both ends does most of the softening.
    opacity: windRand() * 0.32 + 0.3,
    // A slight lean only. A steep one stops reading as horizontal travel and
    // starts reading as rain falling across the frame.
    lean: windRand() * 4 - 2,
    bob: windRand() * 28 - 14,
    // 5-14s across the viewport. The spread is what keeps the strands from
    // marching in lockstep.
    duration: windRand() * 9 + 5,
    delay: -(windRand() * 14),
  };
});

function streakStyle(s: Streak, still: boolean): CSSProperties {
  return {
    top: s.top,
    width: s.length,
    height: s.thickness,
    opacity: still ? 0 : s.opacity,
    // A sub-pixel blur takes the edge off the line. Without it a 1px strand at
    // this opacity aliases into a hard, slightly jagged mark, which is exactly
    // the kind of edge the eye reads as strain.
    filter: 'blur(0.4px)',
    ['--wd-duration' as string]: `${s.duration.toFixed(2)}s`,
    ['--wd-delay' as string]: `${s.delay.toFixed(2)}s`,
    ['--wd-bob' as string]: `${s.bob.toFixed(0)}px`,
    ['--wd-lean' as string]: `${s.lean.toFixed(1)}deg`,
  };
}

// Lifted dust. Smaller and slower than the streaks, on a wavy path, so the
// field has both a fast and a slow component instead of one uniform flow.
type Dust = {
  top: string;
  size: number;
  opacity: number;
  bob: number;
  duration: number;
  delay: number;
};

const DUST: Dust[] = Array.from({ length: DUST_COUNT }, () => ({
  top: `${(windRand() * 90 + 5).toFixed(2)}%`,
  size: windRand() * 2.5 + 1.5,
  // Motes sit behind the streaks in apparent weight, so they start lower and
  // stop well short of the streak peaks. They are there to fill the field, not
  // to compete with it.
  opacity: windRand() * 0.3 + 0.24,
  bob: windRand() * 40 - 20,
  duration: windRand() * 11 + 8,
  delay: -(windRand() * 19),
}));

function dustStyle(d: Dust, still: boolean): CSSProperties {
  return {
    top: d.top,
    width: d.size,
    height: d.size,
    opacity: still ? 0 : d.opacity,
    // Same reason as the streaks: a 1.5px dot at this opacity reads as a hard
    // speckle without softening.
    filter: 'blur(0.3px)',
    ['--wd-duration' as string]: `${d.duration.toFixed(2)}s`,
    ['--wd-delay' as string]: `${d.delay.toFixed(2)}s`,
    ['--wd-bob' as string]: `${d.bob.toFixed(0)}px`,
  };
}

/* ── Snow ──
   The original effect, unchanged in feel: round flakes that drop while weaving
   an S, with bigger flakes slightly blurred to sell depth of field. */

const snowRand = makeRandom(0xc0ffee);
const SNOW_COUNT = 64;

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

const FLAKES: Flake[] = Array.from({ length: SNOW_COUNT }, () => {
  const size = snowRand() * 6 + 4;
  return {
    left: `${(snowRand() * 100).toFixed(2)}%`,
    size,
    // Snow is the one effect that can carry a high floor without straining,
    // because a flake is a solid pale disc rather than a thin line: the eye
    // reads a field of them as depth instead of glare.
    opacity: snowRand() * 0.4 + 0.45,
    // The out-of-focus flakes are what give the field depth. Now that there are
    // twice as many, a wider spread of blur keeps the two size bands from
    // merging into one flat layer.
    blur: size > 8 ? snowRand() * 1.6 + 0.5 : 0.3,
    fall: snowRand() * 12 + 9,
    drift: snowRand() * 70 + 30,
    delay: -(snowRand() * 20),
    flutter: snowRand() * 1.8 + 1.2,
  };
});

function flakeStyle(f: Flake, still: boolean): CSSProperties {
  return {
    left: f.left,
    width: f.size,
    height: f.size,
    opacity: still ? 0 : f.opacity,
    filter: `blur(${f.blur.toFixed(2)}px)`,
    ['--fl-fall' as string]: `${f.fall.toFixed(2)}s`,
    ['--fl-drift' as string]: `${f.drift.toFixed(0)}px`,
    ['--fl-delay' as string]: `${f.delay.toFixed(2)}s`,
    ['--fl-flutter' as string]: `${f.flutter.toFixed(2)}s`,
  };
}

export default function WeatherLayer() {
  // Keeping still under reduced motion matters beyond the OS setting: the page
  // exposes this through its own state, so a control that turns the weather
  // down stops it through the same channel.
  const { state } = useLandingPage();
  const still = state.reducedMotion;
  const kind: WeatherKind = state.weather;

  return (
    <div
      className="weather-layer"
      aria-hidden="true"
      data-kind={kind}
      data-still={still}
      // Season and time of day are independent axes: the same monsoon reads
      // differently after dark, so the layer keys off both.
      data-tod={state.timeOfDay}
    >
      {kind === 'rain' && (
        <>
          <div className="weather-veil weather-veil--rain" />
          {DROPS.map((d, i) => (
            <span key={i} className="weather-drop" style={dropStyle(d, still)} />
          ))}
        </>
      )}

      {kind === 'sunny' && (
        <>
          <div className="weather-veil weather-veil--sun" />
          {MOTES.map((m, i) => (
            <span key={i} className="weather-mote" style={moteStyle(m, still)} />
          ))}
        </>
      )}

      {kind === 'wind' && (
        <>
          <div className="weather-veil weather-veil--wind" />
          {STREAKS.map((s, i) => (
            <span key={`s${i}`} className="weather-wind-streak" style={streakStyle(s, still)} />
          ))}
          {DUST.map((d, i) => (
            <span key={`d${i}`} className="weather-wind-dust" style={dustStyle(d, still)} />
          ))}
        </>
      )}

      {kind === 'snow' && (
        <>
          <div className="weather-veil weather-veil--snow" />
          {FLAKES.map((f, i) => (
            <span key={i} className="weather-flake" style={flakeStyle(f, still)} />
          ))}
        </>
      )}
    </div>
  );
}
