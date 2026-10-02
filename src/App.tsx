import { TripProvider, useTripStore } from './state/tripStore';
import Navbar from './components/Navbar';
import ParticleBackground from './components/ParticleBackground';
import LandingPage from './pages/LandingPage';
import ChoicePage from './pages/ChoicePage';
import GetStartedPage from './pages/GetStartedPage';
import MoodStartPage from './pages/MoodStartPage';
import MoodDestinationPage from './pages/MoodDestinationPage';
import PreferencesPage from './pages/PreferencesPage';
import ResultsPage from './pages/ResultsPage';
import BookingPage from './pages/BookingPage';
import DashboardPage from './pages/DashboardPage';
import ReviewsPage from './pages/ReviewsPage';
import AuthPage from './pages/AuthPage';
import { ChatBot } from './components/chatbot/ChatBot';

function AppRouter() {
  const { state } = useTripStore();

  // The assistant is a trip-planning tool, so it stays out of the pages that are
  // about reading and writing rather than planning. On reviews it competed with
  // the review composer for the bottom-right corner and could cover a card.
  const showChatBot = state.page !== 'reviews';

  const pageMap = {
    landing: <LandingPage />,
    choice: <ChoicePage />,
    start: <GetStartedPage />,
    'mood-start': <MoodStartPage />,
    'mood-destination': <MoodDestinationPage />,
    preferences: <PreferencesPage />,
    results: <ResultsPage />,
    booking: <BookingPage />,
    dashboard: <DashboardPage />,
    reviews: <ReviewsPage />,
    auth: <AuthPage />,
  };

  return (
    <div className="bg-mesh" style={{ minHeight: '100vh', position: 'relative' }}>
      <ParticleBackground />
      <Navbar />
      <main className="page-enter" key={state.page}>
        {pageMap[state.page]}
      </main>
      {showChatBot && <ChatBot />}
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
