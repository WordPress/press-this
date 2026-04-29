/**
 * Connected Scraped Media Panel — behavior tests.
 *
 * Reproduces https://github.com/WordPress/press-this/issues/126:
 * inserting an embed from the Scraped Media panel must place the new block
 * at the user's current cursor position, not append it at the end of the
 * document.
 *
 * Strategy: stub the @wordpress packages that ConnectedScrapedMediaPanel and
 * ScrapedMediaPanel reach into. The stubs let us assert exactly which
 * arguments the connected handler dispatches to insertBlock — which is the
 * heart of the bug.
 *
 * @package press-this
 */

// Tell React 18 that act() in this file is the test runner's act.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockInsertBlock = jest.fn();
let mockInsertionPoint = { rootClientId: undefined, index: undefined };

jest.mock( '@wordpress/data', () => ( {
	useDispatch: () => ( { insertBlock: mockInsertBlock } ),
	useSelect: ( fn ) =>
		fn( () => ( {
			getBlockInsertionPoint: () => mockInsertionPoint,
		} ) ),
} ) );

jest.mock( '@wordpress/block-editor', () => ( {
	store: { name: 'core/block-editor' },
} ) );

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

jest.mock( '@wordpress/blocks', () => ( {
	createBlock: ( name, attributes = {} ) => ( {
		name,
		attributes,
		clientId: `test-${ Math.random().toString( 36 ).slice( 2, 9 ) }`,
		innerBlocks: [],
	} ),
} ) );

jest.mock( '@wordpress/components', () => {
	const React = require( 'react' );
	return {
		Button: ( { children, onClick, className, variant, ...rest } ) =>
			React.createElement(
				'button',
				{ onClick, className, ...rest },
				children
			),
		Spinner: () =>
			React.createElement( 'span', { className: 'spinner' } ),
	};
} );

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = React;
const ConnectedScrapedMediaPanel =
	require( '../../src/components/ConnectedScrapedMediaPanel' ).default;

describe( 'ConnectedScrapedMediaPanel — issue #126 cursor position', () => {
	let container;
	let root;

	beforeEach( () => {
		mockInsertBlock.mockClear();
		mockInsertionPoint = { rootClientId: undefined, index: undefined };
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
	} );

	function renderPanel( embeds = [], images = [] ) {
		return act( async () => {
			root = createRoot( container );
			root.render(
				React.createElement( ConnectedScrapedMediaPanel, {
					images,
					embeds,
					sourceUrl: '',
				} )
			);
		} );
	}

	test( 'inserts an embed at the cursor index, not at the end', async () => {
		// Cursor sits after block at index 0 → insertion point index is 1.
		mockInsertionPoint = { rootClientId: undefined, index: 1 };

		await renderPanel( [
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		] );

		const embedButton = container.querySelector(
			'.press-this-scraped-media__embed-button'
		);
		expect( embedButton ).not.toBeNull();

		await act( async () => {
			embedButton.click();
		} );

		expect( mockInsertBlock ).toHaveBeenCalledTimes( 1 );

		const [ block, index, rootClientId ] = mockInsertBlock.mock.calls[ 0 ];
		expect( block.name ).toBe( 'core/embed' );
		expect( block.attributes.url ).toBe(
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
		);
		// THE BUG (#126): without the fix, insertBlock is called with only
		// the block argument (index/rootClientId undefined) so the reducer
		// falls back to appending at the end. The fix passes the cursor's
		// index from getBlockInsertionPoint().
		expect( index ).toBe( 1 );
		expect( rootClientId ).toBeUndefined();
	} );

	test( 'inside a nested rootClientId, passes that rootClientId through', async () => {
		mockInsertionPoint = { rootClientId: 'parent-id', index: 2 };

		await renderPanel( [
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		] );

		const embedButton = container.querySelector(
			'.press-this-scraped-media__embed-button'
		);

		await act( async () => {
			embedButton.click();
		} );

		const [ , index, rootClientId ] = mockInsertBlock.mock.calls[ 0 ];
		expect( index ).toBe( 2 );
		expect( rootClientId ).toBe( 'parent-id' );
	} );

	test( 'inserting an image also goes to the cursor index', async () => {
		mockInsertionPoint = { rootClientId: undefined, index: 1 };

		// ScrapedMediaPanel filters images by dimensions; stub Image so each
		// image passes the size threshold immediately.
		const OriginalImage = global.Image;
		global.Image = class {
			constructor() {
				setTimeout( () => {
					this.width = 1024;
					this.height = 1024;
					if ( this.onload ) {
						this.onload();
					}
				}, 0 );
			}
		};

		try {
			await renderPanel( [], [ 'https://example.com/img.jpg' ] );

			// Wait for the dimension-filter setTimeout to fire.
			await act( async () => {
				await new Promise( ( resolve ) => setTimeout( resolve, 5 ) );
			} );

			const imageButton = container.querySelector(
				'.press-this-scraped-media__image-button'
			);
			expect( imageButton ).not.toBeNull();

			await act( async () => {
				imageButton.click();
			} );

			expect( mockInsertBlock ).toHaveBeenCalledTimes( 1 );
			const [ block, index ] = mockInsertBlock.mock.calls[ 0 ];
			expect( block.name ).toBe( 'core/image' );
			expect( index ).toBe( 1 );
		} finally {
			global.Image = OriginalImage;
		}
	} );
} );
