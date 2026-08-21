/**
 * FlatTaxonomyPanel search — behavior tests.
 *
 * The reviewer asked for real rendering coverage of the flat-panel term
 * search: the debounced REST lookup must render decoded suggestion names,
 * an in-flight request must not be able to overwrite a newer one's results,
 * a failed response must clear stale suggestions, and unmounting the panel
 * must abort the pending request.
 *
 * Strategy: render the real component through createRoot() with lightweight
 * DOM stubs for the @wordpress/components inputs, and a controllable
 * global.fetch. Same approach as connected-scraped-media-panel.test.js.
 *
 * @package press-this
 */

// Tell React 18 that act() in this file is the test runner's act.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock( '@wordpress/element', () => {
	const React = require( 'react' );
	return {
		useState: React.useState,
		useEffect: React.useEffect,
		useCallback: React.useCallback,
		useMemo: React.useMemo,
		useRef: React.useRef,
		createElement: React.createElement,
		Fragment: React.Fragment,
	};
} );

jest.mock( '@wordpress/i18n', () => ( {
	__: ( s ) => s,
} ) );

jest.mock( '@wordpress/components', () => {
	const React = require( 'react' );
	const handlers = {};
	return {
		// Exposed so tests can invoke the panel's own onInputChange handler
		// the way FormTokenField would after its internal input handling.
		__handlers: handlers,
		PanelBody: ( { children } ) =>
			React.createElement(
				'div',
				{ className: 'test-panel-body' },
				children
			),
		CheckboxControl: () =>
			React.createElement( 'input', { type: 'checkbox' } ),
		SearchControl: () => React.createElement( 'input', { type: 'search' } ),
		FormTokenField: ( { label, value, suggestions, onInputChange } ) => {
			handlers.onInputChange = onInputChange;
			return React.createElement(
				'div',
				{ className: 'test-token-field', 'data-label': label },
				React.createElement(
					'ul',
					{ className: 'test-suggestions' },
					suggestions.map( ( name ) =>
						React.createElement( 'li', { key: name }, name )
					)
				),
				React.createElement(
					'span',
					{ className: 'test-selected', hidden: true },
					value.join( ',' )
				)
			);
		},
	};
} );

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = React;
const components = require( '@wordpress/components' );
const TaxonomyPanel = require( '../../src/components/TaxonomyPanel' ).default;

const TAXONOMY = {
	name: 'genre',
	label: 'Genres',
	hierarchical: false,
	restBase: 'genres',
};

function okResponse( terms ) {
	return {
		ok: true,
		json: async () => terms,
	};
}

function typeInto( text ) {
	return act( async () => {
		components.__handlers.onInputChange( text );
	} );
}

function suggestionTexts( container ) {
	return Array.from(
		container.querySelectorAll( '.test-suggestions li' )
	).map( ( li ) => li.textContent );
}

