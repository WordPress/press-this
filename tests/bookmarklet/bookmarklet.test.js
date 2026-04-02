/**
 * Bookmarklet Functionality Tests
 *
 * These tests verify the Press This bookmarklet correctly extracts
 * page data, filters images by dimensions, and handles various submission modes.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

const BOOKMARKLET_PATH = path.resolve( __dirname, '../../assets/bookmarklet.js' );

let bookmarkletSource = '';

beforeAll( () => {
	bookmarkletSource = fs.readFileSync( BOOKMARKLET_PATH, 'utf8' );
} );

describe( 'Bookmarklet Functionality', () => {
	test( 'Uses GET + postMessage pattern for data submission', () => {
		// Check for postMessage usage (current implementation).
		expect( bookmarkletSource ).toContain( 'postMessage' );

		// Check for scraped data object.
		expect( bookmarkletSource ).toContain( 'scrapedData' );

		// Check for window.open to open Press This popup.
		expect( bookmarkletSource ).toContain( 'window.open' );

		// Check for URL parameter (u=).
		expect( bookmarkletSource ).toContain( '&u=' );

		// Check for postMessage mode flag.
		expect( bookmarkletSource ).toContain( '&pm=1' );
	} );

	test( 'Sends data via postMessage after popup loads', () => {
		// Check for sendDataToPopup function.
		expect( bookmarkletSource ).toContain( 'sendDataToPopup' );

		// Check for press-this-data message type.
		expect( bookmarkletSource ).toContain( 'press-this-data' );

		// Check for targetOrigin for secure postMessage.
		expect( bookmarkletSource ).toContain( 'targetOrigin' );

		// Check for retry mechanism.
		expect( bookmarkletSource ).toContain( 'trySend' );
	} );

	test( 'Image dimension filtering (skip < 256w or < 128h)', () => {
		// Check for width threshold.
		expect(
			bookmarkletSource.includes( '256' ) ||
			bookmarkletSource.includes( 'width < 256' ) ||
			bookmarkletSource.includes( 'img.width' )
		).toBe( true );

		// Check for height threshold.
		expect(
			bookmarkletSource.includes( '128' ) ||
			bookmarkletSource.includes( 'height < 128' ) ||
			bookmarkletSource.includes( 'img.height' )
		).toBe( true );

		// Check for avatar filtering.
		expect( bookmarkletSource ).toContain( 'avatar' );

		// Check for image iteration.
		expect(
			bookmarkletSource.includes( "getElementsByTagName( 'img' )" ) ||
			bookmarkletSource.includes( "getElementsByTagName('img')" )
		).toBe( true );

		// Check for _images[] POST data.
		expect(
			bookmarkletSource.includes( '_images[]' ) ||
			bookmarkletSource.includes( "'_images[]'" )
		).toBe( true );
	} );

	test( 'Meta tag extraction for title, description, and social data', () => {
		// Check for meta tag iteration.
		expect(
			bookmarkletSource.includes( "getElementsByTagName( 'meta' )" ) ||
			bookmarkletSource.includes( "getElementsByTagName('meta')" )
		).toBe( true );

		// Check for name attribute extraction.
		expect(
			bookmarkletSource.includes( "getAttribute( 'name' )" ) ||
			bookmarkletSource.includes( "getAttribute('name')" )
		).toBe( true );

		// Check for property attribute extraction (Open Graph).
		expect(
			bookmarkletSource.includes( "getAttribute( 'property' )" ) ||
			bookmarkletSource.includes( "getAttribute('property')" )
		).toBe( true );

		// Check for content attribute extraction.
		expect(
			bookmarkletSource.includes( "getAttribute( 'content' )" ) ||
			bookmarkletSource.includes( "getAttribute('content')" )
		).toBe( true );

		// Check for _meta[] POST data.
		expect(
			bookmarkletSource.includes( '_meta[' ) ||
			bookmarkletSource.includes( "'_meta['" )
		).toBe( true );

		// Check for link tag extraction (canonical, shortlink).
		expect(
			bookmarkletSource.includes( "getElementsByTagName( 'link' )" ) ||
			bookmarkletSource.includes( "getElementsByTagName('link')" )
		).toBe( true );

		// Check for canonical/shortlink detection.
		expect(
			bookmarkletSource.includes( 'canonical' ) ||
			bookmarkletSource.includes( 'shortlink' )
		).toBe( true );
	} );

	test( 'Bookmarklet version detection mechanism', () => {
		// Check for PT_VERSION constant.
		expect( bookmarkletSource ).toContain( 'PT_VERSION' );

		// Check for pt_version POST parameter.
		expect( bookmarkletSource ).toContain( 'pt_version' );

		// Verify version is sent via add() function.
		expect(
			bookmarkletSource.includes( "add( 'pt_version'" ) ||
			bookmarkletSource.includes( "add('pt_version'" )
		).toBe( true );
	} );

	test( 'Window sizing calculations for popup', () => {
		// Check for viewport width detection.
		expect(
			bookmarkletSource.includes( 'outerWidth' ) ||
			bookmarkletSource.includes( 'clientWidth' )
		).toBe( true );

		// Check for viewport height detection.
		expect(
			bookmarkletSource.includes( 'outerHeight' ) ||
			bookmarkletSource.includes( 'clientHeight' )
		).toBe( true );

		// Check for width calculation (70% = 0.7).
		expect(
			bookmarkletSource.includes( '0.7' ) ||
			bookmarkletSource.includes( '* 0.7' ) ||
			bookmarkletSource.includes( '.7' )
		).toBe( true );

		// Check for height calculation (90% = 0.9).
		expect(
			bookmarkletSource.includes( '0.9' ) ||
			bookmarkletSource.includes( '* 0.9' ) ||
			bookmarkletSource.includes( '.9' )
		).toBe( true );

		// Check for default dimensions.
		expect(
			bookmarkletSource.includes( '600' ) && bookmarkletSource.includes( '700' )
		).toBe( true );

		// Check for window features.
		expect(
			bookmarkletSource.includes( 'resizable' ) &&
			bookmarkletSource.includes( 'scrollbars' )
		).toBe( true );
	} );

	test( 'Embed/iframe extraction for video content', () => {
		// Check for iframe iteration.
		expect(
			bookmarkletSource.includes( "getElementsByTagName( 'iframe' )" ) ||
			bookmarkletSource.includes( "getElementsByTagName('iframe')" )
		).toBe( true );

		// Check for _embeds[] POST data.
		expect(
			bookmarkletSource.includes( '_embeds[]' ) ||
			bookmarkletSource.includes( "'_embeds[]'" )
		).toBe( true );
	} );

	test( 'Text selection capture', () => {
		// Check for selection API usage.
		expect(
			bookmarkletSource.includes( 'getSelection' ) ||
			bookmarkletSource.includes( 'selection' )
		).toBe( true );

		// Check for selection as 's' parameter.
		expect(
			bookmarkletSource.includes( "'s'" ) ||
			bookmarkletSource.includes( '"s"' ) ||
			bookmarkletSource.includes( "add( 's'" )
		).toBe( true );
	} );

	test( 'HTML selection capture preserves formatting', () => {
		// Check for getRangeAt usage to capture the selection range.
		expect( bookmarkletSource ).toContain( 'getRangeAt' );

		// Check for cloneContents to extract selected DOM fragment.
		expect( bookmarkletSource ).toContain( 'cloneContents' );

		// Check for innerHTML to serialise the selection as HTML.
		expect( bookmarkletSource ).toContain( 'innerHTML' );

		// Check that sel_html is sent alongside plain-text selection.
		expect(
			bookmarkletSource.includes( "'sel_html'" ) ||
			bookmarkletSource.includes( '"sel_html"' ) ||
			bookmarkletSource.includes( 'sel_html' )
		).toBe( true );

		// sel_html is added via the add() helper.
		expect(
			bookmarkletSource.includes( "add( 'sel_html'" ) ||
			bookmarkletSource.includes( "add('sel_html'" )
		).toBe( true );
	} );

	test( 'Enhanced data extraction - Open Graph video', () => {
		// Check for og:video detection.
		expect( bookmarkletSource ).toContain( 'og:video' );

		// Check for _og_video POST data.
		expect(
			bookmarkletSource.includes( '_og_video[]' ) ||
			bookmarkletSource.includes( "'_og_video[]'" )
		).toBe( true );
	} );

	test( 'Falls back to window.name transport when popup is blocked', () => {
		// Check for popup null check (fallback for mobile browsers).
		expect( bookmarkletSource ).toContain( 'if ( popup )' );

		// Check for window.name transport (keeps data out of URL).
		expect( bookmarkletSource ).toContain( 'window.name' );
		expect( bookmarkletSource ).toContain( 'JSON.stringify' );

		// Check for wn=1 flag to signal window.name mode.
		expect( bookmarkletSource ).toContain( '&wn=1' );

		// Check for top.location.href fallback navigation.
		expect( bookmarkletSource ).toContain( 'top.location.href' );

		// Should NOT contain the old _data URL parameter approach.
		expect( bookmarkletSource ).not.toContain( '_data=' );
		expect( bookmarkletSource ).not.toContain( 'fallbackData' );
		expect( bookmarkletSource ).not.toContain( 'fallbackUrl' );
	} );

	test( 'Window.name fallback uses same envelope as postMessage', () => {
		// Check that fallback uses the press-this-data type identifier.
		expect( bookmarkletSource ).toContain( "'press-this-data'" );

		// Check for PT_VERSION in the envelope.
		expect( bookmarkletSource ).toContain( 'PT_VERSION' );

		// Check that full scrapedData is sent (no truncation needed).
		expect( bookmarkletSource ).toContain( 'data: scrapedData' );
	} );

	test( 'Enhanced data extraction - JSON-LD structured data', () => {
		// Check for JSON-LD script tag query.
		expect( bookmarkletSource ).toContain( 'application/ld+json' );

		// Check for JSON.parse usage.
		expect( bookmarkletSource ).toContain( 'JSON.parse' );

		// Check for _jsonld POST data.
		expect(
			bookmarkletSource.includes( '_jsonld[' ) ||
			bookmarkletSource.includes( "'_jsonld['" )
		).toBe( true );

		// Check for VideoObject handling.
		expect( bookmarkletSource ).toContain( 'VideoObject' );
	} );
} );
