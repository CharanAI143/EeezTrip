import { useLandingPage } from './LandingPageProvider';
import { SECTION_IDS } from './landingContent';
import { useTripStore } from '../../state/tripStore';

export default function DestinationsSection() {
  const { navigate, dispatch } = useTripStore();
  const { state, actions, destinations } = useLandingPage();

  const handleDestinationClick = (name: string) => {
    dispatch({ type: 'SET_DESTINATION', destination: name });
    navigate('preferences');
  };

  return (
    <section id={SECTION_IDS.destinations} style={{ padding: '60px 24px', position: 'relative', zIndex: 1 }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="badge badge-pink" style={{ marginBottom: 16 }}>Top Picks</div>
          <h2 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 900,
            color: '#0c1b33',
          }}>
            Trending <span className="text-gradient-ice">destinations</span>
          </h2>
          <p style={{ color: '#3f7295', marginTop: 12, fontSize: '1.1rem' }}>
            Tap a card, or hover for 3 seconds, to see what makes each place worth the trip
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
        }}>
          {destinations.map((d, i) => {
            const open = state.flipped === d.name;
            return (
              <div
                key={d.name}
                className="img-card anim-fade-up"
                data-flipped={open}
                style={{ height: 340, animationDelay: `${i * 0.1}s` }}
                onMouseEnter={() => {
                  // Dwell-flipping an already-open card would mark it
                  // hover-owned, so the pointer leaving would then close a card
                  // the user deliberately tapped.
                  if (open) return;
                  actions.beginDwell(d.name);
                }}
                onMouseLeave={() => actions.endDwell(d.name)}
              >
                <div className="img-card-inner">
                  {/* Front */}
                  <div className="img-card-face img-card-front">
                    <img src={d.image} alt={d.name} loading="lazy" />
                    <div className="img-card-overlay" />
                    <button
                      type="button"
                      className="img-card-hit"
                      aria-expanded={open}
                      aria-label={`${open ? 'Hide details for' : 'Show details for'} ${d.name}`}
                      onClick={() => actions.toggleCard(d.name)}
                    />
                    <div className="img-card-hint" aria-hidden="true">
                      {open ? 'Tap to close' : 'Tap for details'}
                    </div>
                    <div className="img-card-content">
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', color: '#bae6fd', textTransform: 'uppercase', marginBottom: 6 }}>
                        {d.tag}
                      </div>
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1 }}>
                        {d.name}
                      </div>
                    </div>
                  </div>

                  {/* Back. `inert` matters here: aria-hidden alone does not
                      remove the buttons below from the tab order, so keyboard
                      users would otherwise land on an invisible back face. */}
                  <div
                    className="img-card-face img-card-back"
                    aria-hidden={!open}
                    inert={!open}
                  >
                    <div className="img-card-back-tag">{d.tag}</div>
                    <h3 className="img-card-back-title">{d.name}</h3>
                    <p className="img-card-back-region">{d.region}</p>
                    <p className="img-card-back-body">{d.blurb}</p>
                    <p className="img-card-back-label" id={`famous-${i}`}>
                      Most famous for
                    </p>
                    <ul className="img-card-highlights" aria-labelledby={`famous-${i}`}>
                      {d.famousFor.map(h => <li key={h}>{h}</li>)}
                    </ul>
                    <div className="img-card-back-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleDestinationClick(d.name)}
                      >
                        Plan this trip
                      </button>
                      <button
                        type="button"
                        className="img-card-flip-back"
                        onClick={() => actions.toggleCard(d.name)}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
