import type { ReactNode } from 'react';

/**
 * Every piece of static copy the landing page renders, in one place.
 *
 * The page is composed of sections, but the content is deliberately not: it is
 * shared data so that a page-level control (the panel) can act on all of it at
 * once — filtering the destination grid reorders the hero too, because both
 * read this same list rather than each holding a private copy.
 */

/** How long a pointer must rest on a card before it flips open. */
export const FLIP_DELAY_MS = 1000;

/** How long each hero card shows a destination before swapping. */
export const HERO_SWAP_MS = 4000;

export type Destination = {
  name: string;
  tag: string;
  region: string;
  image: string;
  blurb: string;
  famousFor: string[];
};

/**
 * `region` and `famousFor` are well-known facts about each place, written to be
 * accurate without a live lookup — anything that changes per trip (cost,
 * weather, opening hours) comes from the API once a plan is generated.
 */
export const DESTINATIONS: Destination[] = [
  {
    name: 'Santorini',
    tag: 'Romantic escape',
    region: 'Cyclades, Greece',
    image: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?q=80&w=800&auto=format&fit=crop',
    blurb: 'Whitewashed cliff villages stacked above a drowned volcano caldera.',
    famousFor: ['Caldera sunsets', 'Blue-domed Oia', 'Volcanic hot springs'],
  },
  {
    name: 'Bali',
    tag: 'Nature & culture',
    region: 'Indonesia, Southeast Asia',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800&auto=format&fit=crop',
    blurb: 'A volcanic island where Hindu temple rites sit minutes from surf breaks.',
    famousFor: ['Ubud rice terraces', 'Uluwatu cliff temples', 'Reef breaks'],
  },
  {
    name: 'Kyoto',
    tag: 'Serene tradition',
    region: 'Kansai, Japan',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
    blurb: 'Former imperial capital, preserved almost intact across seventeen centuries.',
    famousFor: ['Fushimi Inari gates', 'Arashiyama bamboo', 'Machiya wooden streets'],
  },
  {
    name: 'Maldives',
    tag: 'Island paradise',
    region: 'Indian Ocean, South Asia',
    image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=800&auto=format&fit=crop',
    blurb: 'A chain of coral atolls ringed by two thousand kilometres of reef.',
    famousFor: ['Overwater villas', 'Glass-clear lagoons', 'House-reef diving'],
  },
  {
    name: 'Swiss Alps',
    tag: 'Adventure peaks',
    region: 'Central Europe',
    image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=800&auto=format&fit=crop',
    blurb: 'Glacier-carved valleys crossed by rack railways and walking trails.',
    famousFor: ['Jungfraujoch rail', 'Glacier Express', 'Alpine lakes'],
  },
  {
    name: 'Paris',
    tag: 'City of love',
    region: 'Île-de-France, France',
    image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop',
    blurb: 'A river-bisected capital of museum halls and neighbourhood bistros.',
    famousFor: ['The Louvre', 'Seine-side walks', 'Montmartre at dawn'],
  },
];

/**
 * Hero cards reference DESTINATIONS by index rather than re-pasting URLs, and
 * deliberately skip Santorini/Kyoto/Swiss Alps so the hero does not simply
 * preview the first row of the grid below it. The three starts are distinct, so
 * advancing them on a shared tick keeps every card showing a different place.
 */
export const HERO_CARD_STARTS = [3, 1, 5];

/**
 * Resting tilt per slot. Kept as a custom property because a running
 * `animation` on transform discards a plain `transform` on the same element —
 * see the .hero-card-slot split in index.css.
 */
export const HERO_TILTS = ['3deg', '-5deg', '8deg'];

export type Stat = { value: string; label: string };

export const STATS: Stat[] = [
  { value: '2–14', label: 'Day Itineraries' },
  { value: '4', label: 'Slots Per Day' },
  { value: '5', label: 'Cost Categories' },
  { value: '3', label: 'AI Providers' },
];

export type Step = { title: string; desc: string };

export const STEPS: Step[] = [
  {
    title: 'Pick your vibe',
    desc: 'Already know where you are going? Enter a destination and plan around it. Not sure? Pick a mood and we will suggest places that suit it.',
  },
  {
    title: 'Set budget and days',
    desc: 'Give us a budget and a trip length. We keep every rupee accounted for across stay, food, transport, activities, and extras.',
  },
  {
    title: 'Get your itinerary',
    desc: 'Receive a day-by-day plan with morning-to-evening slots, local food picks, live photos, and insider tips you can revise by just asking.',
  },
];

export type Feature = { icon: ReactNode; title: string; desc: string };

/**
 * These three used to be joined by 'Smart Budget Breakdown', 'Day-by-Day
 * Itinerary' and 'Tailored Travel Moods'. Each restated one of the three
 * How It Works steps almost word for word, so the page was explaining the same
 * flow twice. Restoring them is a paste into this array if the section needs
 * the weight back.
 */
export const FEATURES: Feature[] = [
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.792 0-5.484-.235-8.08-.683-1.717-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
    title: 'AI-Powered Planning',
    desc: 'Our intelligent engine crafts fully personalized itineraries tailored to your mood, budget, and travel style.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    title: 'Real Destination Photos',
    desc: 'See stunning, authentic images of your destination before you go — sourced live from Wikimedia Commons.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Instant Results',
    desc: 'No waiting, no signup, no friction. Enter your preferences and get your full trip plan in seconds.',
  },
];

/**
 * Ids for the page's scrollable sections. The hero CTA scrolls to one of these
 * and a page-level control can target any of them, so they are named once here
 * rather than repeated as string literals across the page.
 */
export const SECTION_IDS = {
  hero: 'hero',
  stats: 'stats',
  howItWorks: 'how-it-works',
  destinations: 'destinations',
  features: 'features-section',
  cta: 'cta',
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];
