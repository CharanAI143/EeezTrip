import { useLandingPage } from './LandingPageProvider';

/**
 * Animated Kanchenjunga backdrop for the landing page.
 *
 * Drawn as a three-depth composition so the parallax reads as receding flanks
 * rather than one flat shape: a pale far range, the main massif, and a dark
 * near ridge.
 *
 * The massif is built like a mountain rather than a skyline zigzag: a single
 * dominant apex with straight ridgelines, an arête (central ridge) that splits
 * the shape into a lit face and a shadow face, snow clipped to the silhouette
 * above a ragged snowline, and rock striations that fan down the fall lines.
 * The lit/shadow face contrast is what makes flat SVG read as relief.
 *
 * Every colour comes from the existing ice token range — no new palette —
 * and scroll position comes from the page provider, so a panel control that
 * changes page state moves the whole composition at once.
 */

/** Coordinates are in a 1600x600 viewBox with the baseline at y = 600. */
const B = 600;

const APEX: [number, number] = [995, 150];

// The arête runs down from the apex toward the viewer — nearly vertical with a
// slight left drift, the way a summit ridge reads from the observation side.
const ARETE: [number, number][] = [
  [925, B],
  [945, 472],
  [965, 360],
  [985, 255],
];

/** Anything above this is snow; anything below is rock. */
const SNOW_Y = 336;

const poly = (pts: [number, number][]): string =>
  pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';

// The massif as two closed faces sharing the arête. The left face climbs in
// long, nearly-straight segments to the apex; the right face carries the South
// summit (Kanchenjunga Main is only 3 m higher), rising to a second peak with
// a deeper saddle behind the first. The arête shows as a hard shadow line
// instead of a soft interior boundary, and the spring-back along the left
// ridgeline gives the west face its billhook Kanchenjunga profile.
const LIT_FACE: [number, number][] = [
  APEX,
  [955, 205],
  [905, 272],
  [850, 362],
  [780, 452],
  [700, 528],
  [605, B],
  [925, B],
  [945, 472],
  [965, 360],
  [985, 255],
];

const SHADOW_FACE: [number, number][] = [
  [995, 150],
  [1035, 200],
  [1068, 262],
  [1135, 292],
  [1200, 228],
  [1255, 282],
  [1310, 346],
  [1380, 422],
  [1470, 502],
  [1585, B],
  [925, B],
  [945, 472],
  [965, 360],
  [985, 255],
];

const MASSIF = `${poly(LIT_FACE)} ${poly(SHADOW_FACE)}`;

/** Where each ridgeline crosses the snowline. */
const LEFT_SNOWLINE: [number, number] = [866, SNOW_Y];
const RIGHT_SNOWLINE: [number, number] = [1302, SNOW_Y];
// The arête at the snowline (between 965,360 and 985,255).
const ARETE_SNOWLINE: [number, number] = [970, SNOW_Y];

// Snow caps follow their ridge down to the snowline, then cross a jagged
// bottom edge (gullies) to the arête and climb back to the apex. Clipped by
// the massif so the cap can never leak past the silhouette.
const LIT_SNOW: [number, number][] = [
  [995, 150],
  [955, 205],
  [905, 272],
  LEFT_SNOWLINE,
  [876, 348],
  [886, 332],
  [904, 352],
  [926, 336],
  [945, 344],
  ARETE_SNOWLINE,
  [985, 255],
];

const SHADOW_SNOW: [number, number][] = [
  [995, 150],
  [1035, 200],
  [1068, 262],
  [1135, 292],
  [1200, 228],
  [1255, 282],
  RIGHT_SNOWLINE,
  [1284, 350],
  [1260, 330],
  [1236, 352],
  [1210, 336],
  [1186, 354],
  [1162, 336],
  [1138, 354],
  [1114, 338],
  [1090, 352],
  [1066, 336],
  [1044, 350],
  [1020, 334],
  ARETE_SNOWLINE,
  [985, 255],
];

// Rock texture: short fall lines fanning down each face from near the arête.
const LIT_STRIATIONS: [number, number][][] = [
  [[980, 300], [935, 420]],
  [[958, 360], [860, 520]],
  [[950, 420], [820, B]],
  [[875, 300], [815, B]],
  [[905, 285], [760, 540]],
];
const SHADOW_STRIATIONS: [number, number][][] = [
  [[1008, 300], [1060, 430]],
  [[1045, 335], [1150, B]],
  [[1095, 335], [1280, B]],
  [[1230, 245], [1350, 520]],
  [[1320, 355], [1490, B]],
];

