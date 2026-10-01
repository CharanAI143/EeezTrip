export default function LandingFooter() {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '32px 24px',
      color: '#3f7295',
      fontSize: '0.9rem',
      borderTop: '1px solid rgba(186,230,253,0.4)',
      position: 'relative', zIndex: 1,
    }}>
      {/* #0284c7 was 3.84:1 here; #0369a1 gives 5.57:1. */}
      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, color: '#0369a1' }}>EeezTrip</span>
      {' '}— Premium AI Travel Planner · Built with ❤️ · {new Date().getFullYear()}
    </footer>
  );
}
