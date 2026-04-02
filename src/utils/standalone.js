/**
 * Standalone display mode utilities.
 *
 * @package
 */

/**
 * Check if running in standalone display mode (added to home screen).
 *
 * @return {boolean} True if standalone mode.
 */
export function isStandaloneMode() {
	return (
		( typeof window.matchMedia === 'function' &&
			window.matchMedia( '(display-mode: standalone)' ).matches ) ||
		window.navigator.standalone === true
	);
}
