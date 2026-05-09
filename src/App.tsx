import { TripProvider, useTripStore } from './state/tripStore';
import Navbar from './components/Navbar';
import ParticleBackground from './components/ParticleBackground';
import LandingPage from './pages/LandingPage';
import GetStartedPage from './pages/GetStartedPage';
import PreferencesPage from './pages/PreferencesPage';
import ResultsPage from './pages/ResultsPage';

function AppRouter() {
  const { state } = useTripStore();

  const pageMap = {
    landing: <LandingPage />,
    start: <GetStartedPage />,
    preferences: <PreferencesPage />,
    results: <ResultsPage />,
  };

  return (
    <div className="bg-mesh" style={{ minHeight: '100vh', position: 'relative' }}>
      <ParticleBackground />
      <Navbar />
      <main className="page-enter" key={state.page}>
        {pageMap[state.page]}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <TripProvider>
      <AppRouter />
    </TripProvider>
  );
}
