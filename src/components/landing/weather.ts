/**
 * Region-aware season model for the landing page weather layer.
 *
 * The page originally shipped one hardcoded effect (snowfall) that ran all year,
 * so a reader in Chennai in June saw a Himalayan blizzard. The weather is now
 * derived from the reader's region and the calendar.
 *
 * Two layers, deliberately separate:
 *
 *   1. `Region` -> `Climate`. Where roughly you are, and what kind of weather
 *      system that implies. Tropical Asia and the UK are both "northern
 *      hemisphere" but nothing else about their seasons matches.
 *   2. `Climate` -> month -> `Season` -> `WeatherKind`. The actual calendar.
 *
 * Getting the order right matters: shifting months by six is only correct for
 * the hemisphere, and a Mediterranean summer is dry while a tropical one is
 * not. Both are regions in the northern hemisphere.
 */

/** The four effects the page can render. */
export type WeatherKind = 'rain' | 'sunny' | 'wind' | 'snow';

/**
 * Time of day, which colours the page independently of the season.
 *
 * Kept separate from `WeatherKind` on purpose: a snowing night and a snowing
 * afternoon are the same season and read completely differently, and folding
 * that into the four effect buckets would have meant a `snowNight` per weather
 * type. One axis here, composed with the season, covers both.
 */
export type TimeOfDay = 'day' | 'night';

/** Seasonal buckets. Named for what they mean, not for a month. */
export type Season = 'monsoon' | 'summer' | 'postMonsoon' | 'winter';

/** Coarse climate systems. Each one gets its own calendar below. */
export type Climate =
  | 'tropicalMonsoon' // India, SE Asia: a real wet season
  | 'tropical' // Singapore, Indonesia, Amazon: wet year-round
  | 'arid' // Rajasthan, Gulf: hot and dry
  | 'mediterranean' // Spain, Italy, California coast: dry hot summers
  | 'temperate' // UK, Germany, northern US, NZ: mild and changeable
  | 'continental' // Himalaya, Canada, Russia: cold winters
  | 'polar'; // Iceland, interior Antarctica

/** Which effect each season puts on screen. */
export const SEASON_WEATHER: Record<Season, WeatherKind> = {
  // The southwest monsoon: the season an Indian travel product most wants to sell.
  monsoon: 'rain',
  // Pre-monsoon and peak summer: harsh light, haze, heat shimmer.
  summer: 'sunny',
  // The clear, dry half after the wet season pulls back: dust and north-westerlies.
  postMonsoon: 'wind',
  // The Himalayan showcase - the effect this page originally shipped with.
  winter: 'snow',
};

/** The reader's rough location, as far as the page can tell. */
export type Region =
  | 'southAsia'
  | 'himalaya'
  | 'eastAsia'
  | 'southeastAsia'
  | 'middleEast'
  | 'europe'
  | 'northAmerica'
  | 'southAmerica'
  | 'oceania'
  | 'polar';

/** Region -> climate. Kept as data so adding a region is one line. */
const REGION_CLIMATE: Record<Region, Climate> = {
  southAsia: 'tropicalMonsoon',
  himalaya: 'continental',
  eastAsia: 'temperate',
  southeastAsia: 'tropical',
  middleEast: 'arid',
  europe: 'temperate',
  northAmerica: 'temperate',
  southAmerica: 'tropical',
  oceania: 'temperate',
  polar: 'polar',
};

/**
 * Per-climate month tables, 0-indexed (0 = January) in *local* terms.
 *
 * Southern-hemisphere climates are written out in their own order rather than
 * rotated at lookup time, so the table can be read against a real calendar and
 * checked by eye.
 */
