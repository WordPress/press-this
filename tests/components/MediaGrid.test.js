/**
 * MediaGrid Component Tests
 *
 * Tests for utility functions (import-and-call) and component source patterns.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Extract and evaluate the sanitizeUrl function from MediaGrid source.
 * Since it is not exported, we extract it via Function constructor.
 */
let sanitizeUrl;
let sourceContent;

beforeAll( () => {
	const sourcePath = path.resolve(
		__dirname,
		'../../src/components/MediaGrid.js'
	);
	sourceContent = fs.readFileSync( sourcePath, 'utf8' );

	// Extract sanitizeUrl function body from source.
	const fnMatch = sourceContent.match(
		/function sanitizeUrl\(\s*url\s*\)\s*\{([\s\S]*?)^\}/m
	);
	if ( fnMatch ) {
		// eslint-disable-next-line no-new-func
		sanitizeUrl = new Function( 'url', fnMatch[ 1 ] );
	}
} );

describe( 'MediaGrid - sanitizeUrl', () => {
	test( 'accepts valid HTTP URL', () => {
		expect( sanitizeUrl( 'https://example.com/image.jpg' ) ).toBe(
			'https://example.com/image.jpg'
		);
	} );

	test( 'accepts valid HTTP URL (http)', () => {
		expect( sanitizeUrl( 'http://example.com/image.jpg' ) ).toBe(
			'http://example.com/image.jpg'
		);
	} );

	test( 'accepts protocol-relative URL', () => {
		expect( sanitizeUrl( '//example.com/image.jpg' ) ).toBe(
			'//example.com/image.jpg'
		);
	} );

	test( 'rejects javascript: URL', () => {
		expect( sanitizeUrl( 'javascript:alert(1)' ) ).toBe( '' );
	} );

	test( 'rejects null input', () => {
		expect( sanitizeUrl( null ) ).toBe( '' );
	} );

	test( 'rejects empty string', () => {
		expect( sanitizeUrl( '' ) ).toBe( '' );
	} );

	test( 'strips dangerous characters', () => {
		const result = sanitizeUrl( 'https://example.com/test"<>\\path' );
		expect( result ).not.toContain( '"' );
		expect( result ).not.toContain( '<' );
		expect( result ).not.toContain( '>' );
		expect( result ).not.toContain( '\\' );
	} );

	test( 'trims whitespace', () => {
		expect( sanitizeUrl( '  https://example.com/image.jpg  ' ) ).toBe(
			'https://example.com/image.jpg'
		);
	} );

	test( 'rejects data: URL', () => {
		expect( sanitizeUrl( 'data:image/png;base64,abc' ) ).toBe( '' );
	} );
} );

describe( 'MediaGrid - filterImagesByDimensions', () => {
	test( 'function exists in source', () => {
		expect( sourceContent ).toMatch(
			/function\s+filterImagesByDimensions/
		);
	} );

	test( 'requires minimum width of 256 and height of 128', () => {
		expect( sourceContent ).toMatch( /img\.width\s*>=\s*256/ );
		expect( sourceContent ).toMatch( /img\.height\s*>=\s*128/ );
	} );

	test( 'calls onFiltered with empty array for empty input', () => {
		expect( sourceContent ).toMatch(
			/pending\s*===\s*0[\s\S]*?onFiltered\(\s*\[\s*\]\s*\)/
		);
	} );

	test( 'handles image load errors by decrementing pending count', () => {
		expect( sourceContent ).toContain( 'img.onerror' );
		expect( sourceContent ).toMatch( /pending--/ );
	} );
} );

describe( 'MediaGrid - Component', () => {
	test( 'renders a listbox container', () => {
		expect( sourceContent ).toContain( 'role="listbox"' );
	} );

	test( 'has accessible label for the grid', () => {
		expect( sourceContent ).toContain( 'Scraped media from page' );
	} );

	test( 'renders screen-reader-text title', () => {
		expect( sourceContent ).toContain( 'screen-reader-text' );
		expect( sourceContent ).toContain( 'Available Media' );
	} );

	test( 'renders MediaThumbnail for each item', () => {
		expect( sourceContent ).toContain( '<MediaThumbnail' );
	} );

	test( 'renders embeds first, then images', () => {
		const embedsIndex = sourceContent.indexOf( 'Render embeds first' );
		const imagesIndex = sourceContent.indexOf( 'Render images' );
		expect( embedsIndex ).toBeLessThan( imagesIndex );
	} );

	test( 'shows loading message while filtering', () => {
		expect( sourceContent ).toContain( 'Loading images' );
		expect( sourceContent ).toContain( 'press-this-media-grid__loading' );
	} );

	test( 'returns null when no media and not filtering', () => {
		expect( sourceContent ).toMatch(
			/!\s*hasMedia\s*&&\s*!\s*isFiltering[\s\S]*?return\s+null/
		);
	} );

	test( 'passes onInsert and onSetFeatured to MediaThumbnail', () => {
		expect( sourceContent ).toContain( 'onInsert={ handleInsert }' );
		expect( sourceContent ).toContain(
			'onSetFeatured={ handleSetFeatured }'
		);
	} );
} );
