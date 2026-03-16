/**
 * Scraped Media Panel Component Tests
 *
 * Uses source-reading pattern for component verification and
 * extracted utility function testing.
 *
 * Note: tests/components/scraped-media-insertion.test.js covers
 * insertion patterns. This file covers broader panel behavior.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

let sanitizeUrl;
let getDomain;
let sourceContent;

beforeAll( () => {
	const sourcePath = path.resolve(
		__dirname,
		'../../src/components/ScrapedMediaPanel.js'
	);
	sourceContent = fs.readFileSync( sourcePath, 'utf8' );

	// Extract sanitizeUrl function.
	const sanitizeMatch = sourceContent.match(
		/function sanitizeUrl\(\s*url\s*\)\s*\{([\s\S]*?)^\}/m
	);
	if ( sanitizeMatch ) {
		// eslint-disable-next-line no-new-func
		sanitizeUrl = new Function( 'url', sanitizeMatch[ 1 ] );
	}

	// Extract getDomain function.
	const domainMatch = sourceContent.match(
		/function getDomain\(\s*url\s*\)\s*\{([\s\S]*?)^\}/m
	);
	if ( domainMatch ) {
		// eslint-disable-next-line no-new-func
		getDomain = new Function( 'url', domainMatch[ 1 ] );
	}
} );

describe( 'ScrapedMediaPanel - sanitizeUrl', () => {
	test( 'accepts valid HTTPS URL', () => {
		expect( sanitizeUrl( 'https://example.com/img.jpg' ) ).toBe(
			'https://example.com/img.jpg'
		);
	} );

	test( 'rejects javascript: URL', () => {
		expect( sanitizeUrl( 'javascript:alert(1)' ) ).toBe( '' );
	} );

	test( 'rejects empty input', () => {
		expect( sanitizeUrl( '' ) ).toBe( '' );
	} );

	test( 'strips dangerous characters', () => {
		const result = sanitizeUrl( 'https://example.com/"<>\\test' );
		expect( result ).not.toContain( '"' );
		expect( result ).not.toContain( '<' );
		expect( result ).not.toContain( '>' );
		expect( result ).not.toContain( '\\' );
	} );
} );

describe( 'ScrapedMediaPanel - getDomain', () => {
	test( 'extracts domain from URL', () => {
		expect( getDomain( 'https://www.example.com/path' ) ).toBe(
			'example.com'
		);
	} );

	test( 'strips www. prefix', () => {
		expect( getDomain( 'https://www.youtube.com/watch?v=test' ) ).toBe(
			'youtube.com'
		);
	} );

	test( 'returns URL as fallback for invalid input', () => {
		expect( getDomain( 'not-a-url' ) ).toBe( 'not-a-url' );
	} );
} );

describe( 'ScrapedMediaPanel - Component Structure', () => {
	test( 'exports a default function component', () => {
		expect( sourceContent ).toMatch(
			/export\s+default\s+function\s+ScrapedMediaPanel/
		);
	} );

	test( 'renders panel header with toggle', () => {
		expect( sourceContent ).toContain(
			'press-this-scraped-media__header'
		);
		expect( sourceContent ).toContain( 'aria-expanded' );
	} );

	test( 'displays Scraped Media title', () => {
		expect( sourceContent ).toContain( 'Scraped Media' );
	} );

	test( 'shows source URL when provided', () => {
		expect( sourceContent ).toContain(
			'press-this-scraped-media__source'
		);
		expect( sourceContent ).toContain( 'getDomain( sourceUrl )' );
	} );

	test( 'toggles content expansion', () => {
		expect( sourceContent ).toContain( 'isExpanded' );
		expect( sourceContent ).toMatch(
			/setIsExpanded\(\s*!\s*isExpanded\s*\)/
		);
	} );
} );

describe( 'ScrapedMediaPanel - Media Rendering', () => {
	test( 'renders embeds section when embeds exist', () => {
		expect( sourceContent ).toContain(
			'press-this-scraped-media__embeds'
		);
		expect( sourceContent ).toContain( 'Embeds' );
	} );

	test( 'renders images section when filtered images exist', () => {
		expect( sourceContent ).toContain(
			'press-this-scraped-media__images'
		);
		expect( sourceContent ).toContain( 'Images' );
	} );

	test( 'shows loading spinner while filtering', () => {
		expect( sourceContent ).toContain( '<Spinner' );
		expect( sourceContent ).toContain( 'Loading images' );
	} );

	test( 'returns null when no media and not loading', () => {
		expect( sourceContent ).toMatch(
			/!\s*hasMedia\s*&&\s*!\s*isLoading[\s\S]*?return\s+null/
		);
	} );
} );

describe( 'ScrapedMediaPanel - Block Insertion', () => {
	test( 'creates image block via handleInsertImage', () => {
		expect( sourceContent ).toMatch(
			/createBlock\(\s*'core\/image'/
		);
	} );

	test( 'creates embed block via handleInsertEmbed', () => {
		expect( sourceContent ).toMatch(
			/createBlock\(\s*'core\/embed'/
		);
	} );

	test( 'calls onInsertBlock with created block', () => {
		expect( sourceContent ).toContain( 'onInsertBlock( block )' );
	} );
} );