const CLIMATE_SEASONS: Record<Climate, readonly Season[]> = {
  // India: the southwest monsoon advances up the coast in June and covers most
  // of the country by July, withdrawing in September.
  tropicalMonsoon: [
    'winter', 'winter', 'summer', 'summer', 'summer', // Jan-May
    'monsoon', 'monsoon', 'monsoon', 'postMonsoon', // Jun-Sep
    'postMonsoon', 'postMonsoon', // Oct-Nov
    'winter', // Dec
  ],

  // Near the equator: no real dry season, so the year reads as a warm wet
  // summer rather than a monsoon. Singapore, Bali, Manaus.
  tropical: [
    'summer', 'summer', 'summer', 'summer', 'summer', 'summer',
    'summer', 'summer', 'summer', 'summer', 'summer', 'summer',
  ],

  // Desert: bright almost year-round, with a genuinely cold desert winter.
  arid: [
    'winter', 'winter', 'summer', 'summer', 'summer', 'summer',
    'summer', 'summer', 'summer', 'summer', 'winter', 'winter',
  ],

  // Mediterranean: hot *and dry* in summer, wet in winter. This is the case a
  // naive "summer = sunny everywhere" rule still gets right, but a naive
  // "northern summer = June" rule gets wrong.
  mediterranean: [
    'winter', 'winter', 'summer', 'summer', 'summer', 'summer',
    'summer', 'summer', 'summer', 'postMonsoon', 'winter', 'winter',
  ],

  // Temperate northern: mild summers, cold enough winters for snow effects.
  temperate: [
    'winter', 'winter', 'postMonsoon', 'summer', 'summer', 'summer',
    'summer', 'summer', 'postMonsoon', 'postMonsoon', 'winter', 'winter',
  ],

  // Continental: deep winter, short sharp summer. Nepal, Canada, Russia.
  continental: [
    'winter', 'winter', 'postMonsoon', 'postMonsoon', 'summer', 'summer',
    'summer', 'summer', 'postMonsoon', 'postMonsoon', 'winter', 'winter',
  ],

  polar: [
    'winter', 'winter', 'winter', 'postMonsoon', 'postMonsoon', 'postMonsoon',
    'postMonsoon', 'postMonsoon', 'postMonsoon', 'winter', 'winter', 'winter',
  ],
};

/**
 * Southern-hemisphere climates, written in their own calendar order.
 * Kept as a separate map so the northern tables above stay readable.
 */
const SOUTHERN_CLIMATE_SEASONS: Partial<Record<Climate, readonly Season[]>> = {
  // Australia / New Zealand / southern Africa / Argentina: Dec-Feb is summer.
  temperate: [
    'summer', 'summer', 'postMonsoon', 'postMonsoon', 'winter', 'winter',
    'winter', 'winter', 'postMonsoon', 'postMonsoon', 'summer', 'summer',
  ],
  // Southern Africa interior: the same six-month flip, drier overall.
  arid: [
    'summer', 'summer', 'postMonsoon', 'postMonsoon', 'winter', 'winter',
    'winter', 'winter', 'postMonsoon', 'postMonsoon', 'summer', 'summer',
  ],
  // Southern Andes: snow well into the southern winter.
  continental: [
    'winter', 'winter', 'postMonsoon', 'postMonsoon', 'summer', 'summer',
    'summer', 'summer', 'postMonsoon', 'postMonsoon', 'winter', 'winter',
  ],
};

/**
 * IANA timezone prefix -> region. Matched longest-prefix-first at runtime.
 *
 * The browser already knows roughly where the reader is via
 * `Intl.DateTimeFormat().resolvedOptions().timeZone`, which is a far better
 * signal than guessing from the language, and needs no permission prompt.
 */
