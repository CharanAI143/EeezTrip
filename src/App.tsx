import { TripProvider, useTripStore } from './state/tripStore';
import Navbar from './components/Navbar';
import ParticleBackground from './components/ParticleBackground';
import LandingPage from './pages/LandingPage';
import ChoicePage from './pages/ChoicePage';
import GetStartedPage from './pages/GetStartedPage';
import MoodStartPage from './pages/MoodStartPage';
import PreferencesPage from './pages/PreferencesPage';
import ResultsPage from './pages/ResultsPage';
import BookingPage from './pages/BookingPage';
import DashboardPage from './pages/DashboardPage';
import ReviewsPage from './pages/ReviewsPage';
import { ChatBot } from './components/ChatBot';

function AppRouter() {
  const { state } = useTripStore();

  const pageMap = {
    landing: <LandingPage />,
    choice: <ChoicePage />,
    start: <GetStartedPage />,
    'mood-start': <MoodStartPage />,
    preferences: <PreferencesPage />,
    results: <ResultsPage />,
    booking: <BookingPage />,
    dashboard: <DashboardPage />,
    reviews: <ReviewsPage />,
  };

  return (
    <div className="bg-mesh" style={{ minHeight: '100vh', position: 'relative' }}>
      <ParticleBackground />
      <Navbar />
      <main className="page-enter" key={state.page}>
        {pageMap[state.page]}
      </main>
      <ChatBot />
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
