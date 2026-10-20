/**
 * Vitest setup.
 *
 * Carries over the parts of the retired `@wordpress/jest-preset-default` that
 * this suite relied on: the browser globals WordPress packages expect, and
 * the `@wordpress/jest-console` contract that fails a test on unexpected
 * console output.
 *
 * @package
 */

/**
 * External dependencies
 */
import { afterEach, beforeEach, vi } from 'vitest';

globalThis.SCRIPT_DEBUG = true;

window.setImmediate = ( callback ) => setTimeout( callback, 0 );

window.requestIdleCallback = ( callback ) => {
	const start = Date.now();

	return setTimeout(
		() =>
			callback( {
				didTimeout: false,
				timeRemaining: () => Math.max( 0, 50 - ( Date.now() - start ) ),
			} ),
		0
	);
};

window.cancelIdleCallback = ( handle ) => clearTimeout( handle );

window.matchMedia = () => ( {
	matches: false,
	addListener: () => {},
	addEventListener: () => {},
	removeListener: () => {},
	removeEventListener: () => {},
} );

window.userSettings = { uid: 1 };

const CONSOLE_METHODS = [ 'error', 'info', 'log', 'warn' ];
const consoleSpies = {};

beforeEach( () => {
	for ( const method of CONSOLE_METHODS ) {
		consoleSpies[ method ] = vi
			.spyOn( console, method )
			.mockImplementation( () => {} );
	}
} );

afterEach( () => {
	const unexpected = CONSOLE_METHODS.filter(
		( method ) => consoleSpies[ method ].mock.calls.length > 0
	).map(
		( method ) =>
			`console.${ method }: ${ consoleSpies[ method ].mock.calls
				.map( ( args ) => args.join( ' ' ) )
				.join( '\n' ) }`
	);

	for ( const method of CONSOLE_METHODS ) {
		consoleSpies[ method ].mockRestore();
	}

	if ( unexpected.length ) {
		throw new Error(
			`Unexpected console output:\n${ unexpected.join( '\n' ) }`
		);
	}
} );
