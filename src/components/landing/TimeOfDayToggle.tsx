import { useLandingPage } from './LandingPageProvider';
import { TIME_OF_DAY_OPTIONS } from './weather';

/**
 * Day / night switch for the landing page.
 *
 * The page already follows the reader's clock, so this control exists for two
 * cases the clock cannot cover: someone previewing the other theme, and
 * someone whose machine's timezone is not where they actually are.
 *
 * A two-button group rather than a checkbox, because the control names the two
 * states instead of asking the reader to interpret an on/off switch. "Auto" is
 * a third state rather than a separate button, so the toggle stays a simple
 * two-way choice and the reset lives inside it.
 */
export default function TimeOfDayToggle() {
  const { state, actions } = useLandingPage();
  const groupLabel = 'Colour theme';

  return (
    <div className="lp-tod" role="group" aria-label={groupLabel}>
      {TIME_OF_DAY_OPTIONS.map((option) => {
        const active = state.timeOfDay === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className="lp-tod__btn"
            data-active={active}
            // aria-pressed rather than a role=radio, because this is a pair of
            // independent toggles that happen to be mutually exclusive, and a
            // radiogroup would imply arrow-key navigation we have not built.
            aria-pressed={active}
            onClick={() => actions.setTimeOfDay(option.id)}
          >
            {option.id === 'night' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
                  <path d="M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19" />
                </g>
              </svg>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}

      {state.timeOfDayPinned && (
        <button
          type="button"
          className="lp-tod__btn lp-tod__btn--auto"
          onClick={actions.followClock}
        >
          Auto
        </button>
      )}
    </div>
  );
}