describe( 'FlatTaxonomyPanel search', () => {
	let container;
	let root;
	let fetchCalls;

	beforeEach( () => {
		jest.useFakeTimers();
		fetchCalls = [];
		global.fetch = jest.fn( ( url, options ) => {
			fetchCalls.push( { url, options } );
			return Promise.resolve( okResponse( [] ) );
		} );
		container = document.createElement( 'div' );
		document.body.appendChild( container );
	} );

	afterEach( async () => {
		if ( root ) {
			await act( async () => {
				root.unmount();
			} );
			root = null;
		}
		container.remove();
		jest.useRealTimers();
		jest.restoreAllMocks();
		delete global.fetch;
	} );

	async function renderPanel( props = {} ) {
		await act( async () => {
			root = createRoot( container );
			root.render(
				React.createElement( TaxonomyPanel, {
					taxonomy: TAXONOMY,
					selectedTerms: [],
					onSelectionChange: () => {},
					restUrl: '/wp-json/press-this/v1/',
					restNonce: 'test-nonce',
					...props,
				} )
			);
		} );
	}

	async function searchFor( text ) {
		await typeInto( text );
		// Fire the 300ms debounce, then flush the fetch/json promise chain
		// so the resulting state update renders inside act().
		act( () => {
			jest.advanceTimersByTime( 300 );
		} );
		await act( async () => {
			await Promise.resolve();
		} );
	}

	test( 'renders fetched suggestions with entities decoded', async () => {
		// Record the call ourselves: mockImplementationOnce replaces the
		// base implementation, including its fetchCalls.push side effect.
		global.fetch.mockImplementationOnce( ( url, options ) => {
			fetchCalls.push( { url, options } );
			return Promise.resolve(
				okResponse( [
					{ id: 1, name: 'Ampersand &amp; Sons' },
					{ id: 2, name: 'Science Fiction' },
				] )
			);
		} );

		await renderPanel();
		await searchFor( 'son' );

		expect( fetchCalls ).toHaveLength( 1 );
		expect( fetchCalls[ 0 ].url ).toBe(
			'/wp-json/wp/v2/genres?search=son&per_page=10'
		);
		expect( fetchCalls[ 0 ].options.headers[ 'X-WP-Nonce' ] ).toBe(
			'test-nonce'
		);
		expect( suggestionTexts( container ) ).toEqual( [
			'Ampersand & Sons',
			'Science Fiction',
		] );
	} );

	test( 'a slower earlier response cannot overwrite newer suggestions', async () => {
		let rejectSlow;
		let slowSignal;
		// A real fetch rejects with an AbortError once its signal aborts.
		// Mirror that so the mock behaves like the browser: the slow
		// request never delivers results after the newer search aborts it.
		const slowResponse = new Promise( ( resolve, reject ) => {
			rejectSlow = () =>
				reject(
					Object.assign( new Error( 'Aborted' ), {
						name: 'AbortError',
					} )
				);
		} );
		const trackSlow = ( url, options ) => {
			slowSignal = options.signal;
			slowSignal.addEventListener( 'abort', () => rejectSlow() );
			return slowResponse;
		};

		global.fetch.mockImplementation( ( url, options ) => {
			// Keep recording: this replaces the base implementation too.
			fetchCalls.push( { url, options } );
			if ( url.includes( 'search=fa&' ) ) {
				return trackSlow( url, options );
			}
			return Promise.resolve( okResponse( [ { name: 'Fantasy' } ] ) );
		} );

		await renderPanel();

		// First search starts a slow request.
		await typeInto( 'fa' );
		act( () => {
			jest.advanceTimersByTime( 300 );
		} );
		expect( fetchCalls ).toHaveLength( 1 );

		// Second search aborts the first and gets a fast response.
		await typeInto( 'fant' );
		act( () => {
			jest.advanceTimersByTime( 300 );
		} );
		await act( async () => {
			await Promise.resolve();
		} );
		expect( fetchCalls ).toHaveLength( 2 );
		expect( suggestionTexts( container ) ).toEqual( [ 'Fantasy' ] );

		// The aborted request can no longer touch suggestions: the abort
		// rejects its fetch, and the component ignores AbortError.
		expect( slowSignal.aborted ).toBe( true );
		rejectSlow();
		await act( async () => {
			await Promise.resolve();
			await Promise.resolve();
		} );
		expect( suggestionTexts( container ) ).toEqual( [ 'Fantasy' ] );
	} );

	test( 'a non-OK response clears suggestions instead of leaving stale ones', async () => {
		await renderPanel();

		// First establish real suggestions so there is something stale to clear.
		global.fetch.mockImplementationOnce( ( url, options ) => {
			fetchCalls.push( { url, options } );
			return Promise.resolve(
				okResponse( [ { name: 'Song' }, { name: 'Sonic' } ] )
			);
		} );
		await typeInto( 'son' );
		act( () => {
			jest.advanceTimersByTime( 300 );
		} );
		await act( async () => {
			await Promise.resolve();
		} );

		expect( fetchCalls ).toHaveLength( 1 );
		expect( suggestionTexts( container ) ).toEqual( [ 'Song', 'Sonic' ] );

		// A failed search must replace them with nothing.
		global.fetch.mockImplementationOnce( ( url, options ) => {
			fetchCalls.push( { url, options } );
			return Promise.resolve( { ok: false, status: 500 } );
		} );
		await typeInto( 'sonn' );
		act( () => {
			jest.advanceTimersByTime( 300 );
		} );
		await act( async () => {
			await Promise.resolve();
		} );

		expect( fetchCalls ).toHaveLength( 2 );
		expect( suggestionTexts( container ) ).toEqual( [] );
	} );

	test( 'unmounting while a request is pending aborts it', async () => {
		let capturedSignal;

		global.fetch.mockImplementationOnce( ( url, options ) => {
			fetchCalls.push( { url, options } );
			capturedSignal = options.signal;
			return new Promise( () => {} ); // Never settles.
		} );

		await renderPanel();
		await typeInto( 'son' );
		act( () => {
			jest.advanceTimersByTime( 300 );
		} );
		expect( fetchCalls ).toHaveLength( 1 );
		expect( capturedSignal.aborted ).toBe( false );

		await act( async () => {
			root.unmount();
		} );
		root = null;

		expect( capturedSignal.aborted ).toBe( true );
	} );

	test( 'short input never triggers a request', async () => {
		await renderPanel();
		await searchFor( 's' );

		expect( fetchCalls ).toHaveLength( 0 );
		expect( suggestionTexts( container ) ).toEqual( [] );
	} );
} );