const TZ_REGION: ReadonlyArray<readonly [string, Region]> = [
  // Southern and central Asia first: "Asia/Kolkata" must not be caught by a
  // shorter "Asia/" rule.
  ['Asia/Kolkata', 'southAsia'],
  ['Asia/Calcutta', 'southAsia'],
  ['Asia/Kathmandu', 'himalaya'],
  ['Asia/Colombo', 'southAsia'],
  ['Asia/Dhaka', 'southAsia'],
  ['Asia/Karachi', 'southAsia'],
  ['Asia/Kabul', 'southAsia'],
  ['Asia/Yangon', 'southeastAsia'],
  ['Asia/Bangkok', 'southeastAsia'],
  ['Asia/Singapore', 'southeastAsia'],
  ['Asia/Jakarta', 'southeastAsia'],
  ['Asia/Manila', 'southeastAsia'],
  ['Asia/Ho_Chi_Minh', 'southeastAsia'],
  ['Asia/Shanghai', 'eastAsia'],
  ['Asia/Tokyo', 'eastAsia'],
  ['Asia/Seoul', 'eastAsia'],
  ['Asia/Hong_Kong', 'eastAsia'],
  ['Asia/Taipei', 'eastAsia'],
  ['Asia/Dubai', 'middleEast'],
  ['Asia/Riyadh', 'middleEast'],
  ['Asia/Qatar', 'middleEast'],
  ['Asia/Kuwait', 'middleEast'],
  ['Asia/Tehran', 'middleEast'],
  ['Asia/Jerusalem', 'middleEast'],
  ['Asia/Almaty', 'middleEast'],
  ['Asia/Tashkent', 'middleEast'],
  ['Asia', 'eastAsia'],

  ['Europe/London', 'europe'],
  ['Europe/Dublin', 'europe'],
  ['Europe/Lisbon', 'europe'],
  ['Europe/Madrid', 'europe'],
  ['Europe/Rome', 'europe'],
  ['Europe/Paris', 'europe'],
  ['Europe/Berlin', 'europe'],
  ['Europe/Amsterdam', 'europe'],
  ['Europe/Brussels', 'europe'],
  ['Europe/Vienna', 'europe'],
  ['Europe/Prague', 'europe'],
  ['Europe/Warsaw', 'europe'],
  ['Europe/Stockholm', 'europe'],
  ['Europe/Oslo', 'europe'],
  ['Europe/Helsinki', 'europe'],
  ['Europe/Athens', 'europe'],
  ['Europe/Istanbul', 'europe'],
  ['Europe/Moscow', 'europe'],
  ['Europe/Kyiv', 'europe'],
  ['Europe', 'europe'],

  ['America/New_York', 'northAmerica'],
  ['America/Chicago', 'northAmerica'],
  ['America/Denver', 'northAmerica'],
  ['America/Los_Angeles', 'northAmerica'],
  ['America/Anchorage', 'northAmerica'],
  ['America/Toronto', 'northAmerica'],
  ['America/Vancouver', 'northAmerica'],
  ['America/Mexico_City', 'northAmerica'],
  ['America/Sao_Paulo', 'southAmerica'],
  ['America/Argentina', 'southAmerica'],
  ['America/Bogota', 'southAmerica'],
  ['America/Lima', 'southAmerica'],
  ['America/Santiago', 'southAmerica'],
  ['America', 'northAmerica'],

  ['Australia/Sydney', 'oceania'],
  ['Australia/Melbourne', 'oceania'],
  ['Australia/Brisbane', 'oceania'],
  ['Australia/Perth', 'oceania'],
  ['Australia/Adelaide', 'oceania'],
  ['Australia/Darwin', 'oceania'],
  ['Pacific/Auckland', 'oceania'],
  ['Pacific/Fiji', 'oceania'],
  ['Australia', 'oceania'],
  ['Pacific', 'oceania'],

  ['Africa/Cairo', 'middleEast'],
  ['Africa/Lagos', 'middleEast'],
  ['Africa/Johannesburg', 'oceania'],
  ['Africa', 'middleEast'],

  ['Atlantic/Reykjavik', 'polar'],
  ['Antarctica', 'polar'],
];

/** Timezone areas that sit on the equator or south of it. */
const SOUTHERN_TZ_PREFIXES = [
  'Australia/', 'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Chatham',
  'America/Sao_Paulo', 'America/Argentina', 'America/Santiago', 'America/Lima',
  'America/Bogota', 'Africa/Johannesburg', 'Africa/Harare', 'Africa/Maputo',
  'Antarctica',
];

/** Where the page points when it cannot tell. The product is India-first. */
export const DEFAULT_REGION: Region = 'southAsia';

/** The climate a region implies. */
export function climateOf(region: Region): Climate {
  return REGION_CLIMATE[region];
}

/** True when a timezone sits south of the equator. */
function isSouthern(tz: string): boolean {
  return SOUTHERN_TZ_PREFIXES.some((p) => tz === p || tz.startsWith(p));
}

/**
 * Map an IANA timezone to a region.
 *
 * Returns `null` for anything unrecognised so the caller can fall back
 * deliberately, rather than silently showing the wrong hemisphere.
 */
