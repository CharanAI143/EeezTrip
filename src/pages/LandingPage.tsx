import { LandingPageProvider, useLandingPage } from '../components/landing/LandingPageProvider';
import HeroSection from '../components/landing/HeroSection';
import StatsSection from '../components/landing/StatsSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import DestinationsSection from '../components/landing/DestinationsSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import CtaSection from '../components/landing/CtaSection';
import LandingFooter from '../components/landing/LandingFooter';
import WeatherLayer from '../components/landing/WeatherLayer';
import TimeOfDayToggle from '../components/landing/TimeOfDayToggle';

// Re-exported so the tests can advance timers by the real values instead of
// hardcoded copies that silently drift when these change.
export { FLIP_DELAY_MS, HERO_SWAP_MS } from '../components/landing/landingContent';

/**
 * Page-level scroll effect, applied through a custom property on the wrapper
 * rather than per-section listeners. Sections and the Kanchenjunga backdrop
 * then react to one shared value, so a control that changes the page's
 * progression moves all of them together.
 */
function LandingShell() {
  const { state } = useLandingPage();

  return (
    <div
      className="lp-page"
      data-section={state.activeSection}
      data-region={state.region}
      data-season={state.season}
      data-weather={state.weather}
      data-tod={state.timeOfDay}
      style={{ '--lp-progress': state.scrollProgress } as React.CSSProperties}
    >
      <TimeOfDayToggle />
      <HeroSection />
      <StatsSection />
      <HowItWorksSection />
      <DestinationsSection />
      <FeaturesSection />
      <CtaSection />
      <LandingFooter />
      <WeatherLayer />
    </div>
  );
}

export default function LandingPage() {
  return (
    <LandingPageProvider>
      <LandingShell />
    </LandingPageProvider>
  );
}
