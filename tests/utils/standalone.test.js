/**
 * Standalone utility tests
 *
 * Behavioral tests for isStandaloneMode shared utility.
 *
 * @package
 */

import { isStandaloneMode } from '../../src/utils/standalone';

describe( 'isStandaloneMode', () => {
	const originalMatchMedia = window.matchMedia;
	const originalNavigator = window.navigator;

	afterEach( () => {
		window.matchMedia = originalMatchMedia;
		Object.defineProperty( window, 'navigator', {
			value: originalNavigator,
			writable: true,
			configurable: true,
		} );
	} );

	test( 'returns true when matchMedia reports standalone display mode', () => {
		window.matchMedia = vi.fn( () => ( { matches: true } ) );
		Object.defineProperty( window, 'navigator', {
			value: { standalone: false },
			writable: true,
			configurable: true,
		} );

		expect( isStandaloneMode() ).toBe( true );
		expect( window.matchMedia ).toHaveBeenCalledWith(
			'(display-mode: standalone)'
		);
	} );

	test( 'returns true when navigator.standalone is true (iOS Safari)', () => {
		window.matchMedia = vi.fn( () => ( { matches: false } ) );
		Object.defineProperty( window, 'navigator', {
			value: { standalone: true },
			writable: true,
			configurable: true,
		} );

		expect( isStandaloneMode() ).toBe( true );
	} );

	test( 'returns false when neither condition is met', () => {
		window.matchMedia = vi.fn( () => ( { matches: false } ) );
		Object.defineProperty( window, 'navigator', {
			value: { standalone: false },
			writable: true,
			configurable: true,
		} );

		expect( isStandaloneMode() ).toBe( false );
	} );

	test( 'handles matchMedia not being available', () => {
		window.matchMedia = undefined;
		Object.defineProperty( window, 'navigator', {
			value: { standalone: true },
			writable: true,
			configurable: true,
		} );

		expect( isStandaloneMode() ).toBe( true );
	} );

	test( 'returns false when matchMedia is unavailable and navigator.standalone is false', () => {
		window.matchMedia = undefined;
		Object.defineProperty( window, 'navigator', {
			value: { standalone: false },
			writable: true,
			configurable: true,
		} );

		expect( isStandaloneMode() ).toBe( false );
	} );
} );