export function regionFromTimeZone(tz: string | undefined | null): Region | null {
  if (!tz) return null;
  const hit = TZ_REGION.find(([prefix]) => tz === prefix || tz.startsWith(`${prefix}/`));
  return hit ? hit[1] : null;
}

/**
 * Best-effort region from the browser. Uses the IANA timezone, which is
 * already available without asking for location permission.
 */
export function detectRegion(): Region {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return regionFromTimeZone(tz) ?? DEFAULT_REGION;
  } catch {
    return DEFAULT_REGION;
  }
}

/** Whether a region's calendar is written southern-hemisphere. */
export function isSouthernRegion(region: Region, timeZone?: string | null): boolean {
  // Timezone is the more precise signal when we have it, because regions like
  // "oceania" and "northAmerica" both span the equator.
  if (timeZone) return isSouthern(timeZone);
  return region === 'southAmerica' || region === 'oceania';
}

/** Resolve the season for a date in a region. */
export function resolveSeason(date: Date, region: Region, timeZone?: string | null): Season {
  const climate = climateOf(region);
  const southern = isSouthernRegion(region, timeZone);
  const table = southern ? SOUTHERN_CLIMATE_SEASONS[climate] ?? CLIMATE_SEASONS[climate] : CLIMATE_SEASONS[climate];
  // getMonth() is 0-indexed, which is exactly what the tables are indexed by.
  return table[date.getMonth()];
}

/** Resolve the effect to render for a date in a region. */
export function resolveWeather(date: Date, region: Region, timeZone?: string | null): WeatherKind {
  return SEASON_WEATHER[resolveSeason(date, region, timeZone)];
}

/**
 * Where daylight starts and ends, in local hours.
 *
 * Widened past the real terminator on both sides. Dawn and dusk are the two
 * times a page is hardest to read, and a crisp day/night flip at 06:00 and
 * 18:00 would put a reader looking at the page during a sunrise in a half-dark
 * scheme. 05:00-20:00 as day covers the awkward hours with a light scheme.
 */
const DAYLIGHT = { from: 5, to: 20 } as const;

/** True while the clock says the reader's side of the planet is lit. */
export function isDaytime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= DAYLIGHT.from && hour < DAYLIGHT.to;
}

/** Resolve the time-of-day theme for a date, using the reader's own clock. */
export function resolveTimeOfDay(date: Date): TimeOfDay {
  return isDaytime(date) ? 'day' : 'night';
}

/**
 * The season shown for the first frame, before the region is known.
 *
 * The monsoon rather than "today", because the hero is an Indian travel product
 * and there is no reason to flash a foreign season while the timezone is being
 * read. The mount effect then replaces this with the reader's real season.
 */
export const DEFAULT_SEASON: Season = 'monsoon';

/** Every region, for a picker. */
export const REGION_OPTIONS: ReadonlyArray<{ id: Region; label: string; climate: Climate }> = [
  { id: 'southAsia', label: 'South Asia', climate: 'tropicalMonsoon' },
  { id: 'himalaya', label: 'Himalaya', climate: 'continental' },
  { id: 'eastAsia', label: 'East Asia', climate: 'temperate' },
  { id: 'southeastAsia', label: 'Southeast Asia', climate: 'tropical' },
  { id: 'middleEast', label: 'Middle East', climate: 'arid' },
  { id: 'europe', label: 'Europe', climate: 'temperate' },
  { id: 'northAmerica', label: 'North America', climate: 'temperate' },
  { id: 'southAmerica', label: 'South America', climate: 'tropical' },
  { id: 'oceania', label: 'Oceania', climate: 'temperate' },
  { id: 'polar', label: 'Polar', climate: 'polar' },
];

export const SEASON_LABELS: Record<Season, string> = {
  monsoon: 'Monsoon',
  summer: 'Summer',
  postMonsoon: 'Post-monsoon',
  winter: 'Winter',
};

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  day: 'Day',
  night: 'Night',
};

export const TIME_OF_DAY_OPTIONS: ReadonlyArray<{ id: TimeOfDay; label: string }> = [
  { id: 'day', label: TIME_OF_DAY_LABELS.day },
  { id: 'night', label: TIME_OF_DAY_LABELS.night },
];

/** Deterministic PRNG so particle geometry never varies between renders. */
export function makeRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