// Distant range — big, simple, riding the horizon behind the massif.
const FAR_RANGE =
  'M0,600 L0,428 L120,366 L220,402 L340,318 L450,386 ' +
  'L580,300 L680,368 L800,296 L920,372 L1040,308 ' +
  'L1160,386 L1280,330 L1400,406 L1520,352 L1600,392 ' +
  'L1600,600 Z';

// Foreground ridge — darkest, lowest, pulls the base of the mountain off the
// bottom of the hero so the massif floats instead of landing on the edge.
const NEAR_RIDGE =
  'M0,600 L0,530 L150,492 L260,522 L420,470 L520,512 ' +
  'L620,482 L740,530 L850,492 L980,536 L1120,498 L1260,540 ' +
  'L1400,506 L1520,544 L1600,520 L1600,600 Z';

export default function KanchenjungaBackdrop() {
  const { state } = useLandingPage();
  const still = state.reducedMotion;

  return (
    <div
      className="kanchenjunga"
      aria-hidden="true"
      data-still={still}
      style={{ transform: `translate3d(0, ${state.scrollProgress * -90}px, 0)` }}
    >
      <svg
        className="kanchenjunga-svg"
        viewBox="0 0 1600 600"
        preserveAspectRatio="xMidYMax slice"
        focusable="false"
      >
        <defs>
          <linearGradient id="kj-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ice-50)" stopOpacity="0" />
            <stop offset="55%" stopColor="var(--ice-100)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--ice-200)" stopOpacity="0.75" />
          </linearGradient>
          {/* Distant range: palest, least saturated. */}
          <linearGradient id="kj-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ice-300)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--ice-200)" stopOpacity="0.65" />
          </linearGradient>
          {/* Light comes from the upper-left, so the west face is lit and the
              east face falls in shadow. That contrast is what lifts the shape
              off the page. */}
          <linearGradient id="kj-lit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ice-100)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--ice-300)" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="kj-shadow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ice-500)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--ice-700)" stopOpacity="0.72" />
          </linearGradient>
          <linearGradient id="kj-lit-snow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="100%" stopColor="var(--ice-100)" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="kj-shadow-snow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ice-200)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--ice-400)" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="kj-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ice-600)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--ice-800)" stopOpacity="0.6" />
          </linearGradient>
          <clipPath id="kj-massif-clip">
            <path d={MASSIF} />
          </clipPath>
        </defs>

        <rect className="kj-sky" x="0" y="0" width="1600" height="600" fill="url(#kj-sky)" />

        {/* Distant range — behind the massif, drawn first so it only shows on
            the flanks. */}
        <g className="kj-layer kj-layer-far">
          <path d={FAR_RANGE} fill="url(#kj-far)" />
        </g>

        {/* Main massif: two faces sharing the arête, snow clipped above the
            snowline, striations over the rock. */}
        <g className="kj-layer kj-layer-mid">
          <path d={poly(LIT_FACE)} fill="url(#kj-lit)" />
          <path d={poly(SHADOW_FACE)} fill="url(#kj-shadow)" />

          <g clipPath="url(#kj-massif-clip)">
            <path className="kj-snow" d={poly(LIT_SNOW)} fill="url(#kj-lit-snow)" />
            <path className="kj-snow kj-snow-2" d={poly(SHADOW_SNOW)} fill="url(#kj-shadow-snow)" />

            <g className="kj-striae" fill="none" stroke="var(--ice-800)" strokeOpacity="0.28" strokeWidth="2.5" strokeLinecap="round">
              {LIT_STRIATIONS.map(([[x1, y1], [x2, y2]], i) => (
                <path key={`l${i}`} d={`M${x1},${y1} L${x2},${y2}`} />
              ))}
            </g>
            <g className="kj-striae kj-striae-shadow" fill="none" stroke="var(--ice-900)" strokeOpacity="0.2" strokeWidth="2.5" strokeLinecap="round">
              {SHADOW_STRIATIONS.map(([[x1, y1], [x2, y2]], i) => (
                <path key={`s${i}`} d={`M${x1},${y1} L${x2},${y2}`} />
              ))}
            </g>
          </g>

          {/* Arête highlight: a thin lit edge marking the mountain's central
              fold between the two faces. */}
          <path d={poly(ARETE)} fill="none" stroke="var(--ice-200)" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Near ridge — darkest, lowest, sits over the massif's base. */}
        <g className="kj-layer kj-layer-near">
          <path d={NEAR_RIDGE} fill="url(#kj-near)" />
        </g>
      </svg>

      {/* Drifting mist. Two layers at different speeds so the band never reads
          as a single sliding element. */}
      <div className="kj-mist kj-mist-1" />
      <div className="kj-mist kj-mist-2" />
    </div>
  );
}