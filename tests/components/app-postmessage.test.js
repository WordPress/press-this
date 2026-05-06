/**
 * App — bookmarklet postMessage handler.
 *
 * Reproduces https://github.com/WordPress/press-this/issues/135:
 * the bookmarklet runs on a third-party page (any origin) and posts scraped
 * data to the Press This popup. The handler must accept these cross-origin
 * messages while still rejecting spoofed messages from other windows. Validate
 * by source identity (event.source === window.opener), not by origin equality.
 *
 * @package press-this
 */

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
	sprintf: ( fmt, ...args ) => {
		let i = 0;
		return fmt.replace( /%[sd]/g, () => args[ i++ ] );
	},
} ) );

// Heavy children — stub so App renders without pulling the editor stack.
jest.mock( '../../src/components/Header', () => () => null );
jest.mock( '../../src/components/PressThisEditor', () => () => null );

// processScrapedData only calls buildSuggestedContentFromMetadata from this
// module — stub it so we don't pull in the HTML parser graph just to assert
// the message handler ran.
jest.mock( '../../src/utils', () => ( {
	buildSuggestedContentFromMetadata: () => '<p>stub content</p>',
} ) );

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = React;
const App = require( '../../src/App' ).default;

describe( 'App — bookmarklet postMessage handler (issue #135)', () => {
	let container;
	let root;
	let originalFetch;
	let openerFrame;

	beforeEach( () => {
		container = document.createElement( 'div' );
		document.body.appendChild( container );

		originalFetch = global.fetch;
		global.fetch = jest.fn( () =>
			Promise.resolve( {
				ok: true,
				json: () => Promise.resolve( { embeds: [] } ),
			} )
		);

		// In production, window.opener is a *distinct* Window object — the
		// bookmarklet's page. Mount an iframe and use its contentWindow as
		// the opener so the identity check runs against a real foreign
		// Window, not the popup's own window.
		openerFrame = document.createElement( 'iframe' );
		document.body.appendChild( openerFrame );
		Object.defineProperty( window, 'opener', {
			configurable: true,
			writable: true,
			value: openerFrame.contentWindow,
		} );

		window.pressThisData = {
			postMessageMode: true,
			restUrl: 'http://example.test/wp-json/press-this/v1/',
			restNonce: 'test-nonce',
			sourceUrl: '',
			images: [],
			embeds: [],
			allowedBlocks: [],
			postId: 1,
			title: '',
			content: '',
			postStatus: 'draft',
			postDate: '',
			siteName: 'Test',
			siteUrl: 'http://example.test/',
		};
	} );

	afterEach( async () => {
		if ( root ) {
			await act( async () => {
				root.unmount();
			} );
			root = null;
		}
		container.remove();
		openerFrame?.remove();
		openerFrame = null;
		global.fetch = originalFetch;
		Object.defineProperty( window, 'opener', {
			configurable: true,
			writable: true,
			value: null,
		} );
		delete window.pressThisData;
	} );

	async function mountApp() {
		await act( async () => {
			root = createRoot( container );
			root.render( React.createElement( App ) );
		} );
	}

	async function dispatchAndFlush( event ) {
		await act( async () => {
			window.dispatchEvent( event );
			// Let the validateEmbeds fetch + state updates settle.
			await Promise.resolve();
			await Promise.resolve();
		} );
	}

	test( 'accepts postMessage from cross-origin opener (the bookmarklet path)', async () => {
		await mountApp();

		// The bookmarklet runs on whatever site the user is browsing, so the
		// message origin will not match the popup's origin. Before the fix
		// this message is silently dropped and no scraped data ever reaches
		// the editor.
		await dispatchAndFlush(
			new MessageEvent( 'message', {
				origin: 'https://ma.tt',
				source: window.opener,
				data: {
					type: 'press-this-data',
					version: 11,
					data: {
						t: 'Test title',
						u: 'https://ma.tt/post/',
						_embeds: [
							'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
						],
					},
				},
			} )
		);

		// processScrapedData fires validateEmbeds, which POSTs to the REST
		// endpoint. If the message was rejected, fetch would not be called.
		expect( global.fetch ).toHaveBeenCalledWith(
			'http://example.test/wp-json/press-this/v1/validate-embeds',
			expect.objectContaining( { method: 'POST' } )
		);
	} );

	test( 'rejects postMessage from a non-opener source (spoofing protection)', async () => {
		await mountApp();

		// A message that arrives from some other window — not the one that
		// opened this popup — must be ignored even though the data shape
		// looks legitimate. An iframe gives us a separate Window object
		// distinct from window.opener.
		const iframe = document.createElement( 'iframe' );
		document.body.appendChild( iframe );
		const fakeSource = iframe.contentWindow;

		await dispatchAndFlush(
			new MessageEvent( 'message', {
				origin: 'https://attacker.example',
				source: fakeSource,
				data: {
					type: 'press-this-data',
					version: 11,
					data: { t: 'Spoofed' },
				},
			} )
		);

		iframe.remove();

		expect( global.fetch ).not.toHaveBeenCalled();
	} );

	test( 'ignores messages with the wrong type from the opener', async () => {
		await mountApp();

		await dispatchAndFlush(
			new MessageEvent( 'message', {
				origin: 'https://ma.tt',
				source: window.opener,
				data: { type: 'something-else', data: { t: 'nope' } },
			} )
		);

		expect( global.fetch ).not.toHaveBeenCalled();
	} );
} );
